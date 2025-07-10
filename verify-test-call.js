#!/usr/bin/env node

/**
 * Verification script for test call functionality
 * This script verifies that the test call feature matches the Twilio Node.js outbound call guide
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying test call implementation against Twilio Node.js guide...\n');

// Read the server.js file
const serverFile = path.join(__dirname, 'packages/server/src/server.js');
const serverContent = fs.readFileSync(serverFile, 'utf8');

// Check 1: Test call API endpoint exists
const testCallApiRegex = /app\.post\(['"]\/api\/test-call['"], async \(req, res\) => {/;
const hasTestCallApi = testCallApiRegex.test(serverContent);
console.log(`✅ Test call API endpoint exists: ${hasTestCallApi}`);

// Check 2: Twilio call creation follows guide
const twilioCallRegex = /twilioClient\.calls\.create\(\{[\s\S]*?from:[\s\S]*?to:[\s\S]*?url:[\s\S]*?\}\)/;
const hasProperCallCreation = twilioCallRegex.test(serverContent);
console.log(`✅ Twilio call creation follows guide: ${hasProperCallCreation}`);

// Check 3: TwiML webhook endpoint exists
const twimlWebhookRegex = /app\.post\(['"]\/webhook\/test-call-twiml['"], \(req, res\) => {/;
const hasTwimlWebhook = twimlWebhookRegex.test(serverContent);
console.log(`✅ TwiML webhook endpoint exists: ${hasTwimlWebhook}`);

// Check 4: TwiML response structure
const twimlResponseRegex = /const twiml = new twilio\.twiml\.VoiceResponse\(\);[\s\S]*?twiml\.say\([\s\S]*?\);[\s\S]*?twiml\.hangup\(\);[\s\S]*?res\.type\(['"]text\/xml['"]\);[\s\S]*?res\.send\(twiml\.toString\(\)\);/;
const hasProperTwimlResponse = twimlResponseRegex.test(serverContent);
console.log(`✅ TwiML response structure is correct: ${hasProperTwimlResponse}`);

// Check 5: Error handling in API
const errorHandlingRegex = /try {[\s\S]*?} catch \(error\) {[\s\S]*?console\.error[\s\S]*?res\.status\(500\)\.json\(/;
const hasErrorHandling = errorHandlingRegex.test(serverContent);
console.log(`✅ Error handling implemented: ${hasErrorHandling}`);

// Check 6: Required parameters validation
const paramValidationRegex = /if \(!to\) {[\s\S]*?return res\.status\(400\)\.json\(/;
const hasParamValidation = paramValidationRegex.test(serverContent);
console.log(`✅ Parameter validation implemented: ${hasParamValidation}`);

// Check 7: Environment variable validation
const envValidationRegex = /if \(!accountSid \|\| !authToken\) {[\s\S]*?return res\.status\(500\)\.json\(/;
const hasEnvValidation = envValidationRegex.test(serverContent);
console.log(`✅ Environment variable validation: ${hasEnvValidation}`);

// Summary
console.log('\n📊 VERIFICATION SUMMARY:');
const allChecks = [
    hasTestCallApi,
    hasProperCallCreation,
    hasTwimlWebhook,
    hasProperTwimlResponse,
    hasErrorHandling,
    hasParamValidation,
    hasEnvValidation
];

const passedChecks = allChecks.filter(Boolean).length;
const totalChecks = allChecks.length;

console.log(`✅ Passed: ${passedChecks}/${totalChecks} checks`);

if (passedChecks === totalChecks) {
    console.log('🎉 All checks passed! Test call implementation follows Twilio Node.js guide.');
    console.log('\n📝 IMPLEMENTATION DETAILS:');
    console.log('- Test call API endpoint: POST /api/test-call');
    console.log('- TwiML webhook endpoint: POST /webhook/test-call-twiml');
    console.log('- Follows Twilio outbound call pattern: create call → TwiML webhook → voice response');
    console.log('- Includes proper error handling and validation');
    console.log('- Uses VoiceResponse with Say and Hangup verbs');
    console.log('- Returns proper XML content type');
} else {
    console.log('❌ Some checks failed. Please review the implementation.');
}

console.log('\n🔗 Reference: https://www.twilio.com/docs/voice/tutorials/how-to-make-outbound-phone-calls/node');
