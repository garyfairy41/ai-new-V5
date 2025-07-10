import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function resetCampaign() {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    console.log('🔄 Resetting Sales Frontier Campaign');
    console.log('='.repeat(50));
    
    // 1. Reset campaign status to draft
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .update({
        status: 'draft',
        updated_at: new Date().toISOString()
      })
      .eq('name', 'Sales Frontier')
      .select()
      .single();
    
    if (campaignError) {
      console.error('❌ Error resetting campaign:', campaignError);
      return;
    }
    
    console.log(`✅ Reset campaign ${campaign.name} to draft status`);
    
    // 2. Reset lead statuses to pending
    const { data: leads, error: leadsError } = await supabase
      .from('campaign_leads')
      .update({
        status: 'pending',
        call_sid: null,
        outcome: null,
        call_attempts: 0,
        last_call_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('campaign_id', campaign.id)
      .select();
    
    if (leadsError) {
      console.error('❌ Error resetting leads:', leadsError);
      return;
    }
    
    console.log(`✅ Reset ${leads.length} leads to pending status`);
    
    // 3. Show current state
    console.log('\n📊 Current Campaign State:');
    console.log(`- Campaign: ${campaign.name}`);
    console.log(`- Status: ${campaign.status}`);
    console.log(`- Leads: ${leads.length}`);
    
    leads.forEach((lead, index) => {
      console.log(`  ${index + 1}. ${lead.phone_number} - ${lead.status} (${lead.call_attempts} attempts)`);
    });
    
    console.log('\n🎉 Campaign reset complete! You can now click "Start Campaign" again.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

resetCampaign();
