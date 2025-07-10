-- Check real campaigns and their lead status
-- These are the actual campaigns with valid profile_ids

-- 1. Check current real campaigns
SELECT 
    id,
    profile_id,
    name,
    status,
    total_leads,
    created_at
FROM campaigns
WHERE profile_id IS NOT NULL 
    AND name NOT ILIKE '%test%'
ORDER BY created_at DESC;

-- 2. Check if there are any leads in these real campaigns
SELECT 
    cl.id,
    cl.campaign_id,
    cl.phone_number,
    cl.first_name,
    cl.last_name,
    cl.status,
    c.name as campaign_name,
    c.profile_id,
    cl.created_at
FROM campaign_leads cl
JOIN campaigns c ON cl.campaign_id = c.id
WHERE c.profile_id IS NOT NULL
    AND c.name NOT ILIKE '%test%'
ORDER BY cl.created_at DESC;

-- 3. Check for any lead import attempts that might have failed
SELECT 
    c.id as campaign_id,
    c.name as campaign_name,
    c.profile_id,
    c.total_leads,
    COUNT(cl.id) as actual_lead_count
FROM campaigns c
LEFT JOIN campaign_leads cl ON c.id = cl.campaign_id
WHERE c.profile_id IS NOT NULL
    AND c.name NOT ILIKE '%test%'
GROUP BY c.id, c.name, c.profile_id, c.total_leads
ORDER BY c.created_at DESC;

-- 4. Check if there are any RLS policy issues
SELECT 
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

-- 5. Test inserting a lead into one of the real campaigns
-- Replace the campaign_id with one of the actual campaign IDs from query 1
/*
INSERT INTO campaign_leads (
    campaign_id,
    phone_number,
    first_name,
    last_name,
    status,
    call_attempts,
    created_at,
    updated_at
) VALUES (
    '6b142d71-87a6-4196-81b3-54fa206bff96',  -- Sales Frontier Midwest
    '+15551234567',
    'Test',
    'Lead',
    'pending',
    0,
    NOW(),
    NOW()
);
*/

-- 6. Check if the test insert worked
/*
SELECT 
    cl.id,
    cl.campaign_id,
    cl.phone_number,
    cl.first_name,
    cl.last_name,
    cl.status,
    c.name as campaign_name
FROM campaign_leads cl
JOIN campaigns c ON cl.campaign_id = c.id
WHERE c.id = '6b142d71-87a6-4196-81b3-54fa206bff96'
ORDER BY cl.created_at DESC;
*/
