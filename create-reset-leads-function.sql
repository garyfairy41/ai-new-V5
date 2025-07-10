-- SQL function to reset campaign leads
-- This function bypasses RLS and can be called from the client

CREATE OR REPLACE FUNCTION reset_campaign_leads(campaign_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE campaign_leads 
    SET 
        status = 'pending',
        call_attempts = 0,
        outcome = NULL,
        updated_at = NOW()
    WHERE campaign_leads.campaign_id = reset_campaign_leads.campaign_id;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    RETURN updated_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION reset_campaign_leads(UUID) TO authenticated;

-- Grant execute permission to service_role (for API calls)
GRANT EXECUTE ON FUNCTION reset_campaign_leads(UUID) TO service_role;
