-- Simple migration to handle company/title to address/service_requested change
-- Run this in your Supabase SQL editor

-- First, ensure the new columns exist
ALTER TABLE campaign_leads 
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS service_requested TEXT;

-- Migrate existing data from company/title to address/service_requested
UPDATE campaign_leads 
SET 
  address = COALESCE(company, ''),
  service_requested = COALESCE(title, '')
WHERE (address IS NULL OR address = '') 
   OR (service_requested IS NULL OR service_requested = '');

-- Optional: Remove old columns if you don't need them anymore
-- Uncomment these lines only after confirming the migration worked:
-- ALTER TABLE campaign_leads DROP COLUMN IF EXISTS company;
-- ALTER TABLE campaign_leads DROP COLUMN IF EXISTS title;
