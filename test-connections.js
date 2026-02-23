// Quick test script to verify API connections
// Run with: node test-connections.js

require('dotenv').config({ path: '.env.local' });

async function testReplicate() {
  console.log('\n🔄 Testing Replicate API...');
  try {
    const Replicate = require('replicate');
    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    // Verify we can list models (lightweight check)
    await replicate.models.get('stability-ai', 'sdxl');

    console.log('✅ Replicate API token is valid!');
    console.log('   Token starts with:', process.env.REPLICATE_API_TOKEN?.substring(0, 10) + '...');
    return true;
  } catch (error) {
    console.error('❌ Replicate error:', error.message);
    return false;
  }
}

async function testAnthropic() {
  console.log('\n🤖 Testing Anthropic API...');
  try {
    const Anthropic = require('@anthropic-ai/sdk').default;
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'Say hello' }],
    });

    console.log('✅ Anthropic API is working!');
    console.log('   Response:', response.content[0].text);
    return true;
  } catch (error) {
    console.error('❌ Anthropic error:', error.message);
    return false;
  }
}

async function testSupabase() {
  console.log('\n🗄️  Testing Supabase connection...');
  try {
    const { createClient } = require('@supabase/supabase-js');

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    // Try to query (will fail gracefully if tables don't exist yet)
    const { data, error } = await supabase.from('products').select('count').limit(1);

    if (error && error.message.includes('does not exist')) {
      console.log('⚠️  Supabase connected, but tables not created yet');
      console.log('   Run: npm run db:push');
      return 'pending';
    } else if (error) {
      console.error('❌ Supabase error:', error.message);
      return false;
    } else {
      console.log('✅ Supabase is fully connected!');
      return true;
    }
  } catch (error) {
    console.error('❌ Supabase connection error:', error.message);
    return false;
  }
}

async function main() {
  console.log('🧪 Testing API Connections for Fashion Agent Dashboard\n');
  console.log('=' .repeat(60));

  const results = {
    replicate: await testReplicate(),
    anthropic: await testAnthropic(),
    supabase: await testSupabase(),
  };

  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Summary:');
  console.log('   Replicate:', results.replicate ? '✅ Ready' : '❌ Not working');
  console.log('   Anthropic:', results.anthropic ? '✅ Ready' : '❌ Not working');
  console.log('   Supabase:', results.supabase === true ? '✅ Ready' : results.supabase === 'pending' ? '⚠️  Needs migration' : '❌ Not working');

  console.log('\n');
}

main().catch(console.error);
