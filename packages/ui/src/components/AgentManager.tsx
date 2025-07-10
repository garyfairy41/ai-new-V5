import React, { useState, useEffect } from 'react';
import { DatabaseService } from '../services/database';
import { useAuth } from '../hooks/useAuth';
import type { AIAgent } from '../lib/supabase';
import LeadVariablesHelper from './LeadVariablesHelper';

const VOICE_OPTIONS = [
  { value: 'Puck', label: 'Puck (Male, Neutral)' },
  { value: 'Charon', label: 'Charon (Male, Deep)' },
  { value: 'Kore', label: 'Kore (Female, Warm)' },
  { value: 'Fenrir', label: 'Fenrir (Male, Authoritative)' },
  { value: 'Aoede', label: 'Aoede (Female, Melodic)' },
  { value: 'Leda', label: 'Leda (Female, Professional)' },
  { value: 'Orus', label: 'Orus (Male, Friendly)' },
  { value: 'Zephyr', label: 'Zephyr (Non-binary, Calm)' }
];

const AGENT_TYPES = [
  { value: 'customer_service', label: 'Customer Service' },
  { value: 'sales', label: 'Sales' },
  { value: 'support', label: 'Technical Support' },
  { value: 'appointment_booking', label: 'Appointment Booking' },
  { value: 'survey', label: 'Survey & Feedback' },
  { value: 'after_hours', label: 'After Hours' },
  { value: 'general', label: 'General Purpose' }
];

const CALL_DIRECTION_OPTIONS = [
  { value: 'inbound', label: 'Inbound Only (Receives calls)' },
  { value: 'outbound', label: 'Outbound Only (Makes calls)' },
  { value: 'both', label: 'Both Inbound & Outbound' }
];

const ROUTING_TYPE_OPTIONS = [
  { value: 'direct', label: 'Direct Connection (Default)' },
  { value: 'ivr', label: 'Phone Menu (Interactive Voice Response)' },
  { value: 'forward', label: 'Forward to Phone Number' }
];

const LANGUAGE_OPTIONS = [
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'es-ES', label: 'Spanish' },
  { value: 'fr-FR', label: 'French' },
  { value: 'de-DE', label: 'German' },
  { value: 'it-IT', label: 'Italian' },
  { value: 'ja-JP', label: 'Japanese' },
  { value: 'ko-KR', label: 'Korean' },
  { value: 'pt-BR', label: 'Portuguese (Brazil)' },
  { value: 'zh-CN', label: 'Chinese (Simplified)' }
];

const TIMEZONE_OPTIONS = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
  { value: 'Europe/London', label: 'Greenwich Mean Time (GMT)' },
  { value: 'Europe/Paris', label: 'Central European Time (CET)' },
  { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST)' },
  { value: 'Australia/Sydney', label: 'Australian Eastern Time (AET)' }
];

const DEFAULT_SYSTEM_INSTRUCTIONS = {
  customer_service: 'You are a professional customer service AI assistant. Be friendly, helpful, and efficient. Your goal is to provide excellent customer service by addressing customer inquiries, resolving issues, and ensuring customer satisfaction. Start with a warm greeting and always maintain a positive, professional tone throughout the conversation.',
  sales: 'You are a professional sales AI assistant. Be persuasive, knowledgeable, and helpful. Your goal is to understand customer needs and guide them toward making a purchase decision. Highlight product benefits, address objections professionally, and focus on value rather than just features. Start with an engaging greeting and maintain an enthusiastic tone.',
  support: 'You are a professional technical support AI assistant. Be clear, patient, and thorough. Your goal is to help customers resolve technical issues by providing step-by-step guidance. Ask clarifying questions when needed and confirm understanding before proceeding. Start with a supportive greeting and maintain a calm, reassuring tone throughout the conversation.',
  appointment_booking: 'You are a professional appointment scheduling AI assistant. Be efficient, organized, and helpful. Your goal is to help callers schedule, reschedule, or cancel appointments. Collect necessary information including name, contact details, preferred date/time, and reason for appointment. Confirm all details before finalizing. Start with a professional greeting and maintain a courteous tone.',
  survey: 'You are a professional survey AI assistant. Be friendly, neutral, and engaging. Your goal is to collect feedback by asking specific questions and recording responses. Avoid leading questions or influencing answers. Thank participants for their time and feedback. Start with a brief introduction explaining the purpose and length of the survey.',
  after_hours: 'You are an after-hours AI assistant. Be helpful but clear about limited availability. Your goal is to assist with basic inquiries, take messages, and set expectations for when the caller can receive full service. For urgent matters, provide emergency contact information if available. Start with a greeting that acknowledges it\'s outside normal business hours.',
  general: 'You are a professional AI assistant for phone calls. Be helpful, polite, and efficient. Your goal is to assist callers with their inquiries and direct them to the appropriate resources when needed. Start with a warm greeting like "Hello! Thank you for calling. How can I help you today?" Always maintain a friendly, professional tone throughout the call.'
};

const AgentManager: React.FC = () => {
  const { user } = useAuth();
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAgent, setEditingAgent] = useState<AIAgent | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [formData, setFormData] = useState<Partial<AIAgent>>({
    name: '',
    description: '',
    agent_type: 'general',
    call_direction: 'inbound',
    routing_type: 'direct', // Default to direct connection
    voice_name: 'Puck',
    language_code: 'en-US',
    system_instruction: '',
    greeting: '',
    max_concurrent_calls: 5,
    timezone: 'America/New_York',
    business_hours_start: '09:00',
    business_hours_end: '17:00',
    business_days: [1, 2, 3, 4, 5], // Monday to Friday
    is_active: true,
    forward_number: '', // For forward routing type
    ivr_menu_id: null // For IVR routing type
  });

  useEffect(() => {
    if (user) {
      loadAgents();
    }
  }, [user]);

  const loadAgents = async () => {
    setLoading(true);
    try {
      if (!user) {
        console.error('No user found');
        setLoading(false);
        return;
      }
      
      const agentData = await DatabaseService.getAIAgents(user.id);
      setAgents(agentData);
    } catch (error) {
      console.error('Error loading agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  const handleAgentTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const agentType = e.target.value as keyof typeof DEFAULT_SYSTEM_INSTRUCTIONS;
    setFormData(prev => ({
      ...prev,
      agent_type: agentType,
      system_instruction: DEFAULT_SYSTEM_INSTRUCTIONS[agentType] || prev.system_instruction
    }));
  };

  const handleBusinessDayToggle = (day: number) => {
    setFormData(prev => {
      const currentDays = prev.business_days || [1, 2, 3, 4, 5];
      const newDays = currentDays.includes(day)
        ? currentDays.filter(d => d !== day)
        : [...currentDays, day].sort();
      return { ...prev, business_days: newDays };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingAgent) {
        // Update existing agent
        await DatabaseService.updateAIAgent(editingAgent.id, formData);
      } else {
        // Create new agent
        if (!user) {
          console.error('No user found');
          return;
        }
        
        await DatabaseService.createAIAgent({
          ...formData,
          profile_id: user.id
        } as AIAgent);
      }
      
      // Reset form and reload agents
      setFormData({
        name: '',
        description: '',
        agent_type: 'general',
        call_direction: 'inbound',
        routing_type: 'direct',
        voice_name: 'Puck',
        language_code: 'en-US',
        system_instruction: DEFAULT_SYSTEM_INSTRUCTIONS.general,
        greeting: '',
        max_concurrent_calls: 5,
        timezone: 'America/New_York',
        business_hours_start: '09:00',
        business_hours_end: '17:00',
        business_days: [1, 2, 3, 4, 5],
        is_active: true,
        forward_number: '',
        ivr_menu_id: null
      });
      setEditingAgent(null);
      setShowForm(false);
      loadAgents();
    } catch (error) {
      console.error('Error saving agent:', error);
      alert('Error saving agent. Please try again.');
    }
  };

  const handleEdit = (agent: AIAgent) => {
    setEditingAgent(agent);
    setFormData({
      name: agent.name,
      description: agent.description || '',
      agent_type: agent.agent_type,
      call_direction: agent.call_direction || 'inbound',
      routing_type: agent.routing_type || 'direct',
      voice_name: agent.voice_name,
      language_code: agent.language_code,
      system_instruction: agent.system_instruction || DEFAULT_SYSTEM_INSTRUCTIONS[agent.agent_type as keyof typeof DEFAULT_SYSTEM_INSTRUCTIONS] || '',
      greeting: agent.greeting || '',
      max_concurrent_calls: agent.max_concurrent_calls,
      timezone: agent.timezone,
      business_hours_start: agent.business_hours_start || '09:00',
      business_hours_end: agent.business_hours_end || '17:00',
      business_days: agent.business_days || [1, 2, 3, 4, 5],
      is_active: agent.is_active,
      forward_number: agent.forward_number || '',
      ivr_menu_id: agent.ivr_menu_id || null
    });
    setShowForm(true);
  };

  const handleDelete = async (agentId: string) => {
    if (!confirm('Are you sure you want to delete this agent?')) {
      return;
    }
    
    try {
      await DatabaseService.deleteAIAgent(agentId);
      loadAgents();
    } catch (error) {
      console.error('Error deleting agent:', error);
      alert('Error deleting agent. Please try again.');
    }
  };

  const handleToggleActive = async (agent: AIAgent) => {
    try {
      await DatabaseService.toggleAgent(agent.id, !agent.is_active);
      loadAgents();
    } catch (error) {
      console.error('Error toggling agent status:', error);
      alert('Error updating agent status. Please try again.');
    }
  };

  const handleNewAgent = () => {
    setEditingAgent(null);
    setFormData({
      name: '',
      description: '',
      agent_type: 'general',
      voice_name: 'Puck',
      language_code: 'en-US',
      system_instruction: DEFAULT_SYSTEM_INSTRUCTIONS.general,
      greeting: '',
      max_concurrent_calls: 5,
      timezone: 'America/New_York',
      business_hours_start: '09:00',
      business_hours_end: '17:00',
      business_days: [1, 2, 3, 4, 5],
      is_active: true
    });
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingAgent(null);
  };

  const getAgentTypeLabel = (type: string) => {
    return AGENT_TYPES.find(t => t.value === type)?.label || type;
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">AI Agent Management</h1>
        <button
          onClick={handleNewAgent}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
        >
          Create New Agent
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4">Loading agents...</p>
        </div>
      ) : (
        <>
          {showForm ? (
            <div className="bg-white shadow-md rounded-lg p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4">
                {editingAgent ? 'Edit Agent' : 'Create New Agent'}
              </h2>
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-1">Agent Name</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name || ''}
                      onChange={handleInputChange}
                      className="w-full border rounded p-2"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Agent Type</label>
                    <select
                      name="agent_type"
                      value={formData.agent_type || 'general'}
                      onChange={handleAgentTypeChange}
                      className="w-full border rounded p-2"
                      required
                    >
                      {AGENT_TYPES.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Call Direction 
                      <span className="text-xs text-gray-500 ml-1">(Critical for smart routing)</span>
                    </label>
                    <select
                      name="call_direction"
                      value={formData.call_direction || 'inbound'}
                      onChange={handleInputChange}
                      className="w-full border rounded p-2"
                      required
                    >
                      {CALL_DIRECTION_OPTIONS.map(direction => (
                        <option key={direction.value} value={direction.value}>
                          {direction.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-600 mt-1">
                      Inbound agents handle incoming calls. Outbound agents make calls. Choose "Both" for flexible agents.
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Routing Type
                      <span className="text-xs text-gray-500 ml-1">(How calls are handled)</span>
                    </label>
                    <select
                      name="routing_type"
                      value={formData.routing_type || 'direct'}
                      onChange={handleInputChange}
                      className="w-full border rounded p-2"
                      required
                    >
                      {ROUTING_TYPE_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-600 mt-1">
                      Direct connects caller directly to this agent. IVR presents a menu. Forward routes to a phone number.
                    </p>
                  </div>
                  
                  {formData.routing_type === 'forward' && (
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Forward Number
                        <span className="text-xs text-gray-500 ml-1">(Required for forwarding)</span>
                      </label>
                      <input
                        type="tel"
                        name="forward_number"
                        value={formData.forward_number || ''}
                        onChange={handleInputChange}
                        className="w-full border rounded p-2"
                        placeholder="+1234567890"
                        required={formData.routing_type === 'forward'}
                      />
                      <p className="text-xs text-gray-600 mt-1">
                        Enter the phone number to forward calls to, including country code.
                      </p>
                    </div>
                  )}
                  
                  {formData.routing_type === 'ivr' && (
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Phone Menu
                        <span className="text-xs text-gray-500 ml-1">(Required for Phone Menu)</span>
                      </label>
                      <p className="text-xs text-gray-600 mt-1">
                        Phone menus can be configured after creating the agent. Save this agent first, then use the phone menu editor.
                      </p>
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Voice</label>
                    <select
                      name="voice_name"
                      value={formData.voice_name || 'Puck'}
                      onChange={handleInputChange}
                      className="w-full border rounded p-2"
                    >
                      {VOICE_OPTIONS.map(voice => (
                        <option key={voice.value} value={voice.value}>
                          {voice.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Language</label>
                    <select
                      name="language_code"
                      value={formData.language_code || 'en-US'}
                      onChange={handleInputChange}
                      className="w-full border rounded p-2"
                    >
                      {LANGUAGE_OPTIONS.map(lang => (
                        <option key={lang.value} value={lang.value}>
                          {lang.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <input
                      type="text"
                      name="description"
                      value={formData.description || ''}
                      onChange={handleInputChange}
                      className="w-full border rounded p-2"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">Greeting Message</label>
                    <textarea
                      name="greeting"
                      value={formData.greeting || ''}
                      onChange={handleInputChange}
                      className="w-full border rounded p-2"
                      rows={2}
                      placeholder="Hello! Thank you for calling. How can I help you today?"
                    />
                  </div>
                  
                  {/* Lead Variables Helper - Show for outbound agents */}
                  {(formData.call_direction === 'outbound' || formData.call_direction === 'both') && (
                    <div className="md:col-span-2">
                      <LeadVariablesHelper />
                    </div>
                  )}

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">AI Personality & Goals</label>
                    <textarea
                      name="system_instruction"
                      value={formData.system_instruction || ''}
                      onChange={handleInputChange}
                      className="w-full border rounded p-2"
                      rows={6}
                      placeholder="Describe how your AI should behave and what its goals are. For example: 'You are a friendly customer service representative who helps customers with their orders. Be helpful, patient, and always try to resolve their issues.'"
                    />
                  </div>

                  {/* Advanced Settings Toggle */}
                  <div className="md:col-span-2">
                    <button
                      type="button"
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      <span className="mr-2">
                        {showAdvanced ? '▼' : '▶'}
                      </span>
                      Advanced Settings
                    </button>
                  </div>

                  {showAdvanced && (
                    <>
                      <div>
                    <label className="block text-sm font-medium mb-1">Max Concurrent Calls</label>
                    <input
                      type="number"
                      name="max_concurrent_calls"
                      value={formData.max_concurrent_calls || 5}
                      onChange={handleInputChange}
                      className="w-full border rounded p-2"
                      min="1"
                      max="20"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Timezone</label>
                    <select
                      name="timezone"
                      value={formData.timezone || 'America/New_York'}
                      onChange={handleInputChange}
                      className="w-full border rounded p-2"
                    >
                      {TIMEZONE_OPTIONS.map(tz => (
                        <option key={tz.value} value={tz.value}>
                          {tz.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Business Hours Start</label>
                    <input
                      type="time"
                      name="business_hours_start"
                      value={formData.business_hours_start || '09:00'}
                      onChange={handleInputChange}
                      className="w-full border rounded p-2"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Business Hours End</label>
                    <input
                      type="time"
                      name="business_hours_end"
                      value={formData.business_hours_end || '17:00'}
                      onChange={handleInputChange}
                      className="w-full border rounded p-2"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">Business Days</label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { day: 0, label: 'Sun' },
                        { day: 1, label: 'Mon' },
                        { day: 2, label: 'Tue' },
                        { day: 3, label: 'Wed' },
                        { day: 4, label: 'Thu' },
                        { day: 5, label: 'Fri' },
                        { day: 6, label: 'Sat' }
                      ].map(({ day, label }) => (
                        <label key={day} className="inline-flex items-center">
                          <input
                            type="checkbox"
                            checked={(formData.business_days || []).includes(day)}
                            onChange={() => handleBusinessDayToggle(day)}
                            className="form-checkbox h-5 w-5 text-blue-600"
                          />
                          <span className="ml-2">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  
                      <div className="md:col-span-2">
                        <label className="inline-flex items-center">
                          <input
                            type="checkbox"
                            name="is_active"
                            checked={formData.is_active || false}
                            onChange={handleCheckboxChange}
                            className="form-checkbox h-5 w-5 text-blue-600"
                          />
                          <span className="ml-2">Active</span>
                        </label>
                      </div>
                    </>
                  )}
                </div>
                
                <div className="flex justify-end mt-6 space-x-4">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    {editingAgent ? 'Update Agent' : 'Create Agent'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {agents.length === 0 ? (
                <div className="md:col-span-2 lg:col-span-3 text-center py-8">
                  <p className="text-gray-500">No AI agents found. Create your first agent to get started.</p>
                </div>
              ) : (
                agents.map(agent => (
                  <div
                    key={agent.id}
                    className={`bg-white shadow-md rounded-lg p-6 border-l-4 ${
                      agent.is_active ? 'border-green-500' : 'border-gray-300'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <h3 className="text-lg font-semibold">{agent.name}</h3>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleToggleActive(agent)}
                          className={`p-1 rounded ${
                            agent.is_active
                              ? 'text-green-600 hover:bg-green-100'
                              : 'text-gray-400 hover:bg-gray-100'
                          }`}
                          title={agent.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {agent.is_active ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                          )}
                        </button>
                        <button
                          onClick={() => handleEdit(agent)}
                          className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                          title="Edit"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(agent.id)}
                          className="p-1 text-red-600 hover:bg-red-100 rounded"
                          title="Delete"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    
                    <div className="mt-2">
                      <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                        {getAgentTypeLabel(agent.agent_type)}
                      </span>
                      <span className="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded ml-2">
                        {agent.voice_name}
                      </span>
                      <span className="inline-block bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded ml-2">
                        {agent.language_code}
                      </span>
                    </div>
                    
                    {agent.description && (
                      <p className="text-gray-600 mt-2 text-sm">{agent.description}</p>
                    )}
                    
                    <div className="mt-4 text-sm">
                      <div className="flex items-center text-gray-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                        </svg>
                        <span>
                          {agent.business_hours_start || '9:00'} - {agent.business_hours_end || '17:00'}
                        </span>
                      </div>
                      
                      <div className="flex items-center text-gray-600 mt-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                        </svg>
                        <span>
                          {(agent.business_days || [1, 2, 3, 4, 5])
                            .map(day => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day])
                            .join(', ')}
                        </span>
                      </div>
                      
                      <div className="flex items-center text-gray-600 mt-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 14a6 6 0 110-12 6 6 0 010 12z" clipRule="evenodd" />
                        </svg>
                        <span>Max calls: {agent.max_concurrent_calls || 5}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AgentManager;