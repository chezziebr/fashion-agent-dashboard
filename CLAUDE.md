# CLAUDE.md - Fashion Agent Dashboard

## 🚨 SESSION STARTUP PROTOCOL 🚨

**IMPORTANT**: At the start of EVERY new session, you MUST:

1. **Check for today's chat log**:
   ```bash
   ls -la .claude/chat-logs/$(date +%Y-%m-%d).md
   ```

2. **If log exists**: Read it to understand previous context
   ```bash
   cat .claude/chat-logs/$(date +%Y-%m-%d).md
   ```

3. **If log doesn't exist**: Create a new one with this template:
   ```markdown
   # Chat Log - $(date +%Y-%m-%d)

   ## Session Start: [TIME]

   ### Context from Previous Session
   [Read yesterday's log if available]

   ### Current Project State
   [Brief status]

   ---

   ## Conversation Log

   [Record all conversations here]
   ```

4. **Throughout the session**: Update the log file with:
   - All user messages
   - All your responses (summary)
   - Decisions made
   - Code changes
   - Open questions

5. **Location**: `.claude/chat-logs/YYYY-MM-DD.md`

This prevents context loss when sessions freeze or disconnect!

---

## Project Overview

This is a multi-agent AI-powered fashion photography dashboard for managing clothing imagery. The system allows users to:
1. Upload product photos and extract clean garment images
2. Select from a library of AI-generated fashion models
3. Drag-and-drop garments onto models for virtual try-on
4. Use natural language commands like "put SKU 123 on model D12, casual and smiling"
5. Monitor agent workflows and execution in real-time

**Brands**: TH8TA (sophisticated millennial athletic apparel) and (ALMOST) ZERO MOTION (Gen Z active recovery)

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom design tokens
- **State**: Zustand
- **Database**: Supabase (PostgreSQL + Storage)
- **AI Orchestration**: Anthropic Claude API (claude-sonnet-4-20250514)
- **AI Models**: Replicate (CatVTON, IDM-VTON, rembg, TryOffDiff)
- **Deployment**: Vercel

## Project Structure

```
src/
├── app/                      # Next.js App Router
│   ├── api/                  # API routes
│   │   ├── orchestrate/      # Claude-powered command parsing
│   │   ├── tryon/            # Virtual try-on endpoint
│   │   ├── products/         # Product CRUD (TODO)
│   │   └── models/           # AI Model CRUD (TODO)
│   ├── page.tsx              # Main dashboard/try-on studio
│   ├── layout.tsx            # Root layout
│   └── globals.css           # Global styles + Tailwind
├── agents/                   # Agent implementations
│   ├── orchestrator.ts       # NLP command parsing with Claude
│   ├── virtual-tryon.ts      # CatVTON/IDM-VTON integration
│   └── garment-extract.ts    # TryOffDiff + rembg integration
├── components/               # React components (TODO: build out)
│   ├── ui/                   # Base components
│   ├── dashboard/            # Dashboard-specific
│   └── agents/               # Agent visualization
├── hooks/
│   └── useAgents.ts          # React hooks for agent operations
├── lib/
│   ├── supabase.ts           # Supabase client setup
│   ├── store.ts              # Zustand state management
│   └── utils.ts              # Helper functions + constants
└── types/
    └── index.ts              # TypeScript interfaces
```

## Key Files to Understand

### `/src/agents/orchestrator.ts`
Parses natural language commands using Claude. Returns structured `ParsedIntent` with:
- `action`: single_tryon, multi_tryon, extract_garment, etc.
- `products`: Array of SKU codes
- `model`: Model code (D01, F02, etc.)
- `pose`, `expression`, `variations`

### `/src/agents/virtual-tryon.ts`
Integrates with Replicate models:
- `runVirtualTryOn()`: Single garment on model
- `runMultiGarmentTryOn()`: Sequential upper + lower body
- `generateVariations()`: Multiple outputs with different seeds

### `/src/agents/garment-extract.ts`
Extracts clean product images:
- `extractGarment()`: Uses TryOffDiff to get studio-style shots
- `removeBackground()`: Uses rembg for transparent backgrounds
- `segmentGarment()`: Uses BiRefNet for precise segmentation

### `/src/lib/store.ts`
Zustand store with:
- `canvas`: Selected model, pose, expression, applied products
- `generation`: isGenerating, progress, currentStep
- `generatedImages`: Output gallery
- `recentJobs`: Job history

### `/src/app/page.tsx`
Main dashboard UI with:
- Left sidebar: Product catalog with search/filter
- Center: Model canvas with drag-drop target
- Right panel: Model selector, pose/expression controls, generation options
- Slide-out: Agent pipeline visualization

## Database Schema

Key tables in Supabase (`supabase/migrations/001_initial_schema.sql`):
- `products`: SKU catalog with original and extracted images
- `ai_models`: AI model library with poses and expressions
- `model_poses`: Available poses per model
- `model_expressions`: Available expressions per model
- `jobs`: User requests and their status
- `generated_images`: Output images with QC status
- `agent_logs`: Detailed execution logs
- `workflows`: Visual workflow definitions

## Environment Variables

Required in `.env.local`:
```
ANTHROPIC_API_KEY=sk-ant-...
REPLICATE_API_TOKEN=r8_...
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

## Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run ESLint
npm run db:push      # Push Supabase migrations
```

## Current State (What's Built)

✅ Project structure and configuration
✅ TypeScript types for all entities
✅ Supabase schema with migrations
✅ Orchestrator agent with Claude integration
✅ Virtual try-on agent with Replicate
✅ Garment extraction agent
✅ Main dashboard UI (page.tsx)
✅ Zustand store for state management
✅ React hooks for agent operations
✅ API routes for orchestrate and tryon
✅ Vercel deployment config

## TODO (What Needs Building)

### Priority 1: Core Functionality
- [ ] Product upload component with file handling
- [ ] Supabase Storage integration for image uploads
- [ ] Product CRUD API routes (`/api/products`)
- [ ] AI Model CRUD API routes (`/api/models`)
- [ ] Connect dashboard to real Supabase data (currently mock)

### Priority 2: Model Management
- [ ] Model generation with FLUX.1-dev
- [ ] Pose library with OpenPose/ControlNet
- [ ] Expression control with prompt modifiers
- [ ] Face embedding storage for identity consistency

### Priority 3: Agent Dashboard
- [ ] React Flow workflow visualization
- [ ] Real-time job status updates (WebSocket or polling)
- [ ] Agent execution timeline view
- [ ] Workflow editor for custom pipelines

### Priority 4: QC & Polish
- [ ] QC Agent with vision model validation
- [ ] Image approval/rejection workflow
- [ ] Batch processing UI
- [ ] Export/download functionality

## API Integration Patterns

### Replicate Models
```typescript
import Replicate from 'replicate';
const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

// Run a model
const output = await replicate.run("model-owner/model-name:version", {
  input: { /* model-specific params */ }
});
```

### Anthropic Claude
```typescript
import Anthropic from '@anthropic-ai/sdk';
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const response = await client.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 1024,
  system: "System prompt here",
  messages: [{ role: 'user', content: 'User message' }],
});
```

### Supabase
```typescript
// Client-side
import { createClient } from '@/lib/supabase';
const supabase = createClient();
const { data, error } = await supabase.from('products').select('*');

// Server-side (API routes)
import { createServerClient } from '@/lib/supabase';
const supabase = createServerClient();
```

## Code Conventions

1. **File naming**: kebab-case for files, PascalCase for components
2. **Types**: Define in `/src/types/index.ts`, import as `import { Type } from '@/types'`
3. **API responses**: Always return `{ success: boolean, data?: T, error?: string }`
4. **Agent functions**: Return typed output objects with `success`, `duration_ms`, `error`
5. **Styling**: Use Tailwind utilities + custom classes from globals.css
6. **State**: Use Zustand store for global state, local useState for component state

## Testing Approach

Currently no tests. When adding:
- Unit tests for agent functions (mock Replicate/Anthropic)
- Integration tests for API routes
- E2E tests with Playwright for dashboard flows

## Deployment

1. Push to GitHub
2. Connect repo to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically on push to main

Vercel environment variables should be added as secrets:
- `@anthropic-api-key`
- `@replicate-api-token`
- `@supabase-url`
- `@supabase-anon-key`
- `@supabase-service-role-key`

## Common Tasks

### Add a new product
1. Upload image to Supabase Storage
2. Call garment extraction to get studio shot
3. Create product record with both URLs

### Run virtual try-on
1. Get model base image URL
2. Get product studio image URL(s)
3. Call `/api/tryon` with model + garments
4. Store results in `generated_images`

### Add natural language command
1. Call `/api/orchestrate` with prompt
2. Receive parsed intent + task plan
3. Execute task plan sequentially
4. Update job status throughout

## Helpful Context

- **TryOffDiff**: "Virtual Try-Off" - extracts garments from model photos
- **CatVTON**: Lightweight try-on model, runs on <8GB VRAM, FLUX-compatible
- **IDM-VTON**: Higher quality but slower, uses parallel UNets
- **OpenPose**: Skeleton detection for pose control
- **ControlNet**: Adds conditional control to diffusion models

## Questions to Ask User

When working on features, clarify:
1. Which brand (TH8TA vs AZM) for styling decisions
2. Preferred model diversity requirements
3. Quality vs speed tradeoffs for generation
4. Batch size expectations for processing
