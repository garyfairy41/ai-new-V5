import { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { DatabaseService } from '../services/database';
import type { Campaign, AIAgent } from '../lib/supabase';
import toast from 'react-hot-toast';

interface EditCampaignModalProps {
  campaign: Campaign;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditCampaignModal({ campaign, onClose, onSuccess }: EditCampaignModalProps) {
  const [loading, setLoading] = useState(false);
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [formData, setFormData] = useState({
    name: campaign.name,
    description: campaign.description || '',
    agent_id: campaign.agent_id || '',
    caller_id: campaign.caller_id || '+18553947135',
    max_concurrent_calls: campaign.max_concurrent_calls || 1,
    call_timeout_seconds: campaign.call_timeout_seconds || 30,
    retry_attempts: campaign.retry_attempts || 3,
    retry_delay_minutes: campaign.retry_delay_minutes || 60,
    start_time: campaign.start_time || '09:00',
    end_time: campaign.end_time || '17:00',
    timezone: campaign.timezone || 'America/New_York',
    days_of_week: campaign.days_of_week || [1, 2, 3, 4, 5],
    scheduled_start_date: campaign.scheduled_start_date ? campaign.scheduled_start_date.split('T')[0] : '',
    scheduled_end_date: campaign.scheduled_end_date ? campaign.scheduled_end_date.split('T')[0] : '',
    custom_system_instruction: campaign.custom_system_instruction || '',
    custom_voice_name: campaign.custom_voice_name || 'Puck',
    priority: campaign.priority || 'normal'
  });

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      const agentsData = await DatabaseService.getAIAgents(campaign.profile_id);
      setAgents(agentsData.filter(agent => agent.is_active));
    } catch (error) {
      console.error('Error loading agents:', error);
      toast.error('Failed to load AI agents');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) || 0 : value
    }));
  };

  const handleDaysOfWeekChange = (day: number) => {
    setFormData(prev => ({
      ...prev,
      days_of_week: prev.days_of_week.includes(day)
        ? prev.days_of_week.filter(d => d !== day)
        : [...prev.days_of_week, day].sort()
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updateData = {
        ...formData,
        scheduled_start_date: formData.scheduled_start_date ? `${formData.scheduled_start_date}T00:00:00Z` : undefined,
        scheduled_end_date: formData.scheduled_end_date ? `${formData.scheduled_end_date}T23:59:59Z` : undefined,
        updated_at: new Date().toISOString()
      };

      await DatabaseService.updateCampaign(campaign.id, updateData);
      toast.success('Campaign updated successfully');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating campaign:', error);
      toast.error('Failed to update campaign');
    } finally {
      setLoading(false);
    }
  };

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const voiceOptions = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede', 'Leda', 'Orus', 'Zephyr'];
  const priorityOptions = ['low', 'normal', 'high', 'urgent'];

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-4 mx-auto p-6 border w-full max-w-4xl shadow-lg rounded-md bg-white my-8">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-gray-900">Edit Campaign</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name</label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Campaign name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleInputChange}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  {priorityOptions.map(priority => (
                    <option key={priority} value={priority}>
                      {priority.charAt(0).toUpperCase() + priority.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Campaign description"
                />
              </div>
            </div>
          </div>

          {/* AI Agent & Voice Configuration */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-lg font-medium text-gray-900 mb-4">AI Agent Configuration</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">AI Agent</label>
                <select
                  name="agent_id"
                  required
                  value={formData.agent_id}
                  onChange={handleInputChange}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select an AI Agent</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Voice</label>
                <select
                  name="custom_voice_name"
                  value={formData.custom_voice_name}
                  onChange={handleInputChange}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  {voiceOptions.map(voice => (
                    <option key={voice} value={voice}>
                      {voice}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Custom System Instructions</label>
                <textarea
                  name="custom_system_instruction"
                  value={formData.custom_system_instruction}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Additional instructions for the AI agent..."
                />
              </div>
            </div>
          </div>

          {/* Dialer Configuration */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Dialer Configuration</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Caller ID</label>
                <input
                  type="tel"
                  name="caller_id"
                  value={formData.caller_id}
                  onChange={handleInputChange}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="+1234567890"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Concurrent Calls</label>
                <input
                  type="number"
                  name="max_concurrent_calls"
                  value={formData.max_concurrent_calls}
                  onChange={handleInputChange}
                  min="1"
                  max="10"
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Call Timeout (seconds)</label>
                <input
                  type="number"
                  name="call_timeout_seconds"
                  value={formData.call_timeout_seconds}
                  onChange={handleInputChange}
                  min="15"
                  max="120"
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Retry Attempts</label>
                <input
                  type="number"
                  name="retry_attempts"
                  value={formData.retry_attempts}
                  onChange={handleInputChange}
                  min="0"
                  max="10"
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Retry Delay (minutes)</label>
                <input
                  type="number"
                  name="retry_delay_minutes"
                  value={formData.retry_delay_minutes}
                  onChange={handleInputChange}
                  min="5"
                  max="1440"
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Schedule Configuration */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Schedule Configuration</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                <input
                  type="time"
                  name="start_time"
                  value={formData.start_time}
                  onChange={handleInputChange}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                <input
                  type="time"
                  name="end_time"
                  value={formData.end_time}
                  onChange={handleInputChange}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                <select
                  name="timezone"
                  value={formData.timezone}
                  onChange={handleInputChange}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="America/New_York">Eastern Time</option>
                  <option value="America/Chicago">Central Time</option>
                  <option value="America/Denver">Mountain Time</option>
                  <option value="America/Los_Angeles">Pacific Time</option>
                  <option value="UTC">UTC</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Operating Days</label>
                <div className="flex space-x-2">
                  {dayLabels.map((day, index) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleDaysOfWeekChange(index)}
                      className={`px-3 py-2 text-sm font-medium rounded-md ${
                        formData.days_of_week.includes(index)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  name="scheduled_start_date"
                  value={formData.scheduled_start_date}
                  onChange={handleInputChange}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  name="scheduled_end_date"
                  value={formData.scheduled_end_date}
                  onChange={handleInputChange}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
