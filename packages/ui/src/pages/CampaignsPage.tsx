import { useState, useEffect } from 'react';
import { 
  PlusIcon, 
  PlayIcon, 
  PauseIcon, 
  StopIcon, 
  TrashIcon,
  EyeIcon,
  PencilIcon,
  MegaphoneIcon,
  ChartBarIcon,
  PhoneIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { useUser, usePermissions } from '../contexts/UserContext';
import { DatabaseService } from '../services/database';
import { RealtimeService } from '../services/realtime';
import { supabase } from '../lib/supabase';
import type { Campaign } from '../lib/supabase';
import toast from 'react-hot-toast';
import CampaignFormModal from '../components/CampaignFormModal';
import EnhancedCampaignAnalyticsModal from '../components/EnhancedCampaignAnalyticsModal';
import LeadListModal from '../components/LeadListModal';
import LeadManagementModal from '../components/LeadManagementModal';
import TestCallModal from '../components/TestCallModal';
import CampaignsTab from '../components/CampaignsTab';
import SalesAnalyticsTab from '../components/SalesAnalyticsTab';

function CampaignsPage() {
  const { user } = useUser();
  const { canUseOutboundDialer } = usePermissions();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Tab management
  const [activeTab, setActiveTab] = useState<'campaigns' | 'analytics'>('campaigns');
  
  // Tracking loading state for individual campaign actions
  const [loadingCampaignId, setLoadingCampaignId] = useState<string | null>(null);
  // Track dialer status for each campaign
  const [dialerStatuses, setDialerStatuses] = useState<{ [key: string]: { dialerActive: boolean; dialerRunning: boolean } }>({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLeadsModal, setShowLeadsModal] = useState(false);
  const [showAddLeadsModal, setShowAddLeadsModal] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [showTestCallModal, setShowTestCallModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  useEffect(() => {
    if (user && canUseOutboundDialer) {
      loadCampaigns();
      setupRealtimeSubscriptions();
    }
  }, [user, canUseOutboundDialer]);

  // Smart polling: Only poll when there are campaigns with active dialers
  useEffect(() => {
    const campaignIds = campaigns.map((c: any) => c.id);
    if (campaignIds.length === 0) return;

    // Initial load of dialer statuses
    loadDialerStatuses(campaignIds);

    // Only set up polling if we have campaigns with active dialers
    let interval: NodeJS.Timeout | null = null;
    
    const startPollingIfNeeded = () => {
      const hasActiveDialers = Object.values(dialerStatuses).some((status: any) => status.dialerRunning);
      
      if (hasActiveDialers && !interval) {
        console.log('🔄 Starting dialer status polling...');
        interval = setInterval(async () => {
          try {
            const currentActiveDialers = Object.values(dialerStatuses).some((status: any) => status.dialerRunning);
            
            if (currentActiveDialers) {
              console.log('🔄 Polling dialer statuses for running campaigns...');
              await loadDialerStatuses(campaignIds);
              // Also refresh campaign data less frequently
              await loadCampaigns();
            } else {
              // No active dialers, stop polling
              if (interval) {
                clearInterval(interval);
                interval = null;
                console.log('⏹️ Stopped polling - no active dialers');
              }
            }
          } catch (error) {
            console.error('Error polling dialer statuses:', error);
          }
        }, 15000); // Poll every 15 seconds (less frequent)
      } else if (!hasActiveDialers && interval) {
        clearInterval(interval);
        interval = null;
        console.log('⏹️ Stopped polling - no active dialers');
      }
    };

    // Check if we should start polling
    startPollingIfNeeded();

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [campaigns.map((c: any) => c.id).join(','), Object.values(dialerStatuses).some((s: any) => s.dialerRunning)]); // Re-run when campaign list or dialer status changes

  const loadCampaigns = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const campaignsData = await DatabaseService.getCampaigns(user.id);
      setCampaigns(campaignsData);
    } catch (error) {
      console.error('Error loading campaigns:', error);
      toast.error('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  const loadDialerStatuses = async (campaignIds: string[]) => {
    try {
      const response = await DatabaseService.getMultipleCampaignDialerStatus(campaignIds);
      const statusMap: { [key: string]: { dialerActive: boolean; dialerRunning: boolean } } = {};
      
      response.statuses.forEach(status => {
        statusMap[status.campaignId] = {
          dialerActive: status.dialerActive,
          dialerRunning: status.dialerRunning
        };
      });
      
      setDialerStatuses(statusMap);
    } catch (error) {
      console.error('Error loading dialer statuses:', error);
    }
  };

  const setupRealtimeSubscriptions = () => {
    if (!user) return;

    const subscription = RealtimeService.subscribeToCampaignUpdates(
      user.id,
      () => {
        loadCampaigns();
      },
      () => {
        loadCampaigns();
      },
      () => {
        loadCampaigns();
      }
    );

    return () => {
      if (subscription) {
        RealtimeService.unsubscribe(subscription);
      }
    };
  };

  const handleStartCampaign = async (campaign: Campaign) => {
    if (campaign.total_leads === 0) {
      toast.error('Cannot start campaign without leads. Add leads first.');
      return;
    }

    try {
      setLoadingCampaignId(campaign.id);
      console.log('🚀 Starting campaign:', campaign.name, 'ID:', campaign.id);
      
      const success = await DatabaseService.startCampaign(campaign.id);
      if (success) {
        toast.success(`Campaign "${campaign.name}" started!`);
        // Update campaign status optimistically
        setCampaigns(campaigns.map((c: any) => c.id === campaign.id ? {...c, status: 'active'} : c));
        // Update dialer status immediately
        setDialerStatuses((prev: any) => ({
          ...prev,
          [campaign.id]: { dialerActive: true, dialerRunning: true }
        }));
        // Then refresh to get actual data
        loadCampaigns();
      } else {
        toast.error('Failed to start campaign - no response from server');
      }
    } catch (error) {
      console.error('💥 Error starting campaign:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to start campaign: ${errorMessage}`);
    } finally {
      setLoadingCampaignId(null);
    }
  };

  const handlePauseCampaign = async (campaign: Campaign) => {
    try {
      setLoadingCampaignId(campaign.id);
      const success = await DatabaseService.pauseCampaign(campaign.id);
      if (success) {
        toast.success(`Campaign "${campaign.name}" paused`);
        // Update campaign status optimistically
        setCampaigns(campaigns.map((c: any) => c.id === campaign.id ? {...c, status: 'paused'} : c));
        // Update dialer status immediately
        setDialerStatuses(prev => ({
          ...prev,
          [campaign.id]: { dialerActive: true, dialerRunning: false }
        }));
        // Then refresh to get actual data
        loadCampaigns();
      } else {
        toast.error('Failed to pause campaign');
      }
    } catch (error) {
      console.error('Error pausing campaign:', error);
      toast.error('Failed to pause campaign');
    } finally {
      setLoadingCampaignId(null);
    }
  };

  // Helper function to reset campaign leads status - crafty workaround
  const resetCampaignLeadsStatus = async (campaignId: string): Promise<boolean> => {
    try {
      console.log('🔄 Resetting leads for campaign:', campaignId);
      
      // Try direct bulk update using supabase with proper auth context
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        console.error('No authenticated user found');
        return false;
      }

      // Use supabase-admin or service role approach via API
      try {
        // First approach: Try API endpoint if it exists
        const response = await fetch(`/api/campaigns/${campaignId}/reset-leads`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
          }
        });
        
        if (response.ok) {
          console.log('✅ Successfully reset leads via API');
          return true;
        } else {
          console.log('API endpoint not available, falling back to direct update');
        }
      } catch (apiError) {
        console.log('API approach failed, trying direct update');
      }

      // Second approach: Direct update with RPC function
      try {
        console.log('🔧 Attempting RPC reset_campaign_leads for campaign:', campaignId);
        const { data, error } = await supabase.rpc('reset_campaign_leads', {
          campaign_id: campaignId
        });
        
        console.log('RPC response - data:', data, 'error:', error);
        
        if (!error && data !== null) {
          console.log(`✅ Successfully reset ${data} leads via RPC function`);
          return true;
        } else {
          console.log('RPC function failed or returned null, error:', error);
        }
      } catch (rpcError) {
        console.log('RPC approach failed with exception:', rpcError);
      }

      // Third approach: Direct table update with proper permissions
      const { data: updatedLeads, error } = await supabase
        .from('campaign_leads')
        .update({ 
          status: 'pending',
          call_attempts: 0,
          outcome: null,
          updated_at: new Date().toISOString()
        })
        .eq('campaign_id', campaignId)
        .select('id');

      if (error) {
        console.error('Error in direct update:', error);
        
        // Fourth approach: Individual updates if bulk fails
        console.log('Bulk update failed, trying individual updates...');
        const { data: leads, error: fetchError } = await supabase
          .from('campaign_leads')
          .select('id')
          .eq('campaign_id', campaignId);

        if (fetchError || !leads || leads.length === 0) {
          console.error('Could not fetch leads for individual updates:', fetchError);
          return false;
        }

        console.log(`Found ${leads.length} leads to reset individually`);

        let successCount = 0;
        for (const lead of leads) {
          try {
            const { error: updateError } = await supabase
              .from('campaign_leads')
              .update({
                status: 'pending',
                call_attempts: 0,
                outcome: null,
                updated_at: new Date().toISOString()
              })
              .eq('id', lead.id)
              .eq('campaign_id', campaignId);
              
            if (!updateError) {
              successCount++;
            } else {
              console.error(`Error updating lead ${lead.id}:`, updateError);
            }
          } catch (leadError) {
            console.error(`Exception updating lead ${lead.id}:`, leadError);
          }
        }

        console.log(`Successfully reset ${successCount}/${leads.length} leads individually`);
        return successCount >= Math.floor(leads.length * 0.8);
      } else {
        console.log(`✅ Successfully reset ${updatedLeads?.length || 0} leads via bulk update`);
        return true;
      }
    } catch (error) {
      console.error('Exception resetting campaign leads:', error);
      return false;
    }
  };

  const handleRunAgain = async (campaign: Campaign) => {
    if (!confirm(`Are you sure you want to restart the campaign "${campaign.name}"? This will reset the campaign status and allow calling leads again.`)) {
      return;
    }

    try {
      setLoadingCampaignId(campaign.id);
      console.log('🔄 Restarting campaign:', campaign.name, 'ID:', campaign.id);
      
      // Step 1: Reset campaign status to draft and reset counters
      const campaignSuccess = await DatabaseService.updateCampaign(campaign.id, {
        status: 'draft',
        leads_called: 0,
        leads_completed: 0,
        leads_answered: 0,
        updated_at: new Date().toISOString()
      });

      if (!campaignSuccess) {
        toast.error('Failed to reset campaign status');
        return;
      }

      // Step 2: Reset all leads in the campaign to pending status
      const leadsSuccess = await resetCampaignLeadsStatus(campaign.id);
      
      if (leadsSuccess) {
        // Step 3: Automatically start the campaign after resetting
        console.log('🚀 Auto-starting campaign after reset...');
        const startSuccess = await DatabaseService.startCampaign(campaign.id);
        
        if (startSuccess) {
          toast.success(`Campaign "${campaign.name}" has been reset and started again!`);
          // Update campaign status optimistically to active
          setCampaigns(campaigns.map(c => 
            c.id === campaign.id 
              ? {
                  ...c, 
                  status: 'active', 
                  leads_called: 0, 
                  leads_completed: 0, 
                  leads_answered: 0
                } 
              : c
          ));
          // Update dialer status immediately
          setDialerStatuses(prev => ({
            ...prev,
            [campaign.id]: { dialerActive: true, dialerRunning: true }
          }));
        } else {
          // Reset worked but start failed - let user know it's ready to start manually
          toast.success(`Campaign "${campaign.name}" has been reset. Click Start to begin calling.`);
          // Update campaign status optimistically to draft (ready to start)
          setCampaigns(campaigns.map(c => 
            c.id === campaign.id 
              ? {
                  ...c, 
                  status: 'draft', 
                  leads_called: 0, 
                  leads_completed: 0, 
                  leads_answered: 0
                } 
              : c
          ));
        }
        
        // Refresh to get actual data
        loadCampaigns();
      } else {
        // Leads reset failed - try to start anyway (might work if leads were already pending)
        console.log('⚠️ Leads reset failed, but trying to start campaign anyway...');
        try {
          const startSuccess = await DatabaseService.startCampaign(campaign.id);
          if (startSuccess) {
            toast.success(`Campaign "${campaign.name}" started! (Note: leads may not have been fully reset)`);
            setCampaigns(campaigns.map(c => 
              c.id === campaign.id 
                ? {
                    ...c, 
                    status: 'active', 
                    leads_called: 0, 
                    leads_completed: 0, 
                    leads_answered: 0
                  } 
                : c
            ));
            setDialerStatuses(prev => ({
              ...prev,
              [campaign.id]: { dialerActive: true, dialerRunning: true }
            }));
            loadCampaigns();
          } else {
            toast.error('Failed to reset campaign leads and start campaign. Please try manually resetting leads or contact support.');
          }
        } catch (startError) {
          console.error('Failed to start campaign after leads reset failure:', startError);
          toast.error('Failed to reset campaign leads. Campaign status has been reset to draft - you can try starting it manually.');
          // At least reset the campaign status to draft so user can try again
          setCampaigns(campaigns.map(c => 
            c.id === campaign.id 
              ? {
                  ...c, 
                  status: 'draft', 
                  leads_called: 0, 
                  leads_completed: 0, 
                  leads_answered: 0
                } 
              : c
          ));
          loadCampaigns();
        }
      }
    } catch (error) {
      console.error('💥 Error restarting campaign:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to restart campaign: ${errorMessage}`);
    } finally {
      setLoadingCampaignId(null);
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm('Are you sure you want to delete this campaign? This action cannot be undone.')) {
      return;
    }

    try {
      await DatabaseService.deleteCampaign(campaignId);
      toast.success('Campaign deleted successfully');
      loadCampaigns();
    } catch (error) {
      console.error('Error deleting campaign:', error);
      toast.error('Failed to delete campaign');
    }
  };

  const handleViewLeads = async (campaign: Campaign) => {
    try {
      setSelectedCampaign(campaign);
      if (campaign.total_leads === 0) {
        // No leads - show add leads modal
        setShowAddLeadsModal(true);
      } else {
        // Has leads - show view leads modal
        setShowLeadsModal(true);
      }
    } catch (error) {
      console.error('Error loading campaign leads:', error);
      toast.error('Failed to load campaign leads');
    }
  };

  const handleEditCampaign = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setShowEditModal(true);
  };

  const handleViewAnalytics = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setShowAnalyticsModal(true);
  };

  const getStatusColor = (campaign: Campaign, totalLeads: number) => {
    if (totalLeads === 0) {
      return 'text-gray-600 bg-gray-100';
    }
    
    const dialerStatus = dialerStatuses[campaign.id];
    const isDialerRunning = dialerStatus?.dialerRunning || false;
    
    // If dialer is actually running, show green
    if (isDialerRunning) {
      return 'text-green-600 bg-green-100';
    }
    
    // If dialer is paused but still active
    if (dialerStatus?.dialerActive && !isDialerRunning) {
      return 'text-yellow-600 bg-yellow-100';
    }
    
    // Otherwise use database status
    switch (campaign.status) {
      case 'completed': return 'text-blue-600 bg-blue-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      case 'draft': return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <PlayIcon className="h-4 w-4" />;
      case 'paused': return <PauseIcon className="h-4 w-4" />;
      case 'completed': return <StopIcon className="h-4 w-4" />;
      case 'cancelled': return <StopIcon className="h-4 w-4" />;
      case 'draft': return <ClockIcon className="h-4 w-4" />;
      default: return null;
    }
  };

  const getStatusLabel = (campaign: Campaign) => {
    const totalLeads = campaign.total_leads || 0;
    
    if (totalLeads === 0) {
      return 'No Leads';
    }
    
    const dialerStatus = dialerStatuses[campaign.id];
    const isDialerRunning = dialerStatus?.dialerRunning || false;
    
    // If dialer is actually running, show as active
    if (isDialerRunning) {
      return 'Active';
    }
    
    // If dialer is paused but still active
    if (dialerStatus?.dialerActive && !isDialerRunning) {
      return 'Paused';
    }
    
    // Return appropriate status based on campaign completion
    if (campaign.status === 'completed' || campaign.leads_called >= campaign.total_leads) {
      return 'Completed';
    }
    
    // Otherwise use database status
    switch (campaign.status) {
      case 'active': return 'Active';
      case 'paused': return 'Paused';
      case 'cancelled': return 'Cancelled';
      case 'draft': return 'Draft';
      default: return (campaign.status as string)?.charAt(0).toUpperCase() + (campaign.status as string)?.slice(1) || 'Unknown';
    }
  };

  const calculateSuccessRate = (campaign: Campaign) => {
    if (!campaign.leads_called || campaign.leads_called === 0) return 0;
    return Math.round((campaign.leads_completed / campaign.leads_called) * 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (!canUseOutboundDialer) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center">
              <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-yellow-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Access Restricted</h3>
              <p className="mt-1 text-sm text-gray-500">
                You don't have permission to access the outbound dialer feature.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Campaigns</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage your outbound calling campaigns and track performance.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <nav className="flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('campaigns')}
              className={`${
                activeTab === 'campaigns'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
            >
              <MegaphoneIcon className="h-5 w-5 inline mr-2" />
              Campaigns
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`${
                activeTab === 'analytics'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
            >
              <ChartBarIcon className="h-5 w-5 inline mr-2" />
              Analytics
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'campaigns' && (
          <CampaignsTab
            campaigns={campaigns}
            dialerStatuses={dialerStatuses}
            loadingCampaignId={loadingCampaignId}
            onStartCampaign={handleStartCampaign}
            onStopCampaign={handlePauseCampaign}
            onRunAgain={handleRunAgain}
            onViewLeads={handleViewLeads}
            onEditCampaign={handleEditCampaign}
            onViewAnalytics={handleViewAnalytics}
            onDeleteCampaign={handleDeleteCampaign}
            calculateSuccessRate={calculateSuccessRate}
            formatDate={formatDate}
            getStatusColor={getStatusColor}
            getStatusIcon={getStatusIcon}
            getStatusLabel={getStatusLabel}
            onCreateCampaign={() => setShowCreateModal(true)}
          />
        )}

        {activeTab === 'analytics' && (
          <SalesAnalyticsTab />
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CampaignFormModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadCampaigns();
          }}
        />
      )}

      {showEditModal && selectedCampaign && (
        <CampaignFormModal
          campaign={selectedCampaign}
          onClose={() => {
            setShowEditModal(false);
            setSelectedCampaign(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedCampaign(null);
            loadCampaigns();
          }}
        />
      )}

      {showLeadsModal && selectedCampaign && (
        <LeadListModal
          campaignId={selectedCampaign.id}
          campaignName={selectedCampaign.name}
          onClose={() => {
            setShowLeadsModal(false);
            setSelectedCampaign(null);
          }}
          onEdit={(lead) => {
            // Handle lead editing if needed
            console.log('Edit lead:', lead);
          }}
        />
      )}

      {showAddLeadsModal && selectedCampaign && (
        <LeadManagementModal
          campaignId={selectedCampaign.id}
          campaignName={selectedCampaign.name}
          onClose={() => {
            setShowAddLeadsModal(false);
            setSelectedCampaign(null);
          }}
          onSuccess={() => {
            setShowAddLeadsModal(false);
            setSelectedCampaign(null);
            loadCampaigns();
          }}
        />
      )}

      {showAnalyticsModal && selectedCampaign && (
        <EnhancedCampaignAnalyticsModal
          isOpen={showAnalyticsModal}
          onClose={() => {
            setShowAnalyticsModal(false);
            setSelectedCampaign(null);
          }}
          campaign={selectedCampaign}
        />
      )}

      {showTestCallModal && selectedCampaign && (
        <TestCallModal
          isOpen={showTestCallModal}
          onClose={() => {
            setShowTestCallModal(false);
            setSelectedCampaign(null);
          }}
          campaign={selectedCampaign}
        />
      )}
    </div>
  );
}

export default CampaignsPage;
