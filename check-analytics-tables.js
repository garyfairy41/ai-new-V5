import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wllyticlzvtsimgefsti.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsbHl0aWNsenZ0c2ltZ2Vmc3RpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTYxMDQxNiwiZXhwIjoyMDY1MTg2NDE2fQ.ffz0OVDEY8s2n_Qar0IlRig0G16zH9BAG5EyHZZyaWA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAnalyticsTables() {
  console.log('=== CHECKING ANALYTICS-RELATED TABLES ===\n');

  try {
    // Check if lead_data table exists
    const { data: leadDataCheck, error: leadDataError } = await supabase
      .from('lead_data')
      .select('*')
      .limit(1);

    if (leadDataError) {
      console.log('❌ lead_data table does not exist');
    } else {
      console.log('✅ lead_data table exists');
    }

    // Check call_logs table structure
    const { data: callLogs, error: callLogsError } = await supabase
      .from('call_logs')
      .select('*')
      .limit(1);

    if (callLogsError) {
      console.log('❌ call_logs table issue:', callLogsError.message);
    } else {
      console.log('✅ call_logs table exists');
      if (callLogs && callLogs.length > 0) {
        console.log('   Sample call_logs columns:', Object.keys(callLogs[0]));
      }
    }

    // Check call_recordings table
    const { data: recordings, error: recordingsError } = await supabase
      .from('call_recordings')
      .select('*')
      .limit(1);

    if (recordingsError) {
      console.log('❌ call_recordings table issue:', recordingsError.message);
    } else {
      console.log('✅ call_recordings table exists');
      if (recordings && recordings.length > 0) {
        console.log('   Sample call_recordings columns:', Object.keys(recordings[0]));
      }
    }

    // Check campaign_leads table for lead data storage
    const { data: campaignLeads, error: campaignLeadsError } = await supabase
      .from('campaign_leads')
      .select('*')
      .limit(1);

    if (campaignLeadsError) {
      console.log('❌ campaign_leads table issue:', campaignLeadsError.message);
    } else {
      console.log('✅ campaign_leads table exists');
      if (campaignLeads && campaignLeads.length > 0) {
        console.log('   Sample campaign_leads columns:', Object.keys(campaignLeads[0]));
      }
    }

    // Check if we have any structured lead data
    const { data: structuredData, error: structuredError } = await supabase
      .rpc('check_lead_data_structure');

    if (structuredError) {
      console.log('❌ No structured lead data function available');
    } else {
      console.log('✅ Structured lead data function exists');
    }

  } catch (error) {
    console.error('Error checking analytics tables:', error);
  }
}

checkAnalyticsTables();
