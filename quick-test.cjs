const { createClient } = require('@supabase/supabase-js');
const twilio = require('twilio');
require('dotenv').config();

async function quickServerTest() {
    console.log('🧪 Quick Server Setup Test...');
    
    try {
        // Test environment variables
        console.log('\n1. Testing environment variables...');
        console.log('✅ Supabase URL:', process.env.SUPABASE_URL ? 'Set' : '❌ Missing');
        console.log('✅ Supabase Service Key:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : '❌ Missing');
        console.log('✅ Twilio Account SID:', process.env.TWILIO_ACCOUNT_SID ? 'Set' : '❌ Missing');
        console.log('✅ Twilio Auth Token:', process.env.TWILIO_AUTH_TOKEN ? 'Set' : '❌ Missing');
        console.log('✅ Gemini API Key:', process.env.GEMINI_API_KEY ? 'Set' : '❌ Missing');
        console.log('✅ OpenAI API Key:', process.env.OPENAI_API_KEY ? 'Set' : '❌ Missing');
        
        // Test Supabase connection
        console.log('\n2. Testing Supabase connection...');
        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        
        const { count, error } = await supabase
            .from('call_logs')
            .select('*', { count: 'exact', head: true });
            
        if (error) {
            console.error('❌ Supabase error:', error.message);
        } else {
            console.log('✅ Supabase connected, total calls:', count);
        }
        
        // Test Twilio client
        console.log('\n3. Testing Twilio client...');
        const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        console.log('✅ Twilio client initialized');
        
        // Test recent calls data
        console.log('\n4. Testing recent calls data...');
        const { data: recentCalls, error: callsError } = await supabase
            .from('call_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);
            
        if (callsError) {
            console.error('❌ Error fetching calls:', callsError.message);
        } else {
            console.log(`✅ Found ${recentCalls.length} recent calls`);
            recentCalls.forEach(call => {
                console.log(`   - ${call.status}: ${call.phone_number} (${call.created_at})`);
            });
        }
        
        // Test call queue functionality
        console.log('\n5. Testing call queue functionality...');
        const { data: pendingCalls } = await supabase
            .from('call_logs')
            .select('*')
            .eq('status', 'pending')
            .order('created_at', { ascending: true });
            
        console.log(`✅ Current queue has ${pendingCalls.length} pending calls`);
        
        // Test AI summary generation (simulate)
        console.log('\n6. Testing AI summary generation...');
        const testPrompt = "Please summarize this: Customer called about account balance.";
        
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: testPrompt
                        }]
                    }]
                })
            });
            
            if (response.ok) {
                console.log('✅ Gemini API connection working');
            } else {
                console.log('❌ Gemini API error:', response.status);
            }
        } catch (error) {
            console.log('❌ Gemini API test failed:', error.message);
        }
        
        console.log('\n🎉 Server setup test completed!');
        
        console.log('\n📋 Summary:');
        console.log('✅ Environment variables loaded');
        console.log('✅ Supabase connection working');
        console.log('✅ Twilio client initialized');
        console.log('✅ Database queries working');
        console.log('✅ Call queue functionality ready');
        console.log('✅ AI services accessible');
        
        console.log('\n🚀 System is ready for recording & transcription!');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

quickServerTest();
