# Fashion Agent Dashboard

A multi-agent AI-powered fashion photography management system for TH8TA and (ALMOST) ZERO MOTION apparel brands.

## Features

- 🎨 **Drag-and-Drop Interface**: Select products from your SKU catalog and drop them onto AI models
- 🤖 **Multi-Agent System**: Orchestrator, Garment Extractor, Model Manager, Virtual Try-On, and QC agents
- 💬 **Natural Language Commands**: "Put SKU TH8-001 onto model D12, casual and smiling"
- 🔄 **Virtual Try-On**: AI-powered clothing visualization using CatVTON, IDM-VTON, or OOTDiffusion
- 📊 **Agent Dashboard**: Visual workflow editor with real-time execution monitoring
- 🗃️ **SKU Management**: Product catalog with automatic garment extraction

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS, Framer Motion
- **State Management**: Zustand, TanStack Query
- **Database**: Supabase (PostgreSQL + Storage)
- **AI Orchestration**: Claude claude-sonnet-4-20250514 (Anthropic API)
- **AI Models**: 
  - Virtual Try-On: CatVTON, IDM-VTON (via Replicate)
  - Garment Extraction: TryOffDiff (HuggingFace)
  - Background Removal: rembg, BiRefNet
- **Visualization**: React Flow (agent workflows)

## Quick Start

### Prerequisites

- Node.js 18+
- Supabase account
- API keys: Anthropic, Replicate

### Installation

```bash
# Clone the repo (or copy from Claude outputs)
cd fashion-agent-dashboard

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Add your API keys to .env.local
```

### Environment Variables

```env
# Anthropic Claude API
ANTHROPIC_API_KEY=sk-ant-...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Replicate (for AI model inference)
REPLICATE_API_TOKEN=r8_...
```

### Database Setup

1. Create a new Supabase project
2. Run the migration:

```bash
# Using Supabase CLI
npx supabase db push

# Or manually run the SQL in:
# supabase/migrations/001_initial_schema.sql
```

3. Create storage buckets in Supabase dashboard:
   - `products` - Original product images
   - `garments` - Extracted garment images  
   - `models` - AI model images
   - `outputs` - Generated try-on images

### Run Development Server

```bash
npm run dev
# Open http://localhost:3000
```

## Project Structure

```
fashion-agent-dashboard/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes
│   │   │   ├── orchestrate/   # Natural language parsing
│   │   │   ├── tryon/         # Virtual try-on
│   │   │   ├── products/      # Product CRUD
│   │   │   └── models/        # AI Model CRUD
│   │   ├── dashboard/         # Dashboard pages
│   │   └── page.tsx           # Main try-on studio
│   ├── agents/                # Agent implementations
│   │   ├── orchestrator.ts    # Claude-powered command parsing
│   │   ├── virtual-tryon.ts   # CatVTON/IDM-VTON integration
│   │   └── garment-extract.ts # TryOffDiff integration
│   ├── components/            # React components
│   │   ├── ui/               # Base UI components
│   │   ├── dashboard/        # Dashboard-specific
│   │   └── agents/           # Agent visualization
│   ├── hooks/                 # React hooks
│   │   └── useAgents.ts      # Agent operation hooks
│   ├── lib/                   # Utilities
│   │   ├── supabase.ts       # Supabase client
│   │   ├── store.ts          # Zustand store
│   │   └── utils.ts          # Helper functions
│   └── types/                 # TypeScript types
├── supabase/
│   └── migrations/            # Database schema
└── public/                    # Static assets
```

## Usage

### Try-On Studio

1. **Select Products**: Browse the SKU sidebar and click products to select them
2. **Choose a Model**: Pick an AI model from the right panel
3. **Set Pose & Expression**: Configure how the model should appear
4. **Generate**: Click "Generate Try-On" to create images

### Natural Language Commands

Type commands like:
- "Put the black crew tee and charcoal joggers on model D02"
- "Show me SKU TH8-001 on a female model, smiling, front view"
- "Generate 3 variations of SKU AZM-001 on model F01"

### Agent Workflow

View and edit the agent pipeline by clicking the "Agents" button. Each agent:

1. **Orchestrator** (Claude) - Parses commands and creates task plans
2. **Garment Extract** - Extracts clean product images from model photos
3. **Model Manager** - Generates/modifies AI fashion models
4. **Virtual Try-On** - Combines garments with models
5. **QC Agent** - Validates output quality

## Claude Code Integration

This project is designed for development with Claude Code. The architecture supports:

- Incremental feature development
- Easy debugging with typed interfaces
- Modular agent system for extending functionality

### Next Steps for Claude Code

1. Add product upload functionality
2. Implement model generation with FLUX
3. Build the React Flow workflow editor
4. Add batch processing capabilities
5. Create QC agent with vision model

## API Reference

### POST /api/orchestrate

Parse natural language commands.

```typescript
// Request
{
  "prompt": "Put SKU TH8-001 on model D12, casual and smiling",
  "context": {
    "available_models": ["D01", "D02", "D12"],
    "available_products": ["TH8-001", "TH8-002"]
  }
}

// Response
{
  "success": true,
  "parsed_intent": {
    "action": "single_tryon",
    "products": ["TH8-001"],
    "model": "D12",
    "pose": null,
    "expression": "smiling",
    "variations": 1
  },
  "task_plan": [...],
  "job_id": "uuid"
}
```

### POST /api/tryon

Execute virtual try-on.

```typescript
// Request
{
  "model_image_url": "https://...",
  "garments": [
    { "url": "https://...", "type": "upper", "id": "product-uuid" }
  ],
  "variations": 3,
  "job_id": "uuid"
}

// Response
{
  "success": true,
  "results": [
    { "output_url": "https://...", "model_used": "catvton" }
  ],
  "total_duration_ms": 45000
}
```

## Cost Estimates

| Service | Usage | Est. Monthly |
|---------|-------|--------------|
| Replicate (CatVTON) | 1000 images | $50-100 |
| Anthropic Claude | 100K tokens | $15-30 |
| Supabase Pro | DB + Storage | $25/mo |
| Vercel Pro | Hosting | $20/mo |
| **Total** | | **~$110-175/mo** |

## License

MIT - See LICENSE file

## Support

Built for SummitWest Environmental Inc. apparel brands: TH8TA and (ALMOST) ZERO MOTION.
