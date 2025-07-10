const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://adkmhjlixpzfrkzcscmy.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFka21oamxpeHB6ZnJremNzY215Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ3NDAwNzksImV4cCI6MjA1MDMxNjA3OX0.SBjYPXv6FVw_hGNGb5Lxdx9dJDq1ZmUo2LUZHHmQ8qQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function investigateUnknownLeads() {
    console.log('=== INVESTIGATING UNKNOWN LEADS ===\n');

    try {
        // Get detailed campaign leads with campaign info
        const { data: leads, error: leadsError } = await supabase
            .from('campaign_leads')
            .select(`
                *,
                campaigns (
                    id,
                    name,
                    status,
                    created_at,
                    user_id
                )
            `)
            .order('created_at', { ascending: false });

        if (leadsError) {
            console.error('Error fetching leads:', leadsError);
            return;
        }

        console.log(`Found ${leads.length} total leads:\n`);

        // Known good phone number
        const knownGoodNumber = '15133007212';
        
        // Group leads by phone number
        const phoneGroups = {};
        leads.forEach(lead => {
            const phone = lead.phone_number;
            if (!phoneGroups[phone]) {
                phoneGroups[phone] = [];
            }
            phoneGroups[phone].push(lead);
        });

        // Analyze each phone number group
        for (const [phone, phoneLeads] of Object.entries(phoneGroups)) {
            const isKnown = phone === knownGoodNumber;
            console.log(`📞 PHONE: ${phone} ${isKnown ? '✅ (KNOWN GOOD)' : '❓ (UNKNOWN)'}`);
            console.log(`   Count: ${phoneLeads.length} leads`);
            
            // Show details for each lead with this phone number
            phoneLeads.forEach((lead, idx) => {
                console.log(`   Lead ${idx + 1}:`);
                console.log(`     ID: ${lead.id}`);
                console.log(`     Name: ${lead.first_name} ${lead.last_name}`);
                console.log(`     Email: ${lead.email}`);
                console.log(`     Company: ${lead.company}`);
                console.log(`     Status: ${lead.status}`);
                console.log(`     Attempts: ${lead.call_attempts}`);
                console.log(`     Created: ${lead.created_at}`);
                console.log(`     Campaign: ${lead.campaigns?.name || 'Unknown'} (${lead.campaign_id})`);
                console.log(`     Campaign Status: ${lead.campaigns?.status || 'Unknown'}`);
                console.log(`     Campaign Created: ${lead.campaigns?.created_at || 'Unknown'}`);
                console.log('');
            });
            console.log('---\n');
        }

        // Check for leads that might have been imported or created by scripts
        console.log('\n=== ANALYZING LEAD SOURCES ===\n');
        
        // Look for patterns in creation dates
        const creationDates = {};
        leads.forEach(lead => {
            const date = lead.created_at.split('T')[0]; // Get just the date part
            if (!creationDates[date]) {
                creationDates[date] = [];
            }
            creationDates[date].push(lead);
        });

        console.log('Leads by creation date:');
        for (const [date, dateLeads] of Object.entries(creationDates)) {
            console.log(`  ${date}: ${dateLeads.length} leads`);
            dateLeads.forEach(lead => {
                console.log(`    - ${lead.phone_number} (${lead.first_name} ${lead.last_name}) in campaign: ${lead.campaigns?.name || 'Unknown'}`);
            });
        }

        // Check campaigns table for more context
        console.log('\n=== CAMPAIGN DETAILS ===\n');
        const { data: campaigns, error: campaignsError } = await supabase
            .from('campaigns')
            .select('*')
            .order('created_at', { ascending: false });

        if (campaignsError) {
            console.error('Error fetching campaigns:', campaignsError);
            return;
        }

        campaigns.forEach(campaign => {
            const campaignLeads = leads.filter(lead => lead.campaign_id === campaign.id);
            console.log(`Campaign: ${campaign.name}`);
            console.log(`  ID: ${campaign.id}`);
            console.log(`  Status: ${campaign.status}`);
            console.log(`  Created: ${campaign.created_at}`);
            console.log(`  Leads: ${campaignLeads.length}`);
            campaignLeads.forEach(lead => {
                console.log(`    - ${lead.phone_number} (${lead.first_name} ${lead.last_name})`);
            });
            console.log('');
        });

    } catch (error) {
        console.error('Error:', error);
    }
}

investigateUnknownLeads();
