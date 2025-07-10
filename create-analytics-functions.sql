-- Step 2: Create analytics functions and views for the UI
-- This will provide all the metrics and data you need in the campaign interface

-- 1. Create function to calculate campaign success metrics
CREATE OR REPLACE FUNCTION calculate_campaign_metrics(campaign_uuid UUID)
RETURNS TABLE (
    campaign_id UUID,
    campaign_name VARCHAR,
    total_leads INTEGER,
    calls_made INTEGER,
    calls_answered INTEGER,
    qualified_leads INTEGER,
    appointments_scheduled INTEGER,
    data_collected INTEGER,
    success_rate DECIMAL(5,2),
    answer_rate DECIMAL(5,2),
    qualification_rate DECIMAL(5,2),
    avg_call_duration DECIMAL(8,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.name,
        COUNT(cl.id)::INTEGER as total_leads,
        COUNT(clog.id)::INTEGER as calls_made,
        COUNT(CASE WHEN clog.answered THEN 1 END)::INTEGER as calls_answered,
        COUNT(CASE WHEN cl.qualified THEN 1 END)::INTEGER as qualified_leads,
        COUNT(CASE WHEN cl.appointment_scheduled THEN 1 END)::INTEGER as appointments_scheduled,
        COUNT(CASE WHEN cl.customer_data_collected THEN 1 END)::INTEGER as data_collected,
        CASE 
            WHEN COUNT(cl.id) > 0 THEN 
                ROUND((COUNT(CASE WHEN cl.qualified THEN 1 END)::DECIMAL / COUNT(cl.id)::DECIMAL) * 100, 2)
            ELSE 0
        END as success_rate,
        CASE 
            WHEN COUNT(clog.id) > 0 THEN 
                ROUND((COUNT(CASE WHEN clog.answered THEN 1 END)::DECIMAL / COUNT(clog.id)::DECIMAL) * 100, 2)
            ELSE 0
        END as answer_rate,
        CASE 
            WHEN COUNT(CASE WHEN clog.answered THEN 1 END) > 0 THEN 
                ROUND((COUNT(CASE WHEN cl.qualified THEN 1 END)::DECIMAL / COUNT(CASE WHEN clog.answered THEN 1 END)::DECIMAL) * 100, 2)
            ELSE 0
        END as qualification_rate,
        ROUND(AVG(CASE WHEN clog.duration > 0 THEN clog.duration END)::NUMERIC, 2) as avg_call_duration
    FROM campaigns c
    LEFT JOIN campaign_leads cl ON c.id = cl.campaign_id
    LEFT JOIN call_logs clog ON cl.id = clog.lead_id
    WHERE c.id = campaign_uuid
    GROUP BY c.id, c.name;
END;
$$ LANGUAGE plpgsql;

-- 2. Create comprehensive analytics view for the UI
CREATE OR REPLACE VIEW campaign_analytics_detailed AS
SELECT 
    c.id as campaign_id,
    c.name as campaign_name,
    c.status as campaign_status,
    c.total_leads as expected_leads,
    COUNT(cl.id) as actual_leads,
    COUNT(clog.id) as total_calls,
    COUNT(CASE WHEN clog.answered THEN 1 END) as answered_calls,
    COUNT(CASE WHEN clog.call_status = 'no-answer' THEN 1 END) as no_answer_calls,
    COUNT(CASE WHEN clog.call_status = 'busy' THEN 1 END) as busy_calls,
    COUNT(CASE WHEN clog.call_status = 'failed' THEN 1 END) as failed_calls,
    COUNT(CASE WHEN clog.voicemail_detected THEN 1 END) as voicemail_calls,
    COUNT(CASE WHEN cl.qualified THEN 1 END) as qualified_leads,
    COUNT(CASE WHEN cl.appointment_scheduled THEN 1 END) as appointments_scheduled,
    COUNT(CASE WHEN cl.customer_data_collected THEN 1 END) as data_collected,
    ROUND(AVG(CASE WHEN clog.duration > 0 THEN clog.duration END)::NUMERIC, 2) as avg_call_duration,
    MAX(clog.created_at) as last_call_time,
    -- Success metrics
    CASE 
        WHEN COUNT(cl.id) > 0 THEN 
            ROUND((COUNT(CASE WHEN cl.qualified THEN 1 END)::DECIMAL / COUNT(cl.id)::DECIMAL) * 100, 2)
        ELSE 0
    END as success_rate,
    CASE 
        WHEN COUNT(clog.id) > 0 THEN 
            ROUND((COUNT(CASE WHEN clog.answered THEN 1 END)::DECIMAL / COUNT(clog.id)::DECIMAL) * 100, 2)
        ELSE 0
    END as answer_rate,
    CASE 
        WHEN COUNT(CASE WHEN clog.answered THEN 1 END) > 0 THEN 
            ROUND((COUNT(CASE WHEN cl.qualified THEN 1 END)::DECIMAL / COUNT(CASE WHEN clog.answered THEN 1 END)::DECIMAL) * 100, 2)
        ELSE 0
    END as qualification_rate,
    -- Progress tracking
    CASE 
        WHEN COUNT(cl.id) > 0 THEN 
            ROUND((COUNT(CASE WHEN cl.status = 'completed' THEN 1 END)::DECIMAL / COUNT(cl.id)::DECIMAL) * 100, 2)
        ELSE 0
    END as completion_rate
FROM campaigns c
LEFT JOIN campaign_leads cl ON c.id = cl.campaign_id
LEFT JOIN call_logs clog ON cl.id = clog.lead_id
GROUP BY c.id, c.name, c.status, c.total_leads;

-- 3. Create view for individual call details (for the analytics page)
CREATE OR REPLACE VIEW call_details_view AS
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
    -- Call log details
    clog.id as call_log_id,
    clog.call_sid,
    clog.call_status,
    clog.duration,
    clog.recording_url,
    clog.answered,
    clog.voicemail_detected,
    clog.created_at as call_time,
    -- Call summary
    cs.summary as call_summary,
    cs.sentiment,
    cs.outcome,
    cs.follow_up_required,
    cs.follow_up_date,
    cs.sale_potential,
    -- Customer data
    cd.full_name,
    cd.email,
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
    cd.date_of_birth,
    cd.ssn,
    -- Google Sheets sync status
    gs.synced_to_sheets,
    gs.last_sync_at,
    gs.zapier_webhook_sent
FROM campaign_leads cl
LEFT JOIN call_logs clog ON cl.id = clog.lead_id
LEFT JOIN call_summaries cs ON clog.id = cs.call_log_id
LEFT JOIN customer_data cd ON cl.id = cd.lead_id
LEFT JOIN google_sheets_sync gs ON cl.id = gs.lead_id;

-- 4. Create function to get leads ready for Google Sheets export
CREATE OR REPLACE FUNCTION get_leads_for_export(campaign_uuid UUID)
RETURNS TABLE (
    lead_id UUID,
    phone_number VARCHAR,
    first_name VARCHAR,
    last_name VARCHAR,
    full_name VARCHAR,
    email VARCHAR,
    date_of_birth DATE,
    ssn VARCHAR,
    current_address TEXT,
    current_city VARCHAR,
    current_state VARCHAR,
    current_zip VARCHAR,
    previous_address TEXT,
    moved_in_last_year BOOLEAN,
    internet_speed_package VARCHAR,
    preferred_install_date DATE,
    preferred_install_time VARCHAR,
    autopay_opted_in BOOLEAN,
    payment_method VARCHAR,
    call_status VARCHAR,
    call_duration INTEGER,
    recording_url TEXT,
    qualified BOOLEAN,
    appointment_scheduled BOOLEAN,
    interested BOOLEAN,
    synced_to_sheets BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cd.lead_id,
        cl.phone_number,
        cl.first_name,
        cl.last_name,
        cd.full_name,
        cd.email,
        cd.date_of_birth,
        cd.ssn,
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
        cl.last_call_status,
        cl.last_call_duration,
        clog.recording_url,
        cl.qualified,
        cl.appointment_scheduled,
        cd.interested,
        COALESCE(gs.synced_to_sheets, false)
    FROM campaign_leads cl
    LEFT JOIN customer_data cd ON cl.id = cd.lead_id
    LEFT JOIN call_logs clog ON cl.id = clog.lead_id AND clog.created_at = cl.last_call_at
    LEFT JOIN google_sheets_sync gs ON cl.id = gs.lead_id
    WHERE cl.campaign_id = campaign_uuid
    AND cl.customer_data_collected = true
    ORDER BY cl.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 5. Create trigger to automatically update campaign_leads when call_logs are inserted
CREATE OR REPLACE FUNCTION update_campaign_lead_on_call()
RETURNS TRIGGER AS $$
BEGIN
    -- Update campaign_leads with latest call information
    UPDATE campaign_leads 
    SET 
        last_call_at = NEW.created_at,
        last_call_status = NEW.call_status,
        last_call_duration = NEW.duration,
        answered_calls = answered_calls + CASE WHEN NEW.answered THEN 1 ELSE 0 END,
        updated_at = NOW()
    WHERE id = NEW.lead_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_update_campaign_lead_on_call
    AFTER INSERT OR UPDATE ON call_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_campaign_lead_on_call();

-- 6. Create function to mark lead as qualified and update Google Sheets sync
CREATE OR REPLACE FUNCTION mark_lead_qualified(
    lead_uuid UUID,
    is_qualified BOOLEAN DEFAULT true,
    has_appointment BOOLEAN DEFAULT false,
    data_collected BOOLEAN DEFAULT false
)
RETURNS VOID AS $$
BEGIN
    UPDATE campaign_leads 
    SET 
        qualified = is_qualified,
        appointment_scheduled = has_appointment,
        customer_data_collected = data_collected,
        updated_at = NOW()
    WHERE id = lead_uuid;
    
    -- If qualified and data collected, mark for Google Sheets sync
    IF is_qualified AND data_collected THEN
        INSERT INTO google_sheets_sync (lead_id, synced_to_sheets, created_at)
        VALUES (lead_uuid, false, NOW())
        ON CONFLICT (lead_id) DO UPDATE SET
            synced_to_sheets = false,
            updated_at = NOW();
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 7. Add Row Level Security policies for new views
CREATE POLICY "Users can view their own campaign analytics" ON campaigns
    FOR SELECT USING (profile_id = auth.uid());

-- 8. Test the new functions with your existing campaign
SELECT 'Step 2 Complete! Functions and views created.' as message;

-- Test the analytics function
SELECT 'Testing analytics function:' as message;
SELECT * FROM calculate_campaign_metrics('c8b48267-e2b0-4743-940b-413a88ba0391');

-- Test the analytics view
SELECT 'Testing analytics view:' as message;
SELECT * FROM campaign_analytics_detailed 
WHERE campaign_id = 'c8b48267-e2b0-4743-940b-413a88ba0391';
