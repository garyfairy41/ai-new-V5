import { useState, useEffect } from 'react';
import { 
  PhoneIcon, 
  PlayIcon, 
  PauseIcon, 
  StopIcon,
  ClockIcon,
  UserIcon,
  SignalIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { useUser } from '../contexts/UserContext';
import { DatabaseService } from '../services/database';
import { RealtimeService } from '../services/realtime';
import { CallLifecycleService } from '../services/call-lifecycle';
import type { AIAgent, CallLog, ActiveCall } from '../lib/supabase';
import toast from 'react-hot-toast';

interface AgentStatus extends AIAgent {
  current_calls: number
  status: 'available' | 'busy' | 'offline'
  last_call_at?: string
}

interface SystemMetrics {
  total_active_calls: number
  total_queued_calls: number
  average_wait_time: number
  system_health: 'healthy' | 'warning' | 'critical'
  uptime_percentage: number
}

export default function LiveCallsPage() {
  const { user } = useUser();
  const [activeCalls, setActiveCalls] = useState<ActiveCall[]>([]);
  const [agentStatuses, setAgentStatuses] = useState<AgentStatus[]>([]);
  const [callQueue, setCallQueue] = useState<CallLog[]>([]);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics>({
    total_active_calls: 0,
    total_queued_calls: 0,
    average_wait_time: 0,
    system_health: 'healthy',
    uptime_percentage: 99.9
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadLiveData();
      setupRealtimeSubscriptions();
      
      CallLifecycleService.startCallLifecycleAutomation(user.id);
      console.log('🚀 Call lifecycle automation started for live calls');
    }

    return () => {
      if (user) {
        CallLifecycleService.stopCallLifecycleAutomation(user.id);
        console.log('🛑 Call lifecycle automation stopped from live calls');
      }
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const refreshInterval = setInterval(() => {
      loadLiveData();
    }, 10000);

    return () => clearInterval(refreshInterval);
  }, [user]);

  const loadLiveData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      const calls = await DatabaseService.getActiveCalls(user.id);
      setActiveCalls(calls.map(call => ({
        ...call,
        agent_id: call.agent_id || 'unknown'
      })));
      
      const agents = await DatabaseService.getAgentStatuses(user.id);
      setAgentStatuses(agents.map(agent => ({
        ...agent,
        current_calls: 0,
        status: 'available' as const
      })));
      
      const queue = await DatabaseService.getCallQueue(user.id);
      const actualQueuedCalls = queue.filter(call => 
        call.status === 'pending' || call.status === 'in_progress'
      );
      setCallQueue(actualQueuedCalls);
      
      const queuedCallsWaitTimes = actualQueuedCalls.map(call => {
        const referenceTime = call.status === 'pending' ? call.created_at : (call.started_at || call.created_at);
        if (referenceTime) {
          const startTime = new Date(referenceTime).getTime();
          const now = new Date().getTime();
          const waitTime = Math.floor((now - startTime) / 1000);
          return Math.min(waitTime, 600);
        }
        return 0;
      });
      
      const avgWaitTime = queuedCallsWaitTimes.length > 0 
        ? queuedCallsWaitTimes.reduce((sum, time) => sum + time, 0) / queuedCallsWaitTimes.length 
        : 0;
      
      const metrics: SystemMetrics = {
        total_active_calls: calls.length,
        total_queued_calls: actualQueuedCalls.length,
        average_wait_time: avgWaitTime,
        system_health: (calls.length > 10 ? 'warning' : 'healthy') as 'healthy' | 'warning' | 'critical',
        uptime_percentage: 99.9
      };
      setSystemMetrics(metrics);
      
    } catch (error) {
      console.error('Error loading live data:', error);
      toast.error('Failed to load live call data');
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscriptions = () => {
    if (!user) return;

    const callSubscription = RealtimeService.subscribeToCallUpdates(
      user.id,
      () => {
        loadLiveData();
      }
    );

    const agentSubscription = RealtimeService.subscribeToAgentUpdates(
      user.id,
      () => {
        loadLiveData();
      },
      () => {
        loadLiveData();
      },
      () => {
        loadLiveData();
      }
    );

    return () => {
      if (typeof callSubscription === 'object' && callSubscription?.unsubscribe) {
        callSubscription.unsubscribe();
      }
      if (typeof agentSubscription === 'string') {
        RealtimeService.unsubscribe(agentSubscription);
      }
    };
  };

  const handleEmergencyStop = async () => {
    if (!confirm('Are you sure you want to stop ALL active calls? This action cannot be undone.')) {
      return;
    }

    try {
      await DatabaseService.emergencyStopAllCalls(user!.id);
      toast.success('All calls stopped successfully');
      loadLiveData();
    } catch (error) {
      console.error('Error stopping calls:', error);
      toast.error('Failed to stop calls');
    }
  };

  const handleToggleAgent = async (agentId: string, isActive: boolean) => {
    try {
      await DatabaseService.toggleAgent(agentId, !isActive);
      toast.success(`Agent ${!isActive ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      console.error('Error toggling agent:', error);
      toast.error('Failed to toggle agent');
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatWaitTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    return `${mins}m ${seconds % 60}s`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'text-green-600 bg-green-100';
      case 'busy': return 'text-yellow-600 bg-yellow-100';
      case 'offline': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 animate-pulse">
            <PhoneIcon className="h-10 w-10 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-slate-900 mb-2">Loading Live Call Center</h3>
          <p className="text-slate-500">Connecting to real-time monitoring...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Modern Header */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-3xl opacity-10"></div>
          <div className="relative bg-white/80 backdrop-blur-xl shadow-2xl rounded-3xl border border-white/20">
            <div className="px-8 py-8">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Live Call Center
                  </h1>
                  <p className="mt-2 text-lg text-slate-600">Real-time monitoring and control</p>
                </div>
                <div className="flex space-x-4">
                  <button
                    onClick={loadLiveData}
                    className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-2xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    <div className="flex items-center space-x-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span className="font-semibold">Refresh</span>
                    </div>
                  </button>
                  <button
                    onClick={handleEmergencyStop}
                    className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-3 rounded-2xl hover:from-red-700 hover:to-red-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    <div className="flex items-center space-x-2">
                      <StopIcon className="h-5 w-5" />
                      <span className="font-semibold">Emergency Stop</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* System Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
            <div className="relative bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
                  <PhoneIcon className="h-8 w-8 text-white" />
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Active Calls</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{systemMetrics.total_active_calls}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse mr-2"></div>
                <span className="text-sm text-green-600 font-medium">Live monitoring</span>
              </div>
            </div>
          </div>

          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
            <div className="relative bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg">
                  <ClockIcon className="h-8 w-8 text-white" />
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Queued Calls</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{systemMetrics.total_queued_calls}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <div className="w-3 h-3 bg-amber-500 rounded-full animate-pulse mr-2"></div>
                <span className="text-sm text-amber-600 font-medium">In queue</span>
              </div>
            </div>
          </div>

          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-green-600 rounded-2xl opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
            <div className="relative bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div className="p-3 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl shadow-lg">
                  <SignalIcon className="h-8 w-8 text-white" />
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Avg Wait Time</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{formatWaitTime(Math.round(systemMetrics.average_wait_time))}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse mr-2"></div>
                <span className="text-sm text-emerald-600 font-medium">Real-time</span>
              </div>
            </div>
          </div>

          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
            <div className="relative bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg">
                  <CheckCircleIcon className="h-8 w-8 text-white" />
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">System Health</p>
                  <p className={`text-2xl font-bold mt-1 ${getHealthColor(systemMetrics.system_health)}`}>
                    {systemMetrics.system_health.charAt(0).toUpperCase() + systemMetrics.system_health.slice(1)}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <div className={`w-3 h-3 rounded-full animate-pulse mr-2 ${
                  systemMetrics.system_health === 'healthy' ? 'bg-green-500' :
                  systemMetrics.system_health === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                }`}></div>
                <span className={`text-sm font-medium ${getHealthColor(systemMetrics.system_health)}`}>
                  {systemMetrics.uptime_percentage}% uptime
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Active Calls and Agent Status */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Active Calls */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-3xl opacity-5"></div>
            <div className="relative bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20">
              <div className="px-8 py-6 border-b border-slate-200/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
                      <PhoneIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900">Active Calls</h2>
                      <p className="text-sm text-slate-600">{activeCalls.length} calls in progress</p>
                    </div>
                  </div>
                  <div className="px-4 py-2 bg-blue-100 rounded-xl">
                    <span className="text-blue-700 font-bold text-lg">{activeCalls.length}</span>
                  </div>
                </div>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {activeCalls.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
                      <PhoneIcon className="h-10 w-10 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">No Active Calls</h3>
                    <p className="text-slate-500">All agents are available and ready to take calls</p>
                  </div>
                ) : (
                  activeCalls.map((call) => (
                    <div key={call.id} className="p-6 border-b border-slate-100 last:border-b-0 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="relative">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${
                              call.direction === 'inbound' 
                                ? 'bg-gradient-to-br from-blue-500 to-blue-600' 
                                : 'bg-gradient-to-br from-emerald-500 to-emerald-600'
                            }`}>
                              <PhoneIcon className="h-6 w-6 text-white" />
                            </div>
                            <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full animate-pulse ${
                              call.direction === 'inbound' ? 'bg-blue-500' : 'bg-emerald-500'
                            }`}></div>
                          </div>
                          <div>
                            <p className="text-lg font-semibold text-slate-900">
                              {call.direction === 'inbound' ? call.phone_number_from : call.phone_number_to}
                            </p>
                            <div className="flex items-center space-x-3 mt-1">
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                call.direction === 'inbound' 
                                  ? 'bg-blue-100 text-blue-700' 
                                  : 'bg-emerald-100 text-emerald-700'
                              }`}>
                                {call.direction === 'inbound' ? '📞 Inbound' : '📱 Outbound'}
                              </span>
                              <span className="text-sm text-slate-600">• {call.agent_name}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-slate-900 mb-1">
                            {formatDuration(call.duration_seconds)}
                          </div>
                          <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            call.call_quality === 'excellent' ? 'text-emerald-700 bg-emerald-100' :
                            call.call_quality === 'good' ? 'text-blue-700 bg-blue-100' :
                            call.call_quality === 'fair' ? 'text-amber-700 bg-amber-100' :
                            'text-red-700 bg-red-100'
                          }`}>
                            {call.call_quality === 'excellent' ? '⭐ Excellent' :
                             call.call_quality === 'good' ? '👍 Good' :
                             call.call_quality === 'fair' ? '⚠️ Fair' : '❌ Poor'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Agent Status */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-blue-600 rounded-3xl opacity-5"></div>
            <div className="relative bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20">
              <div className="px-8 py-6 border-b border-slate-200/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-lg">
                      <UserIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900">Agent Status</h2>
                      <p className="text-sm text-slate-600">{agentStatuses.length} agents configured</p>
                    </div>
                  </div>
                  <div className="px-4 py-2 bg-emerald-100 rounded-xl">
                    <span className="text-emerald-700 font-bold text-lg">{agentStatuses.filter(a => a.is_active).length}</span>
                  </div>
                </div>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {agentStatuses.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
                      <UserIcon className="h-10 w-10 text-emerald-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">No Agents Configured</h3>
                    <p className="text-slate-500">Set up your AI agents to start handling calls</p>
                  </div>
                ) : (
                  agentStatuses.map((agent) => (
                    <div key={agent.id} className="p-6 border-b border-slate-100 last:border-b-0 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-blue-50 transition-all duration-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="relative">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${
                              agent.is_active 
                                ? 'bg-gradient-to-br from-emerald-500 to-emerald-600' 
                                : 'bg-gradient-to-br from-slate-400 to-slate-500'
                            }`}>
                              <UserIcon className="h-6 w-6 text-white" />
                            </div>
                            <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full ${
                              agent.is_active ? 'bg-green-500 animate-pulse' : 'bg-slate-400'
                            }`}></div>
                          </div>
                          <div>
                            <p className="text-lg font-semibold text-slate-900">{agent.name}</p>
                            <div className="flex items-center space-x-3 mt-1">
                              <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                                🤖 {agent.agent_type}
                              </span>
                              <span className="text-sm text-slate-600">• {agent.voice_name}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <div className={`px-3 py-1 rounded-full text-xs font-semibold mb-2 ${getStatusColor(agent.status)}`}>
                              {agent.status === 'available' ? '🟢 Available' :
                               agent.status === 'busy' ? '🟡 Busy' : '🔴 Offline'}
                            </div>
                            <p className="text-sm text-slate-600">
                              {agent.current_calls}/{agent.max_concurrent_calls} calls
                            </p>
                          </div>
                          <button
                            onClick={() => handleToggleAgent(agent.id, agent.is_active)}
                            className={`p-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 ${
                              agent.is_active 
                                ? 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700' 
                                : 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700'
                            }`}
                          >
                            {agent.is_active ? <PauseIcon className="h-5 w-5" /> : <PlayIcon className="h-5 w-5" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Call Queue */}
        {callQueue.length > 0 && (
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-orange-600 rounded-3xl opacity-5"></div>
            <div className="relative bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20">
              <div className="px-8 py-6 border-b border-slate-200/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg">
                      <ClockIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900">Call Queue</h2>
                      <p className="text-sm text-slate-600">{callQueue.length} calls waiting</p>
                    </div>
                  </div>
                  <div className="px-4 py-2 bg-amber-100 rounded-xl">
                    <span className="text-amber-700 font-bold text-lg">{callQueue.length}</span>
                  </div>
                </div>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {callQueue.map((queueItem) => (
                  <div key={queueItem.id} className="p-6 border-b border-slate-100 last:border-b-0 hover:bg-gradient-to-r hover:from-amber-50 hover:to-orange-50 transition-all duration-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="relative">
                          <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
                            <ClockIcon className="h-6 w-6 text-white" />
                          </div>
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full animate-pulse"></div>
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-slate-900">
                            {queueItem.direction === 'inbound' 
                              ? `📞 From: ${queueItem.phone_number_from}` 
                              : `📱 To: ${queueItem.phone_number_to}`}
                          </p>
                          <p className="text-sm text-slate-600 mt-1">
                            {queueItem.call_summary || queueItem.outcome || 'Waiting for available agent...'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className={`px-3 py-1 rounded-full text-xs font-semibold mb-2 ${getStatusColor(queueItem.status)}`}>
                            {queueItem.status === 'pending' ? '⏳ Waiting' : 
                             queueItem.status === 'in_progress' ? '▶️ Processing' : queueItem.status}
                          </div>
                          <div className="text-xl font-bold text-slate-900">
                            {(() => {
                              const referenceTime = queueItem.status === 'pending' ? queueItem.created_at : (queueItem.started_at || queueItem.created_at);
                              if (referenceTime) {
                                const waitTimeMs = new Date().getTime() - new Date(referenceTime).getTime();
                                const waitTimeSeconds = Math.floor(waitTimeMs / 1000);
                                return formatWaitTime(Math.min(waitTimeSeconds, 600));
                              }
                              return '0s';
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
