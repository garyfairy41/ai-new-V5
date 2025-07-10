export interface Campaign {
  id: string;
  name: string;
  description?: string;
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'completed' | 'cancelled';
  agent_id?: string;
  agent_name?: string;
  scheduled_start?: string;
  scheduled_end?: string;
  dialer_settings?: {
    max_concurrent_calls?: number;
    call_timeout?: number;
    retry_attempts?: number;
    retry_delay?: number;
  };
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface CampaignLead {
  id: string;
  campaign_id: string;
  phone_number: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  status: 'pending' | 'called' | 'connected' | 'failed' | 'do_not_call';
  call_attempts: number;
  last_call_at?: string;
  notes?: string;
  custom_fields?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CreateCampaignRequest {
  name: string;
  description?: string;
  agent_id?: string;
  scheduled_start?: string;
  scheduled_end?: string;
  dialer_settings?: {
    max_concurrent_calls?: number;
    call_timeout?: number;
    retry_attempts?: number;
    retry_delay?: number;
  };
}

export interface CampaignStats {
  total_leads: number;
  calls_made: number;
  calls_connected: number;
  calls_failed: number;
  calls_pending: number;
  call_rate: number;
  connection_rate: number;
  failure_rate: number;
}

export interface DialerStatus {
  status: 'idle' | 'running' | 'paused' | 'error';
  active_campaigns: string[];
  concurrent_calls: number;
  max_concurrent_calls: number;
  queue_size: number;
}

export interface Agent {
  id: string;
  name: string;
  description?: string;
  personality?: string;
  voice_id?: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}
