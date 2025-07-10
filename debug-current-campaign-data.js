const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = 'https://nkzojvhzfqzazmkwzlmt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rem9qdmh6ZnF6YXpta3d6bG10Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUxNjQ0NjcsImV4cCI6MjA1MDc0MDQ2N30.jXa6ZIQ-w7h99E-oqGu_ySFN_rLzxNIwXhYN1bBLm1Q';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugCampaignData() {
    console.log('🔍 Debugging Campaign Data...\n');

    try {
        // 1. Get all campaigns
        console.log('📋 ALL CAMPAIGNS:');
        const { data: campaigns, error: campaignsError } = await supabase
            .from('campaigns')
            .select('*')
            .order('created_at', { ascending: false });

        if (campaignsError) {
            console.error('❌ Error fetching campaigns:', campaignsError);
        } else {
            campaigns.forEach(campaign => {
                console.log(`  - ${campaign.name} (ID: ${campaign.id}) - Status: ${campaign.status}`);
            });
        }
        console.log('');

        // 2. Get all campaign leads with campaign info
        console.log('👥 ALL CAMPAIGN LEADS:');
        const { data: campaignLeads, error: leadsError } = await supabase
            .from('campaign_leads')
            .select(`
                *,
                campaigns (
                    id,
                    name,
                    status
                )
            `)
            .order('created_at', { ascending: false });

        if (leadsError) {
            console.error('❌ Error fetching campaign leads:', leadsError);
        } else {
            console.log(`Found ${campaignLeads.length} total leads:\n`);
            
            campaignLeads.forEach(lead => {
                const campaignName = lead.campaigns ? lead.campaigns.name : 'Unknown Campaign';
                console.log(`  📞 ${lead.first_name} ${lead.last_name} (${lead.phone_number})`);
                console.log(`     Campaign: ${campaignName}`);
                console.log(`     Status: ${lead.status}, Attempts: ${lead.call_attempts}`);
                console.log(`     Lead ID: ${lead.id}`);
                console.log(`     Campaign ID: ${lead.campaign_id}`);
                console.log('');
            });
        }

        // 3. Get lead counts by campaign
        console.log('📊 LEAD COUNTS BY CAMPAIGN:');
        const { data: leadCounts, error: countsError } = await supabase
            .rpc('get_campaign_lead_counts');

        if (countsError) {
            console.log('❌ Error with RPC function, using manual count...');
            
            // Manual count using regular queries
            for (const campaign of campaigns) {
                const { data: leads, error } = await supabase
                    .from('campaign_leads')
                    .select('status')
                    .eq('campaign_id', campaign.id);

                if (!error) {
                    const pending = leads.filter(l => l.status === 'pending').length;
                    const completed = leads.filter(l => l.status === 'completed').length;
                    const failed = leads.filter(l => l.status === 'failed').length;
                    
                    console.log(`  ${campaign.name}: ${leads.length} total (${pending} pending, ${completed} completed, ${failed} failed)`);
                }
            }
        } else {
            leadCounts.forEach(count => {
                console.log(`  ${count.campaign_name}: ${count.total_leads} total (${count.pending_leads} pending, ${count.completed_leads} completed, ${count.failed_leads} failed)`);
            });
        }

        // 4. Check for any orphaned leads (leads without a valid campaign)
        console.log('\n🔍 CHECKING FOR ORPHANED LEADS:');
        const { data: orphanedLeads, error: orphanError } = await supabase
            .from('campaign_leads')
            .select('*')
            .is('campaigns.id', null);

        if (orphanError) {
            console.log('❌ Error checking orphaned leads:', orphanError);
        } else if (orphanedLeads && orphanedLeads.length > 0) {
            console.log(`⚠️  Found ${orphanedLeads.length} orphaned leads`);
            orphanedLeads.forEach(lead => {
                console.log(`  - ${lead.first_name} ${lead.last_name} (${lead.phone_number}) - Campaign ID: ${lead.campaign_id}`);
            });
        } else {
            console.log('✅ No orphaned leads found');
        }

        // 5. Show recent call logs
        console.log('\n📞 RECENT CALL LOGS:');
        const { data: callLogs, error: callLogsError } = await supabase
            .from('call_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);

        if (callLogsError) {
            console.log('❌ Error fetching call logs:', callLogsError);
        } else {
            console.log(`Found ${callLogs.length} recent call logs:\n`);
            callLogs.forEach(log => {
                console.log(`  📞 ${log.phone_number} - ${log.call_status}`);
                console.log(`     Campaign: ${log.campaign_id}`);
                console.log(`     Duration: ${log.duration || 'N/A'}s`);
                console.log(`     Created: ${log.created_at}`);
                console.log('');
            });
        }

    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }
}

// Run the debug
debugCampaignData();
