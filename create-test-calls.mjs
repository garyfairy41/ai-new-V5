import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://wllyticlzvtsimgefsti.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsbHl0aWNsenZ0c2ltZ2Vmc3RpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2MTA0MTYsImV4cCI6MjA2NTE4NjQxNn0.V2pQNPbCBCjw9WecUFE45dIswma0DjB6ikLi9Kdgcnk'
);

async function createTestData() {
  console.log('🔍 Creating test analytics data...');

  // First create a test profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: 'test-user-123',
      email: 'test@example.com',
      full_name: 'Test User',
      phone: '+1234567890',
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (profileError && !profileError.message.includes('duplicate')) {
    console.error('Error creating profile:', profileError);
    return;
  }

  console.log('✅ Profile created/exists');

  // Create some realistic call data
  const callStatuses = ['completed', 'successful', 'failed', 'busy', 'no-answer'];
  const callData = [];

  for (let i = 0; i < 20; i++) {
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 7)); // Last 7 days
    
    const status = callStatuses[Math.floor(Math.random() * callStatuses.length)];
    const duration = status === 'completed' || status === 'successful' 
      ? Math.floor(Math.random() * 300) + 60  // 1-5 minutes for successful calls
      : Math.floor(Math.random() * 30);        // 0-30 seconds for failed calls

    callData.push({
      profile_id: 'test-user-123',
      phone_number: `+1555${String(Math.floor(Math.random() * 9000) + 1000)}`,
      status: status,
      duration: duration,
      direction: Math.random() > 0.5 ? 'outbound' : 'inbound',
      created_at: date.toISOString(),
      started_at: date.toISOString(),
      ended_at: new Date(date.getTime() + duration * 1000).toISOString(),
      recording_url: null,
      transcription: null,
      summary: `Test call with ${status} status`,
      cost: (duration * 0.02).toFixed(2) // 2 cents per minute
    });
  }

  // Insert call logs
  const { data: calls, error: callsError } = await supabase
    .from('call_logs')
    .insert(callData)
    .select();

  if (callsError) {
    console.error('Error creating calls:', callsError);
    return;
  }

  console.log(`✅ Created ${calls?.length} test calls`);

  // Verify the data
  const { data: verifyData, error: verifyError } = await supabase
    .from('call_logs')
    .select('*')
    .eq('profile_id', 'test-user-123');

  if (verifyError) {
    console.error('Error verifying data:', verifyError);
    return;
  }

  console.log(`📊 Total calls in database: ${verifyData?.length}`);
  console.log('✅ Test data created successfully!');
  console.log('🎯 You can now view the analytics dashboard with real data');
}

createTestData().catch(console.error);
