import React, { useState, useEffect } from 'react';
import { 
  XMarkIcon, 
  ClockIcon,
  PhoneIcon,
  CogIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { DatabaseService } from '../services/database';
import { useUser } from '../contexts/UserContext';
import type { Campaign, AIAgent } from '../lib/supabase';
import toast from 'react-hot-toast';
import LeadManagementModal from './LeadManagementModal';

interface CampaignFormModalProps {
  campaign?: Campaign | null; // If provided, we're editing; if null/undefined, we're creating
  onClose: () => void;
  onSuccess: () => void;
}

interface CampaignFormData {
  name: string;
  description: string;
  agent_id: string;
  caller_id: string;
  max_concurrent_calls: number;
  call_timeout_seconds: number;
  retry_attempts: number;
  retry_delay_minutes: number;
  start_time: string;
  end_time: string;
  timezone: string;
  days_of_week: number[];
  scheduled_start_date: string;
  scheduled_end_date: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  // Add scheduling options
  start_option: 'immediate' | 'scheduled';
  scheduled_datetime: string;
}

const TIMEZONE_OPTIONS = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Phoenix', label: 'Arizona Time (MST)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)' }
];

const DAYS_OF_WEEK = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 0, label: 'Sunday' }
];

export default function CampaignFormModal({
  campaign,
  onClose,
  onSuccess
}: CampaignFormModalProps) {
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [activeTab, setActiveTab] = useState<'basic' | 'schedule' | 'dialer' | 'leads'>('basic');
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [campaignId, setCampaignId] = useState<string | null>(campaign?.id || null);
  
  const [formData, setFormData] = useState<CampaignFormData>({
    name: campaign?.name || '',
    description: campaign?.description || '',
    agent_id: campaign?.agent_id || '',
    caller_id: campaign?.caller_id || '+18553947135',
    max_concurrent_calls: campaign?.max_concurrent_calls || 1,
    call_timeout_seconds: campaign?.call_timeout_seconds || 30,
    retry_attempts: campaign?.retry_attempts || 3,
    retry_delay_minutes: campaign?.retry_delay_minutes || 60,
    start_time: campaign?.start_time || '09:00',
    end_time: campaign?.end_time || '17:00',
    timezone: campaign?.timezone || 'America/New_York',
    days_of_week: campaign?.days_of_week || [1, 2, 3, 4, 5],
    scheduled_start_date: campaign?.scheduled_start_date || '',
    scheduled_end_date: campaign?.scheduled_end_date || '',
    priority: campaign?.priority || 'normal',
    start_option: 'immediate' as 'immediate' | 'scheduled',
    scheduled_datetime: ''
  });

  const isEditing = !!campaign;

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    if (!user) return;
    try {
      const agentsData = await DatabaseService.getAIAgents(user.id);
      const activeAgents = agentsData.filter(agent => 
        agent.is_active && (agent.call_direction === 'outbound' || agent.call_direction === 'both')
      );
      setAgents(activeAgents);
      
      if (activeAgents.length === 1 && !formData.agent_id) {
        setFormData(prev => ({ ...prev, agent_id: activeAgents[0].id }));
      }
    } catch (error) {
      console.error('Error loading agents:', error);
      toast.error('Failed to load AI agents');
    }
  };

  const handleInputChange = (field: keyof CampaignFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDayToggle = (day: number) => {
    setFormData(prev => ({
      ...prev,
      days_of_week: prev.days_of_week.includes(day)
        ? prev.days_of_week.filter(d => d !== day)
        : [...prev.days_of_week, day].sort()
    }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast.error('Campaign name is required');
      return false;
    }
    if (!formData.caller_id.trim()) {
      toast.error('Caller ID is required');
      return false;
    }
    if (!formData.timezone) {
      toast.error('Timezone is required');
      return false;
    }
    if (formData.days_of_week.length === 0) {
      toast.error('Please select at least one day of the week');
      return false;
    }
    if (formData.start_time >= formData.end_time) {
      toast.error('End time must be after start time');
      return false;
    }
    if (formData.max_concurrent_calls < 1) {
      toast.error('Max concurrent calls must be at least 1');
      return false;
    }
    if (formData.call_timeout_seconds < 10) {
      toast.error('Call timeout must be at least 10 seconds');
      return false;
    }
    if (formData.retry_attempts < 0) {
      toast.error('Retry attempts cannot be negative');
      return false;
    }
    if (formData.start_option === 'scheduled' && !formData.scheduled_datetime) {
      toast.error('Scheduled date and time are required');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.id || !validateForm()) {
      toast.error('User authentication required to create campaigns');
      return;
    }

    setLoading(true);
    try {
      console.log('🎯 Submitting campaign form:', formData);
      console.log('👤 User ID:', user.id);
      
      const campaignData = {
        name: formData.name.trim(),
        description: formData.description?.trim() || '',
        profile_id: user.id,
        status: 'draft' as const,
        caller_id: formData.caller_id.trim(),
        max_concurrent_calls: Number(formData.max_concurrent_calls),
        call_timeout_seconds: Number(formData.call_timeout_seconds),
        retry_attempts: Number(formData.retry_attempts),
        retry_delay_minutes: Number(formData.retry_delay_minutes),
        timezone: formData.timezone,
        days_of_week: formData.days_of_week,
        priority: formData.priority,
        // Optional fields
        ...(formData.agent_id && { agent_id: formData.agent_id }),
        ...(formData.start_time && { start_time: formData.start_time }),
        ...(formData.end_time && { end_time: formData.end_time }),
        ...(formData.scheduled_start_date && { scheduled_start_date: formData.scheduled_start_date }),
        ...(formData.scheduled_end_date && { scheduled_end_date: formData.scheduled_end_date }),
        // Initialize counters
        total_leads: campaign?.total_leads || 0,
        leads_called: campaign?.leads_called || 0,
        leads_answered: campaign?.leads_answered || 0,
        leads_completed: campaign?.leads_completed || 0,
      };

      let result;
      if (isEditing) {
        console.log('📝 Updating existing campaign:', campaign.id);
        result = await DatabaseService.updateCampaign(campaign.id, campaignData);
        toast.success('Campaign updated successfully');
      } else {
        console.log('🆕 Creating new campaign');
        result = await DatabaseService.createCampaign(campaignData);
        if (result) {
          setCampaignId(result.id);
          console.log('✅ New campaign created with ID:', result.id);
        }
        toast.success('Campaign created successfully');
      }

      if (result && !isEditing) {
        // For new campaigns, switch to leads tab
        setActiveTab('leads');
      } else {
        onSuccess();
        onClose();
      }
    } catch (error) {
      console.error('💥 Error saving campaign:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to ${isEditing ? 'update' : 'create'} campaign: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLeadModalSuccess = () => {
    onSuccess();
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-4 mx-auto p-6 border w-full max-w-4xl shadow-lg rounded-lg bg-white my-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-900">
              {isEditing ? 'Edit Campaign' : 'Create New Campaign'}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'basic', label: 'Basic Info', icon: InformationCircleIcon },
                { id: 'schedule', label: 'Schedule', icon: ClockIcon },
                { id: 'dialer', label: 'Dialer Settings', icon: CogIcon },
                { id: 'leads', label: 'Leads', icon: PhoneIcon, disabled: !campaignId }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => !tab.disabled && setActiveTab(tab.id as any)}
                  disabled={tab.disabled}
                  className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : tab.disabled
                      ? 'border-transparent text-gray-400 cursor-not-allowed'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="h-5 w-5 mr-2" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Basic Info Tab */}
            {activeTab === 'basic' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Campaign Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Q1 Sales Outreach"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priority
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) => handleInputChange('priority', e.target.value)}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={3}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Brief description of the campaign objectives and target audience..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    AI Agent <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.agent_id}
                    onChange={(e) => handleInputChange('agent_id', e.target.value)}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select an AI agent</option>
                    {agents.map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-sm text-gray-500">
                    This AI agent will handle all conversations with leads
                  </p>
                </div>
              </div>
            )}

            {/* Schedule Tab */}
            {activeTab === 'schedule' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Time Zone <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.timezone}
                      onChange={(e) => handleInputChange('timezone', e.target.value)}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      {TIMEZONE_OPTIONS.map((tz) => (
                        <option key={tz.value} value={tz.value}>
                          {tz.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Time <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      value={formData.start_time}
                      onChange={(e) => handleInputChange('start_time', e.target.value)}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Time <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      value={formData.end_time}
                      onChange={(e) => handleInputChange('end_time', e.target.value)}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Days of Week <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-7 gap-2">
                    {DAYS_OF_WEEK.map((day) => (
                      <label key={day.value} className="flex items-center justify-center">
                        <input
                          type="checkbox"
                          checked={formData.days_of_week.includes(day.value)}
                          onChange={() => handleDayToggle(day.value)}
                          className="sr-only"
                        />
                        <div
                          className={`px-3 py-2 rounded-md text-sm font-medium cursor-pointer text-center transition-colors ${
                            formData.days_of_week.includes(day.value)
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {day.label.substring(0, 3)}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Campaign Start Date (Optional)
                    </label>
                    <input
                      type="date"
                      value={formData.scheduled_start_date}
                      onChange={(e) => handleInputChange('scheduled_start_date', e.target.value)}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Campaign End Date (Optional)
                    </label>
                    <input
                      type="date"
                      value={formData.scheduled_end_date}
                      onChange={(e) => handleInputChange('scheduled_end_date', e.target.value)}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Scheduling Options */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Option
                  </label>
                  <select
                    value={formData.start_option}
                    onChange={(e) => handleInputChange('start_option', e.target.value)}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="immediate">Immediate</option>
                    <option value="scheduled">Scheduled</option>
                  </select>
                </div>

                {formData.start_option === 'scheduled' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Scheduled Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.scheduled_datetime}
                      onChange={(e) => handleInputChange('scheduled_datetime', e.target.value)}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Dialer Settings Tab */}
            {activeTab === 'dialer' && (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <div className="flex">
                    <InformationCircleIcon className="h-5 w-5 text-blue-400" />
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800">
                        Auto-Dialer Configuration
                      </h3>
                      <div className="mt-2 text-sm text-blue-700">
                        <p>Configure how the auto-dialer will handle calls for this campaign.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Concurrent Calls
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={formData.max_concurrent_calls}
                      onChange={(e) => handleInputChange('max_concurrent_calls', parseInt(e.target.value))}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="mt-1 text-sm text-gray-500">Maximum number of simultaneous calls</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Call Timeout (seconds)
                    </label>
                    <input
                      type="number"
                      min="10"
                      max="120"
                      value={formData.call_timeout_seconds}
                      onChange={(e) => handleInputChange('call_timeout_seconds', parseInt(e.target.value))}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="mt-1 text-sm text-gray-500">Time to wait before considering call unanswered</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Retry Attempts
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={formData.retry_attempts}
                      onChange={(e) => handleInputChange('retry_attempts', parseInt(e.target.value))}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="mt-1 text-sm text-gray-500">Number of retry attempts for unsuccessful calls</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Retry Delay (minutes)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="1440"
                      value={formData.retry_delay_minutes}
                      onChange={(e) => handleInputChange('retry_delay_minutes', parseInt(e.target.value))}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="mt-1 text-sm text-gray-500">Wait time between retry attempts</p>
                  </div>
                </div>
              </div>
            )}

            {/* Leads Tab */}
            {activeTab === 'leads' && campaignId && (
              <div className="space-y-6">
                <div className="text-center py-8">
                  <PhoneIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-lg font-medium text-gray-900">Manage Campaign Leads</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Add leads to your campaign using CSV upload or manual entry.
                  </p>
                  <div className="mt-6">
                    <button
                      type="button"
                      onClick={() => setShowLeadModal(true)}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      Add Leads
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Form Actions */}
            <div className="flex justify-between items-center pt-6 border-t border-gray-200">
              <div className="flex space-x-3">
                {activeTab !== 'basic' && (
                  <button
                    type="button"
                    onClick={() => {
                      const tabs = ['basic', 'schedule', 'dialer', 'leads'];
                      const currentIndex = tabs.indexOf(activeTab);
                      if (currentIndex > 0) {
                        setActiveTab(tabs[currentIndex - 1] as any);
                      }
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Previous
                </button>
                )}
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                
                {activeTab !== 'leads' && (
                  <button
                    type="button"
                    onClick={() => {
                      const tabs = ['basic', 'schedule', 'dialer', 'leads'];
                      const currentIndex = tabs.indexOf(activeTab);
                      if (currentIndex < tabs.length - 1) {
                        // Save draft and move to next tab
                        if (currentIndex === 0 && !campaignId) {
                          handleSubmit(new Event('submit') as any);
                        } else {
                          setActiveTab(tabs[currentIndex + 1] as any);
                        }
                      }
                    }}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  >
                    {activeTab === 'basic' && !campaignId ? 'Create & Continue' : 'Next'}
                  </button>
                )}

                {(activeTab !== 'basic' || isEditing) && (
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : isEditing ? 'Update Campaign' : 'Save Campaign'}
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Lead Management Modal */}
      {showLeadModal && campaignId && (
        <LeadManagementModal
          campaignId={campaignId}
          campaignName={formData.name}
          onClose={() => setShowLeadModal(false)}
          onSuccess={handleLeadModalSuccess}
        />
      )}
    </>
  );
}
