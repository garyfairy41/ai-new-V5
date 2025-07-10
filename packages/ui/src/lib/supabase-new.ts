import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables - running in demo mode');
}

export const supabase = createClient(
  supabaseUrl || 'https://demo.supabase.co', 
  supabaseAnonKey || 'demo-key'
);

// Admin client with service role key for privileged operations
export const supabaseAdmin = createClient(
  supabaseUrl || 'https://demo.supabase.co',
  supabaseServiceKey || 'demo-key'
);

// Re-export all types from the comprehensive database types file
export * from '../types/database';

// Import specific types for backward compatibility
import type {
  Profile as DatabaseProfile,
  AIAgent as DatabaseAIAgent,
  CallLog as DatabaseCallLog,
  Campaign as DatabaseCampaign,
  CampaignLead as DatabaseCampaignLead,
  ExtendedAnalyticsData,
  DNCEntry as DatabaseDNCEntry,
  WebhookEndpoint as DatabaseWebhookEndpoint,
  WebhookDelivery as DatabaseWebhookDelivery,
  Subscription as DatabaseSubscription,
  UsageRecord as DatabaseUsageRecord,
  ComplianceReport as DatabaseComplianceReport,
  SystemStatus as DatabaseSystemStatus,
  ActiveCall as DatabaseActiveCall,
  Appointment as DatabaseAppointment,
  FunctionCallLog as DatabaseFunctionCallLog,
  PhoneNumber as DatabasePhoneNumber,
  IVRMenu as DatabaseIVRMenu,
  IVROption as DatabaseIVROption,
  ExternalIntegration as DatabaseExternalIntegration
} from '../types/database';

// Provide backward compatibility aliases
export type Profile = DatabaseProfile;
export type AIAgent = DatabaseAIAgent;
export type CallLog = DatabaseCallLog;
export type Campaign = DatabaseCampaign;
export type CampaignLead = DatabaseCampaignLead;
export type AnalyticsData = ExtendedAnalyticsData;
export type DNCEntry = DatabaseDNCEntry;
export type WebhookEndpoint = DatabaseWebhookEndpoint;
export type WebhookDelivery = DatabaseWebhookDelivery;
export type Subscription = DatabaseSubscription;
export type UsageRecord = DatabaseUsageRecord;
export type ComplianceReport = DatabaseComplianceReport;
export type SystemStatus = DatabaseSystemStatus;
export type ActiveCall = DatabaseActiveCall;
export type Appointment = DatabaseAppointment;
export type FunctionCallLog = DatabaseFunctionCallLog;
export type PhoneNumber = DatabasePhoneNumber;
export type IVRMenu = DatabaseIVRMenu;
export type IVROption = DatabaseIVROption;
export type ExternalIntegration = DatabaseExternalIntegration;
