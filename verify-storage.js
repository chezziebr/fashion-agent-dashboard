const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyStorage() {
  console.log('Checking Supabase storage buckets...\n');
  
  const { data: buckets, error } = await supabase.storage.listBuckets();
  
  if (error) {
    console.error('❌ Error listing buckets:', error.message);
    return;
  }
  
  console.log('📦 Existing buckets:', buckets.map(b => b.name).join(', ') || 'None');
  
  const productsBucket = buckets.find(b => b.name === 'products');
  
  if (!productsBucket) {
    console.log('\n⚠️  "products" bucket not found. Creating it now...');
    
    const { data: newBucket, error: createError } = await supabase.storage.createBucket('products', {
      public: true,
      fileSizeLimit: 52428800, // 50MB
      allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    });
    
    if (createError) {
      console.error('❌ Error creating bucket:', createError.message);
      console.log('\n📝 Please create it manually in Supabase Dashboard:');
      console.log('   1. Go to Storage section');
      console.log('   2. Click "New bucket"');
      console.log('   3. Name: products');
      console.log('   4. Public: Yes');
      console.log('   5. File size limit: 50MB');
    } else {
      console.log('✅ "products" bucket created successfully!');
    }
  } else {
    console.log('\n✅ "products" bucket exists and is ready!');
  }
}

verifyStorage();
