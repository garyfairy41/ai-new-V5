import { useState, useEffect } from 'react';
import { 
  PhoneIcon, 
  MicrophoneIcon, 
  ChartBarIcon, 
  Cog6ToothIcon,
  PlayIcon,
  PauseIcon,
  StopIcon,
  UserGroupIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  MegaphoneIcon,
  LinkIcon
} from '@heroicons/react/24/outline';
import { usePermissions } from '../contexts/UserContext';
import UsageTracker from './UsageTracker';
import OutboundCampaigns from './OutboundCampaigns';
import ZapierIntegration from './ZapierIntegration';
import ZapierIntegrationManager from './ZapierIntegrationManager';
import { supabase } from '../lib/supabase';

interface DashboardProps {
  onLogout: () => void
}

interface Agent {
  id: string;
  name: string;
  description?: string;
}

export default function Dashboard({ onLogout }: DashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [serverStatus] = useState<'running' | 'stopped'>('stopped');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [loading, setLoading] = useState(false);
  const { canUseInbound, canUseOutboundDialer } = usePermissions();
  
  // Fetch agents when component mounts
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('agents')
          .select('id, name, description')
          .order('name');
          
        if (error) {
          console.error('Error fetching agents:', error);
          return;
        }
        
        setAgents(data || []);
      } catch (err) {
        console.error('Error fetching agents:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAgents();
  }, [supabase]);

  const stats = [
    { name: 'Active Calls', value: '12', icon: PhoneIcon, color: 'text-green-500' },
    { name: 'Total Calls Today', value: '247', icon: UserGroupIcon, color: 'text-blue-500' },
    { name: 'Success Rate', value: '94.2%', icon: CheckCircleIcon, color: 'text-emerald-500' },
    { name: 'Avg Duration', value: '3m 42s', icon: ClockIcon, color: 'text-purple-500' },
  ];

  const recentCalls = [
    { id: 1, number: '+1 (555) 123-4567', status: 'completed', duration: '4m 23s', time: '2 min ago', ai_response: 'Customer inquiry handled' },
    { id: 2, number: '+1 (555) 987-6543', status: 'active', duration: '1m 15s', time: 'Now', ai_response: 'Appointment booking in progress' },
    { id: 3, number: '+1 (555) 456-7890', status: 'failed', duration: '0m 12s', time: '5 min ago', ai_response: 'Connection timeout' },
    { id: 4, number: '+1 (555) 321-0987', status: 'completed', duration: '6m 45s', time: '8 min ago', ai_response: 'Support ticket created' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="h-10 w-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mr-3">
                <div className="flex space-x-0.5">
                  <PhoneIcon className="h-4 w-4 text-white" />
                  <MicrophoneIcon className="h-4 w-4 text-white" />
                </div>
              </div>
              <h1 className="text-2xl font-bold text-slate-900">AI Call Center</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`h-3 w-3 rounded-full ${serverStatus === 'running' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm text-slate-600">
                  Server {serverStatus === 'running' ? 'Running' : 'Stopped'}
                </span>
              </div>
              <button
                onClick={onLogout}
                className="text-slate-600 hover:text-slate-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="border-b border-slate-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', name: 'Overview', icon: ChartBarIcon, show: true },
              { id: 'calls', name: 'Live Calls', icon: PhoneIcon, show: canUseInbound },
              { id: 'outbound', name: 'Outbound Campaigns', icon: MegaphoneIcon, show: canUseOutboundDialer },
              { id: 'zapier', name: 'Zapier Integration', icon: LinkIcon, show: true },
              { id: 'recordings', name: 'Recordings', icon: MicrophoneIcon, show: true },
              { id: 'settings', name: 'Settings', icon: Cog6ToothIcon, show: true },
            ].filter(tab => tab.show).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
              >
                <tab.icon className="h-5 w-5" />
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* System Status */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">System Status</h3>
                  <p className="text-slate-600">AI calling system is automatically managed and resilient</p>
                </div>
                <div className="flex items-center space-x-3">
                  <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                    serverStatus === 'running'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${
                      serverStatus === 'running' ? 'bg-green-500' : 'bg-yellow-500'
                    }`}></div>
                    <span className="font-medium">
                      {serverStatus === 'running' ? 'Online & Ready' : 'Initializing...'}
                    </span>
                  </div>
                  {serverStatus === 'running' && (
                    <div className="text-sm text-slate-500">
                      Auto-restart enabled
                    </div>
                  )}
                </div>
              </div>
              {serverStatus === 'running' && (
                <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center p-3 bg-slate-50 rounded-lg">
                    <div className="font-medium text-slate-900">Uptime</div>
                    <div className="text-slate-600">5d 12h 30m</div>
                  </div>
                  <div className="text-center p-3 bg-slate-50 rounded-lg">
                    <div className="font-medium text-slate-900">Health</div>
                    <div className="text-green-600">Excellent</div>
                  </div>
                  <div className="text-center p-3 bg-slate-50 rounded-lg">
                    <div className="font-medium text-slate-900">Load</div>
                    <div className="text-slate-600">Low</div>
                  </div>
                </div>
              )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((stat) => (
                <div key={stat.name} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <stat.icon className={`h-8 w-8 ${stat.color}`} />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-slate-600">{stat.name}</p>
                      <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Usage Tracker */}
            <UsageTracker />

            {/* Recent Calls */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
              <div className="px-6 py-4 border-b border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900">Recent Calls</h3>
              </div>
              <div className="overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Phone Number
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Duration
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        AI Response
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Time
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {recentCalls.map((call) => (
                      <tr key={call.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                          {call.number}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            call.status === 'completed' ? 'bg-green-100 text-green-800' :
                            call.status === 'active' ? 'bg-blue-100 text-blue-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {call.status === 'completed' && <CheckCircleIcon className="h-3 w-3 mr-1" />}
                            {call.status === 'active' && <PlayIcon className="h-3 w-3 mr-1" />}
                            {call.status === 'failed' && <XCircleIcon className="h-3 w-3 mr-1" />}
                            {call.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                          {call.duration}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate">
                          {call.ai_response}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                          {call.time}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Live Calls Tab */}
        {activeTab === 'calls' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Active Calls</h3>
            <div className="space-y-4">
              {recentCalls.filter(call => call.status === 'active').map((call) => (
                <div key={call.id} className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900">{call.number}</p>
                      <p className="text-sm text-slate-500">Duration: {call.duration}</p>
                      <p className="text-sm text-slate-600">{call.ai_response}</p>
                    </div>
                    <div className="flex space-x-2">
                      <button className="p-2 text-slate-400 hover:text-slate-600">
                        <PauseIcon className="h-5 w-5" />
                      </button>
                      <button className="p-2 text-red-400 hover:text-red-600">
                        <StopIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {recentCalls.filter(call => call.status === 'active').length === 0 && (
                <p className="text-slate-500 text-center py-8">No active calls</p>
              )}
            </div>
          </div>
        )}

        {/* Outbound Campaigns Tab */}
        {activeTab === 'outbound' && <OutboundCampaigns />}

        {/* Zapier Integration Tab */}
        {activeTab === 'zapier' && (
          <div className="space-y-6">
            <ZapierIntegration />
            
            {/* Agent-specific Zapier integrations */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Agent Zapier Integrations</h3>
              <p className="text-slate-600 mb-4">
                Connect your AI agents directly to Zapier workflows. These integrations allow your agents to trigger actions during calls.
              </p>
              
              {/* Agent selector */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Select Agent
                </label>
                <select 
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onChange={(e) => setSelectedAgentId(e.target.value)}
                  value={selectedAgentId}
                >
                  <option value="">Select an agent</option>
                  {agents.map(agent => (
                    <option key={agent.id} value={agent.id}>{agent.name}</option>
                  ))}
                </select>
              </div>
              
              {selectedAgentId && <ZapierIntegrationManager agentId={selectedAgentId} />}
            </div>
          </div>
        )}

        {/* Recordings Tab */}
        {activeTab === 'recordings' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Call Recordings</h3>
            <div className="space-y-4">
              {recentCalls.filter(call => call.status === 'completed').map((call) => (
                <div key={call.id} className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900">{call.number}</p>
                      <p className="text-sm text-slate-500">Duration: {call.duration} • {call.time}</p>
                      <p className="text-sm text-slate-600">{call.ai_response}</p>
                    </div>
                    <div className="flex space-x-2">
                      <button className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md text-sm hover:bg-blue-200">
                        Play
                      </button>
                      <button className="px-3 py-1 bg-slate-100 text-slate-700 rounded-md text-sm hover:bg-slate-200">
                        Download
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">AI Model Configuration</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Model
                  </label>
                  <select className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>ai-model-v2.0-live</option>
                    <option>ai-model-v2.5-standard</option>
                    <option>ai-model-pro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Voice
                  </label>
                  <select className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>Puck</option>
                    <option>Charon</option>
                    <option>Kore</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Language
                  </label>
                  <select className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>en-US (English)</option>
                    <option>es-US (Spanish)</option>
                    <option>fr-FR (French)</option>
                    <option>de-DE (German)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    AI Personality & Goals
                  </label>
                  <textarea 
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Example: You are a friendly customer service representative for ABC Company. Always be helpful, patient, and try to resolve customer issues quickly. If you can't help, offer to transfer them to a human agent."
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Phone System Configuration</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Server Port
                  </label>
                  <input 
                    type="number" 
                    defaultValue="12001"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Webhook URL
                  </label>
                  <input 
                    type="url" 
                    placeholder="https://your-domain.com/webhook"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                Save Settings
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}