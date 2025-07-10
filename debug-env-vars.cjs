require('dotenv').config();

console.log('Environment Variables:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'SET' : 'NOT SET');
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'SET' : 'NOT SET'); 
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET');
console.log('VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL ? 'SET' : 'NOT SET');
console.log('VITE_SUPABASE_ANON_KEY:', process.env.VITE_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET');
console.log('VITE_SUPABASE_SERVICE_ROLE_KEY:', process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET');

console.log('\nChecking if service key is valid...');
const { createClient } = require('@supabase/supabase-js');

if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    console.log('✅ Admin client created successfully');
  } catch (error) {
    console.log('❌ Error creating admin client:', error.message);
  }
} else {
  console.log('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}
