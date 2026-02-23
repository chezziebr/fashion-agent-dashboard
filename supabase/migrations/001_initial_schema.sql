-- Fashion Agent Dashboard Schema
-- Run with: supabase db push

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================
-- AI MODELS (Curated model library)
-- ============================================
CREATE TABLE ai_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_code VARCHAR(20) UNIQUE NOT NULL,  -- e.g., "D12", "F05"
  name VARCHAR(100),
  gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'non-binary')),
  ethnicity VARCHAR(50),
  age_range VARCHAR(20),  -- e.g., "20-25", "30-35"
  body_type VARCHAR(50),  -- e.g., "athletic", "slim", "plus-size"
  base_image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  face_embedding VECTOR(512),  -- For identity consistency with InstantID
  style_tags TEXT[],  -- e.g., ["casual", "athletic", "luxury"]
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ai_models_updated_at
  BEFORE UPDATE ON ai_models
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- MODEL POSES
-- ============================================
CREATE TABLE model_poses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES ai_models(id) ON DELETE CASCADE,
  pose_name VARCHAR(50) NOT NULL,  -- "front", "half_front", "side", "back", "casual_stand"
  pose_type VARCHAR(30) CHECK (pose_type IN ('front', 'half_front', 'side', 'back', 'action', 'seated')),
  pose_image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  openpose_data JSONB,  -- OpenPose keypoints for ControlNet
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(model_id, pose_name)
);

-- ============================================
-- MODEL EXPRESSIONS
-- ============================================
CREATE TABLE model_expressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES ai_models(id) ON DELETE CASCADE,
  expression_name VARCHAR(50) NOT NULL,  -- "neutral", "smiling", "serious", "casual", "laughing"
  reference_image_url TEXT,
  prompt_modifier TEXT,  -- Additional prompt text for this expression
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(model_id, expression_name)
);

-- ============================================
-- PRODUCTS / SKUs (Garment catalog)
-- ============================================
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  brand VARCHAR(100) CHECK (brand IN ('TH8TA', 'ALMOST_ZERO_MOTION', 'OTHER')),
  category VARCHAR(50) NOT NULL,  -- "shirt", "pants", "jacket", "dress", "shorts", etc.
  garment_type VARCHAR(20) NOT NULL CHECK (garment_type IN ('upper', 'lower', 'full', 'accessory')),
  color VARCHAR(50),
  color_hex VARCHAR(7),  -- e.g., "#FF5733"
  size_range VARCHAR(50),  -- e.g., "XS-XL"
  original_image_url TEXT,  -- Original photo (may have model)
  studio_image_url TEXT,    -- Extracted clean garment (white/transparent bg)
  thumbnail_url TEXT,
  extraction_status VARCHAR(20) DEFAULT 'pending' CHECK (extraction_status IN ('pending', 'processing', 'completed', 'failed')),
  extraction_job_id UUID,
  tags TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- WORKFLOWS (Visual agent programming)
-- ============================================
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  trigger_type VARCHAR(50) CHECK (trigger_type IN ('manual', 'scheduled', 'webhook', 'sku_upload', 'batch')),
  trigger_config JSONB,  -- Cron schedule, webhook URL, etc.
  agent_sequence JSONB NOT NULL,  -- Ordered list of agents and conditions
  -- Example: [{"agent": "garment_extract", "config": {...}}, {"agent": "virtual_tryon", "config": {...}}]
  input_schema JSONB,  -- Expected input structure
  output_schema JSONB,  -- Expected output structure
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER workflows_updated_at
  BEFORE UPDATE ON workflows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- JOBS (User requests / executions)
-- ============================================
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_prompt TEXT,  -- Original natural language request
  parsed_intent JSONB,  -- Orchestrator's interpretation
  workflow_id UUID REFERENCES workflows(id),
  status VARCHAR(20) DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  error_message TEXT,
  input_data JSONB,
  output_data JSONB,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- GENERATED IMAGES (Outputs)
-- ============================================
CREATE TABLE generated_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  model_id UUID REFERENCES ai_models(id),
  product_ids UUID[] NOT NULL,  -- Array of products used
  pose_id UUID REFERENCES model_poses(id),
  expression_id UUID REFERENCES model_expressions(id),
  output_url TEXT NOT NULL,
  thumbnail_url TEXT,
  width INTEGER,
  height INTEGER,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'needs_review')),
  qc_score DECIMAL(3,2) CHECK (qc_score >= 0 AND qc_score <= 1),
  qc_checks JSONB,  -- Detailed QC results
  qc_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID,
  variation_index INTEGER DEFAULT 0,  -- If multiple variations generated
  generation_config JSONB,  -- Model parameters used
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- AGENT DEFINITIONS
-- ============================================
CREATE TABLE agent_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL,  -- "orchestrator", "garment_extract", "model_manager", "virtual_tryon", "qc"
  display_name VARCHAR(100),
  description TEXT,
  icon VARCHAR(50),  -- Lucide icon name
  color VARCHAR(20),  -- Hex color for visualization
  capabilities TEXT[],
  input_schema JSONB,
  output_schema JSONB,
  config JSONB,  -- Default configuration
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default agent definitions
INSERT INTO agent_definitions (name, display_name, description, icon, color, capabilities) VALUES
('orchestrator', 'Orchestrator', 'Parses natural language commands and coordinates other agents', 'brain', '#8B5CF6', ARRAY['parse_commands', 'route_tasks', 'aggregate_results']),
('garment_extract', 'Garment Extractor', 'Extracts clean garment images from model photos', 'shirt', '#10B981', ARRAY['extract_garment', 'remove_background', 'detect_garment_type']),
('model_manager', 'Model Manager', 'Generates and manages AI fashion models', 'user', '#3B82F6', ARRAY['generate_model', 'change_pose', 'change_expression', 'maintain_identity']),
('virtual_tryon', 'Virtual Try-On', 'Combines garments with models to create final images', 'sparkles', '#F59E0B', ARRAY['single_tryon', 'multi_tryon', 'generate_variations']),
('qc', 'Quality Control', 'Validates outputs and ensures brand consistency', 'check-circle', '#EF4444', ARRAY['detect_artifacts', 'check_colors', 'validate_pose']);

-- ============================================
-- AGENT EXECUTION LOGS
-- ============================================
CREATE TABLE agent_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  agent_name VARCHAR(50) NOT NULL,
  action VARCHAR(100) NOT NULL,
  sequence_order INTEGER,  -- Order in the workflow
  input JSONB,
  output JSONB,
  duration_ms INTEGER,
  status VARCHAR(20) CHECK (status IN ('started', 'success', 'failed', 'retry', 'skipped')),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  model_used VARCHAR(100),  -- Which AI model was used
  api_calls INTEGER DEFAULT 0,  -- Number of external API calls
  tokens_used INTEGER,  -- For LLM calls
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- STORAGE BUCKETS (Run in Supabase dashboard or via CLI)
-- ============================================
-- Note: Create these buckets via Supabase dashboard:
-- 1. 'products' - Original product images
-- 2. 'garments' - Extracted garment images
-- 3. 'models' - AI model images
-- 4. 'poses' - Pose reference images
-- 5. 'outputs' - Generated try-on images
-- 6. 'temp' - Temporary processing files

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_brand ON products(brand);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_garment_type ON products(garment_type);
CREATE INDEX idx_products_extraction_status ON products(extraction_status);

CREATE INDEX idx_ai_models_code ON ai_models(model_code);
CREATE INDEX idx_ai_models_gender ON ai_models(gender);
CREATE INDEX idx_ai_models_active ON ai_models(is_active);

CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_created ON jobs(created_at DESC);

CREATE INDEX idx_agent_logs_job ON agent_logs(job_id);
CREATE INDEX idx_agent_logs_agent ON agent_logs(agent_name);
CREATE INDEX idx_agent_logs_created ON agent_logs(created_at DESC);

CREATE INDEX idx_generated_images_job ON generated_images(job_id);
CREATE INDEX idx_generated_images_model ON generated_images(model_id);
CREATE INDEX idx_generated_images_status ON generated_images(status);

-- ============================================
-- ROW LEVEL SECURITY (Optional - for multi-tenant)
-- ============================================
-- ALTER TABLE products ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE ai_models ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE generated_images ENABLE ROW LEVEL SECURITY;

-- ============================================
-- VIEWS
-- ============================================

-- View for job progress with agent status
CREATE VIEW job_progress AS
SELECT 
  j.id,
  j.user_prompt,
  j.status,
  j.progress,
  j.created_at,
  j.started_at,
  j.completed_at,
  COUNT(al.id) as total_steps,
  COUNT(CASE WHEN al.status = 'success' THEN 1 END) as completed_steps,
  COUNT(CASE WHEN al.status = 'failed' THEN 1 END) as failed_steps,
  SUM(al.duration_ms) as total_duration_ms,
  json_agg(
    json_build_object(
      'agent', al.agent_name,
      'action', al.action,
      'status', al.status,
      'duration_ms', al.duration_ms
    ) ORDER BY al.sequence_order
  ) as steps
FROM jobs j
LEFT JOIN agent_logs al ON j.id = al.job_id
GROUP BY j.id;

-- View for model catalog with pose/expression counts
CREATE VIEW model_catalog AS
SELECT 
  m.*,
  COUNT(DISTINCT p.id) as pose_count,
  COUNT(DISTINCT e.id) as expression_count,
  array_agg(DISTINCT p.pose_name) FILTER (WHERE p.pose_name IS NOT NULL) as available_poses,
  array_agg(DISTINCT e.expression_name) FILTER (WHERE e.expression_name IS NOT NULL) as available_expressions
FROM ai_models m
LEFT JOIN model_poses p ON m.id = p.model_id
LEFT JOIN model_expressions e ON m.id = e.model_id
WHERE m.is_active = true
GROUP BY m.id;
