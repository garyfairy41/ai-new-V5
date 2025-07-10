#!/usr/bin/env node

// Comprehensive API Integration Test Script
// This will verify every critical endpoint used by the UI pages

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const testUserId = '00000000-0000-0000-0000-000000000000';

async function testAPIIntegration() {
  console.log('🔍 COMPREHENSIVE API INTEGRATION TEST\n');
  
  const results = [];
  
  // Test 1: Profiles
  console.log('1. Testing Profile Operations...');
  try {
    const { data: profiles, error } = await supabase.from('profiles').select('*').limit(1);
    results.push({ test: 'Profiles', status: error ? 'FAIL' : 'PASS', error: error?.message });
    console.log(`   ✅ Profiles: ${error ? 'FAIL' : 'PASS'}`);
  } catch (e) {
    results.push({ test: 'Profiles', status: 'FAIL', error: e.message });
    console.log(`   ❌ Profiles: FAIL - ${e.message}`);
  }

  // Test 2: AI Agents (Critical - was broken before)
  console.log('2. Testing AI Agents Operations...');
  try {
    const { data: agents, error } = await supabaseAdmin.from('ai_agents').select('*');
    results.push({ test: 'AI Agents Read', status: error ? 'FAIL' : 'PASS', error: error?.message });
    console.log(`   ✅ AI Agents Read: ${error ? 'FAIL' : 'PASS'} (${agents?.length || 0} agents)`);
    
    // Test agent creation
    const { data: newAgent, error: createError } = await supabaseAdmin
      .from('ai_agents')
      .insert({
        name: 'Test Agent - Delete Me',
        description: 'Integration test agent',
        voice_model: 'default',
        instructions: 'Test instructions',
        knowledge_base: ''
      })
      .select()
      .single();
    
    results.push({ test: 'AI Agents Create', status: createError ? 'FAIL' : 'PASS', error: createError?.message });
    console.log(`   ✅ AI Agents Create: ${createError ? 'FAIL' : 'PASS'}`);
    
    // Clean up test agent
    if (newAgent) {
      await supabaseAdmin.from('ai_agents').delete().eq('id', newAgent.id);
    }
  } catch (e) {
    results.push({ test: 'AI Agents', status: 'FAIL', error: e.message });
    console.log(`   ❌ AI Agents: FAIL - ${e.message}`);
  }

  // Test 3: Call Logs
  console.log('3. Testing Call Logs Operations...');
  try {
    const { data: calls, error } = await supabase.from('call_logs').select('*').limit(5);
    results.push({ test: 'Call Logs', status: error ? 'FAIL' : 'PASS', error: error?.message });
    console.log(`   ✅ Call Logs: ${error ? 'FAIL' : 'PASS'} (${calls?.length || 0} calls)`);
  } catch (e) {
    results.push({ test: 'Call Logs', status: 'FAIL', error: e.message });
    console.log(`   ❌ Call Logs: FAIL - ${e.message}`);
  }

  // Test 4: Active Calls
  console.log('4. Testing Active Calls...');
  try {
    const { data: activeCalls, error } = await supabase
      .from('call_logs')
      .select('*')
      .eq('status', 'in_progress');
    results.push({ test: 'Active Calls', status: error ? 'FAIL' : 'PASS', error: error?.message });
    console.log(`   ✅ Active Calls: ${error ? 'FAIL' : 'PASS'} (${activeCalls?.length || 0} active)`);
  } catch (e) {
    results.push({ test: 'Active Calls', status: 'FAIL', error: e.message });
    console.log(`   ❌ Active Calls: FAIL - ${e.message}`);
  }

  // Test 5: Campaigns
  console.log('5. Testing Campaigns Operations...');
  try {
    const { data: campaigns, error } = await supabase.from('campaigns').select('*');
    results.push({ test: 'Campaigns', status: error ? 'FAIL' : 'PASS', error: error?.message });
    console.log(`   ✅ Campaigns: ${error ? 'FAIL' : 'PASS'} (${campaigns?.length || 0} campaigns)`);
  } catch (e) {
    results.push({ test: 'Campaigns', status: 'FAIL', error: e.message });
    console.log(`   ❌ Campaigns: FAIL - ${e.message}`);
  }

  // Test 6: Analytics RPC Function (Critical)
  console.log('6. Testing Analytics RPC Function...');
  try {
    const { data: analytics, error } = await supabase.rpc('get_user_analytics', {
      user_id: testUserId,
      days_back: 30
    });
    results.push({ test: 'Analytics RPC', status: error ? 'FAIL' : 'PASS', error: error?.message });
    console.log(`   ✅ Analytics RPC: ${error ? 'FAIL' : 'PASS'}`);
  } catch (e) {
    results.push({ test: 'Analytics RPC', status: 'FAIL', error: e.message });
    console.log(`   ❌ Analytics RPC: FAIL - ${e.message}`);
  }

  // Test 7: Appointments
  console.log('7. Testing Appointments...');
  try {
    const { data: appointments, error } = await supabase.from('appointments').select('*');
    results.push({ test: 'Appointments', status: error ? 'FAIL' : 'PASS', error: error?.message });
    console.log(`   ✅ Appointments: ${error ? 'FAIL' : 'PASS'} (${appointments?.length || 0} appointments)`);
  } catch (e) {
    results.push({ test: 'Appointments', status: 'FAIL', error: e.message });
    console.log(`   ❌ Appointments: FAIL - ${e.message}`);
  }

  // Test 8: DNC Lists
  console.log('8. Testing DNC Lists...');
  try {
    const { data: dnc, error } = await supabase.from('dnc_lists').select('*');
    results.push({ test: 'DNC Lists', status: error ? 'FAIL' : 'PASS', error: error?.message });
    console.log(`   ✅ DNC Lists: ${error ? 'FAIL' : 'PASS'} (${dnc?.length || 0} entries)`);
  } catch (e) {
    results.push({ test: 'DNC Lists', status: 'FAIL', error: e.message });
    console.log(`   ❌ DNC Lists: FAIL - ${e.message}`);
  }

  // Test 9: Webhook Endpoints
  console.log('9. Testing Webhook Endpoints...');
  try {
    const { data: webhooks, error } = await supabase.from('webhook_endpoints').select('*');
    results.push({ test: 'Webhook Endpoints', status: error ? 'FAIL' : 'PASS', error: error?.message });
    console.log(`   ✅ Webhook Endpoints: ${error ? 'FAIL' : 'PASS'} (${webhooks?.length || 0} endpoints)`);
  } catch (e) {
    results.push({ test: 'Webhook Endpoints', status: 'FAIL', error: e.message });
    console.log(`   ❌ Webhook Endpoints: FAIL - ${e.message}`);
  }

  // Test 10: System Status
  console.log('10. Testing System Status...');
  try {
    const { data: status, error } = await supabase.from('system_status').select('*');
    results.push({ test: 'System Status', status: error ? 'FAIL' : 'PASS', error: error?.message });
    console.log(`   ✅ System Status: ${error ? 'FAIL' : 'PASS'} (${status?.length || 0} status entries)`);
  } catch (e) {
    results.push({ test: 'System Status', status: 'FAIL', error: e.message });
    console.log(`   ❌ System Status: FAIL - ${e.message}`);
  }

  console.log('\n📊 TEST SUMMARY');
  console.log('=' * 50);
  
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  
  console.log(`Total Tests: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  
  if (failed > 0) {
    console.log('\n🚨 FAILED TESTS:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`   • ${r.test}: ${r.error}`);
    });
  }
  
  console.log(`\n${failed === 0 ? '🎉 ALL TESTS PASSED!' : '⚠️  Some tests failed - UI may have issues'}`);
}

testAPIIntegration().catch(console.error);
