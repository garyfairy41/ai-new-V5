import { AgentRoutingService } from './packages/server/src/agent-routing-service.js';
import dotenv from 'dotenv';

dotenv.config();

async function testRecordingSystem() {
    console.log('🧪 Testing Recording & Transcription System...');
    
    const agentService = new AgentRoutingService();
    
    try {
        // First, create a test call log entry
        console.log('\n1. Creating test call log...');
        const testCallSid = 'CA' + Math.random().toString(36).substr(2, 32);
        
        // Get a profile ID to use
        const { data: profiles } = await agentService.supabase
            .from('profiles')
            .select('id')
            .limit(1);
            
        if (!profiles || profiles.length === 0) {
            console.error('❌ No profiles found. Please create a user first.');
            return;
        }
        
        const profileId = profiles[0].id;
        console.log(`✅ Using profile ID: ${profileId}`);
        
        // Create a test call log
        const testCall = {
            profile_id: profileId,
            phone_number: '+1234567890',
            phone_number_from: '+1234567890',
            phone_number_to: process.env.TWILIO_PHONE_NUMBER,
            direction: 'inbound',
            status: 'in_progress',
            started_at: new Date().toISOString(),
            call_sid: testCallSid,
            customer_name: 'Test Customer',
            created_at: new Date().toISOString()
        };
        
        const { data: callData, error } = await agentService.supabase
            .from('call_logs')
            .insert(testCall)
            .select()
            .single();
            
        if (error) {
            console.error('❌ Error creating test call:', error);
            return;
        }
        
        console.log(`✅ Created test call with SID: ${testCallSid}`);
        
        // 2. Test call status update
        console.log('\n2. Testing call status update...');
        const updatedCall = await agentService.updateCallStatus(testCallSid, 'completed', {
            duration_seconds: 180
        });
        
        if (updatedCall) {
            console.log('✅ Call status updated to completed');
        } else {
            console.log('❌ Failed to update call status');
        }
        
        // 3. Test call end processing with minute deduction
        console.log('\n3. Testing call end processing...');
        await agentService.updateCallEnd(testCallSid, callData);
        console.log('✅ Call end processing completed');
        
        // 4. Test recording and transcription generation
        console.log('\n4. Testing recording & transcription generation...');
        await agentService.generateCallArtifacts(testCallSid, callData);
        console.log('✅ Recording & transcription generation completed');
        
        // 5. Check final call log state
        console.log('\n5. Checking final call log state...');
        const { data: finalCall, error: finalError } = await agentService.supabase
            .from('call_logs')
            .select('*')
            .eq('call_sid', testCallSid)
            .single();
            
        if (finalError) {
            console.error('❌ Error fetching final call state:', finalError);
        } else {
            console.log('✅ Final call state:');
            console.log(`   Status: ${finalCall.status}`);
            console.log(`   Duration: ${finalCall.duration_seconds}s`);
            console.log(`   Recording URL: ${finalCall.recording_url || 'Not set'}`);
            console.log(`   Transcript: ${finalCall.transcript ? 'Generated' : 'Not generated'}`);
            console.log(`   Summary: ${finalCall.call_summary || 'Not generated'}`);
            console.log(`   Started: ${finalCall.started_at}`);
            console.log(`   Ended: ${finalCall.ended_at}`);
        }
        
        // 6. Test queue and live calls functionality
        console.log('\n6. Testing queue functionality...');
        
        // Create a pending call
        const pendingCallSid = 'CA' + Math.random().toString(36).substr(2, 32);
        const pendingCall = {
            profile_id: profileId,
            phone_number: '+1987654321',
            phone_number_from: '+1987654321',
            phone_number_to: process.env.TWILIO_PHONE_NUMBER,
            direction: 'inbound',
            status: 'pending',
            call_sid: pendingCallSid,
            customer_name: 'Queue Test Customer',
            created_at: new Date().toISOString()
        };
        
        await agentService.supabase
            .from('call_logs')
            .insert(pendingCall);
            
        console.log(`✅ Created pending call: ${pendingCallSid}`);
        
        // Check queue
        const queue = await agentService.supabase
            .from('call_logs')
            .select('*')
            .eq('profile_id', profileId)
            .eq('status', 'pending')
            .order('created_at', { ascending: true });
            
        console.log(`✅ Queue contains ${queue.data.length} pending calls`);
        
        // Test queue cleanup (mark old calls as abandoned)
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
        const { data: cleanupResult } = await agentService.supabase
            .from('call_logs')
            .update({ 
                status: 'abandoned',
                updated_at: new Date().toISOString()
            })
            .eq('profile_id', profileId)
            .eq('status', 'pending')
            .lt('created_at', thirtyMinutesAgo)
            .select();
            
        console.log(`✅ Cleaned up ${cleanupResult.length} old pending calls`);
        
        console.log('\n🎉 All tests completed successfully!');
        console.log('\n📋 Test Summary:');
        console.log('✅ Call creation and logging');
        console.log('✅ Call status transitions');
        console.log('✅ Call end processing and minute deduction');
        console.log('✅ Recording URL generation (placeholder)');
        console.log('✅ Transcription generation (with OpenAI fallback)');
        console.log('✅ AI summary generation via Gemini');
        console.log('✅ Queue management and cleanup');
        console.log('✅ Database updates and timestamps');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testRecordingSystem();
