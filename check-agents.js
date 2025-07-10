#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('🔧 Environment check:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'Set' : 'Missing');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

console.log('🔍 Checking all agents in database...');

try {
  const { data, error } = await supabase
    .from('ai_agents')
    .select('*');

  if (error) {
    console.error('❌ Error:', error);
  } else {
    console.log('📊 Total agents found:', data.length);
    data.forEach(agent => {
      console.log('👤 Agent:', {
        id: agent.id,
        name: agent.name,
        profile_id: agent.profile_id,
        created_at: agent.created_at
      });
    });

    // Now let's test the API endpoint directly
    console.log('\n🔍 Testing API endpoint...');
    console.log('Without profile_id filter:');
    
    const allAgentsResult = await supabase
      .from('ai_agents')
      .select('*');
    
    console.log('API would return:', allAgentsResult.data?.length || 0, 'agents');
    
    // Test with a profile_id filter
    if (data.length > 0 && data[0].profile_id) {
      console.log('With profile_id filter:', data[0].profile_id);
      const filteredResult = await supabase
        .from('ai_agents')
        .select('*')
        .eq('profile_id', data[0].profile_id);
      
      console.log('Filtered result:', filteredResult.data?.length || 0, 'agents');
    }
  }
} catch (err) {
  console.error('❌ Script error:', err);
}
