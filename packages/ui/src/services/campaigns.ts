// API base URL
const API_BASE_URL = typeof window !== 'undefined' && (window as any).location 
  ? (process.env.NODE_ENV === 'production' 
      ? (window as any).location.origin 
      : ((window as any).location.hostname !== 'localhost')
        ? `${(window as any).location.protocol}//${(window as any).location.hostname}:12001`
        : 'http://localhost:12001')
  : 'http://localhost:12001';

export interface Campaign {
  id: string
  name: string
  status: 'draft' | 'active' | 'paused' | 'completed'
  agent_id?: string
  profile_id: string
  description?: string
  start_time?: string
  end_time?: string
  max_concurrent_calls: number
  call_interval: number
  retry_attempts: number
  retry_interval: number
  created_at: string
  updated_at: string
}

export interface CampaignLead {
  id: string
  campaign_id: string
  phone_number: string
  first_name?: string
  last_name?: string
  email?: string
  custom_fields?: any
  status: 'pending' | 'calling' | 'called' | 'completed' | 'failed' | 'dnc'
  call_attempts: number
  last_call_at?: string
  call_result?: string
  notes?: string
  created_at: string
  updated_at: string
}

export class CampaignService {
  
  // Get all campaigns
  static async getCampaigns(profileId: string, limit = 50, offset = 0): Promise<Campaign[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/campaigns?profile_id=${profileId}&limit=${limit}&offset=${offset}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch campaigns');
      }

      const data = await response.json();
      return data || [];
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      return [];
    }
  }

  // Get single campaign
  static async getCampaign(campaignId: string): Promise<Campaign | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch campaign');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching campaign:', error);
      return null;
    }
  }

  // Create campaign
  static async createCampaign(campaign: Omit<Campaign, 'id' | 'created_at' | 'updated_at'>): Promise<Campaign | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/campaigns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(campaign)
      });

      if (!response.ok) {
        throw new Error('Failed to create campaign');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error creating campaign:', error);
      return null;
    }
  }

  // Update campaign
  static async updateCampaign(campaignId: string, updates: Partial<Campaign>): Promise<Campaign | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error('Failed to update campaign');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error updating campaign:', error);
      return null;
    }
  }

  // Delete campaign
  static async deleteCampaign(campaignId: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      return response.ok;
    } catch (error) {
      console.error('Error deleting campaign:', error);
      return false;
    }
  }

  // Get campaign leads
  static async getCampaignLeads(campaignId: string, filters?: {
    status?: string[]
    limit?: number
    offset?: number
  }): Promise<CampaignLead[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.status) {
        params.append('status', filters.status.join(','));
      }
      if (filters?.limit) {
        params.append('limit', filters.limit.toString());
      }
      if (filters?.offset) {
        params.append('offset', filters.offset.toString());
      }

      const response = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}/leads?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch campaign leads');
      }

      const data = await response.json();
      return data || [];
    } catch (error) {
      console.error('Error fetching campaign leads:', error);
      return [];
    }
  }

  // Add leads to campaign
  static async addLeadsToCampaign(campaignId: string, leads: Omit<CampaignLead, 'id' | 'campaign_id' | 'created_at' | 'updated_at'>[]): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}/leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ leads })
      });

      return response.ok;
    } catch (error) {
      console.error('Error adding leads to campaign:', error);
      return false;
    }
  }

  // Update campaign lead
  static async updateCampaignLead(campaignId: string, leadId: string, updates: Partial<CampaignLead>): Promise<CampaignLead | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}/leads/${leadId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error('Failed to update campaign lead');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error updating campaign lead:', error);
      return null;
    }
  }

  // Delete a lead from campaign
  static async deleteLead(campaignId: string, leadId: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}/leads/${leadId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete lead');
      }

      return true;
    } catch (error) {
      console.error('Error deleting lead:', error);
      throw error;
    }
  }

  // Update lead status
  static async updateLeadStatus(
    campaignId: string, 
    leadId: string, 
    status: string
  ): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}/leads/${leadId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status })
      });

      if (!response.ok) {
        throw new Error('Failed to update lead status');
      }

      return true;
    } catch (error) {
      console.error('Error updating lead status:', error);
      throw error;
    }
  }

  // Update lead details
  static async updateLead(
    campaignId: string,
    leadId: string,
    leadData: Partial<CampaignLead>
  ): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}/leads/${leadId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(leadData)
      });

      if (!response.ok) {
        throw new Error('Failed to update lead');
      }

      return true;
    } catch (error) {
      console.error('Error updating lead:', error);
      throw error;
    }
  }

  // Bulk update leads
  static async bulkUpdateLeads(
    campaignId: string,
    leadIds: string[],
    updates: Partial<CampaignLead>
  ): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}/leads/bulk`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ lead_ids: leadIds, updates })
      });

      if (!response.ok) {
        throw new Error('Failed to bulk update leads');
      }

      return true;
    } catch (error) {
      console.error('Error bulk updating leads:', error);
      throw error;
    }
  }

  // Schedule callback for lead
  static async scheduleCallback(
    campaignId: string,
    leadId: string,
    callbackTime: string,
    notes?: string
  ): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}/leads/${leadId}/callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ callback_time: callbackTime, notes })
      });

      if (!response.ok) {
        throw new Error('Failed to schedule callback');
      }

      return true;
    } catch (error) {
      console.error('Error scheduling callback:', error);
      throw error;
    }
  }

  // Get lead call history
  static async getLeadCallHistory(campaignId: string, leadId: string): Promise<{
    id: string;
    call_started_at: string;
    call_ended_at: string;
    call_duration: number;
    call_outcome: string;
    notes: string;
    recording_url?: string;
  }[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}/leads/${leadId}/calls`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch lead call history');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching lead call history:', error);
      throw error;
    }
  }

  // Start campaign
  static async startCampaign(campaignId: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      return response.ok;
    } catch (error) {
      console.error('Error starting campaign:', error);
      return false;
    }
  }

  // Pause campaign
  static async pauseCampaign(campaignId: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}/pause`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      return response.ok;
    } catch (error) {
      console.error('Error pausing campaign:', error);
      return false;
    }
  }

  // Stop campaign
  static async stopCampaign(campaignId: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      return response.ok;
    } catch (error) {
      console.error('Error stopping campaign:', error);
      return false;
    }
  }

  // Get campaign statistics
  static async getCampaignStats(campaignId: string): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}/stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch campaign stats');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching campaign stats:', error);
      // Return mock data for now
      return {
        totalLeads: 0,
        leadsContacted: 0,
        leadsAnswered: 0,
        leadsCompleted: 0,
        averageCallDuration: 0,
        answerRate: 0,
        completionRate: 0,
        callStatusBreakdown: [],
        dailyActivity: []
      };
    }
  }

  // Export campaign results
  static async exportCampaignResults(campaignId: string, format: 'csv' | 'json' = 'csv'): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}/export?format=${format}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to export campaign results');
      }

      // Handle file download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `campaign-${campaignId}-export.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting campaign results:', error);
      throw error;
    }
  }

  // Enhanced analytics methods
  static async getCampaignAnalytics(campaignId: string): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}/analytics`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch campaign analytics');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching campaign analytics:', error);
      // Fallback to database service
      const { DatabaseService } = await import('./database');
      return await DatabaseService.getCampaignAnalytics(campaignId);
    }
  }

  static async getCallHistory(campaignId: string, limit = 100): Promise<any[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}/calls?limit=${limit}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch call history');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching call history:', error);
      // Fallback to database service
      const { DatabaseService } = await import('./database');
      return await DatabaseService.getCallHistoryDetailed(campaignId, limit);
    }
  }

  static async getQualifiedLeads(campaignId: string): Promise<any[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}/qualified-leads`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch qualified leads');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching qualified leads:', error);
      // Fallback to database service
      const { DatabaseService } = await import('./database');
      return await DatabaseService.getQualifiedLeadsForExport(campaignId);
    }
  }
}