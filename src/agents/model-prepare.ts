import Replicate from 'replicate';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// FLUX.1-dev for high-quality image-to-image transformations
const FLUX_MODEL = 'black-forest-labs/flux-1.1-pro';

// ControlNet for pose preservation
const CONTROLNET_MODEL = 'lucataco/flux-dev-controlnet:03d87efa88fae948dce0c90e1e6e51b54f0f82e3f60f9bdc5aab3be7e1a0c99f';

export interface ModelPrepareInput {
  image_url: string;
  model_name: string;
  gender: 'male' | 'female' | 'non-binary';
  ethnicity?: string;
  age_range?: string;
  body_type?: string;
  clothing_style: 'athletic' | 'casual' | 'minimal';
  background: 'white' | 'gray' | 'gradient';
  resolution: '1k' | '2k' | '4k';
  brand?: 'TH8TA' | 'ALMOST_ZERO_MOTION';
  pose?: string;
  custom_prompt?: string;
  transformation_strength?: number;
  use_ai_enhancement?: boolean;
  replace_clothing?: boolean;
}

export interface ModelPrepareOutput {
  success: boolean;
  studio_enhanced_url?: string;
  background_removed_url?: string;
  model_used: string;
  duration_ms: number;
  steps_completed: string[];
  error?: string;
}

export async function prepareModelPhoto(input: ModelPrepareInput): Promise<ModelPrepareOutput> {
  const startTime = Date.now();
  const stepsCompleted: string[] = [];

  try {
    console.log('🎬 Starting model preparation:', {
      model_name: input.model_name,
      gender: input.gender,
      use_ai_enhancement: input.use_ai_enhancement,
      replace_clothing: input.replace_clothing,
    });

    // Build the transformation prompt based on settings
    const prompt = buildTransformationPrompt(input);
    console.log('📝 Transformation prompt:', prompt);

    // Use FLUX.1.1 Pro for high-quality image-to-image transformation
    console.log('🚀 Running FLUX.1.1 Pro transformation...');
    
    // Use explicit dimensions to avoid FLUX tensor errors with odd-sized images
    const output = await replicate.run(FLUX_MODEL, {
      input: {
        prompt: prompt,
        image: input.image_url,
        prompt_upsampling: false,
        guidance: input.transformation_strength || 3.5,
        num_inference_steps: 28,
        megapixels: '1',  // 1MP = 1024x1024, will be adjusted to 768x1024 for 2:3 ratio
        output_format: 'jpg',
        output_quality: 95,
      },
    });

    stepsCompleted.push('flux_transformation');

    let outputUrl: string;
    if (typeof output === 'string') {
      outputUrl = output;
    } else if (Array.isArray(output)) {
      outputUrl = output[0] as string;
    } else {
      throw new Error('Unexpected output format from FLUX');
    }

    console.log('✅ FLUX transformation complete:', outputUrl);

    return {
      success: true,
      studio_enhanced_url: outputUrl,
      model_used: 'flux-1.1-pro',
      duration_ms: Date.now() - startTime,
      steps_completed: stepsCompleted,
    };
  } catch (error) {
    console.error('❌ Model preparation error:', error);
    return {
      success: false,
      model_used: 'flux-1.1-pro',
      duration_ms: Date.now() - startTime,
      steps_completed: stepsCompleted,
      error: error instanceof Error ? error.message : 'Preparation failed',
    };
  }
}

/**
 * Build the transformation prompt based on user settings
 */
function buildTransformationPrompt(input: ModelPrepareInput): string {
  const parts: string[] = [];

  // Base description
  const genderDesc = input.gender === 'female' ? 'woman' : input.gender === 'male' ? 'man' : 'person';
  parts.push(`Professional fashion model photo of a ${genderDesc}`);

  // Add demographics if provided
  if (input.ethnicity) {
    parts.push(`${input.ethnicity} ethnicity`);
  }
  if (input.age_range) {
    parts.push(`age ${input.age_range}`);
  }
  if (input.body_type) {
    parts.push(`${input.body_type} body type`);
  }

  // Clothing style - CRITICAL for replacement
  if (input.replace_clothing) {
    const clothingMap = {
      minimal: 'wearing simple beige/coffee colored athletic sports bra and athletic shorts, minimal solid color activewear',
      athletic: 'wearing neutral beige athletic tank top and fitted athletic shorts',
      casual: 'wearing plain beige tank top and casual shorts',
    };
    parts.push(clothingMap[input.clothing_style] || clothingMap.minimal);
  } else {
    parts.push('keeping existing clothing');
  }

  // Background
  const backgroundMap = {
    white: 'clean white studio background, professional photography lighting',
    gray: 'neutral gray studio background, soft even lighting',
    gradient: 'subtle gray to white gradient background, professional studio setup',
  };
  parts.push(backgroundMap[input.background]);

  // AI Enhancement settings
  if (input.use_ai_enhancement) {
    parts.push(
      'professional makeup',
      'studio lighting with soft shadows',
      'high-quality commercial photography',
      'retouched skin',
      'vibrant colors'
    );
  } else {
    parts.push(
      'natural minimal makeup',
      'clean lighting',
      'realistic skin texture',
      'subtle retouching only'
    );
  }

  // Pose guidance
  if (input.pose && input.pose !== 'natural') {
    const poseMap = {
      arms_down: 'arms down by sides, facing camera directly',
      side_angle: 'body at slight angle, one shoulder forward',
      looking_down: 'looking down slightly, chin angled down',
      custom: input.custom_prompt || '',
    };
    parts.push(poseMap[input.pose as keyof typeof poseMap] || 'natural relaxed pose');
  } else {
    parts.push('natural relaxed standing pose, looking at camera');
  }

  // Quality modifiers
  parts.push(
    'sharp focus',
    'high resolution',
    '8k quality',
    'professional product photography',
    'fashion magazine quality'
  );

  // Negative prompt elements (what to avoid)
  const negative = [
    'swimsuit',
    'bikini',
    'busy background',
    'cluttered',
    'low quality',
    'blurry',
    'distorted',
    'deformed',
  ];

  const fullPrompt = parts.join(', ');
  console.log('🎨 Generated prompt:', fullPrompt);

  return fullPrompt;
}

/**
 * Batch process multiple model photos
 */
export async function batchPrepareModels(inputs: ModelPrepareInput[]): Promise<ModelPrepareOutput[]> {
  const results: ModelPrepareOutput[] = [];

  for (const input of inputs) {
    const result = await prepareModelPhoto(input);
    results.push(result);

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return results;
}
