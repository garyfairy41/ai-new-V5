import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkAnalyticsState() {
  console.log('=== CHECKING CURRENT ANALYTICS STATE ===\n');
  
  try {
    // Check calls table
    console.log('1. CHECKING CALL LOGS:');
    const { data: calls, error: callsError } = await supabase
      .from('call_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    console.log(`Found ${calls?.length || 0} call records`);
    if (calls?.length > 0) {
      calls.forEach(call => {
        console.log(`  - Call ${call.call_sid}: ${call.direction} ${call.phone_number_to} -> Status: ${call.status}`);
      });
    }
    
    console.log('\n2. CHECKING CAMPAIGNS:');
    const { data: campaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select('*')
      .order('updated_at', { ascending: false });
    
    console.log(`Found ${campaigns?.length || 0} campaigns`);
    if (campaigns?.length > 0) {
      campaigns.forEach(campaign => {
        console.log(`  - ${campaign.name}: Status=${campaign.status}, Leads Called=${campaign.leads_called}, Answered=${campaign.leads_answered}`);
      });
    }
    
    console.log('\n3. CHECKING CAMPAIGN LEADS:');
    const { data: leads, error: leadsError } = await supabase
      .from('campaign_leads')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(15);
    
    console.log(`Found ${leads?.length || 0} campaign leads`);
    if (leads?.length > 0) {
      leads.forEach(lead => {
        console.log(`  - ${lead.phone_number}: Status=${lead.status}, Attempts=${lead.call_attempts}, Outcome=${lead.outcome || 'none'}`);
      });
    }
    
    console.log('\n4. CHECKING FOR RECORDINGS:');
    // Check if recordings table exists and has data
    const { data: recordings, error: recordingsError } = await supabase
      .from('call_recordings')
      .select('*')
      .limit(5);
    
    if (recordingsError) {
      console.log('  - call_recordings table may not exist:', recordingsError.message);
    } else {
      console.log(`  - Found ${recordings?.length || 0} recordings`);
    }
    
    console.log('\n5. CHECKING FOR CONVERSATION DATA:');
    const { data: messages, error: messagesError } = await supabase
      .from('call_messages')
      .select('*')
      .limit(5);
    
    if (messagesError) {
      console.log('  - call_messages table may not exist:', messagesError.message);
    } else {
      console.log(`  - Found ${messages?.length || 0} conversation messages`);
    }
    
  } catch (error) {
    console.error('Error checking analytics state:', error);
  }
}

checkAnalyticsState();
