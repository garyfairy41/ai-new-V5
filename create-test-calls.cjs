const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function createTestCalls() {
    console.log('🧪 Creating realistic test calls...');
    
    try {
        // First, clean up old test calls
        await supabase
            .from('call_logs')
            .delete()
            .like('call_sid', 'TEST_%');
            
        console.log('✅ Cleaned up old test calls');
        
        // Get a valid profile_id from the database
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id')
            .limit(1);
            
        if (!profiles || profiles.length === 0) {
            console.error('❌ No profiles found in database');
            return;
        }
        
        const profileId = profiles[0].id;
        console.log(`Using profile ID: ${profileId}`);
        
        // Get an agent for the profile
        const { data: agents } = await supabase
            .from('ai_agents')
            .select('id')
            .eq('profile_id', profileId)
            .limit(1);
            
        const agentId = agents && agents.length > 0 ? agents[0].id : null;
        
        const now = new Date();
        const testCalls = [
            // Completed call from 2 hours ago
            {
                call_sid: 'TEST_CALL_001',
                profile_id: profileId,
                agent_id: agentId,
                phone_number_from: '+15551234567',
                phone_number_to: '+18186006909',
                direction: 'inbound',
                status: 'completed',
                started_at: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
                ended_at: new Date(now.getTime() - 2 * 60 * 60 * 1000 + 5 * 60 * 1000).toISOString(),
                duration: 300,
                call_summary: 'Customer called to check account balance. Provided balance information and answered questions about recent transactions.',
                transcript: 'Agent: Hello, thank you for calling. How can I help you today?\\nCustomer: Hi, I need to check my account balance.\\nAgent: I can help with that. Your current balance is $1,250.00.\\nCustomer: Great, thank you!',
                recording_url: 'https://example.com/recordings/test_001.mp3',
                outcome: 'resolved',
                created_at: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
                updated_at: new Date(now.getTime() - 2 * 60 * 60 * 1000 + 5 * 60 * 1000).toISOString()
            },
            // Completed call from 1 hour ago
            {
                call_sid: 'TEST_CALL_002',
                profile_id: profileId,
                agent_id: agentId,
                phone_number_from: '+15559876543',
                phone_number_to: '+18186006909',
                direction: 'inbound',
                status: 'completed',
                started_at: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(),
                ended_at: new Date(now.getTime() - 1 * 60 * 60 * 1000 + 8 * 60 * 1000).toISOString(),
                duration: 480,
                call_summary: 'Customer inquiry about product pricing and availability. Provided detailed information and scheduled follow-up.',
                transcript: 'Agent: Good afternoon, how may I assist you?\\nCustomer: I am interested in your premium service package.\\nAgent: I would be happy to help with that information...',
                recording_url: 'https://example.com/recordings/test_002.mp3',
                outcome: 'follow_up_scheduled',
                created_at: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(),
                updated_at: new Date(now.getTime() - 1 * 60 * 60 * 1000 + 8 * 60 * 1000).toISOString()
            },
            // Recent completed call from 30 minutes ago
            {
                call_sid: 'TEST_CALL_003',
                profile_id: profileId,
                agent_id: agentId,
                phone_number_from: '+15551111111',
                phone_number_to: '+18186006909',
                direction: 'inbound',
                status: 'completed',
                started_at: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
                ended_at: new Date(now.getTime() - 30 * 60 * 1000 + 3 * 60 * 1000).toISOString(),
                duration: 180,
                call_summary: 'Quick support call regarding password reset. Issue resolved successfully.',
                transcript: 'Agent: Support line, how can I help?\\nCustomer: I need help resetting my password.\\nAgent: I can assist with that right away...',
                recording_url: 'https://example.com/recordings/test_003.mp3',
                outcome: 'resolved',
                created_at: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
                updated_at: new Date(now.getTime() - 30 * 60 * 1000 + 3 * 60 * 1000).toISOString()
            },
            // Active call that started 2 minutes ago
            {
                call_sid: 'TEST_CALL_004',
                profile_id: profileId,
                agent_id: agentId,
                phone_number_from: '+15552222222',
                phone_number_to: '+18186006909',
                direction: 'inbound',
                status: 'in_progress',
                started_at: new Date(now.getTime() - 2 * 60 * 1000).toISOString(),
                ended_at: null,
                duration: 0,
                call_summary: null,
                transcript: null,
                recording_url: null,
                outcome: null,
                created_at: new Date(now.getTime() - 2 * 60 * 1000).toISOString(),
                updated_at: new Date(now.getTime() - 1 * 60 * 1000).toISOString()
            },
            // Pending call that just came in (30 seconds ago)
            {
                call_sid: 'TEST_CALL_005',
                profile_id: profileId,
                agent_id: agentId,
                phone_number_from: '+15553333333',
                phone_number_to: '+18186006909',
                direction: 'inbound',
                status: 'pending',
                started_at: null,
                ended_at: null,
                duration: 0,
                call_summary: null,
                transcript: null,
                recording_url: null,
                outcome: null,
                created_at: new Date(now.getTime() - 30 * 1000).toISOString(),
                updated_at: new Date(now.getTime() - 30 * 1000).toISOString()
            }
        ];
        
        // Insert test calls
        const { data, error } = await supabase
            .from('call_logs')
            .insert(testCalls)
            .select('*');
            
        if (error) {
            console.error('Error inserting test calls:', error);
            return;
        }
        
        console.log(`✅ Created ${data.length} test calls:`);
        data.forEach(call => {
            console.log(`  - ${call.call_sid}: ${call.status} (${call.phone_number_from})`);
        });
        
        // Show summary
        console.log('\\n📊 Test Call Summary:');
        console.log('- 3 completed calls with full data (recordings, transcripts, summaries)');
        console.log('- 1 active call (in progress)');
        console.log('- 1 pending call (just queued)');
        console.log('\\n🎯 This should provide realistic data for testing the UI!');
        
    } catch (error) {
        console.error('Error creating test calls:', error);
    }
}

createTestCalls().catch(console.error);
