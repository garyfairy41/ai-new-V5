import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTables() {
    try {
        console.log('🔍 Checking database schema...');
        
        // Try to list tables using information_schema
        const { data, error } = await supabase
            .rpc('exec_sql', { 
                sql: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;" 
            });
            
        if (error) {
            console.log('RPC not available, trying direct query approach...');
            
            // Alternative: Try to query known tables
            const tables = ['profiles', 'campaigns', 'agents', 'call_logs', 'campaign_leads'];
            
            for (const table of tables) {
                try {
                    const { data, error } = await supabase
                        .from(table)
                        .select('*')
                        .limit(1);
                        
                    if (!error) {
                        console.log(`✅ ${table} table exists`);
                    } else if (error.code === '42P01') {
                        console.log(`❌ ${table} table does NOT exist`);
                    } else {
                        console.log(`⚠️ ${table} table query error:`, error.message);
                    }
                } catch (e) {
                    console.log(`❌ ${table} table error:`, e.message);
                }
            }
        } else {
            console.log('📋 Available tables:', data);
        }
        
    } catch (error) {
        console.error('Error checking tables:', error);
    }
}

checkTables();
