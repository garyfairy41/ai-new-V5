const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

console.log('🔧 Environment check:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'Set' : 'Missing');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  try {
    console.log('🔍 Testing basic Supabase connection...');
    
    // Test basic connection
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
      
    if (error) {
      console.error('❌ Supabase connection failed:', error);
      return;
    }
    
    console.log('✅ Supabase connection successful');
    
    // Check agents table
    console.log('🔍 Checking agents...');
    const { data: agents, error: agentsError } = await supabase
      .from('agents')
      .select('*');
      
    if (agentsError) {
      console.error('❌ Agents query failed:', agentsError);
    } else {
      console.log('👥 Agents:', agents?.length || 0);
      if (agents && agents.length > 0) {
        agents.forEach(agent => {
          console.log(`  - ${agent.name} (ID: ${agent.id})`);
        });
      }
    }
    
  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

main().then(() => process.exit(0));
