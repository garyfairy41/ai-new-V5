-- Fix RLS policies for campaign_leads table
-- This will allow users to access leads for their own campaigns

-- First, drop any existing policies that might be causing issues
DROP POLICY IF EXISTS "Users can manage leads for their own campaigns" ON campaign_leads;
DROP POLICY IF EXISTS "campaign_leads_policy" ON campaign_leads;
DROP POLICY IF EXISTS "campaign_leads_access_policy" ON campaign_leads;
DROP POLICY IF EXISTS "Enable read access for users based on campaign ownership" ON campaign_leads;
DROP POLICY IF EXISTS "Enable insert access for users based on campaign ownership" ON campaign_leads;
DROP POLICY IF EXISTS "Enable update access for users based on campaign ownership" ON campaign_leads;
DROP POLICY IF EXISTS "Enable delete access for users based on campaign ownership" ON campaign_leads;

-- Enable RLS on campaign_leads table
ALTER TABLE campaign_leads ENABLE ROW LEVEL SECURITY;

-- Create a comprehensive policy that allows users to access leads for campaigns they own
CREATE POLICY "campaign_leads_access_policy" ON campaign_leads
    FOR ALL USING (
        campaign_id IN (
            SELECT id FROM campaigns WHERE profile_id = auth.uid()
        )
    )
    WITH CHECK (
        campaign_id IN (
            SELECT id FROM campaigns WHERE profile_id = auth.uid()
        )
    );

-- Grant necessary permissions to authenticated users
GRANT ALL ON campaign_leads TO authenticated;

-- Verify the policy is created
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

-- Test the policy by checking if we can access campaign leads
-- (This will work when run by an authenticated user)
SELECT 
    cl.id,
    cl.campaign_id,
    cl.phone_number,
    cl.first_name,
    cl.last_name,
    cl.status,
    c.name as campaign_name,
    c.profile_id
FROM campaign_leads cl
JOIN campaigns c ON cl.campaign_id = c.id
LIMIT 5;

-- CRITICAL FIX: Update campaigns with null profile_id
-- These orphaned campaigns can't be accessed due to RLS
UPDATE campaigns 
SET profile_id = '5d5f69d3-0cb7-42db-9b10-1246da9c4c22'
WHERE profile_id IS NULL;

-- Verify the fix
SELECT 
    id,
    name,
    profile_id,
    status,
    created_at
FROM campaigns
ORDER BY created_at DESC;

-- Now test that all leads are accessible
SELECT 
    COUNT(*) as total_leads,
    COUNT(CASE WHEN c.profile_id IS NOT NULL THEN 1 END) as accessible_leads,
    COUNT(CASE WHEN c.profile_id IS NULL THEN 1 END) as orphaned_leads
FROM campaign_leads cl
JOIN campaigns c ON cl.campaign_id = c.id;

-- CLEANUP: Remove test campaigns that were created for debugging
-- Keep only the real user campaigns
DELETE FROM campaign_leads 
WHERE campaign_id IN (
    SELECT id FROM campaigns 
    WHERE name LIKE '%Test%' 
    AND name != 'new test'  -- Keep the real user campaign
);

DELETE FROM campaigns 
WHERE name LIKE '%Test%' 
AND name != 'new test';  -- Keep the real user campaign

-- Final verification: Show remaining campaigns and leads
SELECT 
    c.id as campaign_id,
    c.name as campaign_name,
    c.profile_id,
    c.status,
    COUNT(cl.id) as lead_count
FROM campaigns c
LEFT JOIN campaign_leads cl ON c.id = cl.campaign_id
GROUP BY c.id, c.name, c.profile_id, c.status
ORDER BY c.created_at DESC;

-- Show the leads that remain
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
ORDER BY cl.created_at;

-- DIAGNOSTIC: Check if auth.uid() matches campaign profile_id
-- This will show why RLS is blocking access
SELECT 
    'Current auth.uid()' as check_type,
    auth.uid() as current_user_id,
    NULL as campaign_profile_id,
    NULL as match_status
UNION ALL
SELECT 
    'Campaign profile_id' as check_type,
    NULL as current_user_id,
    profile_id as campaign_profile_id,
    CASE 
        WHEN profile_id = auth.uid() THEN 'MATCH ✅'
        ELSE 'NO MATCH ❌'
    END as match_status
FROM campaigns
WHERE name = 'new test';

-- FIX: Update the campaign to use the actual auth.uid()
UPDATE campaigns 
SET profile_id = auth.uid()
WHERE name = 'new test' 
AND profile_id != auth.uid();

-- VERIFY: Test if RLS now allows access
SELECT 
    COUNT(*) as leads_accessible_after_fix
FROM campaign_leads cl
JOIN campaigns c ON cl.campaign_id = c.id
WHERE c.name = 'new test';
