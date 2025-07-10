const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkSchema() {
  try {
    // Get the schema info for call_logs table
    const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'call_logs' });
    
    if (error) {
      console.log('RPC not available, checking with simple query...');
      // Fallback: just select all columns from one row to see structure
      const { data: sampleData, error: sampleError } = await supabase
        .from('call_logs')
        .select('*')
        .limit(1);
        
      if (sampleError) {
        console.error('Error fetching sample data:', sampleError);
      } else {
        console.log('call_logs table columns:', Object.keys(sampleData[0] || {}));
      }
    } else {
      console.log('call_logs schema:', data);
    }
    
    // Also check ai_agents table
    const { data: agentsData, error: agentsError } = await supabase
      .from('ai_agents')
      .select('*')
      .limit(1);
      
    if (agentsError) {
      console.error('Error fetching ai_agents:', agentsError);
    } else {
      console.log('ai_agents table columns:', Object.keys(agentsData[0] || {}));
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkSchema().catch(console.error);
