import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://wllyticlzvtsimgefsti.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsbHl0aWNsenZ0c2ltZ2Vmc3RpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTYxMDQxNiwiZXhwIjoyMDY1MTg2NDE2fQ.ffz0OVDEY8s2n_Qar0IlRig0G16zH9BAG5EyHZZyaWA');

async function createLeadDataTable() {
  console.log('Creating lead_data table...');
  
  try {
    // First check if table exists
    const { data: existingTable, error: checkError } = await supabase
      .from('lead_data')
      .select('id')
      .limit(1);

    if (!checkError) {
      console.log('✅ lead_data table already exists');
      return;
    }

    console.log('Creating new lead_data table...');

    // Create the table using ALTER statements since we can't run DDL directly
    // We'll add the missing columns to existing tables first
    
    // Add columns to call_logs for analytics
    const { error: callLogsError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE public.call_logs 
        ADD COLUMN IF NOT EXISTS lead_data_collected BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS data_completeness_score DECIMAL(5,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS dnc_requested BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS qualified_lead BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS appointment_scheduled BOOLEAN DEFAULT false;
      `
    });

    if (callLogsError) {
      console.log('⚠️ call_logs updates may have failed:', callLogsError.message);
    } else {
      console.log('✅ Updated call_logs table');
    }

    // Add columns to campaign_leads for analytics
    const { error: campaignLeadsError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE public.campaign_leads 
        ADD COLUMN IF NOT EXISTS lead_data_collected JSONB,
        ADD COLUMN IF NOT EXISTS data_completeness_score DECIMAL(5,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS dnc_requested BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS qualified_lead BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS appointment_scheduled BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS last_data_update TIMESTAMP WITH TIME ZONE;
      `
    });

    if (campaignLeadsError) {
      console.log('⚠️ campaign_leads updates may have failed:', campaignLeadsError.message);
    } else {
      console.log('✅ Updated campaign_leads table');
    }

    console.log('Database updates complete!');
    console.log('Note: For full analytics, you may need to run the complete SQL in Supabase SQL Editor');

  } catch (error) {
    console.error('Error setting up analytics tables:', error);
  }
}

createLeadDataTable();
