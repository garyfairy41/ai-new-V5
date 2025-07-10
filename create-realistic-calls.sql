-- Step 3: Add sample call data using the ACTUAL column names from call_logs table
-- Based on the real table structure we can see

-- First, let's add some sample call logs for testing using correct column names
INSERT INTO call_logs (
    profile_id,
    agent_id,
    campaign_id, 
    lead_id, 
    phone_number_from,
    phone_number_to,
    direction,
    status,
    started_at,
    ended_at,
    duration_seconds,
    call_summary,
    transcript,
    recording_url,
    sentiment_score,
    outcome,
    priority,
    customer_satisfaction_score,
    follow_up_required,
    call_sid,
    created_at,
    updated_at
) VALUES 
-- Call for John Doe - completed and successful
(
    '5d5f69d3-0cb7-42db-9b10-1246da9c4c22', -- using existing profile_id
    '955a3c29-0244-4dfe-9d13-b5eebaa8387d', -- using existing agent_id
    'c8b48267-e2b0-4743-940b-413a88ba0391',
    '2215c6ff-0be9-4b14-b2f8-12bc569b8fa3',
    '+15133007212', -- dialer number
    '15133007213',  -- John's number
    'outbound',
    'completed',
    NOW() - INTERVAL '2 hours',
    NOW() - INTERVAL '2 hours' + INTERVAL '3 minutes 5 seconds',
    185, -- 3 minutes 5 seconds
    'Customer was very interested in internet service. Currently has slow DSL and wants to upgrade to fiber. Provided all required information and scheduled installation.',
    'Agent: Hello, this is calling about internet service options in your area. Is this John?
Customer: Yes, this is John.
Agent: Great! We have new fiber internet available at your address. Are you interested in faster internet?
Customer: Yes, my current DSL is very slow. What speeds do you offer?
Agent: We have packages from 100 Mbps up to 1 Gig. What do you currently have?
Customer: I think its 25 Mbps DSL and its really slow.
Agent: Perfect! Our Gig package would be a huge improvement. Can I get your full address to verify availability?
Customer: Sure, its 123 Main Street, Springfield IL 62701.
Agent: Excellent, fiber is available there. The Gig package is $79 per month. Would you like me to schedule installation?
Customer: Yes, that sounds great. When is the earliest you can install?
Agent: I have Monday morning available. Would 8 AM to 12 PM work?
Customer: Perfect, lets do that.
Agent: Great! I just need to collect some information for the installation...',
    'https://api.twilio.com/recordings/CA' || substr(md5(random()::text), 1, 30) || '.mp3',
    0.8, -- positive sentiment
    'qualified',
    'high',
    5, -- high satisfaction
    false,
    'CA' || substr(md5(random()::text), 1, 30),
    NOW() - INTERVAL '2 hours',
    NOW() - INTERVAL '2 hours'
),
-- Call for Jane Smith - completed but needs follow-up
(
    '5d5f69d3-0cb7-42db-9b10-1246da9c4c22',
    '955a3c29-0244-4dfe-9d13-b5eebaa8387d',
    'c8b48267-e2b0-4743-940b-413a88ba0391',
    '81d8d6b9-8170-4112-aa89-291bc4cdd3ce',
    '+15133007212',
    '15133007214', -- Jane's number
    'outbound',
    'completed',
    NOW() - INTERVAL '1 hour',
    NOW() - INTERVAL '1 hour' + INTERVAL '1 minute 32 seconds',
    92, -- 1 minute 32 seconds
    'Customer showed interest but needs to check with spouse before making decision. Wants 500 Mbps package. Requested callback in 2 days.',
    'Agent: Hello, this is calling about internet service options in your area. Is this Jane?
Customer: Yes, this is Jane.
Agent: Great! We have new fiber internet available at your address. Are you interested in faster internet?
Customer: Maybe, what do you offer?
Agent: We have packages from 100 Mbps up to 1 Gig. What do you currently have?
Customer: I think we have cable internet, maybe 200 Mbps.
Agent: Our 500 Mbps fiber would be faster and more reliable. Its $59 per month.
Customer: That sounds interesting but I need to talk to my husband first.
Agent: Of course! When would be a good time for me to call back?
Customer: Can you call back in 2 days?
Agent: Absolutely, Ill call back Thursday afternoon.
Customer: Perfect, thanks.',
    'https://api.twilio.com/recordings/CA' || substr(md5(random()::text), 1, 30) || '.mp3',
    0.5, -- neutral sentiment
    'callback_requested',
    'normal',
    3, -- medium satisfaction
    true,
    'CA' || substr(md5(random()::text), 1, 30),
    NOW() - INTERVAL '1 hour',
    NOW() - INTERVAL '1 hour'
),
-- Call for Bob Johnson - no answer
(
    '5d5f69d3-0cb7-42db-9b10-1246da9c4c22',
    '955a3c29-0244-4dfe-9d13-b5eebaa8387d',
    'c8b48267-e2b0-4743-940b-413a88ba0391',
    '39ecb075-a9bb-4787-ac7f-bbeefd1799c5',
    '+15133007212',
    '15133007215', -- Bob's number
    'outbound',
    'no-answer',
    NOW() - INTERVAL '30 minutes',
    NOW() - INTERVAL '30 minutes' + INTERVAL '30 seconds',
    30, -- 30 seconds before going to voicemail
    'Call went to voicemail. Left message about internet service options.',
    'Agent: Hello, you have reached the voicemail of Bob Johnson...',
    NULL,
    NULL,
    'no_answer',
    'normal',
    NULL,
    true, -- follow up required
    'CA' || substr(md5(random()::text), 1, 30),
    NOW() - INTERVAL '30 minutes',
    NOW() - INTERVAL '30 minutes'
);

-- Add customer data for the successful calls
INSERT INTO customer_data (
    lead_id,
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
SELECT 'Sample call data inserted successfully!' as message;

-- Show the call logs with correct column names
SELECT 'Call Logs Created:' as info;
SELECT 
    cl.first_name,
    cl.last_name,
    clog.status,
    clog.duration_seconds,
    clog.outcome,
    clog.call_summary,
    clog.started_at as call_time
FROM call_logs clog
JOIN campaign_leads cl ON clog.lead_id = cl.id
WHERE clog.campaign_id = 'c8b48267-e2b0-4743-940b-413a88ba0391'
ORDER BY clog.started_at DESC;

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
SELECT 'Updated Campaign Leads Status:' as info;
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
