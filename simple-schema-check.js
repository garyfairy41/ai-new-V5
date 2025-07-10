#!/usr/bin/env node

/**
 * Simple script to run the schema alignment check
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase configuration. Please check your environment variables.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runSimpleChecks() {
    console.log('🔍 Running Simple Database Checks...\n');

    try {
        // Check 1: Does outbound_campaigns table exist?
        console.log('1. Checking if outbound_campaigns table exists...');
        const { data: outboundExists, error: checkError } = await supabase
            .rpc('sql', { 
                query: "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'outbound_campaigns') as exists"
            });
        
        if (checkError) {
            console.error('❌ Error checking outbound_campaigns:', checkError);
        } else {
            const exists = outboundExists && outboundExists[0] && outboundExists[0].exists;
            console.log(exists ? '⚠️  outbound_campaigns table EXISTS' : '✅ outbound_campaigns table does NOT exist');
        }

        // Check 2: Does campaigns table exist?
        console.log('\n2. Checking if campaigns table exists...');
        const { data: campaignsExists, error: campaignsError } = await supabase
            .rpc('sql', { 
                query: "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'campaigns') as exists"
            });
        
        if (campaignsError) {
            console.error('❌ Error checking campaigns:', campaignsError);
        } else {
            const exists = campaignsExists && campaignsExists[0] && campaignsExists[0].exists;
            console.log(exists ? '✅ campaigns table EXISTS' : '❌ campaigns table does NOT exist');
        }

        // Check 3: Does campaign_leads table exist?
        console.log('\n3. Checking if campaign_leads table exists...');
        const { data: leadsExists, error: leadsError } = await supabase
            .rpc('sql', { 
                query: "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'campaign_leads') as exists"
            });
        
        if (leadsError) {
            console.error('❌ Error checking campaign_leads:', leadsError);
        } else {
            const exists = leadsExists && leadsExists[0] && leadsExists[0].exists;
            console.log(exists ? '✅ campaign_leads table EXISTS' : '❌ campaign_leads table does NOT exist');
        }

        // Check 4: Count records in tables
        console.log('\n4. Checking record counts...');
        
        try {
            const { data: campaignCount, error: campaignCountError } = await supabase
                .from('campaigns')
                .select('id', { count: 'exact', head: true });
            
            if (campaignCountError) {
                console.log('❌ Error counting campaigns:', campaignCountError.message);
            } else {
                console.log(`✅ campaigns table has ${campaignCount || 0} records`);
            }
        } catch (e) {
            console.log('❌ Cannot access campaigns table:', e.message);
        }

        try {
            const { data: leadCount, error: leadCountError } = await supabase
                .from('campaign_leads')
                .select('id', { count: 'exact', head: true });
            
            if (leadCountError) {
                console.log('❌ Error counting campaign_leads:', leadCountError.message);
            } else {
                console.log(`✅ campaign_leads table has ${leadCount || 0} records`);
            }
        } catch (e) {
            console.log('❌ Cannot access campaign_leads table:', e.message);
        }

        // Check 5: Test foreign key relationship
        console.log('\n5. Testing foreign key relationship...');
        try {
            const { data: joinTest, error: joinError } = await supabase
                .from('campaign_leads')
                .select(`
                    id,
                    campaign_id,
                    campaigns (
                        id,
                        name
                    )
                `)
                .limit(1);
            
            if (joinError) {
                console.log('❌ Foreign key relationship error:', joinError.message);
            } else {
                console.log('✅ Foreign key relationship working');
            }
        } catch (e) {
            console.log('❌ Cannot test foreign key relationship:', e.message);
        }

        // Check 6: Look for orphaned records
        console.log('\n6. Checking for orphaned campaign_leads...');
        try {
            const { data: orphanedCount, error: orphanedError } = await supabase
                .rpc('sql', { 
                    query: `
                        SELECT COUNT(*) as count 
                        FROM campaign_leads cl 
                        LEFT JOIN campaigns c ON cl.campaign_id = c.id 
                        WHERE c.id IS NULL
                    `
                });
            
            if (orphanedError) {
                console.log('❌ Error checking orphaned records:', orphanedError.message);
            } else {
                const count = orphanedCount && orphanedCount[0] ? orphanedCount[0].count : 0;
                if (count > 0) {
                    console.log(`⚠️  Found ${count} orphaned campaign_leads records`);
                } else {
                    console.log('✅ No orphaned campaign_leads records found');
                }
            }
        } catch (e) {
            console.log('❌ Cannot check orphaned records:', e.message);
        }

        console.log('\n📋 Simple checks completed!');
        console.log('\nNext steps:');
        console.log('- If outbound_campaigns table exists, run the migration script');
        console.log('- If campaigns/campaign_leads tables are missing, create them');
        console.log('- If orphaned records exist, they need to be cleaned up');

    } catch (error) {
        console.error('❌ Simple checks failed:', error);
        process.exit(1);
    }
}

// Run the checks
runSimpleChecks().catch(console.error);
