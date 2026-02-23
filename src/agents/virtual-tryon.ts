import Replicate from 'replicate';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Available try-on models on Replicate
const TRYON_MODELS = {
  catvton: 'zhengchong/catvton-flux:latest',
  idmvton: 'cuuupid/idm-vton:latest',
  ootdiffusion: 'levihsu/oot-diffusion:latest',
} as const;

export interface TryOnInput {
  model_image_url: string;      // Image of the model/person
  garment_image_url: string;    // Clean garment image
  garment_type: 'upper' | 'lower' | 'full';
  model_name?: keyof typeof TRYON_MODELS;
  seed?: number;
  steps?: number;
}

export interface TryOnOutput {
  success: boolean;
  output_url?: string;
  model_used: string;
  duration_ms: number;
  error?: string;
}

export async function runVirtualTryOn(input: TryOnInput): Promise<TryOnOutput> {
  const startTime = Date.now();
  const modelName = input.model_name || 'catvton';
  
  try {
    // Select the model based on input
    const modelId = TRYON_MODELS[modelName];
    
    // Prepare input based on the model
    let modelInput: Record<string, unknown>;
    
    switch (modelName) {
      case 'catvton':
        modelInput = {
          human_img: input.model_image_url,
          garm_img: input.garment_image_url,
          garment_des: `A ${input.garment_type} body garment`,
          category: input.garment_type === 'upper' ? 'Upper-body' : 
                   input.garment_type === 'lower' ? 'Lower-body' : 'Dress',
          seed: input.seed || Math.floor(Math.random() * 1000000),
          steps: input.steps || 30,
        };
        break;
        
      case 'idmvton':
        modelInput = {
          human_img: input.model_image_url,
          garm_img: input.garment_image_url,
          garment_des: `Professional ${input.garment_type} garment`,
          category: input.garment_type,
          denoise_steps: input.steps || 30,
          seed: input.seed || Math.floor(Math.random() * 1000000),
        };
        break;
        
      case 'ootdiffusion':
        modelInput = {
          model_image: input.model_image_url,
          cloth_image: input.garment_image_url,
          category: input.garment_type === 'upper' ? 0 : 
                   input.garment_type === 'lower' ? 1 : 2,
          steps: input.steps || 20,
          seed: input.seed || -1,
        };
        break;
        
      default:
        throw new Error(`Unknown model: ${modelName}`);
    }

    // Run the model
    const output = await replicate.run(modelId, { input: modelInput });

    // Extract the output URL (format varies by model)
    let outputUrl: string;
    if (Array.isArray(output)) {
      outputUrl = output[0] as string;
    } else if (typeof output === 'string') {
      outputUrl = output;
    } else if (output && typeof output === 'object' && 'output' in output) {
      outputUrl = (output as { output: string }).output;
    } else {
      throw new Error('Unexpected output format');
    }

    return {
      success: true,
      output_url: outputUrl,
      model_used: modelName,
      duration_ms: Date.now() - startTime,
    };
  } catch (error) {
    console.error('Virtual try-on error:', error);
    return {
      success: false,
      model_used: modelName,
      duration_ms: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Multi-garment try-on (sequential)
export async function runMultiGarmentTryOn(
  modelImageUrl: string,
  garments: Array<{ url: string; type: 'upper' | 'lower' | 'full' }>
): Promise<TryOnOutput> {
  let currentImageUrl = modelImageUrl;
  let totalDuration = 0;
  
  // Process garments in order: upper first, then lower
  const sortedGarments = [...garments].sort((a, b) => {
    const order = { upper: 0, full: 1, lower: 2 };
    return order[a.type] - order[b.type];
  });

  for (const garment of sortedGarments) {
    const result = await runVirtualTryOn({
      model_image_url: currentImageUrl,
      garment_image_url: garment.url,
      garment_type: garment.type,
    });

    totalDuration += result.duration_ms;

    if (!result.success || !result.output_url) {
      return {
        success: false,
        model_used: 'catvton',
        duration_ms: totalDuration,
        error: `Failed at ${garment.type} garment: ${result.error}`,
      };
    }

    currentImageUrl = result.output_url;
  }

  return {
    success: true,
    output_url: currentImageUrl,
    model_used: 'catvton',
    duration_ms: totalDuration,
  };
}

// Generate variations with different seeds
export async function generateVariations(
  input: TryOnInput,
  count: number
): Promise<TryOnOutput[]> {
  const baseSeed = input.seed || Math.floor(Math.random() * 1000000);
  const variations = [];

  for (let i = 0; i < count; i++) {
    const result = await runVirtualTryOn({
      ...input,
      seed: baseSeed + i * 1000,
    });
    variations.push(result);
  }

  return variations;
}
