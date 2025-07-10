/**
 * Fix Database Schema for Campaign Leads
 * Fixes the foreign key constraint to point to campaigns table instead of outbound_campaigns
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixCampaignLeadsSchema() {
  console.log('🔧 Fixing campaign_leads foreign key constraint...');
  
  try {
    // First, check if the constraint exists
    const { data: constraints, error: constraintError } = await supabase
      .rpc('exec', {
        sql: `
          SELECT constraint_name 
          FROM information_schema.table_constraints 
          WHERE table_name = 'campaign_leads' 
          AND constraint_type = 'FOREIGN KEY'
          AND constraint_name LIKE '%campaign_id%';
        `
      });
    
    if (constraintError) {
      console.error('Error checking constraints:', constraintError);
    } else {
      console.log('Existing constraints:', constraints);
    }
    
    // Drop the old constraint if it exists
    console.log('📝 Dropping old foreign key constraint...');
    const { error: dropError } = await supabase
      .rpc('exec', {
        sql: `ALTER TABLE campaign_leads DROP CONSTRAINT IF EXISTS campaign_leads_campaign_id_fkey;`
      });
    
    if (dropError) {
      console.error('Error dropping constraint:', dropError);
    } else {
      console.log('✅ Old constraint dropped');
    }
    
    // Add new constraint pointing to campaigns table
    console.log('📝 Adding new foreign key constraint to campaigns table...');
    const { error: addError } = await supabase
      .rpc('exec', {
        sql: `
          ALTER TABLE campaign_leads 
          ADD CONSTRAINT campaign_leads_campaign_id_fkey 
          FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE;
        `
      });
    
    if (addError) {
      console.error('Error adding new constraint:', addError);
    } else {
      console.log('✅ New constraint added successfully');
    }
    
    // Verify the fix
    console.log('🔍 Verifying foreign key relationships...');
    const { data: newConstraints, error: verifyError } = await supabase
      .rpc('exec', {
        sql: `
          SELECT 
            tc.table_name, 
            kcu.column_name, 
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name 
          FROM 
            information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
          WHERE tc.constraint_type = 'FOREIGN KEY' 
          AND tc.table_name = 'campaign_leads';
        `
      });
    
    if (verifyError) {
      console.error('Error verifying:', verifyError);
    } else {
      console.log('✅ Current foreign key relationships:');
      console.table(newConstraints);
    }
    
  } catch (error) {
    console.error('❌ Error fixing schema:', error);
  }
}

fixCampaignLeadsSchema().then(() => {
  console.log('🎉 Schema fix completed!');
  process.exit(0);
});
