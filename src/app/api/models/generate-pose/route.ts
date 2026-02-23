import { NextRequest, NextResponse } from 'next/server';
import Replicate from 'replicate';
import { ApiResponse } from '@/types';
import { createServerClient } from '@/lib/supabase';

// ControlNet Union Pro for pose control with face preservation
const CONTROLNET_MODEL = 'lucataco/controlnet-union-pro:bd0dacc60e6247a2a4c28502434a6d6dd5d63f93c39950e5f366775d7a9b114a' as const;

// FLUX.1-dev for LoRA-based generation
const FLUX_DEV_MODEL = 'black-forest-labs/flux-dev' as const;

interface GeneratePoseRequest {
  model_id: string; // ID of the model to generate new pose for
  reference_image_url?: string; // Optional: specific image to use as reference (defaults to base_image_url)
  pose: 'arms_down' | 'side_angle' | 'looking_down' | 'natural' | 'custom';
  custom_prompt?: string;
  transformation_strength?: number; // 0.2-0.8, controls how much to transform (default: 0.4)
  use_controlnet?: boolean; // If true, uses ControlNet for better face preservation (default: true)
}

/**
 * POST /api/models/generate-pose
 * Generate a new pose for an existing model while preserving facial features
 */
export async function POST(request: NextRequest) {
  try {
    // Check if environment variables are configured
    const replicateToken = process.env.REPLICATE_API_TOKEN;
    if (!replicateToken) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Replicate API token not configured' },
        { status: 500 }
      );
    }

    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Database not configured' },
        { status: 500 }
      );
    }

    const replicate = new Replicate({ auth: replicateToken });

    const body: GeneratePoseRequest = await request.json();

    // Validate required fields
    if (!body.model_id || !body.pose) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Missing required fields: model_id, pose' },
        { status: 400 }
      );
    }

    console.log(`🎨 Generating new pose "${body.pose}" for model ${body.model_id}...`);

    // Get model info
    const { data: model, error: modelError } = await supabase
      .from('ai_models')
      .select('*')
      .eq('id', body.model_id)
      .single();

    if (modelError || !model) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Model not found' },
        { status: 404 }
      );
    }

    // Use reference image or base image
    const referenceImageUrl = body.reference_image_url || model.base_image_url;
    console.log(`📸 Using reference image: ${referenceImageUrl}`);

    // Build the transformation prompt
    const prompt = buildPosePrompt(body.pose, body.custom_prompt, model);
    console.log(`🎨 Prompt: ${prompt.substring(0, 200)}...`);

    // Generate new pose - prioritize LoRA if available
    let generatedImageUrl: string;

    // Check if model has LoRA training
    if (model.has_lora_training && model.lora_trigger_word && model.lora_weights_url) {
      console.log('✨ Model has LoRA training! Using LoRA for perfect face consistency...');

      try {
        // Use LoRA for BEST face preservation
        generatedImageUrl = await generatePoseWithLoRA(
          model.lora_trigger_word,
          model.lora_weights_url,
          prompt,
          replicate,
          body.transformation_strength || 0.40 // Can use higher strength with LoRA!
        );
      } catch (loraError) {
        console.warn('⚠️ LoRA generation failed, falling back to ControlNet:', loraError);

        // Fallback to ControlNet
        generatedImageUrl = await generatePoseWithControlNet(
          referenceImageUrl,
          prompt,
          body.transformation_strength || 0.20,
          replicate
        );
      }
    } else if (body.use_controlnet !== false) {
      // Use ControlNet for better face preservation (more expensive but better)
      generatedImageUrl = await generatePoseWithControlNet(
        referenceImageUrl,
        prompt,
        body.transformation_strength || 0.20, // Very low to preserve facial features
        replicate
      );
    } else {
      // Use plain FLUX img2img (cheaper, less face preservation)
      generatedImageUrl = await generatePoseWithFlux(
        referenceImageUrl,
        prompt,
        body.transformation_strength || 0.15, // Even lower for FLUX since it tends to change more
        replicate
      );
    }

    console.log(`✅ Generated image: ${generatedImageUrl}`);

    // Download and upload to Supabase
    const uploadResult = await downloadAndUploadToSupabase(
      generatedImageUrl,
      `model-${body.model_id}-pose-${body.pose}-${Date.now()}.jpg`,
      supabase
    );

    if (!uploadResult.success || !uploadResult.url) {
      throw new Error(`Upload failed: ${uploadResult.error}`);
    }

    console.log(`📤 Uploaded to Supabase: ${uploadResult.url}`);

    // Save pose to database
    const poseTypeMap = {
      arms_down: 'front',
      side_angle: 'side',
      looking_down: 'front',
      natural: 'front',
    };

    const poseData = {
      model_id: body.model_id,
      pose_name: body.pose,
      pose_type: poseTypeMap[body.pose as keyof typeof poseTypeMap] || 'front',
      pose_image_url: uploadResult.url,
      thumbnail_url: uploadResult.url,
      is_default: false,
    };

    const { data: poseRecord, error: poseError } = await supabase
      .from('model_poses')
      .insert(poseData)
      .select()
      .single();

    if (poseError) {
      console.error('Error saving pose:', poseError);
      throw new Error(`Failed to save pose: ${poseError.message}`);
    }

    console.log(`✅ Pose saved to database:`, poseRecord);

    return NextResponse.json<ApiResponse<any>>(
      {
        success: true,
        data: {
          pose_record: poseRecord,
          generated_image_url: uploadResult.url,
          reference_image_url: referenceImageUrl,
        },
        message: `New pose "${body.pose}" generated successfully`
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Pose generation error:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Pose generation failed'
      },
      { status: 500 }
    );
  }
}

/**
 * Convert RGBA image to RGB by compositing onto white background
 * ControlNet expects 3-channel RGB images, not 4-channel RGBA
 */
async function convertRgbaToRgb(imageUrl: string, replicate: any): Promise<string> {
  console.log('🔄 Converting RGBA to RGB (removing alpha channel)...');

  // Use a simple image processing model to composite RGBA onto white
  // We'll use the same FLUX model with no transformation, just format conversion
  try {
    const FLUX_IMG2IMG = 'bxclib2/flux_img2img:0ce45202d83c6bd379dfe58f4c0c41e6cadf93ebbd9d938cc63cc0f2fcb729a5' as const;

    const output = await replicate.run(FLUX_IMG2IMG, {
      input: {
        image: imageUrl,
        positive_prompt: "exact same image, no changes",
        denoising: 0.01, // Minimal transformation - just format conversion
        steps: 1, // Fastest possible
        sampler_name: 'euler',
        scheduler: 'simple',
      },
    });

    // Extract URL
    let outputUrl: string | undefined;
    if (typeof output === 'string') {
      outputUrl = output;
    } else if (Array.isArray(output)) {
      outputUrl = output[0];
    } else if (output && typeof output === 'object') {
      const outputObj = output as any;
      if (typeof outputObj.url === 'function') {
        outputUrl = outputObj.url();
      } else if (typeof outputObj.url === 'string') {
        outputUrl = outputObj.url;
      }
    }

    if (outputUrl && typeof outputUrl === 'object' && 'href' in outputUrl) {
      outputUrl = (outputUrl as URL).href;
    }

    if (!outputUrl || typeof outputUrl !== 'string') {
      console.warn('⚠️  RGBA to RGB conversion failed, using original');
      return imageUrl; // Fallback to original
    }

    console.log('✅ RGB conversion successful');
    return outputUrl;
  } catch (error) {
    console.warn('⚠️  RGBA to RGB conversion failed:', error);
    return imageUrl; // Fallback to original
  }
}

/**
 * Generate pose using trained LoRA (BEST face preservation)
 * Only works if model has been LoRA-trained
 */
async function generatePoseWithLoRA(
  triggerWord: string,
  loraWeightsUrl: string,
  prompt: string,
  replicate: any,
  strength: number = 0.4
): Promise<string> {
  console.log('✨ Using trained LoRA for pose generation...');
  console.log(`🔑 Trigger word: ${triggerWord}`);
  console.log('🔧 Strength:', strength);

  // Build prompt with trigger word
  const loraPrompt = prompt.replace(/person/g, `${triggerWord} person`);

  try {
    // Generate with FLUX using the trained LoRA weights
    const output = await replicate.run(FLUX_DEV_MODEL, {
      input: {
        prompt: loraPrompt,
        guidance_scale: 3.5,
        num_inference_steps: 28,
        strength: strength, // Higher strength is OK with LoRA because face is locked
        lora: loraWeightsUrl, // Load the trained LoRA weights
        lora_scale: 1.0, // Full strength of LoRA
      },
    });

    // Extract URL from output
    let outputUrl: string | undefined;

    if (typeof output === 'string') {
      outputUrl = output;
    } else if (Array.isArray(output)) {
      outputUrl = output[0];
    } else if (output && typeof output === 'object') {
      const outputObj = output as any;
      if (typeof outputObj.url === 'function') {
        outputUrl = outputObj.url();
      } else if (typeof outputObj.url === 'string') {
        outputUrl = outputObj.url;
      }
    }

    if (outputUrl && typeof outputUrl === 'object' && 'href' in outputUrl) {
      outputUrl = (outputUrl as URL).href;
    }

    if (!outputUrl || typeof outputUrl !== 'string') {
      throw new Error(`Invalid output from FLUX LoRA: ${JSON.stringify(output)}`);
    }

    return outputUrl;
  } catch (error) {
    console.error('❌ LoRA generation failed:', error);
    throw error;
  }
}

/**
 * Generate pose using ControlNet Union Pro (better face preservation)
 */
async function generatePoseWithControlNet(
  imageUrl: string,
  prompt: string,
  strength: number,
  replicate: any
): Promise<string> {
  console.log('🎨 Using ControlNet Union Pro for pose generation...');
  console.log('🔧 Control strength:', strength);

  // Convert RGBA to RGB before sending to ControlNet
  const rgbImageUrl = await convertRgbaToRgb(imageUrl, replicate);

  const output = await replicate.run(CONTROLNET_MODEL, {
    input: {
      prompt: prompt,
      control_image: rgbImageUrl,
      control_type: 'depth', // Use depth for pose control with face preservation
      control_strength: strength,
      guidance_scale: 3.5,
      steps: 28,
    },
  });

  // Extract URL from output
  let outputUrl: string | undefined;

  if (typeof output === 'string') {
    outputUrl = output;
  } else if (Array.isArray(output)) {
    outputUrl = output[0];
  } else if (output && typeof output === 'object') {
    const outputObj = output as any;
    if (typeof outputObj.url === 'function') {
      outputUrl = outputObj.url();
    } else if (typeof outputObj.url === 'string') {
      outputUrl = outputObj.url;
    }
  }

  if (outputUrl && typeof outputUrl === 'object' && 'href' in outputUrl) {
    outputUrl = (outputUrl as URL).href;
  }

  if (!outputUrl || typeof outputUrl !== 'string') {
    throw new Error(`Invalid output from ControlNet: ${JSON.stringify(output)}`);
  }

  return outputUrl;
}

/**
 * Generate pose using FLUX img2img (cheaper, less precise)
 */
async function generatePoseWithFlux(
  imageUrl: string,
  prompt: string,
  strength: number,
  replicate: any
): Promise<string> {
  console.log('🎨 Using FLUX img2img for pose generation...');
  console.log('🔧 Denoising strength:', strength);

  const FLUX_IMG2IMG = 'bxclib2/flux_img2img:0ce45202d83c6bd379dfe58f4c0c41e6cadf93ebbd9d938cc63cc0f2fcb729a5' as const;

  const output = await replicate.run(FLUX_IMG2IMG, {
    input: {
      image: imageUrl,
      positive_prompt: prompt,
      denoising: strength,
      steps: 28,
      sampler_name: 'euler',
      scheduler: 'simple',
    },
  });

  // Extract URL from output
  let outputUrl: string | undefined;

  if (typeof output === 'string') {
    outputUrl = output;
  } else if (Array.isArray(output)) {
    outputUrl = output[0];
  } else if (output && typeof output === 'object') {
    const outputObj = output as any;
    if (typeof outputObj.url === 'function') {
      outputUrl = outputObj.url();
    } else if (typeof outputObj.url === 'string') {
      outputUrl = outputObj.url;
    }
  }

  if (outputUrl && typeof outputUrl === 'object' && 'href' in outputUrl) {
    outputUrl = (outputUrl as URL).href;
  }

  if (!outputUrl || typeof outputUrl !== 'string') {
    throw new Error(`Invalid output from FLUX: ${JSON.stringify(output)}`);
  }

  return outputUrl;
}

/**
 * Build prompt for pose generation
 */
function buildPosePrompt(
  pose: string,
  customPrompt: string | undefined,
  model: any
): string {
  if (customPrompt) {
    return customPrompt;
  }

  const poseDescriptions = {
    arms_down: 'arms relaxed down by sides, standing straight, facing camera directly',
    side_angle: 'body turned 30 degrees to the side, head turned toward camera, looking down slightly',
    looking_down: 'standing straight, head tilted down with eyes cast downward',
    natural: 'natural relaxed pose, standing confidently',
  };

  const poseDesc = poseDescriptions[pose as keyof typeof poseDescriptions] || poseDescriptions.natural;

  return `Professional studio fashion portrait with different pose:

CRITICAL - DO NOT CHANGE:
- EXACT same face - same eyes, nose, mouth, facial structure
- EXACT same facial features, bone structure, face shape
- EXACT same hair color, style, and length
- EXACT same skin tone and complexion
- This is THE SAME PERSON, just in a different pose
- DO NOT modify or transform the face in ANY way

ONLY CHANGE - POSE:
- ${poseDesc}
- Natural, relaxed body posture
- Professional fashion model stance

BACKGROUND:
- Clean white photography studio background
- Smooth, even lighting on background
- Professional studio environment

LIGHTING:
- Soft professional studio lighting
- Even, flattering light on face
- High-end fashion photography aesthetic

CLOTHING (CRITICAL - MUST BE CONSISTENT):
- Replace ALL clothing with PLAIN SOLID BEIGE/COFFEE COLORED (#C8A882) sports bra and briefs
- NO patterns, NO prints, NO designs - completely solid color
- Simple, minimal athletic underwear
- MUST be the same color and style for all poses

QUALITY:
- High-quality, sharp details
- Editorial magazine quality
- Professional studio portrait

IMPORTANT: This must be the EXACT SAME person with IDENTICAL facial features. Only the pose, angle, and background should change. The face must remain completely unchanged.`;
}

/**
 * Download image from URL and upload to Supabase storage
 */
async function downloadAndUploadToSupabase(
  imageUrl: string,
  filename: string,
  supabase: any
): Promise<{
  success: boolean;
  url?: string;
  error?: string;
}> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { data, error } = await supabase.storage
      .from('models')
      .upload(filename, buffer, {
        contentType: response.headers.get('content-type') || 'image/jpeg',
        upsert: true,
      });

    if (error) {
      throw error;
    }

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
