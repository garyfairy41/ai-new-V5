import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const supabase = createClient(
  'https://wllyticlzvtsimgefsti.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsbHl0aWNsenZ0c2ltZ2Vmc3RpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2MTA0MTYsImV4cCI6MjA2NTE4NjQxNn0.V2pQNPbCBCjw9WecUFE45dIswma0DjB6ikLi9Kdgcnk'
);

async function createTestData() {
  try {
    console.log('Creating test profile...');
    
    const userId = randomUUID();
    console.log('Generated UUID:', userId);
    
    // First create a test profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        email: 'test@example.com',
        full_name: 'Test User',
        plan_name: 'pro',
        monthly_minute_limit: 10000,
        minutes_used: 245,
        is_active: true,
        can_use_inbound: true,
        can_use_outbound_dialer: true,
        max_concurrent_calls: 5
      })
      .select()
      .single();

    if (profileError && !profileError.message.includes('duplicate key')) {
      console.error('Profile creation error:', profileError);
      return;
    }

    const profileId = profile?.id || userId;
    console.log('Profile created/exists:', profileId);

    // Create realistic test call data over the last 30 days
    const calls = [];
    const now = new Date();
    const statuses = ['completed', 'failed', 'completed', 'completed', 'abandoned'];
    const outcomes = ['appointment_scheduled', 'not_interested', 'callback_requested', 'sale_completed', 'voicemail'];

    for (let i = 0; i < 50; i++) {
      const daysAgo = Math.floor(Math.random() * 30);
      const callDate = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
      
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const duration = status === 'completed' ? 
        Math.floor(Math.random() * 600) + 30 : // 30 seconds to 10 minutes for completed calls
        Math.floor(Math.random() * 30); // 0-30 seconds for failed calls
      
      const outcome = status === 'completed' ? 
        outcomes[Math.floor(Math.random() * outcomes.length)] : 
        'no_answer';

      calls.push({
        profile_id: profileId,
        phone_number_from: '+19995551234',
        phone_number_to: `+1555000${String(1000 + i).slice(-4)}`,
        direction: 'outbound',
        status,
        started_at: callDate.toISOString(),
        ended_at: status !== 'pending' ? new Date(callDate.getTime() + (duration * 1000)).toISOString() : null,
        duration_seconds: duration,
        call_summary: status === 'completed' ? `Call completed successfully with outcome: ${outcome}` : `Call ${status}`,
        transcript: status === 'completed' ? 'Sample transcript content...' : null,
        sentiment_score: status === 'completed' ? Math.random() * 10 : null,
        outcome,
        priority: 'normal',
        customer_satisfaction_score: status === 'completed' ? Math.floor(Math.random() * 5) + 1 : null,
        follow_up_required: Math.random() > 0.8,
        follow_up_date: Math.random() > 0.8 ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : null,
        tags: ['test_data'],
        metadata: { source: 'test_script' }
      });
    }

    console.log('Creating test call logs...');
    
    // Insert calls in batches to avoid timeout
    const batchSize = 10;
    for (let i = 0; i < calls.length; i += batchSize) {
      const batch = calls.slice(i, i + batchSize);
      const { error } = await supabase
        .from('call_logs')
        .insert(batch);

      if (error && !error.message.includes('duplicate key')) {
        console.error('Error inserting batch:', error);
      } else {
        console.log(`Inserted batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(calls.length/batchSize)}`);
      }
    }

    // Verify the data
    const { data: verifyData, error: verifyError } = await supabase
      .from('call_logs')
      .select('*')
      .eq('profile_id', profileId);

    if (verifyError) {
      console.error('Verification error:', verifyError);
    } else {
      console.log(`✅ Successfully created ${verifyData.length} test call records`);
      
      // Show some statistics
      const completed = verifyData.filter(call => call.status === 'completed').length;
      const totalDuration = verifyData.reduce((sum, call) => sum + (call.duration_seconds || 0), 0);
      const avgDuration = verifyData.length > 0 ? Math.round(totalDuration / verifyData.length) : 0;
      
      console.log(`📊 Test Data Statistics:`);
      console.log(`   Total Calls: ${verifyData.length}`);
      console.log(`   Completed: ${completed}`);
      console.log(`   Success Rate: ${Math.round((completed / verifyData.length) * 100)}%`);
      console.log(`   Total Duration: ${Math.round(totalDuration / 60)} minutes`);
      console.log(`   Average Duration: ${avgDuration} seconds`);
    }

  } catch (error) {
    console.error('Error creating test data:', error);
  }
}

createTestData();
