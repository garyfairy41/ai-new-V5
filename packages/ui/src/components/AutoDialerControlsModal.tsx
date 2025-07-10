import { useState, useEffect } from 'react';
import {
  XMarkIcon,
  PlayIcon,
  PauseIcon,
  StopIcon,
  CogIcon,
  PhoneIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { AutoDialerService } from '../services/auto-dialer';
import type { Campaign } from '../lib/supabase';
import toast from 'react-hot-toast';

interface AutoDialerControlsModalProps {
  campaign: Campaign;
  onClose: () => void;
  onStatusChange: () => void;
}

interface DialerStatus {
  status: 'idle' | 'running' | 'paused' | 'stopping';
  activeCalls: number;
  callsInQueue: number;
  completedCalls: number;
  failedCalls: number;
  startedAt?: string;
  pausedAt?: string;
  settings: {
    maxConcurrentCalls: number;
    callTimeout: number;
    retryAttempts: number;
    retryDelay: number;
  };
}

export default function AutoDialerControlsModal({
  campaign,
  onClose,
  onStatusChange
}: AutoDialerControlsModalProps) {
  const [loading, setLoading] = useState(true);
  const [dialerStatus, setDialerStatus] = useState<DialerStatus | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadDialerStatus();
    const interval = setInterval(loadDialerStatus, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const loadDialerStatus = async () => {
    try {
      // Mock dialer status based on campaign status
      const mockStatus: DialerStatus = {
        status: campaign.status === 'active' ? 'running' : 'idle',
        activeCalls: campaign.status === 'active' ? Math.floor(Math.random() * 3) : 0,
        callsInQueue: campaign.total_leads - campaign.leads_called,
        completedCalls: campaign.leads_called,
        failedCalls: 0,
        startedAt: campaign.status === 'active' ? new Date().toISOString() : undefined,
        settings: {
          maxConcurrentCalls: campaign.max_concurrent_calls || 1,
          callTimeout: campaign.call_timeout_seconds || 30,
          retryAttempts: campaign.retry_attempts || 3,
          retryDelay: campaign.retry_delay_minutes || 60
        }
      };
      setDialerStatus(mockStatus);
    } catch (error) {
      console.error('Error loading dialer status:', error);
      toast.error('Failed to load dialer status');
    } finally {
      setLoading(false);
    }
  };

  const handleDialerAction = async (action: 'start' | 'pause' | 'resume' | 'stop') => {
    setActionLoading(action);
    try {
      let success = false;
      
      switch (action) {
        case 'start':
          success = await AutoDialerService.startDialer(campaign.id);
          break;
        case 'pause':
          success = await AutoDialerService.pauseDialer(campaign.id);
          break;
        case 'resume':
          success = await AutoDialerService.resumeDialer(campaign.id);
          break;
        case 'stop':
          success = await AutoDialerService.stopDialer(campaign.id);
          break;
      }

      if (success) {
        toast.success(`Dialer ${action}ed successfully`);
        await loadDialerStatus();
        onStatusChange();
      } else {
        toast.error(`Failed to ${action} dialer`);
      }
    } catch (error) {
      console.error(`Error ${action}ing dialer:`, error);
      toast.error(`Failed to ${action} dialer`);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'text-green-600 bg-green-100';
      case 'paused': return 'text-yellow-600 bg-yellow-100';
      case 'stopping': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return CheckCircleIcon;
      case 'paused': return PauseIcon;
      case 'stopping': return StopIcon;
      default: return InformationCircleIcon;
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-6 border w-full max-w-2xl shadow-lg rounded-lg bg-white">
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  const StatusIcon = dialerStatus ? getStatusIcon(dialerStatus.status) : InformationCircleIcon;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-6 border w-full max-w-2xl shadow-lg rounded-lg bg-white">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">
              Auto-Dialer Controls
            </h3>
            <p className="text-sm text-gray-600">{campaign.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {dialerStatus ? (
          <div className="space-y-6">
            {/* Status Overview */}
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-medium text-gray-900">Current Status</h4>
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(dialerStatus.status)}`}>
                  <StatusIcon className="h-4 w-4 mr-2" />
                  {dialerStatus.status.charAt(0).toUpperCase() + dialerStatus.status.slice(1)}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <PhoneIcon className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-2xl font-semibold text-gray-900">{dialerStatus.activeCalls}</p>
                  <p className="text-sm text-gray-600">Active Calls</p>
                </div>
                <div className="text-center">
                  <ClockIcon className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                  <p className="text-2xl font-semibold text-gray-900">{dialerStatus.callsInQueue}</p>
                  <p className="text-sm text-gray-600">In Queue</p>
                </div>
                <div className="text-center">
                  <CheckCircleIcon className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-semibold text-gray-900">{dialerStatus.completedCalls}</p>
                  <p className="text-sm text-gray-600">Completed</p>
                </div>
                <div className="text-center">
                  <ExclamationTriangleIcon className="h-8 w-8 text-red-600 mx-auto mb-2" />
                  <p className="text-2xl font-semibold text-gray-900">{dialerStatus.failedCalls}</p>
                  <p className="text-sm text-gray-600">Failed</p>
                </div>
              </div>
            </div>

            {/* Dialer Settings */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <CogIcon className="h-5 w-5 mr-2" />
                Current Settings
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Max Concurrent Calls</p>
                  <p className="text-lg font-semibold text-gray-900">{dialerStatus.settings.maxConcurrentCalls}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Call Timeout</p>
                  <p className="text-lg font-semibold text-gray-900">{dialerStatus.settings.callTimeout}s</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Retry Attempts</p>
                  <p className="text-lg font-semibold text-gray-900">{dialerStatus.settings.retryAttempts}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Retry Delay</p>
                  <p className="text-lg font-semibold text-gray-900">{dialerStatus.settings.retryDelay}m</p>
                </div>
              </div>
            </div>

            {/* Timing Information */}
            {(dialerStatus.startedAt || dialerStatus.pausedAt) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <InformationCircleIcon className="h-5 w-5 text-blue-400 mt-0.5" />
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-blue-800">Timing Information</h4>
                    <div className="mt-2 text-sm text-blue-700">
                      {dialerStatus.startedAt && (
                        <p>Started at: {new Date(dialerStatus.startedAt).toLocaleString()}</p>
                      )}
                      {dialerStatus.pausedAt && (
                        <p>Paused at: {new Date(dialerStatus.pausedAt).toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Control Buttons */}
            <div className="flex justify-center space-x-4">
              {dialerStatus.status === 'idle' && (
                <button
                  onClick={() => handleDialerAction('start')}
                  disabled={actionLoading === 'start'}
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading === 'start' ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  ) : (
                    <PlayIcon className="h-5 w-5 mr-2" />
                  )}
                  Start Dialer
                </button>
              )}

              {dialerStatus.status === 'running' && (
                <>
                  <button
                    onClick={() => handleDialerAction('pause')}
                    disabled={actionLoading === 'pause'}
                    className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actionLoading === 'pause' ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    ) : (
                      <PauseIcon className="h-5 w-5 mr-2" />
                    )}
                    Pause Dialer
                  </button>
                  <button
                    onClick={() => handleDialerAction('stop')}
                    disabled={actionLoading === 'stop'}
                    className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actionLoading === 'stop' ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    ) : (
                      <StopIcon className="h-5 w-5 mr-2" />
                    )}
                    Stop Dialer
                  </button>
                </>
              )}

              {dialerStatus.status === 'paused' && (
                <>
                  <button
                    onClick={() => handleDialerAction('resume')}
                    disabled={actionLoading === 'resume'}
                    className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actionLoading === 'resume' ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    ) : (
                      <PlayIcon className="h-5 w-5 mr-2" />
                    )}
                    Resume Dialer
                  </button>
                  <button
                    onClick={() => handleDialerAction('stop')}
                    disabled={actionLoading === 'stop'}
                    className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actionLoading === 'stop' ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    ) : (
                      <StopIcon className="h-5 w-5 mr-2" />
                    )}
                    Stop Dialer
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Unable to load dialer status</h3>
            <p className="mt-1 text-sm text-gray-500">
              Please check your connection and try again.
            </p>
          </div>
        )}

        <div className="flex justify-end mt-6 pt-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
