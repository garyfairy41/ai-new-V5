import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugPersonalizationIssue() {
  console.log('🔍 DEBUGGING PERSONALIZATION ISSUE - Why is Gemini getting wrong lead data?');
  console.log('================================================================================\n');

  // 1. Check current lead data for "test 1" campaign
  console.log('📋 1. CURRENT LEAD DATA FOR "TEST 1" CAMPAIGN:');
  const { data: testCampaign } = await supabase
    .from('campaigns')
    .select('id, name, status, agent_id')
    .eq('name', 'test 1')
    .single();

  if (!testCampaign) {
    console.log('❌ "test 1" campaign not found!');
    return;
  }

  console.log('Campaign:', testCampaign);

  const { data: campaignLeads } = await supabase
    .from('campaign_leads')
    .select('*')
    .eq('campaign_id', testCampaign.id)
    .order('created_at', { ascending: true });

  console.log('\nLeads in campaign:');
  campaignLeads?.forEach((lead, i) => {
    console.log(`  ${i + 1}. ${lead.first_name} ${lead.last_name} (${lead.phone_number}) - Status: ${lead.status}`);
  });

  // 2. Check which lead should be called next according to auto-dialer logic
  console.log('\n📞 2. NEXT LEAD TO BE CALLED (Auto-dialer logic):');
  
  const { data: nextLeads } = await supabase
    .from('campaign_leads')
    .select('*')
    .eq('campaign_id', testCampaign.id)
    .eq('status', 'pending')
    .lt('call_attempts', 3)  // Assuming max 3 attempts
    .order('created_at', { ascending: true })
    .limit(1);

  if (nextLeads && nextLeads.length > 0) {
    const nextLead = nextLeads[0];
    console.log(`✅ Next lead to call: ${nextLead.first_name} ${nextLead.last_name} (${nextLead.phone_number})`);
    console.log(`   Lead ID: ${nextLead.id}`);
    
    // 3. Simulate what the backend would do - fetch this lead's data
    console.log('\n🤖 3. SIMULATING BACKEND LEAD DATA FETCH:');
    const { data: leadData, error: leadError } = await supabase
      .from('campaign_leads')
      .select('first_name, last_name, email, phone_number, address, service_requested, custom_fields')
      .eq('id', nextLead.id)
      .single();
    
    if (leadError) {
      console.error('❌ Error fetching lead data:', leadError);
    } else {
      console.log('✅ Lead data that would be sent to Gemini:');
      console.log('   First Name:', leadData.first_name);
      console.log('   Last Name:', leadData.last_name);
      console.log('   Phone:', leadData.phone_number);
      console.log('   Email:', leadData.email);
      console.log('   Address:', leadData.address);
      console.log('   Service Requested:', leadData.service_requested);
    }
  } else {
    console.log('❌ No pending leads found for this campaign!');
  }

  // 4. Check for other leads that might be interfering
  console.log('\n🔄 4. CHECKING FOR LEAD CONFLICTS:');
  
  // Check if there are leads with similar phone numbers
  const { data: similarLeads } = await supabase
    .from('campaign_leads')
    .select('id, first_name, last_name, phone_number, campaign_id, status')
    .like('phone_number', '%513%300%7212%')
    .neq('campaign_id', testCampaign.id);
  
  if (similarLeads && similarLeads.length > 0) {
    console.log('⚠️ Found similar phone numbers in OTHER campaigns:');
    similarLeads.forEach(lead => {
      console.log(`   ${lead.first_name} ${lead.last_name} (${lead.phone_number}) in campaign ${lead.campaign_id} - Status: ${lead.status}`);
    });
  } else {
    console.log('✅ No conflicting leads with similar phone numbers found.');
  }

  // 5. Check recent call logs to see what data was actually used
  console.log('\n📊 5. RECENT CALL LOGS FOR DEBUGGING:');
  const { data: recentCalls } = await supabase
    .from('call_logs')
    .select('*')
    .eq('campaign_id', testCampaign.id)
    .order('created_at', { ascending: false })
    .limit(5);

  if (recentCalls && recentCalls.length > 0) {
    console.log('Recent calls:');
    recentCalls.forEach((call, i) => {
      console.log(`   ${i + 1}. Phone: ${call.phone_number}, Status: ${call.call_status}, Agent: ${call.agent_name}`);
      if (call.metadata) {
        try {
          const metadata = typeof call.metadata === 'string' ? JSON.parse(call.metadata) : call.metadata;
          console.log(`      Metadata - First Name: ${metadata.firstName || 'N/A'}, Last Name: ${metadata.lastName || 'N/A'}`);
        } catch (e) {
          console.log(`      Metadata: ${call.metadata}`);
        }
      }
    });
  } else {
    console.log('No recent calls found for this campaign.');
  }

  // 6. Check agent configuration
  console.log('\n🤖 6. AGENT CONFIGURATION CHECK:');
  if (testCampaign.agent_id) {
    const { data: agent } = await supabase
      .from('ai_agents')
      .select('name, system_instruction')
      .eq('id', testCampaign.agent_id)
      .single();
    
    if (agent) {
      console.log(`✅ Agent: ${agent.name}`);
      console.log('System instruction contains personalization variables:', 
        agent.system_instruction.includes('{first_name}') || 
        agent.system_instruction.includes('{last_name}') ||
        agent.system_instruction.includes('{full_name}')
      );
    }
  } else {
    console.log('❌ No agent assigned to this campaign!');
  }

  console.log('\n================================================================================');
  console.log('🎯 NEXT STEPS TO FIX THE ISSUE:');
  console.log('1. Ensure Sam Johnson is in "pending" status');
  console.log('2. Ensure campaign has a proper agent assigned');
  console.log('3. Check that WebSocket connections use the correct leadId');
  console.log('4. Verify backend lead data fetching uses the right campaign and lead IDs');
}

debugPersonalizationIssue().catch(console.error);
