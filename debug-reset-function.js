// Debug script to test campaign reset function from Node.js
// Run with: node debug-reset-function.js

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'your-supabase-url',
  process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key'
);

async function debugResetFunction() {
  console.log('🔍 Debugging Campaign Reset Function...\n');

  try {
    // 1. List all campaigns
    console.log('1. Fetching all campaigns...');
    const { data: campaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select('id, name, status, created_at')
      .order('created_at', { ascending: false });

    if (campaignsError) {
      console.error('❌ Error fetching campaigns:', campaignsError);
      return;
    }

    console.log(`✅ Found ${campaigns.length} campaigns:`);
    campaigns.forEach((campaign, index) => {
      console.log(`   ${index + 1}. ${campaign.name} (${campaign.id}) - Status: ${campaign.status}`);
    });

    if (campaigns.length === 0) {
      console.log('❌ No campaigns found. Create a campaign first.');
      return;
    }

    // 2. Select the first campaign for testing
    const testCampaign = campaigns[0];
    console.log(`\n2. Testing with campaign: ${testCampaign.name} (${testCampaign.id})`);

    // 3. Check campaign leads before reset
    console.log('\n3. Checking campaign leads before reset...');
    const { data: leadsBefore, error: leadsBeforeError } = await supabase
      .from('campaign_leads')
      .select('id, status, call_attempts, outcome, phone_number, first_name')
      .eq('campaign_id', testCampaign.id);

    if (leadsBeforeError) {
      console.error('❌ Error fetching leads before reset:', leadsBeforeError);
      return;
    }

    console.log(`✅ Found ${leadsBefore.length} leads before reset:`);
    leadsBefore.forEach((lead, index) => {
      console.log(`   ${index + 1}. ${lead.phone_number} (${lead.first_name}) - Status: ${lead.status}, Attempts: ${lead.call_attempts}`);
    });

    // 4. Test the reset function using RPC
    console.log(`\n4. Testing reset function via RPC for campaign ${testCampaign.id}...`);
    const { data: resetResult, error: resetError } = await supabase
      .rpc('reset_campaign_leads', { campaign_id_param: testCampaign.id });

    if (resetError) {
      console.error('❌ Error calling reset function:', resetError);
      console.log('Error details:', JSON.stringify(resetError, null, 2));
    } else {
      console.log('✅ Reset function executed successfully');
      console.log('Reset result:', resetResult);
    }

    // 5. Check campaign leads after reset
    console.log('\n5. Checking campaign leads after reset...');
    const { data: leadsAfter, error: leadsAfterError } = await supabase
      .from('campaign_leads')
      .select('id, status, call_attempts, outcome, phone_number, first_name')
      .eq('campaign_id', testCampaign.id);

    if (leadsAfterError) {
      console.error('❌ Error fetching leads after reset:', leadsAfterError);
      return;
    }

    console.log(`✅ Found ${leadsAfter.length} leads after reset:`);
    leadsAfter.forEach((lead, index) => {
      console.log(`   ${index + 1}. ${lead.phone_number} (${lead.first_name}) - Status: ${lead.status}, Attempts: ${lead.call_attempts}`);
    });

    // 6. Compare before and after
    console.log('\n6. Comparison:');
    const resetLeads = leadsAfter.filter(lead => lead.status === 'pending' && lead.call_attempts === 0);
    console.log(`   - Leads before reset: ${leadsBefore.length}`);
    console.log(`   - Leads after reset: ${leadsAfter.length}`);
    console.log(`   - Leads properly reset (pending, 0 attempts): ${resetLeads.length}`);

    if (resetLeads.length === leadsAfter.length && leadsAfter.length > 0) {
      console.log('✅ Reset function worked correctly!');
    } else {
      console.log('⚠️  Reset function may not have worked as expected');
    }

    // 7. Test direct database update as fallback
    console.log('\n7. Testing direct database update as fallback...');
    const { data: updateResult, error: updateError } = await supabase
      .from('campaign_leads')
      .update({ 
        status: 'pending', 
        call_attempts: 0,
        outcome: null
      })
      .eq('campaign_id', testCampaign.id);

    if (updateError) {
      console.error('❌ Error with direct update:', updateError);
    } else {
      console.log('✅ Direct update executed successfully');
    }

    // 8. Final verification
    console.log('\n8. Final verification...');
    const { data: finalLeads, error: finalError } = await supabase
      .from('campaign_leads')
      .select('id, status, call_attempts')
      .eq('campaign_id', testCampaign.id);

    if (finalError) {
      console.error('❌ Error in final verification:', finalError);
      return;
    }

    const allReset = finalLeads.every(lead => lead.status === 'pending' && lead.call_attempts === 0);
    console.log(`✅ All leads properly reset: ${allReset}`);
    console.log(`   - Total leads: ${finalLeads.length}`);
    console.log(`   - Pending leads: ${finalLeads.filter(l => l.status === 'pending').length}`);
    console.log(`   - Zero attempts: ${finalLeads.filter(l => l.call_attempts === 0).length}`);

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the debug function
debugResetFunction().then(() => {
  console.log('\n🏁 Debug complete');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
