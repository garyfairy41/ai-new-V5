/**
 * Lead Import Debugging Tool
 * 
 * This script helps debug issues with the lead import functionality
 * by testing the API endpoint directly with sample data.
 */

const fetch = require('node-fetch');

// Configuration - replace with your values
const API_URL = 'http://localhost:12001';  // Update with your actual server URL
const CAMPAIGN_ID = ''; // Fill this with an actual campaign ID from your database

async function testLeadImport() {
  // Sample leads data
  const testLeads = [
    {
      phone_number: '+12345678901',
      first_name: 'Test',
      last_name: 'User',
      email: 'test@example.com',
      company: 'Test Company',
      title: 'Test Title',
      status: 'pending',
      call_attempts: 0,
      notes: 'Created by debug script'
    }
  ];

  console.log('🎯 Testing lead import API');
  console.log('📝 Campaign ID:', CAMPAIGN_ID || 'Not specified - update this in the script!');
  console.log('📝 Test leads:', JSON.stringify(testLeads, null, 2));

  if (!CAMPAIGN_ID) {
    console.error('❌ Please specify a CAMPAIGN_ID in the script');
    return;
  }

  try {
    // Make the API call
    const url = `${API_URL}/api/campaigns/${CAMPAIGN_ID}/leads`;
    console.log('🌐 Making API request to:', url);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ leads: testLeads })
    });

    console.log('📊 API Response status:', response.status);
    
    const data = await response.json();
    console.log('📊 API Response body:', JSON.stringify(data, null, 2));

    if (response.ok) {
      console.log('✅ API call successful!');
    } else {
      console.error('❌ API call failed!');
    }
  } catch (error) {
    console.error('💥 Exception during API call:', error);
  }
}

// Run the test
testLeadImport().then(() => console.log('Test complete'));
