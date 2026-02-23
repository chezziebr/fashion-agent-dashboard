import Replicate from 'replicate';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Available extraction/background removal models
const EXTRACTION_MODELS = {
  // Using specific version hashes for reliability
  rembg: 'cjwbw/rembg:fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003',
  birefnet: 'lucataco/birefnet:latest',
} as const;

export interface GarmentExtractInput {
  image_url: string;          // Image with model wearing garment
  garment_type?: 'upper' | 'lower' | 'full' | 'auto';
  remove_background?: boolean;
  output_format?: 'png' | 'jpg';
}

export interface GarmentExtractOutput {
  success: boolean;
  garment_url?: string;       // Extracted garment (studio shot style)
  mask_url?: string;          // Segmentation mask
  detected_type?: string;
  model_used: string;
  duration_ms: number;
  error?: string;
}

export async function extractGarment(input: GarmentExtractInput): Promise<GarmentExtractOutput> {
  const startTime = Date.now();

  try {
    // Use rembg for background removal as the primary extraction method
    // This creates a clean studio shot by removing the background
    const bgResult = await removeBackground(input.image_url);

    if (bgResult.success && bgResult.output_url) {
      return {
        success: true,
        garment_url: bgResult.output_url,
        detected_type: input.garment_type || 'auto',
        model_used: 'rembg',
        duration_ms: Date.now() - startTime,
      };
    } else {
      throw new Error(bgResult.error || 'Background removal failed');
    }
  } catch (error) {
    console.error('Garment extraction error:', error);

    return {
      success: false,
      model_used: 'rembg',
      duration_ms: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Background removal using rembg
export async function removeBackground(imageUrl: string): Promise<{
  success: boolean;
  output_url?: string;
  error?: string;
}> {
  try {
    const output = await replicate.run(EXTRACTION_MODELS.rembg, {
      input: {
        image: imageUrl,
      },
    });

    let outputUrl: string;
    if (typeof output === 'string') {
      outputUrl = output;
    } else if (Array.isArray(output)) {
      outputUrl = output[0] as string;
    } else {
      throw new Error('Unexpected output format');
    }

    return {
      success: true,
      output_url: outputUrl,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Background removal failed',
    };
  }
}

// High-quality segmentation using BiRefNet
export async function segmentGarment(imageUrl: string): Promise<{
  success: boolean;
  foreground_url?: string;
  mask_url?: string;
  error?: string;
}> {
  try {
    const output = await replicate.run(EXTRACTION_MODELS.birefnet, {
      input: {
        image: imageUrl,
        output_format: 'png',
      },
    });

    let outputUrl: string;
    if (typeof output === 'string') {
      outputUrl = output;
    } else if (Array.isArray(output)) {
      outputUrl = output[0] as string;
    } else {
      throw new Error('Unexpected output format');
    }

    return {
      success: true,
      foreground_url: outputUrl,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Segmentation failed',
    };
  }
}

// Detect garment type from image (simplified - would use vision model in production)
export async function detectGarmentType(imageUrl: string): Promise<{
  garment_type: 'upper' | 'lower' | 'full' | 'accessory';
  confidence: number;
}> {
  // In production, this would call a vision model to classify the garment
  // For now, return a default
  return {
    garment_type: 'upper',
    confidence: 0.5,
  };
}

// Batch extraction for multiple images
export async function batchExtractGarments(
  images: Array<{ url: string; sku?: string }>
): Promise<Array<GarmentExtractOutput & { sku?: string }>> {
  const results = [];
  
  for (const image of images) {
    const result = await extractGarment({
      image_url: image.url,
      remove_background: true,
    });
    
    results.push({
      ...result,
      sku: image.sku,
    });
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return results;
}
