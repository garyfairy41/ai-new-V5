import { useState, useEffect } from 'react';
import { 
  ChartBarIcon,
  PhoneIcon,
  UserGroupIcon,
  TrophyIcon,
  CalendarIcon,
  ClockIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { DatabaseService } from '../services/database';
import { useUser } from '../contexts/UserContext';
import EnhancedCampaignAnalyticsModal from './EnhancedCampaignAnalyticsModal';
import toast from 'react-hot-toast';

interface DashboardData {
  campaign_id: string;
  campaign_name: string;
  campaign_status: string;
  actual_leads: number;
  calls_made: number;
  calls_answered: number;
  qualified_leads: number;
  appointments_scheduled: number;
  success_rate: number;
  answer_rate: number;
  avg_call_duration: number;
  total_talk_time: number;
  last_call_time: string;
}

export default function CampaignDashboard() {
  const { user } = useUser();
  const [dashboardData, setDashboardData] = useState<DashboardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);

  useEffect(() => {
    if (user) {
      loadDashboardData();
      // Refresh data every 30 seconds
      const interval = setInterval(loadDashboardData, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      const data = await DatabaseService.getCampaignDashboard();
      setDashboardData(data);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatPercentage = (value: number) => {
    return `${value?.toFixed(1) || 0}%`;
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTrendIcon = (rate: number) => {
    if (rate >= 75) return <ArrowUpIcon className="h-4 w-4 text-green-500" />;
    if (rate >= 50) return <ArrowUpIcon className="h-4 w-4 text-yellow-500" />;
    return <ArrowDownIcon className="h-4 w-4 text-red-500" />;
  };

  const handleViewAnalytics = (campaign: DashboardData) => {
    setSelectedCampaign({
      id: campaign.campaign_id,
      name: campaign.campaign_name,
      status: campaign.campaign_status
    });
    setShowAnalyticsModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserGroupIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Leads
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {dashboardData.reduce((sum, campaign) => sum + campaign.actual_leads, 0)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <PhoneIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Calls Made
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {dashboardData.reduce((sum, campaign) => sum + campaign.calls_made, 0)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrophyIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Qualified Leads
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {dashboardData.reduce((sum, campaign) => sum + campaign.qualified_leads, 0)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CalendarIcon className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Appointments
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {dashboardData.reduce((sum, campaign) => sum + campaign.appointments_scheduled, 0)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Campaign Performance Table */}
      <div className="bg-white shadow rounded-lg border border-gray-200">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Campaign Performance</h3>
            <ChartBarIcon className="h-5 w-5 text-gray-400" />
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Campaign
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Leads
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Calls
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Answer Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Success Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Activity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dashboardData.map((campaign) => (
                  <tr key={campaign.campaign_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {campaign.campaign_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(campaign.campaign_status)}`}>
                        {campaign.campaign_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {campaign.actual_leads}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {campaign.calls_made}
                      </div>
                      <div className="text-sm text-gray-500">
                        {campaign.calls_answered} answered
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-sm text-gray-900">
                          {formatPercentage(campaign.answer_rate)}
                        </div>
                        <div className="ml-2">
                          {getTrendIcon(campaign.answer_rate)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-sm text-gray-900">
                          {formatPercentage(campaign.success_rate)}
                        </div>
                        <div className="ml-2">
                          {getTrendIcon(campaign.success_rate)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <ClockIcon className="h-4 w-4 text-gray-400 mr-1" />
                        <span className="text-sm text-gray-900">
                          {formatDuration(Math.round(campaign.avg_call_duration))}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {campaign.last_call_time 
                        ? new Date(campaign.last_call_time).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : 'No calls yet'
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleViewAnalytics(campaign)}
                        className="text-blue-600 hover:text-blue-900 flex items-center"
                      >
                        <EyeIcon className="h-4 w-4 mr-1" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {dashboardData.length === 0 && (
            <div className="text-center py-8">
              <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No campaigns yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating your first campaign.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Analytics Modal */}
      {showAnalyticsModal && selectedCampaign && (
        <EnhancedCampaignAnalyticsModal
          campaign={selectedCampaign}
          onClose={() => {
            setShowAnalyticsModal(false);
            setSelectedCampaign(null);
          }}
        />
      )}
    </div>
  );
}
