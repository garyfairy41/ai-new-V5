import { EventEmitter } from 'events';
import { supabase } from '../lib/supabase';
import twilio from 'twilio';

export interface DialerEngineConfig {
  maxConcurrentCalls: number;
  callTimeoutSeconds: number;
  retryAttempts: number;
  retryDelayMinutes: number;
}

export interface DialerStatus {
  status: 'idle' | 'running' | 'paused' | 'stopping';
  activeCalls: number;
  callsInQueue: number;
  completedCalls: number;
  failedCalls: number;
  startedAt?: string;
  pausedAt?: string;
  settings: DialerEngineConfig;
}

export interface CampaignLead {
  id: string;
  campaign_id: string;
  phone_number: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  status: 'pending' | 'calling' | 'called' | 'completed' | 'failed' | 'dnc';
  call_attempts: number;
  last_call_at?: string;
  call_result?: string;
  notes?: string;
  custom_fields?: any;
  company?: string;
  title?: string;
  created_at: string;
  updated_at: string;
}

export class AutoDialerEngine extends EventEmitter {
  private static instances: Map<string, AutoDialerEngine> = new Map();
  private campaignId: string;
  private config: DialerEngineConfig;
  private status: DialerStatus;
  private dialingInterval?: NodeJS.Timeout;
  private activeCalls: Set<string> = new Set();
  private dialingQueue: CampaignLead[] = [];

  private constructor(campaignId: string, config: DialerEngineConfig) {
    super();
    this.campaignId = campaignId;
    this.config = config;
    this.status = {
      status: 'idle',
      activeCalls: 0,
      callsInQueue: 0,
      completedCalls: 0,
      failedCalls: 0,
      settings: config
    };
  }

  static getInstance(campaignId: string, config?: DialerEngineConfig): AutoDialerEngine {
    let instance = AutoDialerEngine.instances.get(campaignId);
    
    if (!instance && config) {
      instance = new AutoDialerEngine(campaignId, config);
      AutoDialerEngine.instances.set(campaignId, instance);
    } else if (!instance) {
      throw new Error('Dialer instance not found and no config provided');
    }
    
    return instance;
  }

  static removeInstance(campaignId: string): void {
    const instance = AutoDialerEngine.instances.get(campaignId);
    if (instance) {
      instance.stop();
      AutoDialerEngine.instances.delete(campaignId);
    }
  }

  async start(): Promise<void> {
    if (this.status.status === 'running') {
      throw new Error('Dialer is already running');
    }

    this.status.status = 'running';
    this.status.startedAt = new Date().toISOString();
    
    // Load campaign leads
    await this.loadCampaignLeads();
    
    // Start dialing process
    this.startDialingProcess();
    
    this.emit('started', this.status);
  }

  async pause(): Promise<void> {
    if (this.status.status !== 'running') {
      throw new Error('Dialer is not running');
    }

    this.status.status = 'paused';
    this.status.pausedAt = new Date().toISOString();
    
    if (this.dialingInterval) {
      clearInterval(this.dialingInterval);
      this.dialingInterval = undefined;
    }
    
    this.emit('paused', this.status);
  }

  async resume(): Promise<void> {
    if (this.status.status !== 'paused') {
      throw new Error('Dialer is not paused');
    }

    this.status.status = 'running';
    this.status.pausedAt = undefined;
    
    this.startDialingProcess();
    
    this.emit('resumed', this.status);
  }

  async stop(): Promise<void> {
    this.status.status = 'stopping';
    
    if (this.dialingInterval) {
      clearInterval(this.dialingInterval);
      this.dialingInterval = undefined;
    }
    
    // Wait for active calls to complete or timeout
    await this.waitForActiveCalls();
    
    this.status.status = 'idle';
    this.status.startedAt = undefined;
    this.status.pausedAt = undefined;
    
    this.emit('stopped', this.status);
  }

  getStatus(): DialerStatus {
    this.status.activeCalls = this.activeCalls.size;
    this.status.callsInQueue = this.dialingQueue.length;
    return { ...this.status };
  }

  updateConfig(config: Partial<DialerEngineConfig>): void {
    this.config = { ...this.config, ...config };
    this.status.settings = this.config;
    this.emit('configUpdated', this.config);
  }

  private async loadCampaignLeads(): Promise<void> {
    try {
      const { data: leads, error } = await supabase
        .from('campaign_leads')
        .select('*')
        .eq('campaign_id', this.campaignId)
        .in('status', ['pending', 'failed'])
        .lt('call_attempts', this.config.retryAttempts)
        .order('created_at', { ascending: true });

      if (error) {
        throw error;
      }

      this.dialingQueue = leads || [];
      this.status.callsInQueue = this.dialingQueue.length;
    } catch (error) {
      console.error('Error loading campaign leads:', error);
      throw error;
    }
  }

  private startDialingProcess(): void {
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

  private async processDialingQueue(): Promise<void> {
    if (this.status.status !== 'running') {
      return;
    }

    const availableSlots = this.config.maxConcurrentCalls - this.activeCalls.size;
    
    for (let i = 0; i < availableSlots && this.dialingQueue.length > 0; i++) {
      const lead = this.dialingQueue.shift();
      if (lead && this.shouldCallLead(lead)) {
        await this.initiateCall(lead);
      }
    }
  }

  private shouldCallLead(lead: CampaignLead): boolean {
    // Check if enough time has passed since last call attempt
    if (lead.last_call_at) {
      const lastCall = new Date(lead.last_call_at);
      const now = new Date();
      const timeDiff = now.getTime() - lastCall.getTime();
      const retryDelayMs = this.config.retryDelayMinutes * 60 * 1000;
      
      if (timeDiff < retryDelayMs) {
        // Put back in queue for later
        this.dialingQueue.push(lead);
        return false;
      }
    }

    return lead.call_attempts < this.config.retryAttempts;
  }

  private async initiateCall(lead: CampaignLead): Promise<void> {
    const callId = `call_${lead.id}_${Date.now()}`;
    this.activeCalls.add(callId);

    try {
      // Update lead status to calling
      await this.updateLeadStatus(lead.id, 'calling', lead.call_attempts + 1);

      // Get campaign details for caller ID
      const { data: campaign } = await supabase
        .from('campaigns')
        .select('caller_id, agent_id')
        .eq('id', this.campaignId)
        .single();

      if (!campaign) {
        throw new Error('Campaign not found');
      }

      // Initialize Twilio client
      const twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID!,
        process.env.TWILIO_AUTH_TOKEN!
      );

      // Create actual Twilio call
      console.log(`Creating real Twilio call to ${lead.phone_number} for campaign ${this.campaignId}`);
      
      const call = await twilioClient.calls.create({
        from: process.env.TWILIO_PHONE_NUMBER || campaign.caller_id,
        to: lead.phone_number,
        url: `${process.env.BASE_URL || 'https://your-server-url.com'}/webhook/campaign-call/${this.campaignId}/${lead.id}`,
        statusCallback: `${process.env.BASE_URL || 'https://your-server-url.com'}/webhook/call-status`,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        statusCallbackMethod: 'POST'
      });

      console.log(`Real Twilio call created - Call SID: ${call.sid} to ${lead.phone_number}`);
      
      // Store call SID for tracking
      await this.updateLeadCallSid(lead.id, call.sid);

    } catch (error) {
      console.error('Error initiating call:', error);
      this.activeCalls.delete(callId);
      await this.updateLeadStatus(lead.id, 'failed', lead.call_attempts + 1);
      this.status.failedCalls++;
    }
  }

  private async handleCallComplete(callId: string, lead: CampaignLead): Promise<void> {
    this.activeCalls.delete(callId);

    // Simulate call outcomes
    const outcomes = ['completed', 'failed', 'no_answer', 'busy'];
    const outcome = outcomes[Math.floor(Math.random() * outcomes.length)];

    try {
      await this.updateLeadStatus(lead.id, outcome as any, lead.call_attempts + 1, outcome);
      
      if (outcome === 'completed') {
        this.status.completedCalls++;
      } else {
        this.status.failedCalls++;
        
        // Re-queue for retry if applicable
        if (lead.call_attempts + 1 < this.config.retryAttempts) {
          const updatedLead = { ...lead, call_attempts: lead.call_attempts + 1, last_call_at: new Date().toISOString() };
          this.dialingQueue.push(updatedLead);
        }
      }

      this.emit('callComplete', { callId, lead, outcome });
    } catch (error) {
      console.error('Error handling call completion:', error);
    }
  }

  private async updateLeadStatus(
    leadId: string, 
    status: string, 
    callAttempts: number, 
    callResult?: string
  ): Promise<void> {
    const updates: any = {
      status,
      call_attempts: callAttempts,
      last_call_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (callResult) {
      updates.call_result = callResult;
    }

    const { error } = await supabase
      .from('campaign_leads')
      .update(updates)
      .eq('id', leadId);

    if (error) {
      throw error;
    }
  }

  private async updateLeadCallSid(leadId: string, callSid: string): Promise<void> {
    const { error } = await supabase
      .from('campaign_leads')
      .update({ 
        call_sid: callSid,
        updated_at: new Date().toISOString()
      })
      .eq('id', leadId);

    if (error) {
      throw error;
    }
  }

  private async waitForActiveCalls(): Promise<void> {
    return new Promise((resolve) => {
      const checkActiveCalls = () => {
        if (this.activeCalls.size === 0) {
          resolve();
        } else {
          setTimeout(checkActiveCalls, 1000);
        }
      };
      checkActiveCalls();
    });
  }
}
