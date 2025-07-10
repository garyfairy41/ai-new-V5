import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://wllyticlzvtsimgefsti.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsbHl0aWNsenZ0c2ltZ2Vmc3RpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2MTA0MTYsImV4cCI6MjA2NTE4NjQxNn0.V2pQNPbCBCjw9WecUFE45dIswma0DjB6ikLi9Kdgcnk'
);

async function createTestData() {
  try {
    // Get the first profile
    const { data: profiles } = await supabase.from('profiles').select('*').limit(1);
    
    if (!profiles || profiles.length === 0) {
      console.log('No profiles found. Please create a user account first.');
      return;
    }
    
    const profileId = profiles[0].id;
    console.log('Using profile ID:', profileId);
    
    // Create test call logs
    const testCalls = [];
    const statuses = ['completed', 'failed', 'busy', 'no-answer'];
    const outcomes = ['Sale', 'Appointment', 'Not interested', 'Callback requested', 'Wrong number'];
    
    for (let i = 0; i < 20; i++) {
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 30)); // Last 30 days
      
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const outcome = outcomes[Math.floor(Math.random() * outcomes.length)];
      const duration = Math.floor(Math.random() * 300) + 30; // 30-330 seconds
      
      testCalls.push({
        profile_id: profileId,
        phone_number: `+1555${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
        status: status,
        outcome: outcome,
        duration_seconds: status === 'completed' ? duration : 0,
        started_at: date.toISOString(),
        ended_at: status === 'completed' ? new Date(date.getTime() + duration * 1000).toISOString() : null,
        created_at: date.toISOString()
      });
    }
    
    // Insert test calls
    const { data: insertedCalls, error: callError } = await supabase
      .from('call_logs')
      .insert(testCalls)
      .select();
    
    if (callError) {
      console.error('Error inserting calls:', callError);
    } else {
      console.log(`Successfully created ${insertedCalls.length} test calls`);
    }
    
    // Check existing calls
    const { data: allCalls } = await supabase
      .from('call_logs')
      .select('*')
      .eq('profile_id', profileId);
    
    console.log(`Total calls for user: ${allCalls?.length || 0}`);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

createTestData();
