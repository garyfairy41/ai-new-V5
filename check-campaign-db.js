#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkCampaignTables() {
  console.log('🔍 CHECKING CAMPAIGN SYSTEM DATABASE TABLES\n');
  
  const requiredTables = [
    'campaigns',
    'campaign_leads', 
    'campaign_dialer_status',
    'active_calls',
    'notifications'
  ];

  let missingTables = [];
  
  for (const table of requiredTables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        console.log(`❌ Table '${table}' missing or has issues: ${error.message}`);
        missingTables.push(table);
      } else {
        console.log(`✅ Table '${table}' exists and is accessible`);
      }
    } catch (error) {
      console.log(`❌ Table '${table}' check failed: ${error.message}`);
      missingTables.push(table);
    }
  }

  console.log('\n📊 SUMMARY:');
  console.log(`✅ Tables found: ${requiredTables.length - missingTables.length}/${requiredTables.length}`);
  
  if (missingTables.length > 0) {
    console.log(`❌ Missing tables: ${missingTables.join(', ')}`);
    console.log('\n🔧 ACTION NEEDED:');
    console.log('You need to run the following SQL files to create missing tables:');
    console.log('1. create-missing-tables.sql');
    console.log('2. create-dialer-schema.sql');
    console.log('\nRun these in your Supabase SQL Editor or database console.');
    return false;
  } else {
    console.log('🎉 All required tables exist! Campaign system is ready to use.');
    return true;
  }
}

checkCampaignTables().catch(console.error);
