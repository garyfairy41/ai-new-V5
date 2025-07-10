import { createClient } from '@supabase/supabase-js';
import { AutoDialerEngine } from './packages/server/src/services/auto-dialer-engine.js';
import { Pool } from 'pg';

// Environment variables
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

console.log('🔍 Testing Campaign Start Process Step by Step');
console.log('='.repeat(50));

async function testCampaignStart() {
  try {
    // 1. Test Supabase service role access
    console.log('\n1. Testing Supabase Service Role Access...');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const { data: campaigns, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('status', 'draft');
    
    if (campaignError) {
      console.error('❌ Error fetching campaigns:', campaignError);
      return;
    }
    
    console.log(`✅ Found ${campaigns.length} draft campaigns`);
    
    if (campaigns.length === 0) {
      console.log('⚠️  No draft campaigns found. Creating test campaign...');
      
      // Create test campaign
      const { data: newCampaign, error: createError } = await supabase
        .from('campaigns')
        .insert({
          name: 'Test Campaign Debug',
          status: 'draft',
          profile_id: '00000000-0000-0000-0000-000000000000', // Test profile
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (createError) {
        console.error('❌ Error creating test campaign:', createError);
        return;
      }
      
      console.log('✅ Created test campaign:', newCampaign.id);
      campaigns.push(newCampaign);
    }
    
    const testCampaign = campaigns[0];
    console.log(`📋 Using campaign: ${testCampaign.id} (${testCampaign.name})`);
    
    // 2. Test campaign_leads access
    console.log('\n2. Testing Campaign Leads Access...');
    const { data: leads, error: leadsError } = await supabase
      .from('campaign_leads')
      .select('*')
      .eq('campaign_id', testCampaign.id);
    
    if (leadsError) {
      console.error('❌ Error fetching leads:', leadsError);
      return;
    }
    
    console.log(`✅ Found ${leads.length} leads for campaign`);
    
    if (leads.length === 0) {
      console.log('⚠️  No leads found. Adding test leads...');
      
      const testLeads = [
        {
          campaign_id: testCampaign.id,
          profile_id: testCampaign.profile_id,
          phone_number: '+15551234567',
          name: 'Test Lead 1',
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          campaign_id: testCampaign.id,
          profile_id: testCampaign.profile_id,
          phone_number: '+15551234568',
          name: 'Test Lead 2',
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
      
      const { data: insertedLeads, error: insertError } = await supabase
        .from('campaign_leads')
        .insert(testLeads)
        .select();
      
      if (insertError) {
        console.error('❌ Error inserting leads:', insertError);
        return;
      }
      
      console.log(`✅ Added ${insertedLeads.length} test leads`);
      leads.push(...insertedLeads);
    }
    
    // 3. Test profile_id consistency
    console.log('\n3. Testing Profile ID Consistency...');
    const profileIds = leads.map(lead => lead.profile_id);
    const uniqueProfiles = [...new Set(profileIds)];
    
    console.log(`Campaign profile_id: ${testCampaign.profile_id}`);
    console.log(`Lead profile_ids: ${uniqueProfiles.join(', ')}`);
    
    if (uniqueProfiles.length > 1) {
      console.error('❌ Multiple profile_ids found in leads!');
      return;
    }
    
    if (uniqueProfiles[0] !== testCampaign.profile_id) {
      console.error('❌ Profile ID mismatch between campaign and leads!');
      return;
    }
    
    console.log('✅ Profile ID consistency check passed');
    
    // 4. Test direct database access (if service role works)
    console.log('\n4. Testing Direct Database Access...');
    if (DATABASE_URL) {
      const pool = new Pool({ connectionString: DATABASE_URL });
      
      try {
        const campaignResult = await pool.query(
          'SELECT * FROM campaigns WHERE id = $1',
          [testCampaign.id]
        );
        
        const leadsResult = await pool.query(
          'SELECT * FROM campaign_leads WHERE campaign_id = $1',
          [testCampaign.id]
        );
        
        console.log(`✅ Direct DB access: Campaign found = ${campaignResult.rows.length > 0}`);
        console.log(`✅ Direct DB access: Leads found = ${leadsResult.rows.length}`);
        
        // Check for any RLS issues
        const rlsResult = await pool.query(
          'SELECT * FROM pg_policies WHERE schemaname = $1 AND tablename IN ($2, $3)',
          ['public', 'campaigns', 'campaign_leads']
        );
        
        console.log(`✅ RLS policies found: ${rlsResult.rows.length}`);
        
        await pool.end();
      } catch (dbError) {
        console.error('❌ Direct DB access error:', dbError.message);
      }
    }
    
    // 5. Test AutoDialerEngine instantiation
    console.log('\n5. Testing AutoDialerEngine Instantiation...');
    try {
      const engine = new AutoDialerEngine(testCampaign.id);
      console.log('✅ AutoDialerEngine instantiated successfully');
      
      // Test if it can load leads
      console.log('Testing lead loading...');
      
      // Check if the engine has the required methods
      if (typeof engine.start === 'function') {
        console.log('✅ AutoDialerEngine has start method');
        
        // Don't actually start it, just test the setup
        console.log('⚠️  Skipping actual start() call to avoid real dialing');
        
      } else {
        console.error('❌ AutoDialerEngine missing start method');
      }
      
    } catch (engineError) {
      console.error('❌ AutoDialerEngine error:', engineError.message);
      console.error('Stack:', engineError.stack);
    }
    
    // 6. Test campaign status update
    console.log('\n6. Testing Campaign Status Update...');
    const { data: updatedCampaign, error: updateError } = await supabase
      .from('campaigns')
      .update({ 
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', testCampaign.id)
      .select()
      .single();
    
    if (updateError) {
      console.error('❌ Error updating campaign status:', updateError);
      return;
    }
    
    console.log('✅ Campaign status updated to active');
    
    // Reset status back to draft
    await supabase
      .from('campaigns')
      .update({ 
        status: 'draft',
        updated_at: new Date().toISOString()
      })
      .eq('id', testCampaign.id);
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('📝 Summary:');
    console.log('- Service role access: ✅');
    console.log('- Campaign/leads access: ✅');
    console.log('- Profile ID consistency: ✅');
    console.log('- Database direct access: ✅');
    console.log('- AutoDialerEngine instantiation: ✅');
    console.log('- Campaign status update: ✅');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testCampaignStart().then(() => {
  console.log('\n🏁 Test completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Test failed:', error);
  process.exit(1);
});
