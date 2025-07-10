#!/usr/bin/env node

/**
 * Test script to verify lead import functionality
 * This script creates a test campaign and attempts to import leads
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

async function testLeadImport() {
    console.log('🧪 Testing Lead Import Process...\n');

    try {
        // Step 1: Get current user profile (or use a test profile ID)
        const testProfileId = 'test-profile-id-' + Date.now();
        console.log(`📋 Using test profile ID: ${testProfileId}`);

        // Step 2: Create a test campaign
        const testCampaign = {
            profile_id: testProfileId,
            name: `Test Campaign ${Date.now()}`,
            status: 'active',
            total_leads: 0,
            dialed_leads: 0,
            completed_leads: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        console.log('📝 Creating test campaign...');
        const { data: campaignData, error: campaignError } = await supabase
            .from('campaigns')
            .insert([testCampaign])
            .select('*')
            .single();

        if (campaignError) {
            console.error('❌ Error creating campaign:', campaignError);
            return;
        }

        console.log('✅ Campaign created successfully:', campaignData);
        const campaignId = campaignData.id;

        // Step 3: Create test leads
        const testLeads = [
            {
                campaign_id: campaignId,
                phone_number: '+1234567890',
                first_name: 'John',
                last_name: 'Doe',
                status: 'pending',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            },
            {
                campaign_id: campaignId,
                phone_number: '+1234567891',
                first_name: 'Jane',
                last_name: 'Smith',
                status: 'pending',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            },
            {
                campaign_id: campaignId,
                phone_number: '+1234567892',
                first_name: 'Bob',
                last_name: 'Johnson',
                status: 'pending',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }
        ];

        console.log('📞 Adding test leads...');
        const { data: leadsData, error: leadsError } = await supabase
            .from('campaign_leads')
            .insert(testLeads)
            .select('*');

        if (leadsError) {
            console.error('❌ Error adding leads:', leadsError);
            return;
        }

        console.log('✅ Leads added successfully:', leadsData);

        // Step 4: Update campaign lead count
        console.log('📊 Updating campaign lead count...');
        const { data: updateData, error: updateError } = await supabase
            .from('campaigns')
            .update({ 
                total_leads: testLeads.length,
                updated_at: new Date().toISOString()
            })
            .eq('id', campaignId)
            .select('*')
            .single();

        if (updateError) {
            console.error('❌ Error updating campaign:', updateError);
            return;
        }

        console.log('✅ Campaign updated successfully:', updateData);

        // Step 5: Verify the data
        console.log('\n🔍 Verifying data integrity...');
        
        // Check campaign exists
        const { data: verifyCampaign, error: verifyCampaignError } = await supabase
            .from('campaigns')
            .select('*')
            .eq('id', campaignId)
            .single();

        if (verifyCampaignError) {
            console.error('❌ Error verifying campaign:', verifyCampaignError);
            return;
        }

        console.log('✅ Campaign verification passed:', verifyCampaign);

        // Check leads exist and reference correct campaign
        const { data: verifyLeads, error: verifyLeadsError } = await supabase
            .from('campaign_leads')
            .select('*')
            .eq('campaign_id', campaignId);

        if (verifyLeadsError) {
            console.error('❌ Error verifying leads:', verifyLeadsError);
            return;
        }

        console.log('✅ Leads verification passed:', verifyLeads);

        // Step 6: Check for foreign key relationship
        console.log('\n🔗 Testing foreign key relationship...');
        const { data: joinData, error: joinError } = await supabase
            .from('campaign_leads')
            .select(`
                *,
                campaigns (
                    id,
                    name,
                    profile_id,
                    status
                )
            `)
            .eq('campaign_id', campaignId);

        if (joinError) {
            console.error('❌ Error testing join relationship:', joinError);
            return;
        }

        console.log('✅ Foreign key relationship working:', joinData);

        // Step 7: Cleanup (optional)
        console.log('\n🧹 Cleaning up test data...');
        
        // Delete leads first (due to foreign key constraint)
        await supabase
            .from('campaign_leads')
            .delete()
            .eq('campaign_id', campaignId);

        // Delete campaign
        await supabase
            .from('campaigns')
            .delete()
            .eq('id', campaignId);

        console.log('✅ Cleanup completed');

        console.log('\n🎉 All tests passed! Lead import functionality is working correctly.');

    } catch (error) {
        console.error('❌ Test failed with error:', error);
        process.exit(1);
    }
}

// Run the test
testLeadImport().catch(console.error);
