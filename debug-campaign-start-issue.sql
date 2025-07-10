-- Debug campaign start issue - check what the AutoDialerEngine sees
-- Run this to show me the exact data state that's causing the start button to fail

-- 1. Check if campaigns have leads with pending status
SELECT 
    c.id as campaign_id,
    c.name as campaign_name,
    c.profile_id,
    c.status as campaign_status,
    c.total_leads,
    COUNT(cl.id) as actual_lead_count,
    COUNT(CASE WHEN cl.status = 'pending' THEN 1 END) as pending_leads,
    COUNT(CASE WHEN cl.status = 'failed' AND cl.call_attempts < 3 THEN 1 END) as retryable_failed_leads
FROM campaigns c
LEFT JOIN campaign_leads cl ON c.id = cl.campaign_id
WHERE c.profile_id IS NOT NULL
    AND c.name NOT ILIKE '%test%'
GROUP BY c.id, c.name, c.profile_id, c.status, c.total_leads
ORDER BY c.created_at DESC;

-- 2. Show the exact query the AutoDialerEngine uses to load leads
SELECT 
    id,
    campaign_id,
    phone_number,
    first_name,
    last_name,
    status,
    call_attempts,
    created_at
FROM campaign_leads
WHERE campaign_id = '6b142d71-87a6-4196-81b3-54fa206bff96'  -- Sales Frontier Midwest
    AND status IN ('pending', 'failed')
    AND call_attempts < 3
ORDER BY created_at ASC;

-- 3. Check if RLS is blocking the service role access
-- This tests if the server can see campaign_leads at all
SELECT 
    'Service role access test' as test_type,
    COUNT(*) as total_campaign_leads_visible
FROM campaign_leads;

-- 4. Check if there are any campaigns currently in 'active' or 'running' status
SELECT 
    id,
    name,
    status,
    profile_id,
    total_leads,
    created_at,
    updated_at
FROM campaigns
WHERE status IN ('active', 'running', 'starting')
ORDER BY updated_at DESC NULLS LAST;

-- 5. Check the current auth context
SELECT 
    current_user as db_user,
    current_setting('role') as current_role,
    session_user as session_user;
