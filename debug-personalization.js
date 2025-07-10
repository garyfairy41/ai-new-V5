#!/usr/bin/env node

/**
 * Debug script to trace variable personalization from database to Gemini
 * This will help us find exactly where the variable replacement breaks down
 */

const { createClient } = require('@supabase/supabase-js');

// You'll need to update these with your actual Supabase credentials
const supabaseUrl = process.env.SUPABASE_URL || 'your-supabase-url';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'your-supabase-anon-key';

async function debugPersonalization() {
  console.log('🔍 Starting personalization debug...\n');
  
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Step 1: Get active campaigns
    console.log('1️⃣ Fetching active campaigns...');
    const { data: campaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('status', 'active')
      .limit(1);
    
    if (campaignsError) {
      console.error('❌ Error fetching campaigns:', campaignsError);
      return;
    }
    
    if (!campaigns || campaigns.length === 0) {
      console.log('No active campaigns found. Let\'s check all campaigns:');
      const { data: allCampaigns } = await supabase
        .from('campaigns')
        .select('id, name, status')
        .limit(5);
      console.log('Available campaigns:', allCampaigns);
      return;
    }
    
    const campaign = campaigns[0];
    console.log(`✅ Found campaign: ${campaign.name} (${campaign.id})`);
    
    // Step 2: Get the agent for this campaign
    console.log('\n2️⃣ Fetching agent details...');
    const { data: agent, error: agentError } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('id', campaign.agent_id)
      .single();
    
    if (agentError) {
      console.error('❌ Error fetching agent:', agentError);
      return;
    }
    
    console.log(`✅ Found agent: ${agent.name}`);
    console.log('📝 Agent system instruction:', agent.system_instruction);
    console.log('📝 Campaign custom instruction:', campaign.custom_system_instruction);
    
    // Step 3: Get leads for this campaign
    console.log('\n3️⃣ Fetching campaign leads...');
    const { data: leads, error: leadsError } = await supabase
      .from('campaign_leads')
      .select('*')
      .eq('campaign_id', campaign.id)
      .eq('status', 'pending')
      .limit(1);
    
    if (leadsError) {
      console.error('❌ Error fetching leads:', leadsError);
      return;
    }
    
    if (!leads || leads.length === 0) {
      console.log('No pending leads found. Let\'s check all leads:');
      const { data: allLeads } = await supabase
        .from('campaign_leads')
        .select('first_name, last_name, phone_number, status')
        .eq('campaign_id', campaign.id)
        .limit(5);
      console.log('Available leads:', allLeads);
      return;
    }
    
    const lead = leads[0];
    console.log(`✅ Found lead: ${lead.first_name} ${lead.last_name} (${lead.phone_number})`);
    console.log('📋 Lead data:');
    console.log('  - first_name:', lead.first_name);
    console.log('  - last_name:', lead.last_name);
    console.log('  - email:', lead.email);
    console.log('  - address:', lead.address);
    console.log('  - service_requested:', lead.service_requested);
    
    // Step 4: Test variable replacement
    console.log('\n4️⃣ Testing variable replacement...');
    
    const systemInstruction = campaign.custom_system_instruction || agent.system_instruction;
    console.log('📝 Original system instruction:');
    console.log(systemInstruction);
    
    // Test both formats
    console.log('\n🔧 Testing double curly brace replacement {{variable}}...');
    let personalizedDouble = systemInstruction;
    personalizedDouble = personalizedDouble.replace(/\{\{firstName\}\}/g, lead.first_name || '');
    personalizedDouble = personalizedDouble.replace(/\{\{lastName\}\}/g, lead.last_name || '');
    personalizedDouble = personalizedDouble.replace(/\{\{email\}\}/g, lead.email || '');
    personalizedDouble = personalizedDouble.replace(/\{\{address\}\}/g, lead.address || '');
    personalizedDouble = personalizedDouble.replace(/\{\{serviceRequested\}\}/g, lead.service_requested || '');
    
    console.log('📝 After double brace replacement:');
    console.log(personalizedDouble);
    
    console.log('\n🔧 Testing single curly brace replacement {variable}...');
    let personalizedSingle = systemInstruction;
    personalizedSingle = personalizedSingle.replace(/\{first_name\}/g, lead.first_name || '');
    personalizedSingle = personalizedSingle.replace(/\{last_name\}/g, lead.last_name || '');
    personalizedSingle = personalizedSingle.replace(/\{email\}/g, lead.email || '');
    personalizedSingle = personalizedSingle.replace(/\{address\}/g, lead.address || '');
    personalizedSingle = personalizedSingle.replace(/\{service_requested\}/g, lead.service_requested || '');
    
    console.log('📝 After single brace replacement:');
    console.log(personalizedSingle);
    
    // Step 5: Check what variables are actually in the system instruction
    console.log('\n5️⃣ Analyzing variables in system instruction...');
    const doubleBraceMatches = systemInstruction.match(/\{\{[^}]+\}\}/g) || [];
    const singleBraceMatches = systemInstruction.match(/\{[^}]+\}/g) || [];
    
    console.log('🔍 Found double brace variables:', doubleBraceMatches);
    console.log('🔍 Found single brace variables:', singleBraceMatches);
    
    // Step 6: Show the mismatch
    console.log('\n6️⃣ Variable format analysis:');
    console.log('🎯 Lead has these fields:');
    console.log('  - first_name:', lead.first_name);
    console.log('  - last_name:', lead.last_name);
    console.log('  - email:', lead.email);
    console.log('  - address:', lead.address);
    console.log('  - service_requested:', lead.service_requested);
    
    console.log('\n🎯 System instruction expects:');
    if (doubleBraceMatches.length > 0) {
      console.log('  Double brace format:', doubleBraceMatches);
    }
    if (singleBraceMatches.length > 0) {
      console.log('  Single brace format:', singleBraceMatches);
    }
    
    // Step 7: Test the final result
    console.log('\n7️⃣ Final analysis:');
    if (personalizedDouble !== systemInstruction) {
      console.log('✅ Double brace replacement worked!');
    } else {
      console.log('❌ Double brace replacement had no effect');
    }
    
    if (personalizedSingle !== systemInstruction) {
      console.log('✅ Single brace replacement worked!');
    } else {
      console.log('❌ Single brace replacement had no effect');
    }
    
  } catch (error) {
    console.error('💥 Error during debug:', error);
  }
}

// Run the debug
debugPersonalization().catch(console.error);
