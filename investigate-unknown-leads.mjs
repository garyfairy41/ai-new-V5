import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with correct credentials
const supabaseUrl = 'https://lkfxqxamscrmsnsmrxwg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxrZnhxeGFtc2NybXNuc21yeHdnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDA0NDg4OSwiZXhwIjoyMDQ5NjIwODg5fQ.bCLwGAOlWJJrP4xxgvJbhFTzYSyQgG3mOnr9mAF68v0';

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
            console.log(`\n${isKnown ? '✅ KNOWN' : '❌ UNKNOWN'} Phone: ${phone}`);
            console.log(`   Count: ${phoneLeads.length} leads`);
            
            // Show campaign distribution
            const campaignGroups = {};
            phoneLeads.forEach(lead => {
                const campaignName = lead.campaigns?.name || 'Unknown Campaign';
                const campaignId = lead.campaign_id;
                const key = `${campaignName} (ID: ${campaignId})`;
                if (!campaignGroups[key]) {
                    campaignGroups[key] = [];
                }
                campaignGroups[key].push(lead);
            });

            console.log('   Campaigns:');
            for (const [campaign, campaignLeads] of Object.entries(campaignGroups)) {
                console.log(`     - ${campaign}: ${campaignLeads.length} leads`);
                
                // Show first and last creation dates
                const dates = campaignLeads.map(l => new Date(l.created_at)).sort();
                const firstDate = dates[0];
                const lastDate = dates[dates.length - 1];
                
                console.log(`       Created: ${firstDate.toISOString()} to ${lastDate.toISOString()}`);
                
                // Show some sample data
                const sampleLead = campaignLeads[0];
                console.log(`       Sample lead data:`);
                console.log(`         ID: ${sampleLead.id}`);
                console.log(`         Status: ${sampleLead.status}`);
                console.log(`         First Name: ${sampleLead.first_name || 'NULL'}`);
                console.log(`         Last Name: ${sampleLead.last_name || 'NULL'}`);
                console.log(`         Email: ${sampleLead.email || 'NULL'}`);
                console.log(`         Company: ${sampleLead.company || 'NULL'}`);
                console.log(`         Address: ${sampleLead.address || 'NULL'}`);
            }
        }

        // Summary
        console.log('\n=== SUMMARY ===');
        const unknownPhones = Object.keys(phoneGroups).filter(phone => phone !== knownGoodNumber);
        console.log(`Total phone numbers: ${Object.keys(phoneGroups).length}`);
        console.log(`Known good: 1 (${knownGoodNumber})`);
        console.log(`Unknown: ${unknownPhones.length}`);
        
        if (unknownPhones.length > 0) {
            console.log('\nUnknown phone numbers:');
            unknownPhones.forEach(phone => {
                console.log(`  - ${phone} (${phoneGroups[phone].length} leads)`);
            });
        }

        // Check for leads without campaigns
        const leadsWithoutCampaigns = leads.filter(lead => !lead.campaigns);
        if (leadsWithoutCampaigns.length > 0) {
            console.log(`\n⚠️  ${leadsWithoutCampaigns.length} leads have no associated campaign:`);
            leadsWithoutCampaigns.forEach(lead => {
                console.log(`   Lead ID: ${lead.id}, Campaign ID: ${lead.campaign_id}, Phone: ${lead.phone_number}`);
            });
        }

        // Check campaigns table for context
        console.log('\n=== CAMPAIGNS TABLE ===');
        const { data: campaigns, error: campaignsError } = await supabase
            .from('campaigns')
            .select('*')
            .order('created_at', { ascending: false });

        if (campaignsError) {
            console.error('Error fetching campaigns:', campaignsError);
        } else {
            campaigns.forEach(campaign => {
                const leadCount = leads.filter(l => l.campaign_id === campaign.id).length;
                console.log(`Campaign: ${campaign.name} (ID: ${campaign.id})`);
                console.log(`  Status: ${campaign.status}`);
                console.log(`  Created: ${campaign.created_at}`);
                console.log(`  User ID: ${campaign.user_id}`);
                console.log(`  Lead count: ${leadCount}`);
                console.log('');
            });
        }

    } catch (error) {
        console.error('Error during investigation:', error);
    }
}

// Run the investigation
investigateUnknownLeads().catch(console.error);
