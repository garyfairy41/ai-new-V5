-- Fix the foreign key constraint in campaign_leads table to point to outbound_campaigns instead of campaigns

-- 1. Drop the existing foreign key constraint
ALTER TABLE campaign_leads DROP CONSTRAINT IF EXISTS campaign_leads_campaign_id_fkey;

-- 2. Add the correct foreign key constraint pointing to outbound_campaigns
ALTER TABLE campaign_leads ADD CONSTRAINT campaign_leads_campaign_id_fkey 
    FOREIGN KEY (campaign_id) REFERENCES outbound_campaigns(id) ON DELETE CASCADE;
