import { supabase, supabaseAdmin } from '../lib/supabase';
import type { 
  Profile, 
  CallLog, 
  Campaign, 
  CampaignLead, 
  AnalyticsData,
  DNCEntry,
  WebhookEndpoint,
  WebhookDelivery,
  Subscription,
  UsageRecord,
  SystemStatus,
  AIAgent,
  Appointment,
  ActiveCall,
  // FunctionCallLog
} from '../lib/supabase';

// API base URL for campaign control endpoints
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? window.location.origin 
  : (typeof window !== 'undefined' && window.location.hostname === 'localhost')
    ? 'http://localhost:12001'
    : (typeof window !== 'undefined' && window.location.hostname.includes('app.github.dev'))
      ? `${window.location.protocol}//${window.location.hostname.replace('-3000', '-12001')}`
      : 'http://localhost:12001';

// Admin client already imported as supabaseAdmin

export class DatabaseService {
  // Profile operations
  static async getProfile(userId: string): Promise<Profile | null> {

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      throw error;
    }

    return data;
  }

  static async updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile | null> {

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating profile:', error);
      throw error;
    }

    return data;
  }

  static async getUserSettings(userId: string): Promise<any> {

    const profile = await this.getProfile(userId);
    return {
      twilio_phone_number: profile?.twilio_phone_number,
      twilio_account_sid: profile?.twilio_account_sid,
      gemini_api_key: profile?.gemini_api_key
    };
  }

  // AI Agents operations
  static async getAIAgents(profileId: string): Promise<AIAgent[]> {
    try {
      // Use backend API for consistent multi-tenant security
      const response = await fetch(`/api/agents?profile_id=${profileId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Error fetching AI agents:', errorData);
        return [];
      }

      const data = await response.json();
      return data || [];
    } catch (error) {
      console.error('Exception in getAIAgents:', error);
      return [];
    }
  }

  static async createAIAgent(agent: Omit<AIAgent, 'id' | 'created_at' | 'updated_at'>): Promise<AIAgent | null> {
    try {
      // Use backend API for consistent multi-tenant security
      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(agent),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error creating AI agent:', error);
      throw error;
    }
  }

  static async updateAIAgent(id: string, updates: Partial<AIAgent>): Promise<AIAgent | null> {
    try {
      // Define valid columns that exist in the database
      const validColumns = [
        'agent_type', 'business_days', 'business_hours_end', 'business_hours_start',
        'call_direction', 'description', 'escalation_email', 'escalation_enabled',
        'escalation_phone_number', 'escalation_type', 'greeting', 'is_active',
        'language_code', 'max_concurrent_calls', 'name', 'status', 'system_instruction',
        'system_prompt', 'timezone', 'twilio_phone_number', 'twilio_webhook_url',
        'voice_name', 'voice_settings'
      ];

      // Filter out invalid fields and add updated_at timestamp
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      // Only include fields that exist in the database
      Object.keys(updates).forEach(key => {
        if (validColumns.includes(key)) {
          updateData[key] = updates[key as keyof AIAgent];
        } else {
          console.warn(`Skipping invalid field: ${key}`);
        }
      });

      console.log('Updating AI agent with data:', updateData);

      // Get current user for multi-tenant security
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Use backend API for agent operations with proper profile_id validation
      const response = await fetch(`/api/agents/${id}?profile_id=${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Successfully updated AI agent:', data);
      return data;
    } catch (error) {
      console.error('Exception in updateAIAgent:', error);
      throw error;
    }
  }

  static async deleteAIAgent(id: string): Promise<boolean> {
    try {
      // Get current user for multi-tenant security
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Use backend API for agent operations with proper profile_id validation
      const response = await fetch(`/api/agents/${id}?profile_id=${user.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return true;
    } catch (error) {
      console.error('Exception in deleteAIAgent:', error);
      throw error;
    }
  }

  // Call logs operations
  static async getCallLogs(profileId: string, limit = 50, offset = 0): Promise<CallLog[]> {

    const { data, error } = await supabase
      .from('call_logs')
      .select(`
        *,
        campaigns(name)
      `)
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false }) // Use created_at instead of started_at
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching call logs:', error);
      // In live mode, return empty array instead of demo data
      return [];
    }

    return data || [];
  }

  static async getActiveCallLogs(profileId: string): Promise<CallLog[]> {

    const { data, error } = await supabase
      .from('call_logs')
      .select('*')
      .eq('profile_id', profileId)
      .eq('status', 'in_progress')
      .order('started_at', { ascending: false });

    if (error) {
      console.error('Error fetching active calls:', error);
      return [];
    }

    return data || [];
  }

  static async createCallLog(callLog: Omit<CallLog, 'id' | 'created_at'>): Promise<CallLog | null> {

    const { data, error } = await supabase
      .from('call_logs')
      .insert(callLog)
      .select()
      .single();

    if (error) {
      console.error('Error creating call log:', error);
      throw error;
    }

    return data;
  }

  static async updateCallLog(id: string, updates: Partial<CallLog>): Promise<CallLog | null> {

    const { data, error } = await supabase
      .from('call_logs')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating call log:', error);
      throw error;
    }

    return data;
  }

  // Campaign operations
  static async getCampaigns(profileId: string): Promise<Campaign[]> {
    try {
      console.log('🔍 Fetching campaigns for profile:', profileId);
      
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('profile_id', profileId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching campaigns:', error);
        return [];
      }

      console.log('📊 Campaigns found:', data?.length || 0);

      // Get lead counts for each campaign using admin client to ensure accuracy
      const campaignsWithCounts = await Promise.all((data || []).map(async (campaign: any) => {
        try {
          const { count: totalLeads } = await supabaseAdmin
            .from('campaign_leads')
            .select('*', { count: 'exact', head: true })
            .eq('campaign_id', campaign.id);

          const { count: calledLeads } = await supabaseAdmin
            .from('campaign_leads')
            .select('*', { count: 'exact', head: true })
            .eq('campaign_id', campaign.id)
            .neq('status', 'pending');

          const { count: completedLeads } = await supabaseAdmin
            .from('campaign_leads')
            .select('*', { count: 'exact', head: true })
            .eq('campaign_id', campaign.id)
            .eq('status', 'completed');

          console.log(`📋 Campaign ${campaign.name}: ${totalLeads} total, ${calledLeads} called, ${completedLeads} completed`);

          return {
            ...campaign,
            total_leads: totalLeads || 0,
            leads_called: calledLeads || 0,
            leads_completed: completedLeads || 0
          };
        } catch (countError) {
          console.error('Error counting leads for campaign', campaign.id, ':', countError);
          return {
            ...campaign,
            total_leads: 0,
            leads_called: 0,
            leads_completed: 0
          };
        }
      }));

      return campaignsWithCounts;
    } catch (error) {
      console.error('Error in getCampaigns:', error);
      return [];
    }
  }

  static async getCampaign(campaignId: string): Promise<Campaign | null> {

    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (error) {
      console.error('Error fetching campaign:', error);
      return null;
    }

    return data;
  }

  static async createCampaign(campaign: Omit<Campaign, 'id' | 'created_at' | 'updated_at'>): Promise<Campaign | null> {
    try {
      console.log('🎯 Creating campaign with data:', campaign);
      
      // Validate required fields
      if (!campaign.profile_id) {
        throw new Error('profile_id is required to create a campaign');
      }
      
      if (!campaign.name || campaign.name.trim().length === 0) {
        throw new Error('Campaign name is required');
      }
      
      // Ensure all required fields are present with defaults
      const campaignData = {
        profile_id: campaign.profile_id,
        name: campaign.name,
        description: campaign.description || '',
        status: campaign.status || 'draft' as const,
        caller_id: campaign.caller_id,
        max_concurrent_calls: campaign.max_concurrent_calls || 1,
        call_timeout_seconds: campaign.call_timeout_seconds || 30,
        retry_attempts: campaign.retry_attempts || 3,
        retry_delay_minutes: campaign.retry_delay_minutes || 60,
        timezone: campaign.timezone || 'America/New_York',
        days_of_week: campaign.days_of_week || [1, 2, 3, 4, 5],
        priority: campaign.priority || 'normal' as const,
        total_leads: campaign.total_leads || 0,
        leads_called: campaign.leads_called || 0,
        leads_answered: campaign.leads_answered || 0,
        leads_completed: campaign.leads_completed || 0,
        // Optional fields
        ...(campaign.agent_id && { agent_id: campaign.agent_id }),
        ...(campaign.start_time && { start_time: campaign.start_time }),
        ...(campaign.end_time && { end_time: campaign.end_time }),
        ...(campaign.scheduled_start_date && { scheduled_start_date: campaign.scheduled_start_date }),
        ...(campaign.scheduled_end_date && { scheduled_end_date: campaign.scheduled_end_date }),
        ...(campaign.custom_system_instruction && { custom_system_instruction: campaign.custom_system_instruction }),
        ...(campaign.custom_voice_name && { custom_voice_name: campaign.custom_voice_name }),
        ...(campaign.compliance_settings && { compliance_settings: campaign.compliance_settings }),
      };

      const { data, error } = await supabase
        .from('campaigns')
        .insert(campaignData)
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating campaign:', error);
        throw error;
      }

      console.log('✅ Campaign created successfully:', data);
      return data;
    } catch (error) {
      console.error('💥 Exception in createCampaign:', error);
      throw error;
    }
  }

  static async updateCampaign(id: string, updates: Partial<Campaign>): Promise<Campaign | null> {
    const { data, error } = await supabase
      .from('campaigns')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating campaign:', error);
      throw error;
    }

    return data;
  }

  static async deleteCampaign(id: string): Promise<boolean> {

    const { error } = await supabase
      .from('campaigns')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting campaign:', error);
      throw error;
    }

    return true;
  }

  // Campaign leads operations
  static async getCampaignLeads(campaignId: string): Promise<CampaignLead[]> {
    try {
      console.log('🔍 Fetching leads for campaign:', campaignId);
      
      // Use admin client to bypass RLS for now
      const { data, error } = await supabaseAdmin
        .from('campaign_leads')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false });

      console.log('📊 Leads query result:', { error: error?.message, count: data?.length });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching campaign leads:', error);
      return [];
    }
  }

  static async addLeadsToCampaign(campaignId: string, leads: Omit<CampaignLead, 'id' | 'campaign_id' | 'created_at' | 'updated_at'>[]): Promise<boolean> {
    try {
      console.log('🎯 DatabaseService.addLeadsToCampaign called');
      console.log('📝 Campaign ID:', campaignId);
      console.log('📝 Leads input:', JSON.stringify(leads, null, 2));
      
      if (!leads || leads.length === 0) {
        console.error('❌ No leads provided to addLeadsToCampaign');
        return false;
      }
      
      const leadsToInsert = leads.map(lead => ({
        campaign_id: campaignId,
        phone_number: lead.phone_number,
        first_name: lead.first_name || null,
        last_name: lead.last_name || null,
        email: lead.email || null,
        address: lead.address || null,
        service_requested: lead.service_requested || null,
        status: lead.status || 'pending',
        call_attempts: lead.call_attempts || 0,
        notes: lead.notes || null,
        priority: lead.priority || 'normal'
      }));

      console.log('📤 Inserting leads directly with admin client...');
      
      // Use admin client to bypass RLS and insert directly
      const { data, error } = await supabaseAdmin
        .from('campaign_leads')
        .insert(leadsToInsert)
        .select();

      if (error) {
        console.error('❌ Lead insert failed:', error);
        throw new Error(`Failed to insert leads: ${error.message}`);
      }

      console.log('✅ Leads inserted successfully:', data?.length);
      
      // Update campaign lead count using admin client
      if (data && data.length > 0) {
        const { data: campaign, error: campaignError } = await supabaseAdmin
          .from('campaigns')
          .select('total_leads')
          .eq('id', campaignId)
          .single();

        if (!campaignError && campaign) {
          const { error: updateError } = await supabaseAdmin
            .from('campaigns')
            .update({ 
              total_leads: (campaign.total_leads || 0) + data.length,
              updated_at: new Date().toISOString()
            })
            .eq('id', campaignId);
          
          if (updateError) {
            console.warn('⚠️ Failed to update campaign lead count:', updateError.message);
          } else {
            console.log('✅ Campaign lead count updated');
          }
        }
      }
      
      return true;
    } catch (error) {
      console.error('💥 Exception in addLeadsToCampaign:', error);
      throw error; // Re-throw to show error to user
    }
  }

  static async importLeadsFromCSV(campaignId: string, csvFile: File): Promise<{ success: number; errors: string[]; }> {
    try {
      // Read file
      const text = await csvFile.text();
      const lines = text.split('\n').filter(line => line.trim());
      if (lines.length === 0) {
        return { success: 0, errors: ['CSV file is empty'] };
      }
      // Parse headers
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const phoneIndex = headers.findIndex(h => h.includes('phone'));
      if (phoneIndex === -1) {
        return { success: 0, errors: ['Phone number column not found'] };
      }
      const leads = [];
      const errors = [];
      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',').map(cell => cell.trim());
        const phoneNumber = row[phoneIndex]?.replace(/[^\d+]/g, '');
        if (!phoneNumber || phoneNumber.length < 10) {
          errors.push(`Row ${i + 1}: Invalid phone number`);
          continue;
        }
        const firstNameIndex = headers.findIndex(h => h.includes('first'));
        const lastNameIndex = headers.findIndex(h => h.includes('last'));
        const emailIndex = headers.findIndex(h => h.includes('email'));
        const addressIndex = headers.findIndex(h => h.includes('address'));
        const serviceIndex = headers.findIndex(h => h.includes('service'));
        leads.push({
          phone_number: phoneNumber,
          first_name: firstNameIndex >= 0 ? row[firstNameIndex] : '',
          last_name: lastNameIndex >= 0 ? row[lastNameIndex] : '',
          email: emailIndex >= 0 ? row[emailIndex] : '',
          address: addressIndex >= 0 ? row[addressIndex] : '',
          service_requested: serviceIndex >= 0 ? row[serviceIndex] : '',
          status: 'pending' as const,
          call_attempts: 0,
          notes: ''
        });
      }
      if (leads.length === 0) {
        return { success: 0, errors: errors.length > 0 ? errors : ['No valid leads found'] };
      }
      // Always call addLeadsToCampaign and return promptly
      let success = false;
      try {
        success = await this.addLeadsToCampaign(campaignId, leads);
      } catch (err) {
        errors.push('Failed to add leads: ' + (err instanceof Error ? err.message : String(err)));
      }
      return {
        success: success ? leads.length : 0,
        errors: success ? errors : [...errors, 'Failed to import leads']
      };
    } catch (error) {
      return { success: 0, errors: [(error instanceof Error ? error.message : String(error)) || 'Failed to process CSV file'] };
    }
  }

  static async importCampaignLeads(campaignId: string, leads: Omit<CampaignLead, 'id' | 'campaign_id' | 'created_at' | 'updated_at'>[]): Promise<{
    success: boolean;
    imported: number;
    errors: string[];
  }> {
    try {
      const leadsToImport = leads.map(lead => ({
        ...lead,
        campaign_id: campaignId,
        status: 'pending' as const,
        call_attempts: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      // Use regular client - RLS policies should allow lead insertion
      const { data, error } = await supabase
        .from('campaign_leads')
        .insert(leadsToImport)
        .select();

      if (error) {
        return {
          success: false,
          imported: 0,
          errors: [error.message]
        };
      }

      // Update campaign lead count
      const { data: campaign } = await supabase
        .from('campaigns')
        .select('total_leads')
        .eq('id', campaignId)
        .single();

      if (campaign) {
        await supabase
          .from('campaigns')
          .update({ 
            total_leads: (campaign.total_leads || 0) + data.length,
            updated_at: new Date().toISOString()
          })
          .eq('id', campaignId);
      }

      return {
        success: true,
        imported: data.length,
        errors: []
      };
    } catch (error: any) {
      console.error('Error importing campaign leads:', error);
      return {
        success: false,
        imported: 0,
        errors: [error.message || 'Unknown error occurred']
      };
    }
  }

  static async updateCampaignLead(campaignId: string, leadId: string, updates: Partial<CampaignLead>): Promise<CampaignLead | null> {
    try {
      // Use admin client to bypass RLS restrictions
      const { data, error } = await supabaseAdmin
        .from('campaign_leads')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', leadId)
        .eq('campaign_id', campaignId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating campaign lead:', error);
      return null;
    }
  }

  static async deleteCampaignLead(campaignId: string, leadId: string): Promise<boolean> {
    try {
      // Use admin client to bypass RLS restrictions
      const { error } = await supabaseAdmin
        .from('campaign_leads')
        .delete()
        .eq('id', leadId)
        .eq('campaign_id', campaignId);

      if (error) throw error;

      // Update campaign lead count
      const { data: campaign } = await supabase
        .from('campaigns')
        .select('total_leads')
        .eq('id', campaignId)
        .single();

      if (campaign) {
        await supabase
          .from('campaigns')
          .update({ 
            total_leads: Math.max(0, (campaign.total_leads || 0) - 1),
            updated_at: new Date().toISOString()
          })
          .eq('id', campaignId);
      }

      return true;
    } catch (error) {
      console.error('Error deleting campaign lead:', error);
      return false;
    }
  }

  // Appointments operations
  static async getAppointments(profileId: string): Promise<Appointment[]> {

    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('profile_id', profileId)
      .order('scheduled_date', { ascending: true });

    if (error) {
      console.error('Error fetching appointments:', error);
      return [];
    }

    return data || [];
  }

  static async createAppointment(appointment: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>): Promise<Appointment | null> {

    const { data, error } = await supabase
      .from('appointments')
      .insert(appointment)
      .select()
      .single();

    if (error) {
      console.error('Error creating appointment:', error);
      throw error;
    }

    return data;
  }

  static async updateAppointment(id: string, updates: Partial<Appointment>): Promise<Appointment | null> {

    const { data, error } = await supabase
      .from('appointments')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating appointment:', error);
      throw error;
    }

    return data;
  }

  static async deleteAppointment(id: string): Promise<boolean> {

    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting appointment:', error);
      throw error;
    }

    return true;
  }

  static async toggleAgent(agentId: string, isActive: boolean): Promise<boolean> {

    const { error } = await supabase
      .from('ai_agents')
      .update({ is_active: isActive })
      .eq('id', agentId);

    if (error) {
      console.error('Error toggling agent:', error);
      throw error;
    }

    return true;
  }

  // Analytics operations
  static async getAnalytics(profileId: string, timeRange: string = '30d'): Promise<AnalyticsData> {
    try {
      // Calculate days back based on time range
      let daysBack = 30;
      switch (timeRange) {
        case '7d': daysBack = 7; break;
        case '30d': daysBack = 30; break;
        case '90d': daysBack = 90; break;
        case '1y': daysBack = 365; break;
        default: daysBack = 30;
      }

      // Get recent calls for analytics
      const { data: calls, error: callsError } = await supabase
        .from('call_logs')
        .select('*')
        .eq('profile_id', profileId)
        .gte('created_at', new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      if (callsError) {
        console.error('Error fetching calls for analytics:', callsError);
        return this.getEmptyAnalytics();
      }

      // If no calls, return empty analytics
      if (!calls || calls.length === 0) {
        return this.getEmptyAnalytics();
      }

      // Build analytics from real call data
      return this.buildAnalyticsFromCalls(calls);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      return this.getEmptyAnalytics();
    }
  }

  private static buildAnalyticsFromCalls(calls: any[]): AnalyticsData {
    const totalCalls = calls.length;
    const successfulCalls = calls.filter(call => 
      call.status === 'completed' || call.status === 'successful'
    ).length;
    
    const totalDurationSeconds = calls.reduce((total, call) => 
      total + (call.duration_seconds || 0), 0
    );
    
    const averageCallDuration = totalCalls > 0 ? Math.round(totalDurationSeconds / totalCalls) : 0;
    const successRate = totalCalls > 0 ? Math.round((successfulCalls / totalCalls) * 100) : 0;

    // Group calls by day for volume chart
    const callsByDay = this.groupCallsByDay(calls);
    const callVolumeData = callsByDay.map(day => ({
      date: day.date,
      calls: day.count
    }));

    // Group calls by status for outcomes
    const statusGroups = calls.reduce((acc, call) => {
      const status = call.status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const callOutcomeData = Object.entries(statusGroups).map(([status, count], index) => ({
      name: this.formatStatus(status),
      value: count as number,
      color: this.getStatusColor(status, index)
    }));

    // Calculate performance trend (success rate by day)
    const performanceData = this.calculatePerformanceTrend(calls);

    // Calculate additional metrics
    const appointmentsScheduled = calls.filter(call => 
      call.outcome?.toLowerCase().includes('appointment') || 
      call.notes?.toLowerCase().includes('appointment')
    ).length;

    const salesCompleted = calls.filter(call =>
      call.outcome?.toLowerCase().includes('sale') ||
      call.outcome?.toLowerCase().includes('sold') ||
      call.notes?.toLowerCase().includes('sale')
    ).length;

    return {
      totalCalls,
      totalMinutes: Math.round(totalDurationSeconds / 60),
      successfulCalls,
      averageCallDuration,
      callsByDay: callsByDay,
      callsByStatus: Object.entries(statusGroups).map(([status, count]) => ({
        status: this.formatStatus(status),
        count: count as number
      })),
      topOutcomes: this.getTopOutcomes(calls),
      minutesUsed: Math.round(totalDurationSeconds / 60),
      minutesLimit: 50000,
      campaignStats: {
        totalCampaigns: 0, // Will be calculated from campaigns table if needed
        activeCampaigns: 0,
        totalLeads: 0,
        leadsContacted: totalCalls
      },
      successRate,
      avgDuration: averageCallDuration,
      costPerCall: 0.02, // Estimated cost
      callVolumeData,
      performanceData,
      callOutcomeData,
      topScripts: [], // Will be populated from agent/script data if available
      appointmentsScheduled,
      salesCompleted
    };
  }

  private static groupCallsByDay(calls: any[]): Array<{ date: string; count: number }> {
    const dayGroups = calls.reduce((acc, call) => {
      const date = new Date(call.created_at).toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const sortedDays = Object.entries(dayGroups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count: count as number }));

    return sortedDays;
  }

  private static calculatePerformanceTrend(calls: any[]): Array<{ date: string; success_rate: number }> {
    const dayGroups = calls.reduce((acc, call) => {
      const date = new Date(call.created_at).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { total: 0, successful: 0 };
      }
      acc[date].total += 1;
      if (call.status === 'completed' || call.status === 'successful') {
        acc[date].successful += 1;
      }
      return acc;
    }, {} as Record<string, { total: number; successful: number }>);

    return Object.entries(dayGroups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => {
        const dayData = data as { total: number; successful: number };
        return {
          date,
          success_rate: dayData.total > 0 ? Math.round((dayData.successful / dayData.total) * 100) : 0
        };
      });
  }

  private static formatStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'completed': 'Completed',
      'successful': 'Successful',
      'failed': 'Failed',
      'abandoned': 'Abandoned',
      'busy': 'Busy',
      'no_answer': 'No Answer',
      'voicemail': 'Voicemail',
      'unknown': 'Unknown'
    };
    return statusMap[status] || status.charAt(0).toUpperCase() + status.slice(1);
  }

  private static getStatusColor(status: string, index: number): string {
    const colorMap: Record<string, string> = {
      'completed': '#10B981',
      'successful': '#10B981',
      'failed': '#EF4444',
      'abandoned': '#F59E0B',
      'busy': '#F97316',
      'no_answer': '#6B7280',
      'voicemail': '#8B5CF6',
      'unknown': '#6B7280'
    };
    const defaultColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
    return colorMap[status] || defaultColors[index % defaultColors.length];
  }

  private static getTopOutcomes(calls: any[]): Array<{ outcome: string; count: number }> {
    const outcomeGroups = calls.reduce((acc, call) => {
      const outcome = call.outcome || 'No outcome recorded';
      acc[outcome] = (acc[outcome] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(outcomeGroups)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([outcome, count]) => ({ outcome, count: count as number }));
  }

  // DNC operations
  static async getDNCEntries(profileId: string): Promise<DNCEntry[]> {

    const { data, error } = await supabase
      .from('dnc_lists')
      .select('*')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching DNC entries:', error);
      return [];
    }

    return data || [];
  }

  static async addDNCEntry(entry: Omit<DNCEntry, 'id' | 'created_at'>): Promise<DNCEntry> {

    const { data, error } = await supabase
      .from('dnc_lists')
      .insert(entry)
      .select()
      .single();

    if (error) {
      console.error('Error adding DNC entry:', error);
      throw error;
    }

    return data;
  }

  static async deleteDNCEntry(id: string): Promise<boolean> {

    const { error } = await supabase
      .from('dnc_lists')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting DNC entry:', error);
      throw error;
    }

    return true;
  }

  // Webhook operations
  static async getWebhookEndpoints(profileId: string): Promise<WebhookEndpoint[]> {

    const { data, error } = await supabase
      .from('webhook_endpoints')
      .select('*')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching webhook endpoints:', error);
      return [];
    }

    return data || [];
  }

  static async getWebhookDeliveries(profileId: string): Promise<WebhookDelivery[]> {

    const { data, error } = await supabase
      .from('webhook_deliveries')
      .select(`
        *,
        webhook_endpoints!inner(profile_id)
      `)
      .eq('webhook_endpoints.profile_id', profileId)
      .order('delivered_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching webhook deliveries:', error);
      return [];
    }

    return data || [];
  }

  // System status
  static async getSystemStatus(): Promise<SystemStatus[]> {

    const { data, error } = await supabase
      .from('system_status')
      .select('*')
      .is('resolved_at', null)
      .order('started_at', { ascending: false });

    if (error) {
      console.error('Error fetching system status:', error);
      return [];
    }

    return data || [];
  }

  // Demo data methods
  // @ts-expect-error: Demo data for development purposes
  private static getDemoProfile(userId?: string): Profile {
    // Check if this is the admin user
    if (userId === 'admin-user-id') {
      return {
        id: 'admin-user-id',
        email: 'gamblerspassion@gmail.com',
        client_name: 'Admin User',
        company_name: 'AI Call Center Admin',
        phone_number: '+1 (555) 999-0000',
        plan_name: 'scale',
        monthly_minute_limit: 1800,
        minutes_used: 245,
        is_active: true,
        can_use_inbound: true,
        can_use_outbound_dialer: true,
        max_concurrent_calls: 50,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-06-14T00:00:00Z'
      };
    }
    
    // Default demo user profile
    return {
      id: 'demo-user-1',
      email: 'demo@example.com',
      client_name: 'Demo User',
      company_name: 'AI Call Center Demo',
      phone_number: '+1 (555) 123-4567',
      plan_name: 'pro',
      monthly_minute_limit: 1000,
      minutes_used: 752,
      is_active: true,
      can_use_inbound: true,
      can_use_outbound_dialer: true,
      max_concurrent_calls: 3,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-06-10T00:00:00Z'
    };
  }

  // @ts-expect-error: Demo data method
  private static getDemoAgents(): AIAgent[] {
    return [
      {
        id: 'agent-1',
        profile_id: 'demo-user-1',
        name: 'Customer Service Agent',
        description: 'Primary customer service agent for general inquiries',
        agent_type: 'customer_service',
        call_direction: 'inbound',
        voice_name: 'Puck',
        language_code: 'en-US',
        system_instruction: 'You are a professional customer service representative.',
        twilio_phone_number: '+1 (555) 0001',
        is_active: true,
        max_concurrent_calls: 2,
        business_hours_start: '09:00',
        business_hours_end: '17:00',
        business_days: [1, 2, 3, 4, 5],
        timezone: 'UTC',
        escalation_enabled: true,
        escalation_type: 'human_agent',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      },
      {
        id: 'agent-2',
        profile_id: 'demo-user-1',
        name: 'Sales Agent',
        description: 'Outbound sales agent for lead qualification',
        agent_type: 'sales',
        call_direction: 'outbound',
        voice_name: 'Charon',
        language_code: 'en-US',
        system_instruction: 'You are a professional sales representative.',
        twilio_phone_number: '+1 (555) 0002',
        is_active: true,
        max_concurrent_calls: 1,
        business_hours_start: '09:00',
        business_hours_end: '18:00',
        business_days: [1, 2, 3, 4, 5],
        timezone: 'UTC',
        escalation_enabled: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }
    ];
  }

  // @ts-expect-error: Demo method kept for future use
  private static getDemoCallLogs(): CallLog[] {
    return [
      {
        id: 'call-1',
        profile_id: 'demo-user-1',
        agent_id: 'agent-1',
        phone_number_from: '+1 (555) 123-4567',
        phone_number_to: '+1 (555) 987-6543',
        direction: 'inbound',
        status: 'completed',
        started_at: '2024-01-15T10:30:00Z',
        ended_at: '2024-01-15T10:34:23Z',
        duration_seconds: 263,
        call_summary: 'Customer inquiry about product features',
        sentiment_score: 0.8,
        outcome: 'Resolved',
        priority: 'normal',
        customer_satisfaction_score: 5,
        follow_up_required: false,
        tags: ['product-inquiry', 'resolved'],
        created_at: '2024-01-15T10:30:00Z'
      },
      {
        id: 'call-2',
        profile_id: 'demo-user-1',
        agent_id: 'agent-2',
        phone_number_from: '+1 (555) 987-6543',
        phone_number_to: '+1 (555) 456-7890',
        direction: 'outbound',
        status: 'in_progress',
        started_at: '2024-01-15T11:00:00Z',
        duration_seconds: 75,
        call_summary: 'Sales call in progress',
        priority: 'normal',
        follow_up_required: false,
        created_at: '2024-01-15T11:00:00Z'
      }
    ];
  }

  // @ts-expect-error: Demo data method
  private static getDemoCampaigns(): Campaign[] {
    return [
      {
        id: 'campaign-1',
        profile_id: 'demo-user-1',
        agent_id: 'agent-2',
        name: 'Q1 Sales Outreach',
        description: 'Quarterly sales campaign for new prospects',
        status: 'active',
        caller_id: '+1 (555) 0002',
        max_concurrent_calls: 2,
        call_timeout_seconds: 30,
        retry_attempts: 3,
        retry_delay_minutes: 60,
        start_time: '09:00',
        end_time: '17:00',
        timezone: 'UTC',
        days_of_week: [1, 2, 3, 4, 5],
        priority: 'normal',
        total_leads: 500,
        leads_called: 156,
        leads_answered: 89,
        leads_completed: 45,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-15T00:00:00Z'
      }
    ];
  }

  // @ts-expect-error: Demo data method
  private static getDemoCampaignLeads(): CampaignLead[] {
    return [
      {
        id: 'lead-1',
        campaign_id: 'campaign-1',
        phone_number: '+1 (555) 111-2222',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com',
        status: 'completed',
        call_attempts: 1,
        last_called_at: '2024-01-15T10:00:00Z',
        outcome: 'completed',
        notes: 'Interested - Follow up scheduled',
        address: '123 Main St, Anytown, ST 12345',
        service_requested: 'Consultation',
        custom_fields: { business_type: 'Consulting' },
        metadata: {},
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-15T10:00:00Z'
      }
    ];
  }

  // @ts-expect-error: Demo data method
  private static getDemoAppointments(): Appointment[] {
    return [
      {
        id: 'appointment-1',
        profile_id: 'demo-user-1',
        customer_name: 'Jane Smith',
        customer_phone: '+1 (555) 333-4444',
        customer_email: 'jane.smith@example.com',
        appointment_date: '2024-01-20',
        appointment_time: '14:00',
        service_type: 'Product Demo',
        scheduled_date: '2024-01-20T14:00:00Z',
        duration_minutes: 30,
        // location: 'Zoom Meeting', // Property not in Appointment interface
        status: 'scheduled',
        // reminder_sent: false, // Property not in Appointment interface
        created_at: '2024-01-15T00:00:00Z',
        updated_at: '2024-01-15T00:00:00Z'
      }
    ];
  }

  // @ts-expect-error: Demo data method
  private static getDemoAnalytics(): AnalyticsData {
    return {
      totalCalls: 247,
      totalMinutes: 1840,
      successfulCalls: 189,
      averageCallDuration: 447,
      callsByDay: [
        { date: '2024-01-08', count: 32 },
        { date: '2024-01-09', count: 28 },
        { date: '2024-01-10', count: 35 },
        { date: '2024-01-11', count: 41 },
        { date: '2024-01-12', count: 38 },
        { date: '2024-01-13', count: 29 },
        { date: '2024-01-14', count: 44 }
      ],
      callsByStatus: [
        { status: 'completed', count: 189 },
        { status: 'failed', count: 32 },
        { status: 'abandoned', count: 26 }
      ],
      topOutcomes: [
        { outcome: 'Resolved', count: 89 },
        { outcome: 'Follow-up scheduled', count: 45 },
        { outcome: 'Information provided', count: 32 },
        { outcome: 'Escalated', count: 23 }
      ],
      minutesUsed: 752,
      minutesLimit: 1000,
      campaignStats: {
        totalCampaigns: 3,
        activeCampaigns: 1,
        totalLeads: 1250,
        leadsContacted: 456
      },
      successRate: 76.5,
      avgDuration: 447,
      costPerCall: 0.12,
      callVolumeData: [
        { date: '2024-01-08', calls: 32 },
        { date: '2024-01-09', calls: 28 },
        { date: '2024-01-10', calls: 35 }
      ],
      performanceData: [
        { date: '2024-01-08', success_rate: 75.2 },
        { date: '2024-01-09', success_rate: 78.1 },
        { date: '2024-01-10', success_rate: 72.8 }
      ],
      callOutcomeData: [
        { name: 'Success', value: 189, color: '#10B981' },
        { name: 'Failed', value: 32, color: '#EF4444' },
        { name: 'Abandoned', value: 26, color: '#F59E0B' }
      ],
      topScripts: [
        { name: 'Sales Script A', success_rate: 82.5, total_calls: 125 },
        { name: 'Support Script B', success_rate: 78.2, total_calls: 89 }
      ]
    };
  }

  private static getEmptyAnalytics(): AnalyticsData {
    return {
      totalCalls: 0,
      totalMinutes: 0,
      successfulCalls: 0,
      averageCallDuration: 0,
      callsByDay: [],
      callsByStatus: [],
      topOutcomes: [],
      minutesUsed: 0,
      minutesLimit: 50000, // Default Enterprise plan limit
      campaignStats: {
        totalCampaigns: 0,
        activeCampaigns: 0,
        totalLeads: 0,
        leadsContacted: 0
      },
      successRate: 0,
      avgDuration: 0,
      costPerCall: 0,
      callVolumeData: [],
      performanceData: [],
      callOutcomeData: [],
      topScripts: []
    };
  }

  // @ts-expect-error: Demo data method
  private static getDemoSystemStatus(): SystemStatus[] {
    return [
      {
        id: 'status-1',
        service_name: 'api',
        status: 'operational',
        started_at: '2024-01-15T00:00:00Z',
        created_at: '2024-01-15T00:00:00Z'
      },
      {
        id: 'status-2',
        service_name: 'calls',
        status: 'operational',
        started_at: '2024-01-15T00:00:00Z',
        created_at: '2024-01-15T00:00:00Z'
      }
    ];
  }

  // @ts-expect-error: Demo data method  
  private static getDemoActiveCalls(): any[] {
    return [
      {
        id: 'active-call-1',
        agent_id: 'agent-1',
        agent_name: 'Customer Service Agent',
        phone_number_from: '+1 (555) 123-4567',
        phone_number_to: '+1 (555) 987-6543',
        direction: 'inbound',
        status: 'in_progress',
        started_at: new Date(Date.now() - 120000).toISOString(), // 2 minutes ago
        duration_seconds: 120,
        customer_name: 'Sarah Johnson',
        call_quality: 'excellent'
      },
      {
        id: 'active-call-2',
        agent_id: 'agent-2',
        agent_name: 'Sales Agent',
        phone_number_from: '+1 (555) 987-6543',
        phone_number_to: '+1 (555) 456-7890',
        direction: 'outbound',
        status: 'in_progress',
        started_at: new Date(Date.now() - 45000).toISOString(), // 45 seconds ago
        duration_seconds: 45,
        customer_name: 'Mike Chen',
        call_quality: 'good'
      }
    ];
  }

  // Enhanced call logs with time filtering
  static async getCallLogsWithTimeRange(profileId: string, timeRange: string = '30d', limit = 1000): Promise<CallLog[]> {
    let daysBack = 30;
    switch (timeRange) {
      case '7d': daysBack = 7; break;
      case '30d': daysBack = 30; break;
      case '90d': daysBack = 90; break;
      case '1y': daysBack = 365; break;
      default: daysBack = 30;
    }

    const startDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('call_logs')
      .select(`
        *,
        campaigns(name)
      `)
      .eq('profile_id', profileId)
      .gte('created_at', startDate)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching filtered call logs:', error);
      return [];
    }

    return data || [];
  }

  // Additional helper methods
  static async getAllCallLogs(profileId: string): Promise<CallLog[]> {
    return this.getCallLogs(profileId, 1000, 0);
  }

  static async getSubscription(profileId: string): Promise<Subscription | null> {

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('profile_id', profileId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching subscription:', error);
      return null;
    }

    return data;
  }

  static async getUsageRecords(profileId: string): Promise<UsageRecord[]> {

    const { data, error } = await supabase
      .from('usage_records')
      .select('*')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching usage records:', error);
      return [];
    }

    return data || [];
  }

  static async createCheckoutSession(profileId: string, planId: string): Promise<string> {
    // In a real implementation, this would call Stripe API
    return `https://checkout.stripe.com/pay/cs_test_${planId}_${profileId}`;
  }

  static async cancelSubscription(subscriptionId: string): Promise<boolean> {

    const { error } = await supabase
      .from('subscriptions')
      .update({
        cancel_at_period_end: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', subscriptionId);

    if (error) {
      console.error('Error cancelling subscription:', error);
      throw error;
    }

    return true;
  }

  static async createWebhookEndpoint(webhook: Omit<WebhookEndpoint, 'id' | 'created_at' | 'updated_at' | 'success_count' | 'failure_count'>): Promise<WebhookEndpoint> {

    const { data, error } = await supabase
      .from('webhook_endpoints')
      .insert({
        ...webhook,
        success_count: 0,
        failure_count: 0
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating webhook endpoint:', error);
      throw error;
    }

    return data;
  }

  static async updateWebhookEndpoint(id: string, updates: Partial<WebhookEndpoint>): Promise<WebhookEndpoint> {

    const { data, error } = await supabase
      .from('webhook_endpoints')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating webhook endpoint:', error);
      throw error;
    }

    return data;
  }

  static async deleteWebhookEndpoint(id: string): Promise<boolean> {

    const { error } = await supabase
      .from('webhook_endpoints')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting webhook endpoint:', error);
      throw error;
    }

    return true;
  }

  static async testWebhookEndpoint(id: string): Promise<boolean> {

    // In a real implementation, this would trigger a test webhook
    console.log('Testing webhook endpoint:', id);
    return true;
  }

  static async bulkAddDNCEntries(entries: Omit<DNCEntry, 'id' | 'created_at'>[]): Promise<DNCEntry[]> {

    const { data, error } = await supabase
      .from('dnc_lists')
      .insert(entries)
      .select();

    if (error) {
      console.error('Error bulk adding DNC entries:', error);
      throw error;
    }

    return data || [];
  }

  static async checkDNCStatus(phoneNumber: string, profileId: string): Promise<boolean> {

    const { data, error } = await supabase
      .from('dnc_lists')
      .select('id')
      .eq('profile_id', profileId)
      .eq('phone_number', phoneNumber)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking DNC status:', error);
      return false;
    }

    return !!data;
  }

  static async bulkCreateCampaignLeads(leads: Omit<CampaignLead, 'id' | 'created_at' | 'updated_at'>[]): Promise<CampaignLead[]> {

    const { data, error } = await supabase
      .from('campaign_leads')
      .insert(leads)
      .select();

    if (error) {
      console.error('Error bulk creating campaign leads:', error);
      throw error;
    }

    return data || [];
  }

  static async createCampaignLead(lead: Omit<CampaignLead, 'id' | 'created_at' | 'updated_at'>): Promise<CampaignLead | null> {

    const { data, error } = await supabase
      .from('campaign_leads')
      .insert(lead)
      .select()
      .single();

    if (error) {
      console.error('Error creating campaign lead:', error);
      throw error;
    }

    return data;
  }

  // New methods for the 5 enhanced features

  // Live call monitoring methods
  static async getLiveCalls(profileId: string): Promise<any[]> {

    const { data, error } = await supabase
      .from('live_calls')
      .select(`
        *,
        ai_agents!inner(name, agent_type, voice_name)
      `)
      .eq('profile_id', profileId)
      .order('started_at', { ascending: false });

    if (error) {
      console.error('Error fetching live calls:', error);
      return [];
    }

    return data || [];
  }

  static async updateLiveCallStatus(callId: string, status: string, metadata: any = {}): Promise<boolean> {

    const { error } = await supabase
      .from('live_calls')
      .update({ 
        status,
        last_updated: new Date().toISOString(),
        metadata
      })
      .eq('id', callId);

    if (error) {
      console.error('Error updating live call status:', error);
      return false;
    }

    return true;
  }

  // Webhook event methods
  static async logWebhookEvent(event: {
    profile_id?: string
    event_type: string
    call_id?: string
    agent_id?: string
    event_data: any
  }): Promise<boolean> {

    const { error } = await supabase
      .from('webhook_events')
      .insert(event);

    if (error) {
      console.error('Error logging webhook event:', error);
      return false;
    }

    return true;
  }

  static async getWebhookEvents(profileId: string, limit = 50): Promise<any[]> {

    const { data, error } = await supabase
      .from('webhook_events')
      .select('*')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching webhook events:', error);
      return [];
    }

    return data || [];
  }

  // Auto-dialer queue methods
  static async addToDialerQueue(entry: {
    profile_id: string
    campaign_id: string
    lead_id: string
    agent_id?: string
    priority?: string
    scheduled_at?: string
  }): Promise<boolean> {

    const { error } = await supabase
      .from('dialer_queue')
      .insert(entry);

    if (error) {
      console.error('Error adding to dialer queue:', error);
      return false;
    }

    return true;
  }

  static async getDialerQueue(profileId: string, campaignId?: string): Promise<any[]> {

    let query = supabase
      .from('dialer_queue')
      .select(`
        *,
        campaign_leads!inner(phone_number, first_name, last_name, email, company),
        ai_agents(name)
      `)
      .eq('profile_id', profileId)
      .in('status', ['queued', 'dialing']);

    if (campaignId) {
      query = query.eq('campaign_id', campaignId);
    }

    const { data, error } = await query
      .order('priority', { ascending: false })
      .order('scheduled_at', { ascending: true });

    if (error) {
      console.error('Error fetching dialer queue:', error);
      return [];
    }

    return data || [];
  }

  static async updateDialerQueueStatus(queueId: string, status: string, metadata: any = {}): Promise<boolean> {

    const updateData: any = { 
      status,
      updated_at: new Date().toISOString()
    };

    if (status === 'dialing') {
      updateData.started_at = new Date().toISOString();
    } else if (status === 'completed' || status === 'failed') {
      updateData.completed_at = new Date().toISOString();
    }

    if (Object.keys(metadata).length > 0) {
      updateData.metadata = metadata;
    }

    const { error } = await supabase
      .from('dialer_queue')
      .update(updateData)
      .eq('id', queueId);

    if (error) {
      console.error('Error updating dialer queue status:', error);
      return false;
    }

    return true;
  }

  // Campaign metrics methods
  static async getCampaignMetrics(profileId: string, campaignId?: string, days = 30): Promise<any[]> {

    let query = supabase
      .from('campaign_metrics')
      .select(`
        *,
        campaigns!inner(name)
      `)
      .eq('profile_id', profileId)
      .gte('date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

    if (campaignId) {
      query = query.eq('campaign_id', campaignId);
    }

    const { data, error } = await query.order('date', { ascending: false });

    if (error) {
      console.error('Error fetching campaign metrics:', error);
      return [];
    }

    return data || [];
  }

  static async updateCampaignMetrics(profileId: string, campaignId: string, date: string, metrics: any): Promise<boolean> {

    const { error } = await supabase
      .from('campaign_metrics')
      .upsert({
        profile_id: profileId,
        campaign_id: campaignId,
        date,
        ...metrics,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error updating campaign metrics:', error);
      return false;
    }

    return true;
  }

  // System metrics methods
  static async getSystemMetrics(profileId?: string): Promise<any[]> {

    let query = supabase
      .from('system_metrics')
      .select('*')
      .gte('recorded_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24 hours

    if (profileId) {
      query = query.eq('profile_id', profileId);
    }

    const { data, error } = await query.order('recorded_at', { ascending: false });

    if (error) {
      console.error('Error fetching system metrics:', error);
      return [];
    }

    return data || [];
  }

  static async recordSystemMetric(metric: {
    metric_name: string
    metric_value: number
    metric_unit?: string
    profile_id?: string
    agent_id?: string
    metadata?: any
  }): Promise<boolean> {

    const { error } = await supabase
      .from('system_metrics')
      .insert(metric);

    if (error) {
      console.error('Error recording system metric:', error);
      return false;
    }

    return true;
  }

  // Function call logging methods
  static async logFunctionCall(log: {
    profile_id?: string
    call_id: string
    function_name: string
    parameters: any
    result?: any
    execution_time_ms?: number
    success?: boolean
    error_message?: string
  }): Promise<boolean> {

    const { error } = await supabase
      .from('function_call_logs')
      .insert(log);

    if (error) {
      console.error('Error logging function call:', error);
      return false;
    }

    return true;
  }

  // Demo data methods for new features
  // @ts-expect-error: Demo data method
  private static getDemoCampaignMetrics(): any[] {
    return [
      {
        id: 'metric-1',
        campaign_id: 'demo-campaign-1',
        date: new Date().toISOString().split('T')[0],
        leads_queued: 100,
        leads_dialed: 85,
        leads_connected: 42,
        leads_completed: 15,
        conversion_rate: 17.6,
        revenue_generated: 2500.00,
        campaigns: { name: 'Demo Sales Campaign' }
      },
      {
        id: 'metric-2',
        campaign_id: 'demo-campaign-1',
        date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        leads_queued: 120,
        leads_dialed: 95,
        leads_connected: 48,
        leads_completed: 18,
        conversion_rate: 18.9,
        revenue_generated: 3200.00,
        campaigns: { name: 'Demo Sales Campaign' }
      }
    ];
  }

  // @ts-expect-error: Demo data method
  private static getDemoSystemMetrics(): any[] {
    return [
      {
        id: 'sys-metric-1',
        metric_name: 'active_calls',
        metric_value: 3,
        metric_unit: 'count',
        recorded_at: new Date().toISOString()
      },
      {
        id: 'sys-metric-2',
        metric_name: 'api_response_time',
        metric_value: 145.5,
        metric_unit: 'milliseconds',
        recorded_at: new Date().toISOString()
      },
      {
        id: 'sys-metric-3',
        metric_name: 'system_load',
        metric_value: 65.2,
        metric_unit: 'percentage',
        recorded_at: new Date().toISOString()
      }
    ];
  }

  // Live calls operations
  static async getActiveCalls(profileId: string): Promise<ActiveCall[]> {

    const { data, error } = await supabase
      .from('call_logs')
      .select(`
        *,
        ai_agents(name)
      `)
      .eq('profile_id', profileId)
      .eq('status', 'in_progress');

    if (error) {
      console.error('Error fetching active calls:', error);
      return [];
    }

    return (data || []).map((call: any) => ({
      ...call,
      agent_name: call.ai_agents?.name || 'Unknown Agent',
      call_quality: 'good' as const
    }));
  }

  static async getAgentStatuses(profileId: string): Promise<AIAgent[]> {

    const { data, error } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('profile_id', profileId);

    if (error) {
      console.error('Error fetching agent statuses:', error);
      return [];
    }

    return data || [];
  }

  static async getCallQueue(profileId: string): Promise<CallLog[]> {
    // First, clean up old pending calls (older than 30 minutes)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    
    await supabaseAdmin
      .from('call_logs')
      .update({ 
        status: 'abandoned',
        updated_at: new Date().toISOString()
      })
      .eq('profile_id', profileId)
      .eq('status', 'pending')
      .lt('created_at', thirtyMinutesAgo);

    // Then get actual queued calls (only recent pending calls)
    const { data, error } = await supabase
      .from('call_logs')
      .select('*')
      .eq('profile_id', profileId)
      .eq('status', 'pending')
      .gte('created_at', thirtyMinutesAgo) // Only calls from last 30 minutes
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching call queue:', error);
      return [];
    }

    return data || [];
  }

  static async emergencyStopAllCalls(profileId: string): Promise<void> {

    const { error } = await supabase
      .from('call_logs')
      .update({ status: 'failed' })
      .eq('profile_id', profileId)
      .eq('status', 'in_progress');

    if (error) {
      console.error('Error stopping calls:', error);
      throw error;
    }
  }

  // Phone number operations
  static async getPhoneNumbers(profileId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('phone_numbers')
      .select('*')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching phone numbers:', error);
      return [];
    }

    return data || [];
  }

  static async createPhoneNumber(phoneNumberData: any): Promise<any> {
    const { data, error } = await supabaseAdmin
      .from('phone_numbers')
      .insert(phoneNumberData)
      .select()
      .single();

    if (error) {
      console.error('Error creating phone number:', error);
      throw error;
    }

    return data;
  }

  static async updatePhoneNumber(id: string, updates: any): Promise<any> {
    const { data, error } = await supabaseAdmin
      .from('phone_numbers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating phone number:', error);
      throw error;
    }

    return data;
  }

  static async deletePhoneNumber(id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('phone_numbers')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting phone number:', error);
      throw error;
    }
  }

  // IVR management operations
  static async getIVRMenus(profileId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('ivr_menus')
      .select(`
        *,
        ivr_options (*)
      `)
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching IVR menus:', error);
      return [];
    }

    return data || [];
  }

  static async createIVRMenu(menuData: any): Promise<any> {
    const { data, error } = await supabaseAdmin
      .from('ivr_menus')
      .insert(menuData)
      .select()
      .single();

    if (error) {
      console.error('Error creating IVR menu:', error);
      throw error;
    }

    return data;
  }

  static async updateIVRMenu(id: string, updates: any): Promise<any> {
    const { data, error } = await supabaseAdmin
      .from('ivr_menus')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating IVR menu:', error);
      throw error;
    }

    return data;
  }

  static async deleteIVRMenu(id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('ivr_menus')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting IVR menu:', error);
      throw error;
    }
  }

  // Delete a lead from campaign
  static async deleteLead(campaignId: string, leadId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('campaign_leads')
        .delete()
        .eq('id', leadId)
        .eq('campaign_id', campaignId);

      if (error) {
        console.error('Error deleting lead:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error deleting lead:', error);
      return false;
    }
  }

  // Update lead status
  static async updateLeadStatus(
    campaignId: string, 
    leadId: string, 
    status: CampaignLead['status']
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('campaign_leads')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', leadId)
        .eq('campaign_id', campaignId);

      if (error) {
        console.error('Error updating lead status:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error updating lead status:', error);
      return false;
    }
  }

  // Campaign control operations
  static async startCampaign(campaignId: string): Promise<boolean> {
    try {
      console.log(`🚀 Starting campaign ${campaignId}...`);
      
      // Get the current user's session token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
                                                                                                           throw new Error('User not authenticated');
      }
      
      // Check if we're in the browser and get the correct API URL
      const apiUrl = typeof window !== 'undefined' 
        ? (process.env.NODE_ENV === 'production' 
            ? window.location.origin 
            : (window.location.hostname === 'localhost')
              ? 'http://localhost:12001'
              : window.location.hostname.includes('app.github.dev')
                ? `${window.location.protocol}//${window.location.hostname.replace('-3000', '-12001')}`
                : `${window.location.protocol}//${window.location.hostname}:12001`)
        : 'http://localhost:12001';

      const fullUrl = `${apiUrl}/api/campaigns/${campaignId}/start`;
      console.log(`📡 Making request to: ${fullUrl}`);
      
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      console.log(`📊 Response status: ${response.status}`);

      if (!response.ok) {
        let errorMessage = 'Failed to start campaign';
        try {
          const error = await response.json();
          errorMessage = error.error || error.message || errorMessage;
          console.error('❌ Campaign start error response:', error);
        } catch (e) {
          console.error('❌ Failed to parse error response:', e);
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('✅ Campaign started successfully:', result);
      return true;
    } catch (error) {
      console.error('💥 Error starting campaign:', error);
      throw error;
    }
  }

  static async pauseCampaign(campaignId: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}/pause`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to pause campaign');
      }

      return true;
    } catch (error) {
      console.error('Error pausing campaign:', error);
      throw error;
    }
  }

  static async stopCampaign(campaignId: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to stop campaign');
      }

      return true;
    } catch (error) {
      console.error('Error stopping campaign:', error);
      throw error;
    }
  }

  static async getCampaignDialerStatus(campaignId: string): Promise<{
    campaignId: string;
    name: string;
    databaseStatus: string;
    dialerActive: boolean;
    dialerRunning: boolean;
    lastUpdated: string;
  }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}/dialer-status`);

      if (!response.ok) {
        throw new Error('Failed to get dialer status');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting dialer status:', error);
      throw error;
    }
  }

  static async getMultipleCampaignDialerStatus(campaignIds: string[]): Promise<{
    statuses: Array<{
      campaignId: string;
      dialerActive: boolean;
      dialerRunning: boolean;
    }>;
    lastUpdated: string;
  }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/campaigns/dialer-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ campaignIds })
      });

      if (!response.ok) {
        throw new Error('Failed to get dialer statuses');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting dialer statuses:', error);
      throw error;
    }
  }

  // Enhanced Campaign Analytics Methods
  static async getCampaignAnalytics(campaignId?: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_campaign_analytics', {
          campaign_id_param: campaignId || null
        });

      if (error) {
        console.error('Error fetching campaign analytics:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Campaign analytics RPC not available, using fallback:', error);
      return this.getCampaignAnalyticsFallback(campaignId);
    }
  }

  static async getCampaignDashboard(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('campaign_dashboard')
        .select('*')
        .order('last_call_time', { ascending: false });

      if (error) {
        console.error('Error fetching campaign dashboard:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getCampaignDashboard:', error);
      return [];
    }
  }

  static async getCallHistoryDetailed(campaignId?: string, limit = 100): Promise<any[]> {
    try {
      let query = supabase
        .from('call_history_detailed')
        .select('*')
        .order('call_time', { ascending: false })
        .limit(limit);

      if (campaignId) {
        query = query.eq('campaign_id', campaignId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching call history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getCallHistoryDetailed:', error);
      return [];
    }
  }

  static async getQualifiedLeadsForExport(campaignId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_qualified_leads_for_export', { campaign_uuid: campaignId });

      if (error) {
        console.error('Error fetching qualified leads for export:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getQualifiedLeadsForExport:', error);
      return [];
    }
  }

  static async exportToGoogleSheets(campaignId: string, leads: any[]): Promise<boolean> {
    try {
      // This would integrate with Google Sheets API
      // For now, we'll just mark the leads as synced
      const leadIds = leads.map(lead => lead.lead_id);
      
      const { error } = await supabase
        .from('google_sheets_sync')
        .upsert(leadIds.map(id => ({
          lead_id: id,
          campaign_id: campaignId, // Use campaignId here
          synced_to_sheets: true,
          last_sync_at: new Date().toISOString()
        })));

      if (error) {
        console.error('Error updating Google Sheets sync status:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in exportToGoogleSheets:', error);
      return false;
    }
  }

  static async triggerZapierWebhook(campaignId: string, leads: any[]): Promise<boolean> {
    try {
      // This would trigger Zapier webhook
      // For now, we'll just mark the leads as webhook sent
      const leadIds = leads.map(lead => lead.lead_id);
      
      const { error } = await supabase
        .from('google_sheets_sync')
        .upsert(leadIds.map(id => ({
          lead_id: id,
          campaign_id: campaignId, // Use campaignId here
          zapier_webhook_sent: true,
          last_sync_at: new Date().toISOString()
        })));

      if (error) {
        console.error('Error updating Zapier webhook status:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in triggerZapierWebhook:', error);
      return false;
    }
  }

  static async getCallLogsByCampaign(campaignId: string): Promise<CallLog[]> {
    const { data, error } = await supabase
      .from('call_logs')
      .select(`
        *,
        campaigns(name),
        campaign_leads(first_name, last_name, phone_number, email)
      `)
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching call logs by campaign:', error);
      return [];
    }

    return data || [];
  }

  // Lead Data Collection Methods - Using simplified version
  static async getLeadDataByCampaign(campaignId: string) {
    const { data, error } = await supabase
      .from('lead_data')
      .select(`
        *,
        call_logs(call_sid, duration_seconds, recording_url, created_at),
        campaigns(name)
      `)
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching lead data by campaign:', error);
      return [];
    }

    return data || [];
  }

  static async getCampaignAnalyticsFallback(campaignId?: string) {
    let query = supabase
      .from('call_logs')
      .select(`
        *,
        campaigns!inner(id, name),
        lead_data(*)
      `)
      .eq('direction', 'outbound');

    if (campaignId && campaignId !== 'all') {
      query = query.eq('campaign_id', campaignId);
    }

    const { data: calls, error } = await query;

    if (error) {
      console.error('Error in fallback analytics:', error);
      return [];
    }

    // Process the data to create analytics
    const campaignStats = new Map();

    calls?.forEach((call: any) => {
      const campaign = call.campaigns;
      if (!campaign) return;

      if (!campaignStats.has(campaign.id)) {
        campaignStats.set(campaign.id, {
          campaign_id: campaign.id,
          campaign_name: campaign.name,
          total_calls: 0,
          answered_calls: 0,
          voicemail_calls: 0,
          no_answer_calls: 0,
          complete_data_collected: 0,
          partial_data_collected: 0,
          dnc_requests: 0,
          qualified_leads: 0,
          appointments_scheduled: 0,
          avg_call_duration: 0,
          answer_rate: 0,
          completion_rate: 0,
          data_quality_score: 0
        });
      }

      const stats = campaignStats.get(campaign.id);
      stats.total_calls++;

      // Determine if call was answered
      const answered = call.status === 'completed' && (call.duration_seconds || 0) > 30;
      if (answered) stats.answered_calls++;

      // Check outcomes
      if (call.outcome === 'voicemail') stats.voicemail_calls++;
      if (call.outcome === 'no_answer') stats.no_answer_calls++;

      // Check lead data quality
      const leadData = call.lead_data?.[0];
      if (leadData) {
        if (leadData.data_completeness_score >= 90) stats.complete_data_collected++;
        else if (leadData.data_completeness_score >= 50) stats.partial_data_collected++;
        
        if (leadData.dnc_requested) stats.dnc_requests++;
        if (leadData.qualified_lead) stats.qualified_leads++;
        if (leadData.appointment_scheduled) stats.appointments_scheduled++;
      }
    });

    // Calculate rates
    campaignStats.forEach(stats => {
      stats.answer_rate = stats.total_calls > 0 ? (stats.answered_calls / stats.total_calls) * 100 : 0;
      stats.completion_rate = stats.answered_calls > 0 ? (stats.complete_data_collected / stats.answered_calls) * 100 : 0;
    });

    return Array.from(campaignStats.values());
  }

  static async getLeadData(callId: string) {
    const { data, error } = await supabase
      .from('lead_data')
      .select('*')
      .eq('call_id', callId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching lead data:', error);
      return null;
    }

    return data;
  }

  static async saveLeadData(leadData: any) {
    const { data, error } = await supabase
      .from('lead_data')
      .upsert(leadData, { 
        onConflict: 'call_id',
        ignoreDuplicates: false 
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving lead data:', error);
      throw error;
    }

    return data;
  }

  static async getLeadDataExport(campaignId?: string) {
    try {
      const { data, error } = await supabase
        .rpc('get_lead_data_export', {
          campaign_id_param: campaignId || null
        });

      if (error) {
        console.error('Error fetching lead data export:', error);
        return this.getLeadDataExportFallback(campaignId);
      }

      return data || [];
    } catch (error) {
      console.error('Lead data export RPC not available, using fallback:', error);
      return this.getLeadDataExportFallback(campaignId);
    }
  }

  static async getLeadDataExportFallback(campaignId?: string) {
    let query = supabase
      .from('call_logs')
      .select(`
        *,
        campaigns!inner(name),
        lead_data(*)
      `)
      .eq('direction', 'outbound')
      .order('started_at', { ascending: false });

    if (campaignId && campaignId !== 'all') {
      query = query.eq('campaign_id', campaignId);
    }

    const { data: calls, error } = await query;

    if (error) {
      console.error('Error in fallback export:', error);
      return [];
    }

    return calls?.map((call: any) => {
      const leadData = call.lead_data?.[0];
      return {
        campaign_name: call.campaigns?.name || 'Unknown',
        phone_number: call.phone_number_to,
        full_name: leadData?.full_name || '',
        email: leadData?.email || '',
        current_address: leadData ? [
          leadData.current_street,
          leadData.current_city,
          leadData.current_state,
          leadData.current_zip
        ].filter(Boolean).join(', ') : '',
        internet_plan: leadData?.internet_plan_name || '',
        install_date: leadData?.preferred_install_date || '',
        payment_method: leadData?.payment_method || '',
        data_completeness: leadData?.data_completeness_score || 0,
        call_outcome: call.outcome || call.status,
        dnc_requested: leadData?.dnc_requested || false,
        qualified_lead: leadData?.qualified_lead || false,
        appointment_scheduled: leadData?.appointment_scheduled || false,
        call_date: call.started_at
      };
    }) || [];
  }

  static async updateLeadDataCompleteness(callId: string) {
    const leadData = await this.getLeadData(callId);
    if (!leadData) return;

    // Calculate completeness score
    const requiredFields = [
      'full_name', 'email', 'current_street', 'current_city', 
      'current_state', 'current_zip', 'internet_plan_name', 
      'preferred_install_date', 'payment_method'
    ];

    const completedFields = requiredFields.filter(field => leadData[field]);
    const completenessScore = (completedFields.length / requiredFields.length) * 100;
    const missingFields = requiredFields.filter(field => !leadData[field]);

    const updates = {
      data_completeness_score: completenessScore,
      missing_fields: missingFields,
      data_quality_grade: completenessScore >= 90 ? 'A' : 
                         completenessScore >= 80 ? 'B' : 
                         completenessScore >= 70 ? 'C' : 
                         completenessScore >= 60 ? 'D' : 'F'
    };

    await supabase
      .from('lead_data')
      .update(updates)
      .eq('call_id', callId);
  }
}