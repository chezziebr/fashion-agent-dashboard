# Fashion Agent Dashboard - Multi-Agent Architecture

## Executive Summary

A custom-built multi-agent system for AI-powered fashion photography management, combining garment extraction, AI model generation, and virtual try-on capabilities into a unified dashboard with visual agent orchestration.

---

## Competitive Intelligence

### Services Analyzed

| Service | Technology | Key Features | Limitations |
|---------|-----------|--------------|-------------|
| **Photoroom** | Proprietary AI | Background removal, virtual model, product staging | Expensive API, limited customization |
| **Botika** | Custom foundation models (fashion-specific) | 100% AI-generated models, Shopify integration | No prompt-based generation, limited poses |
| **Modelia** | Diffusion-based | Flatlay-to-model, pose/expression control, multiple tools | Limited API access |
| **FASHN.ai** | Custom VITON models | Virtual try-on, model consistency, API available | Per-image pricing |

### Underlying AI Technology Stack

Most services use these open-source foundations:

1. **Virtual Try-On Models**
   - **IDM-VTON** (ECCV 2024) - Best quality, two parallel UNets
   - **CatVTON** - Lightweight (899M params), runs on <8GB VRAM, FLUX-compatible
   - **OOTDiffusion** (AAAI 2025) - Outfitting fusion, stable results

2. **Garment Extraction (Try-Off)**
   - **TryOffDiff** - Stable Diffusion + SigLIP for extracting garments from model photos
   - **TryOffAnyone** - Simpler architecture, direct concatenation
   - **IGR** - Improved garment restoration with better detail preservation

3. **Base Models**
   - Stable Diffusion 1.5 / SDXL / FLUX
   - Custom fashion-trained checkpoints

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FASHION AGENT DASHBOARD                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        ORCHESTRATOR AGENT                            │   │
│  │  • Natural language command parsing                                  │   │
│  │  • Task decomposition & routing                                      │   │
│  │  • Multi-agent coordination                                          │   │
│  │  • Claude API (claude-sonnet-4-20250514)                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│           ┌────────────────────────┼────────────────────────┐              │
│           │                        │                        │              │
│           ▼                        ▼                        ▼              │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐          │
│  │ GARMENT EXTRACT │   │  MODEL MANAGER  │   │  VIRTUAL TRYON  │          │
│  │     AGENT       │   │     AGENT       │   │     AGENT       │          │
│  │                 │   │                 │   │                 │          │
│  │ • TryOffDiff    │   │ • AI Model Gen  │   │ • CatVTON/IDM   │          │
│  │ • Background    │   │ • Pose Library  │   │ • Multi-garment │          │
│  │   Removal       │   │ • Expression    │   │ • Style control │          │
│  │ • SKU Matching  │   │   Control       │   │                 │          │
│  └─────────────────┘   └─────────────────┘   └─────────────────┘          │
│           │                        │                        │              │
│           └────────────────────────┼────────────────────────┘              │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                          QC AGENT                                    │   │
│  │  • Image quality validation    • Brand consistency check             │   │
│  │  • Artifact detection          • Human approval queue                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                              DATA LAYER                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │   SUPABASE   │  │   SUPABASE   │  │     SKU      │  │    AGENT     │   │
│  │   STORAGE    │  │   DATABASE   │  │   CATALOG    │  │     LOGS     │   │
│  │              │  │              │  │              │  │              │   │
│  │ • Garments   │  │ • Models     │  │ • Products   │  │ • Executions │   │
│  │ • Models     │  │ • Jobs       │  │ • Variants   │  │ • Metrics    │   │
│  │ • Outputs    │  │ • Assets     │  │ • Categories │  │ • Workflows  │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Agent Definitions

### 1. Orchestrator Agent
**Purpose**: Parse natural language commands, coordinate other agents, manage workflows

```typescript
interface OrchestratorAgent {
  model: "claude-sonnet-4-20250514";
  capabilities: [
    "parse_natural_language_command",
    "decompose_complex_tasks", 
    "route_to_specialist_agents",
    "aggregate_results",
    "handle_errors_and_retries"
  ];
  input: string; // "put sku 123 and sku 567 onto model D12, casual and smiling"
  output: {
    task_plan: Task[];
    agent_assignments: AgentAssignment[];
    expected_outputs: OutputSpec[];
  };
}
```

**Example Flow**:
```
Input: "put sku 123 and sku 567 onto model D12, casual and smiling"

Orchestrator parses:
1. Fetch SKU 123 (shirt) from catalog → Garment Extract Agent
2. Fetch SKU 567 (pants) from catalog → Garment Extract Agent  
3. Retrieve Model D12 with casual pose + smiling expression → Model Manager Agent
4. Combine garments onto model → Virtual TryOn Agent
5. Generate 3 variations → Virtual TryOn Agent
6. Quality check results → QC Agent
7. Return approved outputs to user
```

### 2. Garment Extraction Agent
**Purpose**: Extract clean studio shots from on-model photos, background removal

```typescript
interface GarmentExtractAgent {
  models: [
    "TryOffDiff",      // Primary: HuggingFace spaces/rizavelioglu/tryoffdiff
    "TryOffAnyone",    // Backup: HuggingFace spaces/1aurent/TryOffAnyone
    "rembg"            // Background removal fallback
  ];
  capabilities: [
    "extract_garment_from_model_photo",
    "remove_background",
    "standardize_product_image",
    "detect_garment_type",
    "match_to_sku"
  ];
}
```

### 3. Model Manager Agent
**Purpose**: Generate, store, and retrieve AI fashion models with consistent identities

```typescript
interface ModelManagerAgent {
  models: [
    "FLUX.1-dev",           // Base model generation
    "InstantID",            // Face consistency
    "ControlNet-OpenPose"   // Pose control
  ];
  capabilities: [
    "generate_new_model",
    "create_model_variations",
    "change_pose",
    "change_expression",
    "maintain_identity_consistency",
    "list_available_models",
    "generate_360_views"  // front, half-front, side, back
  ];
  model_library: {
    id: string;           // e.g., "D12"
    name: string;
    base_image: string;
    face_embedding: Float32Array;
    available_poses: Pose[];
    available_expressions: Expression[];
  }[];
}
```

### 4. Virtual Try-On Agent
**Purpose**: Combine garments with models to create final fashion images

```typescript
interface VirtualTryOnAgent {
  models: [
    "CatVTON",    // Lightweight, FLUX-compatible
    "IDM-VTON",   // Higher quality
    "OOTDiffusion" // Stable fallback
  ];
  capabilities: [
    "single_garment_tryon",
    "multi_garment_tryon",
    "upper_body_tryon",
    "lower_body_tryon",
    "full_outfit_tryon",
    "generate_variations"
  ];
}
```

### 5. QC Agent
**Purpose**: Validate outputs, detect artifacts, ensure brand consistency

```typescript
interface QCAgent {
  checks: [
    "artifact_detection",      // Hands, faces, garment distortion
    "color_accuracy",          // Compare to original SKU
    "resolution_check",        // Minimum quality standards
    "brand_consistency",       // Logo visibility, style guides
    "pose_accuracy"            // Matches requested pose
  ];
  output: {
    passed: boolean;
    confidence: number;
    issues: Issue[];
    recommendations: string[];
  };
}
```

---

## Database Schema (Supabase)

```sql
-- AI Models (your curated model library)
CREATE TABLE ai_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_code VARCHAR(20) UNIQUE NOT NULL,  -- e.g., "D12", "F05"
  name VARCHAR(100),
  gender VARCHAR(20),
  ethnicity VARCHAR(50),
  age_range VARCHAR(20),
  body_type VARCHAR(50),
  base_image_url TEXT NOT NULL,
  face_embedding VECTOR(512),  -- For identity consistency
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

-- Available poses for each model
CREATE TABLE model_poses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES ai_models(id),
  pose_name VARCHAR(50),  -- "front", "half_front", "side", "back", "casual_stand"
  pose_image_url TEXT NOT NULL,
  openpose_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Available expressions
CREATE TABLE model_expressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES ai_models(id),
  expression_name VARCHAR(50),  -- "neutral", "smiling", "serious", "casual"
  reference_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product SKUs (your garment catalog)
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(200),
  brand VARCHAR(100),  -- "TH8TA" or "(ALMOST) ZERO MOTION"
  category VARCHAR(50),  -- "shirt", "pants", "jacket", etc.
  garment_type VARCHAR(50),  -- "upper", "lower", "full", "accessory"
  color VARCHAR(50),
  size_range VARCHAR(50),
  original_image_url TEXT,  -- Original photo (may have model)
  studio_image_url TEXT,    -- Extracted clean garment
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

-- Generated outputs
CREATE TABLE generated_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL,
  model_id UUID REFERENCES ai_models(id),
  product_ids UUID[],  -- Array of products used
  pose_id UUID REFERENCES model_poses(id),
  expression_id UUID REFERENCES model_expressions(id),
  output_url TEXT NOT NULL,
  thumbnail_url TEXT,
  status VARCHAR(20) DEFAULT 'pending',  -- pending, approved, rejected
  qc_score DECIMAL(3,2),
  qc_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

-- Agent execution logs
CREATE TABLE agent_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL,
  agent_name VARCHAR(50) NOT NULL,
  action VARCHAR(100) NOT NULL,
  input JSONB,
  output JSONB,
  duration_ms INTEGER,
  status VARCHAR(20),  -- success, failed, retry
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflow definitions (for visual agent dashboard)
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  trigger_type VARCHAR(50),  -- "manual", "scheduled", "webhook", "sku_upload"
  agent_sequence JSONB NOT NULL,  -- Ordered list of agents and conditions
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Jobs (user requests)
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_prompt TEXT,  -- Original natural language request
  parsed_intent JSONB,  -- Orchestrator's interpretation
  workflow_id UUID REFERENCES workflows(id),
  status VARCHAR(20) DEFAULT 'queued',  -- queued, processing, completed, failed
  progress INTEGER DEFAULT 0,  -- 0-100
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_brand ON products(brand);
CREATE INDEX idx_ai_models_code ON ai_models(model_code);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_agent_logs_job ON agent_logs(job_id);
```

---

## Tech Stack

### Frontend
- **Next.js 14** (App Router)
- **React 18** with TypeScript
- **Tailwind CSS** + custom design system
- **Framer Motion** for animations
- **React Flow** for agent workflow visualization
- **TanStack Query** for data fetching

### Backend
- **Next.js API Routes** (serverless functions)
- **Supabase** (PostgreSQL + Storage + Auth)
- **Anthropic Claude API** (orchestrator)
- **Replicate / HuggingFace** (AI model inference)

### AI Services
| Task | Primary | Fallback | Notes |
|------|---------|----------|-------|
| Garment Extraction | TryOffDiff (HF) | TryOffAnyone | Self-hosted possible |
| Virtual Try-On | CatVTON (Replicate) | IDM-VTON | Replicate has API |
| Model Generation | FLUX.1-dev | SDXL | Via Replicate/FAL |
| Pose Control | ControlNet | DWPose | Integrated in VTON |
| Background Removal | rembg | Photoroom API | rembg is free |

---

## API Endpoints

```typescript
// Core endpoints
POST /api/orchestrate          // Process natural language command
POST /api/garments/extract     // Extract garment from model photo
POST /api/models/generate      // Generate new AI model
POST /api/tryon/single         // Single garment try-on
POST /api/tryon/outfit         // Multi-garment try-on
POST /api/qc/validate          // Validate generated image

// CRUD endpoints
GET  /api/products             // List products/SKUs
POST /api/products             // Add new product
GET  /api/models               // List AI models
POST /api/models               // Add new AI model
GET  /api/jobs                 // List jobs
GET  /api/jobs/:id             // Job status and results

// Agent monitoring
GET  /api/agents               // List agent definitions
GET  /api/agents/:name/logs    // Agent execution history
GET  /api/workflows            // List workflows
POST /api/workflows            // Create new workflow
```

---

## User Interface Components

### 1. Main Dashboard
- SKU sidebar with search/filter (drag source)
- Central canvas with selected model (drag target)
- Model selector panel
- Generation controls (pose, expression, variations)
- Output gallery with approval workflow

### 2. Agent Visualization Panel
- React Flow diagram showing agents
- Real-time execution status
- Logs and metrics per agent
- Workflow editor (visual programming)

### 3. Model Library
- Grid view of all AI models
- Pose/expression previews
- Generate new model wizard
- Model consistency testing

### 4. SKU Manager
- Upload new product images
- Auto-extract garments
- Category assignment
- Brand tagging (TH8TA vs AZMO)

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Project setup (Next.js, Supabase, Tailwind)
- [ ] Database schema implementation
- [ ] Basic CRUD for products and models
- [ ] File upload to Supabase Storage
- [ ] Authentication

### Phase 2: Core Agents (Week 3-4)
- [ ] Garment Extraction Agent (TryOffDiff integration)
- [ ] Background removal pipeline
- [ ] Virtual Try-On Agent (CatVTON integration)
- [ ] Basic orchestration flow

### Phase 3: Model Management (Week 5-6)
- [ ] AI Model generation pipeline
- [ ] Pose library system
- [ ] Expression control
- [ ] Identity consistency (face embeddings)

### Phase 4: Dashboard UI (Week 7-8)
- [ ] Drag-and-drop interface
- [ ] Model selector with previews
- [ ] Generation controls
- [ ] Output gallery with QC

### Phase 5: Agent Dashboard (Week 9-10)
- [ ] React Flow agent visualization
- [ ] Workflow editor
- [ ] Real-time execution monitoring
- [ ] Logs and analytics

### Phase 6: Polish & Automation (Week 11-12)
- [ ] Natural language orchestration
- [ ] Batch processing
- [ ] Scheduled workflows
- [ ] Performance optimization

---

## Cost Estimates

| Service | Usage | Est. Monthly Cost |
|---------|-------|-------------------|
| Replicate (CatVTON) | 1000 images | $50-100 |
| Replicate (FLUX) | 500 generations | $25-50 |
| HuggingFace Pro | Inference | $9/mo |
| Anthropic Claude | 100K tokens | $15-30 |
| Supabase Pro | Database + Storage | $25/mo |
| Vercel Pro | Hosting | $20/mo |
| **Total** | | **~$150-250/mo** |

*Note: Self-hosting models on GPU (RunPod/Vast.ai) can reduce costs significantly at scale.*

---

## Getting Started

```bash
# Clone and install
cd fashion-agent-dashboard
npm install

# Set up environment variables
cp .env.example .env.local
# Add: ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY, REPLICATE_API_TOKEN

# Run development server
npm run dev

# Initialize database
npx supabase db push
```

---

## Next Steps for Claude Code

1. Initialize the Next.js project with the specified stack
2. Set up Supabase schema
3. Create the base dashboard layout
4. Implement the first agent (Garment Extraction)
5. Build drag-and-drop interface

Ready to proceed with implementation?
