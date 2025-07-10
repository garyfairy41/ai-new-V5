-- Debug RLS policy access for service role
-- Check if the service role can bypass RLS or if there's an issue

-- First, check what role the service is using
SELECT current_user, current_role;

-- Check if RLS is enabled and what policies exist
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('campaigns', 'campaign_leads');

-- Check the exact RLS policies again
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

-- Test if service role can access campaign_leads directly
-- (This should work if using service role key)
SELECT COUNT(*) as total_campaign_leads FROM campaign_leads;

-- Test if service role can access specific campaign leads
SELECT 
    cl.id,
    cl.campaign_id,
    cl.phone_number,
    cl.status,
    c.name as campaign_name,
    c.profile_id
FROM campaign_leads cl
JOIN campaigns c ON cl.campaign_id = c.id
WHERE c.id = '6b142d71-87a6-4196-81b3-54fa206bff96'
LIMIT 5;

-- Check if there's an auth.uid() function issue
SELECT auth.uid() as current_auth_uid;

-- Test the exact query the AutoDialerEngine uses
SELECT 
    id,
    campaign_id,
    phone_number,
    first_name,
    last_name,
    status,
    call_attempts
FROM campaign_leads
WHERE campaign_id = '6b142d71-87a6-4196-81b3-54fa206bff96'
    AND status IN ('pending', 'failed')
    AND call_attempts < 3
ORDER BY created_at ASC;
