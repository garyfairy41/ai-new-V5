import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function checkLeadsIssue() {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    console.log('🔍 Checking Leads Issue');
    console.log('='.repeat(50));
    
    // 1. Check all campaigns
    console.log('\n1. All campaigns:');
    const { data: allCampaigns } = await supabase
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false });
    
    console.log(`Found ${allCampaigns.length} total campaigns`);
    
    for (const campaign of allCampaigns) {
      console.log(`- ${campaign.name} (${campaign.id}) - Status: ${campaign.status}`);
    }
    
    // 2. Check all leads
    console.log('\n2. All campaign leads:');
    const { data: allLeads } = await supabase
      .from('campaign_leads')
      .select('*')
      .order('created_at', { ascending: false });
    
    console.log(`Found ${allLeads.length} total leads`);
    
    if (allLeads.length > 0) {
      console.log('Sample leads:');
      allLeads.slice(0, 5).forEach(lead => {
        console.log(`- ${lead.phone_number} (Campaign: ${lead.campaign_id}) - Status: ${lead.status}`);
      });
      
      // Check campaign_id distribution
      const campaignDistribution = {};
      allLeads.forEach(lead => {
        campaignDistribution[lead.campaign_id] = (campaignDistribution[lead.campaign_id] || 0) + 1;
      });
      
      console.log('\n3. Leads per campaign:');
      Object.entries(campaignDistribution).forEach(([campaignId, count]) => {
        const campaign = allCampaigns.find(c => c.id === campaignId);
        const campaignName = campaign ? campaign.name : 'Unknown';
        console.log(`- ${campaignName} (${campaignId}): ${count} leads`);
      });
    }
    
    // 3. Check if there are orphaned leads
    console.log('\n4. Checking for orphaned leads...');
    const campaignIds = allCampaigns.map(c => c.id);
    const orphanedLeads = allLeads.filter(lead => !campaignIds.includes(lead.campaign_id));
    
    if (orphanedLeads.length > 0) {
      console.log(`❌ Found ${orphanedLeads.length} orphaned leads:`);
      orphanedLeads.forEach(lead => {
        console.log(`- ${lead.phone_number} references non-existent campaign: ${lead.campaign_id}`);
      });
    } else {
      console.log('✅ No orphaned leads found');
    }
    
    // 4. Check if draft campaigns have leads
    console.log('\n5. Draft campaigns with leads:');
    const draftCampaigns = allCampaigns.filter(c => c.status === 'draft');
    
    for (const campaign of draftCampaigns) {
      const campaignLeads = allLeads.filter(l => l.campaign_id === campaign.id);
      console.log(`- ${campaign.name}: ${campaignLeads.length} leads`);
      
      if (campaignLeads.length === 0) {
        console.log(`  ❌ This campaign has no leads! This is why Start Campaign fails.`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkLeadsIssue();
