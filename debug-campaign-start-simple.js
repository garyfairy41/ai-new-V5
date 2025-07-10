import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Investigating Campaign Start Issue');
console.log('='.repeat(50));

async function debugCampaignStart() {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // 1. Check for campaigns
    console.log('\n1. Checking campaigns...');
    const { data: campaigns } = await supabase
      .from('campaigns')
      .select('*')
      .eq('status', 'draft')
      .limit(1);
    
    if (!campaigns || campaigns.length === 0) {
      console.log('❌ No draft campaigns found');
      return;
    }
    
    const campaign = campaigns[0];
    console.log(`✅ Found campaign: ${campaign.name} (${campaign.id})`);
    
    // 2. Check leads with exact same query as AutoDialerEngine
    console.log('\n2. Checking leads with AutoDialerEngine query...');
    const { data: leads, error } = await supabase
      .from('campaign_leads')
      .select('*')
      .eq('campaign_id', campaign.id)
      .in('status', ['pending', 'failed'])
      .lt('call_attempts', 3)  // default retryAttempts
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('❌ Error loading leads:', error);
      return;
    }
    
    console.log(`✅ Found ${leads.length} leads matching AutoDialerEngine criteria`);
    
    if (leads.length === 0) {
      console.log('\n🔍 Checking why no leads match...');
      
      // Check all leads for this campaign
      const { data: allLeads } = await supabase
        .from('campaign_leads')
        .select('*')
        .eq('campaign_id', campaign.id);
      
      console.log(`Total leads in campaign: ${allLeads.length}`);
      
      if (allLeads.length > 0) {
        console.log('Sample lead data:');
        const sample = allLeads[0];
        console.log('- Status:', sample.status);
        console.log('- Call attempts:', sample.call_attempts);
        console.log('- Created at:', sample.created_at);
        
        // Check status distribution
        const statusCount = {};
        allLeads.forEach(lead => {
          statusCount[lead.status] = (statusCount[lead.status] || 0) + 1;
        });
        console.log('Status distribution:', statusCount);
        
        // Check call_attempts distribution
        const attemptsCount = {};
        allLeads.forEach(lead => {
          const attempts = lead.call_attempts || 0;
          attemptsCount[attempts] = (attemptsCount[attempts] || 0) + 1;
        });
        console.log('Call attempts distribution:', attemptsCount);
      }
    }
    
    // 3. Check if call_attempts column exists
    console.log('\n3. Checking campaign_leads table structure...');
    const { data: tableInfo } = await supabase
      .from('campaign_leads')
      .select('*')
      .limit(1);
    
    if (tableInfo && tableInfo.length > 0) {
      console.log('Available columns:', Object.keys(tableInfo[0]));
      
      // Check if call_attempts exists
      const hasCallAttempts = tableInfo[0].hasOwnProperty('call_attempts');
      console.log('Has call_attempts column:', hasCallAttempts);
      
      if (!hasCallAttempts) {
        console.log('❌ Missing call_attempts column! This is likely the issue.');
      }
    }
    
    // 4. Simulate the AutoDialerEngine constructor
    console.log('\n4. Simulating AutoDialerEngine initialization...');
    const config = {
      campaignId: campaign.id,
      supabase: supabase,
      twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
      twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
      webhookUrl: process.env.WEBHOOK_URL,
      websocketUrl: process.env.WEBSOCKET_URL,
      retryAttempts: 3,
      maxConcurrentCalls: 1
    };
    
    console.log('Config complete:', Object.keys(config));
    
    // 5. Check Twilio environment variables
    console.log('\n5. Checking Twilio environment...');
    console.log('TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID ? 'set' : 'missing');
    console.log('TWILIO_AUTH_TOKEN:', process.env.TWILIO_AUTH_TOKEN ? 'set' : 'missing');
    console.log('WEBHOOK_URL:', process.env.WEBHOOK_URL ? 'set' : 'missing');
    console.log('WEBSOCKET_URL:', process.env.WEBSOCKET_URL ? 'set' : 'missing');
    
    console.log('\n🎯 Summary:');
    console.log('- Campaign exists:', !!campaign);
    console.log('- Leads found by AutoDialerEngine query:', leads.length);
    console.log('- Twilio config:', !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN));
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugCampaignStart();
