// Generated TypeScript types for 100% Database-API-UI alignment
// This file ensures complete type safety across all layers

export type DatabaseTables = {
  // Core User Management
  profiles: Profile
  users: User
  admin_roles: AdminRole

  // AI Agent Management
  ai_agents: AIAgent
  agent_performance: AgentPerformance
  agent_zaps: AgentZap

  // Campaign & Lead Management
  campaigns: Campaign
  campaign_leads: CampaignLead
  campaign_metrics: CampaignMetrics
  leads: Lead

  // Call Management
  call_logs: CallLog
  live_calls: LiveCall
  call_recordings: CallRecording
  call_sessions: CallSession
  call_queues: CallQueue
  dialer_queue: DialerQueue
  call_routing_rules: CallRoutingRule
  call_scripts: CallScript

  // Communication & Routing
  ivr_menus: IVRMenu
  ivr_options: IVROption
  phone_numbers: PhoneNumber

  // Analytics & Monitoring
  analytics_data: AnalyticsData
  system_metrics: SystemMetrics
  system_status: SystemStatus

  // Compliance & DNC
  dnc_lists: DNCEntry
  dnc_entries: DNCEntry
  dnc_list: DNCEntry
  compliance_reports: ComplianceReport

  // Integrations
  integrations: Integration
  integration_settings: IntegrationSettings
  external_integrations: ExternalIntegration
  ghl_contacts: GHLContact
  ghl_function_calls: GHLFunctionCall
  zapier_integrations: ZapierIntegration
  zapier_function_calls: ZapierFunctionCall

  // Webhooks & Events
  webhooks: Webhook
  webhook_endpoints: WebhookEndpoint
  webhook_events: WebhookEvent
  webhook_deliveries: WebhookDelivery

  // Billing & Subscriptions
  billing: Billing
  subscriptions: Subscription
  usage_records: UsageRecord

  // Appointments & Scheduling
  appointments: Appointment

  // Function Calls & Logging
  function_call_logs: FunctionCallLog

  // Knowledge Base
  knowledge_base: KnowledgeBase

  // API Management
  api_keys: APIKey
}

// User Management Types
export interface Profile {
  id: string
  user_id?: string
  email?: string
  full_name?: string
  client_name?: string
  company_name?: string
  phone_number?: string
  plan_name: 'starter' | 'grow' | 'pro' | 'scale'
  monthly_minute_limit: number
  minutes_used: number
  used_minutes?: number
  usage_cap?: number
  is_active: boolean
  can_use_inbound: boolean
  can_use_outbound_dialer: boolean
  max_concurrent_calls: number
  twilio_phone_number?: string
  twilio_account_sid?: string
  twilio_auth_token?: string
  gemini_api_key?: string
  gemini_model?: string
  routing_strategy?: string
  call_recording_enabled?: boolean
  transcription_enabled?: boolean
  permissions?: Record<string, any>
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  email: string
  role: string
  subscription_plan?: string
  max_agents?: number
  minutes_limit?: number
  minutes_used?: number
  allowed_features?: string[]
  created_at: string
  updated_at: string
}

export interface AdminRole {
  id: string
  profile_id: string
  role_type: string
  is_active: boolean
  granted_by?: string
  granted_at?: string
}

// AI Agent Types
export interface AIAgent {
  id: string
  profile_id: string
  name: string
  description?: string
  greeting?: string
  system_prompt?: string
  system_instruction?: string
  agent_type: 'customer_service' | 'sales' | 'support' | 'appointment_booking' | 'survey' | 'after_hours' | 'general'
  call_direction: 'inbound' | 'outbound' | 'both'
  voice_name: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Aoede' | 'Leda' | 'Orus' | 'Zephyr'
  voice_settings?: Record<string, any>
  language_code: string
  twilio_phone_number?: string
  twilio_webhook_url?: string
  business_hours_start?: string
  business_hours_end?: string
  business_days?: number[]
  timezone?: string
  is_active: boolean
  max_concurrent_calls: number
  escalation_enabled?: boolean
  escalation_type?: 'human_agent' | 'supervisor' | 'voicemail' | 'callback'
  escalation_phone_number?: string
  escalation_email?: string
  status?: 'available' | 'busy' | 'offline'
  created_at: string
  updated_at: string
}

export interface AgentPerformance {
  id: string
  profile_id: string
  agent_id: string
  date: string
  calls_handled: number
  avg_duration: number
  success_rate: number
  created_at: string
}

export interface AgentZap {
  id: string
  agent_id: string
  name: string
  description?: string
  webhook_url: string
  parameter_schema?: Record<string, any>
  created_at: string
  updated_at: string
}

// Campaign & Lead Types
export interface Campaign {
  id: string
  profile_id: string
  agent_id?: string
  name: string
  description?: string
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled'
  caller_id: string
  script?: string
  target_audience?: string
  max_concurrent_calls: number
  call_timeout_seconds: number
  retry_attempts: number
  retry_delay_minutes: number
  start_time?: string
  end_time?: string
  timezone: string
  days_of_week: number[]
  scheduled_start_date?: string
  scheduled_end_date?: string
  custom_system_instruction?: string
  custom_voice_name?: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Aoede' | 'Leda' | 'Orus' | 'Zephyr'
  priority: string
  compliance_settings?: Record<string, any>
  total_leads: number
  leads_total?: number
  leads_called: number
  leads_answered: number
  leads_completed: number
  conversion_rate?: number
  created_at: string
  updated_at: string
}

export interface OutboundCampaign {
  id: string
  profile_id: string
  agent_id?: string
  name: string
  description?: string
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled'
  caller_id: string
  script?: string
  max_concurrent_calls: number
  call_timeout_seconds: number
  retry_attempts: number
  retry_delay_minutes: number
  start_time?: string
  end_time?: string
  timezone: string
  days_of_week: number[]
  scheduled_start_date?: string
  scheduled_end_date?: string
  custom_system_instruction?: string
  custom_voice_name?: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Aoede' | 'Leda' | 'Orus' | 'Zephyr'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  compliance_settings?: Record<string, any>
  total_leads: number
  leads_called: number
  leads_answered: number
  leads_completed: number
  created_at: string
  updated_at: string
}

export interface CampaignLead {
  id: string
  campaign_id: string
  profile_id: string
  phone_number: string
  first_name?: string
  last_name?: string
  email?: string
  company?: string
  title?: string
  status: 'pending' | 'called' | 'answered' | 'no_answer' | 'busy' | 'failed' | 'completed'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  call_attempts: number
  last_call_at?: string
  next_call_at?: string
  outcome?: string
  notes?: string
  metadata?: Record<string, any>
  tags?: string[]
  do_not_call?: boolean
  preferred_call_time?: string
  timezone?: string
  created_at: string
  updated_at: string
}

export interface CampaignMetrics {
  id: string
  profile_id: string
  campaign_id: string
  date: string
  leads_queued: number
  leads_dialed: number
  leads_connected: number
  leads_completed: number
  leads_failed: number
  conversion_rate: number
  cost_per_call?: number
  revenue_generated?: number
  roi_percentage?: number
  average_call_duration_seconds?: number
  total_talk_time_seconds?: number
  created_at: string
  updated_at: string
}

export interface Lead {
  id: string
  campaign_id?: string
  phone_number: string
  first_name?: string
  last_name?: string
  email?: string
  company?: string
  title?: string
  status: 'pending' | 'called' | 'answered' | 'no_answer' | 'busy' | 'failed' | 'completed'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  call_attempts: number
  last_call_at?: string
  next_call_at?: string
  outcome?: string
  notes?: string
  metadata?: Record<string, any>
  custom_fields?: Record<string, any>
  tags?: string[]
  do_not_call: boolean
  preferred_call_time?: string
  timezone?: string
  created_at: string
  updated_at: string
}

// Call Management Types
export interface CallLog {
  id: string
  profile_id: string
  agent_id?: string
  campaign_id?: string
  lead_id?: string
  phone_number_from: string
  phone_number_to: string
  direction: 'inbound' | 'outbound'
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'abandoned'
  started_at: string
  ended_at?: string
  duration_seconds: number
  call_summary?: string
  transcript?: string
  recording_url?: string
  sentiment_score?: number
  outcome?: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  customer_satisfaction_score?: number
  follow_up_required: boolean
  follow_up_date?: string
  tags?: string[]
  metadata?: Record<string, any>
  created_at: string
  campaigns?: {
    name: string
  }
}

export interface LiveCall {
  id: string
  profile_id: string
  call_id: string
  call_log_id?: string
  agent_id?: string
  agent_name?: string
  customer_name?: string
  customer_phone?: string
  phone_number_from?: string
  phone_number_to?: string
  direction: 'inbound' | 'outbound'
  status: string
  call_quality?: string
  started_at?: string
  last_updated?: string
  metadata?: Record<string, any>
  created_at: string
}

export interface CallRecording {
  id: string
  call_id: string
  recording_url: string
  duration_seconds: number
  file_size_bytes?: number
  created_at: string
}

export interface CallSession {
  id: string
  call_id: string
  session_data: Record<string, any>
  created_at: string
  updated_at: string
}

export interface CallQueue {
  id: string
  profile_id: string
  phone_number: string
  priority: number
  estimated_wait_time?: number
  created_at: string
}

export interface DialerQueue {
  id: string
  profile_id: string
  campaign_id: string
  lead_id: string
  agent_id?: string
  status: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  scheduled_at?: string
  started_at?: string
  completed_at?: string
  retry_count: number
  last_error?: string
  metadata?: Record<string, any>
  created_at: string
  updated_at: string
}

export interface CallRoutingRule {
  id: string
  profile_id: string
  name: string
  conditions: Record<string, any>
  actions: Record<string, any>
  is_active: boolean
  priority: number
  created_at: string
  updated_at: string
}

export interface CallScript {
  id: string
  profile_id: string
  name: string
  content: string
  agent_id?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// Communication & Routing Types
export interface IVRMenu {
  id: string
  profile_id: string
  name: string
  greeting_text: string
  is_active: boolean
  created_at: string
  updated_at: string
  ivr_options?: IVROption[]
}

export interface IVROption {
  id: string
  ivr_menu_id: string
  digit: string
  description: string
  action_type: string
  agent_id?: string
  created_at: string
  updated_at: string
}

export interface PhoneNumber {
  id: string
  profile_id: string
  phone_number: string
  friendly_name?: string
  agent_id?: string
  is_primary: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

// Analytics & Monitoring Types
export interface AnalyticsData {
  id: string
  profile_id: string
  agent_id?: string
  date: string
  total_calls: number
  inbound_calls: number
  outbound_calls: number
  answered_calls: number
  missed_calls: number
  total_duration_seconds: number
  average_duration_seconds: number
  appointments_scheduled: number
  sales_completed: number
  escalations: number
  customer_satisfaction_avg?: number
  sentiment_score_avg?: number
  created_at: string
}

export interface SystemMetrics {
  id: string
  profile_id?: string
  agent_id?: string
  metric_name: string
  metric_value: number
  metric_unit?: string
  metadata?: Record<string, any>
  recorded_at: string
}

export interface SystemStatus {
  id: string
  service_name: 'api' | 'calls' | 'webhooks' | 'database' | 'ai' | 'analytics'
  status: 'operational' | 'degraded' | 'outage'
  message?: string
  started_at: string
  resolved_at?: string
  created_at: string
}

// Compliance & DNC Types
export interface DNCEntry {
  id: string
  profile_id: string
  phone_number: string
  added_date?: string
  source: 'customer_request' | 'legal_requirement' | 'manual' | 'complaint'
  reason?: string
  notes?: string
  expiry_date?: string
  is_active: boolean
  created_at: string
}

export interface ComplianceReport {
  id: string
  profile_id: string
  report_type: 'dnc_compliance' | 'tcpa_compliance' | 'call_recording_consent'
  report_period_start: string
  report_period_end: string
  report_data: Record<string, any>
  generated_at: string
  generated_by?: string
}

// Integration Types
export interface Integration {
  id: string
  user_id: string
  type: string
  credentials: Record<string, any>
  created_at: string
  updated_at: string
}

export interface IntegrationSettings {
  id: string
  profile_id: string
  service: string
  integration_type: string
  api_key?: string
  webhook_url?: string
  settings?: Record<string, any>
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ExternalIntegration {
  id: string
  profile_id: string
  name: string
  integration_type: string
  endpoint_url: string
  auth_token?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface GHLContact {
  id: string
  integration_id: string
  ghl_contact_id: string
  contact_data: Record<string, any>
  last_synced_at?: string
  created_at: string
  updated_at: string
}

export interface GHLFunctionCall {
  id: string
  profile_id: string
  function_name: string
  parameters: Record<string, any>
  result?: Record<string, any>
  created_at: string
  updated_at: string
}

export interface ZapierIntegration {
  id: string
  profile_id: string
  integration_name: string
  function_name: string
  webhook_url: string
  configuration?: Record<string, any>
  trigger_events?: string[]
  is_active: boolean
  max_retries?: number
  retry_count?: number
  last_success_at?: string
  last_failure_at?: string
  failure_reason?: string
  created_at: string
  updated_at: string
}

export interface ZapierFunctionCall {
  id: string
  profile_id: string
  integration_id: string
  call_log_id?: string
  function_name: string
  parameters: Record<string, any>
  response_data?: Record<string, any>
  status: string
  retry_count: number
  error_message?: string
  executed_at?: string
  created_at: string
}

// Webhook Types
export interface Webhook {
  id: string
  profile_id: string
  name: string
  url: string
  events: string[]
  secret_key?: string
  is_active: boolean
  retry_attempts: number
  created_at: string
  updated_at: string
}

export interface WebhookEndpoint {
  id: string
  profile_id: string
  name: string
  url: string
  events: string[]
  service?: string
  secret_key?: string
  is_active: boolean
  retry_attempts: number
  last_triggered_at?: string
  success_count: number
  failure_count: number
  created_at: string
  updated_at: string
}

export interface WebhookEvent {
  id: string
  profile_id: string
  agent_id?: string
  call_id?: string
  event_type: string
  event_data: Record<string, any>
  webhook_sent: boolean
  webhook_response?: string
  processed_at?: string
  created_at: string
}

export interface WebhookDelivery {
  id: string
  webhook_id: string
  event_type: string
  payload: Record<string, any>
  response_status?: number
  response_body?: string
  delivered_at: string
  success: boolean
}

// Billing & Subscription Types
export interface Billing {
  id: string
  profile_id: string
  stripe_customer_id?: string
  plan_name: string
  status: string
  current_period_start?: string
  current_period_end?: string
  cancel_at_period_end: boolean
  created_at: string
}

export interface Subscription {
  id: string
  profile_id: string
  stripe_customer_id?: string
  stripe_subscription_id?: string
  plan_name: string
  plan_type?: string
  status: 'active' | 'canceled' | 'past_due' | 'unpaid'
  current_period_start?: string
  current_period_end?: string
  cancel_at_period_end: boolean
  created_at: string
  updated_at: string
}

export interface UsageRecord {
  id: string
  profile_id: string
  subscription_id?: string
  usage_type: 'minutes' | 'calls' | 'agents'
  quantity: number
  unit_price?: number
  total_cost?: number
  billing_period_start: string
  billing_period_end: string
  created_at: string
}

// Other Types
export interface Appointment {
  id: string
  profile_id: string
  call_log_id?: string
  lead_id?: string
  customer_name: string
  customer_phone?: string
  customer_email?: string
  appointment_date: string
  appointment_time?: string
  appointment_type?: string
  scheduled_date?: string
  duration_minutes?: number
  location?: string
  notes?: string
  status: string
  reminder_sent?: boolean
  created_at: string
  updated_at: string
}

export interface FunctionCallLog {
  id: string
  profile_id?: string
  call_id?: string
  function_name: string
  parameters: Record<string, any>
  result?: Record<string, any>
  execution_time_ms?: number
  success: boolean
  error_message?: string
  created_at: string
}

export interface KnowledgeBase {
  id: string
  profile_id: string
  agent_id?: string
  title: string
  content: string
  category?: string
  tags?: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface APIKey {
  id: string
  profile_id: string
  key_name: string
  encrypted_key: string
  created_at: string
  updated_at: string
}

// Extended Types for UI Components
export interface ActiveCall extends CallLog {
  agent_name?: string
  call_quality?: 'excellent' | 'good' | 'fair' | 'poor'
}

export interface ExtendedAnalyticsData {
  totalCalls: number
  totalMinutes: number
  successfulCalls: number
  averageCallDuration: number
  successRate: number
  avgDuration: number
  costPerCall: number
  callsByDay: Array<{ date: string; count: number }>
  callsByStatus: Array<{ status: string; count: number }>
  topOutcomes: Array<{ outcome: string; count: number }>
  callVolumeData: Array<{ date: string; calls: number }>
  performanceData: Array<{ date: string; success_rate: number }>
  callOutcomeData: Array<{ name: string; value: number; color: string }>
  topScripts: Array<{ name: string; success_rate: number; total_calls: number }>
  minutesUsed: number
  minutesLimit: number
  campaignStats: {
    totalCampaigns: number
    activeCampaigns: number
    totalLeads: number
    leadsContacted: number
  }
  callsThisMonth?: number
  answeredCalls?: number
  answerRate?: number
  avgCallDuration?: number
  totalAppointments?: number
  appointmentsThisMonth?: number
  appointmentConversionRate?: number
  appointmentsScheduled?: number
  salesCompleted?: number
  customerSatisfactionAvg?: number
  activeCampaigns?: number
  totalLeads?: number
  contactedLeads?: number
  convertedLeads?: number
  leadConversionRate?: number
  totalAgents?: number
  activeAgents?: number
  agentUtilization?: number
  avgSatisfactionScore?: number
}

// API Response Types
export interface APIResponse<T> {
  data?: T
  error?: string
  message?: string
  success: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

// Type constants for compatibility (replaced enums)
export const CallStatus = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
  ABANDONED: 'abandoned'
} as const;

export type CallStatus = typeof CallStatus[keyof typeof CallStatus];

export const CampaignStatus = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
} as const;

export type CampaignStatus = typeof CampaignStatus[keyof typeof CampaignStatus];

export const Priority = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent'
} as const;

export type Priority = typeof Priority[keyof typeof Priority];

export const VoiceName = {
  PUCK: 'Puck',
  CHARON: 'Charon',
  KORE: 'Kore',
  FENRIR: 'Fenrir',
  AOEDE: 'Aoede',
  LEDA: 'Leda',
  ORUS: 'Orus',
  ZEPHYR: 'Zephyr'
} as const;

export type VoiceName = typeof VoiceName[keyof typeof VoiceName];

export const AgentType = {
  CUSTOMER_SERVICE: 'customer_service',
  SALES: 'sales',
  SUPPORT: 'support',
  APPOINTMENT_BOOKING: 'appointment_booking',
  SURVEY: 'survey',
  AFTER_HOURS: 'after_hours',
  GENERAL: 'general'
} as const;

export type AgentType = typeof AgentType[keyof typeof AgentType];

export const CallDirection = {
  INBOUND: 'inbound',
  OUTBOUND: 'outbound',
  BOTH: 'both'
} as const;

export type CallDirection = typeof CallDirection[keyof typeof CallDirection];

export const PlanName = {
  STARTER: 'starter',
  GROW: 'grow',
  PRO: 'pro',
  SCALE: 'scale'
} as const;

export type PlanName = typeof PlanName[keyof typeof PlanName];

// Type guards for runtime type checking
export function isProfile(obj: any): obj is Profile {
  return obj && typeof obj.id === 'string' && typeof obj.plan_name === 'string'
}

export function isCallLog(obj: any): obj is CallLog {
  return obj && typeof obj.id === 'string' && typeof obj.direction === 'string'
}

export function isCampaign(obj: any): obj is Campaign {
  return obj && typeof obj.id === 'string' && typeof obj.name === 'string'
}

// Database query helpers
export type DatabaseInsert<T extends keyof DatabaseTables> = Omit<
  DatabaseTables[T],
  'id' | 'created_at' | 'updated_at'
>

export type DatabaseUpdate<T extends keyof DatabaseTables> = Partial<
  Omit<DatabaseTables[T], 'id' | 'created_at'>
>

export type DatabaseSelect<T extends keyof DatabaseTables> = DatabaseTables[T]
