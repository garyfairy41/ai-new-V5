import React, { useState, useEffect } from 'react';
import { X, Calendar, Upload, Users, Zap, AlertCircle, CheckCircle } from 'lucide-react';
import { useUser } from '../../contexts/UserContext';
import campaignService, { type Campaign, type AIAgent, type Lead } from '../../services/campaignService';

interface CampaignWizardProps {
  campaign?: Campaign | null;
  agents: AIAgent[];
  onClose: () => void;
  onSave: () => void;
}

const CampaignWizard: React.FC<CampaignWizardProps> = ({
  campaign,
  agents,
  onClose,
  onSave
}) => {
  const { user } = useUser();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    agent_id: '',
    caller_id: '',
    max_concurrent_calls: 1,
    call_timeout_seconds: 30,
    retry_attempts: 3,
    retry_delay_minutes: 15,
    priority: 'normal' as 'low' | 'normal' | 'high',
    start_immediately: true,
    scheduled_start_date: '',
    start_time: '09:00',
    end_time: '17:00',
    timezone: 'UTC',
    days_of_week: [1, 2, 3, 4, 5],
    script: '',
    target_audience: ''
  });

  const [leads, setLeads] = useState<Partial<Lead>[]>([]);

  useEffect(() => {
    if (campaign) {
      setFormData({
        name: campaign.name,
        description: campaign.description || '',
        agent_id: campaign.agent_id || '',
        caller_id: campaign.caller_id,
        max_concurrent_calls: campaign.max_concurrent_calls,
        call_timeout_seconds: campaign.call_timeout_seconds,
        retry_attempts: campaign.retry_attempts,
        retry_delay_minutes: campaign.retry_delay_minutes,
        priority: campaign.priority as 'low' | 'normal' | 'high',
        start_immediately: !campaign.scheduled_start_date,
        scheduled_start_date: campaign.scheduled_start_date?.split('T')[0] || '',
        start_time: campaign.start_time || '09:00',
        end_time: campaign.end_time || '17:00',
        timezone: campaign.timezone,
        days_of_week: campaign.days_of_week,
        script: campaign.script || '',
        target_audience: campaign.target_audience || ''
      });
    }
  }, [campaign]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      
      try {
        const parsedLeads = campaignService.parseCSVLeads(text);
        setLeads(parsedLeads);
        setError(null);
        setSuccess(`Parsed ${parsedLeads.length} leads from CSV`);
      } catch (error: any) {
        setError(error.message);
        setLeads([]);
      }
    };
    reader.readAsText(file);
  };

  const addManualLead = () => {
    setLeads(prev => [...prev, {
      phone_number: '',
      first_name: '',
      last_name: '',
      email: '',
      company: ''
    }]);
  };

  const updateLead = (index: number, field: string, value: string) => {
    setLeads(prev => prev.map((lead, i) => 
      i === index ? { ...lead, [field]: value } : lead
    ));
  };

  const removeLead = (index: number) => {
    setLeads(prev => prev.filter((_, i) => i !== index));
  };

  const validateStep = () => {
    switch (step) {
      case 1:
        if (!formData.name.trim()) {
          setError('Campaign name is required');
          return false;
        }
        if (!formData.agent_id) {
          setError('Please select an AI agent');
          return false;
        }
        if (!formData.caller_id.trim()) {
          setError('Caller ID is required');
          return false;
        }
        break;
      case 2:
        if (!formData.start_immediately && !formData.scheduled_start_date) {
          setError('Please set a scheduled start date or choose to start immediately');
          return false;
        }
        break;
      case 3:
        if (leads.length === 0) {
          setError('Please add at least one lead');
          return false;
        }
        const invalidLeads = leads.filter(lead => !lead.phone_number?.trim());
        if (invalidLeads.length > 0) {
          setError('All leads must have a phone number');
          return false;
        }
        break;
    }
    setError(null);
    return true;
  };

  const nextStep = () => {
    if (validateStep()) {
      setStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    setStep(prev => prev - 1);
    setError(null);
  };

  const handleSave = async () => {
    if (!validateStep()) return;

    try {
      setLoading(true);
      setError(null);

      // Prepare campaign data
      const campaignData: Partial<Campaign> = {
        profile_id: user!.id,
        name: formData.name,
        description: formData.description,
        agent_id: formData.agent_id,
        caller_id: formData.caller_id,
        max_concurrent_calls: formData.max_concurrent_calls,
        call_timeout_seconds: formData.call_timeout_seconds,
        retry_attempts: formData.retry_attempts,
        retry_delay_minutes: formData.retry_delay_minutes,
        priority: formData.priority,
        start_time: formData.start_time,
        end_time: formData.end_time,
        timezone: formData.timezone,
        days_of_week: formData.days_of_week,
        script: formData.script,
        target_audience: formData.target_audience
      };

      if (!formData.start_immediately && formData.scheduled_start_date) {
        campaignData.scheduled_start_date = `${formData.scheduled_start_date}T${formData.start_time}:00Z`;
      }

      let savedCampaign: Campaign;
      
      if (campaign) {
        // Update existing campaign
        savedCampaign = await campaignService.updateCampaign(campaign.id, campaignData);
      } else {
        // Create new campaign
        savedCampaign = await campaignService.createCampaign(campaignData);
      }

      // Add leads if creating new campaign or if leads were modified
      if (leads.length > 0 && !campaign) {
        const leadsWithPhoneFormatting = leads.map(lead => ({
          ...lead,
          phone_number: campaignService.formatPhoneNumber(lead.phone_number || '')
        }));
        
        await campaignService.addLeads(savedCampaign.id, leadsWithPhoneFormatting);
      }

      setSuccess(campaign ? 'Campaign updated successfully!' : 'Campaign created successfully!');
      
      // Start campaign immediately if requested
      if (formData.start_immediately && !campaign) {
        setTimeout(async () => {
          try {
            await campaignService.startCampaign(savedCampaign.id);
            setSuccess('Campaign created and started successfully!');
          } catch (error: any) {
            setError(`Campaign created but failed to start: ${error.message}`);
          }
        }, 1000);
      }
      
      setTimeout(() => {
        onSave();
      }, 2000);
      
    } catch (error: any) {
      console.error('Error saving campaign:', error);
      setError(error.message || 'Failed to save campaign');
    } finally {
      setLoading(false);
    }
  };

  const downloadCSVExample = () => {
    const csvContent = `phone_number,first_name,last_name,email,company
+1234567890,John,Doe,john.doe@example.com,Example Corp
+1987654321,Jane,Smith,jane.smith@acme.com,Acme Inc
+1555123456,Bob,Johnson,bob.johnson@test.org,Test Organization`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'leads_example.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
              
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Campaign Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="e.g., Sales Outreach Q1 2024"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Brief description of this campaign..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    AI Agent *
                  </label>
                  <select
                    value={formData.agent_id}
                    onChange={(e) => handleInputChange('agent_id', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select an AI Agent</option>
                    {agents.map(agent => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name} ({agent.voice_name} - {agent.agent_type})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Caller ID *
                  </label>
                  <input
                    type="text"
                    value={formData.caller_id}
                    onChange={(e) => handleInputChange('caller_id', e.target.value)}
                    placeholder="+1234567890"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-600 mt-1">The phone number that will appear to recipients</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target Audience
                  </label>
                  <input
                    type="text"
                    value={formData.target_audience}
                    onChange={(e) => handleInputChange('target_audience', e.target.value)}
                    placeholder="e.g., Small business owners, Real estate leads"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Call Script / Talking Points
                  </label>
                  <textarea
                    value={formData.script}
                    onChange={(e) => handleInputChange('script', e.target.value)}
                    placeholder="Key points or script for the AI agent to follow..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Schedule & Settings</h3>
              
              <div className="space-y-4">
                {/* Start Option */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Campaign Start</label>
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        checked={formData.start_immediately}
                        onChange={() => handleInputChange('start_immediately', true)}
                        className="mr-2"
                      />
                      <Zap className="w-4 h-4 mr-2 text-green-600" />
                      <span className="text-sm">Start immediately after creation</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        checked={!formData.start_immediately}
                        onChange={() => handleInputChange('start_immediately', false)}
                        className="mr-2"
                      />
                      <Calendar className="w-4 h-4 mr-2 text-blue-600" />
                      <span className="text-sm">Schedule for later</span>
                    </label>
                  </div>
                </div>

                {/* Scheduled Date */}
                {!formData.start_immediately && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Scheduled Start Date
                    </label>
                    <input
                      type="date"
                      value={formData.scheduled_start_date}
                      onChange={(e) => handleInputChange('scheduled_start_date', e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                )}

                {/* Business Hours */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Business Hours Start
                    </label>
                    <input
                      type="time"
                      value={formData.start_time}
                      onChange={(e) => handleInputChange('start_time', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Business Hours End
                    </label>
                    <input
                      type="time"
                      value={formData.end_time}
                      onChange={(e) => handleInputChange('end_time', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">AI agents will only call during these hours</p>
                  </div>
                </div>

                {/* Dialer Settings */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Concurrent Calls
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={formData.max_concurrent_calls}
                      onChange={(e) => handleInputChange('max_concurrent_calls', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Call Timeout (seconds)
                    </label>
                    <input
                      type="number"
                      min="10"
                      max="120"
                      value={formData.call_timeout_seconds}
                      onChange={(e) => handleInputChange('call_timeout_seconds', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Retry Attempts
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="5"
                      value={formData.retry_attempts}
                      onChange={(e) => handleInputChange('retry_attempts', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Retry Delay (minutes)
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="60"
                      value={formData.retry_delay_minutes}
                      onChange={(e) => handleInputChange('retry_delay_minutes', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">Time to wait between retry attempts</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add Leads</h3>
              
              {/* CSV Upload */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 mb-6">
                <div className="text-center">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <h4 className="text-sm font-medium text-gray-900 mb-1">Upload CSV File</h4>
                  <p className="text-xs text-gray-600 mb-3">
                    CSV should have columns: phone_number, first_name, last_name, email, company
                  </p>
                  <div className="mb-3">
                    <button
                      type="button"
                      onClick={downloadCSVExample}
                      className="text-xs text-blue-600 hover:text-blue-800 underline"
                    >
                      Download CSV Example
                    </button>
                  </div>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCSVUpload}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
              </div>

              {/* Manual Lead Entry */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-medium text-gray-900">Manual Entry</h4>
                  <button
                    type="button"
                    onClick={addManualLead}
                    className="inline-flex items-center px-3 py-1 text-sm font-medium text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50"
                  >
                    <Users className="w-4 h-4 mr-1" />
                    Add Lead
                  </button>
                </div>

                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {leads.map((lead, index) => (
                    <div key={index} className="grid grid-cols-6 gap-2 p-3 bg-gray-50 rounded-md">
                      <input
                        type="text"
                        placeholder="Phone *"
                        value={lead.phone_number || ''}
                        onChange={(e) => updateLead(index, 'phone_number', e.target.value)}
                        className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <input
                        type="text"
                        placeholder="First Name"
                        value={lead.first_name || ''}
                        onChange={(e) => updateLead(index, 'first_name', e.target.value)}
                        className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <input
                        type="text"
                        placeholder="Last Name"
                        value={lead.last_name || ''}
                        onChange={(e) => updateLead(index, 'last_name', e.target.value)}
                        className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <input
                        type="email"
                        placeholder="Email"
                        value={lead.email || ''}
                        onChange={(e) => updateLead(index, 'email', e.target.value)}
                        className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <input
                        type="text"
                        placeholder="Company"
                        value={lead.company || ''}
                        onChange={(e) => updateLead(index, 'company', e.target.value)}
                        className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => removeLead(index)}
                        className="p-1 text-red-600 hover:text-red-800"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {leads.length > 0 && (
                  <div className="mt-3 text-sm text-gray-600">
                    {leads.length} lead{leads.length !== 1 ? 's' : ''} ready to import
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {campaign ? 'Edit Campaign' : 'Create New Campaign'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">Step {step} of 3</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-4">
          <div className="flex items-center">
            {[1, 2, 3].map((i) => (
              <React.Fragment key={i}>
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                  i <= step ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {i}
                </div>
                {i < 3 && (
                  <div className={`flex-1 h-1 mx-2 ${
                    i < step ? 'bg-blue-600' : 'bg-gray-200'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-600">
            <span>Basic Info</span>
            <span>Schedule</span>
            <span>Leads</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-96">
          {/* Alerts */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <div className="flex">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <div className="ml-3">
                  <p className="text-sm text-green-800">{success}</p>
                </div>
              </div>
            </div>
          )}

          {renderStep()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <button
            onClick={prevStep}
            disabled={step === 1}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>

          <div className="flex space-x-3">
            {step < 3 ? (
              <button
                onClick={nextStep}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
              >
                {loading && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                )}
                {campaign ? 'Update Campaign' : 'Create Campaign'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignWizard;
