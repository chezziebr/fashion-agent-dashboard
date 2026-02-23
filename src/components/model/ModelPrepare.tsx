'use client';

import { useState } from 'react';
import { Upload, Sparkles, Loader2, CheckCircle2, XCircle, ImageIcon } from 'lucide-react';

interface ModelPrepareProps {
  onComplete?: (result: any) => void;
}

export default function ModelPrepare({ onComplete }: ModelPrepareProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
    message: string;
  } | null>(null);
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState<string>('');

  // Form data
  const [modelName, setModelName] = useState('');
  const [modelCode, setModelCode] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'non-binary'>('female');
  const [ethnicity, setEthnicity] = useState('');
  const [ageRange, setAgeRange] = useState('');
  const [bodyType, setBodyType] = useState('');
  const [clothingStyle, setClothingStyle] = useState<'athletic' | 'casual' | 'minimal'>('minimal');
  const [background, setBackground] = useState<'white' | 'gray' | 'gradient'>('white');
  const [resolution, setResolution] = useState<'1k' | '2k' | '4k'>('2k');
  const [brand, setBrand] = useState<'TH8TA' | 'ALMOST_ZERO_MOTION'>('TH8TA');
  const [createModelRecord, setCreateModelRecord] = useState(true);
  const [pose, setPose] = useState<'arms_down' | 'side_angle' | 'looking_down' | 'natural' | 'custom'>('natural');
  const [customPrompt, setCustomPrompt] = useState('');
  const [transformationStrength, setTransformationStrength] = useState(0.15); // Very low to preserve exact facial features (only lighting/clothing changes)
  const [useAiEnhancement, setUseAiEnhancement] = useState(false); // Toggle for AI enhancement vs minimal processing
  const [replaceClothing, setReplaceClothing] = useState(true); // Toggle for clothing replacement

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(file =>
      file.type.startsWith('image/')
    );
    if (files.length > 0) {
      setSelectedFiles(files);
      setPreviewUrls(files.map(file => URL.createObjectURL(file)));
      setResults([]);
      setError('');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(file =>
      file.type.startsWith('image/')
    );
    if (files.length > 0) {
      setSelectedFiles(files);
      setPreviewUrls(files.map(file => URL.createObjectURL(file)));
      setResults([]);
      setError('');
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handlePrepare = async () => {
    if (selectedFiles.length === 0 || !modelName || !gender) {
      setError('Please fill in required fields: images, name, and gender');
      return;
    }

    setIsProcessing(true);
    setError('');
    setResults([]);

    const processedResults: any[] = [];
    let createdModelId: string | null = null; // Track the model ID from first image

    try {
      // Process each image sequentially
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];

        setProgress({
          current: i + 1,
          total: selectedFiles.length,
          message: `Uploading image ${i + 1}/${selectedFiles.length}...`,
        });

        // Step 1: Upload the file
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
        const imageUrl = uploadData.data.url;

        // Step 2: Prepare the model photo
        setProgress({
          current: i + 1,
          total: selectedFiles.length,
          message: `Processing image ${i + 1}/${selectedFiles.length}...`,
        });

        const prepareRes = await fetch('/api/models/prepare', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image_url: imageUrl,
            model_name: modelName,
            model_code: i === 0 ? modelCode : undefined,
            model_id: createdModelId || undefined, // Use model ID for subsequent images
            gender,
            ethnicity: ethnicity || undefined,
            age_range: ageRange || undefined,
            body_type: bodyType || undefined,
            clothing_style: clothingStyle,
            background,
            resolution,
            brand,
            pose: i === 0 ? pose : `${pose}_${i + 1}`, // Unique pose name for each image
            custom_prompt: pose === 'custom' ? customPrompt : undefined,
            transformation_strength: transformationStrength,
            use_ai_enhancement: useAiEnhancement, // New toggle
            replace_clothing: replaceClothing, // New toggle
            create_model_record: i === 0 ? createModelRecord : false, // Only first image creates model
          }),
        });

        if (!prepareRes.ok) {
          const errorData = await prepareRes.json();
          throw new Error(errorData.error || `Model preparation failed for image ${i + 1}`);
        }

        const prepareData = await prepareRes.json();

        // Store model ID from first image for subsequent poses
        if (i === 0 && prepareData.data.model_record) {
          createdModelId = prepareData.data.model_record.id;
          console.log('📝 Created model with ID:', createdModelId);
        }

        processedResults.push({
          ...prepareData.data,
          index: i,
          filename: file.name,
        });

        // Add delay between images to respect rate limits (6 per minute = 10 seconds)
        if (i < selectedFiles.length - 1) {
          setProgress({
            current: i + 1,
            total: selectedFiles.length,
            message: `Waiting 12 seconds before next image (rate limit)...`,
          });
          await new Promise(resolve => setTimeout(resolve, 12000));
        }
      }

      setProgress({
        current: selectedFiles.length,
        total: selectedFiles.length,
        message: 'All images processed!',
      });

      setResults(processedResults);

      if (onComplete) {
        onComplete(processedResults);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Preparation error:', err);
    } finally {
      setIsProcessing(false);
      setTimeout(() => setProgress(null), 2000); // Keep success message visible
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Sparkles className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Model Photo Preparation</h2>
          <p className="text-sm text-muted">Transform beach/casual photos into studio-ready models</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Upload & Form */}
        <div className="space-y-6">
          {/* File Upload */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-border rounded-2xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
          >
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              id="model-upload"
            />
            <label htmlFor="model-upload" className="cursor-pointer">
              {previewUrls.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    {previewUrls.map((url, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={url}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            removeFile(index);
                          }}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-muted">{previewUrls.length} image{previewUrls.length > 1 ? 's' : ''} selected - Click or drag to add more</p>
                </div>
              ) : (
                <>
                  <Upload className="w-12 h-12 mx-auto mb-4 text-muted" />
                  <p className="text-lg font-medium mb-2">Upload Model Photos</p>
                  <p className="text-sm text-muted">Drag and drop or click to browse</p>
                  <p className="text-xs text-muted mt-2">Upload 4-6 angles of the same model (front, side, 3/4, etc.)</p>
                  <p className="text-xs text-muted">Beach, casual, or any background OK</p>
                </>
              )}
            </label>
          </div>

          {/* Model Info Form */}
          <div className="space-y-4 bg-surface-raised rounded-xl p-6">
            <h3 className="font-medium mb-4">Model Information</h3>

            <div>
              <label className="block text-sm font-medium mb-2">Model Name *</label>
              <input
                type="text"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                placeholder="e.g., Maya Chen"
                className="input w-full text-gray-900 bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Model Code</label>
                <input
                  type="text"
                  value={modelCode}
                  onChange={(e) => setModelCode(e.target.value)}
                  placeholder="e.g., F01"
                  className="input w-full text-gray-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Gender *</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  className="input w-full text-gray-900 bg-white"
                >
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="non-binary">Non-binary</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Ethnicity</label>
                <input
                  type="text"
                  value={ethnicity}
                  onChange={(e) => setEthnicity(e.target.value)}
                  placeholder="e.g., Asian"
                  className="input w-full text-gray-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Age Range</label>
                <input
                  type="text"
                  value={ageRange}
                  onChange={(e) => setAgeRange(e.target.value)}
                  placeholder="e.g., 25-30"
                  className="input w-full text-gray-900 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Body Type</label>
              <input
                type="text"
                value={bodyType}
                onChange={(e) => setBodyType(e.target.value)}
                placeholder="e.g., athletic, slim, plus-size"
                className="input w-full text-gray-900 bg-white"
              />
            </div>
          </div>

          {/* Processing Options */}
          <div className="space-y-4 bg-surface-raised rounded-xl p-6">
            <h3 className="font-medium mb-4">Processing Options</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Clothing Style</label>
                <select
                  value={clothingStyle}
                  onChange={(e) => setClothingStyle(e.target.value as any)}
                  className="input w-full text-gray-900 bg-white"
                >
                  <option value="minimal">Minimal (Tank + Shorts)</option>
                  <option value="athletic">Athletic Wear</option>
                  <option value="casual">Casual Wear</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Background</label>
                <select
                  value={background}
                  onChange={(e) => setBackground(e.target.value as any)}
                  className="input w-full text-gray-900 bg-white"
                >
                  <option value="white">White Studio</option>
                  <option value="gray">Gray Studio</option>
                  <option value="gradient">Gradient</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Resolution</label>
                <select
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value as any)}
                  className="input w-full text-gray-900 bg-white"
                >
                  <option value="1k">1K (1024px)</option>
                  <option value="2k">2K (2048px)</option>
                  <option value="4k">4K (4096px)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Brand</label>
                <select
                  value={brand}
                  onChange={(e) => setBrand(e.target.value as any)}
                  className="input w-full text-gray-900 bg-white"
                >
                  <option value="TH8TA">TH8TA</option>
                  <option value="ALMOST_ZERO_MOTION">Almost Zero Motion</option>
                </select>
              </div>
            </div>

            {/* Enhancement Mode Toggles */}
            <div className="space-y-3 pt-4 border-t border-border">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-surface hover:bg-surface-overlay transition-colors">
                <input
                  type="checkbox"
                  checked={useAiEnhancement}
                  onChange={(e) => setUseAiEnhancement(e.target.checked)}
                  id="use-ai-enhancement"
                  className="mt-1 rounded"
                />
                <div className="flex-1">
                  <label htmlFor="use-ai-enhancement" className="text-sm font-medium cursor-pointer">
                    Apply AI Enhancement
                  </label>
                  <p className="text-xs text-muted mt-1">
                    {useAiEnhancement
                      ? "✨ AI will enhance lighting, add professional makeup, and create studio look (may slightly alter facial features)"
                      : "🎯 Minimal processing only - preserves your exact face, just removes background and improves basic lighting"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-surface hover:bg-surface-overlay transition-colors">
                <input
                  type="checkbox"
                  checked={replaceClothing}
                  onChange={(e) => setReplaceClothing(e.target.checked)}
                  id="replace-clothing"
                  className="mt-1 rounded"
                />
                <div className="flex-1">
                  <label htmlFor="replace-clothing" className="text-sm font-medium cursor-pointer">
                    Use Standard Base Clothing
                  </label>
                  <p className="text-xs text-muted mt-1">
                    {replaceClothing
                      ? "👕 Replace with solid beige/coffee colored athletic underwear (required for virtual try-on)"
                      : "👔 Keep original clothing from your photo"}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Pose / Style</label>
              <select
                value={pose}
                onChange={(e) => setPose(e.target.value as any)}
                className="input w-full text-gray-900 bg-white"
              >
                <option value="natural">Natural (Relaxed)</option>
                <option value="arms_down">Arms Down by Sides</option>
                <option value="side_angle">Side Angle Looking Down</option>
                <option value="looking_down">Looking Down</option>
                <option value="custom">Custom Prompt</option>
              </select>
            </div>

            {pose === 'custom' && (
              <div>
                <label className="block text-sm font-medium mb-2">Custom Transformation Prompt</label>
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="e.g., Professional studio portrait, arms crossed, confident pose, white background..."
                  className="input w-full text-gray-900 bg-white h-24 resize-none"
                />
                <p className="text-xs text-muted mt-1">Describe the desired pose, lighting, and style</p>
              </div>
            )}

            {useAiEnhancement && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  AI Enhancement Strength: {(transformationStrength * 100).toFixed(0)}%
                </label>
                <input
                  type="range"
                  min="0.05"
                  max="0.60"
                  step="0.05"
                  value={transformationStrength}
                  onChange={(e) => setTransformationStrength(parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted mt-1">
                  <span>Subtle (5%)</span>
                  <span>Moderate (30%)</span>
                  <span>Strong (60%)</span>
                </div>
                <p className="text-xs text-muted mt-2">
                  ⚠️ Higher values = more professional look but risk changing facial features
                </p>
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={createModelRecord}
                onChange={(e) => setCreateModelRecord(e.target.checked)}
                id="create-record"
                className="rounded"
              />
              <label htmlFor="create-record" className="text-sm">
                Create AI model record in database
              </label>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={handlePrepare}
            disabled={isProcessing || selectedFiles.length === 0 || !modelName}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {progress ? `${progress.message} (${progress.current}/${progress.total})` : 'Processing...'}
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Prepare {selectedFiles.length > 0 ? `${selectedFiles.length} Model Photo${selectedFiles.length > 1 ? 's' : ''}` : 'Model Photos'}
              </>
            )}
          </button>

          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
              <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}
        </div>

        {/* Right Column: Results */}
        <div className="space-y-6">
          {results.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-500">
                <CheckCircle2 className="w-5 h-5" />
                <h3 className="font-medium">Processing Complete! ({results.length} image{results.length > 1 ? 's' : ''})</h3>
              </div>

              {/* Results Grid */}
              <div className="space-y-6 max-h-[800px] overflow-y-auto pr-2">
                {results.map((result, index) => (
                  <div key={index} className="bg-surface-raised rounded-xl p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">Image {index + 1}</h4>
                      <span className="text-xs text-muted">{result.filename}</span>
                    </div>

                    {/* Before/After Comparison */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs text-muted mb-1">Original</p>
                        <img
                          src={result.original_url}
                          alt={`Original ${index + 1}`}
                          className="w-full rounded-lg border border-border"
                        />
                      </div>
                      <div>
                        <p className="text-xs text-muted mb-1">Studio</p>
                        <img
                          src={result.studio_enhanced_url}
                          alt={`Enhanced ${index + 1}`}
                          className="w-full rounded-lg border border-border"
                        />
                      </div>
                    </div>

                    {/* Processing Stats */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted">Time</span>
                        <span className="font-medium">{(result.duration_ms / 1000).toFixed(1)}s</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted">Steps</span>
                        <span className="font-medium">
                          {result.steps_completed.background_removal ? '✓' : '✗'} {result.steps_completed.studio_enhancement ? '✓' : '✗'}
                        </span>
                      </div>
                    </div>

                    {index === 0 && result.model_record && (
                      <div className="pt-2 border-t border-border text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted">Model Created</span>
                          <span className="font-medium text-green-500">
                            {result.model_record.model_code}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center bg-surface-raised rounded-2xl p-12 text-center">
              <div className="space-y-4">
                <ImageIcon className="w-16 h-16 mx-auto text-muted" />
                <div>
                  <p className="font-medium text-muted">Results will appear here</p>
                  <p className="text-sm text-muted/60">Upload 4-6 angles of your model and prepare them</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
