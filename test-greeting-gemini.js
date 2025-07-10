#!/usr/bin/env node

/**
 * Test script to verify Gemini greeting behavior
 * This will test sending the greeting audio directly to Gemini and verify response
 */

import fs from 'fs';
import path from 'path';
import { GoogleGenAI, Modality } from '@google/genai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// AudioConverter class (copied from server.js for testing)
class AudioConverter {
    static convertWavToPCM24k(wavBuffer) {
        try {
            // Parse WAV header to get sample rate and other info
            const riffHeader = wavBuffer.toString('ascii', 0, 4);
            if (riffHeader !== 'RIFF') {
                console.error('❌ Invalid WAV file: Missing RIFF header');
                return null;
            }
            
            const waveHeader = wavBuffer.toString('ascii', 8, 12);
            if (waveHeader !== 'WAVE') {
                console.error('❌ Invalid WAV file: Missing WAVE header');
                return null;
            }
            
            // Find the fmt chunk to get audio format info
            let offset = 12;
            let fmtChunkFound = false;
            let sampleRate = 0;
            let channels = 0;
            let bitsPerSample = 0;
            let dataOffset = 0;
            
            while (offset < wavBuffer.length - 8) {
                const chunkType = wavBuffer.toString('ascii', offset, offset + 4);
                const chunkSize = wavBuffer.readUInt32LE(offset + 4);
                
                if (chunkType === 'fmt ') {
                    // Parse fmt chunk
                    const audioFormat = wavBuffer.readUInt16LE(offset + 8);
                    channels = wavBuffer.readUInt16LE(offset + 10);
                    sampleRate = wavBuffer.readUInt32LE(offset + 12);
                    bitsPerSample = wavBuffer.readUInt16LE(offset + 22);
                    
                    console.log(`📊 WAV file info: ${sampleRate}Hz, ${channels} channels, ${bitsPerSample} bits`);
                    
                    if (audioFormat !== 1) {
                        console.error('❌ Only PCM WAV files are supported');
                        return null;
                    }
                    
                    if (bitsPerSample !== 16) {
                        console.error('❌ Only 16-bit WAV files are supported');
                        return null;
                    }
                    
                    fmtChunkFound = true;
                } else if (chunkType === 'data') {
                    dataOffset = offset + 8;
                    break;
                }
                
                offset += 8 + chunkSize;
            }
            
            if (!fmtChunkFound || dataOffset === 0) {
                console.error('❌ Invalid WAV file: Missing fmt or data chunks');
                return null;
            }
            
            // Extract PCM data
            const pcmData = wavBuffer.slice(dataOffset);
            const samples = new Int16Array(pcmData.buffer, pcmData.byteOffset, pcmData.byteLength / 2);
            
            console.log(`🔊 Original audio: ${samples.length} samples at ${sampleRate}Hz`);
            
            // Convert to mono if stereo
            let monoSamples = samples;
            if (channels === 2) {
                console.log('🔄 Converting stereo to mono...');
                monoSamples = new Int16Array(samples.length / 2);
                for (let i = 0; i < monoSamples.length; i++) {
                    monoSamples[i] = Math.round((samples[i * 2] + samples[i * 2 + 1]) / 2);
                }
            }
            
            // Resample to 24kHz if needed
            let targetSamples = monoSamples;
            if (sampleRate !== 24000) {
                console.log(`🔄 Resampling from ${sampleRate}Hz to 24000Hz...`);
                const ratio = sampleRate / 24000;
                const targetLength = Math.floor(monoSamples.length / ratio);
                targetSamples = new Int16Array(targetLength);
                
                for (let i = 0; i < targetLength; i++) {
                    const sourceIndex = Math.floor(i * ratio);
                    targetSamples[i] = monoSamples[sourceIndex];
                }
            }
            
            console.log(`✅ Final audio: ${targetSamples.length} samples at 24000Hz, ${(targetSamples.length / 24000).toFixed(2)}s duration`);
            
            // Convert to base64
            const buffer = Buffer.from(targetSamples.buffer);
            return buffer.toString('base64');
        } catch (error) {
            console.error('❌ Error converting WAV to PCM24k:', error);
            return null;
        }
    }
}

async function testGeminiGreeting() {
    console.log('🧪 Starting Gemini greeting test...');
    
    try {
        // Check if greeting file exists
        const greetingPath = path.join(process.cwd(), 'record_out (1).wav');
        console.log(`📂 Looking for greeting file at: ${greetingPath}`);
        
        if (!fs.existsSync(greetingPath)) {
            console.error('❌ Greeting file not found!');
            return;
        }
        
        // Load and convert greeting
        const wavBuffer = fs.readFileSync(greetingPath);
        console.log(`📁 Loaded greeting WAV file: ${wavBuffer.length} bytes`);
        
        const pcmBase64 = AudioConverter.convertWavToPCM24k(wavBuffer);
        if (!pcmBase64) {
            console.error('❌ Failed to convert greeting WAV to PCM');
            return;
        }
        
        console.log(`🎵 Converted greeting to PCM base64: ${pcmBase64.length} characters`);
        
        // Set up Gemini client using official Google GenAI
        console.log('🤖 Setting up Gemini Live client...');
        
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const model = 'gemini-2.0-flash-live-001';
        const config = { 
            responseModalities: [Modality.AUDIO],
            systemInstruction: {
                parts: [{ 
                    text: 'You are a professional AI assistant for customer service calls. Wait for the caller to speak first, then respond naturally and professionally. Be helpful, polite, and efficient. Listen actively and respond appropriately to what the caller says.'
                }]
            }
        };
        
        let geminiResponded = false;
        let geminiReady = false;
        const responseQueue = [];
        
        async function waitMessage() {
            let done = false;
            let message = undefined;
            while (!done) {
                message = responseQueue.shift();
                if (message) {
                    done = true;
                } else {
                    await new Promise((resolve) => setTimeout(resolve, 100));
                }
            }
            return message;
        }
        
        async function handleTurn() {
            const turns = [];
            let done = false;
            while (!done) {
                const message = await waitMessage();
                turns.push(message);
                if (message.serverContent && message.serverContent.turnComplete) {
                    done = true;
                }
            }
            return turns;
        }
        
        const session = await ai.live.connect({
            model: model,
            callbacks: {
                onopen: function () {
                    console.log('✅ Gemini Live client connected and ready!');
                    geminiReady = true;
                },
                onmessage: function (message) {
                    console.log('🤖 Received from Gemini:', JSON.stringify(message, null, 2));
                    responseQueue.push(message);
                    
                    // Check for audio response
                    if (message.data) {
                        console.log('� ✅ GEMINI RESPONDED WITH AUDIO!');
                        console.log(`🎵 Audio data length: ${message.data.length}`);
                        geminiResponded = true;
                    }
                    
                    if (message.text) {
                        console.log('💬 Gemini text response:', message.text);
                    }
                },
                onerror: function (error) {
                    console.error('❌ Gemini error:', error);
                },
                onclose: function (e) {
                    console.log('🔌 Gemini connection closed:', e.reason);
                }
            },
            config: config
        });
        
        // Wait for ready
        console.log('⏳ Waiting for Gemini to be ready...');
        while (!geminiReady) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.log('✅ Gemini is ready! Sending greeting audio...');
        
        // Send the greeting audio using the official Live API pattern
        try {
            // Send audio data
            await session.sendRealtimeInput({
                audio: { 
                    data: pcmBase64,
                    mimeType: "audio/pcm;rate=24000" 
                }
            });
            console.log('🎵 ✅ Greeting audio sent to Gemini');
            
            // Wait a moment then signal end of audio stream
            await new Promise(resolve => setTimeout(resolve, 500));
            
            console.log('🔄 Sending audio stream end signal...');
            await session.sendRealtimeInput({ audioStreamEnd: true });
            console.log('🔄 Audio stream end signal sent - Gemini should respond now');
            
        } catch (audioError) {
            console.error('❌ Error sending audio to Gemini:', audioError);
        }
        
        // Wait for response
        console.log('⏳ Waiting for Gemini response...');
        let waitTime = 0;
        const maxWaitTime = 10000; // 10 seconds
        
        while (!geminiResponded && waitTime < maxWaitTime) {
            await new Promise(resolve => setTimeout(resolve, 500));
            waitTime += 500;
            
            if (waitTime % 2000 === 0) {
                console.log(`⏳ Still waiting... (${waitTime/1000}s)`);
            }
        }
        
        if (geminiResponded) {
            console.log('🎉 SUCCESS: Gemini responded to the greeting!');
        } else {
            console.log('❌ FAILURE: Gemini did not respond to the greeting within 10 seconds');
            console.log('🤔 This suggests the issue might be:');
            console.log('   1. The audio format is incorrect');
            console.log('   2. The greeting content is not triggering a response');
            console.log('   3. Turn completion signaling is missing');
            console.log('   4. The system instruction is preventing responses');
        }
        
        // Clean up
        setTimeout(() => {
            session.close();
            console.log('🧪 Test completed');
            process.exit(0);
        }, 2000);
        
    } catch (error) {
        console.error('❌ Test error:', error);
        process.exit(1);
    }
}

// Run the test
testGeminiGreeting().catch(error => {
    console.error('❌ Fatal test error:', error);
    process.exit(1);
});
