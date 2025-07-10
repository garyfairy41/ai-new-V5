import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function debugSalesFrontierCampaign() {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    console.log('🔍 Debugging Sales Frontier Campaign Start Issue');
    console.log('='.repeat(60));
    
    // 1. Get the Sales Frontier campaign details
    const { data: salesFrontierCampaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('name', 'Sales Frontier')
      .single();
    
    if (campaignError) {
      console.error('❌ Error getting Sales Frontier campaign:', campaignError);
      return;
    }
    
    console.log('\n1. Sales Frontier Campaign Details:');
    console.log(`ID: ${salesFrontierCampaign.id}`);
    console.log(`Name: ${salesFrontierCampaign.name}`);
    console.log(`Status: ${salesFrontierCampaign.status}`);
    console.log(`Profile ID: ${salesFrontierCampaign.profile_id}`);
    console.log(`Total Leads: ${salesFrontierCampaign.total_leads}`);
    console.log(`Created: ${salesFrontierCampaign.created_at}`);
    
    // 2. Check the exact leads query that AutoDialerEngine uses
    console.log('\n2. AutoDialerEngine Lead Query Results:');
    const { data: dialerLeads, error: dialerError } = await supabase
      .from('campaign_leads')
      .select('*')
      .eq('campaign_id', salesFrontierCampaign.id)
      .in('status', ['pending', 'failed'])
      .lt('call_attempts', 3)
      .order('created_at', { ascending: true });
    
    if (dialerError) {
      console.error('❌ Error with AutoDialerEngine query:', dialerError);
      return;
    }
    
    console.log(`Found ${dialerLeads.length} leads matching AutoDialerEngine criteria`);
    
    if (dialerLeads.length === 0) {
      console.log('❌ No leads match AutoDialerEngine criteria - this is the problem!');
      
      // Check all leads for this campaign
      const { data: allLeads } = await supabase
        .from('campaign_leads')
        .select('*')
        .eq('campaign_id', salesFrontierCampaign.id);
      
      console.log(`\n3. All leads for Sales Frontier campaign: ${allLeads.length}`);
      
      if (allLeads.length > 0) {
        console.log('Lead details:');
        allLeads.forEach((lead, index) => {
          console.log(`Lead ${index + 1}:`);
          console.log(`  Phone: ${lead.phone_number}`);
          console.log(`  Name: ${lead.first_name} ${lead.last_name}`);
          console.log(`  Status: ${lead.status}`);
          console.log(`  Call Attempts: ${lead.call_attempts}`);
          console.log(`  Profile ID: ${lead.profile_id}`);
          console.log('');
        });
        
        // Check why they don't match AutoDialerEngine criteria
        console.log('🔍 Why leads don\'t match AutoDialerEngine query:');
        
        const pendingOrFailed = allLeads.filter(lead => ['pending', 'failed'].includes(lead.status));
        console.log(`- Leads with status 'pending' or 'failed': ${pendingOrFailed.length}`);
        
        const lowAttempts = allLeads.filter(lead => (lead.call_attempts || 0) < 3);
        console.log(`- Leads with call_attempts < 3: ${lowAttempts.length}`);
        
        const matchingBoth = allLeads.filter(lead => 
          ['pending', 'failed'].includes(lead.status) && 
          (lead.call_attempts || 0) < 3
        );
        console.log(`- Leads matching both criteria: ${matchingBoth.length}`);
        
        if (matchingBoth.length === 0) {
          console.log('\n❌ Issue found: No leads match the AutoDialerEngine criteria!');
          console.log('Possible causes:');
          console.log('- All leads have status other than "pending" or "failed"');
          console.log('- All leads have call_attempts >= 3');
          console.log('- Combination of both issues');
        }
      }
    } else {
      console.log('✅ AutoDialerEngine should find leads - checking other issues...');
      
      dialerLeads.forEach((lead, index) => {
        console.log(`Lead ${index + 1}: ${lead.phone_number} (${lead.status}, attempts: ${lead.call_attempts})`);
      });
    }
    
    // 3. Test if there's a different issue - maybe the start process itself
    console.log('\n4. Testing campaign start process simulation...');
    
    // Check if this campaign is already "active" or has another status issue
    if (salesFrontierCampaign.status === 'active') {
      console.log('❌ Campaign is already active - this might prevent starting');
    } else if (salesFrontierCampaign.status === 'completed') {
      console.log('❌ Campaign is completed - this might prevent starting');
    } else {
      console.log(`✅ Campaign status '${salesFrontierCampaign.status}' should allow starting`);
    }
    
    console.log('\n🎯 Summary for Sales Frontier Campaign:');
    console.log(`- Campaign exists: ✅`);
    console.log(`- Campaign status: ${salesFrontierCampaign.status}`);
    console.log(`- Total leads in campaign: ${salesFrontierCampaign.total_leads || 'unknown'}`);
    console.log(`- Leads matching AutoDialerEngine criteria: ${dialerLeads.length}`);
    
    if (dialerLeads.length === 0) {
      console.log('❌ ROOT CAUSE: No leads match AutoDialerEngine criteria - this is why start fails!');
    } else {
      console.log('⚠️  Leads exist but start still fails - need to check AutoDialerEngine logic');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugSalesFrontierCampaign();
