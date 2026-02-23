// Verify database tables exist
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTables() {
  console.log('🗄️  Checking database tables...\n');

  const tables = [
    'ai_models',
    'model_poses',
    'model_expressions',
    'products',
    'jobs',
    'generated_images',
    'agent_logs',
    'workflows'
  ];

  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
      } else {
        console.log(`✅ ${table}: exists (${count || 0} rows)`);
      }
    } catch (err) {
      console.log(`❌ ${table}: ${err.message}`);
    }
  }

  console.log('\n🪣 Checking storage buckets...\n');

  const { data: buckets, error: bucketsError } = await supabase
    .storage
    .listBuckets();

  if (bucketsError) {
    console.log('❌ Could not list buckets:', bucketsError.message);
  } else {
    buckets.forEach(bucket => {
      console.log(`✅ Bucket: ${bucket.name} (${bucket.public ? 'public' : 'private'})`);
    });
  }
}

checkTables().catch(console.error);
