import React, { useState, useEffect } from 'react';
import { DatabaseService } from '../services/database';
import { useAuth } from '../hooks/useAuth';
import type { AIAgent } from '../lib/supabase';

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Modern Header with Glass Effect */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-3xl opacity-10"></div>
          <div className="relative bg-white/80 backdrop-blur-xl shadow-2xl rounded-3xl border border-white/20">
            <div className="px-8 py-8">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    AI Agent Management
                  </h1>
                  <p className="mt-2 text-lg text-slate-600">Create and manage your intelligent voice agents</p>
                </div>
                <button
                  onClick={handleNewAgent}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-4 rounded-2xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <div className="flex items-center space-x-2">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span className="font-semibold text-lg">Create New Agent</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-3xl opacity-10"></div>
            <div className="relative bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 p-12">
              <div className="flex flex-col items-center space-y-6">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600/20 border-t-blue-600"></div>
                <p className="text-xl font-semibold text-slate-700">Loading AI agents...</p>
                <p className="text-slate-500">Please wait while we fetch your intelligent assistants</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {showForm ? (
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-blue-600 rounded-3xl opacity-5"></div>
              <div className="relative bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20">
                <div className="px-8 py-8">
                  <div className="flex items-center space-x-4 mb-8">
                    <div className="p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-lg">
                      <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold text-slate-900">
                        {editingAgent ? 'Edit AI Agent' : 'Create New AI Agent'}
                      </h2>
                      <p className="text-slate-600">Configure your intelligent voice assistant</p>
                    </div>
                  </div>
                  <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-700">Agent Name</label>
                        <input
                          type="text"
                          name="name"
                          value={formData.name || ''}
                          onChange={handleInputChange}
                          className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 bg-white/80 backdrop-blur-sm"
                          placeholder="Enter agent name..."
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-700">Agent Type</label>
                        <select
                          name="agent_type"
                          value={formData.agent_type || 'general'}
                          onChange={handleAgentTypeChange}
                          className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 bg-white/80 backdrop-blur-sm"
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
                <div className="flex justify-end mt-8 space-x-4">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-8 py-3 border-2 border-slate-300 rounded-xl text-slate-600 hover:bg-slate-50 hover:border-slate-400 transition-all duration-200 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-semibold"
                  >
                    {editingAgent ? 'Update Agent' : 'Create Agent'}
                  </button>
                </div>
                </form>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
              {agents.length === 0 ? (
                <div className="lg:col-span-2 xl:col-span-3">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-400 to-slate-500 rounded-3xl opacity-5"></div>
                    <div className="relative bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-16 text-center">
                      <div className="w-24 h-24 bg-gradient-to-br from-slate-200 to-slate-300 rounded-3xl flex items-center justify-center mx-auto mb-8">
                        <svg className="h-12 w-12 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <h3 className="text-2xl font-bold text-slate-900 mb-4">No AI Agents Found</h3>
                      <p className="text-slate-600 text-lg">Create your first intelligent voice agent to get started with automated conversations.</p>
                    </div>
                  </div>
                </div>
              ) : (
                agents.map(agent => (
                  <div key={agent.id} className="group relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-3xl opacity-0 group-hover:opacity-5 transition-opacity duration-300"></div>
                    <div className={`relative bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-8 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border-l-4 ${
                      agent.is_active ? 'border-l-emerald-500' : 'border-l-slate-300'
                    }`}>
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center space-x-4">
                          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg ${
                            agent.is_active 
                              ? 'bg-gradient-to-br from-emerald-500 to-emerald-600' 
                              : 'bg-gradient-to-br from-slate-400 to-slate-500'
                          }`}>
                            <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-slate-900 mb-1">{agent.name}</h3>
                            <div className="flex items-center space-x-2">
                              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                                🤖 {getAgentTypeLabel(agent.agent_type)}
                              </span>
                              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                                agent.is_active 
                                  ? 'bg-emerald-100 text-emerald-700' 
                                  : 'bg-slate-100 text-slate-600'
                              }`}>
                                {agent.is_active ? '🟢 Active' : '🔴 Inactive'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleToggleActive(agent)}
                            className={`p-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 ${
                              agent.is_active 
                                ? 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700' 
                                : 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700'
                            }`}
                          >
                            {agent.is_active ? (
                              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            ) : (
                              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.5a1.5 1.5 0 011.5 1.5V12M9 10v4a1 1 0 001 1h4M9 10H7.5A1.5 1.5 0 006 8.5V7M9 10V7a1 1 0 011-1h4a1 1 0 011 1v3" />
                              </svg>
                            )}
                          </button>
                          <button
                            onClick={() => handleEdit(agent)}
                            className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                          >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(agent.id)}
                            className="p-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                          >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        {agent.description && (
                          <p className="text-slate-600">{agent.description}</p>
                        )}
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex items-center space-x-2">
                            <svg className="h-5 w-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2M7 4h10M7 4L5.5 5.5M17 4l1.5 1.5M5 9h14l-1 10H6L5 9z" />
                            </svg>
                            <span className="text-sm text-slate-600">{agent.voice_name}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <svg className="h-5 w-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            <span className="text-sm text-slate-600">Max: {agent.max_concurrent_calls} calls</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <svg className="h-5 w-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-sm text-slate-600">{agent.timezone}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <svg className="h-5 w-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                            </svg>
                            <span className="text-sm text-slate-600">{agent.language_code}</span>
                          </div>
                        </div>
                        
                        <div className="pt-4 border-t border-slate-200">
                          <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-2">Business Hours</p>
                          <p className="text-sm text-slate-600">
                            {agent.business_hours_start} - {agent.business_hours_end}
                          </p>
                          <div className="flex space-x-1 mt-2">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                              <span
                                key={day}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium ${
                                  (agent.business_days || []).includes(index) 
                                    ? 'bg-emerald-100 text-emerald-700' 
                                    : 'bg-slate-100 text-slate-400'
                                }`}
                              >
                                {day.charAt(0)}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                            agent.is_active 
                              ? 'bg-gradient-to-br from-emerald-500 to-emerald-600' 
                              : 'bg-gradient-to-br from-slate-400 to-slate-500'
                          }`}>
                            <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-slate-900">{agent.name}</h3>
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                              agent.is_active 
                                ? 'bg-emerald-100 text-emerald-700' 
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              {agent.is_active ? '🟢 Active' : '⚪ Inactive'}
                            </span>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleToggleActive(agent)}
                            className={`p-3 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 ${
                              agent.is_active
                                ? 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700'
                                : 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700'
                            }`}
                            title={agent.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {agent.is_active ? (
                              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            ) : (
                              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.586a1 1 0 01.707.293l2.414 2.414a1 1 0 00.707.293H15" />
                              </svg>
                            )}
                          </button>
                          <button
                            onClick={() => handleEdit(agent)}
                            className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                            title="Edit"
                          >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(agent.id)}
                            className="p-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                            title="Delete"
                          >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                          <span className="inline-block bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-xl font-semibold">
                            {getAgentTypeLabel(agent.agent_type)}
                          </span>
                          <span className="inline-block bg-purple-100 text-purple-800 text-sm px-3 py-1 rounded-xl font-semibold">
                            🎤 {agent.voice_name}
                          </span>
                          <span className="inline-block bg-indigo-100 text-indigo-800 text-sm px-3 py-1 rounded-xl font-semibold">
                            🌐 {agent.language_code}
                          </span>
                        </div>
                        
                        {agent.description && (
                          <p className="text-slate-600 text-sm leading-relaxed">{agent.description}</p>
                        )}
                        
                        <div className="space-y-3 pt-4 border-t border-slate-100">
                          <div className="flex items-center text-slate-600">
                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                              <svg className="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <span className="font-medium">
                              {agent.business_hours_start || '9:00'} - {agent.business_hours_end || '17:00'}
                            </span>
                          </div>
                          
                          <div className="flex items-center text-slate-600">
                            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center mr-3">
                              <svg className="h-4 w-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <span className="text-sm">
                              {(agent.business_days || [1, 2, 3, 4, 5])
                                .map(day => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day])
                                .join(', ')}
                            </span>
                          </div>
                          
                          <div className="flex items-center text-slate-600">
                            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                              <svg className="h-4 w-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m0 0V6a2 2 0 01-2 2H9a2 2 0 01-2-2V4zm0 0V2" />
                              </svg>
                            </div>
                            <span className="text-sm font-medium">Max calls: {agent.max_concurrent_calls || 5}</span>
                          </div>
                        </div>
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
    </div>
  );
};

export default AgentManager;