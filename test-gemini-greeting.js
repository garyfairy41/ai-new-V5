#!/usr/bin/env node

/**
 * Comprehensive test to diagnose why Gemini is not speaking first
 * Tests the entire greeting pipeline from file load to Gemini response
 */

import fs from 'fs';
import path from 'path';
import { GeminiLiveOfficial } from './packages/server/src/gemini-live-official.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Simple AudioConverter for testing
class AudioConverter {
    static convertWavToPCM24k(wavBuffer) {
        try {
            console.log('🎵 Converting WAV to PCM24k...');
            console.log(`  Input buffer size: ${wavBuffer.length} bytes`);
            
            // Parse WAV header
            const header = {
                riff: wavBuffer.toString('ascii', 0, 4),
                fileSize: wavBuffer.readUInt32LE(4),
                wave: wavBuffer.toString('ascii', 8, 12),
                fmt: wavBuffer.toString('ascii', 12, 16),
                fmtSize: wavBuffer.readUInt32LE(16),
                audioFormat: wavBuffer.readUInt16LE(20),
                channels: wavBuffer.readUInt16LE(22),
                sampleRate: wavBuffer.readUInt32LE(24),
                byteRate: wavBuffer.readUInt32LE(28),
                blockAlign: wavBuffer.readUInt16LE(32),
                bitsPerSample: wavBuffer.readUInt16LE(34)
            };
            
            console.log('  WAV Header:', header);
            
            // Validate WAV format
            if (header.riff !== 'RIFF' || header.wave !== 'WAVE') {
                throw new Error('Invalid WAV file format');
            }
            
            // Find data chunk
            let dataOffset = 44; // Standard WAV header size
            let dataChunkSize = wavBuffer.readUInt32LE(40);
            
            // Skip to actual PCM data
            const pcmData = wavBuffer.slice(dataOffset, dataOffset + dataChunkSize);
            console.log(`  PCM data size: ${pcmData.length} bytes`);
            
            // Convert to 16-bit signed integers
            const samples = new Int16Array(pcmData.buffer, pcmData.byteOffset, pcmData.byteLength / 2);
            console.log(`  Number of samples: ${samples.length}`);
            
            // Calculate duration
            const durationMs = (samples.length / header.channels / header.sampleRate) * 1000;
            console.log(`  Duration: ${durationMs.toFixed(2)}ms`);
            
            // Downsample to 24kHz if needed
            let finalSamples = samples;
            if (header.sampleRate !== 24000) {
                const ratio = header.sampleRate / 24000;
                const newLength = Math.floor(samples.length / ratio);
                finalSamples = new Int16Array(newLength);
                
                for (let i = 0; i < newLength; i++) {
                    const srcIndex = Math.floor(i * ratio);
                    finalSamples[i] = samples[srcIndex];
                }
                
                console.log(`  Downsampled from ${header.sampleRate}Hz to 24000Hz`);
                console.log(`  Final samples: ${finalSamples.length}`);
            }
            
            // Convert to mono if stereo
            if (header.channels === 2) {
                const monoLength = Math.floor(finalSamples.length / 2);
                const monoSamples = new Int16Array(monoLength);
                
                for (let i = 0; i < monoLength; i++) {
                    monoSamples[i] = Math.floor((finalSamples[i * 2] + finalSamples[i * 2 + 1]) / 2);
                }
                
                finalSamples = monoSamples;
                console.log(`  Converted to mono: ${finalSamples.length} samples`);
            }
            
            // Convert to base64
            const buffer = Buffer.from(finalSamples.buffer);
            const base64 = buffer.toString('base64');
            
            console.log(`  Final base64 size: ${base64.length} characters`);
            console.log(`  ✅ WAV conversion successful`);
            
            return base64;
        } catch (error) {
            console.error('❌ Error converting WAV to PCM24k:', error);
            return null;
        }
    }
}

async function testGeminiGreeting() {
    console.log('🧪 Starting Gemini Greeting Test\n');
    
    // Test 1: Check environment variables
    console.log('1️⃣ Testing Environment Variables...');
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('❌ GEMINI_API_KEY not found in environment');
        return;
    }
    console.log('✅ GEMINI_API_KEY is configured');
    
    // Test 2: Check greeting file
    console.log('\n2️⃣ Testing Greeting File...');
    const greetingPath = path.join(process.cwd(), 'record_out (1).wav');
    console.log(`Looking for greeting file at: ${greetingPath}`);
    
    if (!fs.existsSync(greetingPath)) {
        console.error('❌ Greeting file not found');
        return;
    }
    
    const wavBuffer = fs.readFileSync(greetingPath);
    console.log(`✅ Greeting file loaded: ${wavBuffer.length} bytes`);
    
    // Test 3: Test audio conversion
    console.log('\n3️⃣ Testing Audio Conversion...');
    const pcmBase64 = AudioConverter.convertWavToPCM24k(wavBuffer);
    
    if (!pcmBase64) {
        console.error('❌ Audio conversion failed');
        return;
    }
    
    console.log('✅ Audio conversion successful');
    
    // Test 4: Test Gemini client creation
    console.log('\n4️⃣ Testing Gemini Client Creation...');
    
    let geminiClient;
    let geminiReady = false;
    let geminiResponded = false;
    let responseReceived = false;
    
    const config = {
        apiKey: apiKey,
        model: 'gemini-2.0-flash-live-001',
        speechConfig: {
            voiceConfig: { 
                prebuiltVoiceConfig: { 
                    voiceName: 'Puck'
                } 
            },
            languageCode: 'en-US'
        },
        systemInstruction: {
            parts: [{ 
                text: 'You are a helpful AI assistant. When you receive audio input, please respond with a greeting. Always speak first after receiving audio input.'
            }]
        },
        
        onServerContent: (serverContent) => {
            console.log('📥 Received from Gemini:', JSON.stringify(serverContent, null, 2));
            responseReceived = true;
            
            // Check for audio response
            if (serverContent.serverContent?.modelTurn?.parts) {
                for (const part of serverContent.serverContent.modelTurn.parts) {
                    if (part.inlineData?.mimeType?.startsWith('audio/') && part.inlineData.data) {
                        console.log('🎵 ✅ GEMINI RESPONDED WITH AUDIO!');
                        console.log(`   Audio data length: ${part.inlineData.data.length}`);
                        console.log(`   MIME type: ${part.inlineData.mimeType}`);
                        geminiResponded = true;
                    }
                    
                    if (part.text) {
                        console.log('💬 Gemini text response:', part.text);
                    }
                }
            }
            
            // Check for transcriptions
            if (serverContent.serverContent?.inputTranscription) {
                console.log('🎤 Input transcription:', serverContent.serverContent.inputTranscription.text);
            }
            
            if (serverContent.serverContent?.outputTranscription) {
                console.log('🔊 Output transcription:', serverContent.serverContent.outputTranscription.text);
            }
        },
        
        onReady: () => {
            console.log('✅ Gemini client ready');
            geminiReady = true;
        },
        
        onError: (error) => {
            console.error('❌ Gemini client error:', error);
        },
        
        onClose: () => {
            console.log('🔌 Gemini client closed');
        }
    };
    
    try {
        geminiClient = new GeminiLiveOfficial(config);
        console.log('✅ Gemini client created');
        
        // Test 5: Connect to Gemini
        console.log('\n5️⃣ Testing Gemini Connection...');
        await geminiClient.connect();
        console.log('✅ Gemini connection initiated');
        
        // Wait for ready
        console.log('⏳ Waiting for Gemini to be ready...');
        const readyTimeout = setTimeout(() => {
            if (!geminiReady) {
                console.error('❌ Timeout waiting for Gemini to be ready');
            }
        }, 10000);
        
        while (!geminiReady) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        clearTimeout(readyTimeout);
        
        // Test 6: Send greeting audio
        console.log('\n6️⃣ Testing Greeting Audio Send...');
        console.log('🎵 Sending greeting audio to Gemini...');
        
        try {
            await geminiClient.sendAudio(pcmBase64);
            console.log('✅ Greeting audio sent successfully');
        } catch (error) {
            console.error('❌ Error sending greeting audio:', error);
        }
        
        // Test 7: Wait for response
        console.log('\n7️⃣ Waiting for Gemini Response...');
        console.log('⏳ Waiting up to 15 seconds for Gemini to respond...');
        
        const responseTimeout = setTimeout(() => {
            if (!responseReceived) {
                console.error('❌ Timeout - No response received from Gemini');
            }
            if (!geminiResponded) {
                console.error('❌ Gemini did not respond with audio');
            }
        }, 15000);
        
        // Wait for response
        let waitTime = 0;
        while (!responseReceived && waitTime < 15000) {
            await new Promise(resolve => setTimeout(resolve, 500));
            waitTime += 500;
        }
        
        clearTimeout(responseTimeout);
        
        // Test 8: Results
        console.log('\n8️⃣ Test Results Summary:');
        console.log(`   Environment: ${apiKey ? '✅' : '❌'}`);
        console.log(`   Greeting file: ${fs.existsSync(greetingPath) ? '✅' : '❌'}`);
        console.log(`   Audio conversion: ${pcmBase64 ? '✅' : '❌'}`);
        console.log(`   Gemini client: ${geminiClient ? '✅' : '❌'}`);
        console.log(`   Gemini ready: ${geminiReady ? '✅' : '❌'}`);
        console.log(`   Audio sent: ✅`);
        console.log(`   Response received: ${responseReceived ? '✅' : '❌'}`);
        console.log(`   Audio response: ${geminiResponded ? '✅' : '❌'}`);
        
        if (geminiResponded) {
            console.log('\n🎉 SUCCESS: Gemini responded with audio!');
        } else {
            console.log('\n❌ FAILURE: Gemini did not respond with audio');
            console.log('   This suggests the issue is with:');
            console.log('   - Audio format compatibility');
            console.log('   - Gemini API configuration');
            console.log('   - System instruction not prompting speech');
            console.log('   - Need to signal turn completion');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        // Clean up
        if (geminiClient) {
            try {
                geminiClient.close();
            } catch (error) {
                console.error('Error closing Gemini client:', error);
            }
        }
    }
}

// Test agent "Michael" database issue
async function testAgentMichael() {
    console.log('\n🔍 Testing Agent "Michael" Database Issue...');
    
    try {
        // Import Supabase client
        const { createClient } = await import('@supabase/supabase-js');
        
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        
        if (!supabaseUrl || !supabaseKey) {
            console.error('❌ Supabase credentials not configured');
            return;
        }
        
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        // Test 1: Check all agents
        console.log('\n1️⃣ Checking all agents in database...');
        const { data: allAgents, error: allError } = await supabase
            .from('ai_agents')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (allError) {
            console.error('❌ Error fetching all agents:', allError);
            return;
        }
        
        console.log(`✅ Found ${allAgents.length} total agents`);
        
        // Test 2: Look for Michael specifically
        console.log('\n2️⃣ Searching for agent "Michael"...');
        const michaelAgents = allAgents.filter(agent => 
            agent.name && agent.name.toLowerCase().includes('michael')
        );
        
        if (michaelAgents.length === 0) {
            console.log('❌ No agent named "Michael" found');
            
            // Show all agent names
            console.log('\n📋 All agent names in database:');
            allAgents.forEach((agent, index) => {
                console.log(`   ${index + 1}. ${agent.name} (ID: ${agent.id})`);
            });
            
            // Test 3: Check if agent exists but has different name
            console.log('\n3️⃣ Checking for similar names...');
            const similarNames = allAgents.filter(agent => 
                agent.name && (
                    agent.name.toLowerCase().includes('mike') ||
                    agent.name.toLowerCase().includes('mich') ||
                    agent.name.toLowerCase().includes('michael')
                )
            );
            
            if (similarNames.length > 0) {
                console.log('✅ Found similar names:');
                similarNames.forEach(agent => {
                    console.log(`   - ${agent.name} (ID: ${agent.id})`);
                });
            } else {
                console.log('❌ No similar names found');
            }
            
        } else {
            console.log(`✅ Found ${michaelAgents.length} agent(s) named "Michael"`);
            michaelAgents.forEach(agent => {
                console.log(`   - ${agent.name} (ID: ${agent.id}, Active: ${agent.is_active})`);
            });
        }
        
        // Test 4: Check agent routing
        console.log('\n4️⃣ Testing agent routing...');
        try {
            const { AgentRoutingService } = await import('./packages/server/src/agent-routing-service.js');
            const agentRouter = new AgentRoutingService();
            
            const routingResult = await agentRouter.routeIncomingCall({
                CallSid: 'test-call-michael',
                From: '+15551234567',
                To: '+18186006909'
            });
            
            console.log('✅ Agent routing test result:');
            console.log(`   Selected agent: ${routingResult.agent.name}`);
            console.log(`   Agent ID: ${routingResult.agent.id}`);
            console.log(`   Routing reason: ${routingResult.routing.action}`);
            
        } catch (error) {
            console.error('❌ Error testing agent routing:', error);
        }
        
    } catch (error) {
        console.error('❌ Error testing agent Michael:', error);
    }
}

// Main test function
async function main() {
    console.log('🧪 AI Call Center Diagnostic Test Suite\n');
    console.log('=' .repeat(60));
    
    // Test Gemini greeting issue
    await testGeminiGreeting();
    
    console.log('\n' + '=' .repeat(60));
    
    // Test agent Michael issue
    await testAgentMichael();
    
    console.log('\n' + '=' .repeat(60));
    console.log('🏁 Test suite completed');
}

// Run the tests
main().catch(console.error);
