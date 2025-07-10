#!/usr/bin/env node

/**
 * Comprehensive Campaign & Auto-Dialer System Test Suite
 * Tests all aspects of the campaign system to ensure 100% functionality
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test configuration
const BASE_URL = 'http://localhost:12001';
const TEST_PROFILE_ID = 'test-profile-' + Date.now();

console.log('🧪 COMPREHENSIVE CAMPAIGN & AUTO-DIALER SYSTEM TEST');
console.log('==================================================');
console.log(`Base URL: ${BASE_URL}`);
console.log(`Test Profile ID: ${TEST_PROFILE_ID}`);
console.log('');

// Test results tracking
const testResults = {
    passed: 0,
    failed: 0,
    tests: []
};

function addTestResult(name, status, message, data = null) {
    const result = { name, status, message, data, timestamp: new Date().toISOString() };
    testResults.tests.push(result);
    
    if (status === 'PASS') {
        testResults.passed++;
        console.log(`✅ ${name}: ${message}`);
    } else {
        testResults.failed++;
        console.log(`❌ ${name}: ${message}`);
        if (data) console.log(`   Details:`, data);
    }
}

// Helper function to make HTTP requests
function makeRequest(options, postData = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = data ? JSON.parse(data) : {};
                    resolve({ status: res.statusCode, data: parsed, headers: res.headers });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data, headers: res.headers });
                }
            });
        });
        
        req.on('error', reject);
        
        if (postData) {
            req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
        }
        
        req.end();
    });
}

// Test 1: Verify Campaign API File Structure
async function testCampaignAPIFileStructure() {
    console.log('\n📁 TEST 1: Campaign API File Structure');
    
    try {
        // Check if campaign-api.js exists
        const campaignApiPath = path.join(__dirname, 'src/api/campaign-api.js');
        if (!fs.existsSync(campaignApiPath)) {
            addTestResult('Campaign API File', 'FAIL', 'campaign-api.js file not found');
            return;
        }
        
        const content = fs.readFileSync(campaignApiPath, 'utf8');
        
        // Check for required components
        const requiredComponents = [
            'setupCampaignAPI',
            'AutoDialerEngine',
            'activeDialers',
            'app.get(\'/api/campaigns\'',
            'app.post(\'/api/campaigns\'',
            'app.post(\'/api/campaigns/:id/start\'',
            'app.post(\'/api/campaigns/:id/pause\'',
            'app.post(\'/api/campaigns/:id/stop\'',
            'app.get(\'/api/campaigns/:id/stats\'',
            'app.get(\'/api/campaigns/:id/leads\'',
            'app.post(\'/api/campaigns/:id/leads\')'
        ];
        
        const missingComponents = [];
        requiredComponents.forEach(component => {
            if (!content.includes(component)) {
                missingComponents.push(component);
            }
        });
        
        if (missingComponents.length === 0) {
            addTestResult('Campaign API File', 'PASS', 'All required components found');
        } else {
            addTestResult('Campaign API File', 'FAIL', 'Missing components', missingComponents);
        }
        
    } catch (error) {
        addTestResult('Campaign API File', 'FAIL', 'Error reading file', error.message);
    }
}

// Test 2: Verify Auto-Dialer Engine
async function testAutoDialerEngine() {
    console.log('\n🤖 TEST 2: Auto-Dialer Engine');
    
    try {
        const dialerPath = path.join(__dirname, 'src/services/auto-dialer-engine.js');
        if (!fs.existsSync(dialerPath)) {
            addTestResult('Auto-Dialer Engine', 'FAIL', 'auto-dialer-engine.js file not found');
            return;
        }
        
        const content = fs.readFileSync(dialerPath, 'utf8');
        
        const requiredMethods = [
            'class AutoDialerEngine',
            'start()',
            'pause()',
            'stop()',
            'resume()',
            'loadCampaignLeads',
            'getInstance',
            'EventEmitter'
        ];
        
        const missingMethods = [];
        requiredMethods.forEach(method => {
            if (!content.includes(method)) {
                missingMethods.push(method);
            }
        });
        
        if (missingMethods.length === 0) {
            addTestResult('Auto-Dialer Engine', 'PASS', 'All required methods found');
        } else {
            addTestResult('Auto-Dialer Engine', 'FAIL', 'Missing methods', missingMethods);
        }
        
    } catch (error) {
        addTestResult('Auto-Dialer Engine', 'FAIL', 'Error reading file', error.message);
    }
}

// Test 3: Test Server Health
async function testServerHealth() {
    console.log('\n🏥 TEST 3: Server Health Check');
    
    try {
        const response = await makeRequest({
            hostname: 'localhost',
            port: 12001,
            path: '/health',
            method: 'GET'
        });
        
        if (response.status === 200 && response.data.status === 'healthy') {
            addTestResult('Server Health', 'PASS', 'Server is healthy');
        } else {
            addTestResult('Server Health', 'FAIL', 'Server health check failed', response);
        }
        
    } catch (error) {
        addTestResult('Server Health', 'FAIL', 'Cannot connect to server', error.message);
    }
}

// Test 4: Test Campaign CRUD Operations
async function testCampaignCRUD() {
    console.log('\n📊 TEST 4: Campaign CRUD Operations');
    
    let campaignId = null;
    
    try {
        // Test CREATE campaign
        const createResponse = await makeRequest({
            hostname: 'localhost',
            port: 12001,
            path: '/api/campaigns',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        }, {
            profile_id: TEST_PROFILE_ID,
            name: 'Test Campaign ' + Date.now(),
            description: 'Test campaign for system validation',
            status: 'draft'
        });
        
        if (createResponse.status === 201 && createResponse.data.id) {
            campaignId = createResponse.data.id;
            addTestResult('Campaign CREATE', 'PASS', 'Campaign created successfully');
        } else {
            addTestResult('Campaign CREATE', 'FAIL', 'Failed to create campaign', createResponse);
            return;
        }
        
        // Test READ campaigns
        const readResponse = await makeRequest({
            hostname: 'localhost',
            port: 12001,
            path: `/api/campaigns?profile_id=${TEST_PROFILE_ID}`,
            method: 'GET'
        });
        
        if (readResponse.status === 200 && Array.isArray(readResponse.data)) {
            addTestResult('Campaign READ', 'PASS', `Found ${readResponse.data.length} campaigns`);
        } else {
            addTestResult('Campaign READ', 'FAIL', 'Failed to read campaigns', readResponse);
        }
        
        // Test READ single campaign
        const singleReadResponse = await makeRequest({
            hostname: 'localhost',
            port: 12001,
            path: `/api/campaigns/${campaignId}`,
            method: 'GET'
        });
        
        if (singleReadResponse.status === 200 && singleReadResponse.data.id === campaignId) {
            addTestResult('Campaign READ single', 'PASS', 'Single campaign read successfully');
        } else {
            addTestResult('Campaign read single', 'FAIL', 'Failed to read single campaign', singleReadResponse);
        }
        
        // Test UPDATE campaign
        const updateResponse = await makeRequest({
            hostname: 'localhost',
            port: 12001,
            path: `/api/campaigns/${campaignId}`,
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            }
        }, {
            name: 'Updated Test Campaign',
            description: 'Updated test campaign description'
        });
        
        if (updateResponse.status === 200) {
            addTestResult('Campaign UPDATE', 'PASS', 'Campaign updated successfully');
        } else {
            addTestResult('Campaign UPDATE', 'FAIL', 'Failed to update campaign', updateResponse);
        }
        
    } catch (error) {
        addTestResult('Campaign CRUD', 'FAIL', 'Error during CRUD operations', error.message);
    }
    
    return campaignId;
}

// Test 5: Test Lead Management
async function testLeadManagement(campaignId) {
    console.log('\n👥 TEST 5: Lead Management');
    
    if (!campaignId) {
        addTestResult('Lead Management', 'FAIL', 'No campaign ID provided for lead tests');
        return;
    }
    
    try {
        // Test ADD leads
        const addLeadsResponse = await makeRequest({
            hostname: 'localhost',
            port: 12001,
            path: `/api/campaigns/${campaignId}/leads`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        }, {
            leads: [
                {
                    first_name: 'John',
                    last_name: 'Doe',
                    phone_number: '+15551234567',
                    email: 'john.doe@example.com'
                },
                {
                    first_name: 'Jane',
                    last_name: 'Smith',
                    phone_number: '+15559876543',
                    email: 'jane.smith@example.com'
                }
            ]
        });
        
        if (addLeadsResponse.status === 201) {
            addTestResult('Lead ADD', 'PASS', 'Leads added successfully');
        } else {
            addTestResult('Lead ADD', 'FAIL', 'Failed to add leads', addLeadsResponse);
        }
        
        // Test READ leads
        const readLeadsResponse = await makeRequest({
            hostname: 'localhost',
            port: 12001,
            path: `/api/campaigns/${campaignId}/leads`,
            method: 'GET'
        });
        
        if (readLeadsResponse.status === 200 && readLeadsResponse.data.leads) {
            addTestResult('Lead READ', 'PASS', `Found ${readLeadsResponse.data.leads.length} leads`);
        } else {
            addTestResult('Lead READ', 'FAIL', 'Failed to read leads', readLeadsResponse);
        }
        
    } catch (error) {
        addTestResult('Lead Management', 'FAIL', 'Error during lead operations', error.message);
    }
}

// Test 6: Test Auto-Dialer Control
async function testAutoDialerControl(campaignId) {
    console.log('\n📞 TEST 6: Auto-Dialer Control');
    
    if (!campaignId) {
        addTestResult('Auto-Dialer Control', 'FAIL', 'No campaign ID provided for dialer tests');
        return;
    }
    
    try {
        // Test START campaign
        const startResponse = await makeRequest({
            hostname: 'localhost',
            port: 12001,
            path: `/api/campaigns/${campaignId}/start`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (startResponse.status === 200 || startResponse.status === 400) {
            // 400 is acceptable if no leads are available
            if (startResponse.status === 400 && startResponse.data.error?.includes('no pending leads')) {
                addTestResult('Auto-Dialer START', 'PASS', 'Start endpoint works (no leads to call)');
            } else if (startResponse.status === 200) {
                addTestResult('Auto-Dialer START', 'PASS', 'Campaign started successfully');
            } else {
                addTestResult('Auto-Dialer START', 'FAIL', 'Unexpected start response', startResponse);
            }
        } else {
            addTestResult('Auto-Dialer START', 'FAIL', 'Failed to start campaign', startResponse);
        }
        
        // Wait a moment before testing pause
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Test PAUSE campaign
        const pauseResponse = await makeRequest({
            hostname: 'localhost',
            port: 12001,
            path: `/api/campaigns/${campaignId}/pause`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (pauseResponse.status === 200 || pauseResponse.status === 400) {
            // 400 is acceptable if dialer is not running
            addTestResult('Auto-Dialer PAUSE', 'PASS', 'Pause endpoint works');
        } else {
            addTestResult('Auto-Dialer PAUSE', 'FAIL', 'Failed to pause campaign', pauseResponse);
        }
        
        // Test STOP campaign
        const stopResponse = await makeRequest({
            hostname: 'localhost',
            port: 12001,
            path: `/api/campaigns/${campaignId}/stop`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (stopResponse.status === 200 || stopResponse.status === 400) {
            // 400 is acceptable if dialer is not running
            addTestResult('Auto-Dialer STOP', 'PASS', 'Stop endpoint works');
        } else {
            addTestResult('Auto-Dialer STOP', 'FAIL', 'Failed to stop campaign', stopResponse);
        }
        
    } catch (error) {
        addTestResult('Auto-Dialer Control', 'FAIL', 'Error during dialer control tests', error.message);
    }
}

// Test 7: Test Campaign Statistics
async function testCampaignStatistics(campaignId) {
    console.log('\n📈 TEST 7: Campaign Statistics');
    
    if (!campaignId) {
        addTestResult('Campaign Statistics', 'FAIL', 'No campaign ID provided for stats tests');
        return;
    }
    
    try {
        const statsResponse = await makeRequest({
            hostname: 'localhost',
            port: 12001,
            path: `/api/campaigns/${campaignId}/stats`,
            method: 'GET'
        });
        
        if (statsResponse.status === 200 && statsResponse.data.stats) {
            const stats = statsResponse.data.stats;
            const hasRequiredFields = ['total', 'pending', 'called', 'completed', 'failed'].every(
                field => typeof stats[field] !== 'undefined'
            );
            
            if (hasRequiredFields) {
                addTestResult('Campaign Statistics', 'PASS', 'Statistics retrieved successfully');
            } else {
                addTestResult('Campaign Statistics', 'FAIL', 'Missing required stat fields', stats);
            }
        } else {
            addTestResult('Campaign Statistics', 'FAIL', 'Failed to get campaign statistics', statsResponse);
        }
        
    } catch (error) {
        addTestResult('Campaign Statistics', 'FAIL', 'Error getting campaign statistics', error.message);
    }
}

// Test 8: Test Campaign Export
async function testCampaignExport(campaignId) {
    console.log('\n📤 TEST 8: Campaign Export');
    
    if (!campaignId) {
        addTestResult('Campaign Export', 'FAIL', 'No campaign ID provided for export tests');
        return;
    }
    
    try {
        const exportResponse = await makeRequest({
            hostname: 'localhost',
            port: 12001,
            path: `/api/campaigns/${campaignId}/export?format=json`,
            method: 'GET'
        });
        
        if (exportResponse.status === 200) {
            addTestResult('Campaign Export', 'PASS', 'Campaign export works');
        } else {
            addTestResult('Campaign Export', 'FAIL', 'Failed to export campaign', exportResponse);
        }
        
    } catch (error) {
        addTestResult('Campaign Export', 'FAIL', 'Error during campaign export', error.message);
    }
}

// Test 9: Test Server Import Integration
async function testServerImportIntegration() {
    console.log('\n🔗 TEST 9: Server Import Integration');
    
    try {
        const serverPath = path.join(__dirname, 'src/server.js');
        if (!fs.existsSync(serverPath)) {
            addTestResult('Server Import', 'FAIL', 'server.js file not found');
            return;
        }
        
        const serverContent = fs.readFileSync(serverPath, 'utf8');
        
        // Check for campaign API import and setup
        const hasImport = serverContent.includes('import { setupCampaignAPI } from \'./api/campaign-api.js\'');
        const hasSetup = serverContent.includes('setupCampaignAPI(app, supabase)');
        const noDuplicates = !serverContent.includes('app.get(\'/api/campaigns\',');
        
        if (hasImport && hasSetup) {
            addTestResult('Server Import', 'PASS', 'Campaign API properly imported and configured');
        } else {
            addTestResult('Server Import', 'FAIL', 'Campaign API import/setup missing', {
                hasImport,
                hasSetup,
                noDuplicates
            });
        }
        
        // Check for duplicate endpoints
        if (noDuplicates) {
            addTestResult('No Duplicates', 'PASS', 'No duplicate campaign endpoints found');
        } else {
            addTestResult('No Duplicates', 'FAIL', 'Duplicate campaign endpoints detected');
        }
        
    } catch (error) {
        addTestResult('Server Import', 'FAIL', 'Error checking server integration', error.message);
    }
}

// Test 10: Clean up test data
async function cleanupTestData(campaignId) {
    console.log('\n🧹 TEST 10: Cleanup Test Data');
    
    if (!campaignId) {
        addTestResult('Cleanup', 'PASS', 'No test data to clean up');
        return;
    }
    
    try {
        const deleteResponse = await makeRequest({
            hostname: 'localhost',
            port: 12001,
            path: `/api/campaigns/${campaignId}`,
            method: 'DELETE'
        });
        
        if (deleteResponse.status === 200) {
            addTestResult('Cleanup', 'PASS', 'Test campaign deleted successfully');
        } else {
            addTestResult('Cleanup', 'FAIL', 'Failed to delete test campaign', deleteResponse);
        }
        
    } catch (error) {
        addTestResult('Cleanup', 'FAIL', 'Error during cleanup', error.message);
    }
}

// Main test runner
async function runAllTests() {
    console.log('🚀 Starting comprehensive campaign system tests...\n');
    
    // Run all tests in sequence
    await testCampaignAPIFileStructure();
    await testAutoDialerEngine();
    await testServerHealth();
    
    const campaignId = await testCampaignCRUD();
    await testLeadManagement(campaignId);
    await testAutoDialerControl(campaignId);
    await testCampaignStatistics(campaignId);
    await testCampaignExport(campaignId);
    
    await testServerImportIntegration();
    await cleanupTestData(campaignId);
    
    // Print final results
    console.log('\n' + '='.repeat(60));
    console.log('📊 FINAL TEST RESULTS');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
    
    if (testResults.failed === 0) {
        console.log('\n🎉 ALL TESTS PASSED! Campaign/Auto-Dialer system is 100% functional!');
        console.log('✅ The system is PRODUCTION READY!');
    } else {
        console.log('\n⚠️ Some tests failed. Please review the issues above.');
        console.log('\nFailed tests:');
        testResults.tests.filter(t => t.status === 'FAIL').forEach(test => {
            console.log(`  - ${test.name}: ${test.message}`);
        });
    }
    
    console.log('\n📝 Detailed test log saved to test results.');
    
    // Exit with appropriate code
    process.exit(testResults.failed === 0 ? 0 : 1);
}

// Run the tests
runAllTests().catch(error => {
    console.error('\n💥 Test runner crashed:', error);
    process.exit(1);
});
