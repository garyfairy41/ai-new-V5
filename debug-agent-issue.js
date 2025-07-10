const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function debugAgentIssue() {
  console.log('=== AI AGENT DEBUG ===');
  
  // 1. Check if we can connect with service role
  console.log('\n1. Testing service role connection...');
  const { data: authData, error: authError } = await supabase.auth.getUser();
  console.log('Auth status:', authError ? 'Failed' : 'Connected');
  
  // 2. Check existing agents
  console.log('\n2. Checking existing agents...');
  const { data: agents, error: agentError } = await supabase
    .from('ai_agents')
    .select('*');
  console.log('Agents found:', agents?.length || 0);
  console.log('Agents data:', JSON.stringify(agents, null, 2));
  if (agentError) console.log('Agent query error:', agentError);
  
  // 3. Try to create a test agent
  console.log('\n3. Attempting to create test agent...');
  const testAgent = {
    name: 'Test Agent',
    description: 'Test agent for debugging',
    voice_id: 'test-voice',
    phone_number: '+1234567890',
    prompt: 'You are a test agent',
    is_active: true
  };
  
  const { data: newAgent, error: createError } = await supabase
    .from('ai_agents')
    .insert([testAgent])
    .select();
    
  if (createError) {
    console.log('Create error:', createError);
  } else {
    console.log('Successfully created agent:', newAgent);
  }
  
  // 4. Check user profiles to understand auth flow
  console.log('\n4. Checking user profiles...');
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('*');
  console.log('Profiles found:', profiles?.length || 0);
  if (profileError) console.log('Profile error:', profileError);
}

debugAgentIssue().catch(console.error);
