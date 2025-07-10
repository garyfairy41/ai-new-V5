import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function testFrontendStartCampaign() {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    console.log('🔍 Testing Frontend Start Campaign Issue');
    console.log('='.repeat(50));
    
    // 1. Find the Sales Frontier campaign
    const { data: campaigns } = await supabase
      .from('campaigns')
      .select('*')
      .ilike('name', '%Sales Frontier%')
      .eq('status', 'draft')
      .limit(1);
    
    if (!campaigns || campaigns.length === 0) {
      console.log('❌ No Sales Frontier draft campaign found');
      return;
    }
    
    const campaign = campaigns[0];
    console.log(`✅ Found campaign: ${campaign.name} (${campaign.id})`);
    
    // 2. Check if it has leads
    const { data: leads } = await supabase
      .from('campaign_leads')
      .select('*')
      .eq('campaign_id', campaign.id);
    
    console.log(`📋 Campaign has ${leads.length} leads`);
    
    if (leads.length === 0) {
      console.log('❌ Campaign has no leads - this would cause frontend to show error');
      return;
    }
    
    // 3. Simulate the frontend API call
    console.log('\n🚀 Simulating frontend API call...');
    
    const API_URL = process.env.WEBHOOK_URL ? process.env.WEBHOOK_URL.replace('/webhook/voice', '') : 'http://localhost:12001';
    const fullUrl = `${API_URL}/api/campaigns/${campaign.id}/start`;
    
    console.log(`📡 Making request to: ${fullUrl}`);
    
    try {
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Note: We're not using the auth token here since we're testing from backend
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
        console.log(`❌ API call failed: ${errorMessage}`);
        return;
      }
      
      const result = await response.json();
      console.log('✅ API call successful:', result);
      
    } catch (fetchError) {
      console.error('❌ Network error making API call:', fetchError);
      
      // Check if the server is running
      console.log('\n🔍 Checking if server is running...');
      try {
        const healthResponse = await fetch(`${API_URL}/health`);
        console.log(`Health check status: ${healthResponse.status}`);
      } catch (healthError) {
        console.log('❌ Server appears to be down or not accessible');
        console.log('💡 Make sure to start the server with: npm run start');
      }
    }
    
    // 4. Check environment variables that frontend would use
    console.log('\n🔍 Checking environment variables...');
    console.log('WEBHOOK_URL:', process.env.WEBHOOK_URL ? 'set' : 'not set');
    console.log('NODE_ENV:', process.env.NODE_ENV || 'not set');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testFrontendStartCampaign();
