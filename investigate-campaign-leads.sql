-- Comprehensive SQL to investigate campaign leads
-- Run this in Supabase SQL Editor to see all campaign leads and their status

-- First, let's see all campaigns and their basic info
SELECT 
    'CAMPAIGNS' as table_name,
    c.id as campaign_id,
    c.name as campaign_name,
    c.status as campaign_status,
    c.created_at,
    c.updated_at
FROM campaigns c
ORDER BY c.created_at DESC;

-- Now let's see all campaign leads with full details
SELECT 
    'CAMPAIGN_LEADS' as table_name,
    cl.id as lead_id,
    cl.campaign_id,
    c.name as campaign_name,
    cl.first_name,
    cl.last_name,
    cl.phone_number,
    cl.email,
    cl.company,
    cl.title,
    cl.status,
    cl.call_attempts,
    cl.outcome,
    cl.created_at,
    cl.updated_at
FROM campaign_leads cl
LEFT JOIN campaigns c ON cl.campaign_id = c.id
ORDER BY cl.created_at DESC;

-- Count leads per campaign
SELECT 
    'LEADS_PER_CAMPAIGN' as table_name,
    c.name as campaign_name,
    c.id as campaign_id,
    COUNT(cl.id) as lead_count,
    COUNT(CASE WHEN cl.status = 'pending' THEN 1 END) as pending_count,
    COUNT(CASE WHEN cl.status = 'completed' THEN 1 END) as completed_count,
    COUNT(CASE WHEN cl.status = 'failed' THEN 1 END) as failed_count
FROM campaigns c
LEFT JOIN campaign_leads cl ON c.id = cl.campaign_id
GROUP BY c.id, c.name
ORDER BY lead_count DESC;

-- Check for any leads without campaigns
SELECT 
    'ORPHANED_LEADS' as table_name,
    cl.*
FROM campaign_leads cl
LEFT JOIN campaigns c ON cl.campaign_id = c.id
WHERE c.id IS NULL;

-- Look for duplicate phone numbers
SELECT 
    'DUPLICATE_PHONES' as table_name,
    phone_number,
    COUNT(*) as occurrence_count,
    STRING_AGG(DISTINCT first_name || ' ' || last_name, ', ') as names,
    STRING_AGG(DISTINCT campaign_id::text, ', ') as campaign_ids
FROM campaign_leads
WHERE phone_number IS NOT NULL
GROUP BY phone_number
HAVING COUNT(*) > 1
ORDER BY occurrence_count DESC;

-- Check recent call logs to see what's actually being called
SELECT 
    'RECENT_CALLS' as table_name,
    call_id,
    campaign_id,
    phone_number,
    status,
    created_at,
    updated_at
FROM call_logs
ORDER BY created_at DESC
LIMIT 20;

-- Check if there are any system instructions with personalization variables
SELECT 
    'CAMPAIGN_INSTRUCTIONS' as table_name,
    c.id as campaign_id,
    c.name as campaign_name,
    c.system_instruction,
    LENGTH(c.system_instruction) as instruction_length,
    CASE 
        WHEN c.system_instruction LIKE '%{{%}}%' THEN 'Has Variables'
        ELSE 'No Variables'
    END as has_personalization
FROM campaigns c
WHERE c.system_instruction IS NOT NULL
ORDER BY c.created_at DESC;
