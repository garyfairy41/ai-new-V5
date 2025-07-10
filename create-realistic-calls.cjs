const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function createRealisticCalls() {
    console.log('🧪 Creating realistic test calls with recordings & transcripts...');
    
    try {
        // Get first profile ID
        const { data: profiles } = await supabase.from('profiles').select('id').limit(1);
        if (!profiles || profiles.length === 0) {
            console.error('❌ No profiles found. Create a user first.');
            return;
        }
        
        const profileId = profiles[0].id;
        console.log(`Using profile ID: ${profileId}`);
        
        // Clear old test calls first
        await supabase.from('call_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        console.log('🧹 Cleared old test calls');
        
        const testCalls = [
            {
                profile_id: profileId,
                phone_number: '+1234567890',
                phone_number_from: '+1234567890',
                phone_number_to: process.env.TWILIO_PHONE_NUMBER,
                direction: 'inbound',
                status: 'completed',
                started_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
                ended_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
                duration_seconds: 300,
                call_sid: 'CA' + Math.random().toString(36).substr(2, 32),
                customer_name: 'John Smith',
                recording_url: 'https://api.twilio.com/recordings/test1.mp3',
                transcript: "Agent: Hello, thank you for calling. How can I help you today?\\nCaller: Hi, I need help with my account balance.\\nAgent: I'd be happy to help with that. Let me check your account...\\nCaller: Thank you.\\nAgent: Your current balance is $250.00. Is there anything else?\\nCaller: No, that's all. Thanks!\\nAgent: You're welcome! Have a great day.",
                call_summary: 'Customer inquiry about account balance. Provided balance information ($250.00). Issue resolved successfully.',
                summary_generated_at: new Date().toISOString(),
                outcome: 'resolved',
                sentiment_score: 0.8,
                created_at: new Date(Date.now() - 16 * 60 * 1000).toISOString()
            },
            {
                profile_id: profileId,
                phone_number: '+1987654321',
                phone_number_from: '+1987654321',
                phone_number_to: process.env.TWILIO_PHONE_NUMBER,
                direction: 'inbound',
                status: 'completed',
                started_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
                ended_at: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
                duration_seconds: 600,
                call_sid: 'CA' + Math.random().toString(36).substr(2, 32),
                customer_name: 'Jane Doe',
                recording_url: 'https://api.twilio.com/recordings/test2.mp3',
                transcript: "Agent: Good afternoon, how may I assist you?\\nCaller: I'm having trouble with my recent order.\\nAgent: I'm sorry to hear that. Can you provide your order number?\\nCaller: Yes, it's ORD12345.\\nAgent: I see the issue. Let me process a refund for you.\\nCaller: Thank you so much!\\nAgent: The refund will appear in 3-5 business days. Anything else?\\nCaller: No, that's perfect. Thank you!",
                call_summary: 'Customer reported issue with order ORD12345. Processed full refund. Customer satisfied with resolution.',
                summary_generated_at: new Date().toISOString(),
                outcome: 'resolved',
                sentiment_score: 0.9,
                created_at: new Date(Date.now() - 46 * 60 * 1000).toISOString()
            },
            {
                profile_id: profileId,
                phone_number: '+1555123456',
                phone_number_from: '+1555123456',
                phone_number_to: process.env.TWILIO_PHONE_NUMBER,
                direction: 'inbound',
                status: 'in_progress',
                started_at: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
                duration_seconds: 180,
                call_sid: 'CA' + Math.random().toString(36).substr(2, 32),
                customer_name: 'Mike Johnson',
                created_at: new Date(Date.now() - 4 * 60 * 1000).toISOString()
            },
            {
                profile_id: profileId,
                phone_number: '+1444555666',
                phone_number_from: '+1444555666',
                phone_number_to: process.env.TWILIO_PHONE_NUMBER,
                direction: 'inbound',
                status: 'pending',
                created_at: new Date(Date.now() - 1 * 60 * 1000).toISOString(),
                call_sid: 'CA' + Math.random().toString(36).substr(2, 32),
                customer_name: 'Sarah Wilson'
            }
        ];
        
        // Insert test calls
        for (const call of testCalls) {
            const { data, error } = await supabase
                .from('call_logs')
                .insert(call);
                
            if (error) {
                console.error('❌ Error creating call:', error);
            } else {
                console.log(`✅ Created ${call.status} call for ${call.customer_name}`);
            }
        }
        
        console.log('\\n🎉 Realistic test calls created!');
        console.log('\\n📊 Expected UI Results:');
        console.log('Dashboard:');
        console.log('  - Total Calls Today: 4');
        console.log('  - Active Calls: 1');
        console.log('  - Answer Rate: 75% (3/4)');
        console.log('  - Avg Duration: 7.5m');
        console.log('  - Recent Calls: 2 completed calls with summaries');
        console.log('\\nLive Calls:');
        console.log('  - Queue: 1 call (Sarah Wilson, ~1m wait)');
        console.log('  - Active: 1 call (Mike Johnson, ~3m duration)');
        console.log('  - Avg Wait Time: ~1 minute');
        console.log('\\nCall History:');
        console.log('  - 2 completed calls with recordings & transcripts');
        console.log('  - Proper timestamps and summaries');
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

createRealisticCalls();
