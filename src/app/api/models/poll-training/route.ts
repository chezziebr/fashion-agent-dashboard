import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkTrainingStatus } from '@/agents/lora-trainer';
import { ApiResponse } from '@/types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/models/poll-training
 * Check and update training status for all active training jobs
 * This should be called periodically (e.g., every 30 seconds) by the client
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const trainingJobId = body.training_job_id;

    if (!trainingJobId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Missing training_job_id' },
        { status: 400 }
      );
    }

    // Get training job
    const { data: trainingJob, error: fetchError } = await supabase
      .from('lora_training_jobs')
      .select('*')
      .eq('id', trainingJobId)
      .single();

    if (fetchError || !trainingJob) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Training job not found' },
        { status: 404 }
      );
    }

    // If already completed or failed, return current status
    if (trainingJob.status === 'completed' || trainingJob.status === 'failed' || trainingJob.status === 'cancelled') {
      return NextResponse.json<ApiResponse<any>>(
        {
          success: true,
          data: {
            status: trainingJob.status,
            progress: trainingJob.progress,
            lora_weights_url: trainingJob.lora_weights_url,
            sample_images: trainingJob.sample_images,
            error_message: trainingJob.error_message,
          }
        },
        { status: 200 }
      );
    }

    // Check status on Replicate
    if (!trainingJob.replicate_training_id) {
      return NextResponse.json<ApiResponse<any>>(
        {
          success: true,
          data: {
            status: trainingJob.status,
            progress: trainingJob.progress,
            message: 'Training not yet started on Replicate',
          }
        },
        { status: 200 }
      );
    }

    console.log(`🔍 Checking training status: ${trainingJob.replicate_training_id}`);

    const replicateStatus = await checkTrainingStatus(trainingJob.replicate_training_id);

    console.log(`📊 Replicate status: ${replicateStatus.status}`);

    // Update database based on Replicate status
    let dbUpdate: any = {};

    if (replicateStatus.status === 'processing') {
      // Training in progress - update progress
      const progress = Math.min(Math.max(trainingJob.progress + 10, 30), 90); // Increment progress, cap at 90%
      dbUpdate = {
        status: 'training',
        progress,
      };
    } else if (replicateStatus.status === 'succeeded') {
      // Training completed successfully
      let loraWeightsUrl: string | undefined;
      let sampleImages: string[] = [];

      if (replicateStatus.output) {
        if (typeof replicateStatus.output === 'string') {
          loraWeightsUrl = replicateStatus.output;
        } else if (replicateStatus.output.weights) {
          loraWeightsUrl = replicateStatus.output.weights;
        } else if (replicateStatus.output.version) {
          loraWeightsUrl = `replicate:${replicateStatus.output.version}`;
        }

        if (Array.isArray(replicateStatus.output.images)) {
          sampleImages = replicateStatus.output.images;
        }
      }

      dbUpdate = {
        status: 'completed',
        progress: 100,
        lora_weights_url: loraWeightsUrl,
        sample_images: sampleImages,
        completed_at: new Date().toISOString(),
      };

      // Update model record
      await supabase
        .from('ai_models')
        .update({
          has_lora_training: true,
          lora_training_job_id: trainingJobId,
          lora_trigger_word: trainingJob.trigger_word,
          lora_weights_url: loraWeightsUrl,
          is_active: true, // Activate model now that training is complete
        })
        .eq('id', trainingJob.model_id);

      console.log(`✅ Training completed successfully!`);

    } else if (replicateStatus.status === 'failed' || replicateStatus.status === 'canceled') {
      // Training failed
      dbUpdate = {
        status: 'failed',
        progress: 0,
        error_message: replicateStatus.error || `Training ${replicateStatus.status}`,
      };

      console.error(`❌ Training ${replicateStatus.status}:`, replicateStatus.error);
    }

    // Update training job in database
    if (Object.keys(dbUpdate).length > 0) {
      await supabase
        .from('lora_training_jobs')
        .update(dbUpdate)
        .eq('id', trainingJobId);
    }

    return NextResponse.json<ApiResponse<any>>(
      {
        success: true,
        data: {
          status: dbUpdate.status || trainingJob.status,
          progress: dbUpdate.progress !== undefined ? dbUpdate.progress : trainingJob.progress,
          lora_weights_url: dbUpdate.lora_weights_url || trainingJob.lora_weights_url,
          sample_images: dbUpdate.sample_images || trainingJob.sample_images,
          error_message: dbUpdate.error_message || trainingJob.error_message,
        }
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Poll training error:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to poll training status'
      },
      { status: 500 }
    );
  }
}
