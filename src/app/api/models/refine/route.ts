import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import Replicate from 'replicate';
import { ApiResponse } from '@/types';

const FLUX_IMG2IMG = 'bxclib2/flux_img2img:0ce45202d83c6bd379dfe58f4c0c41e6cadf93ebbd9d938cc63cc0f2fcb729a5' as const;

interface RefineRequest {
  model_id: string;
  refinement_instructions: string; // e.g., "make hair darker", "make eyes bigger"
  strength?: number; // 0.3-0.5 recommended for subtle changes
  update_base_image?: boolean; // If true, replaces the base_image_url with refined version
}

/**
 * POST /api/models/refine
 * Apply custom refinements to a model (hair color, facial features, etc.)
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

    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Replicate API not configured' },
        { status: 500 }
      );
    }

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    const body: RefineRequest = await request.json();

    if (!body.model_id || !body.refinement_instructions) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Missing required fields: model_id, refinement_instructions' },
        { status: 400 }
      );
    }

    console.log(`🎨 Refining model ${body.model_id} with: "${body.refinement_instructions}"`);

    // Get model
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

    // Build refinement prompt
    const prompt = buildRefinementPrompt(body.refinement_instructions, model);
    console.log(`📝 Refinement prompt: ${prompt.substring(0, 200)}...`);

    // Run FLUX img2img with low strength for subtle changes
    const strength = body.strength || 0.35; // Very conservative by default
    console.log(`🔧 Refinement strength: ${strength}`);

    const output = await replicate.run(FLUX_IMG2IMG, {
      input: {
        image: model.base_image_url,
        positive_prompt: prompt,
        denoising: strength,
        steps: 28,
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
      throw new Error(`Invalid output from FLUX: ${JSON.stringify(output)}`);
    }

    console.log(`✅ Refined image generated: ${outputUrl}`);

    // Download and upload to Supabase
    const uploadResult = await downloadAndUploadToSupabase(
      outputUrl,
      `model-${body.model_id}-refined-${Date.now()}.jpg`,
      supabase
    );

    if (!uploadResult.success || !uploadResult.url) {
      throw new Error(`Upload failed: ${uploadResult.error}`);
    }

    console.log(`📤 Uploaded to Supabase: ${uploadResult.url}`);

    // Optionally update the model's base image
    if (body.update_base_image) {
      const { error: updateError } = await supabase
        .from('ai_models')
        .update({
          base_image_url: uploadResult.url,
          thumbnail_url: uploadResult.url,
        })
        .eq('id', body.model_id);

      if (updateError) {
        console.error('Error updating base image:', updateError);
      } else {
        console.log('✅ Updated model base image');
      }
    }

    return NextResponse.json<ApiResponse<any>>(
      {
        success: true,
        data: {
          refined_image_url: uploadResult.url,
          original_image_url: model.base_image_url,
          updated_base_image: body.update_base_image || false,
        },
        message: 'Model refined successfully'
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Model refinement error:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Refinement failed'
      },
      { status: 500 }
    );
  }
}

function buildRefinementPrompt(instructions: string, model: any): string {
  return `Professional studio portrait with subtle refinements:

KEEP EXACTLY THE SAME:
- Overall facial structure and identity
- Pose and body position
- Professional studio lighting and background
- Clothing (solid beige/coffee colored athletic underwear)
- Photo quality and composition

APPLY THESE SPECIFIC REFINEMENTS:
${instructions}

IMPORTANT: Make ONLY the requested changes. Keep everything else exactly the same, including the person's overall identity and appearance. These are subtle refinements, not a transformation.`;
}

async function downloadAndUploadToSupabase(imageUrl: string, filename: string, supabase: any): Promise<{
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
