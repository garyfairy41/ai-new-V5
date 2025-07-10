-- Comprehensive SQL queries to inspect campaign leads
-- Run these in Supabase SQL Editor to diagnose lead issues

-- ========================================
-- 1. CAMPAIGNS OVERVIEW WITH LEAD COUNTS
-- ========================================
SELECT 
    c.id as campaign_id,
    c.name as campaign_name,
    c.status as campaign_status,
    c.created_at as campaign_created,
    c.updated_at as campaign_updated,
    COUNT(cl.id) as total_leads,
    COUNT(CASE WHEN cl.status = 'pending' THEN 1 END) as pending_leads,
    COUNT(CASE WHEN cl.status = 'completed' THEN 1 END) as completed_leads,
    COUNT(CASE WHEN cl.status = 'failed' THEN 1 END) as failed_leads
FROM campaigns c
LEFT JOIN campaign_leads cl ON c.id = cl.campaign_id
GROUP BY c.id, c.name, c.status, c.created_at, c.updated_at
ORDER BY c.created_at DESC;

-- ========================================
-- 2. ALL LEADS WITH CAMPAIGN DETAILS
-- ========================================
SELECT 
    cl.id as lead_id,
    c.id as campaign_id,
    c.name as campaign_name,
    c.status as campaign_status,
    cl.first_name,
    cl.last_name,
    cl.phone_number,
    cl.email,
    cl.company,
    cl.address,
    cl.status as lead_status,
    cl.call_attempts,
    cl.outcome,
    cl.created_at as lead_created,
    cl.updated_at as lead_updated
FROM campaign_leads cl
LEFT JOIN campaigns c ON cl.campaign_id = c.id
ORDER BY 
    c.created_at DESC,
    cl.created_at DESC;

-- ========================================
-- 3. DUPLICATE PHONE NUMBERS
-- ========================================
SELECT 
    phone_number,
    COUNT(*) as occurrences,
    STRING_AGG(DISTINCT first_name, ', ') as first_names,
    STRING_AGG(DISTINCT last_name, ', ') as last_names,
    STRING_AGG(DISTINCT c.name, ', ') as campaigns,
    STRING_AGG(DISTINCT cl.status, ', ') as statuses
FROM campaign_leads cl
LEFT JOIN campaigns c ON cl.campaign_id = c.id
WHERE phone_number IS NOT NULL AND phone_number != ''
GROUP BY phone_number
HAVING COUNT(*) > 1
ORDER BY occurrences DESC;

-- ========================================
-- 4. LEADS WITH MISSING OR PROBLEMATIC DATA
-- ========================================
SELECT 
    cl.id as lead_id,
    c.name as campaign_name,
    cl.phone_number,
    cl.first_name,
    cl.last_name,
    cl.email,
    cl.company,
    cl.address,
    cl.status,
    CASE 
        WHEN cl.first_name IS NULL OR TRIM(cl.first_name) = '' THEN 'Missing first name; '
        ELSE ''
    END ||
    CASE 
        WHEN cl.last_name IS NULL OR TRIM(cl.last_name) = '' THEN 'Missing last name; '
        ELSE ''
    END ||
    CASE 
        WHEN cl.phone_number IS NULL OR TRIM(cl.phone_number) = '' THEN 'Missing phone; '
        ELSE ''
    END ||
    CASE 
        WHEN cl.phone_number IS NOT NULL AND LENGTH(TRIM(cl.phone_number)) < 10 THEN 'Short phone number; '
        ELSE ''
    END as issues
FROM campaign_leads cl
LEFT JOIN campaigns c ON cl.campaign_id = c.id
WHERE 
    cl.first_name IS NULL OR TRIM(cl.first_name) = '' OR
    cl.last_name IS NULL OR TRIM(cl.last_name) = '' OR
    cl.phone_number IS NULL OR TRIM(cl.phone_number) = '' OR
    (cl.phone_number IS NOT NULL AND LENGTH(TRIM(cl.phone_number)) < 10)
ORDER BY cl.created_at DESC;

-- ========================================
-- 5. RECENT CALL LOGS WITH METADATA
-- ========================================
SELECT 
    call_id,
    campaign_id,
    phone_number,
    agent_name,
    call_status,
    call_duration,
    created_at,
    metadata,
    -- Try to extract personalization data from metadata if JSON
    CASE 
        WHEN metadata IS NOT NULL THEN
            COALESCE(metadata->>'firstName', 'N/A')
        ELSE 'N/A'
    END as metadata_first_name,
    CASE 
        WHEN metadata IS NOT NULL THEN
            COALESCE(metadata->>'lastName', 'N/A')
        ELSE 'N/A'
    END as metadata_last_name,
    CASE 
        WHEN metadata IS NOT NULL THEN
            COALESCE(metadata->>'company', 'N/A')
        ELSE 'N/A'
    END as metadata_company
FROM call_logs 
ORDER BY created_at DESC 
LIMIT 20;

-- ========================================
-- 6. LEADS BY CREATION DATE (TO FIND BULK IMPORTS)
-- ========================================
SELECT 
    DATE(created_at) as creation_date,
    COUNT(*) as leads_created,
    COUNT(DISTINCT campaign_id) as campaigns_affected,
    STRING_AGG(DISTINCT c.name, ', ') as campaign_names
FROM campaign_leads cl
LEFT JOIN campaigns c ON cl.campaign_id = c.id
GROUP BY DATE(created_at)
ORDER BY creation_date DESC;

-- ========================================
-- 7. PHONE NUMBER PATTERNS (TO IDENTIFY TEST DATA)
-- ========================================
SELECT 
    CASE 
        WHEN phone_number LIKE '+1555%' THEN 'Test numbers (+1555xxx)'
        WHEN phone_number LIKE '555%' THEN 'Test numbers (555xxx)'
        WHEN phone_number LIKE '+1%' THEN 'US numbers (+1xxx)'
        WHEN LENGTH(phone_number) = 10 THEN '10-digit numbers'
        WHEN LENGTH(phone_number) = 11 THEN '11-digit numbers'
        WHEN phone_number IS NULL OR phone_number = '' THEN 'Missing phone'
        ELSE 'Other format'
    END as phone_pattern,
    COUNT(*) as count,
    MIN(phone_number) as example_number
FROM campaign_leads
GROUP BY 
    CASE 
        WHEN phone_number LIKE '+1555%' THEN 'Test numbers (+1555xxx)'
        WHEN phone_number LIKE '555%' THEN 'Test numbers (555xxx)'
        WHEN phone_number LIKE '+1%' THEN 'US numbers (+1xxx)'
        WHEN LENGTH(phone_number) = 10 THEN '10-digit numbers'
        WHEN LENGTH(phone_number) = 11 THEN '11-digit numbers'
        WHEN phone_number IS NULL OR phone_number = '' THEN 'Missing phone'
        ELSE 'Other format'
    END
ORDER BY count DESC;
