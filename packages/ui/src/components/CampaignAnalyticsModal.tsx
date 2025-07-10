import { useState, useEffect } from 'react';
import { 
  XMarkIcon,
  ChartBarIcon,
  DocumentArrowDownIcon,
  ClockIcon,
  PhoneIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  TrophyIcon,
  CalendarIcon,
  PlayIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  ShareIcon
} from '@heroicons/react/24/outline';
import { DatabaseService } from '../services/database';
import type { Campaign } from '../lib/supabase';
import toast from 'react-hot-toast';

interface CampaignAnalyticsModalProps {
  campaign: Campaign;
  onClose: () => void;
}

interface EnhancedCampaignStats {
  campaign_id: string;
  campaign_name: string;
  total_leads: number;
  calls_made: number;
  calls_completed: number;
  calls_no_answer: number;
  qualified_leads: number;
  appointments_scheduled: number;
  data_collected: number;
  success_rate: number;
  answer_rate: number;
  qualification_rate: number;
  avg_call_duration: number;
  total_talk_time: number;
}

interface CallHistoryItem {
  lead_id: string;
  phone_number: string;
  first_name: string;
  last_name: string;
  call_status: string;
  duration_seconds: number;
  recording_url?: string;
  call_time: string;
  call_summary?: string;
  outcome?: string;
  qualified: boolean;
  appointment_scheduled: boolean;
  interested?: boolean;
}

interface QualifiedLead {
  lead_id: string;
  phone_number: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  internet_speed_package: string;
  qualified: boolean;
  appointment_scheduled: boolean;
  interested: boolean;
  call_duration: number;
  recording_url?: string;
  call_summary?: string;
  synced_to_sheets: boolean;
}

export default function CampaignAnalyticsModal({
  campaign,
  onClose
}: CampaignAnalyticsModalProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'7d' | '30d' | 'all'>('30d');

  useEffect(() => {
    loadCampaignStats();
  }, [campaign.id, selectedTimeframe]);

  const loadCampaignStats = async () => {
    try {
      setLoading(true);
      const statsData = await CampaignService.getCampaignStats(campaign.id);
      // Add visual metrics data for verification  
      const enrichedStats = {
        ...statsData,
        total_calls: statsData.totalLeads,
        answered_calls: statsData.leadsAnswered,
        completion_rate: statsData.completionRate
      };
      // Set stats for dashboard verification
      const campaignStats = enrichedStats;
      setStats(campaignStats);
    } catch (error) {
      console.error('Error loading campaign stats:', error);
      toast.error('Failed to load campaign analytics');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      await CampaignService.exportCampaignResults(campaign.id, format);
      toast.success(`Campaign data exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Error exporting campaign data:', error);
      toast.error('Failed to export campaign data');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'answered': return 'text-blue-600 bg-blue-100';
      case 'no_answer': return 'text-orange-600 bg-orange-100';
      case 'busy': return 'text-purple-600 bg-purple-100';
      case 'failed': return 'text-red-600 bg-red-100';
      case 'pending': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-4 mx-auto p-6 border w-full max-w-6xl shadow-lg rounded-lg bg-white my-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Campaign Analytics</h3>
            <p className="text-sm text-gray-600 mt-1">{campaign.name}</p>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value as '7d' | '30d' | 'all')}
              className="border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="all">All time</option>
            </select>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : stats ? (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center">
                  <PhoneIcon className="h-8 w-8 text-blue-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-blue-900">Total Leads</p>
                    <p className="text-2xl font-semibold text-blue-600">{stats.totalLeads}</p>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <CheckCircleIcon className="h-8 w-8 text-green-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-900">Contacted</p>
                    <p className="text-2xl font-semibold text-green-600">{stats.leadsContacted}</p>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center">
                  <ChartBarIcon className="h-8 w-8 text-purple-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-purple-900">Answer Rate</p>
                    <p className="text-2xl font-semibold text-purple-600">{stats.answerRate.toFixed(1)}%</p>
                  </div>
                </div>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-center">
                  <ClockIcon className="h-8 w-8 text-orange-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-orange-900">Avg Duration</p>
                    <p className="text-2xl font-semibold text-orange-600">{formatDuration(stats.averageCallDuration)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Call Status Breakdown */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Call Status Breakdown</h4>
              <div className="space-y-3">
                {stats.callStatusBreakdown.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(item.status)}`}>
                        {item.status.replace('_', ' ')}
                      </span>
                      <span className="text-sm text-gray-600">{item.count} calls</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${item.percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900 w-12 text-right">
                        {item.percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Daily Activity Chart */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Daily Activity</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Calls Made
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Answered
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Completed
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Answer Rate
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {stats.dailyActivity.map((day, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(day.date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {day.callsMade}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {day.callsAnswered}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {day.callsCompleted}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {day.callsMade > 0 ? ((day.callsAnswered / day.callsMade) * 100).toFixed(1) : '0.0'}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Export Options */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Export Data</h4>
              <div className="flex space-x-4">
                <button
                  onClick={() => handleExport('csv')}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                  Export CSV
                </button>
                <button
                  onClick={() => handleExport('json')}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                  Export JSON
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No analytics data available</h3>
            <p className="mt-1 text-sm text-gray-500">
              Analytics data will appear here once the campaign has some activity.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
