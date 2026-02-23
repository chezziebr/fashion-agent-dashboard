import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import {
  startLoRATraining,
  generateTriggerWord,
  type LoRATrainingInput
} from '@/agents/lora-trainer';
import { ApiResponse, StartLoRATrainingRequest, StartLoRATrainingResponse } from '@/types';

/**
 * POST /api/models/train-lora
 * Start LoRA training for a model
 *
 * Requires 8-12 training images
 * Cost: ~$1.85 USD
 * Time: ~2 minutes
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Database not configured' },
        { status: 500 }
      );
    }

    const body: StartLoRATrainingRequest = await request.json();

    // Validate required fields
    if (!body.model_name || !body.gender || !body.training_images || body.training_images.length < 8) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Missing required fields. Need: model_name, gender, and 8-12 training_images'
        },
        { status: 400 }
      );
    }

    if (body.training_images.length > 20) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Maximum 20 training images allowed' },
        { status: 400 }
      );
    }

    console.log(`🎯 Starting LoRA training for model "${body.model_name}"...`);
    console.log(`📸 Training images: ${body.training_images.length}`);

    // Generate trigger word if not provided
    const triggerWord = body.trigger_word || generateTriggerWord(body.model_name);
    console.log(`🔑 Trigger word: ${triggerWord}`);

    // Create or get model record
    let modelId: string = body.model_id || '';
    let modelCode: string;

    if (!modelId) {
      // Generate unique model code
      const prefix = body.gender === 'male' ? 'M' : body.gender === 'female' ? 'F' : 'N';
      const randomNum = Math.floor(Math.random() * 100).toString().padStart(2, '0');
      modelCode = `${prefix}${randomNum}`;

      // Create model record
      const { data: newModel, error: modelError } = await supabase
        .from('ai_models')
        .insert({
          model_code: modelCode,
          name: body.model_name,
          gender: body.gender,
          base_image_url: body.training_images[0], // Use first training image as base
          thumbnail_url: body.training_images[0],
          has_lora_training: false, // Will be set to true when training completes
          is_active: false, // Inactive until training completes
        })
        .select()
        .single();

      if (modelError || !newModel) {
        console.error('Error creating model:', modelError);
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: `Failed to create model: ${modelError?.message}` },
          { status: 500 }
        );
      }

      modelId = newModel.id;
      console.log(`✅ Created model record: ${modelCode} (${modelId})`);
    } else {
      // Get existing model
      const { data: existingModel } = await supabase
        .from('ai_models')
        .select('model_code')
        .eq('id', modelId)
        .single();

      modelCode = existingModel?.model_code || 'UNKNOWN';
    }

    // Create training job record
    const { data: trainingJob, error: jobError } = await supabase
      .from('lora_training_jobs')
      .insert({
        model_id: modelId,
        training_images: body.training_images,
        trigger_word: triggerWord,
        steps: body.steps || 1000,
        learning_rate: body.learning_rate || 0.0004,
        batch_size: 1,
        resolution: 512,
        status: 'pending',
        progress: 0,
      })
      .select()
      .single();

    if (jobError || !trainingJob) {
      console.error('Error creating training job:', jobError);
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: `Failed to create training job: ${jobError?.message}` },
        { status: 500 }
      );
    }

    console.log(`✅ Created training job: ${trainingJob.id}`);

    // Start LoRA training (async - returns training ID immediately)
    const trainingInput: LoRATrainingInput = {
      training_images: body.training_images,
      trigger_word: triggerWord,
      steps: body.steps || 1000,
      learning_rate: body.learning_rate || 0.0004,
    };

    // Update job status to uploading
    await supabase
      .from('lora_training_jobs')
      .update({ status: 'uploading', progress: 10 })
      .eq('id', trainingJob.id);

    // Start training
    const trainingResult = await startLoRATraining(trainingInput);

    if (!trainingResult.success || !trainingResult.replicate_training_id) {
      // Training failed to start
      await supabase
        .from('lora_training_jobs')
        .update({
          status: 'failed',
          error_message: trainingResult.error,
          progress: 0,
        })
        .eq('id', trainingJob.id);

      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: trainingResult.error || 'Failed to start training' },
        { status: 500 }
      );
    }

    // Training started successfully
    await supabase
      .from('lora_training_jobs')
      .update({
        status: 'training',
        replicate_training_id: trainingResult.replicate_training_id,
        progress: 20,
        started_at: new Date().toISOString(),
      })
      .eq('id', trainingJob.id);

    console.log(`🎨 Training started: ${trainingResult.replicate_training_id}`);

    const response: StartLoRATrainingResponse = {
      success: true,
      training_job_id: trainingJob.id,
      model_id: modelId,
      trigger_word: triggerWord,
      estimated_duration_minutes: 2,
      estimated_cost_usd: 1.85,
      message: `LoRA training started for model "${body.model_name}". Training will take ~2 minutes.`,
    };

    return NextResponse.json<ApiResponse<StartLoRATrainingResponse>>(
      { success: true, data: response },
      { status: 200 }
    );

  } catch (error) {
    console.error('LoRA training error:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'LoRA training failed'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/models/train-lora?training_job_id=xxx
 * Check status of LoRA training job
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Database not configured' },
        { status: 500 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const trainingJobId = searchParams.get('training_job_id');

    if (!trainingJobId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Missing training_job_id parameter' },
        { status: 400 }
      );
    }

    // Get training job from database
    const { data: trainingJob, error } = await supabase
      .from('lora_training_jobs')
      .select('*')
      .eq('id', trainingJobId)
      .single();

    if (error || !trainingJob) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Training job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<any>>(
      {
        success: true,
        data: {
          training_job: trainingJob,
          status: trainingJob.status,
          progress: trainingJob.progress,
          error_message: trainingJob.error_message,
          lora_weights_url: trainingJob.lora_weights_url,
          sample_images: trainingJob.sample_images,
        }
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Get training status error:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get training status'
      },
      { status: 500 }
    );
  }
}
