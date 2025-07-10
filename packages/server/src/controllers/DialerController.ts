// Simple type definitions for Express since @types/express is not available
interface Request {
  body: any;
  params: any;
  query: any;
}

interface Response {
  status: (code: number) => Response;
  json: (data: any) => void;
}

import { supabase } from '../lib/supabase';
import { AutoDialerEngine } from '../services/auto-dialer-engine';

interface DialerRequest extends Request {
  body: {
    campaignId: string;
  };
}

export class DialerController {
  // Start dialer for a campaign
  static async startDialer(req: DialerRequest, res: Response) {
    try {
      const { campaignId } = req.body;

      if (!campaignId) {
        return res.status(400).json({ error: 'Campaign ID is required' });
      }

      // Get campaign details
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (campaignError || !campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      // Check if campaign has pending leads
      const { count: pendingLeads, error: leadsError } = await supabase
        .from('campaign_leads')
        .select('id', { count: 'exact' })
        .eq('campaign_id', campaignId)
        .eq('status', 'pending');

      if (leadsError) {
        return res.status(500).json({ error: 'Failed to check leads' });
      }

      if (!pendingLeads || pendingLeads === 0) {
        return res.status(400).json({ error: 'No pending leads found for this campaign' });
      }

      // Initialize auto-dialer engine
      const dialerConfig = {
        campaignId: campaign.id,
        maxConcurrentCalls: campaign.max_concurrent_calls || 1,
        callTimeoutSeconds: campaign.call_timeout_seconds || 30,
        retryAttempts: campaign.retry_attempts || 3,
        retryDelayMinutes: campaign.retry_delay_minutes || 60,
        startTime: campaign.start_time || '09:00',
        endTime: campaign.end_time || '17:00',
        timezone: campaign.timezone || 'America/New_York',
        daysOfWeek: campaign.days_of_week || [1, 2, 3, 4, 5],
        dialingRate: 10 // calls per minute
      };

      const dialer = AutoDialerEngine.getInstance(campaignId, dialerConfig);
      
      // Start the dialer
      await dialer.start();

      // Store dialer instance for later control (in production, use Redis or similar)
      global.activeDialers = global.activeDialers || new Map();
      global.activeDialers.set(campaignId, dialer);

      res.json({ 
        success: true, 
        message: 'Dialer started successfully',
        campaignId 
      });

    } catch (error: any) {
      console.error('Error starting dialer:', error);
      res.status(500).json({ 
        error: 'Failed to start dialer', 
        details: error.message 
      });
    }
  }

  // Pause dialer for a campaign
  static async pauseDialer(req: DialerRequest, res: Response) {
    try {
      const { campaignId } = req.body;

      if (!campaignId) {
        return res.status(400).json({ error: 'Campaign ID is required' });
      }

      const activeDialers = global.activeDialers || new Map();
      const dialer = activeDialers.get(campaignId);

      if (!dialer) {
        return res.status(404).json({ error: 'No active dialer found for this campaign' });
      }

      await dialer.pause();

      res.json({ 
        success: true, 
        message: 'Dialer paused successfully',
        campaignId 
      });

    } catch (error: any) {
      console.error('Error pausing dialer:', error);
      res.status(500).json({ 
        error: 'Failed to pause dialer', 
        details: error.message 
      });
    }
  }

  // Resume dialer for a campaign
  static async resumeDialer(req: DialerRequest, res: Response) {
    try {
      const { campaignId } = req.body;

      if (!campaignId) {
        return res.status(400).json({ error: 'Campaign ID is required' });
      }

      const activeDialers = global.activeDialers || new Map();
      const dialer = activeDialers.get(campaignId);

      if (!dialer) {
        return res.status(404).json({ error: 'No active dialer found for this campaign' });
      }

      await dialer.resume();

      res.json({ 
        success: true, 
        message: 'Dialer resumed successfully',
        campaignId 
      });

    } catch (error: any) {
      console.error('Error resuming dialer:', error);
      res.status(500).json({ 
        error: 'Failed to resume dialer', 
        details: error.message 
      });
    }
  }

  // Stop dialer for a campaign
  static async stopDialer(req: DialerRequest, res: Response) {
    try {
      const { campaignId } = req.body;

      if (!campaignId) {
        return res.status(400).json({ error: 'Campaign ID is required' });
      }

      const activeDialers = global.activeDialers || new Map();
      const dialer = activeDialers.get(campaignId);

      if (dialer) {
        await dialer.stop();
        activeDialers.delete(campaignId);
      }

      res.json({ 
        success: true, 
        message: 'Dialer stopped successfully',
        campaignId 
      });

    } catch (error: any) {
      console.error('Error stopping dialer:', error);
      res.status(500).json({ 
        error: 'Failed to stop dialer', 
        details: error.message 
      });
    }
  }

  // Get dialer status for a campaign
  static async getDialerStatus(req: Request, res: Response) {
    try {
      const { campaignId } = req.params;

      if (!campaignId) {
        return res.status(400).json({ error: 'Campaign ID is required' });
      }

      // Get status from database
      const { data: status, error } = await supabase
        .from('campaign_dialer_status')
        .select('*')
        .eq('campaign_id', campaignId)
        .single();

      if (error && error.code !== 'PGRST116') {
        return res.status(500).json({ error: 'Failed to get dialer status' });
      }

      // If no status found, return default
      if (!status) {
        return res.json({
          campaign_id: campaignId,
          status: 'idle',
          active_calls: 0,
          calls_in_queue: 0,
          completed_calls: 0
        });
      }

      res.json(status);

    } catch (error: any) {
      console.error('Error getting dialer status:', error);
      res.status(500).json({ 
        error: 'Failed to get dialer status', 
        details: error.message 
      });
    }
  }

  // Get all active dialers (admin endpoint)
  static async getActiveDialers(req: Request, res: Response) {
    try {
      const activeDialers = global.activeDialers || new Map();
      const dialerList = Array.from(activeDialers.keys()).map(campaignId => ({
        campaignId,
        status: 'running' // Simplified for now
      }));

      res.json({ 
        activeDialers: dialerList,
        count: dialerList.length 
      });

    } catch (error: any) {
      console.error('Error getting active dialers:', error);
      res.status(500).json({ 
        error: 'Failed to get active dialers', 
        details: error.message 
      });
    }
  }
}

// Declare global type for TypeScript
declare global {
  var activeDialers: Map<string, any>;
}
