// Core types for the Fashion Agent Dashboard

// ============================================
// AI MODELS
// ============================================
export interface AIModel {
  id: string;
  model_code: string;
  name: string;
  gender: 'male' | 'female' | 'non-binary';
  ethnicity?: string;
  age_range?: string;
  body_type?: string;
  base_image_url: string;
  thumbnail_url?: string;
  style_tags?: string[];
  is_active: boolean;
  created_at: string;
  metadata?: Record<string, unknown>;
  // LoRA training
  lora_training_job_id?: string;
  lora_trigger_word?: string;
  lora_weights_url?: string;
  has_lora_training: boolean;
  // Joined data
  poses?: ModelPose[];
  expressions?: ModelExpression[];
  lora_training_job?: LoRATrainingJob;
}

export interface ModelPose {
  id: string;
  model_id: string;
  pose_name: string;
  pose_type: 'front' | 'half_front' | 'side' | 'back' | 'action' | 'seated';
  pose_image_url: string;
  thumbnail_url?: string;
  openpose_data?: Record<string, unknown>;
  is_default: boolean;
}

export interface ModelExpression {
  id: string;
  model_id: string;
  expression_name: string;
  reference_image_url?: string;
  prompt_modifier?: string;
  is_default: boolean;
}

// ============================================
// PRODUCTS
// ============================================
export interface Product {
  id: string;
  sku: string;
  name: string;
  brand: 'TH8TA' | 'ALMOST_ZERO_MOTION' | 'OTHER';
  category: string;
  garment_type: 'upper' | 'lower' | 'full' | 'accessory';
  color?: string;
  color_hex?: string;
  size_range?: string;
  original_image_url?: string;
  studio_image_url?: string;
  thumbnail_url?: string;
  extraction_status: 'pending' | 'processing' | 'completed' | 'failed';
  tags?: string[];
  is_active: boolean;
  created_at: string;
  metadata?: Record<string, unknown>;
}

// ============================================
// AGENTS
// ============================================
export interface AgentDefinition {
  id: string;
  name: AgentName;
  display_name: string;
  description: string;
  icon: string;
  color: string;
  capabilities: string[];
  input_schema?: Record<string, unknown>;
  output_schema?: Record<string, unknown>;
  config?: Record<string, unknown>;
  is_active: boolean;
}

export type AgentName = 
  | 'orchestrator' 
  | 'garment_extract' 
  | 'model_manager' 
  | 'virtual_tryon' 
  | 'qc';

export interface AgentLog {
  id: string;
  job_id: string;
  agent_name: AgentName;
  action: string;
  sequence_order?: number;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  duration_ms?: number;
  status: 'started' | 'success' | 'failed' | 'retry' | 'skipped';
  error_message?: string;
  retry_count: number;
  model_used?: string;
  api_calls: number;
  tokens_used?: number;
  created_at: string;
}

// ============================================
// WORKFLOWS
// ============================================
export interface Workflow {
  id: string;
  name: string;
  description?: string;
  trigger_type: 'manual' | 'scheduled' | 'webhook' | 'sku_upload' | 'batch';
  trigger_config?: Record<string, unknown>;
  agent_sequence: WorkflowStep[];
  input_schema?: Record<string, unknown>;
  output_schema?: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
}

export interface WorkflowStep {
  agent: AgentName;
  action: string;
  config?: Record<string, unknown>;
  conditions?: WorkflowCondition[];
  on_success?: string; // Next step ID
  on_failure?: 'retry' | 'skip' | 'abort' | string; // Step ID or action
}

export interface WorkflowCondition {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'contains' | 'exists';
  value: unknown;
}

// ============================================
// JOBS
// ============================================
export interface Job {
  id: string;
  user_prompt?: string;
  parsed_intent?: ParsedIntent;
  workflow_id?: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  error_message?: string;
  input_data?: Record<string, unknown>;
  output_data?: Record<string, unknown>;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  // Joined data
  logs?: AgentLog[];
  images?: GeneratedImage[];
}

export interface ParsedIntent {
  action: 'single_tryon' | 'multi_tryon' | 'extract_garment' | 'generate_model' | 'batch_process';
  products: string[]; // SKUs
  model?: string; // Model code
  pose?: string;
  expression?: string;
  variations?: number;
  additional_params?: Record<string, unknown>;
}

// ============================================
// GENERATED IMAGES
// ============================================
export interface GeneratedImage {
  id: string;
  job_id: string;
  model_id?: string;
  product_ids: string[];
  pose_id?: string;
  expression_id?: string;
  output_url: string;
  thumbnail_url?: string;
  width?: number;
  height?: number;
  status: 'pending' | 'approved' | 'rejected' | 'needs_review';
  qc_score?: number;
  qc_checks?: QCCheckResult[];
  qc_notes?: string;
  variation_index: number;
  generation_config?: Record<string, unknown>;
  created_at: string;
}

export interface QCCheckResult {
  check: string;
  passed: boolean;
  confidence: number;
  details?: string;
}

// ============================================
// ORCHESTRATOR TYPES
// ============================================
export interface OrchestratorRequest {
  prompt: string;
  context?: {
    available_models?: string[];
    available_products?: string[];
  };
}

export interface OrchestratorResponse {
  success: boolean;
  job_id: string;
  parsed_intent: ParsedIntent;
  task_plan: TaskPlanStep[];
  estimated_duration_seconds?: number;
}

export interface TaskPlanStep {
  step: number;
  agent: AgentName;
  action: string;
  description: string;
  inputs: string[];
  expected_outputs: string[];
}

// ============================================
// UI STATE TYPES
// ============================================
export interface DragItem {
  type: 'product' | 'model';
  id: string;
  data: Product | AIModel;
}

export interface CanvasState {
  selectedModel: AIModel | null;
  selectedPose: ModelPose | null;
  selectedExpression: ModelExpression | null;
  appliedProducts: Product[];
  isGenerating: boolean;
}

export interface GenerationOptions {
  variations: number;
  quality: 'draft' | 'standard' | 'high';
  auto_approve: boolean;
}

// ============================================
// API RESPONSE TYPES
// ============================================
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// ============================================
// LORA TRAINING TYPES
// ============================================
export interface LoRATrainingJob {
  id: string;
  model_id: string;

  // Training inputs
  training_images: string[]; // 8-12 image URLs
  trigger_word: string; // Unique trigger word (e.g., "TOK", "MDLX123")

  // Training configuration
  steps: number; // Default: 1000
  learning_rate: number; // Default: 0.0004
  batch_size: number; // Default: 1
  resolution: number; // Default: 512

  // Replicate tracking
  replicate_training_id?: string;
  replicate_version_id?: string;

  // Status
  status: 'pending' | 'uploading' | 'training' | 'completed' | 'failed' | 'cancelled';
  progress: number; // 0-100
  error_message?: string;

  // Outputs
  lora_weights_url?: string; // .safetensors file URL
  lora_file_size_mb?: number;
  sample_images?: string[]; // Test images from training

  // Metadata
  training_duration_seconds?: number;
  training_cost_usd?: number;

  // Timestamps
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

export interface PoseGenerationRequest {
  id: string;
  model_id: string;

  // Generation parameters
  pose_type: 'arms_down' | 'side_angle' | 'looking_down' | 'natural' | 'custom';
  custom_prompt?: string;
  use_lora: boolean; // Default: true
  transformation_strength: number; // Default: 0.35 with LoRA

  // Replicate tracking
  replicate_prediction_id?: string;

  // Status
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message?: string;

  // Output
  generated_pose_id?: string;
  output_url?: string;

  // Metadata
  generation_duration_seconds?: number;
  generation_cost_usd?: number;

  created_at: string;
  completed_at?: string;
}

// Request/Response types for LoRA training API
export interface StartLoRATrainingRequest {
  model_id?: string; // Optional: if not provided, will create new model
  model_name: string;
  gender: 'male' | 'female' | 'non-binary';
  training_images: string[]; // URLs of 8-12 uploaded images
  trigger_word?: string; // Optional: auto-generated if not provided
  steps?: number;
  learning_rate?: number;
}

export interface StartLoRATrainingResponse {
  success: boolean;
  training_job_id: string;
  model_id: string;
  trigger_word: string;
  estimated_duration_minutes: number;
  estimated_cost_usd: number;
  message: string;
}

export interface GeneratePoseWithLoRARequest {
  model_id: string;
  pose_type: 'arms_down' | 'side_angle' | 'looking_down' | 'natural' | 'custom';
  custom_prompt?: string;
  transformation_strength?: number; // Default: 0.35 (can be higher with LoRA)
}

export interface GeneratePoseWithLoRAResponse {
  success: boolean;
  pose_id: string;
  pose_image_url: string;
  generation_time_seconds: number;
  cost_usd: number;
  message: string;
}
