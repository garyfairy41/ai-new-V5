import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function debugCampaignState() {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    console.log('🔍 Debugging Campaign State After Call');
    console.log('='.repeat(50));
    
    // 1. Check Sales Frontier campaign status
    console.log('\n1. Sales Frontier Campaign Status:');
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('*')
      .eq('name', 'Sales Frontier')
      .single();
    
    if (campaign) {
      console.log(`- ID: ${campaign.id}`);
      console.log(`- Name: ${campaign.name}`);
      console.log(`- Status: ${campaign.status}`);
      console.log(`- Total leads: ${campaign.total_leads}`);
      console.log(`- Created: ${campaign.created_at}`);
      console.log(`- Updated: ${campaign.updated_at}`);
    }
    
    // 2. Check all leads for Sales Frontier
    console.log('\n2. Sales Frontier Leads:');
    const { data: leads } = await supabase
      .from('campaign_leads')
      .select('*')
      .eq('campaign_id', campaign.id)
      .order('created_at', { ascending: true });
    
    if (leads) {
      console.log(`Found ${leads.length} leads:`);
      leads.forEach((lead, index) => {
        console.log(`${index + 1}. ${lead.phone_number} (${lead.first_name} ${lead.last_name})`);
        console.log(`   - Status: ${lead.status}`);
        console.log(`   - Call attempts: ${lead.call_attempts}`);
        console.log(`   - Last call: ${lead.last_call_at || 'Never'}`);
        console.log(`   - Next call: ${lead.next_call_at || 'Not scheduled'}`);
        console.log(`   - Call SID: ${lead.call_sid || 'None'}`);
        console.log(`   - Outcome: ${lead.outcome || 'None'}`);
        console.log(`   - Updated: ${lead.updated_at}`);
        console.log('');
      });
    }
    
    // 3. Check if there are any active dialers or processes
    console.log('\n3. Checking for active processes...');
    console.log('(This would normally check the AutoDialerEngine instances)');
    
    // 4. Check call history/logs if available
    console.log('\n4. Recent Database Activity:');
    const { data: recentLeads } = await supabase
      .from('campaign_leads')
      .select('*')
      .eq('campaign_id', campaign.id)
      .order('updated_at', { ascending: false });
    
    if (recentLeads) {
      console.log('Most recently updated leads:');
      recentLeads.forEach((lead, index) => {
        console.log(`${index + 1}. ${lead.phone_number} - Status: ${lead.status} - Updated: ${lead.updated_at}`);
      });
    }
    
    // 5. Suggest fixes
    console.log('\n5. Suggested Fixes:');
    console.log('- If campaign status is "active", reset it to "draft"');
    console.log('- If leads show wrong status, check webhook handling');
    console.log('- If UI not updating, check frontend polling/websocket');
    console.log('- If only 1 call made, check AutoDialerEngine queue processing');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugCampaignState();
