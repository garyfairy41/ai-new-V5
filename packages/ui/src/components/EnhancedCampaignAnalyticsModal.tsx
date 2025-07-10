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
  const [stats, setStats] = useState<EnhancedCampaignStats | null>(null);
  const [callHistory, setCallHistory] = useState<CallHistoryItem[]>([]);
  const [qualifiedLeads, setQualifiedLeads] = useState<QualifiedLead[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'calls' | 'qualified'>('overview');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadCampaignAnalytics();
  }, [campaign.id]);

  const loadCampaignAnalytics = async () => {
    try {
      setLoading(true);
      
      // Load enhanced analytics
      const [analyticsData, callHistoryData, qualifiedLeadsData] = await Promise.all([
        DatabaseService.getCampaignAnalytics(campaign.id),
        DatabaseService.getCallHistoryDetailed(campaign.id, 50),
        DatabaseService.getQualifiedLeadsForExport(campaign.id)
      ]);

      if (analyticsData) {
        setStats(analyticsData);
      }
      
      setCallHistory(callHistoryData);
      setQualifiedLeads(qualifiedLeadsData);
    } catch (error) {
      console.error('Error loading campaign analytics:', error);
      toast.error('Failed to load campaign analytics');
    } finally {
      setLoading(false);
    }
  };

  const handleExportToGoogleSheets = async () => {
    try {
      setExporting(true);
      const success = await DatabaseService.exportToGoogleSheets(campaign.id, qualifiedLeads);
      if (success) {
        toast.success('Data exported to Google Sheets successfully');
        // Refresh data to update sync status
        await loadCampaignAnalytics();
      } else {
        toast.error('Failed to export to Google Sheets');
      }
    } catch (error) {
      console.error('Error exporting to Google Sheets:', error);
      toast.error('Failed to export to Google Sheets');
    } finally {
      setExporting(false);
    }
  };

  const handleTriggerZapier = async () => {
    try {
      setExporting(true);
      const success = await DatabaseService.triggerZapierWebhook(campaign.id, qualifiedLeads);
      if (success) {
        toast.success('Zapier webhook triggered successfully');
        // Refresh data to update sync status
        await loadCampaignAnalytics();
      } else {
        toast.error('Failed to trigger Zapier webhook');
      }
    } catch (error) {
      console.error('Error triggering Zapier webhook:', error);
      toast.error('Failed to trigger Zapier webhook');
    } finally {
      setExporting(false);
    }
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'answered': return 'text-blue-600 bg-blue-100';
      case 'no-answer': return 'text-orange-600 bg-orange-100';
      case 'busy': return 'text-purple-600 bg-purple-100';
      case 'failed': return 'text-red-600 bg-red-100';
      case 'pending': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-6xl shadow-lg rounded-md bg-white">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-6xl shadow-lg rounded-md bg-white">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <ChartBarIcon className="h-8 w-8 text-blue-600" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{campaign.name}</h2>
              <p className="text-sm text-gray-500">Campaign Analytics</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('calls')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'calls'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Call History ({callHistory.length})
            </button>
            <button
              onClick={() => setActiveTab('qualified')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'qualified'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Qualified Leads ({qualifiedLeads.length})
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {activeTab === 'overview' && stats && (
            <>
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <UserGroupIcon className="h-8 w-8 text-blue-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-blue-600">Total Leads</p>
                      <p className="text-2xl font-bold text-blue-900">{stats.total_leads}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <PhoneIcon className="h-8 w-8 text-green-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-green-600">Calls Made</p>
                      <p className="text-2xl font-bold text-green-900">{stats.calls_made}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <TrophyIcon className="h-8 w-8 text-purple-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-purple-600">Qualified</p>
                      <p className="text-2xl font-bold text-purple-900">{stats.qualified_leads}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <CalendarIcon className="h-8 w-8 text-orange-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-orange-600">Appointments</p>
                      <p className="text-2xl font-bold text-orange-900">{stats.appointments_scheduled}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Success Rate</h4>
                  <div className="flex items-center">
                    <div className="flex-1">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(stats.success_rate, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                    <span className="ml-3 text-lg font-bold text-green-600">
                      {formatPercentage(stats.success_rate)}
                    </span>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Answer Rate</h4>
                  <div className="flex items-center">
                    <div className="flex-1">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(stats.answer_rate, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                    <span className="ml-3 text-lg font-bold text-blue-600">
                      {formatPercentage(stats.answer_rate)}
                    </span>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Qualification Rate</h4>
                  <div className="flex items-center">
                    <div className="flex-1">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(stats.qualification_rate, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                    <span className="ml-3 text-lg font-bold text-purple-600">
                      {formatPercentage(stats.qualification_rate)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Call Duration Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <ClockIcon className="h-5 w-5 text-gray-500 mr-2" />
                    <h4 className="text-lg font-medium text-gray-900">Average Call Duration</h4>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">
                    {formatDuration(Math.round(stats.avg_call_duration))}
                  </p>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <ClockIcon className="h-5 w-5 text-gray-500 mr-2" />
                    <h4 className="text-lg font-medium text-gray-900">Total Talk Time</h4>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">
                    {formatDuration(stats.total_talk_time)}
                  </p>
                </div>
              </div>
            </>
          )}

          {activeTab === 'calls' && (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Call History</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Contact
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Duration
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Outcome
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {callHistory.map((call, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {call.first_name} {call.last_name}
                              </div>
                              <div className="text-sm text-gray-500">{call.phone_number}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(call.call_status)}`}>
                              {call.call_status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDuration(call.duration_seconds)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              {call.qualified && (
                                <CheckCircleIcon className="h-4 w-4 text-green-500" title="Qualified" />
                              )}
                              {call.appointment_scheduled && (
                                <CalendarIcon className="h-4 w-4 text-blue-500" title="Appointment Scheduled" />
                              )}
                              <span className="text-sm text-gray-900">{call.outcome || 'No outcome'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(call.call_time)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              {call.recording_url && (
                                <button
                                  onClick={() => window.open(call.recording_url, '_blank')}
                                  className="text-blue-600 hover:text-blue-900"
                                  title="Play Recording"
                                >
                                  <PlayIcon className="h-4 w-4" />
                                </button>
                              )}
                              {call.call_summary && (
                                <button
                                  onClick={() => toast.success(call.call_summary)}
                                  className="text-gray-600 hover:text-gray-900"
                                  title="View Summary"
                                >
                                  <EyeIcon className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'qualified' && (
            <div className="space-y-4">
              {/* Export Actions */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="text-lg font-medium text-gray-900 mb-4">Export Qualified Leads</h4>
                <div className="flex space-x-4">
                  <button
                    onClick={handleExportToGoogleSheets}
                    disabled={exporting}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                  >
                    <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                    {exporting ? 'Exporting...' : 'Export to Google Sheets'}
                  </button>
                  <button
                    onClick={handleTriggerZapier}
                    disabled={exporting}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    <ShareIcon className="h-4 w-4 mr-2" />
                    {exporting ? 'Triggering...' : 'Trigger Zapier'}
                  </button>
                </div>
              </div>

              {/* Qualified Leads Table */}
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Qualified Leads ({qualifiedLeads.length})</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Contact
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Package Interest
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Call Duration
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Sync Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {qualifiedLeads.map((lead, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {lead.first_name} {lead.last_name}
                                </div>
                                <div className="text-sm text-gray-500">{lead.phone_number}</div>
                                <div className="text-sm text-gray-500">{lead.email}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {lead.internet_speed_package || 'Not specified'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                {lead.qualified && (
                                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                    Qualified
                                  </span>
                                )}
                                {lead.appointment_scheduled && (
                                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                    Appointment
                                  </span>
                                )}
                                {lead.interested && (
                                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                                    Interested
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatDuration(lead.call_duration)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                lead.synced_to_sheets 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {lead.synced_to_sheets ? 'Synced' : 'Not Synced'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex space-x-2">
                                {lead.recording_url && (
                                  <button
                                    onClick={() => window.open(lead.recording_url, '_blank')}
                                    className="text-blue-600 hover:text-blue-900"
                                    title="Play Recording"
                                  >
                                    <PlayIcon className="h-4 w-4" />
                                  </button>
                                )}
                                {lead.call_summary && (
                                  <button
                                    onClick={() => toast.success(lead.call_summary)}
                                    className="text-gray-600 hover:text-gray-900"
                                    title="View Summary"
                                  >
                                    <EyeIcon className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {!stats && !loading && (
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
