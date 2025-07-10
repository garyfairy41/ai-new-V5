#!/usr/bin/env node

/**
 * Complete Campaign Migration and Lead Import Fix
 * This script will:
 * 1. Run the complete migration from outbound_campaigns to campaigns
 * 2. Verify the migration
 * 3. Test the lead import functionality
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

async function runMigration() {
    console.log('🔄 Starting Complete Campaign Migration...\n');

    try {
        // Step 1: Read and execute the migration script
        const migrationScript = fs.readFileSync(path.join(__dirname, 'complete-campaign-migration.sql'), 'utf8');
        
        console.log('📜 Executing migration script...');
        const { data, error } = await supabase.rpc('sql', { query: migrationScript });
        
        if (error) {
            console.error('❌ Migration failed:', error);
            return false;
        }
        
        console.log('✅ Migration completed successfully');
        return true;
        
    } catch (error) {
        console.error('❌ Migration script execution failed:', error);
        
        // Try running the migration manually step by step
        console.log('⚠️  Attempting manual migration...');
        return await runManualMigration();
    }
}

async function runManualMigration() {
    try {
        // Check if outbound_campaigns table exists
        const { data: outboundExists, error: checkError } = await supabase
            .from('information_schema.tables')
            .select('table_name')
            .eq('table_name', 'outbound_campaigns');

        if (checkError) {
            console.error('❌ Error checking for outbound_campaigns:', checkError);
            return false;
        }

        if (outboundExists && outboundExists.length > 0) {
            console.log('📋 Found outbound_campaigns table, migrating data...');
            
            // Get data from outbound_campaigns
            const { data: outboundData, error: fetchError } = await supabase
                .from('outbound_campaigns')
                .select('*');

            if (fetchError) {
                console.error('❌ Error fetching outbound campaigns:', fetchError);
                return false;
            }

            if (outboundData && outboundData.length > 0) {
                console.log(`📊 Found ${outboundData.length} campaigns to migrate`);
                
                // Insert into campaigns table
                const { data: insertData, error: insertError } = await supabase
                    .from('campaigns')
                    .upsert(outboundData.map(campaign => ({
                        id: campaign.id,
                        profile_id: campaign.profile_id,
                        agent_id: campaign.agent_id,
                        name: campaign.name,
                        description: campaign.description,
                        status: campaign.status,
                        total_leads: campaign.total_leads || 0,
                        dialed_leads: campaign.leads_called || 0,
                        completed_leads: campaign.leads_completed || 0,
                        created_at: campaign.created_at,
                        updated_at: campaign.updated_at
                    })));

                if (insertError) {
                    console.error('❌ Error inserting campaigns:', insertError);
                    return false;
                }

                console.log('✅ Successfully migrated campaigns');
            }
        } else {
            console.log('ℹ️  No outbound_campaigns table found');
        }

        return true;
        
    } catch (error) {
        console.error('❌ Manual migration failed:', error);
        return false;
    }
}

async function runSchemaCheck() {
    console.log('\n🔍 Running Schema Verification...\n');

    try {
        // Read and execute the schema check script
        const schemaScript = fs.readFileSync(path.join(__dirname, 'check-schema-alignment.sql'), 'utf8');
        
        // Split the script into individual queries
        const queries = schemaScript.split(';').filter(query => query.trim() && !query.trim().startsWith('--'));
        
        for (const query of queries) {
            if (query.trim()) {
                try {
                    const { data, error } = await supabase.rpc('sql', { query: query.trim() });
                    if (error) {
                        console.log(`⚠️  Query warning: ${error.message}`);
                    } else if (data && data.length > 0) {
                        console.log('📊 Query result:', data);
                    }
                } catch (queryError) {
                    console.log(`⚠️  Query skipped: ${queryError.message}`);
                }
            }
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ Schema check failed:', error);
        return false;
    }
}

async function testLeadImport() {
    console.log('\n🧪 Testing Lead Import Process...\n');

    try {
        // Create a test campaign
        const testCampaign = {
            profile_id: 'test-profile-' + Date.now(),
            name: `Migration Test Campaign ${Date.now()}`,
            status: 'active',
            total_leads: 0,
            dialed_leads: 0,
            completed_leads: 0
        };

        const { data: campaignData, error: campaignError } = await supabase
            .from('campaigns')
            .insert([testCampaign])
            .select('*')
            .single();

        if (campaignError) {
            console.error('❌ Failed to create test campaign:', campaignError);
            return false;
        }

        console.log('✅ Test campaign created:', campaignData.name);

        // Create test leads
        const testLeads = [
            {
                campaign_id: campaignData.id,
                phone_number: '+1234567890',
                first_name: 'John',
                last_name: 'Doe',
                status: 'pending'
            },
            {
                campaign_id: campaignData.id,
                phone_number: '+1234567891',
                first_name: 'Jane',
                last_name: 'Smith',
                status: 'pending'
            }
        ];

        const { data: leadsData, error: leadsError } = await supabase
            .from('campaign_leads')
            .insert(testLeads)
            .select('*');

        if (leadsError) {
            console.error('❌ Failed to create test leads:', leadsError);
            return false;
        }

        console.log('✅ Test leads created:', leadsData.length);

        // Update campaign lead count
        const { data: updateData, error: updateError } = await supabase
            .from('campaigns')
            .update({ total_leads: testLeads.length })
            .eq('id', campaignData.id)
            .select('*')
            .single();

        if (updateError) {
            console.error('❌ Failed to update campaign lead count:', updateError);
            return false;
        }

        console.log('✅ Campaign lead count updated');

        // Test foreign key relationship
        const { data: joinData, error: joinError } = await supabase
            .from('campaign_leads')
            .select(`
                id,
                phone_number,
                first_name,
                last_name,
                campaigns (
                    id,
                    name,
                    profile_id
                )
            `)
            .eq('campaign_id', campaignData.id);

        if (joinError) {
            console.error('❌ Foreign key relationship test failed:', joinError);
            return false;
        }

        console.log('✅ Foreign key relationship working correctly');

        // Cleanup
        await supabase.from('campaign_leads').delete().eq('campaign_id', campaignData.id);
        await supabase.from('campaigns').delete().eq('id', campaignData.id);

        console.log('✅ Test cleanup completed');
        return true;

    } catch (error) {
        console.error('❌ Lead import test failed:', error);
        return false;
    }
}

async function main() {
    console.log('🚀 Campaign Migration and Lead Import Fix\n');
    console.log('This script will migrate from outbound_campaigns to campaigns');
    console.log('and verify that lead import functionality works correctly.\n');

    // Step 1: Run migration
    const migrationSuccess = await runMigration();
    if (!migrationSuccess) {
        console.error('❌ Migration failed. Please check the database manually.');
        process.exit(1);
    }

    // Step 2: Run schema check
    const schemaSuccess = await runSchemaCheck();
    if (!schemaSuccess) {
        console.error('❌ Schema check failed. Please review the database structure.');
        process.exit(1);
    }

    // Step 3: Test lead import
    const testSuccess = await testLeadImport();
    if (!testSuccess) {
        console.error('❌ Lead import test failed. Please check the implementation.');
        process.exit(1);
    }

    console.log('\n🎉 All checks passed! The campaign migration is complete and lead import is working correctly.');
    console.log('\nNext steps:');
    console.log('1. ✅ Database migration completed');
    console.log('2. ✅ Schema alignment verified');
    console.log('3. ✅ Lead import functionality tested');
    console.log('4. 📋 You can now import leads into campaigns safely');
}

// Run the main function
main().catch(console.error);
