// Google Sheets Export Integration
// This provides the actual implementation for exporting lead data

interface ExportData {
  campaign_name: string;
  phone_number: string;
  full_name?: string;
  email?: string;
  current_address?: string;
  internet_plan?: string;
  install_date?: string;
  payment_method?: string;
  data_completeness: number;
  call_outcome?: string;
  dnc_requested: boolean;
  qualified_lead: boolean;
  appointment_scheduled: boolean;
  call_date: string;
}

// Google Sheets API Integration
export class GoogleSheetsExporter {
  private static SHEETS_API_URL = 'https://sheets.googleapis.com/v4/spreadsheets';

  static async exportToGoogleSheets(
    data: ExportData[],
    spreadsheetId?: string,
    accessToken?: string
  ): Promise<{ success: boolean; spreadsheetUrl?: string; error?: string }> {
    try {
      // If no spreadsheet ID provided, create a new sheet
      if (!spreadsheetId) {
        const createResult = await this.createNewSpreadsheet(data, accessToken);
        return createResult;
      }

      // Otherwise, append to existing sheet
      const appendResult = await this.appendToSpreadsheet(data, spreadsheetId, accessToken);
      return appendResult;

    } catch (error) {
      console.error('Error exporting to Google Sheets:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private static async createNewSpreadsheet(
    data: ExportData[],
    accessToken?: string
  ): Promise<{ success: boolean; spreadsheetUrl?: string; error?: string }> {
    if (!accessToken) {
      return {
        success: false,
        error: 'Access token required for Google Sheets integration'
      };
    }

    try {
      // Create new spreadsheet
      const createResponse = await fetch(`${this.SHEETS_API_URL}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          properties: {
            title: `Lead Data Export - ${new Date().toISOString().split('T')[0]}`
          },
          sheets: [{
            properties: {
              title: 'Lead Data'
            }
          }]
        })
      });

      if (!createResponse.ok) {
        throw new Error(`Failed to create spreadsheet: ${createResponse.statusText}`);
      }

      const spreadsheet = await createResponse.json();
      const spreadsheetId = spreadsheet.spreadsheetId;

      // Add headers and data
      const headers = [
        'Campaign', 'Phone Number', 'Full Name', 'Email', 'Address',
        'Internet Plan', 'Install Date', 'Payment Method', 'Data Completeness %',
        'Call Outcome', 'DNC Requested', 'Qualified Lead', 'Appointment Scheduled', 'Call Date'
      ];

      const rows = [
        headers,
        ...data.map(lead => [
          lead.campaign_name,
          lead.phone_number,
          lead.full_name || '',
          lead.email || '',
          lead.current_address || '',
          lead.internet_plan || '',
          lead.install_date || '',
          lead.payment_method || '',
          lead.data_completeness.toString(),
          lead.call_outcome || '',
          lead.dnc_requested ? 'Yes' : 'No',
          lead.qualified_lead ? 'Yes' : 'No',
          lead.appointment_scheduled ? 'Yes' : 'No',
          lead.call_date
        ])
      ];

      // Add data to sheet
      const updateResponse = await fetch(
        `${this.SHEETS_API_URL}/${spreadsheetId}/values/A1:append?valueInputOption=RAW`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            values: rows
          })
        }
      );

      if (!updateResponse.ok) {
        throw new Error(`Failed to add data to spreadsheet: ${updateResponse.statusText}`);
      }

      return {
        success: true,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private static async appendToSpreadsheet(
    data: ExportData[],
    spreadsheetId: string,
    accessToken?: string
  ): Promise<{ success: boolean; spreadsheetUrl?: string; error?: string }> {
    if (!accessToken) {
      return {
        success: false,
        error: 'Access token required for Google Sheets integration'
      };
    }

    try {
      const rows = data.map(lead => [
        lead.campaign_name,
        lead.phone_number,
        lead.full_name || '',
        lead.email || '',
        lead.current_address || '',
        lead.internet_plan || '',
        lead.install_date || '',
        lead.payment_method || '',
        lead.data_completeness.toString(),
        lead.call_outcome || '',
        lead.dnc_requested ? 'Yes' : 'No',
        lead.qualified_lead ? 'Yes' : 'No',
        lead.appointment_scheduled ? 'Yes' : 'No',
        lead.call_date
      ]);

      const response = await fetch(
        `${this.SHEETS_API_URL}/${spreadsheetId}/values/A:A/append?valueInputOption=RAW`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            values: rows
          })
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to append data: ${response.statusText}`);
      }

      return {
        success: true,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // CSV export as fallback
  static exportToCSV(data: ExportData[]): string {
    const headers = [
      'Campaign', 'Phone Number', 'Full Name', 'Email', 'Address',
      'Internet Plan', 'Install Date', 'Payment Method', 'Data Completeness %',
      'Call Outcome', 'DNC Requested', 'Qualified Lead', 'Appointment Scheduled', 'Call Date'
    ];

    const csvContent = [
      headers.join(','),
      ...data.map(lead => [
        `"${lead.campaign_name}"`,
        `"${lead.phone_number}"`,
        `"${lead.full_name || ''}"`,
        `"${lead.email || ''}"`,
        `"${lead.current_address || ''}"`,
        `"${lead.internet_plan || ''}"`,
        `"${lead.install_date || ''}"`,
        `"${lead.payment_method || ''}"`,
        lead.data_completeness.toString(),
        `"${lead.call_outcome || ''}"`,
        lead.dnc_requested ? 'Yes' : 'No',
        lead.qualified_lead ? 'Yes' : 'No',
        lead.appointment_scheduled ? 'Yes' : 'No',
        `"${lead.call_date}"`
      ].join(','))
    ].join('\n');

    return csvContent;
  }

  static downloadCSV(data: ExportData[], filename?: string): void {
    const csv = this.exportToCSV(data);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `lead-data-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}

// Zapier Webhook Integration
export class ZapierIntegration {
  static async sendToZapier(
    data: ExportData[],
    webhookUrl: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          leads: data,
          export_date: new Date().toISOString(),
          total_leads: data.length,
          qualified_leads: data.filter(lead => lead.qualified_lead).length,
          dnc_requests: data.filter(lead => lead.dnc_requested).length
        })
      });

      if (!response.ok) {
        throw new Error(`Zapier webhook failed: ${response.statusText}`);
      }

      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
