import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Play, 
  Pause, 
  Square, 
  Users, 
  Phone, 
  Clock, 
  BarChart3,
  Settings,
  AlertCircle,
  CheckCircle,
  Activity,
  Zap
} from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import campaignService, { type Campaign, type CampaignStats, type AIAgent } from '../services/campaignService';
import { CampaignWizard, CampaignStatsModal, LeadsModal } from '../components/campaigns';
import TestCallModal from '../components/TestCallModal';
import toast from 'react-hot-toast';

const CampaignsPage: React.FC = () => {
  const { user: profile } = useUser();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignStats, setCampaignStats] = useState<Record<string, CampaignStats>>({});
  const [aiAgents, setAIAgents] = useState<AIAgent[]>([]);
  const [campaignLeads, setCampaignLeads] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [showLeads, setShowLeads] = useState(false);
  const [showTestCallModal, setShowTestCallModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Toast notifications for success/error messages
  useEffect(() => {
    if (success) {
      toast.success(success);
      setSuccess(null);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      setError(null);
    }
  }, [error]);

  useEffect(() => {
    if (profile?.id) {
      loadData();
      // Refresh stats every 10 seconds for active campaigns
      const interval = setInterval(loadCampaignStats, 10000);
      return () => clearInterval(interval);
    }
  }, [profile?.id]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [campaignsData, agentsData] = await Promise.all([
        campaignService.getCampaigns(profile!.id),
        campaignService.getAIAgents(profile!.id)
      ]);
      
      setCampaigns(campaignsData);
      setAIAgents(agentsData);
      
      // Load stats for each campaign
      await loadCampaignStats(campaignsData);
    } catch (error) {
      console.error('Error loading campaigns:', error);
      setError('Failed to load campaigns. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadCampaignStats = async (campaignList?: Campaign[]) => {
    try {
      const campaignsToCheck = campaignList || campaigns;
      const statsPromises = campaignsToCheck.map(async (campaign) => {
        try {
          const stats = await campaignService.getCampaignStats(campaign.id);
          return { id: campaign.id, stats };
        } catch (error) {
          console.error(`Error loading stats for campaign ${campaign.id}:`, error);
          return null;
        }
      });
      
      const statsResults = await Promise.all(statsPromises);
      const statsMap: Record<string, CampaignStats> = {};
      
      statsResults.forEach((result) => {
        if (result) {
          statsMap[result.id] = result.stats;
        }
      });
      
      setCampaignStats(statsMap);
    } catch (error) {
      console.error('Error loading campaign stats:', error);
    }
  };

  const loadLeadsForCampaign = async (campaignId: string): Promise<any[]> => {
    try {
      const leads = await campaignService.getCampaignLeads(campaignId);
      setCampaignLeads(prev => ({ ...prev, [campaignId]: leads }));
      return leads;
    } catch (error) {
      console.error('Error loading campaign leads:', error);
      return [];
    }
  };

  const handleCampaignAction = async (campaignId: string, action: 'start' | 'pause' | 'stop') => {
    try {
      setActionLoading(prev => ({ ...prev, [campaignId]: true }));
      setError(null);
      
      let result;
      switch (action) {
        case 'start':
          result = await campaignService.startCampaign(campaignId);
          break;
        case 'pause':
          result = await campaignService.pauseCampaign(campaignId);
          break;
        case 'stop':
          result = await campaignService.stopCampaign(campaignId);
          break;
      }
      
      if (result.success) {
        setSuccess(result.message);
        // Refresh data to show updated status
        await loadData();
      }
    } catch (error: any) {
      console.error(`Error ${action}ing campaign:`, error);
      setError(error.message || `Failed to ${action} campaign`);
    } finally {
      setActionLoading(prev => ({ ...prev, [campaignId]: false }));
    }
  };

  const handleShowStats = async (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    await loadLeadsForCampaign(campaign.id);
    setShowStats(true);
  };

  const handleShowLeads = async (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    await loadLeadsForCampaign(campaign.id);
    setShowLeads(true);
  };

  const handleLeadsUpdated = async () => {
    if (selectedCampaign) {
      await loadLeadsForCampaign(selectedCampaign.id);
      await loadCampaignStats(); // Refresh stats as well
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-100';
      case 'paused':
        return 'text-yellow-600 bg-yellow-100';
      case 'stopped':
        return 'text-red-600 bg-red-100';
      case 'completed':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string, isDialerActive: boolean) => {
    if (isDialerActive) {
      return <Activity className="w-4 h-4 text-green-600 animate-pulse" />;
    }
    
    switch (status) {
      case 'active':
        return <Play className="w-4 h-4 text-green-600" />;
      case 'paused':
        return <Pause className="w-4 h-4 text-yellow-600" />;
      case 'stopped':
        return <Square className="w-4 h-4 text-red-600" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-blue-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getActionButtons = (campaign: Campaign) => {
    const isLoading = actionLoading[campaign.id];
    
    if (campaign.status === 'draft') {
      return (
        <button
          onClick={() => handleCampaignAction(campaign.id, 'start')}
          disabled={isLoading}
          className="inline-flex items-center px-3 py-1 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
          ) : (
            <Play className="w-4 h-4 mr-2" />
          )}
          Start Campaign
        </button>
      );
    }
    
    if (campaign.status === 'active') {
      return (
        <div className="flex space-x-2">
          <button
            onClick={() => handleCampaignAction(campaign.id, 'pause')}
            disabled={isLoading}
            className="inline-flex items-center px-3 py-1 text-sm font-medium text-white bg-yellow-600 border border-transparent rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            ) : (
              <Pause className="w-4 h-4 mr-2" />
            )}
            Pause
          </button>
          <button
            onClick={() => handleCampaignAction(campaign.id, 'stop')}
            disabled={isLoading}
            className="inline-flex items-center px-3 py-1 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
          >
            <Square className="w-4 h-4 mr-2" />
            Stop
          </button>
        </div>
      );
    }
    
    if (campaign.status === 'paused') {
      return (
        <div className="flex space-x-2">
          <button
            onClick={() => handleCampaignAction(campaign.id, 'start')}
            disabled={isLoading}
            className="inline-flex items-center px-3 py-1 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            Resume
          </button>
          <button
            onClick={() => handleCampaignAction(campaign.id, 'stop')}
            disabled={isLoading}
            className="inline-flex items-center px-3 py-1 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
          >
            <Square className="w-4 h-4 mr-2" />
            Stop
          </button>
        </div>
      );
    }
    
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaign Management</h1>
          <p className="text-gray-600">Create and manage your outbound calling campaigns</p>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={() => setShowTestCallModal(true)}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Phone className="w-4 h-4 mr-2" />
            Test Call
          </button>
          
          <button
            onClick={() => setShowWizard(true)}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Campaign
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
              <button
                onClick={() => setError(null)}
                className="mt-2 text-sm text-red-600 hover:text-red-500"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
          <div className="flex">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <div className="ml-3">
              <p className="text-sm text-green-800">{success}</p>
              <button
                onClick={() => setSuccess(null)}
                className="mt-2 text-sm text-green-600 hover:text-green-500"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Campaigns Grid */}
      {campaigns.length === 0 ? (
        <div className="text-center py-12">
          <Phone className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No campaigns yet</h3>
          <p className="text-gray-600 mb-6">Create your first outbound calling campaign to get started.</p>
          <button
            onClick={() => setShowWizard(true)}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Campaign
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {campaigns.map((campaign) => {
            const stats = campaignStats[campaign.id];
            const agent = aiAgents.find(a => a.id === campaign.agent_id);
            
            return (
              <div key={campaign.id} className="bg-white rounded-lg shadow border hover:shadow-md transition-shadow">
                <div className="p-6">
                  {/* Campaign Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900 mb-1">{campaign.name}</h3>
                      {campaign.description && (
                        <p className="text-sm text-gray-600 mb-2">{campaign.description}</p>
                      )}
                      
                      {/* Status Badge */}
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(campaign.status)}`}>
                          {getStatusIcon(campaign.status, stats?.dialerActive || false)}
                          <span className="ml-1">{campaign.status}</span>
                          {stats?.dialerActive && <span className="ml-1">(Dialing)</span>}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Campaign Stats */}
                  {stats && (
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">{stats.stats.total}</div>
                        <div className="text-xs text-gray-600">Total Leads</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{stats.stats.completed}</div>
                        <div className="text-xs text-gray-600">Completed</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{stats.stats.calling}</div>
                        <div className="text-xs text-gray-600">In Progress</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-600">{stats.stats.pending}</div>
                        <div className="text-xs text-gray-600">Pending</div>
                      </div>
                    </div>
                  )}

                  {/* Agent Info */}
                  {agent && (
                    <div className="flex items-center text-sm text-gray-600 mb-4">
                      <Zap className="w-4 h-4 mr-1" />
                      <span>{agent.name} ({agent.voice_name})</span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between">
                    {getActionButtons(campaign)}
                    
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleShowStats(campaign)}
                        className="p-2 text-gray-400 hover:text-gray-600"
                        title="View Statistics"
                      >
                        <BarChart3 className="w-4 h-4" />
                      </button>
                      
                      <button
                        onClick={() => handleShowLeads(campaign)}
                        className="p-2 text-gray-400 hover:text-gray-600"
                        title="Manage Leads"
                      >
                        <Users className="w-4 h-4" />
                      </button>
                      
                      <button
                        onClick={() => {
                          setEditingCampaign(campaign);
                          setShowWizard(true);
                        }}
                        className="p-2 text-gray-400 hover:text-gray-600"
                        title="Edit Campaign"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {showWizard && (
        <CampaignWizard
          campaign={editingCampaign}
          agents={aiAgents}
          onClose={() => {
            setShowWizard(false);
            setEditingCampaign(null);
          }}
          onSave={async () => {
            setShowWizard(false);
            setEditingCampaign(null);
            await loadData();
          }}
        />
      )}

      {showStats && selectedCampaign && (
        <CampaignStatsModal
          campaign={selectedCampaign}
          leads={campaignLeads[selectedCampaign.id] || []}
          isOpen={showStats}
          onClose={() => {
            setShowStats(false);
            setSelectedCampaign(null);
          }}
        />
      )}

      {showLeads && selectedCampaign && (
        <LeadsModal
          campaign={selectedCampaign}
          isOpen={showLeads}
          onClose={() => {
            setShowLeads(false);
            setSelectedCampaign(null);
          }}
          onLeadsUpdated={handleLeadsUpdated}
        />
      )}

      {/* Test Call Modal */}
      {showTestCallModal && (
        <TestCallModal
          onClose={() => setShowTestCallModal(false)}
        />
      )}
    </div>
  );
};

export default CampaignsPage;
