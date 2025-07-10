-- Step 3: Add sample call data to test the analytics system
-- This will simulate the call data that should be created when your campaign runs

-- First, let's add some sample call logs for testing
INSERT INTO call_logs (
    campaign_id, 
    lead_id, 
    call_sid, 
    call_status, 
    duration, 
    answered, 
    recording_url,
    created_at
) VALUES 
-- Call for John Doe - answered and had a good conversation
(
    'c8b48267-e2b0-4743-940b-413a88ba0391',
    '2215c6ff-0be9-4b14-b2f8-12bc569b8fa3',
    'CA' || substr(md5(random()::text), 1, 30),
    'completed',
    185, -- 3 minutes 5 seconds
    true,
    'https://api.twilio.com/2010-04-01/Accounts/AC.../Recordings/RE...',
    NOW() - INTERVAL '2 hours'
),
-- Call for Jane Smith - answered but shorter conversation
(
    'c8b48267-e2b0-4743-940b-413a88ba0391',
    '81d8d6b9-8170-4112-aa89-291bc4cdd3ce',
    'CA' || substr(md5(random()::text), 1, 30),
    'completed',
    92, -- 1 minute 32 seconds
    true,
    'https://api.twilio.com/2010-04-01/Accounts/AC.../Recordings/RE...',
    NOW() - INTERVAL '1 hour'
),
-- Call for Bob Johnson - no answer
(
    'c8b48267-e2b0-4743-940b-413a88ba0391',
    '39ecb075-a9bb-4787-ac7f-bbeefd1799c5',
    'CA' || substr(md5(random()::text), 1, 30),
    'no-answer',
    0,
    false,
    NULL,
    NOW() - INTERVAL '30 minutes'
);

-- Add customer data for the answered calls
INSERT INTO customer_data (
    lead_id,
    call_log_id,
    full_name,
    email,
    current_address,
    current_city,
    current_state,
    current_zip,
    internet_speed_package,
    preferred_install_date,
    preferred_install_time,
    autopay_opted_in,
    payment_method,
    interested,
    qualified,
    appointment_scheduled
) VALUES 
-- John Doe - qualified customer
(
    '2215c6ff-0be9-4b14-b2f8-12bc569b8fa3',
    (SELECT id FROM call_logs WHERE lead_id = '2215c6ff-0be9-4b14-b2f8-12bc569b8fa3' LIMIT 1),
    'John Michael Doe',
    'john.doe@email.com',
    '123 Main Street',
    'Springfield',
    'IL',
    '62701',
    'Gig Speed (1000 Mbps)',
    CURRENT_DATE + INTERVAL '5 days',
    'Morning (8AM-12PM)',
    true,
    'credit_card',
    true,
    true,
    true
),
-- Jane Smith - interested but not qualified yet
(
    '81d8d6b9-8170-4112-aa89-291bc4cdd3ce',
    (SELECT id FROM call_logs WHERE lead_id = '81d8d6b9-8170-4112-aa89-291bc4cdd3ce' LIMIT 1),
    'Jane Elizabeth Smith',
    'jane.smith@email.com',
    '456 Oak Avenue',
    'Springfield',
    'IL',
    '62702',
    '500 Mbps',
    CURRENT_DATE + INTERVAL '10 days',
    'Afternoon (12PM-5PM)',
    false,
    'bank_account',
    true,
    false,
    false
);

-- Add call summaries for the answered calls
INSERT INTO call_summaries (
    call_log_id,
    lead_id,
    summary,
    key_points,
    sentiment,
    outcome,
    follow_up_required,
    qualified_lead,
    appointment_scheduled,
    sale_potential
) VALUES 
-- John Doe summary
(
    (SELECT id FROM call_logs WHERE lead_id = '2215c6ff-0be9-4b14-b2f8-12bc569b8fa3' LIMIT 1),
    '2215c6ff-0be9-4b14-b2f8-12bc569b8fa3',
    'Customer was very interested in internet service. Currently has slow DSL and wants to upgrade to fiber. Provided all required information including address verification and payment details. Scheduled installation for next Monday morning.',
    '["Interested in Gig Speed", "Current DSL customer", "Provided full information", "Scheduled installation", "Preferred morning appointment"]',
    'positive',
    'appointment_set',
    false,
    true,
    true,
    'high'
),
-- Jane Smith summary
(
    (SELECT id FROM call_logs WHERE lead_id = '81d8d6b9-8170-4112-aa89-291bc4cdd3ce' LIMIT 1),
    '81d8d6b9-8170-4112-aa89-291bc4cdd3ce',
    'Customer showed interest but needs to check with spouse before making decision. Wants 500 Mbps package. Provided contact information but did not complete signup process. Requested callback in 2 days.',
    '["Interested in 500 Mbps", "Needs spousal approval", "Wants callback", "Provided contact info", "Not ready to commit"]',
    'neutral',
    'callback_requested',
    true,
    false,
    false,
    'medium'
);

-- Update the campaign_leads status to reflect the calls
UPDATE campaign_leads 
SET 
    status = 'completed',
    call_attempts = 1,
    qualified = true,
    appointment_scheduled = true,
    customer_data_collected = true,
    updated_at = NOW()
WHERE id = '2215c6ff-0be9-4b14-b2f8-12bc569b8fa3';

UPDATE campaign_leads 
SET 
    status = 'completed',
    call_attempts = 1,
    qualified = false,
    appointment_scheduled = false,
    customer_data_collected = true,
    updated_at = NOW()
WHERE id = '81d8d6b9-8170-4112-aa89-291bc4cdd3ce';

UPDATE campaign_leads 
SET 
    status = 'completed',
    call_attempts = 1,
    qualified = false,
    appointment_scheduled = false,
    customer_data_collected = false,
    updated_at = NOW()
WHERE id = '39ecb075-a9bb-4787-ac7f-bbeefd1799c5';

-- Verify the data was inserted correctly
SELECT 'Sample data inserted successfully!' as message;

-- Show the call logs
SELECT 'Call Logs:' as info;
SELECT 
    cl.first_name,
    cl.last_name,
    clog.call_status,
    clog.duration,
    clog.answered,
    clog.created_at as call_time
FROM call_logs clog
JOIN campaign_leads cl ON clog.lead_id = cl.id
WHERE clog.campaign_id = 'c8b48267-e2b0-4743-940b-413a88ba0391'
ORDER BY clog.created_at DESC;

-- Show customer data collected
SELECT 'Customer Data Collected:' as info;
SELECT 
    cl.first_name,
    cl.last_name,
    cd.email,
    cd.internet_speed_package,
    cd.qualified,
    cd.appointment_scheduled
FROM customer_data cd
JOIN campaign_leads cl ON cd.lead_id = cl.id
WHERE cl.campaign_id = 'c8b48267-e2b0-4743-940b-413a88ba0391'
ORDER BY cd.created_at DESC;

-- Show updated campaign_leads status
SELECT 'Updated Campaign Leads:' as info;
SELECT 
    first_name,
    last_name,
    status,
    qualified,
    appointment_scheduled,
    customer_data_collected,
    call_attempts
FROM campaign_leads
WHERE campaign_id = 'c8b48267-e2b0-4743-940b-413a88ba0391'
ORDER BY updated_at DESC;
