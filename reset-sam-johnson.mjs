import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function resetSamJohnson() {
  console.log('🔧 Resetting Sam Johnson status to pending...');

  const { data, error } = await supabase
    .from('campaign_leads')
    .update({ 
      status: 'pending',
      call_attempts: 0,
      outcome: null,
      last_call_at: null
    })
    .eq('phone_number', '15133007212')
    .eq('first_name', 'Sam')
    .eq('last_name', 'Johnson')
    .select();

  if (error) {
    console.error('❌ Error:', error);
  } else {
    console.log('✅ Successfully reset Sam Johnson:', data);
  }
}

resetSamJohnson();
