-- EXACT QUERY TO FIND THE ROOT CAUSE
-- Run this and show me ALL results

-- 1. Check what the UI count query actually returns
SELECT 
    'COUNT QUERY TEST' as test_type,
    campaign_id,
    COUNT(*) as count_result
FROM campaign_leads 
WHERE campaign_id = (SELECT id FROM campaigns WHERE name = 'new test')
GROUP BY campaign_id;

-- 2. Check what the UI data query actually returns  
SELECT 
    'DATA QUERY TEST' as test_type,
    cl.*
FROM campaign_leads cl
WHERE cl.campaign_id = (SELECT id FROM campaigns WHERE name = 'new test')
ORDER BY cl.created_at DESC;

-- 3. Check if there's a difference in table access
SELECT 
    'DIRECT ACCESS TEST' as test_type,
    id,
    campaign_id,
    phone_number,
    first_name,
    last_name,
    status
FROM campaign_leads;

-- 4. Check campaign table access
SELECT 
    'CAMPAIGN ACCESS TEST' as test_type,
    id,
    name,
    profile_id,
    status
FROM campaigns;
