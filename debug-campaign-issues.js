#!/usr/bin/env node

/**
 * Debug Campaign Start and Webhook Issues
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function debugIssues() {
    console.log('🔍 Debugging Campaign Start and Webhook Issues\n');

    // Check environment variables
    console.log('📋 Environment Variables:');
    console.log('WEBHOOK_URL:', process.env.WEBHOOK_URL);
    console.log('WEBSOCKET_URL:', process.env.WEBSOCKET_URL);
    console.log('TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID ? '✅ Set' : '❌ Missing');
    console.log('TWILIO_AUTH_TOKEN:', process.env.TWILIO_AUTH_TOKEN ? '✅ Set' : '❌ Missing');
    console.log('PORT:', process.env.PORT || '12001');

    // Check if server is running
    console.log('\n🌐 Server Status:');
    try {
        const response = await fetch('http://localhost:12001/health');
        console.log('Server health check:', response.ok ? '✅ Running' : '❌ Not responding');
    } catch (error) {
        console.log('Server health check: ❌ Not running or not accessible');
    }

    // Check GitHub Codespace URL format
    console.log('\n🔗 URL Analysis:');
    const webhookUrl = process.env.WEBHOOK_URL;
    if (webhookUrl) {
        console.log('Webhook URL format:', webhookUrl);
        console.log('Is GitHub Codespace URL:', webhookUrl.includes('github.dev') ? '✅ Yes' : '❌ No');
        console.log('Port in URL:', webhookUrl.match(/:(\d+)/)?.[1] || 'Not found');
        
        // Test webhook endpoint accessibility
        try {
            const testUrl = `${webhookUrl}/webhook/test-call-twiml?agentId=test`;
            const response = await fetch(testUrl, { method: 'POST', body: '{}', headers: { 'Content-Type': 'application/json' } });
            console.log('Webhook endpoint test:', response.status, response.statusText);
        } catch (error) {
            console.log('Webhook endpoint test: ❌ Failed -', error.message);
        }
    }

    // Check if AutoDialerEngine can be imported
    console.log('\n🔧 AutoDialerEngine Check:');
    try {
        const { AutoDialerEngine } = await import('../packages/server/src/services/auto-dialer-engine.js');
        console.log('AutoDialerEngine import: ✅ Success');
        console.log('AutoDialerEngine type:', typeof AutoDialerEngine);
        
        // Test creating an instance
        const testConfig = {
            campaignId: 'test-123',
            supabase: null,
            twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
            twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
            webhookUrl: process.env.WEBHOOK_URL,
            websocketUrl: process.env.WEBSOCKET_URL
        };
        
        const dialer = new AutoDialerEngine(testConfig);
        console.log('AutoDialerEngine creation: ✅ Success');
        console.log('Dialer has start method:', typeof dialer.start === 'function' ? '✅ Yes' : '❌ No');
        
    } catch (error) {
        console.log('AutoDialerEngine import: ❌ Failed -', error.message);
    }

    // Check database connection and campaign data
    console.log('\n💾 Database Check:');
    try {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        
        if (!supabaseUrl || !supabaseKey) {
            console.log('Supabase config: ❌ Missing URL or key');
            return;
        }
        
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        const { data: campaigns, error } = await supabase
            .from('campaigns')
            .select('id, name, status, total_leads')
            .eq('status', 'draft')
            .limit(5);
            
        if (error) {
            console.log('Database connection: ❌ Failed -', error.message);
        } else {
            console.log('Database connection: ✅ Success');
            console.log('Draft campaigns found:', campaigns?.length || 0);
            
            if (campaigns && campaigns.length > 0) {
                const testCampaign = campaigns[0];
                console.log('\n📊 Test Campaign:', testCampaign.name);
                
                // Check for leads
                const { data: leads, error: leadsError } = await supabase
                    .from('campaign_leads')
                    .select('id, status')
                    .eq('campaign_id', testCampaign.id)
                    .eq('status', 'pending');
                    
                if (leadsError) {
                    console.log('Leads check: ❌ Failed -', leadsError.message);
                } else {
                    console.log('Pending leads:', leads?.length || 0);
                    console.log('Can start campaign:', leads && leads.length > 0 ? '✅ Yes' : '❌ No leads');
                }
            }
        }
        
    } catch (error) {
        console.log('Database check: ❌ Failed -', error.message);
    }

    console.log('\n📝 Recommendations:');
    console.log('1. Ensure server is running on port 12001');
    console.log('2. Check that WEBHOOK_URL matches GitHub Codespace public URL');
    console.log('3. Verify Twilio credentials are correct');
    console.log('4. Make sure campaigns have pending leads before starting');
    console.log('5. Check if webhook endpoints require authentication bypass');
}

debugIssues().catch(console.error);
