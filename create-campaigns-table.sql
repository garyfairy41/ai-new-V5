-- Create the main campaigns table (should be called 'campaigns' not 'outbound_campaigns')

CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES ai_agents(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled')),
    caller_id TEXT NOT NULL,
    max_concurrent_calls INTEGER NOT NULL DEFAULT 1 CHECK (max_concurrent_calls > 0),
    call_timeout_seconds INTEGER NOT NULL DEFAULT 30 CHECK (call_timeout_seconds > 0),
    retry_attempts INTEGER NOT NULL DEFAULT 3 CHECK (retry_attempts >= 0),
    retry_delay_minutes INTEGER NOT NULL DEFAULT 60 CHECK (retry_delay_minutes >= 0),
    start_time TIME,
    end_time TIME,
    timezone TEXT NOT NULL DEFAULT 'America/New_York',
    days_of_week INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5}',
    scheduled_start_date DATE,
    scheduled_end_date DATE,
    custom_system_instruction TEXT,
    custom_voice_name TEXT CHECK (custom_voice_name IN ('Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede', 'Leda', 'Orus', 'Zephyr')),
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    compliance_settings JSONB,
    total_leads INTEGER NOT NULL DEFAULT 0,
    leads_called INTEGER NOT NULL DEFAULT 0,
    leads_answered INTEGER NOT NULL DEFAULT 0,
    leads_completed INTEGER NOT NULL DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Create the campaign_leads table
CREATE TABLE IF NOT EXISTS campaign_leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    phone_number TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'calling', 'called', 'completed', 'failed', 'dnc')),
    call_attempts INTEGER NOT NULL DEFAULT 0,
    last_called_at TIMESTAMP WITH TIME ZONE,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    outcome TEXT CHECK (outcome IN ('answered', 'no_answer', 'busy', 'failed', 'completed', 'dnc')),
    notes TEXT,
    custom_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    UNIQUE(campaign_id, phone_number)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_campaigns_profile_id ON campaigns(profile_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON campaigns(created_at);
CREATE INDEX IF NOT EXISTS idx_campaign_leads_campaign_id ON campaign_leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_leads_phone_number ON campaign_leads(phone_number);
CREATE INDEX IF NOT EXISTS idx_campaign_leads_status ON campaign_leads(status);

-- Enable RLS
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_leads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for campaigns
CREATE POLICY "Users can view their own campaigns" ON campaigns
    FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY "Users can insert their own campaigns" ON campaigns
    FOR INSERT WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users can update their own campaigns" ON campaigns
    FOR UPDATE USING (profile_id = auth.uid());

CREATE POLICY "Users can delete their own campaigns" ON campaigns
    FOR DELETE USING (profile_id = auth.uid());

-- RLS Policies for campaign_leads
CREATE POLICY "Users can view their campaign leads" ON campaign_leads
    FOR SELECT USING (
        campaign_id IN (
            SELECT id FROM campaigns WHERE profile_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert campaign leads" ON campaign_leads
    FOR INSERT WITH CHECK (
        campaign_id IN (
            SELECT id FROM campaigns WHERE profile_id = auth.uid()
        )
    );

CREATE POLICY "Users can update campaign leads" ON campaign_leads
    FOR UPDATE USING (
        campaign_id IN (
            SELECT id FROM campaigns WHERE profile_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete campaign leads" ON campaign_leads
    FOR DELETE USING (
        campaign_id IN (
            SELECT id FROM campaigns WHERE profile_id = auth.uid()
        )
    );

-- Update triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc', now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_campaigns_updated_at 
    BEFORE UPDATE ON campaigns 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaign_leads_updated_at 
    BEFORE UPDATE ON campaign_leads 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
