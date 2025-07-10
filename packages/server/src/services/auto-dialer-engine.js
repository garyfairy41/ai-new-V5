import { EventEmitter } from 'events';
import twilio from 'twilio';

class AutoDialerEngine extends EventEmitter {
  static instances = new Map();

  constructor(config) {
    super();
    this.campaignId = config.campaignId;
    this.config = config;
    this.supabase = config.supabase;
    this.status = {
      status: 'idle',
      activeCalls: 0,
      callsInQueue: 0,
      completedCalls: 0,
      failedCalls: 0,
      settings: config
    };
    this.dialingInterval = null;
    this.activeCalls = new Set();
    this.dialingQueue = [];
  }

  static getInstance(campaignId, config) {
    let instance = AutoDialerEngine.instances.get(campaignId);
    
    if (!instance && config) {
      instance = new AutoDialerEngine({ campaignId, ...config });
      AutoDialerEngine.instances.set(campaignId, instance);
    } else if (!instance) {
      throw new Error('Dialer instance not found and no config provided');
    }
    
    return instance;
  }

  static removeInstance(campaignId) {
    const instance = AutoDialerEngine.instances.get(campaignId);
    if (instance) {
      instance.stop();
      AutoDialerEngine.instances.delete(campaignId);
    }
  }

  async start() {
    if (this.status.status === 'running') {
      throw new Error('Dialer is already running');
    }

    console.log(`🚀 Starting auto-dialer for campaign ${this.campaignId}`);
    
    this.status.status = 'running';
    this.status.startedAt = new Date().toISOString();
    
    // Load campaign leads
    await this.loadCampaignLeads();
    
    // Start dialing process
    this.startDialingProcess();
    
    this.emit('started', this.status);
  }

  async pause() {
    if (this.status.status !== 'running') {
      throw new Error('Dialer is not running');
    }

    console.log(`⏸️ Pausing auto-dialer for campaign ${this.campaignId}`);
    
    this.status.status = 'paused';
    this.status.pausedAt = new Date().toISOString();
    
    if (this.dialingInterval) {
      clearInterval(this.dialingInterval);
      this.dialingInterval = null;
    }
    
    this.emit('paused', this.status);
  }

  async resume() {
    if (this.status.status !== 'paused') {
      throw new Error('Dialer is not paused');
    }

    console.log(`▶️ Resuming auto-dialer for campaign ${this.campaignId}`);
    
    this.status.status = 'running';
    this.status.pausedAt = undefined;
    
    this.startDialingProcess();
    
    this.emit('resumed', this.status);
  }

  async stop() {
    console.log(`🛑 Stopping auto-dialer for campaign ${this.campaignId}`);
    
    this.status.status = 'stopping';
    
    if (this.dialingInterval) {
      clearInterval(this.dialingInterval);
      this.dialingInterval = null;
    }
    
    // Wait for active calls to complete or timeout
    await this.waitForActiveCalls();
    
    this.status.status = 'idle';
    this.status.startedAt = undefined;
    this.status.pausedAt = undefined;
    
    this.emit('stopped', this.status);
  }

  getStatus() {
    this.status.activeCalls = this.activeCalls.size;
    this.status.callsInQueue = this.dialingQueue.length;
    return { ...this.status };
  }

  isRunning() {
    return this.status.status === 'running';
  }

  isPaused() {
    return this.status.status === 'paused';
  }

  isActive() {
    return this.status.status === 'running' || this.status.status === 'paused';
  }

  updateConfig(config) {
    this.config = { ...this.config, ...config };
    this.status.settings = this.config;
    this.emit('configUpdated', this.config);
  }

  async loadCampaignLeads() {
    try {
      const { data: leads, error } = await this.supabase
        .from('campaign_leads')
        .select('*')
        .eq('campaign_id', this.campaignId)
        .in('status', ['pending', 'failed'])
        .lt('call_attempts', this.config.retryAttempts || 3)
        .order('created_at', { ascending: true });

      if (error) {
        throw error;
      }

      this.dialingQueue = leads || [];
      this.status.callsInQueue = this.dialingQueue.length;
      
      console.log(`📋 Loaded ${this.dialingQueue.length} leads for campaign ${this.campaignId}`);
    } catch (error) {
      console.error('Error loading campaign leads:', error);
      throw error;
    }
  }

  startDialingProcess() {
    if (this.dialingInterval) {
      clearInterval(this.dialingInterval);
    }

    this.dialingInterval = setInterval(async () => {
      try {
        await this.processDialingQueue();
      } catch (error) {
        console.error('Error in dialing process:', error);
        this.emit('error', error);
      }
    }, 5000); // Check every 5 seconds
  }

  async processDialingQueue() {
    if (this.status.status !== 'running') {
      return;
    }

    // Check if we can make more calls
    const maxConcurrent = this.config.maxConcurrentCalls || 1;
    if (this.activeCalls.size >= maxConcurrent) {
      return;
    }

    // Get next lead to call
    const lead = this.dialingQueue.shift();
    if (!lead) {
      console.log(`📞 No more leads in queue for campaign ${this.campaignId}`);
      
      // If no active calls and no leads in queue, campaign is complete
      if (this.activeCalls.size === 0) {
        console.log(`✅ Campaign ${this.campaignId} completed - no more leads to call`);
        await this.complete();
      }
      return;
    }

    try {
      await this.makeCall(lead);
    } catch (error) {
      console.error('Error making call:', error);
      this.status.failedCalls++;
      
      // Update lead status to failed
      await this.updateLeadStatus(lead.id, 'failed', error.message);
    }
  }

  async complete() {
    console.log(`🏁 Completing campaign ${this.campaignId}`);
    
    this.status.status = 'completed';
    this.status.completedAt = new Date().toISOString();
    
    if (this.dialingInterval) {
      clearInterval(this.dialingInterval);
      this.dialingInterval = null;
    }
    
    // Update campaign status in database
    await this.supabase
      .from('campaigns')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', this.campaignId);
    
    // Remove from active dialers
    const AutoDialerEngine = require('./auto-dialer-engine');
    AutoDialerEngine.removeInstance(this.campaignId);
    
    this.emit('completed', this.status);
  }

  async makeCall(lead) {
    console.log(`📞 Initiating call to ${lead.phone_number} for campaign ${this.campaignId}`);
    
    // Get campaign details
    const { data: campaign, error: campaignError } = await this.supabase
      .from('campaigns')
      .select('*, ai_agents(*)')
      .eq('id', this.campaignId)
      .single();

    if (campaignError || !campaign) {
      throw new Error(`Campaign not found: ${campaignError?.message || 'Unknown error'}`);
    }

    if (!campaign.ai_agents || !campaign.agent_id) {
      throw new Error('Campaign has no AI agent assigned');
    }

    try {
      // Update lead status to calling
      await this.updateLeadStatus(lead.id, 'calling');

      // Create Twilio call
      const accountSid = this.config.twilioAccountSid || process.env.TWILIO_ACCOUNT_SID;
      const authToken = this.config.twilioAuthToken || process.env.TWILIO_AUTH_TOKEN;
      const twilioNumber = campaign.caller_id || process.env.TWILIO_PHONE_NUMBER;

      if (!accountSid || !authToken || !twilioNumber) {
        throw new Error('Twilio configuration incomplete');
      }

      const twilioClient = twilio(accountSid, authToken);
      const webhookUrl = `${process.env.WEBHOOK_URL}?campaignId=${this.campaignId}&leadId=${lead.id}&agentId=${campaign.agent_id}`;

      const call = await twilioClient.calls.create({
        from: twilioNumber,
        to: lead.phone_number,
        url: webhookUrl,
        method: 'POST',
        timeout: this.config.callTimeoutSeconds || 30,
        statusCallback: process.env.WEBHOOK_STATUS_URL,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        statusCallbackMethod: 'POST'
      });

      console.log(`✅ Call created - SID: ${call.sid}, Lead: ${lead.id}`);

      // Add the real call SID to active calls
      this.activeCalls.add(call.sid);

      // Update lead with call_sid for webhook tracking
      await this.supabase
        .from('campaign_leads')
        .update({
          call_sid: call.sid,
          status: 'calling',
          last_call_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', lead.id);

      // Log call in database
      await this.logCall(lead, call.sid, campaign);

      // Set up call completion handler
      this.setupCallHandler(call.sid, lead);

    } catch (error) {
      throw error;
    }
  }

  async updateLeadStatus(leadId, status, notes = null) {
    try {
      const updates = {
        status,
        updated_at: new Date().toISOString()
      };

      // Increment call attempts
      const { data: currentLead } = await this.supabase
        .from('campaign_leads')
        .select('call_attempts')
        .eq('id', leadId)
        .single();
      
      updates.call_attempts = (currentLead?.call_attempts || 0) + 1;

      if (notes) {
        updates.notes = notes;
      }

      if (status === 'calling') {
        updates.last_call_at = new Date().toISOString();
      }

      const { error } = await this.supabase
        .from('campaign_leads')
        .update(updates)
        .eq('id', leadId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error updating lead status:', error);
    }
  }

  async logCall(lead, callSid, campaign) {
    try {
      const { error } = await this.supabase
        .from('call_logs')
        .insert({
          call_sid: callSid,
          campaign_id: this.campaignId,
          lead_id: lead.id,
          from_number: campaign.caller_id,
          to_number: lead.phone_number,
          agent_id: campaign.agent_id,
          status: 'initiated',
          profile_id: campaign.profile_id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error logging call:', error);
      }
    } catch (error) {
      console.error('Error in logCall:', error);
    }
  }

  setupCallHandler(callSid, lead) {
    // Set up timeout to remove from active calls
    setTimeout(() => {
      if (this.activeCalls.has(callSid)) {
        console.log(`⏰ Call timeout for ${callSid}`);
        this.activeCalls.delete(callSid);
        this.updateLeadStatus(lead.id, 'no_answer', 'Call timeout');
      }
    }, (this.config.callTimeoutSeconds || 30) * 1000 + 30000); // Add 30s buffer
  }

  async waitForActiveCalls() {
    const maxWait = 60000; // 1 minute max wait
    const startTime = Date.now();

    while (this.activeCalls.size > 0 && (Date.now() - startTime) < maxWait) {
      console.log(`⏳ Waiting for ${this.activeCalls.size} active calls to complete...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    if (this.activeCalls.size > 0) {
      console.warn(`⚠️ Force stopping with ${this.activeCalls.size} active calls`);
      this.activeCalls.clear();
    }
  }

  // Method to handle call completion from webhook
  handleCallCompletion(callSid, status, duration) {
    if (this.activeCalls.has(callSid)) {
      this.activeCalls.delete(callSid);
      
      if (status === 'completed') {
        this.status.completedCalls++;
      } else {
        this.status.failedCalls++;
      }

      console.log(`📋 Call ${callSid} completed with status: ${status}, duration: ${duration}s`);
    }
  }
}

export { AutoDialerEngine };
