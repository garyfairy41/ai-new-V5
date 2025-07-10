import type { CallLog, Campaign, Appointment, DNCEntry } from '../lib/supabase';

// API base URL
const API_BASE_URL = typeof window !== 'undefined' && (window as any).location 
  ? (process.env.NODE_ENV === 'production' 
      ? (window as any).location.origin 
      : ((window as any).location.hostname !== 'localhost')
        ? `${(window as any).location.protocol}//${(window as any).location.hostname}:12001`
        : 'http://localhost:12001')
  : 'http://localhost:12001';

export class ExportService {
  
  // Export data from API
  static async exportData(type: 'calls' | 'campaigns', format: 'csv' | 'json' = 'csv', filters?: any): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/export/${type}?format=${format}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(filters || {})
      });

      if (!response.ok) {
        throw new Error(`Failed to export ${type}`);
      }

      // Handle file download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from response headers or generate one
      const contentDisposition = response.headers.get('content-disposition');
      let filename = `${type}-export-${new Date().toISOString().split('T')[0]}.${format}`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(`Error exporting ${type}:`, error);
      throw error;
    }
  }
  static exportCallsToCSV(calls: CallLog[], filename?: string) {
    const headers = [
      'Date',
      'Time',
      'Direction',
      'From',
      'To',
      'Duration (seconds)',
      'Status',
      'Outcome',
      'Sentiment Score',
      'Customer Satisfaction',
      'Agent',
      'Campaign',
      'Summary'
    ];

    const rows = calls.map(call => [
      new Date(call.started_at).toLocaleDateString(),
      new Date(call.started_at).toLocaleTimeString(),
      call.direction,
      call.phone_number_from,
      call.phone_number_to,
      call.duration_seconds.toString(),
      call.status,
      call.outcome || '',
      call.sentiment_score?.toString() || '',
      call.customer_satisfaction_score?.toString() || '',
      call.agent_id || '',
      call.campaign_id || '',
      call.call_summary || ''
    ]);

    this.downloadCSV([headers, ...rows], filename || `calls-export-${new Date().toISOString().split('T')[0]}.csv`);
  }

  static exportCampaignsToCSV(campaigns: Campaign[], filename?: string) {
    const headers = [
      'Name',
      'Status',
      'Created Date',
      'Start Date',
      'End Date',
      'Total Leads',
      'Leads Called',
      'Leads Answered',
      'Leads Completed',
      'Success Rate (%)',
      'Caller ID',
      'Max Concurrent Calls'
    ];

    const rows = campaigns.map(campaign => [
      campaign.name,
      campaign.status,
      new Date(campaign.created_at).toLocaleDateString(),
      campaign.scheduled_start_date ? new Date(campaign.scheduled_start_date).toLocaleDateString() : '',
      campaign.scheduled_end_date ? new Date(campaign.scheduled_end_date).toLocaleDateString() : '',
      campaign.total_leads.toString(),
      campaign.leads_called.toString(),
      campaign.leads_answered.toString(),
      campaign.leads_completed.toString(),
      campaign.total_leads > 0 ? ((campaign.leads_completed / campaign.total_leads) * 100).toFixed(2) : '0',
      campaign.caller_id,
      campaign.max_concurrent_calls.toString()
    ]);

    this.downloadCSV([headers, ...rows], filename || `campaigns-export-${new Date().toISOString().split('T')[0]}.csv`);
  }

  static exportAppointmentsToCSV(appointments: Appointment[], filename?: string) {
    const headers = [
      'Customer Name',
      'Phone Number',
      'Email',
      'Appointment Type',
      'Scheduled Date',
      'Duration (minutes)',
      'Status',
      'Location',
      'Notes',
      'Created Date'
    ];

    const rows = appointments.map(appointment => [
      appointment.customer_name,
      appointment.customer_phone || '',
      appointment.customer_email || '',
      appointment.service_type || '',
      new Date(appointment.appointment_date + 'T' + appointment.appointment_time).toLocaleString(),
      '60',
      appointment.status,
      appointment.notes || '',
      appointment.notes || '',
      new Date(appointment.created_at).toLocaleDateString()
    ]);

    this.downloadCSV([headers, ...rows], filename || `appointments-export-${new Date().toISOString().split('T')[0]}.csv`);
  }

  static exportDNCToCSV(dncEntries: DNCEntry[], filename?: string) {
    const headers = [
      'Phone Number',
      'Source',
      'Added Date',
      'Expiry Date',
      'Notes',
      'Is Active'
    ];

    const rows = dncEntries.map(entry => [
      entry.phone_number,
      entry.source,
      new Date(entry.added_date).toLocaleDateString(),
      entry.expiry_date ? new Date(entry.expiry_date).toLocaleDateString() : '',
      entry.notes || '',
      entry.is_active ? 'Yes' : 'No'
    ]);

    this.downloadCSV([headers, ...rows], filename || `dnc-list-${new Date().toISOString().split('T')[0]}.csv`);
  }

  static exportAnalyticsToCSV(data: any[], filename?: string) {
    if (data.length === 0) return;

    const headers = Object.keys(data[0]);
    const rows = data.map(item => headers.map(header => {
      const value = item[header];
      if (value instanceof Date) {
        return value.toLocaleDateString();
      }
      return value?.toString() || '';
    }));

    this.downloadCSV([headers, ...rows], filename || `analytics-export-${new Date().toISOString().split('T')[0]}.csv`);
  }

  private static downloadCSV(data: string[][], filename: string) {
    const csvContent = data
      .map(row => row.map(field => `"${field?.toString().replace(/"/g, '""') || ''}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }

  static async exportToJSON(data: any[], filename?: string) {
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename || `export-${new Date().toISOString().split('T')[0]}.json`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }

  static generateComplianceReport(calls: CallLog[], dncEntries: DNCEntry[]) {
    const report = {
      generatedAt: new Date().toISOString(),
      period: {
        start: calls.length > 0 ? calls[calls.length - 1].started_at : null,
        end: calls.length > 0 ? calls[0].started_at : null
      },
      summary: {
        totalCalls: calls.length,
        dncViolations: 0,
        complianceRate: 0
      },
      dncStatistics: {
        totalDncEntries: dncEntries.length,
        activeEntries: dncEntries.filter(e => e.is_active).length,
        expiredEntries: dncEntries.filter(e => e.expiry_date && new Date(e.expiry_date) < new Date()).length
      },
      callsBySource: calls.reduce((acc, call) => {
        const source = call.direction;
        acc[source] = (acc[source] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      violations: [] as any[]
    };

    // Check for DNC violations
    const dncNumbers = new Set(dncEntries.filter(e => e.is_active).map(e => e.phone_number));
    
    calls.forEach(call => {
      if (call.direction === 'outbound' && dncNumbers.has(call.phone_number_to)) {
        report.violations.push({
          callId: call.id,
          phoneNumber: call.phone_number_to,
          callDate: call.started_at,
          violationType: 'DNC_VIOLATION'
        });
        report.summary.dncViolations++;
      }
    });

    report.summary.complianceRate = calls.length > 0 
      ? ((calls.length - report.summary.dncViolations) / calls.length) * 100 
      : 100;

    return report;
  }
}