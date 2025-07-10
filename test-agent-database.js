const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Testing database connection and agent operations...');
console.log('Supabase URL:', supabaseUrl);
console.log('Anon Key present:', !!supabaseAnonKey);
console.log('Service Key present:', !!supabaseServiceKey);

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function testDatabase() {
  try {
    console.log('\n=== Testing connection ===');
    
    // Test basic connection with anon key
    const { data: tables, error: tablesError } = await supabase
      .from('ai_agents')
      .select('count', { count: 'exact', head: true });
    
    if (tablesError) {
      console.error('Error with anon client:', tablesError);
    } else {
      console.log('Anon client connected successfully, agent count:', tables);
    }
    
    // Test admin connection
    const { data: adminTables, error: adminError } = await supabaseAdmin
      .from('ai_agents')
      .select('*');
    
    if (adminError) {
      console.error('Error with admin client:', adminError);
    } else {
      console.log('Admin client connected successfully, agents found:', adminTables.length);
      if (adminTables.length > 0) {
        console.log('Existing agents:', adminTables.map(a => ({ id: a.id, name: a.name, profile_id: a.profile_id })));
      }
    }
    
    // Check if there are any profiles
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*');
    
    if (profileError) {
      console.error('Error fetching profiles:', profileError);
    } else {
      console.log('Profiles found:', profiles.length);
      if (profiles.length > 0) {
        console.log('Profile IDs:', profiles.map(p => ({ id: p.id, email: p.email })));
      }
    }
    
    // Test creating an agent with a test profile
    if (profiles && profiles.length > 0) {
      console.log('\n=== Testing agent creation ===');
      const testProfileId = profiles[0].id;
      
      const testAgent = {
        profile_id: testProfileId,
        name: 'Test Agent Darren',
        description: 'Test agent for debugging',
        agent_type: 'general',
        call_direction: 'inbound',
        routing_type: 'direct',
        voice_name: 'Puck',
        language_code: 'en-US',
        system_instruction: 'You are a test AI assistant.',
        greeting: 'Hello, this is a test agent.',
        max_concurrent_calls: 5,
        timezone: 'America/New_York',
        business_hours_start: '09:00',
        business_hours_end: '17:00',
        business_days: [1, 2, 3, 4, 5],
        is_active: true
      };
      
      const { data: newAgent, error: createError } = await supabaseAdmin
        .from('ai_agents')
        .insert(testAgent)
        .select()
        .single();
      
      if (createError) {
        console.error('Error creating test agent:', createError);
      } else {
        console.log('Test agent created successfully:', newAgent);
        
        // Now try to fetch it back
        const { data: fetchedAgents, error: fetchError } = await supabaseAdmin
          .from('ai_agents')
          .select('*')
          .eq('profile_id', testProfileId);
        
        if (fetchError) {
          console.error('Error fetching agents after creation:', fetchError);
        } else {
          console.log('Agents found after creation:', fetchedAgents.length);
        }
      }
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testDatabase();
