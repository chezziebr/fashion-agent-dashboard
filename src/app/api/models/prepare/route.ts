import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { prepareModelPhoto, batchPrepareModels, ModelPrepareInput } from '@/agents/model-prepare';
import { ApiResponse } from '@/types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface PrepareRequest {
  image_url: string;
  model_name: string;
  model_code?: string;
  model_id?: string; // If provided, adds pose to existing model instead of creating new one
  gender: 'male' | 'female' | 'non-binary';
  ethnicity?: string;
  age_range?: string;
  body_type?: string;
  clothing_style?: 'athletic' | 'casual' | 'minimal';
  background?: 'white' | 'gray' | 'gradient';
  resolution?: '1k' | '2k' | '4k';
  brand?: 'TH8TA' | 'ALMOST_ZERO_MOTION';
  pose?: 'arms_down' | 'side_angle' | 'looking_down' | 'natural' | 'custom';
  custom_prompt?: string;
  transformation_strength?: number;
  use_ai_enhancement?: boolean; // Toggle for AI enhancement vs minimal processing
  replace_clothing?: boolean; // Toggle for clothing replacement
  create_model_record?: boolean; // If true, creates AI model record after processing
}

interface BatchPrepareRequest {
  models: PrepareRequest[];
}

/**
 * POST /api/models/prepare
 * Prepare a model photo (or batch of photos) for virtual try-on
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Check if this is a batch request
    if (body.models && Array.isArray(body.models)) {
      return handleBatchPrepare(body as BatchPrepareRequest);
    }

    // Single model preparation
    return handleSinglePrepare(body as PrepareRequest);

  } catch (error) {
    console.error('Model preparation error:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Model preparation failed'
      },
      { status: 500 }
    );
  }
}

/**
 * Handle single model preparation
 */
async function handleSinglePrepare(body: PrepareRequest) {
  // Validate required fields
  if (!body.image_url || !body.model_name || !body.gender) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Missing required fields: image_url, model_name, gender' },
      { status: 400 }
    );
  }

  // Prepare the input
  const input: ModelPrepareInput = {
    image_url: body.image_url,
    model_name: body.model_name,
    gender: body.gender,
    clothing_style: body.clothing_style || 'minimal',
    background: body.background || 'white',
    resolution: body.resolution || '2k',
    brand: body.brand,
    pose: body.pose || 'natural',
    custom_prompt: body.custom_prompt,
    transformation_strength: body.transformation_strength || 0.15,
    use_ai_enhancement: body.use_ai_enhancement || false, // Default to minimal processing
    replace_clothing: body.replace_clothing !== false, // Default to true
  };

  // Run the preparation agent
  const result = await prepareModelPhoto(input);

  if (!result.success) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: result.error || 'Preparation failed' },
      { status: 500 }
    );
  }

  // Upload the processed image to Supabase storage
  let uploadedUrl = result.studio_enhanced_url;

  console.log('🖼️  Studio enhanced URL from agent:', result.studio_enhanced_url);

  if (result.studio_enhanced_url && typeof result.studio_enhanced_url === 'string') {
    if (result.studio_enhanced_url.startsWith('data:')) {
      // If it's a data URL, upload to Supabase
      console.log('📤 Uploading data URL to Supabase...');
      const uploadResult = await uploadDataUrlToSupabase(
        result.studio_enhanced_url,
        `model-${body.model_code || Date.now()}-studio.jpg`
      );

      if (uploadResult.success && uploadResult.url) {
        uploadedUrl = uploadResult.url;
        console.log('✅ Data URL uploaded:', uploadedUrl);
      } else {
        console.error('❌ Data URL upload failed:', uploadResult.error);
      }
    } else if (result.studio_enhanced_url.startsWith('http')) {
      // If it's a Replicate URL, download and upload to Supabase
      console.log('📥 Downloading from Replicate and uploading to Supabase...');
      const uploadResult = await downloadAndUploadToSupabase(
        result.studio_enhanced_url,
        `model-${body.model_code || Date.now()}-studio.jpg`
      );

      if (uploadResult.success && uploadResult.url) {
        uploadedUrl = uploadResult.url;
        console.log('✅ Replicate image uploaded:', uploadedUrl);
      } else {
        console.error('❌ Replicate upload failed:', uploadResult.error);
      }
    }
  }

  console.log('🎯 Final uploaded URL:', uploadedUrl);

  // Optionally create AI model record or add pose to existing model
  let modelRecord = null;
  let poseRecord = null;

  if (body.create_model_record && uploadedUrl) {
    const modelData = {
      model_code: body.model_code || `M${Date.now()}`,
      name: body.model_name,
      gender: body.gender,
      ethnicity: body.ethnicity || null,
      age_range: body.age_range || null,
      body_type: body.body_type || null,
      base_image_url: uploadedUrl,
      thumbnail_url: uploadedUrl,
      is_active: true,
      metadata: {
        original_image: body.image_url,
        background_removed: result.background_removed_url,
        processing_steps: result.steps_completed,
        processing_duration_ms: result.duration_ms,
        brand: body.brand,
        pose: body.pose,
      },
    };

    const { data, error } = await supabase
      .from('ai_models')
      .insert(modelData)
      .select()
      .single();

    if (error) {
      console.error('Error creating model record:', error);
    } else {
      modelRecord = data;
    }
  } else if (body.model_id && uploadedUrl) {
    // Add pose to existing model
    const poseTypeMap = {
      arms_down: 'front',
      side_angle: 'side',
      looking_down: 'front',
      natural: 'front',
    };

    const poseData = {
      model_id: body.model_id,
      pose_name: body.pose || 'natural',
      pose_type: poseTypeMap[body.pose as keyof typeof poseTypeMap] || 'front',
      pose_image_url: uploadedUrl,
      thumbnail_url: uploadedUrl,
      is_default: false,
    };

    const { data, error } = await supabase
      .from('model_poses')
      .insert(poseData)
      .select()
      .single();

    if (error) {
      console.error('Error creating pose record:', error);
    } else {
      poseRecord = data;
    }
  }

  return NextResponse.json<ApiResponse<any>>(
    {
      success: true,
      data: {
        ...result,
        studio_enhanced_url: uploadedUrl,
        model_record: modelRecord,
        pose_record: poseRecord,
      },
      message: 'Model photo prepared successfully'
    },
    { status: 200 }
  );
}

/**
 * Handle batch model preparation
 */
async function handleBatchPrepare(body: BatchPrepareRequest) {
  if (!body.models || body.models.length === 0) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'No models provided in batch' },
      { status: 400 }
    );
  }

  // Convert to ModelPrepareInput array
  const inputs: ModelPrepareInput[] = body.models.map(m => ({
    image_url: m.image_url,
    model_name: m.model_name,
    gender: m.gender,
    clothing_style: m.clothing_style || 'minimal',
    background: m.background || 'white',
    resolution: m.resolution || '2k',
    brand: m.brand,
  }));

  // Run batch preparation
  const results = await batchPrepareModels(inputs);

  const successCount = results.filter(r => r.success).length;

  return NextResponse.json<ApiResponse<any>>(
    {
      success: true,
      data: {
        results,
        summary: {
          total: results.length,
          successful: successCount,
          failed: results.length - successCount,
        }
      },
      message: `Batch processing complete: ${successCount}/${results.length} successful`
    },
    { status: 200 }
  );
}

/**
 * Download image from URL and upload to Supabase storage
 */
async function downloadAndUploadToSupabase(imageUrl: string, filename: string): Promise<{
  success: boolean;
  url?: string;
  error?: string;
}> {
  try {
    // Fetch the image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from('models')
      .upload(filename, buffer, {
        contentType: response.headers.get('content-type') || 'image/jpeg',
        upsert: true,
      });

    if (error) {
      throw error;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('models')
      .getPublicUrl(data.path);

    return {
      success: true,
      url: publicUrl,
    };
  } catch (error) {
    console.error('Error downloading and uploading image:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Download/upload failed',
    };
  }
}

/**
 * Upload a data URL to Supabase storage
 */
async function uploadDataUrlToSupabase(dataUrl: string, filename: string): Promise<{
  success: boolean;
  url?: string;
  error?: string;
}> {
  try {
    // Extract base64 data from data URL
    const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new Error('Invalid data URL format');
    }

    const contentType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from('models')
      .upload(filename, buffer, {
        contentType,
        upsert: true,
      });

    if (error) {
      throw error;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('models')
      .getPublicUrl(data.path);

    return {
      success: true,
      url: publicUrl,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}
