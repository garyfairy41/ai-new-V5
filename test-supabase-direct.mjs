import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Supabase client with service role key
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Testing Supabase connection...');
console.log('📍 Supabase URL:', supabaseUrl);
console.log('🔑 Service key exists:', !!supabaseServiceKey);
console.log('🔑 Service key length:', supabaseServiceKey?.length);

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testSupabaseConnection() {
    try {
        console.log('\n📋 Testing agents table...');
        const { data: agents, error: agentsError } = await supabase
            .from('agents')
            .select('*')
            .limit(5);
        
        if (agentsError) {
            console.error('❌ Agents query error:', agentsError);
        } else {
            console.log('✅ Agents query successful:', agents?.length, 'records');
            if (agents?.length > 0) {
                console.log('📊 Sample agent:', {
                    id: agents[0].id,
                    name: agents[0].name,
                    agent_type: agents[0].agent_type
                });
            }
        }

        console.log('\n📋 Testing campaigns table...');
        const { data: campaigns, error: campaignsError } = await supabase
            .from('campaigns')
            .select('*')
            .limit(5);
        
        if (campaignsError) {
            console.error('❌ Campaigns query error:', campaignsError);
        } else {
            console.log('✅ Campaigns query successful:', campaigns?.length, 'records');
            if (campaigns?.length > 0) {
                console.log('📊 Sample campaign:', {
                    id: campaigns[0].id,
                    name: campaigns[0].name,
                    status: campaigns[0].status
                });
            }
        }

        console.log('\n📋 Testing profiles table...');
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('*')
            .limit(5);
        
        if (profilesError) {
            console.error('❌ Profiles query error:', profilesError);
        } else {
            console.log('✅ Profiles query successful:', profiles?.length, 'records');
        }

        console.log('\n📋 Testing database schema...');
        const { data: tables, error: tablesError } = await supabase
            .rpc('get_table_info');
        
        if (tablesError) {
            console.log('⚠️ Could not get table info (RPC not available):', tablesError.message);
        } else {
            console.log('✅ Database schema accessible');
        }

    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }
}

testSupabaseConnection().then(() => {
    console.log('\n✅ Supabase connection test completed');
}).catch((error) => {
    console.error('❌ Test failed:', error);
});
