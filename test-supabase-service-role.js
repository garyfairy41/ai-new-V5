import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Supabase client with service role key
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔑 Supabase URL:', supabaseUrl);
console.log('🔑 Service Role Key (first 20 chars):', supabaseKey?.substring(0, 20));

const supabase = createClient(supabaseUrl, supabaseKey);

async function testServiceRoleAccess() {
  try {
    console.log('\n🧪 Testing service role access...');
    
    // Test 1: Check what user/role we are
    const { data: authData, error: authError } = await supabase.auth.getUser();
    console.log('Auth user:', authData?.user?.id || 'No user');
    console.log('Auth error:', authError?.message || 'No error');
    
    // Test 2: Query campaigns directly (should bypass RLS)
    const { data: campaigns, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, name, profile_id, status')
      .limit(5);
    
    console.log('\n📊 Campaigns query:');
    console.log('Campaigns:', campaigns?.length || 0);
    console.log('Campaign error:', campaignError?.message || 'No error');
    if (campaigns?.length > 0) {
      console.log('Sample campaign:', campaigns[0]);
    }
    
    // Test 3: Query campaign_leads directly (should bypass RLS)
    const { data: leads, error: leadsError } = await supabase
      .from('campaign_leads')
      .select('id, campaign_id, status')
      .limit(5);
    
    console.log('\n📋 Campaign leads query:');
    console.log('Leads:', leads?.length || 0);
    console.log('Leads error:', leadsError?.message || 'No error');
    if (leads?.length > 0) {
      console.log('Sample lead:', leads[0]);
    }
    
    // Test 4: Query pending leads for a specific campaign (what auto-dialer does)
    if (campaigns?.length > 0) {
      const campaignId = campaigns[0].id;
      const { data: pendingLeads, error: pendingError } = await supabase
        .from('campaign_leads')
        .select('id, phone_number, status')
        .eq('campaign_id', campaignId)
        .eq('status', 'pending');
      
      console.log(`\n📞 Pending leads for campaign ${campaignId}:`);
      console.log('Pending leads:', pendingLeads?.length || 0);
      console.log('Pending error:', pendingError?.message || 'No error');
      if (pendingLeads?.length > 0) {
        console.log('Sample pending lead:', pendingLeads[0]);
      }
    }
    
    // Test 5: Execute raw SQL to check current role
    const { data: roleData, error: roleError } = await supabase
      .rpc('get_current_role');
    
    console.log('\n👤 Current role check:');
    console.log('Role data:', roleData);
    console.log('Role error:', roleError?.message || 'No error');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testServiceRoleAccess();
