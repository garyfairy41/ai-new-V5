const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkCallQueue() {
  console.log('=== CHECKING CALL QUEUE ===');
  
  try {
    // Check all calls with pending status
    const { data: pendingCalls, error } = await supabase
      .from('call_logs')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Error fetching pending calls:', error);
      return;
    }
    
    console.log('Pending calls found:', pendingCalls.length);
    pendingCalls.forEach(call => {
      const createdAt = new Date(call.created_at);
      const now = new Date();
      const waitTimeMs = now - createdAt;
      const waitTimeMin = Math.floor(waitTimeMs / 60000);
      const waitTimeSec = Math.floor((waitTimeMs % 60000) / 1000);
      
      console.log(`Call ID: ${call.id}, Phone: ${call.phone_number}, Created: ${call.created_at}, Wait: ${waitTimeMin}m ${waitTimeSec}s`);
    });
    
    // Mark old pending calls as abandoned (older than 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: oldCalls, error: markError } = await supabase
      .from('call_logs')
      .update({ 
        status: 'abandoned',
        end_time: new Date().toISOString(),
        summary: 'Call abandoned due to timeout'
      })
      .eq('status', 'pending')
      .lt('created_at', fiveMinutesAgo)
      .select();
      
    if (markError) {
      console.error('Error marking old calls as abandoned:', markError);
    } else {
      console.log(`Marked ${oldCalls.length} old calls as abandoned`);
    }
    
    // Check recent calls (last 24 hours) for context
    console.log('\n=== RECENT CALLS (LAST 24H) ===');
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recentCalls } = await supabase
      .from('call_logs')
      .select('*')
      .gte('created_at', yesterday)
      .order('created_at', { ascending: false })
      .limit(10);
      
    console.log('Recent calls (24h, last 10):', recentCalls.length);
    recentCalls.forEach(call => {
      console.log(`${call.status}: ${call.phone_number} at ${call.created_at}`);
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

checkCallQueue().catch(console.error);
