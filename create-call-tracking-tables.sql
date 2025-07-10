-- Step 1: Create just the essential tables first
-- Enhanced Call Tracking System for Internet Service Lead Management

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

-- 6. Create indexes for performance (only after tables are created)
CREATE INDEX IF NOT EXISTS idx_call_logs_campaign_id ON call_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_lead_id ON call_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_call_sid ON call_logs(call_sid);
CREATE INDEX IF NOT EXISTS idx_call_logs_created_at ON call_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_customer_data_lead_id ON customer_data(lead_id);
CREATE INDEX IF NOT EXISTS idx_customer_data_qualified ON customer_data(qualified);
CREATE INDEX IF NOT EXISTS idx_customer_data_appointment ON customer_data(appointment_scheduled);

CREATE INDEX IF NOT EXISTS idx_call_summaries_call_log_id ON call_summaries(call_log_id);
CREATE INDEX IF NOT EXISTS idx_call_summaries_outcome ON call_summaries(outcome);
CREATE INDEX IF NOT EXISTS idx_call_summaries_qualified ON call_summaries(qualified_lead);

-- Verify the installation
SELECT 'Step 1 Complete! New tables created:' as message;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('call_logs', 'customer_data', 'call_summaries', 'google_sheets_sync')
ORDER BY table_name;
