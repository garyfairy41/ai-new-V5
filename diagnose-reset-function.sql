-- Comprehensive diagnostic SQL for campaign leads reset function
-- Run these queries in Supabase SQL editor to understand what's happening

-- 1. Check if the reset function exists
SELECT 
    proname as function_name,
    pg_get_function_result(oid) as return_type,
    pg_get_function_arguments(oid) as arguments,
    prosecdef as security_definer
FROM pg_proc 
WHERE proname = 'reset_campaign_leads';

-- 2. Check current campaigns and their status
SELECT 
    c.id,
    c.name,
    c.status as campaign_status,
    c.created_at,
    c.updated_at,
    COUNT(cl.id) as total_leads,
    COUNT(CASE WHEN cl.status = 'pending' THEN 1 END) as pending_leads,
    COUNT(CASE WHEN cl.status = 'completed' THEN 1 END) as completed_leads,
    COUNT(CASE WHEN cl.status = 'failed' THEN 1 END) as failed_leads
FROM campaigns c
LEFT JOIN campaign_leads cl ON c.id = cl.campaign_id
GROUP BY c.id, c.name, c.status, c.created_at, c.updated_at
ORDER BY c.updated_at DESC;

-- 3. Check campaign_leads table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'campaign_leads' 
ORDER BY ordinal_position;

-- 4. Check for any RLS policies on campaign_leads
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
WHERE tablename = 'campaign_leads';

-- 5. Test the reset function on a specific campaign (replace with actual campaign ID)
-- First, let's see what campaigns exist
SELECT 
    id as campaign_id,
    name,
    status,
    (SELECT COUNT(*) FROM campaign_leads WHERE campaign_id = c.id) as lead_count
FROM campaigns c
ORDER BY created_at DESC
LIMIT 5;

-- 6. Check permissions on the function
SELECT 
    p.proname,
    r.rolname,
    a.privilege_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
LEFT JOIN information_schema.routine_privileges a ON a.routine_name = p.proname
LEFT JOIN pg_roles r ON a.grantee = r.rolname
WHERE p.proname = 'reset_campaign_leads' AND n.nspname = 'public';

-- 7. Check if there are any triggers on campaign_leads that might interfere
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'campaign_leads';

-- 8. Sample campaign leads data (to see current state)
SELECT 
    cl.id,
    cl.campaign_id,
    c.name as campaign_name,
    cl.status,
    cl.call_attempts,
    cl.outcome,
    cl.phone_number,
    cl.first_name,
    cl.last_name,
    cl.created_at,
    cl.updated_at
FROM campaign_leads cl
JOIN campaigns c ON cl.campaign_id = c.id
ORDER BY cl.updated_at DESC
LIMIT 10;

-- 9. Test function execution (uncomment and replace UUID with actual campaign ID)
-- SELECT reset_campaign_leads('your-campaign-id-here');

-- 10. Check for any foreign key constraints that might cause issues
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'campaign_leads';
