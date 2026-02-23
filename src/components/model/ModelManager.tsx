'use client';

import { useState, useEffect } from 'react';
import { Trash2, Archive, ArchiveRestore, Sparkles, Loader2, ChevronDown, ChevronUp, Image as ImageIcon, X } from 'lucide-react';

interface Model {
  id: string;
  model_code: string;
  name: string;
  gender: string;
  base_image_url: string;
  thumbnail_url: string;
  is_active: boolean;
  poses?: any[];
}

export default function ModelManager() {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedModel, setExpandedModel] = useState<string | null>(null);
  const [generatingPose, setGeneratingPose] = useState<string | null>(null);
  const [selectedPose, setSelectedPose] = useState<{ [key: string]: string }>({});
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [refiningModel, setRefiningModel] = useState<string | null>(null);
  const [refinementInstructions, setRefinementInstructions] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      const response = await fetch('/api/models?include_poses=true');
      const data = await response.json();
      if (data.success) {
        setModels(data.data);
      }
    } catch (error) {
      console.error('Error fetching models:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (modelId: string) => {
    if (!confirm('Are you sure you want to permanently delete this model? This cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/models?id=${modelId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setModels(prev => prev.filter(m => m.id !== modelId));
      } else {
        const data = await response.json();
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error deleting model:', error);
      alert('Failed to delete model');
    }
  };

  const handleArchive = async (modelId: string, currentActive: boolean) => {
    try {
      const response = await fetch('/api/models', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: modelId,
          is_active: !currentActive,
        }),
      });

      if (response.ok) {
        setModels(prev => prev.map(m =>
          m.id === modelId ? { ...m, is_active: !currentActive } : m
        ));
      } else {
        const data = await response.json();
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error archiving model:', error);
      alert('Failed to archive model');
    }
  };

  const handleGeneratePose = async (modelId: string) => {
    const pose = selectedPose[modelId] || 'arms_down';

    setGeneratingPose(modelId);

    try {
      const response = await fetch('/api/models/generate-pose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model_id: modelId,
          pose: pose,
          transformation_strength: 0.4,
          use_controlnet: true,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert(`✅ New "${pose}" pose generated successfully!`);
        // Refresh models to show new pose
        await fetchModels();
      } else {
        alert(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error generating pose:', error);
      alert('Failed to generate pose');
    } finally {
      setGeneratingPose(null);
    }
  };

  const handleRefineModel = async (modelId: string) => {
    const instructions = refinementInstructions[modelId];

    if (!instructions || !instructions.trim()) {
      alert('Please enter refinement instructions');
      return;
    }

    const updateBase = confirm(
      'Replace the base model image with this refined version?\n\n' +
      'Click OK to replace (all future poses will use refined version)\n' +
      'Click Cancel to save as separate variation'
    );

    setRefiningModel(modelId);

    try {
      const response = await fetch('/api/models/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model_id: modelId,
          refinement_instructions: instructions,
          strength: 0.35,
          update_base_image: updateBase,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert(`✅ Model refined successfully!\n${updateBase ? 'Base image updated.' : 'Saved as new variation.'}`);
        setRefinementInstructions({ ...refinementInstructions, [modelId]: '' });
        await fetchModels();
      } else {
        alert(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error refining model:', error);
      alert('Failed to refine model');
    } finally {
      setRefiningModel(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">Model Library</h2>
        <div className="text-sm text-muted">
          {models.length} models ({models.filter(m => m.is_active).length} active)
        </div>
      </div>

      {models.length === 0 ? (
        <div className="text-center py-12 bg-surface-raised rounded-xl">
          <ImageIcon className="w-16 h-16 mx-auto mb-4 text-muted" />
          <p className="text-lg font-medium text-muted">No models yet</p>
          <p className="text-sm text-muted/60 mt-2">Upload some model photos to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {models.map((model) => (
            <div
              key={model.id}
              className={`bg-surface-raised rounded-xl p-4 border-2 transition-colors ${
                model.is_active ? 'border-transparent' : 'border-orange-500/30 bg-orange-500/5'
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Thumbnail */}
                <img
                  src={model.thumbnail_url}
                  alt={model.name}
                  className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{model.name}</h3>
                        <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">
                          {model.model_code}
                        </span>
                        {!model.is_active && (
                          <span className="text-xs px-2 py-0.5 rounded bg-orange-500/20 text-orange-500">
                            Archived
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted capitalize">{model.gender}</p>
                      <p className="text-xs text-muted mt-1">
                        {model.poses?.length || 0} pose{model.poses?.length !== 1 ? 's' : ''}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setExpandedModel(expandedModel === model.id ? null : model.id)}
                        className="btn-secondary text-sm px-3 py-1.5"
                      >
                        {expandedModel === model.id ? (
                          <>
                            <ChevronUp className="w-4 h-4" />
                            Hide
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-4 h-4" />
                            Show Poses
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleArchive(model.id, model.is_active)}
                        className="btn-secondary text-sm px-3 py-1.5"
                        title={model.is_active ? 'Archive model' : 'Restore model'}
                      >
                        {model.is_active ? (
                          <>
                            <Archive className="w-4 h-4" />
                            Archive
                          </>
                        ) : (
                          <>
                            <ArchiveRestore className="w-4 h-4" />
                            Restore
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleDelete(model.id)}
                        className="btn-secondary text-sm px-3 py-1.5 hover:bg-red-500/10 hover:text-red-500"
                        title="Delete permanently"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Expanded: Poses & Generate */}
                  {expandedModel === model.id && (
                    <div className="mt-4 pt-4 border-t border-border space-y-4">
                      {/* Existing Poses */}
                      {model.poses && model.poses.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2">Existing Poses ({model.poses.length})</h4>
                          <div className="grid grid-cols-4 gap-2">
                            {model.poses.map((pose) => (
                              <div key={pose.id} className="relative group">
                                <img
                                  src={pose.thumbnail_url}
                                  alt={pose.pose_name}
                                  onClick={() => setViewingImage(pose.pose_image_url)}
                                  className="w-full h-32 object-cover rounded border border-border cursor-pointer hover:border-primary transition-colors"
                                />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-end p-2 pointer-events-none">
                                  <span className="text-xs text-white font-medium truncate">
                                    {pose.pose_name}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Generate New Pose */}
                      <div className="bg-surface rounded-lg p-4">
                        <h4 className="text-sm font-medium mb-3">Generate New Pose</h4>
                        <div className="flex items-center gap-3">
                          <select
                            value={selectedPose[model.id] || 'arms_down'}
                            onChange={(e) => setSelectedPose({ ...selectedPose, [model.id]: e.target.value })}
                            className="input flex-1 text-gray-900 bg-white"
                            disabled={generatingPose === model.id}
                          >
                            <option value="arms_down">Arms Down by Sides</option>
                            <option value="side_angle">Side Angle Looking Down</option>
                            <option value="looking_down">Looking Down</option>
                            <option value="natural">Natural Relaxed</option>
                          </select>

                          <button
                            onClick={() => handleGeneratePose(model.id)}
                            disabled={generatingPose === model.id}
                            className="btn-primary px-4 py-2 disabled:opacity-50"
                          >
                            {generatingPose === model.id ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Generating...
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-4 h-4" />
                                Generate Pose
                              </>
                            )}
                          </button>
                        </div>
                        <p className="text-xs text-muted mt-2">
                          Uses ControlNet to preserve facial features while changing pose (~30-40s, $0.02)
                        </p>
                      </div>

                      {/* Refine Model Features */}
                      <div className="bg-surface rounded-lg p-4 border-2 border-primary/20">
                        <h4 className="text-sm font-medium mb-3">Refine Model Features</h4>
                        <div className="space-y-3">
                          <textarea
                            value={refinementInstructions[model.id] || ''}
                            onChange={(e) => setRefinementInstructions({ ...refinementInstructions, [model.id]: e.target.value })}
                            placeholder="E.g., 'Make hair darker and more brunette' or 'Make eyes slightly bigger' or 'Make nose smaller'"
                            className="input w-full text-gray-900 bg-white h-20 resize-none text-sm"
                            disabled={refiningModel === model.id}
                          />

                          <button
                            onClick={() => handleRefineModel(model.id)}
                            disabled={refiningModel === model.id || !refinementInstructions[model.id]?.trim()}
                            className="btn-primary w-full px-4 py-2 disabled:opacity-50"
                          >
                            {refiningModel === model.id ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Refining...
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-4 h-4" />
                                Refine Model
                              </>
                            )}
                          </button>

                          <p className="text-xs text-muted">
                            Apply subtle changes to facial features, hair color, etc. (~20-30s, $0.012)
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Image Viewer Modal */}
      {viewingImage && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-8"
          onClick={() => setViewingImage(null)}
        >
          <div className="relative max-w-4xl max-h-full">
            <img
              src={viewingImage}
              alt="Full size"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setViewingImage(null)}
              className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
