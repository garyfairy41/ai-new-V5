import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  PhoneIcon, 
  UserGroupIcon,
  CheckCircleIcon,
  PlayIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  StarIcon,
  BoltIcon,
  FireIcon,
  ArrowRightIcon,
  CalendarDaysIcon,
  PauseIcon
} from '@heroicons/react/24/outline';
import { 
  PhoneIcon as PhoneIconSolid,
  CheckCircleIcon as CheckCircleIconSolid,
  ClockIcon as ClockIconSolid,
  ChartBarIcon as ChartBarIconSolid
} from '@heroicons/react/24/solid';
import { useUser, usePermissions } from '../contexts/UserContext';
import { DatabaseService } from '../services/database';
import { RealtimeService } from '../services/realtime';
import { CallLifecycleService } from '../services/call-lifecycle';
import type { CallLog } from '../types/database';
import UsageTracker from '../components/UsageTracker';
import toast from 'react-hot-toast';

// Custom analytics interface for dashboard
interface DashboardAnalytics {
  totalCallsToday: number;
  completedCalls: number;
  averageCallDuration: number;
  answerRate: number;
  totalCalls: number;
  totalMinutes: number;
  successfulCalls: number;
  successRate: number;
  totalRevenue: number;
  avgRevenuePerCall: number;
  avgCallsPerDay: number;
  avgMinutesPerCall: number;
  peakCallHour: string;
  conversionRate: number;
  customerSatisfaction: number;
  totalLeadsGenerated: number;
  appointmentsScheduled: number;
  followUpCallsNeeded: number;
  escalationsToday: number;
  activeAgents?: number;
}

export default function DashboardPage() {
  const { user } = useUser();
  const { canUseInbound } = usePermissions();
  const navigate = useNavigate();
  const [recentCalls, setRecentCalls] = useState<CallLog[]>([]);
  const [activeCalls, setActiveCalls] = useState<CallLog[]>([]);
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    if (user) {
      loadDashboardData();
      setupRealtimeSubscriptions();
      
      // Start call lifecycle automation for realistic call transitions
      CallLifecycleService.startCallLifecycleAutomation(user.id);
      console.log('🚀 Call lifecycle automation started for dashboard');
    }

    // Cleanup on unmount
    return () => {
      if (user) {
        CallLifecycleService.stopCallLifecycleAutomation(user.id);
        console.log('🛑 Call lifecycle automation stopped');
      }
    };
  }, [user]);

  // Set up periodic refresh to catch call lifecycle changes
  useEffect(() => {
    if (!user) return;

    const refreshInterval = setInterval(() => {
      loadDashboardData();
    }, 15000); // Refresh every 15 seconds to see lifecycle changes

    return () => clearInterval(refreshInterval);
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Load recent calls
      const calls = await DatabaseService.getCallLogs(user.id, 10);
      setRecentCalls(calls);

      // Load active calls
      const active = await DatabaseService.getActiveCallLogs(user.id);
      setActiveCalls(active);

      // Load analytics - calculate proper metrics
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      const todaysCalls = calls.filter(call => {
        const callDate = call.started_at || call.created_at;
        return callDate && callDate.split('T')[0] === today;
      });
      
      // Calculate proper metrics
      const completedCalls = calls.filter(call => call.status === 'completed');
      const totalDuration = completedCalls.reduce((sum, call) => sum + (call.duration_seconds || 0), 0);
      const avgDuration = completedCalls.length > 0 ? totalDuration / completedCalls.length : 0;
      
      // Update analytics with corrected data
      const correctedAnalytics: DashboardAnalytics = {
        totalCallsToday: todaysCalls.length,
        completedCalls: completedCalls.length,
        averageCallDuration: avgDuration,
        answerRate: calls.length > 0 ? (completedCalls.length / calls.length) * 100 : 0,
        totalCalls: calls.length,
        totalMinutes: Math.round(totalDuration / 60),
        successfulCalls: completedCalls.length,
        successRate: calls.length > 0 ? (completedCalls.length / calls.length) * 100 : 0,
        totalRevenue: 0, // Placeholder
        avgRevenuePerCall: 0, // Placeholder
        avgCallsPerDay: todaysCalls.length, // Simplified for today
        avgMinutesPerCall: avgDuration / 60,
        peakCallHour: '12:00 PM', // Placeholder
        conversionRate: 0, // Placeholder
        customerSatisfaction: 4.5, // Placeholder
        totalLeadsGenerated: 0, // Placeholder
        appointmentsScheduled: 0, // Placeholder
        followUpCallsNeeded: 0, // Placeholder
        escalationsToday: 0, // Placeholder
        activeAgents: active.length
      };
      
      setAnalytics(correctedAnalytics);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscriptions = () => {
    if (!user) return;

    // Subscribe to call updates (stub implementation - would refresh data)
    const callSubscription = RealtimeService.subscribeToCallUpdates(
      user.id,
      () => {
        // On update: reload dashboard data
        loadDashboardData();
      },
      () => {
        // On insert: reload dashboard data
        loadDashboardData();
      },
      () => {
        // On delete: reload dashboard data
        loadDashboardData();
      }
    );

    // Cleanup on unmount
    return () => {
      callSubscription.unsubscribe();
    };
  };



  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'abandoned':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-3 w-3 mr-1" />;
      case 'in_progress':
        return <PlayIcon className="h-3 w-3 mr-1" />;
      case 'failed':
        return <ExclamationTriangleIcon className="h-3 w-3 mr-1" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Gradient Background */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-lg p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">AI Call Center Dashboard</h1>
            <p className="text-blue-100">Monitor your calls, track performance, and manage operations</p>
          </div>
          <div className="hidden md:flex items-center space-x-4">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
              <BoltIcon className="h-8 w-8 text-yellow-300" />
            </div>
            <div className="text-right">
              <p className="text-sm text-blue-100">System Status</p>
              <p className="text-lg font-semibold text-green-300">● Online</p>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { 
            name: 'Active Calls', 
            value: activeCalls.length.toString(), 
            icon: PhoneIconSolid, 
            bgColor: 'bg-gradient-to-br from-green-400 to-green-600'
          },
          { 
            name: 'Total Calls Today', 
            value: (analytics?.totalCallsToday ?? 0).toString(), 
            icon: ChartBarIconSolid, 
            bgColor: 'bg-gradient-to-br from-blue-400 to-blue-600'
          },
          { 
            name: 'Answer Rate', 
            value: analytics?.answerRate !== undefined 
              ? `${Math.round(analytics.answerRate)}%` 
              : '0%', 
            icon: CheckCircleIconSolid, 
            bgColor: 'bg-gradient-to-br from-emerald-400 to-emerald-600'
          },
          { 
            name: 'Avg Duration', 
            value: analytics?.averageCallDuration !== undefined
              ? formatDuration(Math.round(analytics.averageCallDuration)) 
              : '0m 0s', 
            icon: ClockIconSolid, 
            bgColor: 'bg-gradient-to-br from-purple-400 to-purple-600'
          },
        ].map((stat) => (
          <div key={stat.name} className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl ${stat.bgColor} shadow-lg`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">{stat.name}</p>
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions Bar */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
          <FireIcon className="h-5 w-5 text-orange-500" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button 
            onClick={() => navigate('/campaigns')}
            className="flex items-center p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl hover:from-blue-100 hover:to-blue-200 transition-all duration-200 group"
          >
            <PhoneIcon className="h-6 w-6 text-blue-600 mr-3 group-hover:scale-110 transition-transform" />
            <div className="text-left">
              <p className="font-medium text-blue-900">Start Calling</p>
              <p className="text-sm text-blue-600">Begin campaign</p>
            </div>
          </button>
          <button 
            onClick={() => navigate('/agents')}
            className="flex items-center p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-xl hover:from-green-100 hover:to-green-200 transition-all duration-200 group"
          >
            <UserGroupIcon className="h-6 w-6 text-green-600 mr-3 group-hover:scale-110 transition-transform" />
            <div className="text-left">
              <p className="font-medium text-green-900">Manage Agents</p>
              <p className="text-sm text-green-600">Configure AI agents</p>
            </div>
          </button>
          <button 
            onClick={() => navigate('/analytics')}
            className="flex items-center p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl hover:from-purple-100 hover:to-purple-200 transition-all duration-200 group"
          >
            <ChartBarIcon className="h-6 w-6 text-purple-600 mr-3 group-hover:scale-110 transition-transform" />
            <div className="text-left">
              <p className="font-medium text-purple-900">View Analytics</p>
              <p className="text-sm text-purple-600">Performance insights</p>
            </div>
          </button>
          <button 
            onClick={() => navigate('/calls')}
            className="flex items-center p-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl hover:from-orange-100 hover:to-orange-200 transition-all duration-200 group"
          >
            <CalendarDaysIcon className="h-6 w-6 text-orange-600 mr-3 group-hover:scale-110 transition-transform" />
            <div className="text-left">
              <p className="font-medium text-orange-900">View Call History</p>
              <p className="text-sm text-orange-600">Recent calls & logs</p>
            </div>
          </button>
        </div>
      </div>

      {/* Recent Calls with Enhanced Design */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg mr-3">
                <PhoneIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Recent Calls</h3>
                <p className="text-sm text-gray-600">Latest call activity and summaries</p>
              </div>
            </div>
            <button 
              onClick={() => navigate('/calls')}
              className="flex items-center text-blue-600 hover:text-blue-800 font-medium"
            >
              View All
              <ArrowRightIcon className="h-4 w-4 ml-1" />
            </button>
          </div>
        </div>
        <div className="overflow-hidden">
          {recentCalls.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {recentCalls.slice(0, 5).map((call) => (
                <div key={call.id} className="p-6 hover:bg-gray-50 transition-colors duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`p-3 rounded-full ${getStatusColor(call.status)}`}>
                        {getStatusIcon(call.status)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          {call.direction === 'inbound' ? call.phone_number_from : call.phone_number_to}
                        </p>
                        <p className="text-sm text-gray-500 capitalize flex items-center">
                          <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                            call.direction === 'inbound' ? 'bg-green-400' : 'bg-blue-400'
                          }`} />
                          {call.direction} • {formatDuration(call.duration_seconds)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(call.status)}`}>
                          {call.status.replace('_', ' ')}
                        </span>
                        {call.sentiment_score && (
                          <div className="flex items-center">
                            <StarIcon className="h-4 w-4 text-yellow-400 mr-1" />
                            <span className="text-sm text-gray-600">{call.sentiment_score.toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{formatTimeAgo(call.started_at)}</p>
                    </div>
                  </div>
                  {call.call_summary && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-700 line-clamp-2">{call.call_summary}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="p-4 bg-gray-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <PhoneIcon className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No calls yet</h3>
              <p className="text-gray-500 mb-6">Start your AI server to begin receiving calls</p>
              <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors duration-200">
                Start AI Server
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Usage Tracker in Modern Card */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-indigo-100 rounded-lg mr-3">
              <ChartBarIcon className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Usage & Billing</h3>
              <p className="text-sm text-gray-600">Monitor your monthly usage and costs</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <UsageTracker />
        </div>
      </div>

      {/* Active Calls with Enhanced Design */}
      {canUseInbound && activeCalls.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg mr-3">
                  <PlayIcon className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Active Calls</h3>
                  <p className="text-sm text-gray-600">{activeCalls.length} calls currently in progress</p>
                </div>
              </div>
              <div className="flex items-center bg-green-100 text-green-800 px-3 py-1 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                Live
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="grid gap-4">
              {activeCalls.map((call) => (
                <div key={call.id} className="border-2 border-green-200 bg-green-50 rounded-xl p-4 hover:shadow-md transition-shadow duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-green-100 rounded-full">
                        <PhoneIcon className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{call.phone_number_from}</p>
                        <p className="text-sm text-gray-600">
                          Duration: {formatDuration(call.duration_seconds)}
                        </p>
                        {call.call_summary && (
                          <p className="text-sm text-gray-700 mt-1">{call.call_summary}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors">
                        <PauseIcon className="h-4 w-4" />
                      </button>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                        Active
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}