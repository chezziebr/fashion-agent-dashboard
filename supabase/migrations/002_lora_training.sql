-- LoRA Training Support for Fashion Agent Dashboard
-- Adds support for per-person FLUX LoRA training for perfect face consistency

-- ============================================
-- LORA TRAINING JOBS
-- ============================================
CREATE TABLE lora_training_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES ai_models(id) ON DELETE CASCADE,

  -- Training inputs
  training_images TEXT[] NOT NULL,  -- Array of image URLs (8-12 photos)
  trigger_word VARCHAR(50) NOT NULL,  -- Unique trigger word for this person (e.g., "TOK", "MDLX123")

  -- Training configuration
  steps INTEGER DEFAULT 1000,
  learning_rate DECIMAL(10,8) DEFAULT 0.0004,
  batch_size INTEGER DEFAULT 1,
  resolution INTEGER DEFAULT 512,

  -- Replicate job tracking
  replicate_training_id VARCHAR(100),  -- Replicate prediction/training ID
  replicate_version_id VARCHAR(100),  -- Resulting model version ID

  -- Status tracking
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'uploading', 'training', 'completed', 'failed', 'cancelled')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  error_message TEXT,

  -- Outputs
  lora_weights_url TEXT,  -- URL to download trained LoRA weights (6-8MB .safetensors file)
  lora_file_size_mb DECIMAL(5,2),
  sample_images TEXT[],  -- Test images generated during training

  -- Metadata
  training_duration_seconds INTEGER,
  training_cost_usd DECIMAL(6,4),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT valid_training_images CHECK (array_length(training_images, 1) >= 8 AND array_length(training_images, 1) <= 20)
);

-- ============================================
-- UPDATE AI_MODELS TABLE
-- ============================================
-- Add LoRA-related fields to ai_models
ALTER TABLE ai_models
ADD COLUMN lora_training_job_id UUID REFERENCES lora_training_jobs(id),
ADD COLUMN lora_trigger_word VARCHAR(50),
ADD COLUMN lora_weights_url TEXT,
ADD COLUMN has_lora_training BOOLEAN DEFAULT false;

-- ============================================
-- POSE GENERATION REQUESTS
-- ============================================
-- Track pose generation requests that use LoRA
CREATE TABLE pose_generation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES ai_models(id) ON DELETE CASCADE,

  -- Generation parameters
  pose_type VARCHAR(50) NOT NULL,  -- 'arms_down', 'side_angle', 'looking_down', 'natural'
  custom_prompt TEXT,
  use_lora BOOLEAN DEFAULT true,
  transformation_strength DECIMAL(3,2) DEFAULT 0.35,

  -- Replicate job tracking
  replicate_prediction_id VARCHAR(100),

  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,

  -- Output
  generated_pose_id UUID REFERENCES model_poses(id),
  output_url TEXT,

  -- Metadata
  generation_duration_seconds INTEGER,
  generation_cost_usd DECIMAL(6,4),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_lora_training_jobs_model ON lora_training_jobs(model_id);
CREATE INDEX idx_lora_training_jobs_status ON lora_training_jobs(status);
CREATE INDEX idx_lora_training_jobs_created ON lora_training_jobs(created_at DESC);

CREATE INDEX idx_pose_generation_model ON pose_generation_requests(model_id);
CREATE INDEX idx_pose_generation_status ON pose_generation_requests(status);

CREATE INDEX idx_ai_models_has_lora ON ai_models(has_lora_training);

-- ============================================
-- VIEWS
-- ============================================

-- View for models with LoRA training status
CREATE VIEW models_with_lora_status AS
SELECT
  m.*,
  ltj.id as training_job_id,
  ltj.status as training_status,
  ltj.progress as training_progress,
  ltj.training_duration_seconds,
  ltj.training_cost_usd,
  ltj.completed_at as training_completed_at,
  COUNT(DISTINCT mp.id) as pose_count
FROM ai_models m
LEFT JOIN lora_training_jobs ltj ON m.lora_training_job_id = ltj.id
LEFT JOIN model_poses mp ON m.id = mp.model_id
GROUP BY m.id, ltj.id;

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update model when LoRA training completes
CREATE OR REPLACE FUNCTION update_model_on_lora_completion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Update the associated model
    UPDATE ai_models
    SET
      has_lora_training = true,
      lora_trigger_word = NEW.trigger_word,
      lora_weights_url = NEW.lora_weights_url,
      lora_training_job_id = NEW.id
    WHERE id = NEW.model_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER lora_training_completed
  AFTER UPDATE ON lora_training_jobs
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION update_model_on_lora_completion();

-- Function to link generated pose to model
CREATE OR REPLACE FUNCTION link_generated_pose()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND NEW.generated_pose_id IS NOT NULL THEN
    -- Ensure the pose record exists and is linked
    UPDATE model_poses
    SET model_id = NEW.model_id
    WHERE id = NEW.generated_pose_id
    AND model_id IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pose_generation_completed
  AFTER UPDATE ON pose_generation_requests
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION link_generated_pose();
