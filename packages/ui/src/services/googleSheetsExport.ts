// Google Sheets Export Service for Lead Data
import { DatabaseService } from './database';

export interface ExportData {
  campaign_name: string;
  phone_number: string;
  full_name: string;
  email: string;
  current_address: string;
  internet_plan: string;
  install_date: string;
  payment_method: string;
  data_completeness: number;
  call_outcome: string;
  dnc_requested: boolean;
  qualified_lead: boolean;
  appointment_scheduled: boolean;
  call_date: string;
}

export class GoogleSheetsExportService {
  // Method 1: Generate CSV for manual upload
  static generateCSV(data: ExportData[]): string {
    if (!data || data.length === 0) {
      return '';
    }

    // CSV headers
    const headers = [
      'Campaign Name',
      'Phone Number', 
      'Full Name',
      'Email',
      'Address',
      'Internet Plan',
      'Install Date',
      'Payment Method',
      'Data Completeness %',
      'Call Outcome',
      'DNC Requested',
      'Qualified Lead',
      'Appointment Scheduled',
      'Call Date'
    ];

    // Convert data to CSV rows
    const rows = data.map(item => [
      item.campaign_name || '',
      item.phone_number || '',
      item.full_name || '',
      item.email || '',
      item.current_address || '',
      item.internet_plan || '',
      item.install_date || '',
      item.payment_method || '',
      `${item.data_completeness}%`,
      item.call_outcome || '',
      item.dnc_requested ? 'Yes' : 'No',
      item.qualified_lead ? 'Yes' : 'No', 
      item.appointment_scheduled ? 'Yes' : 'No',
      new Date(item.call_date).toLocaleDateString()
    ]);

    // Combine headers and rows
    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    return csvContent;
  }

  // Method 2: Download CSV file
  static downloadCSV(data: ExportData[], filename?: string) {
    const csv = this.generateCSV(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename || `lead-data-export-${new Date().toISOString().split('T')[0]}.csv`;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up
    URL.revokeObjectURL(link.href);
  }

  // Method 3: Zapier Webhook Integration
  static async sendToZapier(data: ExportData[], zapierWebhookUrl?: string) {
    if (!zapierWebhookUrl) {
      throw new Error('Zapier webhook URL is required');
    }

    try {
      const response = await fetch(zapierWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leads: data,
          export_date: new Date().toISOString(),
          total_count: data.length
        })
      });

      if (!response.ok) {
        throw new Error(`Zapier webhook failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error sending to Zapier:', error);
      throw error;
    }
  }

  // Method 4: Google Sheets API Integration (requires API key)
  static async sendToGoogleSheets(
    data: ExportData[],
    spreadsheetId: string,
    apiKey: string,
    sheetName = 'Lead Data'
  ) {
    try {
      // Prepare the data for Google Sheets
      const headers = [
        'Campaign Name', 'Phone Number', 'Full Name', 'Email', 'Address',
        'Internet Plan', 'Install Date', 'Payment Method', 'Data Completeness %',
        'Call Outcome', 'DNC Requested', 'Qualified Lead', 'Appointment Scheduled', 'Call Date'
      ];

      const rows = data.map(item => [
        item.campaign_name || '',
        item.phone_number || '',
        item.full_name || '',
        item.email || '',
        item.current_address || '',
        item.internet_plan || '',
        item.install_date || '',
        item.payment_method || '',
        `${item.data_completeness}%`,
        item.call_outcome || '',
        item.dnc_requested ? 'Yes' : 'No',
        item.qualified_lead ? 'Yes' : 'No',
        item.appointment_scheduled ? 'Yes' : 'No',
        new Date(item.call_date).toLocaleDateString()
      ]);

      // Update the sheet
      const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A1:clear`;
      
      // Clear existing data
      await fetch(updateUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      // Add new data
      const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A1:append?valueInputOption=RAW&key=${apiKey}`;
      
      const response = await fetch(appendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [headers, ...rows]
        })
      });

      if (!response.ok) {
        throw new Error(`Google Sheets API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error sending to Google Sheets:', error);
      throw error;
    }
  }

  // Main export method that tries multiple approaches
  static async exportLeadData(
    campaignId?: string,
    exportMethod: 'csv' | 'zapier' | 'google_sheets' = 'csv',
    options?: {
      zapierWebhookUrl?: string;
      googleSheetsApiKey?: string;
      googleSheetsId?: string;
      filename?: string;
    }
  ) {
    try {
      // Get the lead data
      const data = await DatabaseService.getLeadDataExport(campaignId);
      
      if (!data || data.length === 0) {
        throw new Error('No lead data found to export');
      }

      // Format for export
      const exportData: ExportData[] = data.map((item: any) => ({
        campaign_name: item.campaign_name || '',
        phone_number: item.phone_number || '',
        full_name: item.full_name || '',
        email: item.email || '',
        current_address: item.current_address || '',
        internet_plan: item.internet_plan || '',
        install_date: item.install_date || '',
        payment_method: item.payment_method || '',
        data_completeness: item.data_completeness || 0,
        call_outcome: item.call_outcome || '',
        dnc_requested: item.dnc_requested || false,
        qualified_lead: item.qualified_lead || false,
        appointment_scheduled: item.appointment_scheduled || false,
        call_date: item.call_date || ''
      }));

      // Execute export based on method
      switch (exportMethod) {
        case 'csv':
          this.downloadCSV(exportData, options?.filename);
          return { success: true, message: 'CSV download started', count: exportData.length };

        case 'zapier':
          if (!options?.zapierWebhookUrl) {
            throw new Error('Zapier webhook URL is required');
          }
          const zapierResult = await this.sendToZapier(exportData, options.zapierWebhookUrl);
          return { success: true, message: 'Data sent to Zapier', count: exportData.length, result: zapierResult };

        case 'google_sheets':
          if (!options?.googleSheetsApiKey || !options?.googleSheetsId) {
            throw new Error('Google Sheets API key and spreadsheet ID are required');
          }
          const sheetsResult = await this.sendToGoogleSheets(
            exportData,
            options.googleSheetsId,
            options.googleSheetsApiKey
          );
          return { success: true, message: 'Data sent to Google Sheets', count: exportData.length, result: sheetsResult };

        default:
          throw new Error(`Unsupported export method: ${exportMethod}`);
      }
    } catch (error) {
      console.error('Export error:', error);
      throw error;
    }
  }
}
