import React from 'react';
import { 
  PlusIcon, 
  PlayIcon, 
  PauseIcon, 
  StopIcon, 
  TrashIcon,
  EyeIcon,
  PencilIcon,
  MegaphoneIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import type { Campaign } from '../lib/supabase';

interface CampaignsTabProps {
  campaigns: Campaign[];
  dialerStatuses: { [key: string]: { dialerActive: boolean; dialerRunning: boolean } };
  loadingCampaignId: string | null;
  onStartCampaign: (campaign: Campaign) => void;
  onStopCampaign: (campaign: Campaign) => void;
  onRunAgain: (campaign: Campaign) => void;
  onViewLeads: (campaign: Campaign) => void;
  onEditCampaign: (campaign: Campaign) => void;
  onViewAnalytics: (campaign: Campaign) => void;
  onDeleteCampaign: (campaignId: string) => void;
  calculateSuccessRate: (campaign: Campaign) => number;
  formatDate: (date: string) => string;
  getStatusColor: (campaign: Campaign, totalLeads: number) => string;
  getStatusIcon: (status: string) => React.ReactNode;
  getStatusLabel: (campaign: Campaign) => string;
  onCreateCampaign: () => void;
}

export default function CampaignsTab({
  campaigns,
  dialerStatuses,
  loadingCampaignId,
  onStartCampaign,
  onStopCampaign,
  onRunAgain,
  onViewLeads,
  onEditCampaign,
  onViewAnalytics,
  onDeleteCampaign,
  calculateSuccessRate,
  formatDate,
  getStatusColor,
  getStatusIcon,
  getStatusLabel,
  onCreateCampaign
}: CampaignsTabProps) {
  return (
    <>
      {campaigns.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign) => {
            const isDialerActive = dialerStatuses[campaign.id]?.dialerActive || false;
            const isDialerRunning = dialerStatuses[campaign.id]?.dialerRunning || false;

            return (
              <div key={campaign.id} className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200">
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900 truncate">
                      {campaign.name}
                    </h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(campaign, campaign.total_leads)}`}>
                      {getStatusIcon(campaign.status)}
                      <span className="ml-1 capitalize">{getStatusLabel(campaign)}</span>
                      {dialerStatuses[campaign.id]?.dialerRunning && (
                        <span className="ml-1 h-2 w-2 bg-green-500 rounded-full animate-pulse"></span>
                      )}
                    </span>
                  </div>
                  
                  {campaign.description && (
                    <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                      {campaign.description}
                    </p>
                  )}

                  <div className="mt-4">
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>Progress</span>
                      <span>{campaign.leads_called}/{campaign.total_leads}</span>
                    </div>
                    <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                        style={{ 
                          width: campaign.total_leads > 0 
                            ? `${(campaign.leads_called / campaign.total_leads) * 100}%` 
                            : '0%' 
                        }}
                      ></div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Success Rate</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {calculateSuccessRate(campaign)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Created</p>
                      <p className="text-sm text-gray-900">{formatDate(campaign.created_at)}</p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="text-sm text-gray-500">Caller ID</p>
                    <p className="text-sm text-gray-900 font-mono">{campaign.caller_id}</p>
                  </div>
                </div>

                <div className="px-6 pb-6 space-y-3">
                  {(() => {
                    // Show pause button if dialer is running
                    if (isDialerRunning) {
                      return (
                        <button 
                          onClick={() => onStopCampaign(campaign)}
                          disabled={loadingCampaignId === campaign.id}
                          className="w-full flex items-center justify-center bg-yellow-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-colors disabled:opacity-50"
                        >
                          {loadingCampaignId === campaign.id ? (
                            <span className="inline-flex items-center">
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 818-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Pausing...
                            </span>
                          ) : (
                            <>
                              <PauseIcon className="h-4 w-4 mr-2" />
                              Pause Campaign
                            </>
                          )}
                        </button>
                      );
                    }
                    
                    // If campaign is completed, show Run Again button
                    if (campaign.status === 'completed' || campaign.leads_called >= campaign.total_leads) {
                      return (
                        <button 
                          onClick={() => onRunAgain(campaign)}
                          disabled={loadingCampaignId === campaign.id}
                          className="w-full flex items-center justify-center bg-blue-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors disabled:opacity-50"
                        >
                          {loadingCampaignId === campaign.id ? (
                            <span className="inline-flex items-center">
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 818-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Restarting...
                            </span>
                          ) : (
                            <>
                              <PlayIcon className="h-4 w-4 mr-2" />
                              Run Again
                            </>
                          )}
                        </button>
                      );
                    }
                    
                    // Otherwise show start/resume button
                    return (
                      <button 
                        onClick={() => onStartCampaign(campaign)}
                        disabled={loadingCampaignId === campaign.id}
                        className="w-full flex items-center justify-center bg-green-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors disabled:opacity-50"
                      >
                        {loadingCampaignId === campaign.id ? (
                          <span className="inline-flex items-center">
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 818-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Starting...
                          </span>
                        ) : (
                          <>
                            <PlayIcon className="h-4 w-4 mr-2" />
                            {isDialerActive && !isDialerRunning ? 'Resume Calling' : 'Start Calling'}
                          </>
                        )}
                      </button>
                    );
                  })()}

                  <div className="flex space-x-2">
                    <button 
                      onClick={() => onViewLeads(campaign)}
                      type="button"
                      className="flex-1 bg-blue-50 text-blue-700 text-sm font-medium py-2 px-3 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                    >
                      <EyeIcon className="h-4 w-4 inline mr-1" />
                      {!campaign.total_leads || campaign.total_leads === 0 ? 'Add Leads' : `Leads (${campaign.total_leads})`}
                    </button>
                    <button 
                      onClick={() => onEditCampaign(campaign)}
                      className="flex-1 bg-gray-50 text-gray-700 text-sm font-medium py-2 px-3 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                    >
                      <PencilIcon className="h-4 w-4 inline mr-1" />
                      Settings
                    </button>
                  </div>

                  <div className="flex space-x-2">
                    <button 
                      onClick={() => onViewAnalytics(campaign)}
                      className="flex-1 bg-purple-50 text-purple-700 text-sm font-medium py-2 px-3 rounded-md hover:bg-purple-100 transition-colors"
                    >
                      <ChartBarIcon className="h-4 w-4 inline mr-1" />
                      Analytics
                    </button>
                    <button 
                      onClick={() => onDeleteCampaign(campaign.id)}
                      className="flex-1 bg-red-50 text-red-700 text-sm font-medium py-2 px-3 rounded-md hover:bg-red-100 transition-colors"
                    >
                      <TrashIcon className="h-4 w-4 inline mr-1" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <MegaphoneIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No campaigns yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating your first AI calling campaign.
          </p>
          <div className="mt-6">
            <button
              type="button"
              onClick={onCreateCampaign}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
              Create Campaign
            </button>
          </div>
        </div>
      )}
    </>
  );
}
