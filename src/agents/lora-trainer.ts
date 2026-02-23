/**
 * LoRA Trainer Agent
 *
 * Trains personalized FLUX LoRA models for perfect full-body + face consistency.
 * Uses Replicate's ostris/flux-dev-lora-trainer for fast, affordable training.
 *
 * Training: ~2 minutes, ~$1.85 USD
 * Requirements: 8-12 diverse full-body training images
 * Output: 6-8MB .safetensors LoRA weights file
 * Resolution: 768x1024 optimized for full-body fashion photography
 */

import Replicate from 'replicate';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
});

// FLUX.1-dev LoRA training model
const FLUX_LORA_TRAINER = 'ostris/flux-dev-lora-trainer' as const;

// ============================================
// TYPES
// ============================================

export interface LoRATrainingInput {
  training_images: string[]; // 8-12 image URLs
  trigger_word: string; // Unique trigger word (e.g., "TOK", "MDLX123")
  steps?: number; // Default: 1000
  learning_rate?: number; // Default: 0.0004
  rank?: number; // LoRA rank, default: 16
}

export interface LoRATrainingOutput {
  success: boolean;
  replicate_training_id?: string;
  replicate_version_id?: string;
  lora_weights_url?: string;
  sample_images?: string[];
  training_duration_seconds?: number;
  estimated_cost_usd?: number;
  error?: string;
}

export interface LoRATrainingStatus {
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  progress_percentage?: number;
  logs?: string;
  output?: any;
  error?: string;
}

// ============================================
// AGENT FUNCTIONS
// ============================================

/**
 * Start LoRA training job on Replicate
 * Returns immediately with training ID for polling
 */
export async function startLoRATraining(
  input: LoRATrainingInput
): Promise<LoRATrainingOutput> {
  console.log('🎯 Starting LoRA training...');
  console.log(`📸 Training images: ${input.training_images.length}`);
  console.log(`🔑 Trigger word: ${input.trigger_word}`);

  const startTime = Date.now();

  try {
    // Validate inputs
    if (input.training_images.length < 8 || input.training_images.length > 20) {
      throw new Error(`Training requires 8-20 images, got ${input.training_images.length}`);
    }

    // Prepare training data as zip of images
    // For now, we'll pass image URLs directly - Replicate will download them
    const trainingData = {
      input: {
        steps: input.steps || 1000,
        lora_rank: input.rank || 16,
        optimizer: 'adamw8bit',
        batch_size: 1,
        resolution: '768,1024', // Higher resolution for full-body training (was: '512,768,1024')
        autocaption: true, // Auto-caption images for better training
        trigger_word: input.trigger_word,
        learning_rate: input.learning_rate || 0.0004,
        wandb_project: 'flux_train_replicate', // Optional: Weights & Biases tracking
        caption_dropout_rate: 0.05,
        cache_latents_to_disk: false,
        // Pass images as input_images parameter
        input_images: input.training_images.join('|'), // Pipe-separated URLs
      },
    };

    console.log('🚀 Submitting training job to Replicate...');

    // Create training using Replicate trainings API
    const training = await replicate.trainings.create(
      'ostris',
      'flux-dev-lora-trainer',
      '26dce37a7f4accc0946e6e54a086274b3cdbe66ceb62e39dc8ef00e7e16e7d66',
      {
        destination: `${process.env.REPLICATE_USERNAME || 'user'}/fashion-model-${Date.now()}`,
        input: trainingData.input,
      }
    );

    console.log(`✅ Training started: ${training.id}`);
    console.log(`📊 Status: ${training.status}`);

    const duration = Math.floor((Date.now() - startTime) / 1000);

    return {
      success: true,
      replicate_training_id: training.id,
      training_duration_seconds: duration,
      estimated_cost_usd: 1.85, // ~$1.85 for standard training
    };
  } catch (error) {
    console.error('❌ LoRA training failed:', error);
    const duration = Math.floor((Date.now() - startTime) / 1000);

    return {
      success: false,
      training_duration_seconds: duration,
      error: error instanceof Error ? error.message : 'LoRA training failed',
    };
  }
}

/**
 * Check status of a training job
 */
export async function checkTrainingStatus(
  trainingId: string
): Promise<LoRATrainingStatus> {
  try {
    const training = await replicate.trainings.get(trainingId);

    return {
      status: training.status as any,
      logs: training.logs || undefined,
      output: training.output,
      error: training.error ? String(training.error) : undefined,
    };
  } catch (error) {
    console.error('❌ Failed to check training status:', error);
    return {
      status: 'failed',
      error: error instanceof Error ? error.message : 'Failed to check status',
    };
  }
}

/**
 * Wait for training to complete (polls every 30 seconds)
 */
export async function waitForTrainingCompletion(
  trainingId: string,
  onProgress?: (status: LoRATrainingStatus) => void
): Promise<LoRATrainingOutput> {
  console.log(`⏳ Waiting for training ${trainingId} to complete...`);

  const startTime = Date.now();
  const maxWaitTime = 30 * 60 * 1000; // 30 minutes max
  const pollInterval = 30 * 1000; // Poll every 30 seconds

  while (Date.now() - startTime < maxWaitTime) {
    const status = await checkTrainingStatus(trainingId);

    if (onProgress) {
      onProgress(status);
    }

    console.log(`📊 Training status: ${status.status}`);

    if (status.status === 'succeeded') {
      console.log('✅ Training completed successfully!');

      // Extract LoRA weights URL from output
      let loraWeightsUrl: string | undefined;
      let sampleImages: string[] = [];

      if (status.output) {
        if (typeof status.output === 'string') {
          loraWeightsUrl = status.output;
        } else if (status.output.weights) {
          loraWeightsUrl = status.output.weights;
        } else if (status.output.version) {
          // Model version created, can be used directly
          loraWeightsUrl = `replicate:${status.output.version}`;
        }

        if (Array.isArray(status.output.images)) {
          sampleImages = status.output.images;
        }
      }

      const duration = Math.floor((Date.now() - startTime) / 1000);

      return {
        success: true,
        replicate_training_id: trainingId,
        lora_weights_url: loraWeightsUrl,
        sample_images: sampleImages,
        training_duration_seconds: duration,
        estimated_cost_usd: 1.85,
      };
    }

    if (status.status === 'failed' || status.status === 'canceled') {
      console.error(`❌ Training ${status.status}:`, status.error);

      const duration = Math.floor((Date.now() - startTime) / 1000);

      return {
        success: false,
        replicate_training_id: trainingId,
        training_duration_seconds: duration,
        error: status.error || `Training ${status.status}`,
      };
    }

    // Still processing, wait and poll again
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  // Timeout
  console.error('❌ Training timeout after 30 minutes');
  return {
    success: false,
    replicate_training_id: trainingId,
    error: 'Training timeout after 30 minutes',
  };
}

/**
 * Cancel a running training job
 */
export async function cancelTraining(trainingId: string): Promise<boolean> {
  try {
    await replicate.trainings.cancel(trainingId);
    console.log(`🛑 Training ${trainingId} cancelled`);
    return true;
  } catch (error) {
    console.error('❌ Failed to cancel training:', error);
    return false;
  }
}

/**
 * Generate a unique trigger word for a model
 */
export function generateTriggerWord(modelName: string): string {
  // Create a unique but memorable trigger word
  // Examples: "ELSA", "MDL123", "TOK_SARAH"
  const sanitized = modelName
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .substring(0, 10);

  const randomSuffix = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0');

  return `${sanitized}${randomSuffix}`;
}

/**
 * Prepare caption for training image
 * Creates diverse captions to help the model learn full body + face features
 */
export function generateTrainingCaption(
  triggerWord: string,
  imageIndex: number,
  totalImages: number
): string {
  const captionVariations = [
    `full body photo of ${triggerWord} person, standing pose, white background`,
    `${triggerWord} person full length portrait, centered, studio lighting`,
    `full body shot of ${triggerWord} person, athletic wear, professional photography`,
    `${triggerWord} person complete figure, front view, high quality image`,
    `professional full body photo of ${triggerWord} person, clean background`,
    `${triggerWord} person full body, natural pose, studio environment`,
    `full length portrait of ${triggerWord} person, detailed features, well lit`,
    `${triggerWord} person head to toe, standing position, minimal background`,
    `full body photograph of ${triggerWord} person, fashion photography style`,
    `${triggerWord} person full figure, centered composition, professional lighting`,
  ];

  // Cycle through variations to ensure diversity
  const index = imageIndex % captionVariations.length;
  return captionVariations[index];
}
