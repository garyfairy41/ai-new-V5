import { useState, useEffect } from 'react';
import { 
  ChartBarIcon,
  DocumentArrowDownIcon,
  PhoneIcon,
  CheckCircleIcon,
  UserGroupIcon,
  PlayIcon,
  DocumentTextIcon,
  NoSymbolIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { DatabaseService } from '../services/database';
import { GoogleSheetsExportService } from '../services/googleSheetsExport';
import { useUser } from '../contexts/UserContext';
import CallRecordingsTab from './CallRecordingsTab';
import type { Campaign, CallLog } from '../lib/supabase';
import toast from 'react-hot-toast';

interface SalesAnalyticsTabProps {
  campaigns: Campaign[];
  onRefresh: () => void;
}

interface CampaignAnalytics {
  campaign_id: string;
  campaign_name: string;
  total_calls: number;
  answered_calls: number;
  voicemail_calls: number;
  no_answer_calls: number;
  complete_data_collected: number;
  partial_data_collected: number;
  dnc_requests: number;
  avg_call_duration: number;
  answer_rate: number;
  completion_rate: number;
  data_quality_score: number;
}

export default function SalesAnalyticsTab({ campaigns, onRefresh }: SalesAnalyticsTabProps) {
  const { user } = useUser();
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('all');
  const [callAnalytics, setCallAnalytics] = useState<CallLog[]>([]);
  const [campaignAnalytics, setCampaignAnalytics] = useState<CampaignAnalytics[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'calls' | 'leads' | 'recordings'>('overview');

  useEffect(() => {
    loadAnalyticsData();
  }, [selectedCampaignId]);

  const loadAnalyticsData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Load call analytics
      const calls = selectedCampaignId === 'all' 
        ? await DatabaseService.getCallLogs(user.id, 1000, 0)
        : await DatabaseService.getCallLogsByCampaign(selectedCampaignId);
      
      setCallAnalytics(calls || []);

      // Calculate campaign analytics
      if (selectedCampaignId === 'all') {
        const analytics = calculateCampaignAnalytics(calls || [], campaigns);
        setCampaignAnalytics(analytics);
      } else {
        const campaign = campaigns.find(c => c.id === selectedCampaignId);
        if (campaign) {
          const analytics = calculateCampaignAnalytics(calls || [], [campaign]);
          setCampaignAnalytics(analytics);
        }
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const calculateCampaignAnalytics = (calls: CallLog[], campaigns: Campaign[]): CampaignAnalytics[] => {
    return campaigns.map(campaign => {
      const campaignCalls = calls.filter(call => call.campaign_id === campaign.id);
      const answeredCalls = campaignCalls.filter(call => 
        call.status === 'completed' && call.duration_seconds > 10
      );
      const voicemailCalls = campaignCalls.filter(call => 
        call.outcome === 'voicemail' || (call.status === 'completed' && call.duration_seconds <= 10)
      );
      const noAnswerCalls = campaignCalls.filter(call => 
        call.outcome === 'no_answer' || call.status === 'failed' || call.status === 'abandoned'
      );

      // Calculate data collection metrics
      const completeDataCalls = campaignCalls.filter(call => {
        const data = call.metadata?.lead_data_collected || extractLeadDataFromTranscript(call.transcript);
        if (!data) return false;
        
        const required = ['full_name', 'address', 'email', 'phone', 'dob', 'ssn', 'internet_plan', 'install_date', 'payment_info'];
        return required.every(field => data[field]);
      });

      const partialDataCalls = campaignCalls.filter(call => {
        const data = call.metadata?.lead_data_collected || extractLeadDataFromTranscript(call.transcript);
        if (!data) return false;
        
        const hasAnyData = Object.values(data).some(value => value);
        const isComplete = completeDataCalls.some(c => c.id === call.id);
        return hasAnyData && !isComplete;
      });

      const dncRequests = campaignCalls.filter(call => 
        call.metadata?.dnc_requested || 
        (call.transcript && /do not call|don't call|remove.*list/i.test(call.transcript))
      ).length;

      const avgDuration = answeredCalls.length > 0
        ? answeredCalls.reduce((sum, call) => sum + call.duration_seconds, 0) / answeredCalls.length
        : 0;

      const answerRate = campaignCalls.length > 0
        ? (answeredCalls.length / campaignCalls.length) * 100
        : 0;

      const completionRate = answeredCalls.length > 0
        ? (completeDataCalls.length / answeredCalls.length) * 100
        : 0;

      const dataQualityScore = answeredCalls.length > 0
        ? ((completeDataCalls.length * 100 + partialDataCalls.length * 50) / (answeredCalls.length * 100)) * 100
        : 0;

      return {
        campaign_id: campaign.id,
        campaign_name: campaign.name,
        total_calls: campaignCalls.length,
        answered_calls: answeredCalls.length,
        voicemail_calls: voicemailCalls.length,
        no_answer_calls: noAnswerCalls.length,
        complete_data_collected: completeDataCalls.length,
        partial_data_collected: partialDataCalls.length,
        dnc_requests: dncRequests,
        avg_call_duration: Math.round(avgDuration),
        answer_rate: Math.round(answerRate * 10) / 10,
        completion_rate: Math.round(completionRate * 10) / 10,
        data_quality_score: Math.round(dataQualityScore * 10) / 10
      };
    });
  };

  const getCallOutcomeIcon = (call: CallLog) => {
    if (call.status === 'completed' && call.duration_seconds > 10) {
      return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
    }
    if (call.outcome === 'voicemail' || (call.status === 'completed' && call.duration_seconds <= 10)) {
      return <PlayIcon className="h-5 w-5 text-yellow-500" />;
    }
    if (call.outcome === 'no_answer' || call.status === 'failed' || call.status === 'abandoned') {
      return <PhoneIcon className="h-5 w-5 text-red-500" />;
    }
    return <InformationCircleIcon className="h-5 w-5 text-gray-500" />;
  };

  const getCallOutcomeText = (call: CallLog) => {
    if (call.status === 'completed' && call.duration_seconds > 10) {
      return 'Answered';
    }
    if (call.outcome === 'voicemail' || (call.status === 'completed' && call.duration_seconds <= 10)) {
      return 'Voicemail';
    }
    if (call.outcome === 'no_answer' || call.status === 'failed' || call.status === 'abandoned') {
      return 'No Answer';
    }
    return 'Unknown';
  };

  const getDataCompletionStatus = (call: CallLog) => {
    // Check if lead data is stored in metadata or transcript
    const leadData = call.metadata?.lead_data_collected || extractLeadDataFromTranscript(call.transcript);
    if (!leadData) return { status: 'none', percentage: 0, color: 'gray' };

    const required = ['full_name', 'address', 'email', 'phone', 'dob', 'ssn', 'internet_plan', 'install_date', 'payment_info'];
    const collected = required.filter(field => leadData[field]).length;
    const percentage = (collected / required.length) * 100;

    if (percentage === 100) return { status: 'complete', percentage, color: 'green' };
    if (percentage >= 50) return { status: 'partial', percentage, color: 'yellow' };
    if (percentage > 0) return { status: 'minimal', percentage, color: 'orange' };
    return { status: 'none', percentage: 0, color: 'gray' };
  };

  const extractLeadDataFromTranscript = (transcript?: string) => {
    // For now, return null - this could be enhanced with AI parsing later
    if (!transcript) return null;
    
    // Check if transcript contains key data points (basic implementation)
    const hasName = /name.*[A-Z][a-z]+ [A-Z][a-z]+/.test(transcript);
    const hasEmail = /email.*[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(transcript);
    const hasPhone = /phone.*\d{3}[-.]?\d{3}[-.]?\d{4}/.test(transcript);
    const hasAddress = /(address|street|road|avenue|drive)/i.test(transcript);
    
    if (hasName || hasEmail || hasPhone || hasAddress) {
      return {
        full_name: hasName,
        email: hasEmail,
        phone: hasPhone,
        address: hasAddress
      };
    }
    
    return null;
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleExportToGoogleSheets = async () => {
    try {
      setLoading(true);
      await GoogleSheetsExportService.exportLeadData(
        selectedCampaignId === 'all' ? undefined : selectedCampaignId,
        'csv' // Default to CSV download
      );
      toast.success('Export completed successfully!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    } finally {
      setLoading(false);
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
      {/* Campaign Selection */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Sales Analytics Dashboard</h3>
            <p className="mt-1 text-sm text-gray-500">
              Track call outcomes, data collection, and campaign performance
            </p>
          </div>
          <div className="flex space-x-3">
            <select
              value={selectedCampaignId}
              onChange={(e) => setSelectedCampaignId(e.target.value)}
              className="block rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="all">All Campaigns</option>
              {campaigns.map(campaign => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleExportToGoogleSheets}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
              Export
            </button>
            <button
              onClick={onRefresh}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center`}
          >
            <ChartBarIcon className="h-4 w-4 mr-2" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab('calls')}
            className={`${
              activeTab === 'calls'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center`}
          >
            <PhoneIcon className="h-4 w-4 mr-2" />
            Call Details
          </button>
          <button
            onClick={() => setActiveTab('leads')}
            className={`${
              activeTab === 'leads'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center`}
          >
            <UserGroupIcon className="h-4 w-4 mr-2" />
            Lead Data
          </button>
          <button
            onClick={() => setActiveTab('recordings')}
            className={`${
              activeTab === 'recordings'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center`}
          >
            <DocumentTextIcon className="h-4 w-4 mr-2" />
            Recordings
          </button>
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {campaignAnalytics.map(analytics => (
              <div key={analytics.campaign_id} className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <PhoneIcon className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          {analytics.campaign_name}
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {analytics.total_calls} calls
                        </dd>
                      </dl>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Answer Rate</span>
                      <span className="font-medium">{analytics.answer_rate}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Data Quality</span>
                      <span className="font-medium">{analytics.data_quality_score}%</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Call Details Tab */}
      {activeTab === 'calls' && (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {callAnalytics.map(call => {
              const completionStatus = getDataCompletionStatus(call);
              return (
                <li key={call.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {getCallOutcomeIcon(call)}
                      <div className="ml-4">
                        <div className="flex items-center">
                          <p className="text-sm font-medium text-gray-900">
                            {call.phone_number_to}
                          </p>
                          {(call.metadata?.dnc_requested || (call.transcript && /do not call|don't call|remove.*list/i.test(call.transcript))) && (
                            <NoSymbolIcon className="ml-2 h-4 w-4 text-red-500" title="Do Not Call Requested" />
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
                          {getCallOutcomeText(call)} • {formatDuration(call.duration_seconds)} • {new Date(call.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          Data: {completionStatus.percentage.toFixed(0)}%
                        </p>
                        <div className="w-20 bg-gray-200 rounded-full h-1.5">
                          <div 
                            className={`bg-${completionStatus.color}-500 h-1.5 rounded-full transition-all duration-300`}
                            style={{ width: `${completionStatus.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                      {call.recording_url && (
                        <button className="text-blue-600 hover:text-blue-900 text-sm">
                          Listen
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Placeholder for other tabs */}
      {activeTab === 'leads' && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Lead Data Collection</h3>
          <p className="text-gray-500">Detailed lead data analysis coming soon...</p>
        </div>
      )}

      {activeTab === 'recordings' && selectedCampaignId !== 'all' && (
        <CallRecordingsTab campaignId={selectedCampaignId} />
      )}
    </div>
  );
}
