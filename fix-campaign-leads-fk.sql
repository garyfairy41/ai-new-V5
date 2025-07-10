-- Fix campaign_leads foreign key to point to campaigns table instead of outbound_campaigns
ALTER TABLE campaign_leads 
DROP CONSTRAINT IF EXISTS campaign_leads_campaign_id_fkey;

ALTER TABLE campaign_leads 
ADD CONSTRAINT campaign_leads_campaign_id_fkey 
FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE;
