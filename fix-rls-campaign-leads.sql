-- Fix RLS policies for campaign_leads table
-- The issue is that campaigns has RLS but campaign_leads doesn't

-- First, enable RLS on campaign_leads if it's not already enabled
ALTER TABLE campaign_leads ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for campaign_leads based on the campaign's profile_id
CREATE POLICY "Users can manage leads for their own campaigns" ON campaign_leads
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

-- Verify the policies are now in place
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

-- Test if we can now query campaign_leads properly
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
ORDER BY cl.created_at DESC
LIMIT 5;
