import { useState, useEffect, useCallback } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell
} from 'recharts';
import {
  ChartBarIcon,
  ClockIcon,
  PhoneIcon,
  CheckCircleIcon,
  CalendarDaysIcon,
  StarIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
import { useUser } from '../contexts/UserContext';
import { DatabaseService } from '../services/database';
import CampaignDashboard from '../components/CampaignDashboard';
import type { AnalyticsData, CallLog } from '../lib/supabase';
import toast from 'react-hot-toast';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function AnalyticsPage() {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'detailed'>('dashboard');

  const loadAnalytics = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Calculate date range based on selected timeRange
      let daysBack = 30;
      switch (timeRange) {
        case '7d': daysBack = 7; break;
        case '30d': daysBack = 30; break;
        case '90d': daysBack = 90; break;
        case '1y': daysBack = 365; break;
      }
      
      // Get filtered call data from database
      const calls = await DatabaseService.getCallLogsWithTimeRange(user.id, timeRange);
      
      // Calculate real analytics from actual call data
      const totalCalls = calls.length;
      const successfulCalls = calls.filter(call => call.status === 'completed').length;
      const totalDuration = calls.reduce((sum, call) => sum + (call.duration_seconds || 0), 0);
      const averageDuration = totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0;
      const successRate = totalCalls > 0 ? Math.round((successfulCalls / totalCalls) * 100) : 0;

      // Fix date formatting for consistent chart display
      const callsByDate = calls.reduce((acc: Record<string, number>, call) => {
        const date = new Date(call.created_at).toISOString().split('T')[0]; // YYYY-MM-DD format
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {});

      // Sort dates and create proper chart data
      const sortedDates = Object.keys(callsByDate).sort();
      const callVolumeData = sortedDates.map(date => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        calls: callsByDate[date],
        fullDate: date
      }));

      const callsByDayData = sortedDates.map(date => ({
        date,
        count: callsByDate[date]
      }));

      // Group calls by status for outcome chart
      const callsByStatus = calls.reduce((acc: Record<string, number>, call) => {
        const status = call.status || 'unknown';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});

      const callOutcomeData = Object.entries(callsByStatus).map(([status, count], index) => ({
        name: status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' '),
        value: count,
        color: COLORS[index % COLORS.length]
      }));

      const callsByStatusData = Object.entries(callsByStatus).map(([status, count]) => ({
        status: status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' '),
        count
      }));

      // Calculate performance trend over time
      const performanceData = calculatePerformanceTrend(calls, daysBack);

      // Calculate real appointment and sales data
      const appointmentsScheduled = calls.filter(call => 
        call.outcome?.toLowerCase().includes('appointment') || 
        call.call_summary?.toLowerCase().includes('appointment') ||
        call.tags?.some(tag => tag.toLowerCase().includes('appointment'))
      ).length;

      const salesCompleted = calls.filter(call =>
        call.outcome?.toLowerCase().includes('sale') ||
        call.outcome?.toLowerCase().includes('sold') ||
        call.call_summary?.toLowerCase().includes('sale') ||
        call.tags?.some(tag => tag.toLowerCase().includes('sale'))
      ).length;

      // Calculate actual cost per call (estimation based on duration)
      const avgCostPerMinute = 0.02; // $0.02 per minute estimate
      const costPerCall = totalCalls > 0 ? (totalDuration / 60) * avgCostPerMinute / totalCalls : 0;

      // Set real analytics data
      setAnalytics({
        totalCalls,
        successfulCalls,
        successRate,
        averageCallDuration: averageDuration,
        totalMinutes: Math.round(totalDuration / 60),
        callVolumeData,
        callOutcomeData,
        performanceData,
        topOutcomes: callOutcomeData.map(item => ({
          outcome: item.name,
          count: item.value
        })),
        appointmentsScheduled,
        salesCompleted,
        callsByDay: callsByDayData,
        callsByStatus: callsByStatusData,
        minutesUsed: Math.round(totalDuration / 60),
        minutesLimit: 10000,
        campaignStats: {
          totalCampaigns: 0, // Will be calculated when campaign system is implemented
          activeCampaigns: 0,
          totalLeads: 0,
          leadsContacted: totalCalls
        },
        avgDuration: averageDuration,
        costPerCall: parseFloat(costPerCall.toFixed(2)),
        topScripts: [] // Will be populated when script tracking is implemented
      } as AnalyticsData);
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast.error('Failed to load analytics');
      // Set empty real data on error
      setAnalytics({
        totalCalls: 0,
        successfulCalls: 0,
        successRate: 0,
        averageCallDuration: 0,
        totalMinutes: 0,
        callVolumeData: [],
        callOutcomeData: [],
        performanceData: [],
        topOutcomes: [],
        appointmentsScheduled: 0,
        salesCompleted: 0,
        callsByDay: [],
        callsByStatus: [],
        minutesUsed: 0,
        minutesLimit: 10000,
        campaignStats: {
          totalCampaigns: 0,
          activeCampaigns: 0,
          totalLeads: 0,
          leadsContacted: 0
        },
        avgDuration: 0,
        costPerCall: 0,
        topScripts: []
      } as AnalyticsData);
    } finally {
      setLoading(false);
    }
  }, [user, timeRange]);

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const calculatePerformanceTrend = (calls: CallLog[], daysBack: number) => {
    if (calls.length === 0) return [];

    const now = new Date();
    const dailyData: Record<string, { total: number; successful: number }> = {};

    // Initialize all days in range with zero data
    for (let i = 0; i < Math.min(daysBack, 14); i++) { // Limit to 14 days for readability
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateKey = date.toISOString().split('T')[0];
      dailyData[dateKey] = { total: 0, successful: 0 };
    }

    // Populate with actual call data
    calls.forEach(call => {
      const date = new Date(call.created_at).toISOString().split('T')[0];
      if (dailyData[date]) {
        dailyData[date].total++;
        if (call.status === 'completed') {
          dailyData[date].successful++;
        }
      }
    });

    // Convert to chart format and sort by date
    return Object.entries(dailyData)
      .map(([date, data]) => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        success_rate: data.total > 0 ? Math.round((data.successful / data.total) * 100) : 0,
        fullDate: date
      }))
      .sort((a, b) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime())
      .slice(-7); // Show last 7 days
  };

  useEffect(() => {
    if (user) {
      loadAnalytics();
    }
  }, [user, timeRange, loadAnalytics]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-slate-600 font-medium">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Analytics Dashboard
            </h1>
            <p className="mt-2 text-slate-600">
              Comprehensive insights into your AI call center performance
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="block w-full rounded-xl border-0 bg-white px-4 py-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-blue-600 sm:text-sm transition-all duration-200 hover:ring-slate-300"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-4">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center space-x-2
            ${activeTab === 'dashboard' ? 'bg-white shadow-md text-slate-900' : 'text-slate-500 hover:bg-slate-50'}
            `}
          >
            <ChartBarIcon className="h-5 w-5" />
            <span>Dashboard</span>
          </button>
          <button
            onClick={() => setActiveTab('detailed')}
            className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center space-x-2
            ${activeTab === 'detailed' ? 'bg-white shadow-md text-slate-900' : 'text-slate-500 hover:bg-slate-50'}
            `}
          >
            <UserGroupIcon className="h-5 w-5" />
            <span>Detailed View</span>
          </button>
        </div>

        {/* Active Tab Content */}
        {activeTab === 'dashboard' ? (
          <CampaignDashboard />
        ) : (
          <>
            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div className="bg-white overflow-hidden shadow-sm ring-1 ring-slate-200 rounded-2xl hover:shadow-md transition-all duration-200">
                <div className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                        <PhoneIcon className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <div className="ml-4 flex-1">
                      <p className="text-sm font-medium text-slate-600">Total Calls</p>
                      <p className="text-2xl font-bold text-slate-900">{analytics?.totalCalls || 0}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-slate-50 px-6 py-3">
                  <div className="text-sm text-slate-500">
                    📈 {timeRange.replace('d', ' days').replace('y', ' year')}
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow-sm ring-1 ring-slate-200 rounded-2xl hover:shadow-md transition-all duration-200">
                <div className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                        <CheckCircleIcon className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <div className="ml-4 flex-1">
                      <p className="text-sm font-medium text-slate-600">Success Rate</p>
                      <p className="text-2xl font-bold text-slate-900">{analytics?.successRate || 0}%</p>
                    </div>
                  </div>
                </div>
                <div className="bg-slate-50 px-6 py-3">
                  <div className="text-sm text-slate-500">
                    ✅ {analytics?.successfulCalls || 0} successful calls
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow-sm ring-1 ring-slate-200 rounded-2xl hover:shadow-md transition-all duration-200">
                <div className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
                        <ClockIcon className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <div className="ml-4 flex-1">
                      <p className="text-sm font-medium text-slate-600">Avg Duration</p>
                      <p className="text-2xl font-bold text-slate-900">
                        {formatDuration(analytics?.averageCallDuration || 0)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-slate-50 px-6 py-3">
                  <div className="text-sm text-slate-500">
                    ⏱️ Per call average
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow-sm ring-1 ring-slate-200 rounded-2xl hover:shadow-md transition-all duration-200">
                <div className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                        <CalendarDaysIcon className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <div className="ml-4 flex-1">
                      <p className="text-sm font-medium text-slate-600">Total Minutes</p>
                      <p className="text-2xl font-bold text-slate-900">{analytics?.totalMinutes || 0}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-slate-50 px-6 py-3">
                  <div className="text-sm text-slate-500">
                    💰 Cost: ${((analytics?.totalMinutes || 0) * 0.02).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Metrics Row - Only show if there's relevant data */}
            {(analytics?.appointmentsScheduled || 0) > 0 || (analytics?.salesCompleted || 0) > 0 ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {(analytics?.appointmentsScheduled || 0) > 0 && (
                  <div className="bg-white overflow-hidden shadow-sm ring-1 ring-slate-200 rounded-2xl hover:shadow-md transition-all duration-200">
                    <div className="p-6">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                            <CalendarDaysIcon className="h-6 w-6 text-white" />
                          </div>
                        </div>
                        <div className="ml-4 flex-1">
                          <p className="text-sm font-medium text-slate-600">Appointments</p>
                          <p className="text-2xl font-bold text-slate-900">{analytics?.appointmentsScheduled || 0}</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-slate-50 px-6 py-3">
                      <div className="text-sm text-slate-500">
                        📅 Scheduled this period
                      </div>
                    </div>
                  </div>
                )}
                
                {(analytics?.salesCompleted || 0) > 0 && (
                  <div className="bg-white overflow-hidden shadow-sm ring-1 ring-slate-200 rounded-2xl hover:shadow-md transition-all duration-200">
                    <div className="p-6">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                            <CheckCircleIcon className="h-6 w-6 text-white" />
                          </div>
                        </div>
                        <div className="ml-4 flex-1">
                          <p className="text-sm font-medium text-slate-600">Sales</p>
                          <p className="text-2xl font-bold text-slate-900">{analytics?.salesCompleted || 0}</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-slate-50 px-6 py-3">
                      <div className="text-sm text-slate-500">
                        💰 Completed this period
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="bg-white overflow-hidden shadow-sm ring-1 ring-slate-200 rounded-2xl hover:shadow-md transition-all duration-200">
                  <div className="p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-rose-600 rounded-xl flex items-center justify-center shadow-lg">
                          <ClockIcon className="h-6 w-6 text-white" />
                        </div>
                      </div>
                      <div className="ml-4 flex-1">
                        <p className="text-sm font-medium text-slate-600">Cost per Call</p>
                        <p className="text-2xl font-bold text-slate-900">${(analytics?.costPerCall || 0).toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-slate-50 px-6 py-3">
                    <div className="text-sm text-slate-500">
                      💸 Average cost estimate
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Call Volume Chart */}
              <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8 hover:shadow-xl transition-all duration-300">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Daily Call Volume</h3>
                    <p className="text-sm text-slate-500 mt-1">Track your call activity over time</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <ChartBarIcon className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                {(analytics?.callVolumeData || []).length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center mx-auto mb-4">
                      <PhoneIcon className="h-8 w-8 text-blue-600" />
                    </div>
                    <h4 className="text-lg font-semibold text-slate-900 mb-2">No Call Data Yet</h4>
                    <p className="text-slate-500 text-sm">
                      Once you start making calls, you'll see your daily call volume analytics here.
                    </p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analytics?.callVolumeData || []} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis 
                        dataKey="date" 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
                        dy={5}
                      />
                      <YAxis 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
                        dx={-5}
                        width={40}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          border: 'none',
                          borderRadius: '16px',
                          color: 'white',
                          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                          fontWeight: 500
                        }}
                        cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                      />
                      <Bar 
                        dataKey="calls" 
                        fill="url(#blueGradient)" 
                        radius={[8, 8, 0, 0]}
                        name="Calls"
                      />
                      <defs>
                        <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3B82F6" />
                          <stop offset="100%" stopColor="#1E40AF" />
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Success Rate Trend */}
              <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8 hover:shadow-xl transition-all duration-300">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Success Rate Trend</h3>
                    <p className="text-sm text-slate-500 mt-1">Performance over time</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <StarIcon className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                {(analytics?.performanceData || []).length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center mx-auto mb-4">
                      <StarIcon className="h-8 w-8 text-green-600" />
                    </div>
                    <h4 className="text-lg font-semibold text-slate-900 mb-2">No Trend Data</h4>
                    <p className="text-slate-500 text-sm">
                      Performance trends will appear here after you complete multiple calls over time.
                    </p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={analytics?.performanceData || []} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis 
                        dataKey="date" 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
                        dy={5}
                      />
                      <YAxis 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
                        dx={-5}
                        domain={[0, 100]}
                        width={40}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          border: 'none',
                          borderRadius: '16px',
                          color: 'white',
                          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                          fontWeight: 500
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="success_rate" 
                        stroke="url(#greenGradient)"
                        strokeWidth={4}
                        dot={{ fill: '#10B981', strokeWidth: 3, r: 6 }}
                        activeDot={{ r: 8, stroke: '#10B981', strokeWidth: 3 }}
                        name="Success Rate %"
                      />
                      <defs>
                        <linearGradient id="greenGradient" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#10B981" />
                          <stop offset="100%" stopColor="#059669" />
                        </linearGradient>
                      </defs>
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Call Outcomes */}
              <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8 hover:shadow-xl transition-all duration-300">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Call Outcomes</h3>
                    <p className="text-sm text-slate-500 mt-1">Distribution of call results</p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <CalendarDaysIcon className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
                {(analytics?.callOutcomeData || []).length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center mx-auto mb-4">
                      <PhoneIcon className="h-8 w-8 text-purple-600" />
                    </div>
                    <h4 className="text-lg font-semibold text-slate-900 mb-2">No Outcome Data</h4>
                    <p className="text-slate-500 text-sm">
                      Call outcome distribution will appear here after you complete some calls.
                    </p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={analytics?.callOutcomeData || []}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }: { name: string; percent: number }) => 
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                        outerRadius={120}
                        innerRadius={60}
                        fill="#8884d8"
                        dataKey="value"
                        paddingAngle={2}
                      >
                        {(analytics?.callOutcomeData || []).map((entry, index: number) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.color || COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          border: 'none',
                          borderRadius: '16px',
                          color: 'white',
                          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                          fontWeight: 500
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Recent Call Activity */}
              <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8 hover:shadow-xl transition-all duration-300">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Call Status Breakdown</h3>
                    <p className="text-sm text-slate-500 mt-1">Real-time call status distribution</p>
                  </div>
                  <div className="p-3 bg-indigo-50 rounded-lg">
                    <UserGroupIcon className="h-6 w-6 text-indigo-600" />
                  </div>
                </div>
                <div className="space-y-6">
                  {(analytics?.topOutcomes || []).length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-xl flex items-center justify-center mx-auto mb-4">
                        <ChartBarIcon className="h-8 w-8 text-indigo-600" />
                      </div>
                      <h4 className="text-lg font-semibold text-slate-900 mb-2">No Call Status Data</h4>
                      <p className="text-slate-500 text-sm">
                        Call status breakdown will appear here after you complete some calls.
                      </p>
                    </div>
                  ) : (
                    (analytics?.topOutcomes || []).map((outcome, index: number) => {
                      const maxCount = Math.max(...(analytics?.topOutcomes || []).map((o) => o.count));
                      const percentage = maxCount > 0 ? (outcome.count / maxCount) * 100 : 0;
                      
                      return (
                        <div key={index} className="relative">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-4">
                              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold ${
                                index === 0 ? 'bg-gradient-to-br from-green-500 to-green-600' :
                                index === 1 ? 'bg-gradient-to-br from-blue-500 to-blue-600' :
                                index === 2 ? 'bg-gradient-to-br from-amber-500 to-amber-600' :
                                'bg-gradient-to-br from-slate-500 to-slate-600'
                              }`}>
                                {outcome.outcome.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <h4 className="text-lg font-bold text-slate-900">{outcome.outcome}</h4>
                                <p className="text-sm text-slate-500">{outcome.count} calls</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-slate-900">{outcome.count}</p>
                              <p className="text-sm text-slate-500">{percentage.toFixed(0)}%</p>
                            </div>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-3">
                            <div 
                              className={`h-3 rounded-full transition-all duration-500 ${
                                index === 0 ? 'bg-gradient-to-r from-green-500 to-green-600' :
                                index === 1 ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
                                index === 2 ? 'bg-gradient-to-r from-amber-500 to-amber-600' :
                                'bg-gradient-to-r from-slate-500 to-slate-600'
                              }`}
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Real-time Analytics Summary */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">Analytics Summary</h3>
                  <p className="text-slate-600 mt-2">Live data from your call center operations</p>
                </div>
                <div className="flex items-center space-x-2 bg-green-100 text-green-800 px-4 py-2 rounded-full">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-semibold">Live Data</span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border border-blue-200">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <PhoneIcon className="h-8 w-8 text-white" />
                  </div>
                  <p className="text-3xl font-bold text-blue-900 mb-2">{analytics?.totalMinutes || 0}</p>
                  <p className="text-sm font-semibold text-blue-700 uppercase tracking-wider">Total Minutes</p>
                  <p className="text-xs text-blue-600 mt-1">Talk time across all calls</p>
                </div>
                
                <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-2xl border border-green-200">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <CheckCircleIcon className="h-8 w-8 text-white" />
                  </div>
                  <p className="text-3xl font-bold text-green-900 mb-2">{analytics?.successfulCalls || 0}</p>
                  <p className="text-sm font-semibold text-green-700 uppercase tracking-wider">Successful Calls</p>
                  <p className="text-xs text-green-600 mt-1">Completed successfully</p>
                </div>
                
                <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl border border-purple-200">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <CalendarDaysIcon className="h-8 w-8 text-white" />
                  </div>
                  <p className="text-3xl font-bold text-purple-900 mb-2">{analytics?.totalCalls || 0}</p>
                  <p className="text-sm font-semibold text-purple-700 uppercase tracking-wider">Total Calls</p>
                  <p className="text-xs text-purple-600 mt-1">All call attempts</p>
                </div>
                
                <div className="text-center p-6 bg-gradient-to-br from-amber-50 to-amber-100 rounded-2xl border border-amber-200">
                  <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <ClockIcon className="h-8 w-8 text-white" />
                  </div>
                  <p className="text-3xl font-bold text-amber-900 mb-2">
                    {analytics?.averageCallDuration ? formatDuration(analytics.averageCallDuration) : '0:00'}
                  </p>
                  <p className="text-sm font-semibold text-amber-700 uppercase tracking-wider">Avg Duration</p>
                  <p className="text-xs text-amber-600 mt-1">Per call average</p>
                </div>
              </div>
              
              {analytics?.totalCalls === 0 && (
                <div className="mt-8 p-6 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <PhoneIcon className="h-8 w-8 text-slate-500" />
                    </div>
                    <h4 className="text-lg font-semibold text-slate-900 mb-2">Ready to Start Tracking</h4>
                    <p className="text-slate-600 max-w-md mx-auto">
                      Your analytics dashboard is ready! Start making calls to see real-time data and insights appear here.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}