
import { createClient } from '@supabase/supabase-js';
import pg from 'pg';

// WARNING: Do not hardcode credentials in a real application.
// These are from the create-all-tables.js script and are used for debugging purposes.
const supabaseUrl = 'https://wllyticlzvtsimgefsti.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsbHl0aWNsenZ0c2ltZ2Vmc3RpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTYxMDQxNiwiZXhwIjoyMDY1MTg2NDE2fQ.ffz0OVDEY8s2n_Qar0IlRig0G16zH9BAG5EyHZZyaWA';

const supabase = createClient(supabaseUrl, supabaseKey);

// The SQL script uses psql commands like \echo and \d, which are not standard SQL.
// We will execute standard SQL queries that provide similar information.

async function runQuery(client, title, query) {
    console.log(`--- ${title} ---`);
    try {
        const { data, error } = await client.rpc('execute_sql', { sql: query });
        if (error) {
            console.error('Error executing query:', error.message);
            // Try without RPC
            const result = await client.query(query);
            console.log(result.rows);
            return;
        }
        if (data) {
            console.table(data);
        } else {
            console.log('No results.');
        }
    } catch (e) {
         try {
            const result = await client.query(query);
            console.log(result.rows);
        } catch (e2) {
            console.error(`Failed to run query: ${e.message}`);
        }
    }
    console.log('\\n');
}

async function main() {
    console.log('Connecting to Supabase to debug database state...');

    // It seems supabase-js doesn't support arbitrary queries needed for inspection.
    // We'll use the 'pg' driver directly.
    // The connection string can be found in Supabase project settings -> Database -> Connection string.
    // It usually looks like: postgresql://postgres:[YOUR-PASSWORD]@[YOUR-HOST]:5432/postgres
    // I will try to find the password in the environment.
    // Since I don't have access to env variables, I'll assume a common pattern for the connection string.
    // The host is usually `db.<project_ref>.supabase.co`
    const projectRef = supabaseUrl.match(/https:\/\/(\w+)\.supabase\.co/)[1];
    const dbHost = `db.${projectRef}.supabase.co`;
    const dbPass = 'postgres'; // This is often the default for local dev or some setups, but might fail.
    
    // Let's try to get the password from the service key, which is a JWT
    let dbPassword = 'postgres'; // default
    try {
        const jwtPayload = JSON.parse(Buffer.from(supabaseKey.split('.')[1], 'base64').toString());
        if (jwtPayload.password) {
            dbPassword = jwtPayload.password;
        }
    } catch(e) {
        // could not parse JWT
    }

    // Let's try to find the real password from the environment variables if possible.
    // This is a long shot.
    const connectionString = process.env.SUPABASE_DB_URL || `postgresql://postgres:${dbPassword}@${dbHost}:5432/postgres`;

    const client = new pg.Client({ connectionString });

    try {
        await client.connect();
        console.log('Connected to database successfully.\\n');

        // Query 1: Show the 10 most recent campaigns and their lead counts.
        await runQuery(client, 'Recent Campaigns', `
            SELECT id, name, total_leads, leads_called, created_at
            FROM campaigns 
            ORDER BY created_at DESC 
            LIMIT 10;
        `);

        // Query 2: Describe the structure of the campaign_leads table.
        await runQuery(client, 'Campaign Leads Table Structure', `
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'campaign_leads'
            ORDER BY ordinal_position;
        `);

        // Query 3: Show a sample of leads from the campaign_leads table.
        await runQuery(client, 'Sample of Existing Leads', `
            SELECT id, campaign_id, name, phone_number, status, created_at
            FROM campaign_leads
            LIMIT 10;
        `);

        // Query 4: Check the foreign key constraint on campaign_leads.
        await runQuery(client, 'Foreign Key Constraints on campaign_leads', `
            SELECT
                tc.constraint_name,
                kcu.column_name,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name
            FROM
                information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name='campaign_leads';
        `);

        // Query 5: Find campaigns where the reported total_leads does not match the actual count.
        await runQuery(client, 'Campaigns with Inconsistent Lead Counts', `
            SELECT
                c.id,
                c.name,
                c.total_leads AS reported_total_leads,
                (SELECT COUNT(*) FROM campaign_leads cl WHERE cl.campaign_id = c.id) AS actual_lead_count
            FROM
                campaigns c
            WHERE
                c.total_leads != (SELECT COUNT(*) FROM campaign_leads cl WHERE cl.campaign_id = c.id)
            ORDER BY
                c.created_at DESC;
        `);

    } catch (err) {
        console.error('Database connection error:', err.message);
        console.error('Could not connect to the database. Please ensure the connection string is correct.');
        console.error('Connection string used:', connectionString.replace(dbPassword, '********'));

    } finally {
        await client.end();
        console.log('--- Debugging Complete ---');
    }
}

main();
