import { useState, useCallback } from 'react';
import { useDashboardStore } from '@/lib/store';
import { OrchestratorResponse, GeneratedImage } from '@/types';

// Hook for running the orchestrator
export function useOrchestrator() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OrchestratorResponse | null>(null);

  const orchestrate = useCallback(async (prompt: string, context?: Record<string, unknown>) => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, context }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Orchestration failed');
      }

      setResult(data);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { orchestrate, isLoading, error, result };
}

// Hook for running virtual try-on
export function useVirtualTryOn() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Array<{ output_url: string; model_used: string }>>([]);
  
  const { startGeneration, updateProgress, completeGeneration, failGeneration, addGeneratedImages } = useDashboardStore();

  const runTryOn = useCallback(async (
    modelImageUrl: string,
    garments: Array<{ url: string; type: 'upper' | 'lower' | 'full'; id?: string }>,
    options?: { variations?: number; jobId?: string }
  ) => {
    setIsLoading(true);
    setError(null);
    setResults([]);

    const jobId = options?.jobId || crypto.randomUUID();
    startGeneration(jobId);
    updateProgress(10, 'Starting virtual try-on...');

    try {
      const response = await fetch('/api/tryon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model_image_url: modelImageUrl,
          garments,
          variations: options?.variations || 1,
          job_id: jobId,
        }),
      });

      updateProgress(70, 'Processing results...');

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Try-on failed');
      }

      setResults(data.results);

      // Create GeneratedImage objects
      const images: GeneratedImage[] = data.results.map((r: { output_url: string; model_used: string }, i: number) => ({
        id: crypto.randomUUID(),
        job_id: jobId,
        product_ids: garments.map(g => g.id).filter(Boolean) as string[],
        output_url: r.output_url,
        status: 'pending' as const,
        variation_index: i,
        created_at: new Date().toISOString(),
      }));

      addGeneratedImages(images);
      completeGeneration();

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      failGeneration(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [startGeneration, updateProgress, completeGeneration, failGeneration, addGeneratedImages]);

  return { runTryOn, isLoading, error, results };
}

// Hook for garment extraction
export function useGarmentExtract() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ garment_url?: string } | null>(null);

  const extractGarment = useCallback(async (imageUrl: string, options?: {
    garment_type?: 'upper' | 'lower' | 'full';
    remove_background?: boolean;
  }) => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/garments/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: imageUrl,
          ...options,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Extraction failed');
      }

      setResult(data);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { extractGarment, isLoading, error, result };
}

// Hook for combined orchestrator + execution flow
export function useAgentPipeline() {
  const { orchestrate } = useOrchestrator();
  const { runTryOn } = useVirtualTryOn();
  const { extractGarment } = useGarmentExtract();
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState<string | null>(null);

  const { updateProgress } = useDashboardStore();

  const runPipeline = useCallback(async (
    prompt: string,
    data: {
      modelImageUrl: string;
      products: Array<{ url: string; type: 'upper' | 'lower' | 'full'; id?: string }>;
    }
  ) => {
    setIsRunning(true);
    setCurrentStep('Parsing command...');
    updateProgress(5, 'Parsing command...');

    try {
      // Step 1: Orchestrate
      const orchestratorResult = await orchestrate(prompt);
      
      if (!orchestratorResult.success) {
        throw new Error('Failed to parse command');
      }

      setCurrentStep('Executing task plan...');
      updateProgress(20, 'Executing task plan...');

      // Step 2: Execute based on parsed intent
      const { parsed_intent } = orchestratorResult;

      if (['single_tryon', 'multi_tryon'].includes(parsed_intent?.action || '')) {
        setCurrentStep('Running virtual try-on...');
        updateProgress(40, 'Running virtual try-on...');

        const tryOnResult = await runTryOn(
          data.modelImageUrl,
          data.products,
          { variations: parsed_intent?.variations || 1 }
        );

        return {
          success: true,
          orchestratorResult,
          tryOnResult,
        };
      }

      if (parsed_intent?.action === 'extract_garment') {
        setCurrentStep('Extracting garment...');
        updateProgress(40, 'Extracting garment...');

        const extractResult = await extractGarment(data.products[0].url);

        return {
          success: true,
          orchestratorResult,
          extractResult,
        };
      }

      throw new Error(`Unsupported action: ${parsed_intent?.action}`);
    } catch (error) {
      throw error;
    } finally {
      setIsRunning(false);
      setCurrentStep(null);
    }
  }, [orchestrate, runTryOn, extractGarment, updateProgress]);

  return { runPipeline, isRunning, currentStep };
}
