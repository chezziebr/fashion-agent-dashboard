# Model Photo Preparation Guide

## Overview

The Model Preparation Agent transforms casual photos (beach, outdoor, everyday) into professional studio-style model photos ready for virtual try-on. This uses a 2-step AI pipeline:

1. **Background Removal** - BRIA RMBG 2.0 removes existing background
2. **Studio Enhancement** - Nano Banana Pro (Gemini 3 Pro Image) adds professional studio background, lighting, skin retouching, and neutral clothing

## Setup

### 1. Get Nano Banana API Access

**Option A: Kie.ai (Recommended - Cheaper)**

1. Sign up at https://kie.ai
2. Get your API key from the dashboard
3. Add to `.env.local`:
   ```
   NANO_BANANA_API_KEY=kie_your_api_key_here
   NANO_BANANA_API_URL=https://api.kie.ai/v1/nano-banana
   ```
4. Cost: ~$0.09-0.12 per image

**Option B: Google AI Studio (Direct)**

1. Sign up at https://ai.google.dev
2. Get your API key
3. Add to `.env.local`:
   ```
   GOOGLE_AI_API_KEY=AIza_your_api_key_here
   ```
4. Cost: Pay-per-use pricing from Google

### 2. Ensure Replicate is Set Up

BRIA RMBG 2.0 runs on Replicate (you already have this set up):
```
REPLICATE_API_TOKEN=r8_your_token_here
```

### 3. Ensure Supabase Storage Bucket

Make sure the `models` storage bucket exists and is set to PUBLIC:

1. Go to Supabase Dashboard > Storage
2. Create bucket named `models` if it doesn't exist
3. Set to PUBLIC for easy access

## Usage

### Via Web UI

1. Navigate to: **http://localhost:3001/models/prepare**

2. **Upload Photo**
   - Drag & drop or click to browse
   - Any casual/beach photo works
   - Supports JPG, PNG

3. **Fill in Model Information**
   - Model Name (required) - e.g., "Maya Chen"
   - Model Code (optional) - e.g., "F01"
   - Gender (required) - Female/Male/Non-binary
   - Ethnicity, Age Range, Body Type (optional but recommended)

4. **Configure Processing**
   - Clothing Style: Minimal (tank + shorts), Athletic, or Casual
   - Background: White Studio, Gray Studio, or Gradient
   - Resolution: 1K, 2K (recommended), or 4K
   - Brand: TH8TA or ALMOST ZERO MOTION

5. **Process**
   - Click "Prepare Model Photo"
   - Wait ~10-30 seconds for processing
   - View before/after results

6. **Review Results**
   - Original vs Studio Enhanced comparison
   - Processing stats (time, resolution, steps completed)
   - If "Create model record" was checked, the model is automatically added to your database

### Via API

**Single Model:**

```bash
curl -X POST http://localhost:3001/api/models/prepare \
  -H "Content-Type: application/json" \
  -d '{
    "image_url": "https://your-image-url.com/beach-photo.jpg",
    "model_name": "Maya Chen",
    "model_code": "F01",
    "gender": "female",
    "ethnicity": "Asian",
    "age_range": "25-30",
    "body_type": "athletic",
    "clothing_style": "minimal",
    "background": "white",
    "resolution": "2k",
    "brand": "TH8TA",
    "create_model_record": true
  }'
```

**Batch Processing:**

```bash
curl -X POST http://localhost:3001/api/models/prepare \
  -H "Content-Type: application/json" \
  -d '{
    "models": [
      {
        "image_url": "https://photo1.jpg",
        "model_name": "Model 1",
        "gender": "female",
        ...
      },
      {
        "image_url": "https://photo2.jpg",
        "model_name": "Model 2",
        "gender": "male",
        ...
      }
    ]
  }'
```

## What It Does

### Step 1: Background Removal (BRIA RMBG 2.0)
- Removes beach, outdoor, or any existing background
- Isolates the model cleanly
- Preserves fine details (hair, clothing edges)
- Cost: ~$0.018 per image

### Step 2: Studio Enhancement (Nano Banana Pro)

Uses natural language AI to:

1. **Background Replacement**
   - Adds clean white/gray studio background
   - Professional gradient lighting
   - Seamless edge blending

2. **Lighting Enhancement**
   - Simulates 3-point studio lighting
   - Soft key light from front-left
   - Fill light from right
   - Natural shadows and highlights

3. **Skin Retouching**
   - Brightens and evens skin tone
   - Maintains natural texture
   - Softens tan lines or blemishes
   - Preserves facial features exactly

4. **Clothing Addition**
   - Adds neutral athletic wear (tank top + shorts)
   - Styled for TH8TA or ALMOST ZERO MOTION brand
   - Natural fit and professional look
   - Consistent with brand aesthetic

5. **Quality Enhancement**
   - High-resolution output (up to 4K)
   - Sharp details preserved
   - Professional photography aesthetic

**Result:** Studio-quality model photo ready for virtual try-on!

## Cost Breakdown

Per model photo:
- Background removal (BRIA): $0.018
- Studio enhancement (Nano Banana): $0.09-0.12
- **Total: ~$0.11-0.14 per photo**

For a typical model library:
- 10 models × 4 angles each = 40 photos
- Total cost: **~$4.40-5.60**

Very affordable for professional results!

## Tips for Best Results

### Photo Requirements

**Good:**
- Full body shot or at least torso + legs visible
- Model facing camera (front or 3/4 view)
- Clear, well-lit photo
- Model in neutral pose
- Any background is OK (beach, park, studio, etc.)

**Avoid:**
- Extreme angles or cropping
- Very dark or blurry photos
- Heavy photo filters already applied
- Sitting/lying down poses (unless you want that)

### Model Diversity

For best brand representation, include:
- Various ethnicities (Asian, Black, Latina, White, etc.)
- Different body types (athletic, slim, curvy, plus-size)
- Age ranges matching your target demo
- Gender representation (female, male, non-binary)

### Clothing Style Selection

- **Minimal** (default): Simple tank + shorts, most versatile
- **Athletic**: Fitted athletic wear, best for TH8TA
- **Casual**: Relaxed fit, best for ALMOST ZERO MOTION

### Resolution Selection

- **1K (1024px)**: Fast, lower quality, good for testing
- **2K (2048px)**: Recommended - great quality, reasonable cost
- **4K (4096px)**: Highest quality, use for final production

## Troubleshooting

### "No Nano Banana API key configured"
- Make sure you've added `NANO_BANANA_API_KEY` or `GOOGLE_AI_API_KEY` to `.env.local`
- Restart dev server after adding

### Background removal fails
- Check that your Replicate API token is valid
- Ensure you have billing set up on Replicate
- Check Replicate rate limits

### Enhancement takes too long
- 4K resolution can take 30-60 seconds
- Try 2K resolution instead
- Check your API provider's status

### Image quality issues
- Use higher resolution source photos
- Try different background options (white vs gray)
- Adjust clothing style to match photo better

### Model not created in database
- Ensure `create_model_record` is set to `true`
- Check that model_code is unique (if provided)
- Verify Supabase connection

## Next Steps

After preparing your model photos:

1. **View Models**: Go to main dashboard to see your new models
2. **Upload Products**: Use the product upload feature to add clothing
3. **Test Virtual Try-On**: Select a model and product, click "Generate Images"
4. **Prepare More Angles**: Upload multiple angles (front, side, 3/4) for each model

## Example Workflow

```
1. Upload beach photo of model in bikini
   ↓
2. Fill in: "Maya Chen", F01, Female, Asian, 25-30, Athletic
   ↓
3. Select: Minimal clothing, White background, 2K resolution, TH8TA brand
   ↓
4. Click "Prepare Model Photo"
   ↓
5. Wait ~15 seconds
   ↓
6. Review studio-quality result with professional lighting and neutral clothing
   ↓
7. Model automatically added to database and ready for virtual try-on!
```

## Technical Details

### Files Created

- `/src/agents/model-prepare.ts` - Main preparation agent
- `/src/app/api/models/prepare/route.ts` - API endpoint
- `/src/components/model/ModelPrepare.tsx` - Upload UI component
- `/src/app/models/prepare/page.tsx` - Dedicated preparation page

### Processing Pipeline

```typescript
Input: Beach photo URL
  ↓
Step 1: BRIA RMBG 2.0 (Replicate)
  - Remove background
  - Output: Transparent PNG
  ↓
Step 2: Nano Banana Pro (Kie.ai or Google)
  - Natural language prompt:
    * Replace with studio background
    * Add professional lighting
    * Retouch skin naturally
    * Add neutral clothing
  - Output: Studio-quality JPG
  ↓
Step 3: Upload to Supabase
  - Store in 'models' bucket
  - Get public URL
  ↓
Step 4: Create Model Record (optional)
  - Add to ai_models table
  - Link to image URL
  - Store metadata
  ↓
Output: Studio-ready model photo + database record
```

## Support

If you encounter issues or have questions:
1. Check the troubleshooting section above
2. Review the `.env.example` file for correct configuration
3. Check the browser console for detailed error messages
4. Verify API keys are valid and have sufficient credits
