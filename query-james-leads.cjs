const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ybqwcvrsqojcovibqhgn.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlicXdjdnJzcW9qY292aWJxaGduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM3NzI5ODcsImV4cCI6MjA0OTM0ODk4N30.qF6jN78n5IUIG7G1KYWXOm8CrBFNMKnCp0zU-wdROhQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function queryJamesLeads() {
  console.log('🔍 Searching for leads with James in first name...');
  
  // Query for James in first name
  const { data: jamesData, error: jamesError } = await supabase
    .from('campaign_leads')
    .select('id, first_name, last_name, phone, email, created_at, campaign_id')
    .ilike('first_name', '%james%')
    .order('created_at', { ascending: false })
    .limit(20);

  if (jamesError) {
    console.error('Error querying James leads:', jamesError);
  } else {
    console.log('\n📋 Leads with "James" in first name:');
    console.table(jamesData);
  }

  // Query for Carter in last name
  console.log('\n🔍 Searching for leads with Carter in last name...');
  const { data: carterData, error: carterError } = await supabase
    .from('campaign_leads')
    .select('id, first_name, last_name, phone, email, created_at, campaign_id')
    .ilike('last_name', '%carter%')
    .order('created_at', { ascending: false })
    .limit(20);

  if (carterError) {
    console.error('Error querying Carter leads:', carterError);
  } else {
    console.log('\n📋 Leads with "Carter" in last name:');
    console.table(carterData);
  }

  // Query for exact James Carter
  console.log('\n🔍 Searching for exact James Carter...');
  const { data: jamesCarterData, error: jamesCarterError } = await supabase
    .from('campaign_leads')
    .select('id, first_name, last_name, phone, email, created_at, campaign_id')
    .ilike('first_name', '%james%')
    .ilike('last_name', '%carter%');

  if (jamesCarterError) {
    console.error('Error querying James Carter:', jamesCarterError);
  } else {
    console.log('\n📋 Exact James Carter matches:');
    console.table(jamesCarterData);
  }

  // Also check all leads to see what names exist
  console.log('\n🔍 Checking all lead names for reference...');
  const { data: allLeads, error: allLeadsError } = await supabase
    .from('campaign_leads')
    .select('id, first_name, last_name, created_at, campaign_id')
    .order('created_at', { ascending: false })
    .limit(50);

  if (allLeadsError) {
    console.error('Error querying all leads:', allLeadsError);
  } else {
    console.log('\n📋 Recent leads (first 50):');
    console.table(allLeads);
  }
}

queryJamesLeads().catch(console.error);
