import React, { useState, useRef, useCallback } from 'react';
import { 
  XMarkIcon, 
  DocumentArrowUpIcon, 
  PlusIcon, 
  TrashIcon,
  UserPlusIcon,
  CloudArrowUpIcon
} from '@heroicons/react/24/outline';
import { DatabaseService } from '../services/database';
import { Button } from './Button';
import toast from 'react-hot-toast';

interface LeadData {
  phone_number: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  address?: string;
  service_requested?: string;
  custom_fields?: Record<string, any>;
}

interface LeadManagementModalProps {
  campaignId: string;
  campaignName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function LeadManagementModal({
  campaignId,
  campaignName,
  onClose,
  onSuccess
}: LeadManagementModalProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'manual'>('upload');
  const [loading, setLoading] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<string[][]>([]);
  const [csvMapping, setCsvMapping] = useState<Record<string, string>>({});
  const [manualLeads, setManualLeads] = useState<LeadData[]>([
    { phone_number: '', first_name: '', last_name: '', email: '', address: '', service_requested: '' }
  ]);
  const [importResults, setImportResults] = useState<{
    success: boolean;
    imported: number;
    errors: string[];
  } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const csvColumns = [
    { key: 'phone_number', label: 'Phone Number', required: true },
    { key: 'first_name', label: 'First Name', required: false },
    { key: 'last_name', label: 'Last Name', required: false },
    { key: 'email', label: 'Email', required: false },
    { key: 'company', label: 'Company', required: false },
    { key: 'title', label: 'Title', required: false },
  ];

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      toast.error('Please select a CSV file');
      return;
    }

    setCsvFile(file);
    parseCSV(file);
  }, []);

  const parseCSV = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      const data = lines.map(line => {
        // Simple CSV parsing - handle quoted fields
        const fields = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            fields.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        fields.push(current.trim());
        
        return fields;
      });
      
      setCsvPreview(data);
      
      // Auto-map columns if headers match
      if (data.length > 0) {
        const headers = data[0];
        const mapping: Record<string, string> = {};
        
        csvColumns.forEach(col => {
          const headerIndex = headers.findIndex(h => 
            h.toLowerCase().includes(col.key.replace('_', ' ')) ||
            h.toLowerCase().includes(col.key.replace('_', ''))
          );
          if (headerIndex !== -1) {
            mapping[col.key] = headerIndex.toString();
          }
        });
        
        setCsvMapping(mapping);
      }
    };
    reader.readAsText(file);
  }, []);

  const handleCsvUpload = useCallback(async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (!csvFile) {
      toast.error('Please select a CSV file');
      return;
    }

    if (!csvMapping.phone_number) {
      toast.error('Please map the phone number column');
      return;
    }

    if (loading) return;

    setLoading(true);
    setImportResults(null);

    try {
      console.log('🎯 Starting CSV import...');
      console.log('📁 File:', csvFile.name);
      console.log('🗺️ Mapping:', csvMapping);
      
      // Show loading toast
      toast.loading('Importing leads, please wait...', { id: 'csv-import' });
      
      const result = await DatabaseService.importLeadsFromCSV(campaignId, csvFile);
      console.log('✅ DatabaseService.importLeadsFromCSV result:', result);
      toast.dismiss('csv-import');
      
      setImportResults({
        success: result.success > 0,
        imported: result.success,
        errors: result.errors
      });
      
      if (result.success > 0) {
        console.log('🎉 Success! Showing toast and calling callbacks...');
        toast.success(`Successfully imported ${result.success} leads`);
        
        // Always call success callback if any leads were imported
        setTimeout(() => {
          onSuccess();
        }, 500);
      } else {
        console.log('❌ Failed! Showing error toast...');
        toast.error('Failed to import leads');
      }
    } catch (error) {
      console.error('💥 Exception during CSV import:', error);
      toast.dismiss('csv-import');
      toast.error('Failed to import leads - ' + (error as Error).message);
    } finally {
      console.log('🏁 Setting loading to false...');
      setLoading(false);
    }
  }, [csvFile, csvMapping, campaignId, loading, onSuccess]);

  const handleManualLeadChange = useCallback((index: number, field: keyof LeadData, value: string) => {
    setManualLeads(prev => 
      prev.map((lead, i) => 
        i === index ? { ...lead, [field]: value } : lead
      )
    );
  }, []);

  const addManualLead = useCallback(() => {
    setManualLeads(prev => [...prev, { 
      phone_number: '', 
      first_name: '', 
      last_name: '', 
      email: '', 
      address: '', 
      service_requested: '' 
    }]);
  }, []);

  const removeManualLead = useCallback((index: number) => {
    setManualLeads(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleManualSubmit = useCallback(async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const validLeads = manualLeads.filter(lead => lead.phone_number.trim());
    
    if (validLeads.length === 0) {
      toast.error('Please add at least one lead with a phone number');
      return;
    }

    if (loading) return;

    setLoading(true);
    try {
      console.log('🎯 Starting manual lead submission...');
      
      // Show loading toast
      toast.loading('Adding leads, please wait...', { id: 'manual-add' });
      
      const leadsToAdd = validLeads.map(lead => ({
        phone_number: lead.phone_number.trim(),
        first_name: lead.first_name?.trim() || '',
        last_name: lead.last_name?.trim() || '',
        email: lead.email?.trim() || '',
        address: lead.address?.trim() || '',
        service_requested: lead.service_requested?.trim() || '',
        status: 'pending' as const,
        call_attempts: 0,
        notes: ''
      }));
      console.log('📝 Leads to add:', leadsToAdd);
      
      const success = await DatabaseService.addLeadsToCampaign(campaignId, leadsToAdd);
      console.log('✅ DatabaseService.addLeadsToCampaign result:', success);
      
      // Dismiss the loading toast
      toast.dismiss('manual-add');
      
      if (success) {
        console.log('🎉 Success! Showing toast and calling callbacks...');
        toast.success(`Successfully added ${validLeads.length} leads`);
        
        // Force a small delay to ensure the API call completed
        setTimeout(() => {
          onSuccess();
        }, 500);
      } else {
        console.log('❌ Failed! Showing error toast...');
        toast.error('Failed to add leads');
      }
    } catch (error) {
      console.error('💥 Exception during manual lead submission:', error);
      toast.dismiss('manual-add');
      toast.error('Failed to add leads - ' + (error as Error).message);
    } finally {
      console.log('🏁 Setting loading to false...');
      setLoading(false);
    }
  }, [manualLeads, campaignId, loading, onSuccess]);

  const downloadSampleCSV = useCallback(() => {
    const headers = ['phone_number', 'first_name', 'last_name', 'email', 'address', 'service_requested'];
    const sampleData = [
      '+1234567890,John,Doe,john.doe@example.com,123 Main St,HVAC Repair',
      '+1234567891,Jane,Smith,jane.smith@example.com,456 Oak Ave,Plumbing Service'
    ];
    
    const csvContent = [headers.join(','), ...sampleData].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sample-leads.csv';
    link.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleClose = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClose();
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-6 border w-full max-w-4xl shadow-lg rounded-lg bg-white">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900">
            Manage Leads - {campaignName}
          </h3>
          <button
            type="button"
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'upload'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <CloudArrowUpIcon className="h-5 w-5 inline mr-2" />
              Upload CSV
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('manual')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'manual'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <UserPlusIcon className="h-5 w-5 inline mr-2" />
              Manual Entry
            </button>
          </nav>
        </div>

        {/* CSV Upload Tab */}
        {activeTab === 'upload' && (
          <div className="space-y-6">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
              <div className="text-center">
                <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
                <div className="mt-4">
                  <label htmlFor="csv-upload" className="cursor-pointer">
                    <span className="mt-2 block text-sm font-medium text-gray-900">
                      Drop your CSV file here or click to browse
                    </span>
                    <input
                      id="csv-upload"
                      name="csv-upload"
                      type="file"
                      accept=".csv"
                      className="sr-only"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                    />
                  </label>
                  <p className="mt-1 text-sm text-gray-500">
                    CSV files only. Maximum 10MB.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <Button
                onClick={downloadSampleCSV}
                variant="secondary"
                size="small"
              >
                Download Sample CSV
              </Button>
              {csvFile && (
                <p className="text-sm text-gray-600">
                  Selected: {csvFile.name}
                </p>
              )}
            </div>

            {/* CSV Preview & Mapping */}
            {csvPreview.length > 0 && (
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Map CSV Columns</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {csvColumns.map(col => (
                    <div key={col.key}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {col.label} {col.required && <span className="text-red-500">*</span>}
                      </label>
                      <select
                        value={csvMapping[col.key] || ''}
                        onChange={(e) => setCsvMapping(prev => ({ ...prev, [col.key]: e.target.value }))}
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      >
                        <option value="">Select column...</option>
                        {csvPreview[0]?.map((header, index) => (
                          <option key={index} value={index.toString()}>
                            {header || `Column ${index + 1}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>

                {/* Preview Table */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Preview (First 5 rows)</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          {csvColumns.map(col => (
                            <th key={col.key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {col.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {csvPreview.slice(1, 6).map((row, index) => (
                          <tr key={index}>
                            {csvColumns.map(col => (
                              <td key={col.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {csvMapping[col.key] ? row[parseInt(csvMapping[col.key])] || '-' : '-'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleCsvUpload}
                    disabled={!csvMapping.phone_number}
                    loading={loading}
                    loadingText="Importing..."
                    variant="primary"
                  >
                    Import Leads
                  </Button>
                </div>
              </div>
            )}

            {/* Import Results */}
            {importResults && (
              <div className={`rounded-md p-4 ${importResults.success ? 'bg-green-50' : 'bg-red-50'}`}>
                <div className="flex">
                  <div className="ml-3">
                    <h3 className={`text-sm font-medium ${importResults.success ? 'text-green-800' : 'text-red-800'}`}>
                      Import {importResults.success ? 'Successful' : 'Failed'}
                    </h3>
                    <div className={`mt-2 text-sm ${importResults.success ? 'text-green-700' : 'text-red-700'}`}>
                      <p>Successfully imported {importResults.imported} leads</p>
                      {importResults.errors.length > 0 && (
                        <ul className="mt-2 list-disc list-inside">
                          {importResults.errors.map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Manual Entry Tab */}
        {activeTab === 'manual' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h4 className="font-medium text-gray-900">Add Leads Manually</h4>
              <Button
                onClick={addManualLead}
                variant="secondary"
                size="small"
                icon={<PlusIcon className="h-4 w-4" />}
              >
                Add Lead
              </Button>
            </div>

            <div className="space-y-4">
              {manualLeads.map((lead, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-4">
                    <h5 className="font-medium text-gray-900">Lead {index + 1}</h5>
                    {manualLeads.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeManualLead(index)}
                        className="text-red-400 hover:text-red-600"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        value={lead.phone_number}
                        onChange={(e) => handleManualLeadChange(index, 'phone_number', e.target.value)}
                        placeholder="+1234567890"
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={lead.email}
                        onChange={(e) => handleManualLeadChange(index, 'email', e.target.value)}
                        placeholder="john.doe@example.com"
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        First Name
                      </label>
                      <input
                        type="text"
                        value={lead.first_name}
                        onChange={(e) => handleManualLeadChange(index, 'first_name', e.target.value)}
                        placeholder="John"
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={lead.last_name}
                        onChange={(e) => handleManualLeadChange(index, 'last_name', e.target.value)}
                        placeholder="Doe"
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Address
                      </label>
                      <input
                        type="text"
                        value={lead.address}
                        onChange={(e) => handleManualLeadChange(index, 'address', e.target.value)}
                        placeholder="123 Main St"
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Service Requested
                      </label>
                      <input
                        type="text"
                        value={lead.service_requested}
                        onChange={(e) => handleManualLeadChange(index, 'service_requested', e.target.value)}
                        placeholder="HVAC Repair"
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                onClick={handleClose}
                variant="secondary"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleManualSubmit}
                loading={loading}
                loadingText="Adding..."
                variant="primary"
              >
                Add Leads
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
