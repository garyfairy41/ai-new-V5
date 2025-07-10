-- Step 4: Create working analytics functions based on the real data structure
-- This will give you all the metrics you need for your campaign UI

-- 1. Create campaign analytics function using the correct table structure
CREATE OR REPLACE FUNCTION get_campaign_analytics(campaign_uuid UUID)
RETURNS TABLE (
    campaign_id UUID,
    campaign_name TEXT,
    total_leads INTEGER,
    calls_made INTEGER,
    calls_completed INTEGER,
    calls_no_answer INTEGER,
    qualified_leads INTEGER,
    appointments_scheduled INTEGER,
    data_collected INTEGER,
    success_rate DECIMAL(5,2),
    answer_rate DECIMAL(5,2),
    qualification_rate DECIMAL(5,2),
    avg_call_duration DECIMAL(8,2),
    total_talk_time INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.name::TEXT,
        COUNT(cl.id)::INTEGER as total_leads,
        COUNT(clog.id)::INTEGER as calls_made,
        COUNT(CASE WHEN clog.status = 'completed' THEN 1 END)::INTEGER as calls_completed,
        COUNT(CASE WHEN clog.status = 'no-answer' THEN 1 END)::INTEGER as calls_no_answer,
        COUNT(CASE WHEN cl.qualified = true THEN 1 END)::INTEGER as qualified_leads,
        COUNT(CASE WHEN cl.appointment_scheduled = true THEN 1 END)::INTEGER as appointments_scheduled,
        COUNT(CASE WHEN cl.customer_data_collected = true THEN 1 END)::INTEGER as data_collected,
        -- Success rate = qualified leads / total leads
        CASE 
            WHEN COUNT(cl.id) > 0 THEN 
                ROUND((COUNT(CASE WHEN cl.qualified = true THEN 1 END)::DECIMAL / COUNT(cl.id)::DECIMAL) * 100, 2)
            ELSE 0
        END as success_rate,
        -- Answer rate = completed calls / total calls
        CASE 
            WHEN COUNT(clog.id) > 0 THEN 
                ROUND((COUNT(CASE WHEN clog.status = 'completed' THEN 1 END)::DECIMAL / COUNT(clog.id)::DECIMAL) * 100, 2)
            ELSE 0
        END as answer_rate,
        -- Qualification rate = qualified leads / answered calls
        CASE 
            WHEN COUNT(CASE WHEN clog.status = 'completed' THEN 1 END) > 0 THEN 
                ROUND((COUNT(CASE WHEN cl.qualified = true THEN 1 END)::DECIMAL / COUNT(CASE WHEN clog.status = 'completed' THEN 1 END)::DECIMAL) * 100, 2)
            ELSE 0
        END as qualification_rate,
        -- Average call duration
        ROUND(AVG(CASE WHEN clog.duration_seconds > 0 THEN clog.duration_seconds END)::NUMERIC, 2) as avg_call_duration,
        -- Total talk time
        COALESCE(SUM(CASE WHEN clog.duration_seconds > 0 THEN clog.duration_seconds END), 0)::INTEGER as total_talk_time
    FROM campaigns c
    LEFT JOIN campaign_leads cl ON c.id = cl.campaign_id
    LEFT JOIN call_logs clog ON cl.id = clog.lead_id
    WHERE c.id = campaign_uuid
    GROUP BY c.id, c.name;
END;
$$ LANGUAGE plpgsql;

-- 2. Create view for campaign dashboard
CREATE OR REPLACE VIEW campaign_dashboard AS
SELECT 
    c.id as campaign_id,
    c.name as campaign_name,
    c.status as campaign_status,
    c.total_leads as expected_leads,
    COUNT(cl.id) as actual_leads,
    COUNT(clog.id) as calls_made,
    COUNT(CASE WHEN clog.status = 'completed' THEN 1 END) as calls_answered,
    COUNT(CASE WHEN clog.status = 'no-answer' THEN 1 END) as no_answer_calls,
    COUNT(CASE WHEN cl.status = 'completed' THEN 1 END) as leads_completed,
    COUNT(CASE WHEN cl.status = 'pending' THEN 1 END) as leads_pending,
    COUNT(CASE WHEN cl.qualified = true THEN 1 END) as qualified_leads,
    COUNT(CASE WHEN cl.appointment_scheduled = true THEN 1 END) as appointments_scheduled,
    COUNT(CASE WHEN cl.customer_data_collected = true THEN 1 END) as data_collected,
    COALESCE(SUM(CASE WHEN clog.duration_seconds > 0 THEN clog.duration_seconds END), 0) as total_talk_time,
    ROUND(AVG(CASE WHEN clog.duration_seconds > 0 THEN clog.duration_seconds END)::NUMERIC, 2) as avg_call_duration,
    MAX(clog.started_at) as last_call_time,
    -- Success metrics
    CASE 
        WHEN COUNT(cl.id) > 0 THEN 
            ROUND((COUNT(CASE WHEN cl.qualified = true THEN 1 END)::DECIMAL / COUNT(cl.id)::DECIMAL) * 100, 2)
        ELSE 0
    END as success_rate,
    CASE 
        WHEN COUNT(clog.id) > 0 THEN 
            ROUND((COUNT(CASE WHEN clog.status = 'completed' THEN 1 END)::DECIMAL / COUNT(clog.id)::DECIMAL) * 100, 2)
        ELSE 0
    END as answer_rate,
    CASE 
        WHEN COUNT(cl.id) > 0 THEN 
            ROUND((COUNT(CASE WHEN cl.status = 'completed' THEN 1 END)::DECIMAL / COUNT(cl.id)::DECIMAL) * 100, 2)
        ELSE 0
    END as completion_rate
FROM campaigns c
LEFT JOIN campaign_leads cl ON c.id = cl.campaign_id
LEFT JOIN call_logs clog ON cl.id = clog.lead_id
GROUP BY c.id, c.name, c.status, c.total_leads;

-- 3. Create detailed call history view for analytics page
CREATE OR REPLACE VIEW call_history_detailed AS
SELECT 
    cl.id as lead_id,
    cl.campaign_id,
    cl.phone_number,
    cl.first_name,
    cl.last_name,
    cl.status as lead_status,
    cl.call_attempts,
    cl.qualified,
    cl.appointment_scheduled,
    cl.customer_data_collected,
    -- Call details
    clog.id as call_log_id,
    clog.call_sid,
    clog.status as call_status,
    clog.duration_seconds,
    clog.recording_url,
    clog.started_at as call_time,
    clog.ended_at as call_ended,
    clog.call_summary,
    clog.transcript,
    clog.outcome,
    clog.sentiment_score,
    clog.follow_up_required,
    -- Customer data
    cd.full_name,
    cd.email,
    cd.date_of_birth,
    cd.current_address,
    cd.current_city,
    cd.current_state,
    cd.current_zip,
    cd.previous_address,
    cd.moved_in_last_year,
    cd.internet_speed_package,
    cd.preferred_install_date,
    cd.preferred_install_time,
    cd.autopay_opted_in,
    cd.payment_method,
    cd.interested,
    -- Sync status
    gs.synced_to_sheets,
    gs.last_sync_at,
    gs.zapier_webhook_sent
FROM campaign_leads cl
LEFT JOIN call_logs clog ON cl.id = clog.lead_id
LEFT JOIN customer_data cd ON cl.id = cd.lead_id
LEFT JOIN google_sheets_sync gs ON cl.id = gs.lead_id
ORDER BY clog.started_at DESC;

-- 4. Create function to get leads ready for Google Sheets export
CREATE OR REPLACE FUNCTION get_qualified_leads_for_export(campaign_uuid UUID)
RETURNS TABLE (
    lead_id UUID,
    phone_number TEXT,
    first_name TEXT,
    last_name TEXT,
    full_name TEXT,
    email TEXT,
    date_of_birth DATE,
    current_address TEXT,
    current_city TEXT,
    current_state TEXT,
    current_zip TEXT,
    previous_address TEXT,
    moved_in_last_year BOOLEAN,
    internet_speed_package TEXT,
    preferred_install_date DATE,
    preferred_install_time TEXT,
    autopay_opted_in BOOLEAN,
    payment_method TEXT,
    call_duration INTEGER,
    recording_url TEXT,
    call_summary TEXT,
    qualified BOOLEAN,
    appointment_scheduled BOOLEAN,
    interested BOOLEAN,
    call_outcome TEXT,
    synced_to_sheets BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cl.id,
        cl.phone_number::TEXT,
        cl.first_name::TEXT,
        cl.last_name::TEXT,
        cd.full_name::TEXT,
        cd.email::TEXT,
        cd.date_of_birth,
        cd.current_address,
        cd.current_city::TEXT,
        cd.current_state::TEXT,
        cd.current_zip::TEXT,
        cd.previous_address,
        cd.moved_in_last_year,
        cd.internet_speed_package::TEXT,
        cd.preferred_install_date,
        cd.preferred_install_time::TEXT,
        cd.autopay_opted_in,
        cd.payment_method::TEXT,
        clog.duration_seconds,
        clog.recording_url,
        clog.call_summary,
        cl.qualified,
        cl.appointment_scheduled,
        cd.interested,
        clog.outcome::TEXT,
        COALESCE(gs.synced_to_sheets, false)
    FROM campaign_leads cl
    LEFT JOIN customer_data cd ON cl.id = cd.lead_id
    LEFT JOIN call_logs clog ON cl.id = clog.lead_id
    LEFT JOIN google_sheets_sync gs ON cl.id = gs.lead_id
    WHERE cl.campaign_id = campaign_uuid
    AND cl.customer_data_collected = true
    ORDER BY cl.qualified DESC, cl.appointment_scheduled DESC, clog.started_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 5. Test the analytics functions with your campaign
SELECT 'Analytics Functions Created Successfully!' as message;

-- Test the main analytics function
SELECT 'Campaign Analytics:' as info;
SELECT * FROM get_campaign_analytics('c8b48267-e2b0-4743-940b-413a88ba0391');

-- Test the dashboard view
SELECT 'Campaign Dashboard:' as info;
SELECT 
    campaign_name,
    actual_leads,
    calls_made,
    calls_answered,
    qualified_leads,
    appointments_scheduled,
    success_rate,
    answer_rate,
    avg_call_duration,
    total_talk_time
FROM campaign_dashboard 
WHERE campaign_id = 'c8b48267-e2b0-4743-940b-413a88ba0391';

-- Test the export function
SELECT 'Qualified Leads for Export:' as info;
SELECT 
    first_name,
    last_name,
    email,
    internet_speed_package,
    qualified,
    appointment_scheduled,
    call_duration,
    synced_to_sheets
FROM get_qualified_leads_for_export('c8b48267-e2b0-4743-940b-413a88ba0391');

-- Show call history summary
SELECT 'Call History Summary:' as info;
SELECT 
    first_name,
    last_name,
    call_status,
    duration_seconds,
    outcome,
    qualified,
    appointment_scheduled
FROM call_history_detailed 
WHERE campaign_id = 'c8b48267-e2b0-4743-940b-413a88ba0391'
AND call_log_id IS NOT NULL
ORDER BY call_time DESC;
