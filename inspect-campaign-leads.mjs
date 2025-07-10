import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function inspectCampaignLeads() {
  console.log('🔍 Starting comprehensive campaign leads inspection...\n');

  try {
    // ========================================
    // 1. CAMPAIGNS OVERVIEW WITH LEAD COUNTS
    // ========================================
    console.log('📊 1. CAMPAIGNS OVERVIEW WITH LEAD COUNTS');
    console.log('='.repeat(50));
    
    const { data: campaignsOverview, error: campaignsError } = await supabase
      .from('campaigns')
      .select(`
        id,
        name,
        status,
        created_at,
        updated_at,
        campaign_leads(
          id,
          status
        )
      `)
      .order('created_at', { ascending: false });

    if (campaignsError) {
      console.error('Error fetching campaigns overview:', campaignsError);
    } else {
      const processedCampaigns = campaignsOverview.map(campaign => ({
        campaign_id: campaign.id,
        campaign_name: campaign.name,
        campaign_status: campaign.status,
        campaign_created: campaign.created_at,
        campaign_updated: campaign.updated_at,
        total_leads: campaign.campaign_leads?.length || 0,
        pending_leads: campaign.campaign_leads?.filter(l => l.status === 'pending').length || 0,
        completed_leads: campaign.campaign_leads?.filter(l => l.status === 'completed').length || 0,
        failed_leads: campaign.campaign_leads?.filter(l => l.status === 'failed').length || 0
      }));
      console.table(processedCampaigns);
    }

    // ========================================
    // 2. ALL LEADS WITH CAMPAIGN DETAILS
    // ========================================
    console.log('\n👥 2. ALL LEADS WITH CAMPAIGN DETAILS');
    console.log('='.repeat(50));
    
    const { data: allLeads, error: leadsError } = await supabase
      .from('campaign_leads')
      .select(`
        id,
        phone_number,
        first_name,
        last_name,
        status,
        created_at,
        updated_at,
        campaigns(
          id,
          name,
          status
        )
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (leadsError) {
      console.error('Error fetching leads:', leadsError);
    } else {
      const processedLeads = allLeads.map(lead => ({
        lead_id: lead.id,
        campaign_id: lead.campaigns?.id || 'N/A',
        campaign_name: lead.campaigns?.name || 'N/A',
        campaign_status: lead.campaigns?.status || 'N/A',
        phone_number: lead.phone_number,
        first_name: lead.first_name,
        last_name: lead.last_name,
        lead_status: lead.status,
        created_at: lead.created_at,
        updated_at: lead.updated_at
      }));
      console.table(processedLeads);
    }

    // ========================================
    // 3. PHONE NUMBER PATTERNS ANALYSIS
    // ========================================
    console.log('\n📞 3. PHONE NUMBER PATTERNS ANALYSIS');
    console.log('='.repeat(50));
    
    const { data: phonePatterns, error: phonePatternsError } = await supabase
      .from('campaign_leads')
      .select('phone_number')
      .not('phone_number', 'is', null);

    if (phonePatternsError) {
      console.error('Error fetching phone patterns:', phonePatternsError);
    } else {
      const patterns = {};
      phonePatterns.forEach(lead => {
        const phone = lead.phone_number;
        if (phone) {
          // Extract area code (first 3 digits)
          const areaCode = phone.replace(/\D/g, '').substring(0, 3);
          patterns[areaCode] = (patterns[areaCode] || 0) + 1;
        }
      });
      
      console.log('Phone number area code distribution:');
      console.table(Object.entries(patterns)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([areaCode, count]) => ({ area_code: areaCode, count }))
      );
    }

    // ========================================
    // 4. DUPLICATE PHONE NUMBERS
    // ========================================
    console.log('\n🔄 4. DUPLICATE PHONE NUMBERS');
    console.log('='.repeat(50));
    
    const { data: duplicates, error: duplicatesError } = await supabase
      .from('campaign_leads')
      .select('phone_number, id, first_name, last_name')
      .not('phone_number', 'is', null);

    if (duplicatesError) {
      console.error('Error checking duplicates:', duplicatesError);
    } else {
      const phoneGroups = {};
      duplicates.forEach(lead => {
        const phone = lead.phone_number;
        if (!phoneGroups[phone]) {
          phoneGroups[phone] = [];
        }
        phoneGroups[phone].push(lead);
      });

      const duplicatePhones = Object.entries(phoneGroups)
        .filter(([_, leads]) => leads.length > 1)
        .slice(0, 10);

      if (duplicatePhones.length > 0) {
        console.log('Found duplicate phone numbers:');
        duplicatePhones.forEach(([phone, leads]) => {
          console.log(`\n📞 ${phone} (${leads.length} occurrences):`);
          leads.forEach(lead => {
            console.log(`  - ID: ${lead.id}, Name: ${lead.first_name} ${lead.last_name}`);
          });
        });
      } else {
        console.log('No duplicate phone numbers found.');
      }
    }

    // ========================================
    // 5. SEARCH FOR SPECIFIC PHONE NUMBER
    // ========================================
    console.log('\n🔍 5. SEARCHING FOR SPECIFIC PHONE NUMBER (513.300.7212)');
    console.log('='.repeat(50));
    
    const targetPhone = '513.300.7212';
    const { data: targetLead, error: targetError } = await supabase
      .from('campaign_leads')
      .select(`
        *,
        campaigns(*)
      `)
      .or(`phone_number.eq.${targetPhone},phone_number.eq.5133007212,phone_number.eq.(513) 300-7212`);

    if (targetError) {
      console.error('Error searching for target phone:', targetError);
    } else {
      if (targetLead && targetLead.length > 0) {
        console.log(`Found ${targetLead.length} lead(s) with phone ${targetPhone}:`);
        console.table(targetLead);
      } else {
        console.log(`No leads found with phone number ${targetPhone}`);
      }
    }

    // ========================================
    // 6. RECENT CAMPAIGN ACTIVITY
    // ========================================
    console.log('\n⏰ 6. RECENT CAMPAIGN ACTIVITY');
    console.log('='.repeat(50));
    
    const { data: recentActivity, error: activityError } = await supabase
      .from('campaigns')
      .select(`
        id,
        name,
        status,
        updated_at,
        campaign_leads(
          id,
          status,
          updated_at
        )
      `)
      .gte('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('updated_at', { ascending: false });

    if (activityError) {
      console.error('Error fetching recent activity:', activityError);
    } else {
      console.log('Campaigns updated in the last 24 hours:');
      recentActivity.forEach(campaign => {
        console.log(`\n📋 ${campaign.name} (ID: ${campaign.id})`);
        console.log(`   Status: ${campaign.status}, Updated: ${campaign.updated_at}`);
        console.log(`   Leads: ${campaign.campaign_leads?.length || 0} total`);
        
        if (campaign.campaign_leads && campaign.campaign_leads.length > 0) {
          const recentLeads = campaign.campaign_leads
            .filter(lead => new Date(lead.updated_at) > new Date(Date.now() - 24 * 60 * 60 * 1000))
            .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
          
          if (recentLeads.length > 0) {
            console.log(`   Recently updated leads (${recentLeads.length}):`);
            recentLeads.slice(0, 5).forEach(lead => {
              console.log(`     - Lead ${lead.id}: ${lead.status} (${lead.updated_at})`);
            });
          }
        }
      });
    }

    // ========================================
    // 7. ORPHANED LEADS (NO CAMPAIGN)
    // ========================================
    console.log('\n🔍 7. ORPHANED LEADS (NO CAMPAIGN)');
    console.log('='.repeat(50));
    
    const { data: orphanedLeads, error: orphanedError } = await supabase
      .from('campaign_leads')
      .select('*')
      .is('campaign_id', null);

    if (orphanedError) {
      console.error('Error checking orphaned leads:', orphanedError);
    } else {
      if (orphanedLeads && orphanedLeads.length > 0) {
        console.log(`Found ${orphanedLeads.length} orphaned leads:`);
        console.table(orphanedLeads.slice(0, 10));
      } else {
        console.log('No orphaned leads found.');
      }
    }

    // ========================================
    // 8. SUMMARY STATISTICS
    // ========================================
    console.log('\n📈 8. SUMMARY STATISTICS');
    console.log('='.repeat(50));
    
    const { data: totalCampaigns } = await supabase
      .from('campaigns')
      .select('id', { count: 'exact' });
    
    const { data: totalLeads } = await supabase
      .from('campaign_leads')
      .select('id', { count: 'exact' });
    
    const { data: activeCampaigns } = await supabase
      .from('campaigns')
      .select('id', { count: 'exact' })
      .eq('status', 'active');
    
    const { data: pendingLeads } = await supabase
      .from('campaign_leads')
      .select('id', { count: 'exact' })
      .eq('status', 'pending');

    console.log('📊 System Overview:');
    console.table([{
      total_campaigns: totalCampaigns?.length || 0,
      active_campaigns: activeCampaigns?.length || 0,
      total_leads: totalLeads?.length || 0,
      pending_leads: pendingLeads?.length || 0
    }]);

  } catch (error) {
    console.error('❌ Error during inspection:', error);
  }
}

// Run the inspection
inspectCampaignLeads().then(() => {
  console.log('\n✅ Inspection complete!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
