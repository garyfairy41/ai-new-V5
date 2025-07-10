import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

console.log('🔍 Testing Complete Frontend Flow');
console.log('='.repeat(50));

async function testFrontendFlow() {
  try {
    // 1. Create Supabase client (like frontend does)
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // 2. Find campaign
    const { data: campaigns } = await supabase
      .from('campaigns')
      .select('*')
      .eq('status', 'draft')
      .eq('name', 'Sales Frontier')
      .limit(1);
    
    if (!campaigns || campaigns.length === 0) {
      console.log('❌ No Sales Frontier draft campaign found');
      return;
    }
    
    const campaign = campaigns[0];
    console.log(`✅ Found campaign: ${campaign.name} (${campaign.id})`);
    
    // 3. Check if campaign has leads (like frontend does)
    if (campaign.total_leads === 0) {
      console.log('❌ Campaign has no leads - frontend would show error');
      return;
    }
    
    console.log(`📋 Campaign has ${campaign.total_leads} leads`);
    
    // 4. Get user session (like frontend does)
    console.log('\n🔑 Getting user session...');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Session error:', sessionError);
      return;
    }
    
    if (!session) {
      console.log('❌ No active session - user not authenticated');
      return;
    }
    
    console.log('✅ Session found');
    console.log('- User ID:', session.user.id);
    console.log('- Email:', session.user.email);
    console.log('- Access token length:', session.access_token.length);
    
    // 5. Construct API URL (like frontend does)
    console.log('\n🌐 Constructing API URL...');
    
    // Simulate GitHub Codespaces environment
    const apiUrl = 'https://upgraded-cod-r4xxvx74gvjq25gxx-12001.app.github.dev';
    const fullUrl = `${apiUrl}/api/campaigns/${campaign.id}/start`;
    console.log(`📡 API URL: ${fullUrl}`);
    
    // 6. Make the API call (exactly like frontend does)
    console.log('\n🚀 Making API call...');
    
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      }
    });
    
    console.log(`📊 Response status: ${response.status}`);
    console.log(`📊 Response statusText: ${response.statusText}`);
    
    if (!response.ok) {
      let errorMessage = 'Failed to start campaign';
      try {
        const error = await response.json();
        errorMessage = error.error || error.message || errorMessage;
        console.error('❌ Campaign start error response:', error);
      } catch (e) {
        console.error('❌ Failed to parse error response:', e);
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      console.error('❌ API call failed:', errorMessage);
      return;
    }
    
    const result = await response.json();
    console.log('✅ Campaign started successfully:', result);
    
    // 7. Test what happens next (check campaign status)
    console.log('\n🔄 Checking campaign status after start...');
    
    const { data: updatedCampaign } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaign.id)
      .single();
    
    if (updatedCampaign) {
      console.log(`✅ Campaign status: ${updatedCampaign.status}`);
      console.log(`✅ Campaign updated_at: ${updatedCampaign.updated_at}`);
    }
    
    console.log('\n🎉 Complete frontend flow test successful!');
    
  } catch (error) {
    console.error('❌ Error in frontend flow:', error);
    console.error('Stack:', error.stack);
  }
}

testFrontendFlow();
