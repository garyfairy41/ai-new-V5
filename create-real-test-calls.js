import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://wllyticlzvtsimgefsti.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsbHl0aWNsenZ0c2ltZ2Vmc3RpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2MTA0MTYsImV4cCI6MjA2NTE4NjQxNn0.V2pQNPbCBCjw9WecUFE45dIswma0DjB6ikLi9Kdgcnk'
);

async function createTestProfile() {
  const testProfileId = 'test-user-123';
  
  // Create test profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: testProfileId,
      email: 'test@example.com',
      full_name: 'Test User',
      phone: '+1234567890',
      timezone: 'America/New_York',
      business_name: 'Test Business',
      business_type: 'sales',
      created_at: new Date().toISOString()
    });

  if (profileError) {
    console.error('Profile error:', profileError);
    return null;
  }

  console.log('Created profile:', testProfileId);
  return testProfileId;
}

async function createRealTestCalls() {
  const profileId = await createTestProfile();
  if (!profileId) return;

  // Create realistic call logs over the past 7 days
  const calls = [];
  const outcomes = ['answered', 'no_answer', 'busy', 'voicemail', 'interested', 'not_interested', 'callback_requested'];
  const statuses = ['completed', 'failed', 'missed'];
  
  for (let i = 0; i < 15; i++) {
    const dayOffset = Math.floor(i / 3); // 3 calls per day for 5 days
    const callDate = new Date();
    callDate.setDate(callDate.getDate() - dayOffset);
    
    const duration = Math.floor(Math.random() * 600) + 30; // 30 seconds to 10 minutes
    const outcome = outcomes[Math.floor(Math.random() * outcomes.length)];
    const status = outcome === 'answered' || outcome === 'interested' ? 'completed' : 
                   Math.random() > 0.8 ? 'failed' : 'completed';
    
    calls.push({
      id: `call-${i + 1}`,
      profile_id: profileId,
      phone_number: `+1555${String(Math.floor(Math.random() * 1000000)).padStart(7, '0')}`,
      status: status,
      outcome: outcome,
      duration_seconds: duration,
      started_at: callDate.toISOString(),
      ended_at: new Date(callDate.getTime() + (duration * 1000)).toISOString(),
      recording_url: null,
      transcript: `Test call transcript for call ${i + 1}`,
      created_at: callDate.toISOString(),
      updated_at: callDate.toISOString()
    });
  }

  console.log('Creating', calls.length, 'test calls...');
  
  const { data, error } = await supabase
    .from('call_logs')
    .insert(calls);

  if (error) {
    console.error('Error creating calls:', error);
  } else {
    console.log('Successfully created test calls!');
    console.log('Call durations:', calls.map(c => c.duration_seconds));
    console.log('Call outcomes:', calls.map(c => c.outcome));
  }

  // Verify the data
  const { data: verifyData } = await supabase
    .from('call_logs')
    .select('*')
    .eq('profile_id', profileId);
    
  console.log('Verification: Found', verifyData?.length, 'calls in database');
}

createRealTestCalls().catch(console.error);
