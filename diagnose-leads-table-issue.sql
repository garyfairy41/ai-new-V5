-- COMPREHENSIVE LEADS TABLE DIAGNOSTIC QUERY
-- Run this in Supabase SQL Editor to diagnose the exact root issue
-- Copy and paste ALL results back to show the exact problem

-- ========================================
-- 1. CHECK CURRENT USER CONTEXT
-- ========================================
SELECT 
    'CURRENT USER CONTEXT' as diagnostic_section,
    auth.uid() as current_auth_uid,
    current_user as current_database_user,
    current_role as current_database_role;

-- ========================================
-- 2. CHECK RLS STATUS AND POLICIES
-- ========================================
SELECT 
    'RLS STATUS' as diagnostic_section,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('campaigns', 'campaign_leads');

-- Show all RLS policies
SELECT 
    'RLS POLICIES' as diagnostic_section,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename IN ('campaigns', 'campaign_leads')
ORDER BY tablename, policyname;

-- ========================================
-- 3. CHECK CAMPAIGN OWNERSHIP
-- ========================================
SELECT 
    'CAMPAIGN OWNERSHIP' as diagnostic_section,
    c.id as campaign_id,
    c.name as campaign_name,
    c.profile_id as campaign_profile_id,
    c.status as campaign_status,
    c.created_at,
    CASE 
        WHEN c.profile_id = auth.uid() THEN 'MATCHES ✅'
        WHEN c.profile_id IS NULL THEN 'NULL ❌'
        ELSE 'MISMATCH ❌'
    END as auth_match_status
FROM campaigns c
ORDER BY c.created_at DESC;

-- ========================================
-- 4. CHECK CAMPAIGN LEADS RAW DATA
-- ========================================
SELECT 
    'CAMPAIGN LEADS RAW' as diagnostic_section,
    cl.id as lead_id,
    cl.campaign_id,
    cl.phone_number,
    cl.first_name,
    cl.last_name,
    cl.status,
    cl.created_at,
    c.name as campaign_name,
    c.profile_id as campaign_profile_id
FROM campaign_leads cl
JOIN campaigns c ON cl.campaign_id = c.id
ORDER BY cl.created_at DESC;

-- ========================================
-- 5. TEST RLS FILTERING
-- ========================================
-- Test if RLS is blocking access
SELECT 
    'RLS TEST - COUNT ALL LEADS' as diagnostic_section,
    COUNT(*) as total_leads_bypassing_rls
FROM campaign_leads;

-- Test if RLS allows access to user's campaigns
SELECT 
    'RLS TEST - USER CAMPAIGNS' as diagnostic_section,
    COUNT(*) as user_campaigns_accessible
FROM campaigns
WHERE profile_id = auth.uid();

-- Test if RLS allows access to user's campaign leads
SELECT 
    'RLS TEST - USER CAMPAIGN LEADS' as diagnostic_section,
    COUNT(*) as user_campaign_leads_accessible
FROM campaign_leads cl
WHERE cl.campaign_id IN (
    SELECT id FROM campaigns WHERE profile_id = auth.uid()
);

-- ========================================
-- 6. CHECK SPECIFIC QUERY THAT UI USES
-- ========================================
-- This is the exact query the UI DatabaseService.getCampaignLeads() uses
SELECT 
    'UI QUERY SIMULATION' as diagnostic_section,
    cl.*
FROM campaign_leads cl
WHERE cl.campaign_id = (
    SELECT id FROM campaigns WHERE name = 'new test' LIMIT 1
)
ORDER BY cl.created_at DESC;

-- ========================================
-- 7. CHECK PERMISSIONS AND GRANTS
-- ========================================
SELECT 
    'TABLE PERMISSIONS' as diagnostic_section,
    grantee,
    table_name,
    privilege_type,
    is_grantable
FROM information_schema.role_table_grants
WHERE table_name IN ('campaigns', 'campaign_leads')
AND grantee IN ('authenticated', 'anon', 'public')
ORDER BY table_name, grantee, privilege_type;

-- ========================================
-- 8. FINAL SUMMARY
-- ========================================
SELECT 
    'SUMMARY' as diagnostic_section,
    (SELECT COUNT(*) FROM campaigns) as total_campaigns,
    (SELECT COUNT(*) FROM campaign_leads) as total_leads,
    (SELECT COUNT(*) FROM campaigns WHERE profile_id = auth.uid()) as user_campaigns,
    (SELECT COUNT(*) FROM campaign_leads cl WHERE cl.campaign_id IN (SELECT id FROM campaigns WHERE profile_id = auth.uid())) as user_accessible_leads,
    auth.uid() as current_user_id;
