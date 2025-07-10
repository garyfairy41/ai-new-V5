#!/usr/bin/env node

/**
 * Debug Campaign Start Process
 * This script tests the campaign start functionality end-to-end
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase configuration');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugCampaignStart() {
    console.log('🔍 Debugging Campaign Start Process...\n');

    try {
        // Step 1: Check environment variables
        console.log('1. Environment Variables Check:');
        const requiredEnvs = [
            'TWILIO_ACCOUNT_SID',
            'TWILIO_AUTH_TOKEN', 
            'WEBHOOK_URL',
            'WEBSOCKET_URL'
        ];
        
        for (const env of requiredEnvs) {
            const value = process.env[env];
            console.log(`   ${env}: ${value ? '✅ Set' : '❌ Missing'}`);
            if (value) {
                console.log(`      Value: ${env.includes('TOKEN') ? '[HIDDEN]' : value}`);
            }
        }

        // Step 2: Check if server is running
        console.log('\n2. Server Connectivity Check:');
        const serverUrl = process.env.WEBHOOK_URL || 'http://localhost:12001';
        try {
            const response = await fetch(`${serverUrl}/health`);
            console.log(`   Server Status: ${response.ok ? '✅ Running' : '❌ Not responding'}`);
        } catch (error) {
            console.log(`   Server Status: ❌ Not accessible (${error.message})`);
        }

        // Step 3: Get real campaigns with leads
        console.log('\n3. Campaign Data Check:');
        const { data: campaigns, error: campaignsError } = await supabase
            .from('campaigns')
            .select('id, name, status, total_leads, profile_id')
            .neq('profile_id', null)
            .eq('status', 'draft')
            .limit(3);

        if (campaignsError) {
            console.error('   ❌ Error fetching campaigns:', campaignsError);
            return;
        }

        console.log(`   Found ${campaigns.length} draft campaigns:`);
        for (const campaign of campaigns) {
            console.log(`   - ${campaign.name} (${campaign.id}): ${campaign.total_leads} leads`);
            
            // Check if campaign has actual leads
            const { data: leads, error: leadsError } = await supabase
                .from('campaign_leads')
                .select('id, phone_number, status')
                .eq('campaign_id', campaign.id)
                .limit(3);
                
            if (!leadsError && leads) {
                console.log(`     Actual leads: ${leads.length} (${leads.filter(l => l.status === 'pending').length} pending)`);
            }
        }

        // Step 4: Test API call to start campaign
        if (campaigns.length > 0) {
            const testCampaign = campaigns.find(c => c.total_leads > 0) || campaigns[0];
            console.log(`\n4. Testing Start Campaign API for: ${testCampaign.name}`);
            
            try {
                const apiUrl = process.env.WEBHOOK_URL || 'http://localhost:12001';
                const response = await fetch(`${apiUrl}/api/campaigns/${testCampaign.id}/start`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                console.log(`   API Response Status: ${response.status}`);
                
                if (response.ok) {
                    const result = await response.json();
                    console.log('   ✅ Campaign start API succeeded:', result);
                } else {
                    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
                    console.log('   ❌ Campaign start API failed:', error);
                    console.log(`   Status: ${response.status} ${response.statusText}`);
                }
                
            } catch (apiError) {
                console.log('   ❌ API call failed:', apiError.message);
            }
        }

        // Step 5: Check server logs/status
        console.log('\n5. Checking for Auto-Dialer Status:');
        try {
            const apiUrl = process.env.WEBHOOK_URL || 'http://localhost:12001';
            const response = await fetch(`${apiUrl}/api/campaigns/dialer-status`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const status = await response.json();
                console.log('   ✅ Dialer status available:', status);
            } else {
                console.log('   ❌ Dialer status endpoint not accessible');
            }
        } catch (error) {
            console.log('   ❌ Could not check dialer status:', error.message);
        }

    } catch (error) {
        console.error('💥 Debug failed:', error);
    }
}

// Run the debug
debugCampaignStart().catch(console.error);
