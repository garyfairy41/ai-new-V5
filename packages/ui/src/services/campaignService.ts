/**
 * Campaign Service - Connects to Backend Campaign API
 * Uses the 'campaigns' table and auto-dialer engine
 */

import { supabase } from '../lib/supabase';

export interface Campaign {
  id: string;
  profile_id: string;
  agent_id?: string;
  name: string;
  description?: string;
  status: 'draft' | 'active' | 'paused' | 'stopped' | 'completed';
  caller_id: string;
  max_concurrent_calls: number;
  call_timeout_seconds: number;
  retry_attempts: number;
  retry_delay_minutes: number;
  start_time?: string;
  end_time?: string;
  timezone: string;
  days_of_week: number[];
  scheduled_start_date?: string;
  scheduled_end_date?: string;
  custom_system_instruction?: string;
  custom_voice_name?: string;
  priority: 'low' | 'normal' | 'high';
  compliance_settings?: any;
  total_leads: number;
  leads_called: number;
  leads_answered: number;
  leads_completed: number;
  created_at: string;
  updated_at: string;
  target_audience?: string;
  script?: string;
  leads_total: number;
  conversion_rate: number;
}

export interface Lead {
  id: string;
  campaign_id: string;
  phone_number: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  company?: string;
  title?: string;
  status: 'pending' | 'calling' | 'called' | 'completed' | 'failed';
  priority: 'low' | 'normal' | 'high';
  call_attempts: number;
  last_call_at?: string;
  next_call_at?: string;
  outcome?: string;
  notes?: string;
  custom_fields?: any;
  do_not_call: boolean;
  preferred_call_time?: string;
  timezone?: string;
  created_at: string;
  updated_at: string;
  tags?: string[];
  metadata?: any;
  profile_id?: string;
  call_sid?: string;
}

export interface CampaignStats {
  campaignId: string;
  name: string;
  status: string;
  dialerActive: boolean;
  stats: {
    total: number;
    pending: number;
    calling: number;
    called: number;
    completed: number;
    failed: number;
  };
  created_at: string;
  started_at?: string;
  completed_at?: string;
  updated_at: string;
}

export interface AIAgent {
  id: string;
  name: string;
  description?: string;
  agent_type: string;
  voice_name: string;
  language_code: string;
  system_instruction?: string;
  is_active: boolean;
}

class CampaignService {
  private baseUrl = '/api';

  // ==========================================
  // CAMPAIGN MANAGEMENT
  // ==========================================

  async getCampaigns(profileId: string): Promise<Campaign[]> {
    try {
      const response = await fetch(`${this.baseUrl}/campaigns?profile_id=${profileId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch campaigns: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      throw error;
    }
  }

  async getCampaign(id: string): Promise<Campaign> {
    try {
      const response = await fetch(`${this.baseUrl}/campaigns/${id}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch campaign: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching campaign:', error);
      throw error;
    }
  }

  async createCampaign(campaign: Partial<Campaign>): Promise<Campaign> {
    try {
      const response = await fetch(`${this.baseUrl}/campaigns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(campaign),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to create campaign: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error creating campaign:', error);
      throw error;
    }
  }

  async updateCampaign(id: string, updates: Partial<Campaign>): Promise<Campaign> {
    try {
      const response = await fetch(`${this.baseUrl}/campaigns/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to update campaign: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error updating campaign:', error);
      throw error;
    }
  }

  async deleteCampaign(id: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/campaigns/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to delete campaign: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error deleting campaign:', error);
      throw error;
    }
  }

  // ==========================================
  // AUTO-DIALER CONTROL
  // ==========================================

  async startCampaign(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/campaigns/${id}/start`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to start campaign: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error starting campaign:', error);
      throw error;
    }
  }

  async pauseCampaign(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/campaigns/${id}/pause`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to pause campaign: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error pausing campaign:', error);
      throw error;
    }
  }

  async stopCampaign(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/campaigns/${id}/stop`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to stop campaign: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error stopping campaign:', error);
      throw error;
    }
  }

  async getCampaignStats(id: string): Promise<CampaignStats> {
    try {
      const response = await fetch(`${this.baseUrl}/campaigns/${id}/stats`);
      if (!response.ok) {
        throw new Error(`Failed to fetch campaign stats: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching campaign stats:', error);
      throw error;
    }
  }

  // ==========================================
  // LEAD MANAGEMENT
  // ==========================================

  async getLeads(campaignId: string, page = 1, limit = 50, status?: string): Promise<{
    leads: Lead[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      
      if (status) {
        params.append('status', status);
      }
      
      const response = await fetch(`${this.baseUrl}/campaigns/${campaignId}/leads?${params}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch leads: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching leads:', error);
      throw error;
    }
  }

  async getCampaignLeads(campaignId: string): Promise<Lead[]> {
    try {
      const response = await fetch(`${this.baseUrl}/campaigns/${campaignId}/leads`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to get campaign leads: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error getting campaign leads:', error);
      throw error;
    }
  }

  async addLeads(campaignId: string, leads: Partial<Lead>[]): Promise<{ success: boolean; message: string; leads: Lead[] }> {
    try {
      const response = await fetch(`${this.baseUrl}/campaigns/${campaignId}/leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ leads }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to add leads: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error adding leads:', error);
      throw error;
    }
  }

  async addLeadsToCampaign(campaignId: string, leads: any[]): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/campaigns/${campaignId}/leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ leads }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to add leads: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error adding leads to campaign:', error);
      throw error;
    }
  }

  async updateLead(campaignId: string, leadId: string, updates: Partial<Lead>): Promise<Lead> {
    try {
      const response = await fetch(`${this.baseUrl}/campaigns/${campaignId}/leads/${leadId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to update lead: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error updating lead:', error);
      throw error;
    }
  }

  async deleteLead(leadId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/leads/${leadId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to delete lead: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error deleting lead:', error);
      throw error;
    }
  }

  async exportLeads(campaignId: string, format = 'csv'): Promise<Blob> {
    try {
      const response = await fetch(`${this.baseUrl}/campaigns/${campaignId}/export?format=${format}`);
      if (!response.ok) {
        throw new Error(`Failed to export leads: ${response.statusText}`);
      }
      return await response.blob();
    } catch (error) {
      console.error('Error exporting leads:', error);
      throw error;
    }
  }

  // ==========================================
  // AI AGENTS
  // ==========================================

  async getAIAgents(profileId: string): Promise<AIAgent[]> {
    try {
      const { data, error } = await supabase
        .from('ai_agents')
        .select('id, name, description, agent_type, voice_name, language_code, system_instruction, is_active, call_direction')
        .eq('profile_id', profileId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      
      // Filter for outbound agents like the original code
      const outboundAgents = (data || []).filter(agent => 
        agent.call_direction === 'outbound' || agent.call_direction === 'both'
      );
      
      return outboundAgents;
    } catch (error) {
      console.error('Error fetching AI agents:', error);
      throw error;
    }
  }

  // ==========================================
  // UTILITIES
  // ==========================================

  parseCSVLeads(csvText: string): Partial<Lead>[] {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV must have at least a header row and one data row');
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const leads: Partial<Lead>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const lead: Partial<Lead> = {};

      headers.forEach((header, index) => {
        const value = values[index]?.replace(/^["']|["']$/g, '') || '';
        
        switch (header) {
          case 'phone':
          case 'phone_number':
          case 'phonenumber':
            lead.phone_number = value;
            break;
          case 'first_name':
          case 'firstname':
          case 'first':
            lead.first_name = value;
            break;
          case 'last_name':
          case 'lastname':
          case 'last':
            lead.last_name = value;
            break;
          case 'email':
            lead.email = value;
            break;
          case 'company':
            lead.company = value;
            break;
          case 'title':
          case 'job_title':
            lead.title = value;
            break;
        }
      });

      if (lead.phone_number) {
        leads.push(lead);
      }
    }

    if (leads.length === 0) {
      throw new Error('No valid leads found. Make sure your CSV has a phone number column.');
    }

    return leads;
  }

  formatPhoneNumber(phone: string): string {
    // Remove all non-digits
    const digits = phone.replace(/\D/g, '');
    
    // Add +1 if it's a 10-digit US number
    if (digits.length === 10) {
      return `+1${digits}`;
    }
    
    // Add + if it doesn't have it
    if (digits.length > 10 && !phone.startsWith('+')) {
      return `+${digits}`;
    }
    
    return phone;
  }
}

export const campaignService = new CampaignService();
export default campaignService;
