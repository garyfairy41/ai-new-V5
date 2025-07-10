import { useState, useRef } from 'react';
import { XMarkIcon, DocumentArrowUpIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { CampaignService } from '../services/campaigns';
import type { Campaign, CampaignLead } from '../lib/supabase';
import toast from 'react-hot-toast';

interface LeadUploadModalProps {
  campaign: Campaign;
  onClose: () => void;
  onSuccess: (uploadedLeads: number) => void;
}

interface ParsedLead {
  first_name?: string;
  last_name?: string;
  phone_number: string;
  email?: string;
  company?: string;
  title?: string;
  notes?: string;
  custom_fields?: Record<string, any>;
}

interface ValidationError {
  row: number;
  field: string;
  value: string | undefined;
  message: string;
}

export default function LeadUploadModal({ campaign, onClose, onSuccess }: LeadUploadModalProps) {
  const [uploadMethod, setUploadMethod] = useState<'csv' | 'manual'>('csv');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<any[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'upload' | 'preview' | 'mapping'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Manual entry form state
  const [manualLead, setManualLead] = useState<ParsedLead>({
    first_name: '',
    last_name: '',
    phone_number: '',
    email: '',
    company: '',
    title: '',
    notes: ''
  });

  const requiredColumns = ['first_name', 'last_name', 'phone_number'];
  const optionalColumns = ['email', 'address', 'service_requested', 'notes'];
  const allColumns = [...requiredColumns, ...optionalColumns];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Please select a CSV file');
      return;
    }

    setCsvFile(file);
    parseCSVFile(file);
  };

  const parseCSVFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        toast.error('CSV file must have at least a header row and one data row');
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const rows = lines.slice(1, 6).map(line => { // Preview first 5 rows
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        const row: Record<string, string> = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        return row;
      });

      setCsvPreview([{ headers }, ...rows]);
      setStep('preview');
      
      // Auto-suggest column mappings
      const mapping: Record<string, string> = {};
      headers.forEach(header => {
        const lowerHeader = header.toLowerCase();
        if (lowerHeader.includes('first') && lowerHeader.includes('name')) {
          mapping[header] = 'first_name';
        } else if (lowerHeader.includes('last') && lowerHeader.includes('name')) {
          mapping[header] = 'last_name';
        } else if (lowerHeader.includes('phone') || lowerHeader.includes('mobile')) {
          mapping[header] = 'phone_number';
        } else if (lowerHeader.includes('email')) {
          mapping[header] = 'email';
        } else if (lowerHeader.includes('company') || lowerHeader.includes('organization')) {
          mapping[header] = 'company';
        } else if (lowerHeader.includes('title') || lowerHeader.includes('position')) {
          mapping[header] = 'title';
        } else if (lowerHeader.includes('note')) {
          mapping[header] = 'notes';
        }
      });
      setColumnMapping(mapping);
    };
    reader.readAsText(file);
  };

  const validateLeads = (leads: ParsedLead[]): ValidationError[] => {
    const errors: ValidationError[] = [];
    const phoneNumbers = new Set<string>();

    leads.forEach((lead, index) => {
      const row = index + 1;

      // Required field validation
      if (!lead.first_name?.trim()) {
        errors.push({ row, field: 'first_name', value: lead.first_name, message: 'First name is required' });
      }
      if (!lead.last_name?.trim()) {
        errors.push({ row, field: 'last_name', value: lead.last_name, message: 'Last name is required' });
      }
      if (!lead.phone_number?.trim()) {
        errors.push({ row, field: 'phone_number', value: lead.phone_number, message: 'Phone number is required' });
      }

      // Phone number validation
      if (lead.phone_number) {
        const cleanPhone = lead.phone_number.replace(/\D/g, '');
        if (cleanPhone.length < 10) {
          errors.push({ row, field: 'phone_number', value: lead.phone_number, message: 'Phone number must be at least 10 digits' });
        }
        
        // Check for duplicates
        if (phoneNumbers.has(cleanPhone)) {
          errors.push({ row, field: 'phone_number', value: lead.phone_number, message: 'Duplicate phone number' });
        }
        phoneNumbers.add(cleanPhone);
      }

      // Email validation
      if (lead.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) {
        errors.push({ row, field: 'email', value: lead.email, message: 'Invalid email format' });
      }
    });

    return errors;
  };

  const handleCSVUpload = async () => {
    if (!csvFile) return;

    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        
        const leads: ParsedLead[] = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
          const lead: ParsedLead = {
            first_name: '',
            last_name: '',
            phone_number: ''
          };

          headers.forEach((header, index) => {
            const mappedField = columnMapping[header];
            if (mappedField && values[index]) {
              if (allColumns.includes(mappedField)) {
                (lead as any)[mappedField] = values[index];
              }
            }
          });

          // Clean phone number
          if (lead.phone_number) {
            lead.phone_number = lead.phone_number.replace(/\D/g, '');
            if (!lead.phone_number.startsWith('1') && lead.phone_number.length === 10) {
              lead.phone_number = '1' + lead.phone_number;
            }
            if (!lead.phone_number.startsWith('+')) {
              lead.phone_number = '+' + lead.phone_number;
            }
          }

          return lead;
        }).filter(lead => lead.first_name && lead.last_name && lead.phone_number);

        // Validate leads
        const errors = validateLeads(leads);
        if (errors.length > 0) {
          setValidationErrors(errors);
          toast.error(`Found ${errors.length} validation errors. Please review.`);
          return;
        }

        // Convert to campaign leads format
        const campaignLeads = leads.map(lead => ({
          campaign_id: campaign.id,
          first_name: lead.first_name,
          last_name: lead.last_name,
          phone_number: lead.phone_number,
          email: lead.email || null,
          company: lead.company || null,
          title: lead.title || null,
          notes: lead.notes || null,
          status: 'pending' as const,
          call_attempts: 0,
          outcome: null,
          last_call_at: null,
          custom_fields: lead.custom_fields || null
        }));

        // Upload leads
        const result = await CampaignService.addLeadsToCampaign(campaign.id, campaignLeads);
        if (result) {
          toast.success(`Successfully uploaded ${leads.length} leads`);
          onSuccess(leads.length);
          onClose();
        } else {
          toast.error('Failed to upload leads');
        }
      };
      reader.readAsText(csvFile);
    } catch (error) {
      console.error('Error uploading CSV:', error);
      toast.error('Failed to upload CSV file');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate manual lead
      const errors = validateLeads([manualLead]);
      if (errors.length > 0) {
        setValidationErrors(errors);
        toast.error('Please fix validation errors');
        return;
      }

      // Clean phone number
      let cleanPhone = manualLead.phone_number.replace(/\D/g, '');
      if (!cleanPhone.startsWith('1') && cleanPhone.length === 10) {
        cleanPhone = '1' + cleanPhone;
      }
      if (!cleanPhone.startsWith('+')) {
        cleanPhone = '+' + cleanPhone;
      }

      const campaignLead = {
        campaign_id: campaign.id,
        first_name: manualLead.first_name,
        last_name: manualLead.last_name,
        phone_number: cleanPhone,
        email: manualLead.email || null,
        company: manualLead.company || null,
        title: manualLead.title || null,
        notes: manualLead.notes || null,
        status: 'pending' as const,
        call_attempts: 0,
        outcome: null,
        last_call_at: null,
        custom_fields: null
      };

      const result = await CampaignService.addLeadsToCampaign(campaign.id, [campaignLead]);
      if (result) {
        toast.success('Lead added successfully');
        onSuccess(1);
        onClose();
      } else {
        toast.error('Failed to add lead');
      }
    } catch (error) {
      console.error('Error adding manual lead:', error);
      toast.error('Failed to add lead');
    } finally {
      setLoading(false);
    }
  };

  const handleManualInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setManualLead(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-4 mx-auto p-6 border w-full max-w-4xl shadow-lg rounded-md bg-white my-8">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-gray-900">Add Leads to Campaign</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Upload Method Selection */}
        <div className="mb-6">
          <div className="flex space-x-4">
            <button
              onClick={() => setUploadMethod('csv')}
              className={`px-4 py-2 rounded-md font-medium ${
                uploadMethod === 'csv'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              CSV Upload
            </button>
            <button
              onClick={() => setUploadMethod('manual')}
              className={`px-4 py-2 rounded-md font-medium ${
                uploadMethod === 'manual'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Manual Entry
            </button>
          </div>
        </div>

        {uploadMethod === 'csv' && (
          <div>
            {step === 'upload' && (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4">
                    <label htmlFor="csvFile" className="cursor-pointer">
                      <span className="text-lg font-medium text-gray-900">Upload CSV File</span>
                      <p className="text-sm text-gray-500 mt-1">
                        Click to select or drag and drop your CSV file here
                      </p>
                      <input
                        ref={fileInputRef}
                        id="csvFile"
                        type="file"
                        accept=".csv"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </label>
                  </div>
                  {csvFile && (
                    <p className="text-sm text-green-600 mt-2">
                      Selected: {csvFile.name}
                    </p>
                  )}
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">CSV Format Requirements:</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Required columns: First Name, Last Name, Phone Number</li>
                    <li>• Optional columns: Email, Address, Service Requested, Notes</li>
                    <li>• Phone numbers should include country code or be in US format</li>
                    <li>• First row should contain column headers</li>
                  </ul>
                </div>
              </div>
            )}

            {step === 'preview' && csvPreview.length > 0 && (
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">CSV Preview & Column Mapping</h4>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h5 className="font-medium text-gray-900 mb-3">Map CSV columns to lead fields:</h5>
                  <div className="grid grid-cols-2 gap-4">
                    {csvPreview[0].headers.map((header: string) => (
                      <div key={header} className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-700 w-32">{header}:</span>
                        <select
                          value={columnMapping[header] || ''}
                          onChange={(e) => setColumnMapping(prev => ({ ...prev, [header]: e.target.value }))}
                          className="border-gray-300 rounded text-sm focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Skip column</option>
                          {allColumns.map(col => (
                            <option key={col} value={col}>
                              {col.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              {requiredColumns.includes(col) ? ' *' : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {csvPreview[0].headers.map((header: string) => (
                          <th key={header} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {csvPreview.slice(1).map((row, index) => (
                        <tr key={index}>
                          {csvPreview[0].headers.map((header: string) => (
                            <td key={header} className="px-4 py-2 text-sm text-gray-900">
                              {row[header]}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-between">
                  <button
                    onClick={() => setStep('upload')}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleCSVUpload}
                    disabled={loading || !requiredColumns.every(col => Object.values(columnMapping).includes(col))}
                    className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Uploading...' : 'Upload Leads'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {uploadMethod === 'manual' && (
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="first_name"
                  required
                  value={manualLead.first_name}
                  onChange={handleManualInputChange}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="last_name"
                  required
                  value={manualLead.last_name}
                  onChange={handleManualInputChange}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="phone_number"
                  required
                  value={manualLead.phone_number}
                  onChange={handleManualInputChange}
                  placeholder="+1234567890"
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  value={manualLead.email}
                  onChange={handleManualInputChange}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                <input
                  type="text"
                  name="company"
                  value={manualLead.company}
                  onChange={handleManualInputChange}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  name="title"
                  value={manualLead.title}
                  onChange={handleManualInputChange}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  name="notes"
                  value={manualLead.notes}
                  onChange={handleManualInputChange}
                  rows={3}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Adding...' : 'Add Lead'}
              </button>
            </div>
          </form>
        )}

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Validation Errors</h3>
                <div className="mt-2 text-sm text-red-700">
                  <ul className="list-disc pl-5 space-y-1">
                    {validationErrors.slice(0, 10).map((error, index) => (
                      <li key={index}>
                        Row {error.row}: {error.message} ({error.field}: "{error.value}")
                      </li>
                    ))}
                    {validationErrors.length > 10 && (
                      <li>... and {validationErrors.length - 10} more errors</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
