-- Schema for missing tables identified by create-all-tables.js
-- These tables are expected by the application but missing from your database

-- 1. NOTIFICATIONS TABLE
-- Used for in-app notifications, alerts, and system messages
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
    read BOOLEAN DEFAULT FALSE,
    action_url TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_profile_id ON notifications(profile_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- RLS (Row Level Security)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policies for notifications
CREATE POLICY "Users can view own notifications" ON notifications 
FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON notifications 
FOR UPDATE USING (profile_id = auth.uid());

CREATE POLICY "System can insert notifications" ON notifications 
FOR INSERT WITH CHECK (true);

-- 2. ACTIVE_CALLS TABLE  
-- Used for real-time call tracking and monitoring
CREATE TABLE IF NOT EXISTS active_calls (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    call_sid TEXT UNIQUE NOT NULL,
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES ai_agents(id) ON DELETE SET NULL,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
    lead_id UUID REFERENCES campaign_leads(id) ON DELETE SET NULL,
    phone_number_from TEXT NOT NULL,
    phone_number_to TEXT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'ringing', 'in-progress', 'completed', 'failed', 'busy', 'no-answer', 'canceled')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    answered_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER DEFAULT 0,
    recording_url TEXT,
    call_quality TEXT CHECK (call_quality IN ('excellent', 'good', 'fair', 'poor')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_active_calls_profile_id ON active_calls(profile_id);
CREATE INDEX IF NOT EXISTS idx_active_calls_call_sid ON active_calls(call_sid);
CREATE INDEX IF NOT EXISTS idx_active_calls_status ON active_calls(status);
CREATE INDEX IF NOT EXISTS idx_active_calls_started_at ON active_calls(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_active_calls_agent_id ON active_calls(agent_id);

-- RLS (Row Level Security)
ALTER TABLE active_calls ENABLE ROW LEVEL SECURITY;

-- Policies for active_calls
CREATE POLICY "Users can view own active calls" ON active_calls 
FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY "Users can manage own active calls" ON active_calls 
FOR ALL USING (profile_id = auth.uid());

-- System can manage all active calls (for server operations)
CREATE POLICY "System can manage active calls" ON active_calls 
FOR ALL USING (true);

-- 3. TRIGGER FUNCTIONS FOR UPDATED_AT
-- Auto-update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to both tables
CREATE TRIGGER update_notifications_updated_at 
    BEFORE UPDATE ON notifications 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_active_calls_updated_at 
    BEFORE UPDATE ON active_calls 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. COMMENTS FOR DOCUMENTATION
COMMENT ON TABLE notifications IS 'Stores in-app notifications, alerts, and system messages for users';
COMMENT ON TABLE active_calls IS 'Tracks real-time call status and metadata for active/ongoing calls';

COMMENT ON COLUMN notifications.type IS 'Notification type: info, success, warning, error';
COMMENT ON COLUMN active_calls.call_sid IS 'Twilio Call SID - unique identifier for the call';
COMMENT ON COLUMN active_calls.direction IS 'Call direction: inbound or outbound';
COMMENT ON COLUMN active_calls.status IS 'Current call status following Twilio standards';
COMMENT ON COLUMN active_calls.call_quality IS 'Assessed call quality: excellent, good, fair, poor';
