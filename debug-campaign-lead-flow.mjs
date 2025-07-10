#!/usr/bin/env node

/**
 * COMPREHENSIVE CAMPAIGN LEAD FLOW DEBUGGER
 * 
 * This script traces the complete flow from campaign selection to lead data
 * reaching the AI agent (Gemini) to identify where incorrect lead data 
 * is being introduced.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase configuration');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🔍 CAMPAIGN LEAD FLOW DEBUGGER');
console.log('===============================\n');

async function debugCampaignLeadFlow() {
    try {
        // 1. Get the most recent campaign with leads
        console.log('📋 1. FINDING ACTIVE CAMPAIGNS WITH LEADS');
        console.log('=========================================');
        
        const { data: campaigns, error: campaignError } = await supabase
            .from('campaigns')
            .select(`
                id,
                name,
                status,
                agent_id,
                created_at,
                updated_at
            `)
            .order('updated_at', { ascending: false })
            .limit(10);
            
        if (campaignError) {
            console.error('❌ Error fetching campaigns:', campaignError);
            return;
        }
        
        console.table(campaigns);
        
        // 2. For each campaign, get leads and show the selection logic
        for (const campaign of campaigns) {
            console.log(`\n📞 2. ANALYZING CAMPAIGN: ${campaign.name} (${campaign.id})`);
            console.log('=' + '='.repeat(50 + campaign.name.length));
            
            // Get all leads for this campaign
            const { data: leads, error: leadsError } = await supabase
                .from('campaign_leads')
                .select('*')
                .eq('campaign_id', campaign.id)
                .order('created_at', { ascending: true });
                
            if (leadsError) {
                console.error(`❌ Error fetching leads for campaign ${campaign.id}:`, leadsError);
                continue;
            }
            
            if (!leads || leads.length === 0) {
                console.log(`⚠️  No leads found for campaign: ${campaign.name}`);
                continue;
            }
            
            console.log(`📊 Total leads: ${leads.length}`);
            
            // Show lead summary
            const leadsByStatus = leads.reduce((acc, lead) => {
                acc[lead.status] = (acc[lead.status] || 0) + 1;
                return acc;
            }, {});
            
            console.log('📈 Lead status breakdown:');
            Object.entries(leadsByStatus).forEach(([status, count]) => {
                console.log(`   ${status}: ${count}`);
            });
            
            // Find the lead that would be selected by auto-dialer logic
            console.log('\n🎯 LEAD SELECTION SIMULATION (Auto-Dialer Logic)');
            console.log('==============================================');
            
            const pendingLeads = leads.filter(lead => {
                // Simulate auto-dialer selection criteria
                if (lead.status !== 'pending' && lead.status !== 'failed') {
                    return false;
                }
                
                // Check retry attempts (assuming max 3 like in auto-dialer)
                if ((lead.call_attempts || 0) >= 3) {
                    return false;
                }
                
                // Check retry delay (assuming 60 minutes like in auto-dialer)
                if (lead.last_call_at) {
                    const lastCall = new Date(lead.last_call_at);
                    const now = new Date();
                    const timeDiff = now.getTime() - lastCall.getTime();
                    const retryDelayMs = 60 * 60 * 1000; // 60 minutes
                    
                    if (timeDiff < retryDelayMs) {
                        return false;
                    }
                }
                
                return true;
            });
            
            if (pendingLeads.length > 0) {
                // Sort by priority and then by oldest first (like auto-dialer)
                const sortedLeads = pendingLeads.sort((a, b) => {
                    // Priority order
                    const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 };
                    const aPriority = priorityOrder[a.priority] || 2;
                    const bPriority = priorityOrder[b.priority] || 2;
                    
                    if (aPriority !== bPriority) {
                        return bPriority - aPriority;
                    }
                    
                    // If same priority, call older attempts first
                    const aLastCall = a.last_call_at ? new Date(a.last_call_at).getTime() : 0;
                    const bLastCall = b.last_call_at ? new Date(b.last_call_at).getTime() : 0;
                    return aLastCall - bLastCall;
                });
                
                const nextLead = sortedLeads[0];
                
                console.log(`✅ NEXT LEAD TO BE CALLED:`);
                console.log(`   ID: ${nextLead.id}`);
                console.log(`   Name: ${nextLead.first_name} ${nextLead.last_name}`);
                console.log(`   Phone: ${nextLead.phone_number}`);
                console.log(`   Status: ${nextLead.status}`);
                console.log(`   Attempts: ${nextLead.call_attempts || 0}`);
                console.log(`   Priority: ${nextLead.priority || 'normal'}`);
                console.log(`   Last Call: ${nextLead.last_call_at || 'Never'}`);
                
                // 3. Test personalization logic
                console.log('\n🎭 PERSONALIZATION TEST');
                console.log('======================');
                
                // Get campaign agent for system instruction
                const { data: agent, error: agentError } = await supabase
                    .from('agents')
                    .select('system_instruction')
                    .eq('id', campaign.agent_id)
                    .single();
                    
                if (agentError || !agent) {
                    console.log('⚠️  No agent found for campaign, using default instruction');
                } else {
                    console.log('📝 Original system instruction (first 200 chars):');
                    console.log(`   "${agent.system_instruction.substring(0, 200)}..."`);
                    
                    // Simulate personalization
                    const personalizedInstruction = agent.system_instruction
                        .replace(/\{first_name\}/g, nextLead.first_name || 'Customer')
                        .replace(/\{last_name\}/g, nextLead.last_name || '')
                        .replace(/\{full_name\}/g, `${nextLead.first_name || 'Customer'} ${nextLead.last_name || ''}`.trim())
                        .replace(/\{phone_number\}/g, nextLead.phone_number || '')
                        .replace(/\{email\}/g, nextLead.email || '')
                        .replace(/\{address\}/g, nextLead.address || '')
                        .replace(/\{service_requested\}/g, nextLead.service_requested || '');
                    
                    console.log('\n🎯 Personalized system instruction (first 200 chars):');
                    console.log(`   "${personalizedInstruction.substring(0, 200)}..."`);
                    
                    // Check if personalization worked
                    const hasPersonalization = agent.system_instruction.includes('{first_name}') ||
                                             agent.system_instruction.includes('{last_name}') ||
                                             agent.system_instruction.includes('{phone_number}');
                    
                    if (hasPersonalization) {
                        console.log('✅ System instruction contains personalization variables');
                        
                        const isPersonalized = personalizedInstruction.includes(nextLead.first_name) ||
                                             personalizedInstruction.includes(nextLead.phone_number);
                        
                        if (isPersonalized) {
                            console.log('✅ Personalization applied successfully');
                        } else {
                            console.log('❌ Personalization failed - variables not replaced');
                        }
                    } else {
                        console.log('⚠️  System instruction has no personalization variables');
                    }
                }
                
                // 4. Simulate WebSocket URL construction
                console.log('\n🔗 WEBSOCKET CONNECTION SIMULATION');
                console.log('================================');
                
                const wsUrl = `wss://work-2-xztkqihbepsagxrs.prod-runtime.all-hands.dev/websocket?callType=campaign&campaignId=${campaign.id}&leadId=${nextLead.id}&agentId=${campaign.agent_id || 'auto'}`;
                console.log('🌐 WebSocket URL that would be used:');
                console.log(`   ${wsUrl}`);
                
                // Extract parameters to verify
                const url = new URL(wsUrl);
                const params = {
                    callType: url.searchParams.get('callType'),
                    campaignId: url.searchParams.get('campaignId'),
                    leadId: url.searchParams.get('leadId'),
                    agentId: url.searchParams.get('agentId')
                };
                
                console.log('📋 Extracted parameters:');
                Object.entries(params).forEach(([key, value]) => {
                    console.log(`   ${key}: ${value}`);
                });
                
                // 5. Verify lead data retrieval
                console.log('\n🔍 LEAD DATA RETRIEVAL TEST');
                console.log('==========================');
                
                const { data: leadData, error: leadDataError } = await supabase
                    .from('campaign_leads')
                    .select('first_name, last_name, email, phone_number, address, service_requested, custom_fields')
                    .eq('id', nextLead.id)
                    .single();
                
                if (leadDataError) {
                    console.error('❌ Error fetching lead data:', leadDataError);
                } else {
                    console.log('✅ Lead data retrieval successful:');
                    console.log(`   First Name: ${leadData.first_name}`);
                    console.log(`   Last Name: ${leadData.last_name}`);
                    console.log(`   Phone: ${leadData.phone_number}`);
                    console.log(`   Email: ${leadData.email || 'N/A'}`);
                    console.log(`   Address: ${leadData.address || 'N/A'}`);
                    console.log(`   Service Requested: ${leadData.service_requested || 'N/A'}`);
                    
                    // Check if this matches what we expect
                    if (leadData.first_name === nextLead.first_name && 
                        leadData.phone_number === nextLead.phone_number) {
                        console.log('✅ Lead data consistency check PASSED');
                    } else {
                        console.log('❌ Lead data consistency check FAILED');
                        console.log('   Expected:', {
                            first_name: nextLead.first_name,
                            phone_number: nextLead.phone_number
                        });
                        console.log('   Retrieved:', {
                            first_name: leadData.first_name,
                            phone_number: leadData.phone_number
                        });
                    }
                }
                
            } else {
                console.log(`⚠️  No leads available to call for campaign: ${campaign.name}`);
                console.log('   All leads may be completed, failed with max attempts, or in retry delay');
            }
            
            console.log('\n' + '='.repeat(80));
        }
        
        // 6. Check recent call logs for any data mismatches
        console.log('\n📞 RECENT CALL LOGS ANALYSIS');
        console.log('===========================');
        
        const { data: recentCalls, error: callsError } = await supabase
            .from('call_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);
            
        if (callsError) {
            console.error('❌ Error fetching call logs:', callsError);
        } else if (recentCalls && recentCalls.length > 0) {
            console.log('📋 Recent calls with metadata:');
            recentCalls.forEach((call, index) => {
                console.log(`\n${index + 1}. Call ID: ${call.call_id || call.id}`);
                console.log(`   Phone: ${call.phone_number}`);
                console.log(`   Campaign: ${call.campaign_id}`);
                console.log(`   Status: ${call.call_status}`);
                console.log(`   Duration: ${call.call_duration || 0}s`);
                console.log(`   Created: ${call.created_at}`);
                
                if (call.metadata && typeof call.metadata === 'object') {
                    console.log('   Metadata:');
                    Object.entries(call.metadata).forEach(([key, value]) => {
                        if (key === 'leadId' || key === 'campaignId' || 
                            key === 'firstName' || key === 'lastName') {
                            console.log(`     ${key}: ${value}`);
                        }
                    });
                }
            });
        } else {
            console.log('⚠️  No recent call logs found');
        }
        
        console.log('\n✅ Campaign lead flow analysis complete!');
        console.log('\n💡 KEY TAKEAWAYS:');
        console.log('================');
        console.log('1. Check if the "Next Lead to be Called" matches your expectations');
        console.log('2. Verify that personalization is working correctly');
        console.log('3. Ensure WebSocket URL parameters are properly set');
        console.log('4. Confirm lead data retrieval is consistent');
        console.log('5. Review call logs for any metadata discrepancies');
        
    } catch (error) {
        console.error('❌ Error during campaign lead flow debug:', error);
    }
}

// Run the debug analysis
debugCampaignLeadFlow();
