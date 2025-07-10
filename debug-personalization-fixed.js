#!/usr/bin/env node

/**
 * Debug script to trace personalization variables from database to Gemini
 * This will help identify where the variable mismatch is occurring
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

console.log('🔍 Starting personalization debug...\n');

// Try to find Supabase config from various sources
let supabaseUrl, supabaseKey;

try {
  // Try to read from .env file
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
    const keyMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/);
    if (urlMatch) supabaseUrl = urlMatch[1].trim();
    if (keyMatch) supabaseKey = keyMatch[1].trim();
  }

  // Try to read from packages/ui/.env
  const uiEnvPath = path.join(process.cwd(), 'packages', 'ui', '.env');
  if (fs.existsSync(uiEnvPath)) {
    const envContent = fs.readFileSync(uiEnvPath, 'utf8');
    const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.+)/);
    const keyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY=(.+)/);
    if (urlMatch) supabaseUrl = urlMatch[1].trim();
    if (keyMatch) supabaseKey = keyMatch[1].trim();
  }

  // Try from environment variables
  if (!supabaseUrl) supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  if (!supabaseKey) supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  console.log('📡 Supabase URL found:', supabaseUrl ? '✅' : '❌');
  console.log('🔑 Supabase Key found:', supabaseKey ? '✅' : '❌');

  if (!supabaseUrl || !supabaseKey) {
    console.log('\n❌ Could not find Supabase credentials.');
    console.log('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables');
    console.log('or create a .env file with these values.\n');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('\n1️⃣ Fetching campaigns...');
  const { data: campaigns, error: campaignError } = await supabase
    .from('campaigns')
    .select('id, name, agent_id, custom_system_instruction')
    .limit(5);

  if (campaignError) {
    console.error('❌ Error fetching campaigns:', campaignError);
    process.exit(1);
  }

  console.log(`📋 Found ${campaigns?.length || 0} campaigns`);
  campaigns?.forEach(campaign => {
    console.log(`  - ${campaign.name} (ID: ${campaign.id})`);
    if (campaign.custom_system_instruction) {
      console.log(`    Custom instruction preview: ${campaign.custom_system_instruction.substring(0, 100)}...`);
    }
  });

  if (!campaigns || campaigns.length === 0) {
    console.log('❌ No campaigns found');
    process.exit(1);
  }

  // Get the first campaign for detailed analysis
  const campaign = campaigns[0];
  console.log(`\n2️⃣ Analyzing campaign: ${campaign.name}`);

  // Get agent info
  console.log('\n3️⃣ Fetching agent information...');
  const { data: agent, error: agentError } = await supabase
    .from('ai_agents')
    .select('id, name, system_instruction, system_prompt')
    .eq('id', campaign.agent_id)
    .single();

  if (agentError) {
    console.error('❌ Error fetching agent:', agentError);
  } else {
    console.log(`🤖 Agent: ${agent.name}`);
    console.log('📝 System instruction preview:', agent.system_instruction?.substring(0, 150) + '...');
    if (agent.system_prompt) {
      console.log('📝 System prompt preview:', agent.system_prompt.substring(0, 150) + '...');
    }

    // Check for variable patterns
    const systemText = agent.system_instruction || '';
    const doubleVars = systemText.match(/\{\{[^}]+\}\}/g) || [];
    const singleVars = systemText.match(/\{[^{}]+\}/g) || [];
    
    console.log('\n🔍 Variable patterns found in agent system instruction:');
    console.log('  Double braces ({{var}}):', doubleVars);
    console.log('  Single braces ({var}):', singleVars);
  }

  // Get campaign leads
  console.log('\n4️⃣ Fetching campaign leads...');
  const { data: leads, error: leadsError } = await supabase
    .from('campaign_leads')
    .select('id, phone_number, first_name, last_name, email, address, service_requested, company, status')
    .eq('campaign_id', campaign.id)
    .limit(3);

  if (leadsError) {
    console.error('❌ Error fetching leads:', leadsError);
  } else {
    console.log(`👥 Found ${leads?.length || 0} leads for this campaign`);
    leads?.forEach((lead, index) => {
      console.log(`\n  Lead ${index + 1}:`);
      console.log(`    Name: ${lead.first_name} ${lead.last_name}`);
      console.log(`    Phone: ${lead.phone_number}`);
      console.log(`    Email: ${lead.email}`);
      console.log(`    Address: ${lead.address}`);
      console.log(`    Service: ${lead.service_requested}`);
      console.log(`    Company: ${lead.company}`);
      console.log(`    Status: ${lead.status}`);
    });

    if (leads && leads.length > 0) {
      const lead = leads[0];
      console.log('\n5️⃣ Testing variable replacement...');
      
      const testInstruction = "Hello {{firstName}} {{lastName}} from {{company}}. We understand you're interested in {{serviceRequested}} at {{address}}.";
      console.log('📝 Test instruction:', testInstruction);
      
      // Test double brace replacement
      let replaced = testInstruction
        .replace(/\{\{firstName\}\}/g, lead.first_name || '')
        .replace(/\{\{lastName\}\}/g, lead.last_name || '')
        .replace(/\{\{company\}\}/g, lead.company || '')
        .replace(/\{\{serviceRequested\}\}/g, lead.service_requested || '')
        .replace(/\{\{address\}\}/g, lead.address || '');
      
      console.log('✅ After double-brace replacement:', replaced);
      
      // Test single brace replacement  
      const testInstruction2 = "Hello {first_name} {last_name} from {company}. We understand you're interested in {service_requested} at {address}.";
      console.log('\n📝 Test instruction (single braces):', testInstruction2);
      
      let replaced2 = testInstruction2
        .replace(/\{first_name\}/g, lead.first_name || '')
        .replace(/\{last_name\}/g, lead.last_name || '')
        .replace(/\{company\}/g, lead.company || '')
        .replace(/\{service_requested\}/g, lead.service_requested || '')
        .replace(/\{address\}/g, lead.address || '');
      
      console.log('✅ After single-brace replacement:', replaced2);
    }
  }

  console.log('\n6️⃣ Summary & Recommendations:');
  console.log('To fix the personalization issue:');
  console.log('1. Check what variable format your system instructions use ({{var}} vs {var})');
  console.log('2. Ensure the backend personalization service matches this format');
  console.log('3. Verify lead data is properly populated in the database');
  console.log('4. Test the replacement logic in the actual call flow');

} catch (error) {
  console.error('💥 Debug script error:', error);
}
