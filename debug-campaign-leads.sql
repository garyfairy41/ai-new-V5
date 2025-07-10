-- Test query to check campaign leads status
-- Run this in Supabase SQL editor to see the current state of your campaign leads

-- First, let's see all campaigns to get the actual campaign IDs:
SELECT 
    id,
    name,
    status,
    created_at
FROM campaigns 
ORDER BY created_at DESC;

-- Then use a specific campaign ID from above in this query:
-- SELECT 
--     id,
--     campaign_id,
--     phone_number,
--     first_name,
--     last_name,
--     status,
--     call_attempts,
--     outcome,
--     created_at,
--     updated_at
-- FROM campaign_leads 
-- WHERE campaign_id = 'PASTE-CAMPAIGN-ID-HERE'
-- ORDER BY created_at DESC;

-- OR, to see ALL campaign leads with campaign names in one query:
SELECT 
    c.name as campaign_name,
    c.id as campaign_id,
    c.status as campaign_status,
    cl.id as lead_id,
    cl.phone_number,
    cl.first_name,
    cl.last_name,
    cl.status as lead_status,
    cl.call_attempts,
    cl.outcome,
    cl.created_at as lead_created_at
FROM campaigns c
LEFT JOIN campaign_leads cl ON c.id = cl.campaign_id
ORDER BY c.created_at DESC, cl.created_at DESC;

-- To see all campaigns and their lead counts:
SELECT 
    c.id,
    c.name,
    c.status as campaign_status,
    COUNT(cl.id) as total_leads,
    COUNT(CASE WHEN cl.status = 'pending' THEN 1 END) as pending_leads,
    COUNT(CASE WHEN cl.status = 'completed' THEN 1 END) as completed_leads,
    COUNT(CASE WHEN cl.status = 'failed' THEN 1 END) as failed_leads
FROM campaigns c
LEFT JOIN campaign_leads cl ON c.id = cl.campaign_id
GROUP BY c.id, c.name, c.status
ORDER BY c.created_at DESC;
