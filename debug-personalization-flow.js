#!/usr/bin/env node

// Advanced personalization debugging script
// This script traces how variables are replaced in system instructions
// Run with: node debug-personalization-flow.js [campaign_id]

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Function to simulate the personalization process
function personalizeInstructions(systemInstructions, leadData) {
  console.log('🔄 Starting personalization process...');
  console.log('📝 Original system instructions:');
  console.log(systemInstructions);
  console.log('\n📊 Lead data available:');
  console.log(JSON.stringify(leadData, null, 2));

  let personalizedInstructions = systemInstructions;
  const replacements = {};

  // Common variable patterns to look for
  const variablePatterns = {
    '{{firstName}}': leadData.first_name,
    '{{first_name}}': leadData.first_name,
    '{{lastName}}': leadData.last_name,
    '{{last_name}}': leadData.last_name,
    '{{fullName}}': `${leadData.first_name || ''} ${leadData.last_name || ''}`.trim(),
    '{{full_name}}': `${leadData.first_name || ''} ${leadData.last_name || ''}`.trim(),
    '{{phoneNumber}}': leadData.phone_number,
    '{{phone_number}}': leadData.phone_number,
    '{{phone}}': leadData.phone_number,
    '{{email}}': leadData.email,
    '{{company}}': leadData.company,
    '{{title}}': leadData.title,
    '{{job_title}}': leadData.title
  };

  // Find all variables in the instructions
  const foundVariables = systemInstructions.match(/\{\{[^}]+\}\}/g) || [];
  console.log('\n🔍 Variables found in instructions:', foundVariables);

  // Replace each variable
  foundVariables.forEach(variable => {
    const replacement = variablePatterns[variable];
    if (replacement !== undefined && replacement !== null && replacement !== '') {
      personalizedInstructions = personalizedInstructions.replace(new RegExp(variable.replace(/[{}]/g, '\\$&'), 'g'), replacement);
      replacements[variable] = replacement;
      console.log(`✅ Replaced ${variable} with: "${replacement}"`);
    } else {
      console.log(`❌ No replacement found for ${variable} (value: ${replacement})`);
    }
  });

  console.log('\n📋 Summary of replacements:');
  Object.entries(replacements).forEach(([variable, value]) => {
    console.log(`  ${variable} → "${value}"`);
  });

  console.log('\n📝 Final personalized instructions:');
  console.log(personalizedInstructions);

  return {
    original: systemInstructions,
    personalized: personalizedInstructions,
    replacements,
    leadData
  };
}

async function debugCampaignPersonalization(campaignId) {
  console.log(`🎯 Debugging personalization for campaign: ${campaignId}\n`);

  try {
    // 1. Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (campaignError) {
      console.error('❌ Error fetching campaign:', campaignError);
      return;
    }

    console.log('📋 Campaign Details:');
    console.log(`  Name: ${campaign.name}`);
    console.log(`  Status: ${campaign.status}`);
    console.log(`  Created: ${new Date(campaign.created_at).toLocaleString()}`);

    if (!campaign.system_instructions) {
      console.log('❌ No system instructions found for this campaign');
      return;
    }

    // 2. Get leads for this campaign
    const { data: leads, error: leadsError } = await supabase
      .from('campaign_leads')
      .select('*')
      .eq('campaign_id', campaignId)
      .limit(5); // Test with first 5 leads

    if (leadsError) {
      console.error('❌ Error fetching leads:', leadsError);
      return;
    }

    if (leads.length === 0) {
      console.log('❌ No leads found for this campaign');
      return;
    }

    console.log(`\n📊 Found ${leads.length} leads. Testing personalization with each:\n`);

    // 3. Test personalization with each lead
    leads.forEach((lead, index) => {
      console.log(`${'='.repeat(60)}`);
      console.log(`🧪 Testing Lead ${index + 1}:`);
      console.log(`  ID: ${lead.id}`);
      console.log(`  Phone: ${lead.phone_number}`);
      console.log(`  Status: ${lead.status}`);
      console.log(`  Created: ${new Date(lead.created_at).toLocaleString()}`);
      
      const result = personalizeInstructions(campaign.system_instructions, lead);
      
      // Check if personalization was successful
      const hasUnreplacedVariables = result.personalized.match(/\{\{[^}]+\}\}/g);
      if (hasUnreplacedVariables) {
        console.log(`⚠️  Warning: Unreplaced variables found: ${hasUnreplacedVariables.join(', ')}`);
      } else {
        console.log('✅ All variables successfully replaced');
      }
      
      console.log('');
    });

    // 4. Check what would happen with the next available lead
    const { data: nextLead, error: nextLeadError } = await supabase
      .from('campaign_leads')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('status', 'pending')
      .limit(1)
      .single();

    if (!nextLeadError && nextLead) {
      console.log(`${'='.repeat(60)}`);
      console.log('🎯 NEXT LEAD TO BE CALLED:');
      console.log(`  This is the lead that would be used in the next call:`);
      personalizeInstructions(campaign.system_instructions, nextLead);
    } else {
      console.log('\n⚠️  No pending leads found for this campaign');
    }

  } catch (error) {
    console.error('❌ Error during debugging:', error);
  }
}

async function listAllCampaigns() {
  console.log('📋 Available Campaigns:\n');
  
  const { data: campaigns, error } = await supabase
    .from('campaigns')
    .select('id, name, status, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching campaigns:', error);
    return;
  }

  if (campaigns.length === 0) {
    console.log('No campaigns found');
    return;
  }

  console.table(campaigns.map(c => ({
    ID: c.id,
    Name: c.name,
    Status: c.status,
    Created: new Date(c.created_at).toLocaleDateString()
  })));

  console.log('\nTo debug a specific campaign, run:');
  console.log('node debug-personalization-flow.js <campaign_id>');
}

// Main execution
async function main() {
  const campaignId = process.argv[2];

  if (!campaignId) {
    await listAllCampaigns();
  } else {
    await debugCampaignPersonalization(campaignId);
  }
}

main().catch(console.error);
