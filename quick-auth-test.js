// Simple test to check if the issue is authentication vs URL construction
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

async function quickTest() {
  console.log('🔍 Quick Authentication Test');
  console.log('='.repeat(30));
  
  // Test 1: Check if we can connect to Supabase
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  
  try {
    const { data: { session } } = await supabase.auth.getSession();
    console.log('Session exists:', !!session);
    
    if (session) {
      console.log('✅ User authenticated:', session.user.email);
    } else {
      console.log('❌ No user session - this is likely the issue!');
      console.log('The frontend needs a logged-in user to start campaigns.');
    }
  } catch (error) {
    console.error('❌ Auth error:', error.message);
  }
  
  // Test 2: Direct API call (like our working test)
  console.log('\n🚀 Direct API Test (should work):');
  
  const response = await fetch('https://upgraded-cod-r4xxvx74gvjq25gxx-12001.app.github.dev/api/campaigns/9468254a-2711-4b2b-8591-b2fc01790e8c/start', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    }
  });
  
  console.log('Direct API call status:', response.status);
  
  if (response.ok) {
    const result = await response.json();
    console.log('✅ Direct API works:', result.message);
  } else {
    console.log('❌ Direct API failed');
  }
}

quickTest().catch(console.error);
