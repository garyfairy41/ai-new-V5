#!/usr/bin/env node

// Debug script to investigate campaign leads and personalization issues
// Run with: node debug-leads-investigation.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log('🔍 Starting Campaign Leads Investigation\n');

  try {
    // 1. Check all campaigns
    console.log('1️⃣ Listing all campaigns:');
    const { data: campaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false });

    if (campaignsError) {
      console.error('Error fetching campaigns:', campaignsError);
      return;
    }

    console.table(campaigns.map(c => ({
      id: c.id,
      name: c.name,
      status: c.status,
      created: new Date(c.created_at).toLocaleString(),
      leads_count: c.leads_count || 'N/A'
    })));

    // 2. Check campaign leads for each campaign
    console.log('\n2️⃣ Checking leads for each campaign:');
    for (const campaign of campaigns) {
      const { data: leads, error: leadsError } = await supabase
        .from('campaign_leads')
        .select('*')
        .eq('campaign_id', campaign.id);

      if (leadsError) {
        console.error(`Error fetching leads for campaign ${campaign.id}:`, leadsError);
        continue;
      }

      console.log(`\n📋 Campaign: ${campaign.name} (ID: ${campaign.id})`);
      console.log(`   Total leads: ${leads.length}`);
      
      if (leads.length > 0) {
        const statusCounts = leads.reduce((acc, lead) => {
          acc[lead.status || 'null'] = (acc[lead.status || 'null'] || 0) + 1;
          return acc;
        }, {});
        console.log(`   Status breakdown:`, statusCounts);

        // Show first few leads as samples
        console.log(`   Sample leads:`);
        leads.slice(0, 3).forEach((lead, idx) => {
          console.log(`     ${idx + 1}. Phone: ${lead.phone_number}, Name: ${lead.first_name || 'N/A'} ${lead.last_name || 'N/A'}, Status: ${lead.status}`);
        });
      }
    }

    // 3. Check for duplicate phone numbers
    console.log('\n3️⃣ Checking for duplicate phone numbers:');
    const { data: duplicates, error: dupError } = await supabase
      .rpc('find_duplicate_phone_numbers');

    if (dupError) {
      console.log('Custom function not available, checking manually...');
      
      const { data: allLeads, error: allLeadsError } = await supabase
        .from('campaign_leads')
        .select('phone_number, campaign_id, first_name, last_name');

      if (!allLeadsError) {
        const phoneMap = {};
        allLeads.forEach(lead => {
          if (!phoneMap[lead.phone_number]) {
            phoneMap[lead.phone_number] = [];
          }
          phoneMap[lead.phone_number].push(lead);
        });

        const duplicatePhones = Object.entries(phoneMap).filter(([phone, leads]) => leads.length > 1);
        
        if (duplicatePhones.length > 0) {
          console.log(`Found ${duplicatePhones.length} duplicate phone numbers:`);
          duplicatePhones.forEach(([phone, leads]) => {
            console.log(`   📞 ${phone}: appears in ${leads.length} records`);
            leads.forEach(lead => {
              console.log(`     - Campaign ${lead.campaign_id}: ${lead.first_name || 'N/A'} ${lead.last_name || 'N/A'}`);
            });
          });
        } else {
          console.log('✅ No duplicate phone numbers found');
        }
      }
    } else {
      console.table(duplicates);
    }

    // 4. Check recent call logs
    console.log('\n4️⃣ Checking recent call logs:');
    const { data: callLogs, error: callLogsError } = await supabase
      .from('calls')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (!callLogsError && callLogs.length > 0) {
      console.log('Recent calls:');
      console.table(callLogs.map(call => ({
        id: call.id,
        campaign_id: call.campaign_id,
        phone: call.to_phone_number,
        status: call.status,
        duration: call.duration,
        created: new Date(call.created_at).toLocaleString()
      })));
    } else {
      console.log('No recent calls found or error:', callLogsError);
    }

    // 5. Check for test/unknown data patterns
    console.log('\n5️⃣ Looking for potential test/unknown data:');
    const { data: suspiciousLeads, error: suspiciousError } = await supabase
      .from('campaign_leads')
      .select('*')
      .or('first_name.ilike.%test%,last_name.ilike.%test%,phone_number.ilike.%555%,first_name.ilike.%unknown%,last_name.ilike.%unknown%');

    if (!suspiciousError && suspiciousLeads.length > 0) {
      console.log(`Found ${suspiciousLeads.length} potentially suspicious leads:`);
      console.table(suspiciousLeads.map(lead => ({
        campaign_id: lead.campaign_id,
        phone: lead.phone_number,
        name: `${lead.first_name || 'N/A'} ${lead.last_name || 'N/A'}`,
        status: lead.status
      })));
    } else {
      console.log('✅ No obviously suspicious test data found');
    }

    // 6. Check campaign system instructions for variable usage
    console.log('\n6️⃣ Checking campaign system instructions for personalization variables:');
    campaigns.forEach(campaign => {
      if (campaign.system_instructions) {
        const variables = campaign.system_instructions.match(/\{\{[^}]+\}\}/g) || [];
        if (variables.length > 0) {
          console.log(`Campaign "${campaign.name}": Uses variables: ${variables.join(', ')}`);
        } else {
          console.log(`Campaign "${campaign.name}": No personalization variables found`);
        }
      }
    });

  } catch (error) {
    console.error('Error during investigation:', error);
  }
}

// Helper function to create the duplicate phone numbers function if it doesn't exist
async function createDuplicatePhoneFunction() {
  const functionSQL = `
    CREATE OR REPLACE FUNCTION find_duplicate_phone_numbers()
    RETURNS TABLE(phone_number text, count bigint, campaign_ids text[])
    LANGUAGE sql
    AS $$
      SELECT 
        cl.phone_number,
        COUNT(*) as count,
        ARRAY_AGG(DISTINCT cl.campaign_id::text) as campaign_ids
      FROM campaign_leads cl
      GROUP BY cl.phone_number
      HAVING COUNT(*) > 1
      ORDER BY count DESC;
    $$;
  `;

  const { error } = await supabase.rpc('exec_sql', { sql: functionSQL });
  if (error) {
    console.log('Note: Could not create helper function:', error.message);
  }
}

// Run the investigation
main().catch(console.error);
