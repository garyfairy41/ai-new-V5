-- Analytics RPC function for the AI Call Center
-- This function calculates comprehensive analytics for a user profile

CREATE OR REPLACE FUNCTION get_user_analytics(user_id UUID, days_back INTEGER DEFAULT 30)
RETURNS JSON AS $$
DECLARE
    result JSON;
    total_calls INTEGER;
    successful_calls INTEGER;
    total_minutes INTEGER;
    avg_duration REAL;
    call_data JSON;
    campaign_data JSON;
BEGIN
    -- Get call statistics
    SELECT 
        COUNT(*) as call_count,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as success_count,
        COALESCE(SUM(duration_seconds), 0) as total_seconds,
        COALESCE(AVG(duration_seconds), 0) as avg_seconds
    INTO total_calls, successful_calls, total_minutes, avg_duration
    FROM call_logs 
    WHERE profile_id = user_id 
    AND created_at >= NOW() - INTERVAL '%s days' % days_back;

    -- Convert seconds to minutes
    total_minutes := total_minutes / 60;

    -- Get calls by day (last 7 days)
    SELECT json_agg(
        json_build_object(
            'date', date_trunc('day', created_at)::date,
            'calls', COUNT(*)
        ) ORDER BY date_trunc('day', created_at)
    )
    INTO call_data
    FROM call_logs 
    WHERE profile_id = user_id 
    AND created_at >= NOW() - INTERVAL '7 days'
    GROUP BY date_trunc('day', created_at);

    -- Get campaign statistics
    SELECT json_build_object(
        'totalCampaigns', COUNT(*),
        'activeCampaigns', COUNT(CASE WHEN status = 'active' THEN 1 END),
        'totalLeads', COALESCE(SUM(total_leads), 0),
        'leadsContacted', COALESCE(SUM(leads_called), 0)
    )
    INTO campaign_data
    FROM campaigns 
    WHERE profile_id = user_id;

    -- Build final result
    result := json_build_object(
        'totalCalls', total_calls,
        'totalMinutes', total_minutes,
        'successfulCalls', successful_calls,
        'averageCallDuration', avg_duration,
        'callsByDay', COALESCE(call_data, '[]'::json),
        'callsByStatus', json_build_array(
            json_build_object('status', 'completed', 'count', successful_calls),
            json_build_object('status', 'failed', 'count', total_calls - successful_calls)
        ),
        'topOutcomes', '[]'::json,
        'minutesUsed', total_minutes,
        'minutesLimit', 50000,
        'campaignStats', COALESCE(campaign_data, json_build_object(
            'totalCampaigns', 0,
            'activeCampaigns', 0,
            'totalLeads', 0,
            'leadsContacted', 0
        ))
    );

    RETURN result;
END;
$$ LANGUAGE plpgsql;
