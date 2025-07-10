import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

console.log('Testing Supabase connection...');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'Set' : 'Not set');
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'Set' : 'Not set');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function testConnection() {
    try {
        console.log('\n--- Testing direct query ---');
        const { data, error } = await supabase
            .from('ai_agents')
            .select('*');
            
        if (error) {
            console.error('Error:', error);
        } else {
            console.log('Success! Found', data.length, 'agents');
            console.log('Agents:', JSON.stringify(data, null, 2));
        }
        
        console.log('\n--- Testing with is_active filter ---');
        const { data: activeData, error: activeError } = await supabase
            .from('ai_agents')
            .select('*')
            .eq('is_active', true);
            
        if (activeError) {
            console.error('Error with is_active filter:', activeError);
        } else {
            console.log('Success! Found', activeData.length, 'active agents');
            console.log('Active agents:', JSON.stringify(activeData, null, 2));
        }
        
    } catch (err) {
        console.error('Connection error:', err);
    }
}

testConnection();
