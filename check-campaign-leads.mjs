// Check current campaign leads state - ESM compatible
// Run with: node check-campaign-leads.mjs

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Load environment variables
let supabaseUrl, supabaseKey;
try {
    const env = fs.readFileSync('.env', 'utf8');
    const lines = env.split('\n');
    for (const line of lines) {
        if (line.startsWith('SUPABASE_URL=')) {
            supabaseUrl = line.split('=')[1];
        }
        if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
            supabaseKey = line.split('=')[1];
        }
    }
} catch (error) {
    console.error('Error reading .env file:', error.message);
    process.exit(1);
}

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env file');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCampaignLeads() {
    console.log('🔍 Checking Campaign Leads State...\n');

    try {
        // 1. Get all campaigns with lead counts
        console.log('📊 CAMPAIGNS OVERVIEW:');
        console.log('=' .repeat(80));
        
        const { data: campaigns, error: campaignsError } = await supabase
            .from('campaigns')
            .select(`
                id,
                name,
                status,
                created_at,
                updated_at,
                campaign_leads (
                    id,
                    status,
                    phone_number,
                    first_name,
                    last_name
                )
            `);

        if (campaignsError) {
            console.error('Error fetching campaigns:', campaignsError);
            return;
        }

        campaigns.forEach(campaign => {
            const leads = campaign.campaign_leads || [];
            const pendingCount = leads.filter(l => l.status === 'pending').length;
            const completedCount = leads.filter(l => l.status === 'completed').length;
            const failedCount = leads.filter(l => l.status === 'failed').length;
            
            console.log(`\n📋 Campaign: ${campaign.name} (ID: ${campaign.id})`);
            console.log(`   Status: ${campaign.status}`);
            console.log(`   Total Leads: ${leads.length}`);
            console.log(`   Pending: ${pendingCount}, Completed: ${completedCount}, Failed: ${failedCount}`);
            console.log(`   Created: ${new Date(campaign.created_at).toLocaleString()}`);
            
            // Show sample of leads
            if (leads.length > 0) {
                console.log(`   Sample leads:`);
                leads.slice(0, 3).forEach((lead, idx) => {
                    console.log(`     ${idx + 1}. ${lead.first_name || 'NO_NAME'} ${lead.last_name || ''} - ${lead.phone_number || 'NO_PHONE'} (${lead.status})`);
                });
                if (leads.length > 3) {
                    console.log(`     ... and ${leads.length - 3} more`);
                }
            }
        });

        // 2. Check for duplicate phone numbers
        console.log('\n\n🔍 DUPLICATE PHONE NUMBERS:');
        console.log('=' .repeat(80));
        
        const { data: allLeads, error: leadsError } = await supabase
            .from('campaign_leads')
            .select('id, phone_number, first_name, last_name, campaign_id, status');

        if (leadsError) {
            console.error('Error fetching leads:', leadsError);
            return;
        }

        // Group by phone number
        const phoneGroups = {};
        allLeads.forEach(lead => {
            const phone = lead.phone_number || 'NO_PHONE';
            if (!phoneGroups[phone]) {
                phoneGroups[phone] = [];
            }
            phoneGroups[phone].push(lead);
        });

        // Show duplicates
        const duplicates = Object.entries(phoneGroups).filter(([phone, leads]) => leads.length > 1);
        if (duplicates.length > 0) {
            duplicates.forEach(([phone, leads]) => {
                console.log(`\n📞 Phone: ${phone} (${leads.length} occurrences)`);
                leads.forEach((lead, idx) => {
                    console.log(`   ${idx + 1}. ${lead.first_name || 'NO_NAME'} ${lead.last_name || ''} - Campaign ${lead.campaign_id} (${lead.status})`);
                });
            });
        } else {
            console.log('✅ No duplicate phone numbers found');
        }

        // 3. Check for missing data
        console.log('\n\n⚠️  LEADS WITH MISSING DATA:');
        console.log('=' .repeat(80));
        
        const problematicLeads = allLeads.filter(lead => 
            !lead.first_name || !lead.last_name || !lead.phone_number || 
            lead.first_name.trim() === '' || lead.last_name.trim() === '' || lead.phone_number.trim() === ''
        );

        if (problematicLeads.length > 0) {
            problematicLeads.forEach((lead, idx) => {
                const issues = [];
                if (!lead.first_name || lead.first_name.trim() === '') issues.push('NO_FIRST_NAME');
                if (!lead.last_name || lead.last_name.trim() === '') issues.push('NO_LAST_NAME');
                if (!lead.phone_number || lead.phone_number.trim() === '') issues.push('NO_PHONE');
                
                console.log(`   ${idx + 1}. Lead ID ${lead.id} - Campaign ${lead.campaign_id}`);
                console.log(`       Name: "${lead.first_name || ''}" "${lead.last_name || ''}"`)
                console.log(`       Phone: "${lead.phone_number || ''}"`)
                console.log(`       Issues: ${issues.join(', ')}`);
                console.log(`       Status: ${lead.status}`);
                console.log('');
            });
        } else {
            console.log('✅ All leads have required data');
        }

        // 4. Check recent call logs
        console.log('\n\n📞 RECENT CALL LOGS:');
        console.log('=' .repeat(80));
        
        const { data: callLogs, error: callLogsError } = await supabase
            .from('call_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);

        if (callLogsError) {
            console.log('⚠️  Could not fetch call logs:', callLogsError.message);
        } else if (callLogs && callLogs.length > 0) {
            callLogs.forEach((log, idx) => {
                console.log(`\n   ${idx + 1}. Call ID: ${log.call_id || 'N/A'}`);
                console.log(`      Campaign: ${log.campaign_id || 'N/A'}`);
                console.log(`      Phone: ${log.phone_number || 'N/A'}`);
                console.log(`      Agent: ${log.agent_name || 'N/A'}`);
                console.log(`      Status: ${log.call_status || 'N/A'}`);
                console.log(`      Duration: ${log.call_duration || 'N/A'}s`);
                console.log(`      Time: ${log.created_at ? new Date(log.created_at).toLocaleString() : 'N/A'}`);
                if (log.metadata) {
                    const meta = typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata;
                    if (meta.firstName || meta.lastName || meta.company) {
                        console.log(`      Metadata: firstName="${meta.firstName || ''}", lastName="${meta.lastName || ''}", company="${meta.company || ''}"`);
                    }
                }
            });
        } else {
            console.log('📭 No call logs found');
        }

        // 5. Summary
        console.log('\n\n📈 SUMMARY:');
        console.log('=' .repeat(80));
        console.log(`Total Campaigns: ${campaigns.length}`);
        console.log(`Total Leads: ${allLeads.length}`);
        console.log(`Duplicate Phone Numbers: ${duplicates.length}`);
        console.log(`Leads with Missing Data: ${problematicLeads.length}`);
        console.log(`Recent Call Logs: ${callLogs ? callLogs.length : 0}`);

    } catch (error) {
        console.error('Error checking campaign leads:', error);
    }
}

// Run the check
checkCampaignLeads();
