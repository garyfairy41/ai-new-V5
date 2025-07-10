import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugPersonalizationFlow() {
  console.log('🔧 Starting personalization flow debugging...\n');

  try {
    // ========================================
    // 1. ACTIVE CAMPAIGNS AND THEIR LEADS
    // ========================================
    console.log('🎯 1. ACTIVE CAMPAIGNS AND THEIR LEADS');
    console.log('='.repeat(50));
    
    const { data: activeCampaigns, error: activeCampaignsError } = await supabase
      .from('campaigns')
      .select(`
        id,
        name,
        status,
        system_instruction,
        created_at,
        updated_at,
        campaign_leads(
          id,
          phone_number,
          first_name,
          last_name,
          status,
          created_at,
          updated_at
        )
      `)
      .eq('status', 'active')
      .order('updated_at', { ascending: false });

    if (activeCampaignsError) {
      console.error('Error fetching active campaigns:', activeCampaignsError);
    } else {
      console.log(`Found ${activeCampaigns?.length || 0} active campaigns:`);
      
      activeCampaigns?.forEach(campaign => {
        console.log(`\n📋 Campaign: ${campaign.name} (ID: ${campaign.id})`);
        console.log(`   Status: ${campaign.status}`);
        console.log(`   Updated: ${campaign.updated_at}`);
        console.log(`   Total Leads: ${campaign.campaign_leads?.length || 0}`);
        
        if (campaign.system_instruction) {
          console.log(`   System Instruction: ${campaign.system_instruction.substring(0, 100)}...`);
          
          // Check for variable placeholders
          const variables = campaign.system_instruction.match(/\{\{[^}]+\}\}/g);
          if (variables) {
            console.log(`   Variables found: ${variables.join(', ')}`);
          }
        }
        
        if (campaign.campaign_leads && campaign.campaign_leads.length > 0) {
          console.log(`   Leads breakdown:`);
          const statusCounts = campaign.campaign_leads.reduce((acc, lead) => {
            acc[lead.status] = (acc[lead.status] || 0) + 1;
            return acc;
          }, {});
          console.log(`     ${JSON.stringify(statusCounts)}`);
          
          // Show first few leads
          console.log(`   First 3 leads:`);
          campaign.campaign_leads.slice(0, 3).forEach((lead, index) => {
            console.log(`     ${index + 1}. ${lead.first_name} ${lead.last_name} - ${lead.phone_number} (${lead.status})`);
          });
        }
      });
    }

    // ========================================
    // 2. RECENT CALL LOGS OR ANALYTICS
    // ========================================
    console.log('\n📞 2. RECENT CALL ACTIVITY');
    console.log('='.repeat(50));
    
    // Check if there's a calls table or analytics table
    const { data: callLogs, error: callLogsError } = await supabase
      .from('analytics')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (callLogsError) {
      console.log('No analytics table found or error:', callLogsError.message);
      
      // Try to check for calls table
      const { data: calls, error: callsError } = await supabase
        .from('calls')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
        
      if (callsError) {
        console.log('No calls table found either:', callsError.message);
      } else {
        console.log(`Found ${calls?.length || 0} recent calls:`);
        console.table(calls);
      }
    } else {
      console.log(`Found ${callLogs?.length || 0} recent analytics entries:`);
      if (callLogs && callLogs.length > 0) {
        // Look for phone numbers and names in analytics
        const analyticsWithContact = callLogs.filter(log => 
          log.phone_number || log.customer_name || log.lead_name
        );
        
        if (analyticsWithContact.length > 0) {
          console.log('\nAnalytics entries with contact info:');
          console.table(analyticsWithContact.map(log => ({
            id: log.id,
            phone_number: log.phone_number,
            customer_name: log.customer_name || log.lead_name,
            campaign_id: log.campaign_id,
            created_at: log.created_at
          })));
        }
      }
    }

    // ========================================
    // 3. LEAD SELECTION SIMULATION
    // ========================================
    console.log('\n🎲 3. LEAD SELECTION SIMULATION');
    console.log('='.repeat(50));
    
    // Simulate how leads might be selected for calls
    const { data: pendingLeads, error: pendingError } = await supabase
      .from('campaign_leads')
      .select(`
        id,
        campaign_id,
        phone_number,
        first_name,
        last_name,
        status,
        created_at,
        campaigns(
          id,
          name,
          status
        )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10);

    if (pendingError) {
      console.error('Error fetching pending leads:', pendingError);
    } else {
      console.log(`Found ${pendingLeads?.length || 0} pending leads that could be called:`);
      
      if (pendingLeads && pendingLeads.length > 0) {
        console.table(pendingLeads.map(lead => ({
          lead_id: lead.id,
          campaign_id: lead.campaign_id,
          campaign_name: lead.campaigns?.name || 'Unknown',
          phone_number: lead.phone_number,
          name: `${lead.first_name} ${lead.last_name}`,
          status: lead.status,
          created_at: lead.created_at
        })));
        
        // Test personalization for first lead
        const firstLead = pendingLeads[0];
        if (firstLead.campaigns) {
          console.log('\n🔧 Testing personalization for first pending lead:');
          
          const { data: campaign, error: campaignError } = await supabase
            .from('campaigns')
            .select('system_instruction')
            .eq('id', firstLead.campaign_id)
            .single();
            
          if (campaign && campaign.system_instruction) {
            let personalizedInstruction = campaign.system_instruction;
            
            // Replace common variables
            personalizedInstruction = personalizedInstruction
              .replace(/\{\{first_name\}\}/g, firstLead.first_name || '')
              .replace(/\{\{last_name\}\}/g, firstLead.last_name || '')
              .replace(/\{\{phone_number\}\}/g, firstLead.phone_number || '')
              .replace(/\{\{name\}\}/g, `${firstLead.first_name} ${firstLead.last_name}`);
            
            console.log(`Original instruction: ${campaign.system_instruction.substring(0, 200)}...`);
            console.log(`Personalized instruction: ${personalizedInstruction.substring(0, 200)}...`);
            
            // Check if personalization actually happened
            if (personalizedInstruction === campaign.system_instruction) {
              console.log('⚠️  No personalization variables were replaced!');
            } else {
              console.log('✅ Personalization successful!');
            }
          }
        }
      }
    }

    // ========================================
    // 4. CHECK FOR UNKNOWN/TEST DATA
    // ========================================
    console.log('\n🔍 4. CHECKING FOR UNKNOWN/TEST DATA');
    console.log('='.repeat(50));
    
    // Look for leads with suspicious names or phone numbers
    const { data: suspiciousLeads, error: suspiciousError } = await supabase
      .from('campaign_leads')
      .select('*')
      .or('first_name.ilike.%test%,first_name.ilike.%unknown%,last_name.ilike.%test%,last_name.ilike.%unknown%,phone_number.ilike.%000%,phone_number.ilike.%111%,phone_number.ilike.%123%');

    if (suspiciousError) {
      console.error('Error checking suspicious leads:', suspiciousError);
    } else {
      if (suspiciousLeads && suspiciousLeads.length > 0) {
        console.log(`Found ${suspiciousLeads.length} potentially suspicious/test leads:`);
        console.table(suspiciousLeads.map(lead => ({
          id: lead.id,
          campaign_id: lead.campaign_id,
          phone_number: lead.phone_number,
          name: `${lead.first_name} ${lead.last_name}`,
          status: lead.status
        })));
      } else {
        console.log('No obviously suspicious/test leads found.');
      }
    }

    // ========================================
    // 5. VARIABLE EXTRACTION TEST
    // ========================================
    console.log('\n🧪 5. VARIABLE EXTRACTION TEST');
    console.log('='.repeat(50));
    
    // Get a campaign with system instruction and test variable extraction
    const { data: campaignWithInstruction, error: instructionError } = await supabase
      .from('campaigns')
      .select('id, name, system_instruction')
      .not('system_instruction', 'is', null)
      .limit(1)
      .single();

    if (instructionError) {
      console.log('No campaigns with system instructions found.');
    } else if (campaignWithInstruction) {
      console.log(`Testing variable extraction from campaign: ${campaignWithInstruction.name}`);
      
      const instruction = campaignWithInstruction.system_instruction;
      const variables = instruction.match(/\{\{([^}]+)\}\}/g);
      
      if (variables) {
        console.log(`Variables found in system instruction:`);
        variables.forEach(variable => {
          console.log(`  - ${variable}`);
        });
        
        // Get a lead for this campaign to test replacement
        const { data: testLead, error: testLeadError } = await supabase
          .from('campaign_leads')
          .select('*')
          .eq('campaign_id', campaignWithInstruction.id)
          .limit(1)
          .single();
          
        if (testLead) {
          console.log(`\nTesting with lead: ${testLead.first_name} ${testLead.last_name} - ${testLead.phone_number}`);
          
          let testInstruction = instruction;
          variables.forEach(variable => {
            const cleanVar = variable.replace(/[{}]/g, '');
            let replacement = 'UNKNOWN';
            
            switch (cleanVar) {
              case 'first_name':
                replacement = testLead.first_name || 'UNKNOWN';
                break;
              case 'last_name':
                replacement = testLead.last_name || 'UNKNOWN';
                break;
              case 'phone_number':
                replacement = testLead.phone_number || 'UNKNOWN';
                break;
              case 'name':
                replacement = `${testLead.first_name || ''} ${testLead.last_name || ''}`.trim() || 'UNKNOWN';
                break;
              default:
                replacement = testLead[cleanVar] || 'UNKNOWN';
            }
            
            testInstruction = testInstruction.replace(new RegExp(variable.replace(/[{}]/g, '\\{\\}'), 'g'), replacement);
            console.log(`    ${variable} → ${replacement}`);
          });
          
          console.log(`\nFinal personalized instruction preview:`);
          console.log(testInstruction.substring(0, 300) + '...');
        }
      } else {
        console.log('No variables found in system instruction.');
      }
    }

  } catch (error) {
    console.error('❌ Error during personalization debugging:', error);
  }
}

// Run the debugging
debugPersonalizationFlow().then(() => {
  console.log('\n✅ Personalization debugging complete!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
