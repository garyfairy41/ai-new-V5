-- Diagnose Lead Import Issues
-- Run these queries to show the current state

-- 1. Check current campaigns and their profile_ids
SELECT 
    id,
    profile_id,
    name,
    status,
    total_leads,
    created_at
FROM campaigns
ORDER BY created_at DESC
LIMIT 10;

-- 2. Check current campaign_leads and their relationships
SELECT 
    cl.id,
    cl.campaign_id,
    cl.phone_number,
    cl.first_name,
    cl.last_name,
    cl.status,
    c.name as campaign_name,
    c.profile_id as campaign_profile_id,
    cl.created_at
FROM campaign_leads cl
LEFT JOIN campaigns c ON cl.campaign_id = c.id
ORDER BY cl.created_at DESC
LIMIT 10;

-- 3. Check for any orphaned campaign_leads
SELECT 
    'Orphaned leads' as check_type,
    COUNT(*) as count
FROM campaign_leads cl
LEFT JOIN campaigns c ON cl.campaign_id = c.id
WHERE c.id IS NULL;

-- 4. Check if any campaigns exist without leads
SELECT 
    'Campaigns without leads' as check_type,
    COUNT(*) as count
FROM campaigns c
LEFT JOIN campaign_leads cl ON c.id = cl.campaign_id
WHERE cl.campaign_id IS NULL;

-- 5. Check for profile_id mismatches in recent data
SELECT 
    c.id as campaign_id,
    c.profile_id,
    c.name,
    COUNT(cl.id) as lead_count
FROM campaigns c
LEFT JOIN campaign_leads cl ON c.id = cl.campaign_id
GROUP BY c.id, c.profile_id, c.name
ORDER BY c.created_at DESC
LIMIT 10;

-- 6. Check the exact foreign key constraint on campaign_leads
SELECT 
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'campaign_leads'
    AND kcu.column_name = 'campaign_id';
