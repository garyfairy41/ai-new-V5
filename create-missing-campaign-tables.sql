-- Create missing tables for campaign system

-- Table for tracking campaign dialer status in real-time
CREATE TABLE IF NOT EXISTS campaign_dialer_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'idle', -- 'idle', 'running', 'paused', 'stopping'
    active_calls INTEGER DEFAULT 0,
    calls_in_queue INTEGER DEFAULT 0,
    completed_calls INTEGER DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE,
    paused_at TIMESTAMP WITH TIME ZONE,
    total_leads INTEGER DEFAULT 0,
    leads_processed INTEGER DEFAULT 0,
    success_rate REAL DEFAULT 0,
    average_call_duration REAL DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    UNIQUE(campaign_id)
);

-- Table for detailed campaign call logs
CREATE TABLE IF NOT EXISTS campaign_call_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES campaign_leads(id) ON DELETE SET NULL,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    phone_number TEXT NOT NULL,
    call_sid TEXT,
    direction TEXT DEFAULT 'outbound',
    status TEXT NOT NULL, -- 'initiated', 'ringing', 'answered', 'completed', 'failed', 'busy', 'no-answer'
    outcome TEXT, -- 'answered', 'no_answer', 'busy', 'failed', 'completed'
    duration_seconds INTEGER DEFAULT 0,
    call_duration_seconds INTEGER DEFAULT 0,
    recording_url TEXT,
    transcript TEXT,
    notes TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    agent_id UUID REFERENCES ai_agents(id),
    cost DECIMAL(10,4) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_campaign_dialer_status_campaign_id ON campaign_dialer_status(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_call_logs_campaign_id ON campaign_call_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_call_logs_lead_id ON campaign_call_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_campaign_call_logs_profile_id ON campaign_call_logs(profile_id);
CREATE INDEX IF NOT EXISTS idx_campaign_call_logs_status ON campaign_call_logs(status);
CREATE INDEX IF NOT EXISTS idx_campaign_call_logs_created_at ON campaign_call_logs(created_at);

-- Add RLS policies
ALTER TABLE campaign_dialer_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_call_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for campaign_dialer_status
CREATE POLICY "Users can view their campaign dialer status" ON campaign_dialer_status
    FOR SELECT USING (
        campaign_id IN (
            SELECT id FROM campaigns WHERE profile_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their campaign dialer status" ON campaign_dialer_status
    FOR ALL USING (
        campaign_id IN (
            SELECT id FROM campaigns WHERE profile_id = auth.uid()
        )
    );

-- RLS Policies for campaign_call_logs
CREATE POLICY "Users can view their campaign call logs" ON campaign_call_logs
    FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY "Users can insert their campaign call logs" ON campaign_call_logs
    FOR INSERT WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users can update their campaign call logs" ON campaign_call_logs
    FOR UPDATE USING (profile_id = auth.uid());

-- Update triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc', now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_campaign_dialer_status_updated_at 
    BEFORE UPDATE ON campaign_dialer_status 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaign_call_logs_updated_at 
    BEFORE UPDATE ON campaign_call_logs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Verify the tables were created
SELECT 'campaign_dialer_status' as table_name, count(*) as column_count
FROM information_schema.columns 
WHERE table_name = 'campaign_dialer_status'
UNION ALL
SELECT 'campaign_call_logs', count(*)
FROM information_schema.columns 
WHERE table_name = 'campaign_call_logs';
