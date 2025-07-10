-- Enhanced Call Tracking System for Internet Service Lead Management
-- This creates comprehensive call tracking with customer data collection

-- 1. Create call_logs table for detailed call tracking
CREATE TABLE IF NOT EXISTS call_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES campaign_leads(id) ON DELETE CASCADE,
    call_sid VARCHAR(255) UNIQUE, -- Twilio call SID
    call_status VARCHAR(50) NOT NULL, -- answered, no-answer, busy, failed, voicemail
    call_direction VARCHAR(20) DEFAULT 'outbound', -- outbound, inbound
    duration INTEGER DEFAULT 0, -- call duration in seconds
    recording_url TEXT, -- URL to call recording
    recording_duration INTEGER, -- recording duration in seconds
    answered BOOLEAN DEFAULT false, -- was call answered by human
    voicemail_detected BOOLEAN DEFAULT false, -- was voicemail detected
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create customer_data table for detailed customer information
CREATE TABLE IF NOT EXISTS customer_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES campaign_leads(id) ON DELETE CASCADE,
    call_log_id UUID REFERENCES call_logs(id) ON DELETE SET NULL,
    
    -- Personal Information
    full_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(20),
    date_of_birth DATE,
    ssn VARCHAR(20), -- encrypted/hashed in production
    
    -- Address Information
    current_address TEXT,
    current_city VARCHAR(100),
    current_state VARCHAR(50),
    current_zip VARCHAR(20),
    
    -- Previous address (if moved in last year)
    previous_address TEXT,
    previous_city VARCHAR(100),
    previous_state VARCHAR(50),
    previous_zip VARCHAR(20),
    moved_in_last_year BOOLEAN DEFAULT false,
    
    -- Service Preferences
    internet_speed_package VARCHAR(100), -- e.g., "100 Mbps", "Gig Speed"
    preferred_install_date DATE,
    preferred_install_time VARCHAR(50), -- e.g., "Morning", "Afternoon", "Evening"
    
    -- Autopay Information
    autopay_opted_in BOOLEAN DEFAULT false,
    payment_method VARCHAR(50), -- credit_card, bank_account, etc.
    
    -- Call outcome
    interested BOOLEAN DEFAULT false,
    qualified BOOLEAN DEFAULT false,
    appointment_scheduled BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create call_summaries table for AI-generated call summaries
CREATE TABLE IF NOT EXISTS call_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_log_id UUID REFERENCES call_logs(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES campaign_leads(id) ON DELETE CASCADE,
    
    -- AI-generated summary
    summary TEXT,
    key_points JSONB, -- structured key points from the call
    sentiment VARCHAR(20), -- positive, negative, neutral
    
    -- Call outcome classification
    outcome VARCHAR(50), -- interested, not_interested, callback_requested, appointment_set, etc.
    follow_up_required BOOLEAN DEFAULT false,
    follow_up_date DATE,
    follow_up_notes TEXT,
    
    -- Success metrics
    qualified_lead BOOLEAN DEFAULT false,
    appointment_scheduled BOOLEAN DEFAULT false,
    sale_potential VARCHAR(20), -- high, medium, low
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create google_sheets_sync table for tracking data exports
CREATE TABLE IF NOT EXISTS google_sheets_sync (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES campaign_leads(id) ON DELETE CASCADE,
    customer_data_id UUID REFERENCES customer_data(id) ON DELETE CASCADE,
    
    -- Sync status
    synced_to_sheets BOOLEAN DEFAULT false,
    sheet_row_number INTEGER,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    sync_error TEXT,
    
    -- Zapier integration
    zapier_webhook_sent BOOLEAN DEFAULT false,
    zapier_response TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Add new columns to campaign_leads for better tracking
ALTER TABLE campaign_leads 
ADD COLUMN IF NOT EXISTS last_call_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_call_status VARCHAR(50),
ADD COLUMN IF NOT EXISTS last_call_duration INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS answered_calls INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS qualified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS appointment_scheduled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS customer_data_collected BOOLEAN DEFAULT false;

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_call_logs_campaign_id ON call_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_lead_id ON call_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_call_sid ON call_logs(call_sid);
CREATE INDEX IF NOT EXISTS idx_call_logs_status ON call_logs(call_status);
CREATE INDEX IF NOT EXISTS idx_call_logs_created_at ON call_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_customer_data_lead_id ON customer_data(lead_id);
CREATE INDEX IF NOT EXISTS idx_customer_data_qualified ON customer_data(qualified);
CREATE INDEX IF NOT EXISTS idx_customer_data_appointment ON customer_data(appointment_scheduled);

CREATE INDEX IF NOT EXISTS idx_call_summaries_call_log_id ON call_summaries(call_log_id);
CREATE INDEX IF NOT EXISTS idx_call_summaries_outcome ON call_summaries(outcome);
CREATE INDEX IF NOT EXISTS idx_call_summaries_qualified ON call_summaries(qualified_lead);

-- 7. Create triggers for automatic updates
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

-- 8. Create function to calculate campaign success metrics
CREATE OR REPLACE FUNCTION calculate_campaign_success_rate(campaign_uuid UUID)
RETURNS TABLE (
    total_leads INTEGER,
    calls_made INTEGER,
    calls_answered INTEGER,
    qualified_leads INTEGER,
    appointments_scheduled INTEGER,
    success_rate DECIMAL(5,2),
    answer_rate DECIMAL(5,2),
    qualification_rate DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(cl.id)::INTEGER as total_leads,
        COUNT(clog.id)::INTEGER as calls_made,
        COUNT(CASE WHEN clog.answered THEN 1 END)::INTEGER as calls_answered,
        COUNT(CASE WHEN cl.qualified THEN 1 END)::INTEGER as qualified_leads,
        COUNT(CASE WHEN cl.appointment_scheduled THEN 1 END)::INTEGER as appointments_scheduled,
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
        END as qualification_rate
    FROM campaign_leads cl
    LEFT JOIN call_logs clog ON cl.id = clog.lead_id
    WHERE cl.campaign_id = campaign_uuid;
END;
$$ LANGUAGE plpgsql;

-- 9. Create view for comprehensive analytics
CREATE OR REPLACE VIEW campaign_analytics AS
SELECT 
    c.id as campaign_id,
    c.name as campaign_name,
    c.status as campaign_status,
    c.total_leads,
    COUNT(cl.id) as actual_leads,
    COUNT(clog.id) as total_calls,
    COUNT(CASE WHEN clog.answered THEN 1 END) as answered_calls,
    COUNT(CASE WHEN cl.qualified THEN 1 END) as qualified_leads,
    COUNT(CASE WHEN cl.appointment_scheduled THEN 1 END) as appointments_scheduled,
    COUNT(CASE WHEN cl.customer_data_collected THEN 1 END) as data_collected,
    ROUND(AVG(clog.duration)::NUMERIC, 2) as avg_call_duration,
    CASE 
        WHEN COUNT(cl.id) > 0 THEN 
            ROUND((COUNT(CASE WHEN cl.qualified THEN 1 END)::DECIMAL / COUNT(cl.id)::DECIMAL) * 100, 2)
        ELSE 0
    END as success_rate,
    CASE 
        WHEN COUNT(clog.id) > 0 THEN 
            ROUND((COUNT(CASE WHEN clog.answered THEN 1 END)::DECIMAL / COUNT(clog.id)::DECIMAL) * 100, 2)
        ELSE 0
    END as answer_rate
FROM campaigns c
LEFT JOIN campaign_leads cl ON c.id = cl.campaign_id
LEFT JOIN call_logs clog ON cl.id = clog.lead_id
GROUP BY c.id, c.name, c.status, c.total_leads;

-- 10. Enable RLS (Row Level Security) for the new tables
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_sheets_sync ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (adjust based on your auth system)
CREATE POLICY "Users can view their own call logs" ON call_logs
    FOR SELECT USING (
        campaign_id IN (
            SELECT id FROM campaigns 
            WHERE profile_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own call logs" ON call_logs
    FOR INSERT WITH CHECK (
        campaign_id IN (
            SELECT id FROM campaigns 
            WHERE profile_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own call logs" ON call_logs
    FOR UPDATE USING (
        campaign_id IN (
            SELECT id FROM campaigns 
            WHERE profile_id = auth.uid()
        )
    );

-- Similar policies for other tables
CREATE POLICY "Users can manage their customer data" ON customer_data
    FOR ALL USING (
        lead_id IN (
            SELECT cl.id FROM campaign_leads cl
            JOIN campaigns c ON cl.campaign_id = c.id
            WHERE c.profile_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage their call summaries" ON call_summaries
    FOR ALL USING (
        lead_id IN (
            SELECT cl.id FROM campaign_leads cl
            JOIN campaigns c ON cl.campaign_id = c.id
            WHERE c.profile_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage their google sheets sync" ON google_sheets_sync
    FOR ALL USING (
        lead_id IN (
            SELECT cl.id FROM campaign_leads cl
            JOIN campaigns c ON cl.campaign_id = c.id
            WHERE c.profile_id = auth.uid()
        )
    );

-- 11. Insert sample data to test the system (first check if call_logs table was created)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'call_logs') THEN
        INSERT INTO call_logs (campaign_id, lead_id, call_sid, call_status, duration, answered, recording_url)
        SELECT 
            cl.campaign_id,
            cl.id,
            'CA' || substr(md5(random()::text), 1, 30), -- Sample call SID
            CASE 
                WHEN random() < 0.6 THEN 'completed'
                WHEN random() < 0.8 THEN 'no-answer'
                ELSE 'failed'
            END,
            CASE 
                WHEN random() < 0.6 THEN (random() * 300 + 30)::INTEGER -- 30-330 seconds
                ELSE 0
            END,
            random() < 0.6,
            CASE 
                WHEN random() < 0.6 THEN 'https://api.twilio.com/recordings/sample-' || substr(md5(random()::text), 1, 10)
                ELSE NULL
            END
        FROM campaign_leads cl
        WHERE cl.campaign_id = 'c8b48267-e2b0-4743-940b-413a88ba0391'
        LIMIT 3;
    END IF;
END $$;

-- Verify the installation
SELECT 'Installation complete! New tables created:' as message;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('call_logs', 'customer_data', 'call_summaries', 'google_sheets_sync')
ORDER BY table_name;

-- Show the enhanced analytics view
SELECT 'Campaign Analytics Preview:' as message;
SELECT * FROM campaign_analytics 
WHERE campaign_id = 'c8b48267-e2b0-4743-940b-413a88ba0391';
