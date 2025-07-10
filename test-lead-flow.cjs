const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function testCompleteFlow() {
  console.log('🧪 TESTING COMPLETE LEAD ADDITION FLOW...');
  
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  // 1. Get a campaign to test with
  const { data: campaigns } = await supabase.from('campaigns').select('id, name, total_leads').limit(1);
  if (!campaigns || campaigns.length === 0) {
    console.log('❌ No campaigns found to test with');
    return;
  }
  
  const campaign = campaigns[0];
  console.log(`📋 Testing with campaign: ${campaign.name} (ID: ${campaign.id})`);
  console.log(`📊 Current lead count: ${campaign.total_leads}`);
  
  // 2. Add a lead via API
  console.log('🚀 Adding lead via API...');
  const response = await fetch('http://localhost:12001/api/campaigns/' + campaign.id + '/leads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      leads: [{
        phone_number: '15559998888',
        first_name: 'Flow',
        last_name: 'Test',
        email: 'flow.test@example.com',
        company: 'Flow Corp',
        title: 'Flow Manager',
        status: 'pending',
        call_attempts: 0,
        notes: 'Complete flow test'
      }]
    })
  });
  
  if (response.ok) {
    const result = await response.json();
    console.log(`✅ API Success: ${result.message}`);
    console.log(`📝 Added lead ID: ${result.leads[0].id}`);
  } else {
    console.log(`❌ API Failed: ${response.status} ${response.statusText}`);
    return;
  }
  
  // 3. Check if lead was actually added
  console.log('🔍 Verifying lead was added to database...');
  const { data: leads, error } = await supabase
    .from('campaign_leads')
    .select('id, phone_number, first_name, company')
    .eq('campaign_id', campaign.id)
    .eq('phone_number', '15559998888');
    
  if (error) {
    console.log('❌ Error checking leads:', error);
  } else if (leads.length > 0) {
    console.log(`✅ Lead found in database: ${leads[0].first_name} (${leads[0].phone_number})`);
  } else {
    console.log('❌ Lead not found in database');
  }
  
  // 4. Check updated campaign lead count
  const { data: updatedCampaign } = await supabase
    .from('campaigns')
    .select('total_leads')
    .eq('id', campaign.id)
    .single();
    
  if (updatedCampaign) {
    console.log(`📊 Updated campaign lead count: ${updatedCampaign.total_leads}`);
    if (updatedCampaign.total_leads > campaign.total_leads) {
      console.log('✅ Campaign lead count was updated correctly');
    } else {
      console.log('⚠️ Campaign lead count was NOT updated - this is the issue!');
    }
  }
  
  console.log('\n🎯 DIAGNOSIS:');
  console.log('- If API succeeds but lead count is not updated, the issue is in the server not updating total_leads');
  console.log('- If everything works here but UI still shows "Adding...", the issue is in the UI callback flow');
}

testCompleteFlow().catch(console.error);
