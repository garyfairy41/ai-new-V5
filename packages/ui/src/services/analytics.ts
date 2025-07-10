import { supabase } from '../lib/supabase';

export interface CampaignAnalytics {
  campaign_id: string;
  total_leads: number;
  leads_called: number;
  leads_answered: number;
  leads_completed: number;
  leads_no_answer: number;
  leads_busy: number;
  leads_failed: number;
  leads_do_not_call: number;
  leads_scheduled_callback: number;
  total_call_duration: number;
  average_call_duration: number;
  success_rate: number;
  answer_rate: number;
  completion_rate: number;
  calls_per_hour: number;
  peak_calling_hour: string;
  conversion_rate: number;
  cost_per_lead: number;
  revenue_per_lead: number;
  roi: number;
  last_updated: string;
}

export interface CallStatusDistribution {
  status: string;
  count: number;
  percentage: number;
  color: string;
}

export interface CallVolumeData {
  date: string;
  hour: number;
  calls: number;
  answered: number;
  completed: number;
}

export interface AgentPerformance {
  agent_id: string;
  agent_name: string;
  total_calls: number;
  answered_calls: number;
  completed_calls: number;
  average_call_duration: number;
  success_rate: number;
  calls_per_hour: number;
}

export interface CampaignTimeline {
  date: string;
  leads_added: number;
  leads_called: number;
  leads_completed: number;
  cumulative_leads: number;
  cumulative_called: number;
  cumulative_completed: number;
}

export interface LeadSourceAnalytics {
  source: string;
  total_leads: number;
  conversion_rate: number;
  average_call_duration: number;
  success_rate: number;
}

export interface ComplianceReport {
  campaign_id: string;
  total_calls: number;
  dnc_violations: number;
  time_violations: number;
  frequency_violations: number;
  compliance_score: number;
  last_audit: string;
}

export class AnalyticsService {
  private static baseUrl = '/api/campaigns';

  static async getCampaignAnalytics(campaignId: string): Promise<CampaignAnalytics> {
    try {
      const response = await fetch(`${this.baseUrl}/${campaignId}/analytics`);
      if (!response.ok) {
        throw new Error('Failed to fetch campaign analytics');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching campaign analytics:', error);
      throw error;
    }
  }

  static async getCallStatusDistribution(campaignId: string): Promise<CallStatusDistribution[]> {
    try {
      const { data: leads, error } = await supabase
        .from('campaign_leads')
        .select('status')
        .eq('campaign_id', campaignId);

      if (error) throw error;

      const statusCounts = leads.reduce((acc, lead) => {
        acc[lead.status] = (acc[lead.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const total = leads.length;
      const statusColors: Record<string, string> = {
        pending: '#6B7280',
        in_progress: '#3B82F6',
        completed: '#10B981',
        no_answer: '#F59E0B',
        busy: '#EF4444',
        answering_machine: '#8B5CF6',
        do_not_call: '#DC2626',
        scheduled_callback: '#6366F1',
        invalid_number: '#991B1B'
      };

      return Object.entries(statusCounts).map(([status, count]) => ({
        status,
        count,
        percentage: (count / total) * 100,
        color: statusColors[status] || '#6B7280'
      }));
    } catch (error) {
      console.error('Error fetching call status distribution:', error);
      throw error;
    }
  }

  static async getCallVolumeData(
    campaignId: string,
    timeframe: 'day' | 'week' | 'month' = 'week'
  ): Promise<CallVolumeData[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/${campaignId}/analytics/call-volume?timeframe=${timeframe}`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch call volume data');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching call volume data:', error);
      throw error;
    }
  }

  static async getAgentPerformance(campaignId: string): Promise<AgentPerformance[]> {
    try {
      const response = await fetch(`${this.baseUrl}/${campaignId}/analytics/agents`);
      if (!response.ok) {
        throw new Error('Failed to fetch agent performance');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching agent performance:', error);
      throw error;
    }
  }

  static async getCampaignTimeline(campaignId: string): Promise<CampaignTimeline[]> {
    try {
      const response = await fetch(`${this.baseUrl}/${campaignId}/analytics/timeline`);
      if (!response.ok) {
        throw new Error('Failed to fetch campaign timeline');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching campaign timeline:', error);
      throw error;
    }
  }

  static async getLeadSourceAnalytics(campaignId: string): Promise<LeadSourceAnalytics[]> {
    try {
      const response = await fetch(`${this.baseUrl}/${campaignId}/analytics/lead-sources`);
      if (!response.ok) {
        throw new Error('Failed to fetch lead source analytics');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching lead source analytics:', error);
      throw error;
    }
  }

  static async getComplianceReport(campaignId: string): Promise<ComplianceReport> {
    try {
      const response = await fetch(`${this.baseUrl}/${campaignId}/analytics/compliance`);
      if (!response.ok) {
        throw new Error('Failed to fetch compliance report');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching compliance report:', error);
      throw error;
    }
  }

  static async exportCampaignData(
    campaignId: string,
    format: 'csv' | 'json' | 'xlsx' = 'csv',
    includePersonalData: boolean = false
  ): Promise<Blob> {
    try {
      const response = await fetch(
        `${this.baseUrl}/${campaignId}/export?format=${format}&includePersonalData=${includePersonalData}`
      );
      if (!response.ok) {
        throw new Error('Failed to export campaign data');
      }
      return await response.blob();
    } catch (error) {
      console.error('Error exporting campaign data:', error);
      throw error;
    }
  }

  static async generateReport(
    campaignId: string,
    reportType: 'summary' | 'detailed' | 'compliance' | 'performance' = 'summary'
  ): Promise<Blob> {
    try {
      const response = await fetch(
        `${this.baseUrl}/${campaignId}/reports/${reportType}`
      );
      if (!response.ok) {
        throw new Error('Failed to generate report');
      }
      return await response.blob();
    } catch (error) {
      console.error('Error generating report:', error);
      throw error;
    }
  }

  static async getCallRecordings(
    campaignId: string,
    leadId?: string,
    limit: number = 50
  ): Promise<{
    id: string;
    lead_id: string;
    call_duration: number;
    recording_url: string;
    transcript: string;
    sentiment_score: number;
    call_outcome: string;
    created_at: string;
  }[]> {
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        ...(leadId && { lead_id: leadId })
      });
      
      const response = await fetch(
        `${this.baseUrl}/${campaignId}/recordings?${params}`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch call recordings');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching call recordings:', error);
      throw error;
    }
  }

  static async getCallTranscript(callId: string): Promise<{
    id: string;
    transcript: string;
    speaker_labels: boolean;
    sentiment_analysis: {
      overall_sentiment: 'positive' | 'negative' | 'neutral';
      confidence: number;
      key_phrases: string[];
    };
    call_summary: string;
    action_items: string[];
  }> {
    try {
      const response = await fetch(`/api/calls/${callId}/transcript`);
      if (!response.ok) {
        throw new Error('Failed to fetch call transcript');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching call transcript:', error);
      throw error;
    }
  }

  static async updateCallOutcome(
    campaignId: string,
    leadId: string,
    outcome: string,
    notes?: string
  ): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/${campaignId}/leads/${leadId}/outcome`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ outcome, notes }),
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to update call outcome');
      }
      
      return true;
    } catch (error) {
      console.error('Error updating call outcome:', error);
      throw error;
    }
  }

  static async getCallMetrics(campaignId: string, dateRange?: {
    startDate: string;
    endDate: string;
  }): Promise<{
    total_calls: number;
    answered_calls: number;
    completed_calls: number;
    average_call_duration: number;
    longest_call_duration: number;
    shortest_call_duration: number;
    total_call_time: number;
    calls_per_hour: number;
    peak_calling_time: string;
    conversion_rate: number;
    cost_per_call: number;
    revenue_generated: number;
    roi: number;
  }> {
    try {
      const params = new URLSearchParams();
      if (dateRange) {
        params.append('startDate', dateRange.startDate);
        params.append('endDate', dateRange.endDate);
      }
      
      const response = await fetch(
        `${this.baseUrl}/${campaignId}/analytics/metrics?${params}`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch call metrics');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching call metrics:', error);
      throw error;
    }
  }

  static async getRealtimeStats(campaignId: string): Promise<{
    active_calls: number;
    calls_in_queue: number;
    calls_completed_today: number;
    calls_answered_today: number;
    average_wait_time: number;
    current_success_rate: number;
    estimated_completion_time: string;
    dialer_efficiency: number;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/${campaignId}/analytics/realtime`);
      if (!response.ok) {
        throw new Error('Failed to fetch realtime stats');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching realtime stats:', error);
      throw error;
    }
  }

  static async predictCampaignCompletion(campaignId: string): Promise<{
    estimated_completion_date: string;
    estimated_total_calls: number;
    predicted_success_rate: number;
    confidence_level: number;
    factors_affecting_prediction: string[];
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/${campaignId}/analytics/prediction`);
      if (!response.ok) {
        throw new Error('Failed to fetch campaign prediction');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching campaign prediction:', error);
      throw error;
    }
  }
}
