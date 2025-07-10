import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Service Key starts with:', supabaseKey?.substring(0, 10) + '...');

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugAgents() {
  try {
    console.log('\n=== Debugging AI Agents ===\n');
    
    // Check if ai_agents table exists and get all agents
    const { data: agents, error } = await supabase
      .from('ai_agents')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching agents:', error);
      return;
    }

    console.log('Total agents in database:', agents?.length || 0);
    
    if (agents && agents.length > 0) {
      console.log('\nAgents found:');
      agents.forEach((agent, index) => {
        console.log(`${index + 1}. ${agent.name} (ID: ${agent.id})`);
        console.log(`   Profile ID: ${agent.profile_id}`);
        console.log(`   Agent Type: ${agent.agent_type}`);
        console.log(`   Active: ${agent.is_active}`);
        console.log(`   Created: ${agent.created_at}`);
        console.log('');
      });
    } else {
      console.log('No agents found in database.');
      
      // Let's check if we can create a test agent
      console.log('\nAttempting to create a test agent (Darren)...');
      
      const testAgent = {
        profile_id: '5d5f69d3-0cb7-42db-9b10-1246da9c4c22', // Default profile ID
        name: 'Darren',
        description: 'AI Sales Assistant',
        agent_type: 'sales',
        call_direction: 'both',
        voice_name: 'Puck',
        language_code: 'en-US',
        system_instruction: 'You are Darren, a professional sales AI assistant. Be persuasive, knowledgeable, and helpful. Your goal is to understand customer needs and guide them toward making a purchase decision.',
        greeting: 'Hi! This is Darren. Thank you for calling. How can I help you today?',
        max_concurrent_calls: 5,
        timezone: 'America/New_York',
        business_hours_start: '09:00',
        business_hours_end: '17:00',
        business_days: [1, 2, 3, 4, 5],
        is_active: true,
        routing_type: 'direct',
        escalation_enabled: false
      };
      
      const { data: newAgent, error: createError } = await supabase
        .from('ai_agents')
        .insert(testAgent)
        .select()
        .single();

      if (createError) {
        console.error('Error creating test agent:', createError);
      } else {
        console.log('Successfully created test agent Darren:', newAgent);
      }
    }

    // Also check profiles table
    console.log('\n=== Checking Profiles ===\n');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*');

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
    } else {
      console.log('Total profiles in database:', profiles?.length || 0);
      if (profiles && profiles.length > 0) {
        profiles.forEach((profile, index) => {
          console.log(`${index + 1}. ${profile.email || 'No email'} (ID: ${profile.id})`);
        });
      }
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

debugAgents();
