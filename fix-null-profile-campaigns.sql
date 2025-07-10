-- Fix existing campaigns with null profile_id
-- This script assigns a default profile_id to campaigns that have null profile_id

-- First, let's see what we have
SELECT 
    'Before Fix' as status,
    COUNT(*) as total_campaigns,
    COUNT(CASE WHEN profile_id IS NULL THEN 1 END) as null_profile_campaigns,
    COUNT(CASE WHEN profile_id IS NOT NULL THEN 1 END) as valid_profile_campaigns
FROM campaigns;

-- Find the most common profile_id (assuming it's the main user)
SELECT 
    profile_id,
    COUNT(*) as campaign_count
FROM campaigns
WHERE profile_id IS NOT NULL
GROUP BY profile_id
ORDER BY campaign_count DESC
LIMIT 1;

-- If there's no valid profile_id, we need to check the profiles table
SELECT 
    'Available Profiles' as info,
    id as profile_id,
    email,
    client_name
FROM profiles
ORDER BY created_at
LIMIT 5;

-- Option 1: Update null profile_id campaigns to use the first available profile
-- (Replace 'YOUR_PROFILE_ID_HERE' with the actual profile ID from the query above)
/*
UPDATE campaigns 
SET profile_id = (
    SELECT id 
    FROM profiles 
    ORDER BY created_at 
    LIMIT 1
)
WHERE profile_id IS NULL;
*/

-- Option 2: If you know the specific profile_id to use, update directly
-- UPDATE campaigns SET profile_id = 'your-actual-profile-id' WHERE profile_id IS NULL;

-- Verify the fix (run this after updating)
SELECT 
    'After Fix' as status,
    COUNT(*) as total_campaigns,
    COUNT(CASE WHEN profile_id IS NULL THEN 1 END) as null_profile_campaigns,
    COUNT(CASE WHEN profile_id IS NOT NULL THEN 1 END) as valid_profile_campaigns
FROM campaigns;

-- Check the updated campaigns
SELECT 
    id,
    profile_id,
    name,
    status,
    created_at
FROM campaigns
ORDER BY created_at DESC
LIMIT 10;
