import express from 'express';

const router = express.Router();

// Test call endpoint
router.post('/test-call', async (req, res) => {
  try {
    const { to, from, message, agentId } = req.body;

    if (!to) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    if (!agentId) {
      return res.status(400).json({ error: 'Agent selection is required' });
    }

    // Validate environment variables
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioNumber = process.env.TWILIO_PHONE_NUMBER || from;

    if (!accountSid || !authToken) {
      return res.status(500).json({ 
        error: 'Twilio configuration missing. Please check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables.' 
      });
    }

    // Initialize Twilio client
    let twilio;
    try {
      twilio = require('twilio')(accountSid, authToken);
    } catch (importError) {
      console.error('Twilio package not installed:', importError);
      return res.status(500).json({ 
        error: 'Twilio package not available. Run: npm install twilio' 
      });
    }
    
    console.log('Creating actual Twilio call:', {
      to,
      from: twilioNumber,
      agentId,
      message: message || 'This is a test call from your AI call center system.',
      accountSid: accountSid.substring(0, 8) + '...' // Log partial for security
    });

    // Create actual Twilio call
    const testMessage = message || 'Hello! This is a test call from your AI call center system. If you can hear this message, your outbound calling is working correctly. Thank you!';
    
    const call = await twilio.calls.create({
      from: twilioNumber,
      to: to,
      twiml: `<Response><Say voice="alice">${testMessage}</Say><Pause length="2"/><Say voice="alice">This test call will now end. Goodbye!</Say></Response>`
    });

    console.log(`Real Twilio call created - Call SID: ${call.sid}`);

    res.json({
      success: true,
      callSid: call.sid,
      to: to,
      from: twilioNumber,
      agentId: agentId,
      status: call.status,
      message: 'Test call initiated successfully with Twilio!'
    });

  } catch (error) {
    console.error('Error creating test call:', error);
    res.status(500).json({ 
      error: 'Failed to initiate test call',
      details: error.message 
    });
  }
});

export default router;
