import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Test models with diverse representation
const testModels = [
  // Female models for TH8TA (sophisticated millennial athletic)
  {
    model_code: 'F01',
    name: 'Maya Chen',
    gender: 'female' as const,
    ethnicity: 'Asian',
    age_range: '25-30',
    body_type: 'athletic',
    base_image_url: 'https://picsum.photos/seed/f01maya/800/1200',
    thumbnail_url: 'https://picsum.photos/seed/f01maya/400/600',
    style_tags: ['athletic', 'sophisticated', 'minimal'],
    metadata: { brand_fit: 'TH8TA', target_demo: 'millennial' }
  },
  {
    model_code: 'F02',
    name: 'Zara Williams',
    gender: 'female' as const,
    ethnicity: 'Black',
    age_range: '28-32',
    body_type: 'athletic',
    base_image_url: 'https://picsum.photos/seed/f02zara/800/1200',
    thumbnail_url: 'https://picsum.photos/seed/f02zara/400/600',
    style_tags: ['athletic', 'confident', 'elegant'],
    metadata: { brand_fit: 'TH8TA', target_demo: 'millennial' }
  },
  {
    model_code: 'F03',
    name: 'Sofia Rodriguez',
    gender: 'female' as const,
    ethnicity: 'Latina',
    age_range: '26-30',
    body_type: 'toned',
    base_image_url: 'https://picsum.photos/seed/f03sofia/800/1200',
    thumbnail_url: 'https://picsum.photos/seed/f03sofia/400/600',
    style_tags: ['athletic', 'warm', 'approachable'],
    metadata: { brand_fit: 'TH8TA', target_demo: 'millennial' }
  },

  // Male models for TH8TA
  {
    model_code: 'M01',
    name: 'Alex Kim',
    gender: 'male' as const,
    ethnicity: 'Asian',
    age_range: '27-32',
    body_type: 'athletic',
    base_image_url: 'https://picsum.photos/seed/m01alex/800/1200',
    thumbnail_url: 'https://picsum.photos/seed/m01alex/400/600',
    style_tags: ['athletic', 'sophisticated', 'modern'],
    metadata: { brand_fit: 'TH8TA', target_demo: 'millennial' }
  },
  {
    model_code: 'M02',
    name: 'Marcus Johnson',
    gender: 'male' as const,
    ethnicity: 'Black',
    age_range: '29-33',
    body_type: 'muscular',
    base_image_url: 'https://picsum.photos/seed/m02marcus/800/1200',
    thumbnail_url: 'https://picsum.photos/seed/m02marcus/400/600',
    style_tags: ['athletic', 'strong', 'confident'],
    metadata: { brand_fit: 'TH8TA', target_demo: 'millennial' }
  },

  // Female models for ALMOST ZERO MOTION (Gen Z active recovery)
  {
    model_code: 'F04',
    name: 'Riley Park',
    gender: 'female' as const,
    ethnicity: 'Asian',
    age_range: '21-24',
    body_type: 'slim',
    base_image_url: 'https://picsum.photos/seed/f04riley/800/1200',
    thumbnail_url: 'https://picsum.photos/seed/f04riley/400/600',
    style_tags: ['casual', 'relaxed', 'playful', 'genz'],
    metadata: { brand_fit: 'ALMOST_ZERO_MOTION', target_demo: 'gen_z' }
  },
  {
    model_code: 'F05',
    name: 'Luna Martinez',
    gender: 'female' as const,
    ethnicity: 'Latina',
    age_range: '22-25',
    body_type: 'athletic',
    base_image_url: 'https://picsum.photos/seed/f05luna/800/1200',
    thumbnail_url: 'https://picsum.photos/seed/f05luna/400/600',
    style_tags: ['casual', 'vibrant', 'energetic', 'genz'],
    metadata: { brand_fit: 'ALMOST_ZERO_MOTION', target_demo: 'gen_z' }
  },

  // Male models for ALMOST ZERO MOTION
  {
    model_code: 'M03',
    name: 'Jordan Lee',
    gender: 'male' as const,
    ethnicity: 'Asian',
    age_range: '20-23',
    body_type: 'slim',
    base_image_url: 'https://picsum.photos/seed/m03jordan/800/1200',
    thumbnail_url: 'https://picsum.photos/seed/m03jordan/400/600',
    style_tags: ['casual', 'relaxed', 'cool', 'genz'],
    metadata: { brand_fit: 'ALMOST_ZERO_MOTION', target_demo: 'gen_z' }
  },
  {
    model_code: 'M04',
    name: 'Kai Thompson',
    gender: 'male' as const,
    ethnicity: 'Black',
    age_range: '21-24',
    body_type: 'athletic',
    base_image_url: 'https://picsum.photos/seed/m04kai/800/1200',
    thumbnail_url: 'https://picsum.photos/seed/m04kai/400/600',
    style_tags: ['casual', 'laid-back', 'authentic', 'genz'],
    metadata: { brand_fit: 'ALMOST_ZERO_MOTION', target_demo: 'gen_z' }
  },

  // Non-binary model (universal)
  {
    model_code: 'N01',
    name: 'Sage Anderson',
    gender: 'non-binary' as const,
    ethnicity: 'Mixed',
    age_range: '24-28',
    body_type: 'athletic',
    base_image_url: 'https://picsum.photos/seed/n01sage/800/1200',
    thumbnail_url: 'https://picsum.photos/seed/n01sage/400/600',
    style_tags: ['versatile', 'modern', 'inclusive'],
    metadata: { brand_fit: 'both', target_demo: 'all' }
  }
];

// Standard poses for all models
const standardPoses = [
  { pose_name: 'front_neutral', pose_type: 'front' as const, is_default: true },
  { pose_name: 'half_front_casual', pose_type: 'half_front' as const, is_default: false },
  { pose_name: 'side_profile', pose_type: 'side' as const, is_default: false },
  { pose_name: 'action_walking', pose_type: 'action' as const, is_default: false }
];

// Standard expressions for all models
const standardExpressions = [
  {
    expression_name: 'neutral',
    prompt_modifier: 'neutral expression, professional',
    is_default: true
  },
  {
    expression_name: 'smiling',
    prompt_modifier: 'gentle smile, friendly and approachable',
    is_default: false
  },
  {
    expression_name: 'confident',
    prompt_modifier: 'confident expression, direct gaze',
    is_default: false
  },
  {
    expression_name: 'casual',
    prompt_modifier: 'relaxed, casual expression',
    is_default: false
  }
];

export async function POST() {
  try {
    const results = {
      success: [] as string[],
      errors: [] as string[],
      total: testModels.length
    };

    for (const model of testModels) {
      try {
        // Check if model already exists
        const { data: existing } = await supabase
          .from('ai_models')
          .select('id')
          .eq('model_code', model.model_code)
          .single();

        if (existing) {
          results.errors.push(`${model.model_code} already exists`);
          continue;
        }

        // Insert model
        const { data: insertedModel, error: modelError } = await supabase
          .from('ai_models')
          .insert({
            model_code: model.model_code,
            name: model.name,
            gender: model.gender,
            ethnicity: model.ethnicity,
            age_range: model.age_range,
            body_type: model.body_type,
            base_image_url: model.base_image_url,
            thumbnail_url: model.thumbnail_url,
            style_tags: model.style_tags,
            is_active: true,
            metadata: model.metadata
          })
          .select()
          .single();

        if (modelError) {
          results.errors.push(`${model.model_code}: ${modelError.message}`);
          continue;
        }

        // Add poses
        for (const pose of standardPoses) {
          const poseImageUrl = `${model.base_image_url}?pose=${pose.pose_name}`;
          await supabase
            .from('model_poses')
            .insert({
              model_id: insertedModel.id,
              pose_name: pose.pose_name,
              pose_type: pose.pose_type,
              pose_image_url: poseImageUrl,
              thumbnail_url: poseImageUrl,
              is_default: pose.is_default
            });
        }

        // Add expressions
        for (const expression of standardExpressions) {
          await supabase
            .from('model_expressions')
            .insert({
              model_id: insertedModel.id,
              expression_name: expression.expression_name,
              prompt_modifier: expression.prompt_modifier,
              is_default: expression.is_default
            });
        }

        results.success.push(model.model_code);

      } catch (error) {
        results.errors.push(`${model.model_code}: ${error}`);
      }
    }

    return NextResponse.json({
      success: true,
      data: results,
      message: `Seeded ${results.success.length} models. ${results.errors.length} errors.`
    });

  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to seed models' },
      { status: 500 }
    );
  }
}
