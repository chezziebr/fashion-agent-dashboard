/**
 * Seed Test AI Models
 *
 * This script adds test AI models to the database for try-on testing.
 * You can run this with: npx ts-node scripts/seed-test-models.ts
 *
 * Note: You'll need to upload model images to your Supabase storage first,
 * or use placeholder images from a service like picsum.photos
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface TestModel {
  model_code: string;
  name: string;
  gender: 'male' | 'female' | 'non-binary';
  ethnicity: string;
  age_range: string;
  body_type: string;
  base_image_url: string;
  thumbnail_url: string;
  style_tags: string[];
  metadata: Record<string, any>;
}

// Test models with diverse representation
const testModels: TestModel[] = [
  // Female models for TH8TA (sophisticated millennial athletic)
  {
    model_code: 'F01',
    name: 'Maya Chen',
    gender: 'female',
    ethnicity: 'Asian',
    age_range: '25-30',
    body_type: 'athletic',
    base_image_url: 'https://picsum.photos/seed/f01/800/1200',
    thumbnail_url: 'https://picsum.photos/seed/f01/400/600',
    style_tags: ['athletic', 'sophisticated', 'minimal'],
    metadata: { brand_fit: 'TH8TA', target_demo: 'millennial' }
  },
  {
    model_code: 'F02',
    name: 'Zara Williams',
    gender: 'female',
    ethnicity: 'Black',
    age_range: '28-32',
    body_type: 'athletic',
    base_image_url: 'https://picsum.photos/seed/f02/800/1200',
    thumbnail_url: 'https://picsum.photos/seed/f02/400/600',
    style_tags: ['athletic', 'confident', 'elegant'],
    metadata: { brand_fit: 'TH8TA', target_demo: 'millennial' }
  },
  {
    model_code: 'F03',
    name: 'Sofia Rodriguez',
    gender: 'female',
    ethnicity: 'Latina',
    age_range: '26-30',
    body_type: 'toned',
    base_image_url: 'https://picsum.photos/seed/f03/800/1200',
    thumbnail_url: 'https://picsum.photos/seed/f03/400/600',
    style_tags: ['athletic', 'warm', 'approachable'],
    metadata: { brand_fit: 'TH8TA', target_demo: 'millennial' }
  },

  // Male models for TH8TA
  {
    model_code: 'M01',
    name: 'Alex Kim',
    gender: 'male',
    ethnicity: 'Asian',
    age_range: '27-32',
    body_type: 'athletic',
    base_image_url: 'https://picsum.photos/seed/m01/800/1200',
    thumbnail_url: 'https://picsum.photos/seed/m01/400/600',
    style_tags: ['athletic', 'sophisticated', 'modern'],
    metadata: { brand_fit: 'TH8TA', target_demo: 'millennial' }
  },
  {
    model_code: 'M02',
    name: 'Marcus Johnson',
    gender: 'male',
    ethnicity: 'Black',
    age_range: '29-33',
    body_type: 'muscular',
    base_image_url: 'https://picsum.photos/seed/m02/800/1200',
    thumbnail_url: 'https://picsum.photos/seed/m02/400/600',
    style_tags: ['athletic', 'strong', 'confident'],
    metadata: { brand_fit: 'TH8TA', target_demo: 'millennial' }
  },

  // Female models for ALMOST ZERO MOTION (Gen Z active recovery)
  {
    model_code: 'F04',
    name: 'Riley Park',
    gender: 'female',
    ethnicity: 'Asian',
    age_range: '21-24',
    body_type: 'slim',
    base_image_url: 'https://picsum.photos/seed/f04/800/1200',
    thumbnail_url: 'https://picsum.photos/seed/f04/400/600',
    style_tags: ['casual', 'relaxed', 'playful', 'genz'],
    metadata: { brand_fit: 'ALMOST_ZERO_MOTION', target_demo: 'gen_z' }
  },
  {
    model_code: 'F05',
    name: 'Luna Martinez',
    gender: 'female',
    ethnicity: 'Latina',
    age_range: '22-25',
    body_type: 'athletic',
    base_image_url: 'https://picsum.photos/seed/f05/800/1200',
    thumbnail_url: 'https://picsum.photos/seed/f05/400/600',
    style_tags: ['casual', 'vibrant', 'energetic', 'genz'],
    metadata: { brand_fit: 'ALMOST_ZERO_MOTION', target_demo: 'gen_z' }
  },

  // Male models for ALMOST ZERO MOTION
  {
    model_code: 'M03',
    name: 'Jordan Lee',
    gender: 'male',
    ethnicity: 'Asian',
    age_range: '20-23',
    body_type: 'slim',
    base_image_url: 'https://picsum.photos/seed/m03/800/1200',
    thumbnail_url: 'https://picsum.photos/seed/m03/400/600',
    style_tags: ['casual', 'relaxed', 'cool', 'genz'],
    metadata: { brand_fit: 'ALMOST_ZERO_MOTION', target_demo: 'gen_z' }
  },
  {
    model_code: 'M04',
    name: 'Kai Thompson',
    gender: 'male',
    ethnicity: 'Black',
    age_range: '21-24',
    body_type: 'athletic',
    base_image_url: 'https://picsum.photos/seed/m04/800/1200',
    thumbnail_url: 'https://picsum.photos/seed/m04/400/600',
    style_tags: ['casual', 'laid-back', 'authentic', 'genz'],
    metadata: { brand_fit: 'ALMOST_ZERO_MOTION', target_demo: 'gen_z' }
  },

  // Non-binary model (universal)
  {
    model_code: 'N01',
    name: 'Sage Anderson',
    gender: 'non-binary',
    ethnicity: 'Mixed',
    age_range: '24-28',
    body_type: 'athletic',
    base_image_url: 'https://picsum.photos/seed/n01/800/1200',
    thumbnail_url: 'https://picsum.photos/seed/n01/400/600',
    style_tags: ['versatile', 'modern', 'inclusive'],
    metadata: { brand_fit: 'both', target_demo: 'all' }
  }
];

interface TestPose {
  pose_name: string;
  pose_type: 'front' | 'half_front' | 'side' | 'back' | 'action' | 'seated';
  is_default: boolean;
}

// Standard poses for all models
const standardPoses: TestPose[] = [
  { pose_name: 'front_neutral', pose_type: 'front', is_default: true },
  { pose_name: 'half_front_casual', pose_type: 'half_front', is_default: false },
  { pose_name: 'side_profile', pose_type: 'side', is_default: false },
  { pose_name: 'action_walking', pose_type: 'action', is_default: false }
];

interface TestExpression {
  expression_name: string;
  prompt_modifier: string;
  is_default: boolean;
}

// Standard expressions for all models
const standardExpressions: TestExpression[] = [
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

async function seedModels() {
  console.log('🌱 Starting AI model seeding...\n');

  let successCount = 0;
  let errorCount = 0;

  for (const model of testModels) {
    try {
      console.log(`📸 Creating model: ${model.model_code} - ${model.name}`);

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
        console.error(`   ❌ Error creating model: ${modelError.message}`);
        errorCount++;
        continue;
      }

      console.log(`   ✅ Model created with ID: ${insertedModel.id}`);

      // Add poses
      console.log(`   🧘 Adding ${standardPoses.length} poses...`);
      for (const pose of standardPoses) {
        const poseImageUrl = `${model.base_image_url}?pose=${pose.pose_name}`;
        const { error: poseError } = await supabase
          .from('model_poses')
          .insert({
            model_id: insertedModel.id,
            pose_name: pose.pose_name,
            pose_type: pose.pose_type,
            pose_image_url: poseImageUrl,
            thumbnail_url: poseImageUrl,
            is_default: pose.is_default
          });

        if (poseError) {
          console.error(`      ❌ Error creating pose ${pose.pose_name}: ${poseError.message}`);
        }
      }

      // Add expressions
      console.log(`   😊 Adding ${standardExpressions.length} expressions...`);
      for (const expression of standardExpressions) {
        const { error: expressionError } = await supabase
          .from('model_expressions')
          .insert({
            model_id: insertedModel.id,
            expression_name: expression.expression_name,
            prompt_modifier: expression.prompt_modifier,
            is_default: expression.is_default
          });

        if (expressionError) {
          console.error(`      ❌ Error creating expression ${expression.expression_name}: ${expressionError.message}`);
        }
      }

      successCount++;
      console.log(`   ✨ Completed ${model.model_code}\n`);

    } catch (error) {
      console.error(`   ❌ Unexpected error for ${model.model_code}:`, error);
      errorCount++;
    }
  }

  console.log('\n📊 Seeding Summary:');
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${errorCount}`);
  console.log(`   📦 Total: ${testModels.length}`);
  console.log('\n✨ Done!\n');
}

// Run if called directly
if (require.main === module) {
  seedModels()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { seedModels, testModels };
