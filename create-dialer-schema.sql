-- Create campaign_dialer_status table
CREATE TABLE IF NOT EXISTS campaign_dialer_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('idle', 'running', 'paused', 'stopping')),
  active_calls INTEGER DEFAULT 0,
  calls_in_queue INTEGER DEFAULT 0,
  completed_calls INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE,
  paused_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(campaign_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_campaign_dialer_status_campaign_id ON campaign_dialer_status(campaign_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_campaign_dialer_status_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_campaign_dialer_status_updated_at
  BEFORE UPDATE ON campaign_dialer_status
  FOR EACH ROW
  EXECUTE FUNCTION update_campaign_dialer_status_updated_at();

-- Enable RLS (Row Level Security)
ALTER TABLE campaign_dialer_status ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS
CREATE POLICY "Users can view their own campaign dialer status" ON campaign_dialer_status
  FOR SELECT USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own campaign dialer status" ON campaign_dialer_status
  FOR ALL USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE profile_id = auth.uid()
    )
  );

-- Create function to initialize dialer status when campaign is created
CREATE OR REPLACE FUNCTION initialize_campaign_dialer_status()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO campaign_dialer_status (campaign_id, status, active_calls, calls_in_queue, completed_calls)
  VALUES (NEW.id, 'idle', 0, 0, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to initialize dialer status
CREATE TRIGGER initialize_campaign_dialer_status_trigger
  AFTER INSERT ON campaigns
  FOR EACH ROW
  EXECUTE FUNCTION initialize_campaign_dialer_status();

-- Create function to update calls_in_queue when leads are added/removed
CREATE OR REPLACE FUNCTION update_dialer_queue_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE campaign_dialer_status
  SET calls_in_queue = (
    SELECT COUNT(*)
    FROM campaign_leads
    WHERE campaign_id = COALESCE(NEW.campaign_id, OLD.campaign_id)
    AND status = 'pending'
  )
  WHERE campaign_id = COALESCE(NEW.campaign_id, OLD.campaign_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers to update queue count
CREATE TRIGGER update_dialer_queue_count_insert
  AFTER INSERT ON campaign_leads
  FOR EACH ROW
  EXECUTE FUNCTION update_dialer_queue_count();

CREATE TRIGGER update_dialer_queue_count_update
  AFTER UPDATE ON campaign_leads
  FOR EACH ROW
  EXECUTE FUNCTION update_dialer_queue_count();

CREATE TRIGGER update_dialer_queue_count_delete
  AFTER DELETE ON campaign_leads
  FOR EACH ROW
  EXECUTE FUNCTION update_dialer_queue_count();

-- Create function to update completed calls count
CREATE OR REPLACE FUNCTION update_dialer_completed_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE campaign_dialer_status
  SET completed_calls = (
    SELECT COUNT(*)
    FROM campaign_leads
    WHERE campaign_id = COALESCE(NEW.campaign_id, OLD.campaign_id)
    AND status IN ('completed', 'no_answer', 'busy', 'failed')
  )
  WHERE campaign_id = COALESCE(NEW.campaign_id, OLD.campaign_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers to update completed count
CREATE TRIGGER update_dialer_completed_count_insert
  AFTER INSERT ON campaign_leads
  FOR EACH ROW
  EXECUTE FUNCTION update_dialer_completed_count();

CREATE TRIGGER update_dialer_completed_count_update
  AFTER UPDATE ON campaign_leads
  FOR EACH ROW
  EXECUTE FUNCTION update_dialer_completed_count();

CREATE TRIGGER update_dialer_completed_count_delete
  AFTER DELETE ON campaign_leads
  FOR EACH ROW
  EXECUTE FUNCTION update_dialer_completed_count();
