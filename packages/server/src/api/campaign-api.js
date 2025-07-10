/**
 * Campaign API Module
 * Handles all campaign-related endpoints and auto-dialer i      const { data, error } = await supabase
        .from('campaigns')
        .insert(campaignData)
        .select()
        .single();ation
 * Import this into server.js to add campaign functionality without modifying the main file
 */

import { AutoDialerEngine } from '../services/auto-dialer-engine.js';
import { createObjectCsvWriter } from 'csv-writer';

// Global storage for active dialer instances
const activeDialers = new Map(); // campaignId -> dialerInstance

/**
 * Setup campaign API routes
 * @param {Express} app - Express app instance
 * @param {SupabaseClient} supabase - Supabase client instance
 */
export function setupCampaignAPI(app, supabase) {
  
  // ==========================================
  // CAMPAIGN CRUD ENDPOINTS
  // ==========================================
  
  // Get all campaigns for a profile
  app.get('/api/campaigns', async (req, res) => {
    try {
      const { profile_id } = req.query;
      if (!profile_id) {
        return res.status(400).json({ error: 'Profile ID is required' });
      }
      
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('profile_id', profile_id)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching campaigns:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        return res.status(500).json({ error: 'Failed to fetch campaigns', details: error.message });
      }
      
      res.json(data || []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      res.status(500).json({ error: 'Failed to fetch campaigns' });
    }
  });

  // Get single campaign
  app.get('/api/campaigns/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error || !data) {
        return res.status(404).json({ error: 'Campaign not found' });
      }
      
      res.json(data);
    } catch (error) {
      console.error('Error fetching campaign:', error);
      res.status(500).json({ error: 'Failed to fetch campaign' });
    }
  });

  // Create a new campaign
  app.post('/api/campaigns', async (req, res) => {
    try {
      const campaignData = req.body;
      
      if (!campaignData.profile_id || !campaignData.name) {
        return res.status(400).json({ error: 'Profile ID and campaign name are required' });
      }
      
      const campaign = {
        ...campaignData,
        status: 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const { data, error } = await supabase
        .from('campaigns')
        .insert(campaign)
        .select()
        .single();
      
      if (error) {
        console.error('Error creating campaign:', error);
        return res.status(500).json({ error: 'Failed to create campaign' });
      }
      
      console.log(`✅ Campaign created: ${data.name} (ID: ${data.id})`);
      res.status(201).json(data);
    } catch (error) {
      console.error('Error creating campaign:', error);
      res.status(500).json({ error: 'Failed to create campaign' });
    }
  });

  // Update an existing campaign
  app.put('/api/campaigns/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const updates = {
        ...req.body,
        updated_at: new Date().toISOString()
      };
      
      const { data, error } = await supabase
        .from('campaigns')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating campaign:', error);
        return res.status(500).json({ error: 'Failed to update campaign' });
      }
      
      console.log(`✅ Campaign updated: ${data.name} (ID: ${id})`);
      res.json(data);
    } catch (error) {
      console.error('Error updating campaign:', error);
      res.status(500).json({ error: 'Failed to update campaign' });
    }
  });

  // Delete a campaign
  app.delete('/api/campaigns/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      // Stop auto-dialer if running
      if (activeDialers.has(id)) {
        try {
          const dialer = activeDialers.get(id);
          await dialer.stop();
          activeDialers.delete(id);
          console.log(`🛑 Auto-dialer stopped before deleting campaign ${id}`);
        } catch (dialerError) {
          console.error('Error stopping auto-dialer before deletion:', dialerError);
        }
      }
      
      // Delete campaign leads first
      await supabase
        .from('campaign_leads')
        .delete()
        .eq('campaign_id', id);
      
      // Delete the campaign
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Error deleting campaign:', error);
        return res.status(500).json({ error: 'Failed to delete campaign' });
      }
      
      console.log(`🗑️ Campaign deleted: ${id}`);
      res.json({ success: true, message: 'Campaign deleted successfully' });
    } catch (error) {
      console.error('Error deleting campaign:', error);
      res.status(500).json({ error: 'Failed to delete campaign' });
    }
  });

  // ==========================================
  // AUTO-DIALER CONTROL ENDPOINTS
  // ==========================================

  // Start a campaign and its auto-dialer
  app.post('/api/campaigns/:id/start', async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get campaign data
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', id)
        .single();
      
      if (campaignError || !campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }
      
      // Check if campaign has leads
      const { data: leads, error: leadsError } = await supabase
        .from('campaign_leads')
        .select('id')
        .eq('campaign_id', id)
        .eq('status', 'pending')
        .limit(1);
      
      if (leadsError) {
        return res.status(500).json({ error: 'Failed to check campaign leads' });
      }
      
      if (!leads || leads.length === 0) {
        return res.status(400).json({ error: 'Campaign has no pending leads to call' });
      }
      
      // Check if auto-dialer is already running
      if (activeDialers.has(id)) {
        return res.status(400).json({ error: 'Campaign auto-dialer is already running' });
      }
      
      // Start auto-dialer
      try {
        const dialer = new AutoDialerEngine({
          campaignId: id,
          supabase: supabase,
          twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
          twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
          webhookUrl: process.env.WEBHOOK_URL,
          websocketUrl: process.env.WEBSOCKET_URL
        });
        
        await dialer.start();
        activeDialers.set(id, dialer);
        
        // Update campaign status
        await supabase
          .from('campaigns')
          .update({ 
            status: 'active',
            started_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', id);
        
        console.log(`🚀 Campaign started: ${campaign.name} (ID: ${id})`);
        res.json({ 
          success: true, 
          message: 'Campaign started successfully',
          campaignId: id,
          status: 'active'
        });
        
      } catch (error) {
        console.error('Error starting auto-dialer:', error);
        return res.status(500).json({ error: 'Failed to start auto-dialer: ' + error.message });
      }
      
    } catch (error) {
      console.error('Error starting campaign:', error);
      res.status(500).json({ error: 'Failed to start campaign' });
    }
  });

  // Pause a campaign
  app.post('/api/campaigns/:id/pause', async (req, res) => {
    try {
      const { id } = req.params;
      
      if (!activeDialers.has(id)) {
        return res.status(400).json({ error: 'Campaign auto-dialer is not running' });
      }
      
      const dialer = activeDialers.get(id);
      await dialer.pause();
      
      await supabase
        .from('campaigns')
        .update({ 
          status: 'paused',
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      
      console.log(`⏸️ Campaign paused: ${id}`);
      res.json({ 
        success: true, 
        message: 'Campaign paused successfully',
        campaignId: id,
        status: 'paused'
      });
      
    } catch (error) {
      console.error('Error pausing campaign:', error);
      res.status(500).json({ error: 'Failed to pause campaign' });
    }
  });

  // Stop a campaign
  app.post('/api/campaigns/:id/stop', async (req, res) => {
    try {
      const { id } = req.params;
      
      if (!activeDialers.has(id)) {
        return res.status(400).json({ error: 'Campaign auto-dialer is not running' });
      }
      
      const dialer = activeDialers.get(id);
      await dialer.stop();
      activeDialers.delete(id);
      
      await supabase
        .from('campaigns')
        .update({ 
          status: 'stopped',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      
      console.log(`🛑 Campaign stopped: ${id}`);
      res.json({ 
        success: true, 
        message: 'Campaign stopped successfully',
        campaignId: id,
        status: 'stopped'
      });
      
    } catch (error) {
      console.error('Error stopping campaign:', error);
      res.status(500).json({ error: 'Failed to stop campaign' });
    }
  });

  // Get campaign status and statistics
  app.get('/api/campaigns/:id/stats', async (req, res) => {
    try {
      const { id } = req.params;
      
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', id)
        .single();
      
      if (campaignError || !campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }
      
      // Get lead statistics
      const { data: leadStats, error: statsError } = await supabase
        .from('campaign_leads')
        .select('status')
        .eq('campaign_id', id);
      
      if (statsError) {
        return res.status(500).json({ error: 'Failed to fetch lead statistics' });
      }
      
      const stats = {
        total: leadStats.length,
        pending: leadStats.filter(l => l.status === 'pending').length,
        calling: leadStats.filter(l => l.status === 'calling').length,
        called: leadStats.filter(l => l.status === 'called').length,
        completed: leadStats.filter(l => l.status === 'completed').length,
        failed: leadStats.filter(l => l.status === 'failed').length
      };
      
      const isDialerActive = activeDialers.has(id);
      
      res.json({
        campaignId: id,
        name: campaign.name,
        status: campaign.status,
        dialerActive: isDialerActive,
        stats: stats,
        created_at: campaign.created_at,
        started_at: campaign.started_at,
        completed_at: campaign.completed_at,
        updated_at: campaign.updated_at
      });
      
    } catch (error) {
      console.error('Error fetching campaign stats:', error);
      res.status(500).json({ error: 'Failed to fetch campaign statistics' });
    }
  });

  // Get real-time campaign dialer status
  app.get('/api/campaigns/:id/dialer-status', async (req, res) => {
    try {
      const { id } = req.params;
      
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .select('id, name, status')
        .eq('id', id)
        .single();
      
      if (campaignError || !campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }
      
      const isDialerActive = activeDialers.has(id);
      const dialer = activeDialers.get(id);
      
      res.json({
        campaignId: id,
        name: campaign.name,
        databaseStatus: campaign.status,
        dialerActive: isDialerActive,
        dialerRunning: isDialerActive && dialer && dialer.isRunning(),
        lastUpdated: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error checking dialer status:', error);
      res.status(500).json({ error: 'Failed to check dialer status' });
    }
  });

  // Get dialer status for multiple campaigns
  app.post('/api/campaigns/dialer-status', async (req, res) => {
    try {
      const { campaignIds } = req.body;
      
      if (!Array.isArray(campaignIds)) {
        return res.status(400).json({ error: 'Campaign IDs must be an array' });
      }
      
      const statuses = campaignIds.map(id => ({
        campaignId: id,
        dialerActive: activeDialers.has(id),
        dialerRunning: activeDialers.has(id) && activeDialers.get(id) && activeDialers.get(id).isRunning()
      }));
      
      res.json({ statuses, lastUpdated: new Date().toISOString() });
      
    } catch (error) {
      console.error('Error checking multiple dialer statuses:', error);
      res.status(500).json({ error: 'Failed to check dialer statuses' });
    }
  });

  // ==========================================
  // LEAD MANAGEMENT ENDPOINTS
  // ==========================================

  // Get leads for a campaign
  app.get('/api/campaigns/:id/leads', async (req, res) => {
    try {
      const { id } = req.params;
      const { page = 1, limit = 50, status } = req.query;
      
      const offset = (page - 1) * limit;
      
      let query = supabase
        .from('campaign_leads')
        .select('*')
        .eq('campaign_id', id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      
      if (status) {
        query = query.eq('status', status);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching leads:', error);
        return res.status(500).json({ error: 'Failed to fetch leads' });
      }
      
      // Get total count
      let countQuery = supabase
        .from('campaign_leads')
        .select('id', { count: 'exact' })
        .eq('campaign_id', id);
      
      if (status) {
        countQuery = countQuery.eq('status', status);
      }
      
      const { count } = await countQuery;
      
      res.json({
        leads: data || [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        }
      });
      
    } catch (error) {
      console.error('Error fetching leads:', error);
      res.status(500).json({ error: 'Failed to fetch leads' });
    }
  });  // Add leads to a campaign
  app.post('/api/campaigns/:id/leads', async (req, res) => {
    try {
      const { id } = req.params;
      const { leads } = req.body;
      
      console.log('🎯 POST /api/campaigns/:id/leads called');
      console.log('📝 Campaign ID:', id);
      console.log('📝 Request body:', JSON.stringify(req.body, null, 2));
      console.log('📝 Leads data:', JSON.stringify(leads, null, 2));
      
      if (!leads || !Array.isArray(leads) || leads.length === 0) {
        console.log('❌ No leads data provided');
        return res.status(400).json({ error: 'No leads data provided' });
      }
      
      const validLeads = leads.map(lead => ({
        campaign_id: id,
        ...lead,
        status: 'pending',
        call_attempts: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
      
      console.log('📤 Final leads to insert:', JSON.stringify(validLeads, null, 2));

      const { data, error } = await supabase
        .from('campaign_leads')
        .insert(validLeads)
        .select();

      if (error) {
        console.error('❌ Supabase error adding leads:', error);
        console.error('❌ Error details:', JSON.stringify(error, null, 2));
        return res.status(500).json({ error: 'Failed to add leads', details: error.message, supabaseError: error });
      }

      console.log('✅ Successfully added leads:', data);
      console.log(`📥 Added ${data.length} leads to campaign ${id}`);
      
      // 🔄 UPDATE THE CAMPAIGN TOTAL_LEADS COUNT
      console.log('🔄 Updating campaign total_leads count...');
      
      // First get current count
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .select('total_leads')
        .eq('id', id)
        .single();
        
      if (campaignError) {
        console.error('⚠️ Failed to get campaign for count update:', campaignError);
      } else {
        const newCount = (campaign.total_leads || 0) + data.length;
        const { error: updateError } = await supabase
          .from('campaigns')
          .update({ 
            total_leads: newCount,
            updated_at: new Date().toISOString()
          })
          .eq('id', id);
          
        if (updateError) {
          console.error('⚠️ Failed to update campaign lead count:', updateError);
        } else {
          console.log(`✅ Updated campaign ${id} total_leads: ${campaign.total_leads} → ${newCount}`);
        }
      }
      
      res.status(201).json({
        success: true,
        message: `Added ${data.length} leads successfully`,
        leads: data
      });
      
    } catch (error) {
      console.error('💥 Exception in add leads endpoint:', error);
      console.error('💥 Error stack:', error.stack);
      res.status(500).json({ error: 'Failed to add leads', exception: error.message });
    }
  });

  // Update a campaign lead
  app.put('/api/campaigns/:campaignId/leads/:leadId', async (req, res) => {
    try {
      const { campaignId, leadId } = req.params;
      const updates = {
        ...req.body,
        updated_at: new Date().toISOString()
      };
      
      const { data, error } = await supabase
        .from('campaign_leads')
        .update(updates)
        .eq('id', leadId)
        .eq('campaign_id', campaignId)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating lead:', error);
        return res.status(500).json({ error: 'Failed to update lead' });
      }
      
      res.json(data);
      
    } catch (error) {
      console.error('Error updating lead:', error);
      res.status(500).json({ error: 'Failed to update lead' });
    }
  });

  // Export leads to CSV
  app.get('/api/campaigns/:id/export', async (req, res) => {
    try {
      const { id } = req.params;
      const { format = 'csv' } = req.query;
      
      const { data: leads, error } = await supabase
        .from('campaign_leads')
        .select('*')
        .eq('campaign_id', id)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error fetching leads for export:', error);
        return res.status(500).json({ error: 'Failed to fetch leads' });
      }
      
      if (!leads || leads.length === 0) {
        return res.status(404).json({ error: 'No leads found for export' });
      }
      
      if (format === 'csv') {
        const headers = ['First Name', 'Last Name', 'Phone Number', 'Email', 'Status', 'Call Attempts', 'Created At'];
        const csvRows = [headers.join(',')];
        
        leads.forEach(lead => {
          const row = [
            lead.first_name || '',
            lead.last_name || '',
            lead.phone_number || '',
            lead.email || '',
            lead.status || '',
            lead.call_attempts || 0,
            lead.created_at || ''
          ].map(field => `"${String(field).replace(/"/g, '""')}"`);
          csvRows.push(row.join(','));
        });
        
        const csvContent = csvRows.join('\n');
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="campaign-${id}-leads.csv"`);
        res.send(csvContent);
      } else {
        res.json(leads);
      }
      
    } catch (error) {
      console.error('Error exporting leads:', error);
      res.status(500).json({ error: 'Failed to export leads' });
    }
  });

  // ==========================================
  // WEBHOOK ENDPOINTS
  // ==========================================

  // Webhook for campaign call status updates
  app.post('/webhook/campaign-call', async (req, res) => {
    try {
      const { CallSid, CallStatus, Duration, From, To, campaign_id, lead_id } = req.body;
      
      console.log('📞 Campaign call webhook:', { CallSid, CallStatus, Duration, campaign_id, lead_id });
      
      // Update lead status based on call status
      if (lead_id) {
        let leadStatus = 'pending';
        
        switch (CallStatus) {
          case 'in-progress':
            leadStatus = 'calling';
            break;
          case 'completed':
            leadStatus = 'called';
            break;
          case 'busy':
          case 'no-answer':
          case 'failed':
            leadStatus = 'failed';
            break;
        }
        
        await supabase
          .from('campaign_leads')
          .update({ 
            status: leadStatus,
            call_attempts: supabase.raw('call_attempts + 1'),
            last_call_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', lead_id);
      }
      
      res.json({ success: true });
      
    } catch (error) {
      console.error('Error processing campaign call webhook:', error);
      res.status(500).json({ error: 'Failed to process webhook' });
    }
  });

  // CRITICAL FIX: Webhook handler for URL pattern used by auto-dialer
  // This handles the pattern: /webhook/campaign-call/:campaignId/:leadId
  app.post('/webhook/campaign-call/:campaignId/:leadId', async (req, res) => {
    try {
      const { campaignId, leadId } = req.params;
      const { CallSid, CallStatus, Duration, From, To } = req.body;
      
      console.log('📞 Campaign call webhook (with URL params):', { 
        campaignId, 
        leadId, 
        CallSid, 
        CallStatus, 
        Duration,
        From,
        To 
      });
      
      // Update lead status based on call status
      if (leadId) {
        let leadStatus = 'pending';
        let callOutcome = null;
        
        switch (CallStatus) {
          case 'initiated':
          case 'ringing':
            leadStatus = 'calling';
            callOutcome = 'dialing';
            break;
          case 'in-progress':
            leadStatus = 'calling';
            callOutcome = 'answered';
            break;
          case 'completed':
            leadStatus = Duration && parseInt(Duration) > 30 ? 'completed' : 'no_answer';
            callOutcome = Duration && parseInt(Duration) > 30 ? 'completed' : 'no_answer';
            break;
          case 'busy':
            leadStatus = 'no_answer';
            callOutcome = 'busy';
            break;
          case 'no-answer':
            leadStatus = 'no_answer';
            callOutcome = 'no_answer';
            break;
          case 'failed':
            leadStatus = 'failed';
            callOutcome = 'failed';
            break;
        }
        
        // Update lead status and outcome
        const { error: updateError } = await supabase
          .from('campaign_leads')
          .update({ 
            status: leadStatus,
            outcome: callOutcome,
            call_attempts: supabase.raw('call_attempts + 1'),
            last_call_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', leadId);
          
        if (updateError) {
          console.error('❌ Error updating lead status:', updateError);
        } else {
          console.log(`✅ Updated lead ${leadId} status to: ${leadStatus}, outcome: ${callOutcome}`);
        }
        
        // Also create or update call log entry
        try {
          const callLogData = {
            call_id: CallSid,
            campaign_id: campaignId,
            phone_number: To,
            call_status: CallStatus,
            call_duration: Duration ? parseInt(Duration) : 0,
            created_at: new Date().toISOString(),
            metadata: {
              leadId: leadId,
              campaignId: campaignId,
              twilioCallSid: CallSid,
              from: From,
              to: To,
              status: CallStatus,
              duration: Duration
            }
          };
          
          const { error: logError } = await supabase
            .from('call_logs')
            .upsert(callLogData, { onConflict: 'call_id' });
            
          if (logError) {
            console.error('❌ Error creating call log:', logError);
          } else {
            console.log(`✅ Created/updated call log for ${CallSid}`);
          }
        } catch (logError) {
          console.error('❌ Error handling call log:', logError);
        }
      }
      
      // Generate TwiML response based on call status
      let twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>`;

      if (CallStatus === 'answered' || CallStatus === 'in-progress') {
        // When call is answered, connect to WebSocket for AI conversation
        const wsUrl = `${process.env.WS_BASE_URL || 'wss://work-2-xztkqihbepsagxrs.prod-runtime.all-hands.dev'}/websocket?callType=campaign&campaignId=${campaignId}&leadId=${leadId}&agentId=auto`;
        
        twimlResponse += `
  <Connect>
    <Stream url="${wsUrl}" />
  </Connect>`;
        
        console.log(`🔗 Connecting call to WebSocket: ${wsUrl}`);
      } else {
        // For other statuses, just hang up
        twimlResponse += `
  <Hangup />`;
      }
      
      twimlResponse += `
</Response>`;

      res.set('Content-Type', 'text/xml');
      res.send(twimlResponse);
      
    } catch (error) {
      console.error('❌ Error processing campaign call webhook with URL params:', error);
      res.status(500).set('Content-Type', 'text/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Hangup />
</Response>`);
    }
  });

  console.log('✅ Campaign API routes configured successfully');
  
  // ==========================================
  // CAMPAIGN ANALYTICS ENDPOINTS
  // ==========================================
  
  // Get campaign analytics data
  app.get('/api/campaigns/:id/analytics', async (req, res) => {
    try {
      const { id } = req.params;
      const { start_date, end_date } = req.query;
      
      // Get campaign analytics using the SQL function
      const { data, error } = await supabase
        .rpc('get_campaign_analytics', {
          campaign_id_param: id,
          start_date: start_date || null,
          end_date: end_date || null
        });
        
      if (error) {
        console.error('Error fetching campaign analytics:', error);
        return res.status(500).json({ error: 'Failed to fetch campaign analytics' });
      }
      
      res.json(data[0] || {});
    } catch (error) {
      console.error('Error in campaign analytics endpoint:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Campaign call recordings endpoint
  app.get('/api/campaigns/:id/recordings', async (req, res) => {
    try {
      const { id } = req.params;
      const { page = 1, limit = 20 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);
      
      const { data, error } = await supabase
        .from('analytics_call_summary')
        .select('*')
        .eq('campaign_id', id)
        .not('recording_url', 'is', null)
        .order('started_at', { ascending: false })
        .range(offset, offset + parseInt(limit) - 1);
        
      if (error) {
        console.error('Error fetching campaign recordings:', error);
        return res.status(500).json({ error: 'Failed to fetch campaign recordings' });
      }
      
      // Get total count for pagination
      const { count, error: countError } = await supabase
        .from('analytics_call_summary')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', id)
        .not('recording_url', 'is', null);
        
      if (countError) {
        console.error('Error counting campaign recordings:', countError);
      }
      
      res.json({
        recordings: data || [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count || 0,
          totalPages: Math.ceil((count || 0) / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Error in campaign recordings endpoint:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Campaign data export endpoint
  app.get('/api/campaigns/:id/export', async (req, res) => {
    try {
      const { id } = req.params;
      const { format = 'csv', start_date, end_date } = req.query;
      
      // Get lead data export using the SQL function
      const { data, error } = await supabase
        .rpc('get_lead_data_export', {
          campaign_id_param: id,
          start_date: start_date || null,
          end_date: end_date || null
        });
        
      if (error) {
        console.error('Error exporting campaign data:', error);
        return res.status(500).json({ error: 'Failed to export campaign data' });
      }
      
      if (format === 'csv') {
        const csvWriter = createObjectCsvWriter({
          path: `/tmp/campaign_${id}_export.csv`,
          header: [
            { id: 'campaign_name', title: 'Campaign Name' },
            { id: 'phone_number', title: 'Phone Number' },
            { id: 'full_name', title: 'Full Name' },
            { id: 'email', title: 'Email' },
            { id: 'current_address', title: 'Current Address' },
            { id: 'internet_plan', title: 'Internet Plan' },
            { id: 'install_date', title: 'Install Date' },
            { id: 'payment_method', title: 'Payment Method' },
            { id: 'data_completeness', title: 'Data Completeness %' },
            { id: 'call_outcome', title: 'Call Outcome' },
            { id: 'dnc_requested', title: 'DNC Requested' },
            { id: 'qualified_lead', title: 'Qualified Lead' },
            { id: 'appointment_scheduled', title: 'Appointment Scheduled' },
            { id: 'call_date', title: 'Call Date' }
          ]
        });
        
        await csvWriter.writeRecords(data || []);
        res.download(`/tmp/campaign_${id}_export.csv`);
      } else {
        res.json(data || []);
      }
    } catch (error) {
      console.error('Error in campaign export endpoint:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // General campaign export endpoint
  app.get('/api/export/campaigns', async (req, res) => {
    try {
      const { format = 'csv' } = req.query;
      
      const { data, error } = await supabase.from('campaigns').select('*');
      if (error) throw error;
      
      if (format === 'csv') {
        const csvWriter = createObjectCsvWriter({
          path: '/tmp/campaigns_export.csv',
          header: [
            { id: 'id', title: 'ID' },
            { id: 'name', title: 'Name' },
            { id: 'status', title: 'Status' },
            { id: 'created_at', title: 'Created At' }
          ]
        });
        
        await csvWriter.writeRecords(data);
        res.download('/tmp/campaigns_export.csv');
      } else {
        res.json(data);
      }
    } catch (error) {
      console.error('Error exporting campaigns:', error);
      res.status(500).json({ error: 'Failed to export campaigns' });
    }
  });

  // General calls export endpoint  
  app.get('/api/export/calls', async (req, res) => {
    try {
      const { start_date, end_date, format = 'csv' } = req.query;
      
      let query = supabase.from('call_logs').select('*');
      
      if (start_date) {
        query = query.gte('created_at', start_date);
      }
      
      if (end_date) {
        query = query.lte('created_at', end_date);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      if (format === 'csv') {
        const csvWriter = createObjectCsvWriter({
          path: '/tmp/calls_export.csv',
          header: [
            { id: 'id', title: 'ID' },
            { id: 'phone_number', title: 'Phone Number' },
            { id: 'duration', title: 'Duration' },
            { id: 'status', title: 'Status' },
            { id: 'created_at', title: 'Date' }
          ]
        });
        
        await csvWriter.writeRecords(data);
        res.download('/tmp/calls_export.csv');
      } else {
        res.json(data);
      }
    } catch (error) {
      console.error('Error exporting calls:', error);
      res.status(500).json({ error: 'Failed to export calls' });
    }
  });

  // Duplicate/Clone a campaign
  app.post('/api/campaigns/:id/duplicate', async (req, res) => {
    try {
      const { id } = req.params;
      const { newName, includeLeads = true } = req.body;
      
      // Get the original campaign
      const { data: originalCampaign, error: fetchError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', id)
        .single();
      
      if (fetchError || !originalCampaign) {
        return res.status(404).json({ error: 'Original campaign not found' });
      }
      
      // Create the new campaign with copied data
      const duplicatedCampaign = {
        profile_id: originalCampaign.profile_id,
        name: newName || `${originalCampaign.name} - Copy`,
        description: originalCampaign.description,
        agent_id: originalCampaign.agent_id,
        caller_id: originalCampaign.caller_id,
        max_concurrent_calls: originalCampaign.max_concurrent_calls,
        call_timeout_seconds: originalCampaign.call_timeout_seconds,
        retry_attempts: originalCampaign.retry_attempts,
        retry_delay_minutes: originalCampaign.retry_delay_minutes,
        timezone: originalCampaign.timezone,
        start_time: originalCampaign.start_time,
        end_time: originalCampaign.end_time,
        days_of_week: originalCampaign.days_of_week,
        priority: originalCampaign.priority,
        custom_system_instruction: originalCampaign.custom_system_instruction,
        custom_voice_name: originalCampaign.custom_voice_name,
        compliance_settings: originalCampaign.compliance_settings,
        status: 'draft', // Always start as draft
        total_leads: 0, // Will be updated if leads are copied
        leads_called: 0,
        leads_answered: 0,
        leads_completed: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Insert the new campaign
      const { data: newCampaign, error: insertError } = await supabase
        .from('campaigns')
        .insert(duplicatedCampaign)
        .select()
        .single();
      
      if (insertError) {
        console.error('Error creating duplicated campaign:', insertError);
        return res.status(500).json({ error: 'Failed to duplicate campaign' });
      }
      
      let copiedLeadsCount = 0;
      
      // Copy leads if requested
      if (includeLeads) {
        try {
          // Get original campaign leads
          const { data: originalLeads, error: leadsError } = await supabase
            .from('campaign_leads')
            .select('*')
            .eq('campaign_id', id);
          
          if (leadsError) {
            console.error('Error fetching original campaign leads:', leadsError);
          } else if (originalLeads && originalLeads.length > 0) {
            // Reset lead status for the new campaign
            const duplicatedLeads = originalLeads.map(lead => ({
              campaign_id: newCampaign.id,
              phone_number: lead.phone_number,
              first_name: lead.first_name,
              last_name: lead.last_name,
              email: lead.email,
              company: lead.company,
              custom_fields: lead.custom_fields,
              timezone: lead.timezone,
              status: 'pending', // Reset status
              call_attempts: 0, // Reset attempts
              last_call_date: null, // Reset call date
              notes: lead.notes,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }));
            
            // Insert duplicated leads
            const { data: insertedLeads, error: insertLeadsError } = await supabase
              .from('campaign_leads')
              .insert(duplicatedLeads)
              .select();
            
            if (insertLeadsError) {
              console.error('Error inserting duplicated leads:', insertLeadsError);
            } else {
              copiedLeadsCount = insertedLeads?.length || 0;
              
              // Update campaign with lead count
              await supabase
                .from('campaigns')
                .update({ 
                  total_leads: copiedLeadsCount,
                  updated_at: new Date().toISOString()
                })
                .eq('id', newCampaign.id);
              
              // Update the response data
              newCampaign.total_leads = copiedLeadsCount;
            }
          }
        } catch (leadsError) {
          console.error('Error copying leads:', leadsError);
          // Continue without leads if there's an error
        }
      }
      
      console.log(`✅ Campaign duplicated: ${newCampaign.name} (ID: ${newCampaign.id}) with ${copiedLeadsCount} leads`);
      res.status(201).json({
        campaign: newCampaign,
        copiedLeadsCount,
        message: includeLeads 
          ? `Campaign duplicated with ${copiedLeadsCount} leads`
          : 'Campaign duplicated without leads'
      });
    } catch (error) {
      console.error('Error duplicating campaign:', error);
      res.status(500).json({ error: 'Failed to duplicate campaign' });
    }
  });
}
