'use client';

import { useState, useEffect } from 'react';
import { Upload, Sparkles, Loader2, CheckCircle2, XCircle, ImageIcon, AlertCircle } from 'lucide-react';
import { StartLoRATrainingResponse } from '@/types';

interface ModelLoRATrainProps {
  onComplete?: (result: StartLoRATrainingResponse) => void;
}

export default function ModelLoRATrain({ onComplete }: ModelLoRATrainProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTraining, setIsTraining] = useState(false);
  const [trainingJobId, setTrainingJobId] = useState<string | null>(null);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [trainingStatus, setTrainingStatus] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [result, setResult] = useState<StartLoRATrainingResponse | null>(null);

  // Form data
  const [modelName, setModelName] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'non-binary'>('female');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(file =>
      file.type.startsWith('image/')
    );

    if (files.length > 20) {
      setError('Maximum 20 images allowed');
      return;
    }

    if (files.length > 0) {
      // Add new files to existing ones (batch upload support)
      const combinedFiles = [...selectedFiles, ...files].slice(0, 20);
      setSelectedFiles(combinedFiles);
      setPreviewUrls(combinedFiles.map(file => URL.createObjectURL(file)));
      setResult(null);
      setError('');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(file =>
      file.type.startsWith('image/')
    );

    if (files.length > 20) {
      setError('Maximum 20 images allowed');
      return;
    }

    if (files.length > 0) {
      // Add new files to existing ones (batch upload support)
      const combinedFiles = [...selectedFiles, ...files].slice(0, 20);
      setSelectedFiles(combinedFiles);
      setPreviewUrls(combinedFiles.map(file => URL.createObjectURL(file)));
      setResult(null);
      setError('');
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleStartTraining = async () => {
    if (selectedFiles.length < 8) {
      setError('Please upload at least 8 images for training');
      return;
    }

    if (!modelName || !gender) {
      setError('Please fill in required fields: name and gender');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      // Step 1: Upload all images
      const uploadedUrls: string[] = [];

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];

        const uploadFormData = new FormData();
        uploadFormData.append('file', file);

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: uploadFormData,
        });

        if (!uploadRes.ok) {
          throw new Error(`Failed to upload image ${i + 1}`);
        }

        const uploadData = await uploadRes.json();

        if (!uploadData.success || !uploadData.url) {
          throw new Error(`Upload failed for image ${i + 1}`);
        }

        uploadedUrls.push(uploadData.url);
      }

      setIsProcessing(false);

      // Step 2: Start LoRA training
      setIsTraining(true);
      setTrainingStatus('Starting LoRA training...');

      const trainingRes = await fetch('/api/models/train-lora', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model_name: modelName,
          gender,
          training_images: uploadedUrls,
          steps: 1000,
        }),
      });

      if (!trainingRes.ok) {
        throw new Error('Failed to start LoRA training');
      }

      const trainingData = await trainingRes.json();

      if (!trainingData.success || !trainingData.data) {
        throw new Error(trainingData.error || 'Failed to start training');
      }

      const trainingResponse = trainingData.data as StartLoRATrainingResponse;
      setResult(trainingResponse);
      setTrainingJobId(trainingResponse.training_job_id);
      setTrainingProgress(20);
      setTrainingStatus('Training in progress...');

      // Start polling for training status
      pollTrainingStatus(trainingResponse.training_job_id);

      if (onComplete) {
        onComplete(trainingResponse);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Training failed');
      setIsProcessing(false);
      setIsTraining(false);
    }
  };

  const pollTrainingStatus = async (jobId: string) => {
    const pollInterval = 30000; // 30 seconds
    let completed = false;

    while (!completed) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));

      try {
        const statusRes = await fetch('/api/models/poll-training', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ training_job_id: jobId }),
        });

        if (statusRes.ok) {
          const statusData = await statusRes.json();

          if (statusData.success && statusData.data) {
            const { status, progress } = statusData.data;

            setTrainingProgress(progress || 0);
            setTrainingStatus(`Training ${status}...`);

            if (status === 'completed') {
              setTrainingStatus('Training completed successfully!');
              setIsTraining(false);
              completed = true;
            } else if (status === 'failed' || status === 'cancelled') {
              setError(statusData.data.error_message || `Training ${status}`);
              setIsTraining(false);
              completed = true;
            }
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }
  };

  const imageCount = selectedFiles.length;
  const isValidCount = imageCount >= 8 && imageCount <= 20;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="bg-surface rounded-lg border border-border p-6 space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            Train Custom LoRA Model
          </h2>
          <p className="text-muted">
            Upload 8-12 full-body photos of the same person to train a custom LoRA model for perfect body + face consistency.
            Training takes ~2 minutes and costs ~$1.85.
          </p>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 space-y-2">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="space-y-1 text-sm">
              <p className="text-blue-100 font-medium">Photo Guidelines for Full-Body Training</p>
              <ul className="text-blue-200/80 space-y-1 list-disc list-inside">
                <li>Upload 8-12 full-body photos of the SAME person</li>
                <li>Include: front view, side angles, 3/4 poses, different expressions</li>
                <li>Person should be clearly visible from head to toe</li>
                <li>Use varied poses and lighting (standing, sitting, arms down, etc.)</li>
                <li>High-quality images help the AI learn body proportions + face</li>
                <li className="text-yellow-300">💡 Tip: You can upload multiple times to add more photos (batch upload)</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Form Fields */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Model Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              placeholder="e.g., Sarah, Alex, Model-01"
              className="w-full px-4 py-2 bg-surface-overlay border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={isProcessing || isTraining}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Gender <span className="text-red-400">*</span>
            </label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value as any)}
              className="w-full px-4 py-2 bg-surface-overlay border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={isProcessing || isTraining}
            >
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="non-binary">Non-Binary</option>
            </select>
          </div>
        </div>

        {/* File Upload with Numbered Slots */}
        <div>
          <label className="block text-sm font-medium mb-3">
            Training Images ({imageCount}/12 recommended) <span className="text-red-400">*</span>
          </label>

          {/* Upload Area - Show only if less than 12 images */}
          {previewUrls.length < 12 && (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-primary/30 bg-primary/5 rounded-xl p-6 text-center hover:border-primary/60 hover:bg-primary/10 transition-all cursor-pointer mb-4"
            >
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                id="lora-file-input"
                disabled={isProcessing || isTraining}
              />
              <label htmlFor="lora-file-input" className="cursor-pointer">
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-10 h-10 text-primary" />
                  <p className="text-base font-medium">
                    {imageCount === 0 ? 'Drop 8-12 full-body photos here or click to browse' : `Add ${Math.max(0, 8 - imageCount)} more (${12 - imageCount} slots available)`}
                  </p>
                  <p className="text-sm text-muted">
                    JPG, PNG, WebP • Best results with 10-12 diverse angles
                  </p>
                </div>
              </label>
            </div>
          )}

          {/* Status Badge */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {imageCount >= 8 ? (
                <div className="flex items-center gap-2 px-3 py-1 bg-green-500/20 border border-green-500/40 rounded-full text-green-400 text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  Ready to train
                </div>
              ) : imageCount > 0 ? (
                <div className="flex items-center gap-2 px-3 py-1 bg-yellow-500/20 border border-yellow-500/40 rounded-full text-yellow-400 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  Need {8 - imageCount} more photos
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1 bg-surface-overlay border border-border rounded-full text-muted text-sm">
                  <ImageIcon className="w-4 h-4" />
                  No photos yet
                </div>
              )}
            </div>
            {imageCount > 0 && (
              <p className="text-xs text-muted">
                {imageCount} of 12 slots filled
              </p>
            )}
          </div>

          {/* Numbered Image Grid (InstaHeadshots-style) */}
          {previewUrls.length > 0 && (
            <div className="grid grid-cols-4 gap-3">
              {previewUrls.map((url, index) => (
                <div key={index} className="relative group aspect-[3/4]">
                  <img
                    src={url}
                    alt={`Photo ${index + 1}`}
                    className="w-full h-full object-cover rounded-lg border-2 border-primary/40 shadow-lg"
                  />
                  {/* Slot Number Badge */}
                  <div className="absolute top-2 left-2 w-7 h-7 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg">
                    {index + 1}
                  </div>
                  {/* Remove Button */}
                  <button
                    onClick={() => removeFile(index)}
                    disabled={isProcessing || isTraining}
                    className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50 shadow-lg hover:bg-red-600"
                    title="Remove photo"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all rounded-lg pointer-events-none" />
                </div>
              ))}

              {/* Empty Slots (show up to 12 total) */}
              {Array.from({ length: Math.min(12 - previewUrls.length, 12) }).map((_, index) => (
                <div
                  key={`empty-${index}`}
                  className="relative aspect-[3/4] border-2 border-dashed border-border rounded-lg bg-surface-overlay/50 flex items-center justify-center cursor-pointer hover:border-primary/40 hover:bg-surface-overlay transition-all"
                  onClick={() => document.getElementById('lora-file-input')?.click()}
                >
                  <div className="text-center">
                    <div className="w-7 h-7 bg-surface-overlay border border-border rounded-full flex items-center justify-center text-sm font-medium text-muted mx-auto mb-1">
                      {previewUrls.length + index + 1}
                    </div>
                    <Upload className="w-6 h-6 text-muted mx-auto opacity-40" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg flex items-start gap-2">
            <XCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Error</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Training Progress - Enhanced */}
        {isTraining && result && (
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/30 rounded-xl p-6 space-y-4 shadow-lg">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary/20 rounded-full">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
              <div className="flex-1">
                <h4 className="text-lg font-semibold mb-1">Training Your Model</h4>
                <p className="text-sm text-muted">{trainingStatus}</p>
              </div>
            </div>

            {/* Progress Bar with Percentage */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">Progress</span>
                <span className="font-bold text-primary">{trainingProgress}%</span>
              </div>
              <div className="w-full bg-surface-overlay rounded-full h-3 overflow-hidden shadow-inner">
                <div
                  className="bg-gradient-to-r from-primary to-primary/80 h-full transition-all duration-500 ease-out rounded-full"
                  style={{ width: `${trainingProgress}%` }}
                />
              </div>
            </div>

            {/* Training Stats */}
            <div className="grid grid-cols-3 gap-3 pt-2 border-t border-primary/20">
              <div className="text-center">
                <p className="text-xs text-muted mb-1">Images</p>
                <p className="text-sm font-semibold">{imageCount}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted mb-1">Time</p>
                <p className="text-sm font-semibold">~{result.estimated_duration_minutes}min</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted mb-1">Cost</p>
                <p className="text-sm font-semibold">${result.estimated_cost_usd.toFixed(2)}</p>
              </div>
            </div>

            {/* Training Tip */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
              <p className="text-xs text-blue-200 flex items-start gap-2">
                <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>
                  Your LoRA model is learning body proportions and facial features.
                  Once complete, you'll be able to generate unlimited poses with perfect consistency!
                </span>
              </p>
            </div>
          </div>
        )}

        {/* Success Message - Enhanced */}
        {result && !isTraining && trainingProgress === 100 && (
          <div className="bg-gradient-to-br from-green-500/20 to-green-500/10 border-2 border-green-500/40 rounded-xl p-6 shadow-lg">
            <div className="flex items-start gap-4 mb-4">
              <div className="p-3 bg-green-500/20 rounded-full">
                <CheckCircle2 className="w-6 h-6 text-green-400" />
              </div>
              <div className="flex-1">
                <h4 className="text-lg font-semibold text-green-400 mb-1">Training Completed!</h4>
                <p className="text-sm text-green-200/80">
                  Model <span className="font-semibold">"{modelName}"</span> is ready to use
                </p>
              </div>
            </div>

            <div className="bg-surface-overlay/50 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium mb-2">What you can do now:</p>
              <ul className="text-sm text-muted space-y-1.5">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>Generate unlimited fashion photos with perfect body + face consistency</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>Apply different clothing via virtual try-on</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>Create multiple poses and expressions while maintaining identity</span>
                </li>
              </ul>
            </div>

            {result.trigger_word && (
              <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-xs text-blue-200 mb-1 font-medium">Trigger Word:</p>
                <code className="text-sm text-blue-300 font-mono bg-surface-overlay px-2 py-1 rounded">
                  {result.trigger_word}
                </code>
                <p className="text-xs text-muted mt-1">
                  Use this keyword in prompts to reference this model
                </p>
              </div>
            )}
          </div>
        )}

        {/* Start Training Button */}
        <button
          onClick={handleStartTraining}
          disabled={!isValidCount || !modelName || !gender || isProcessing || isTraining}
          className="w-full btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Uploading images...
            </>
          ) : isTraining ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Training in progress...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Start LoRA Training (~2 min, ~$1.85)
            </>
          )}
        </button>
      </div>
    </div>
  );
}
