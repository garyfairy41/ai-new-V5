// Lead Data Collection Types for Internet Sales
export interface LeadDataFields {
  // Personal Information
  full_name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  date_of_birth?: string;
  ssn_last_four?: string; // Only store last 4 digits for security
  
  // Address Information
  current_address?: {
    street?: string;
    city?: string;
    state?: string;
    zip_code?: string;
  };
  
  // Previous address if moved in last year
  previous_address?: {
    street?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    move_date?: string;
  };
  
  // Service Information
  internet_plan?: {
    plan_name?: string;
    speed?: string;
    price?: number;
    promotional_price?: number;
    contract_length?: string;
  };
  
  // Installation
  preferred_install_date?: string;
  preferred_install_time?: string;
  installation_notes?: string;
  
  // Payment Information
  payment_method?: 'credit_card' | 'bank_account' | 'check' | 'cash';
  autopay_enrollment?: boolean;
  payment_details?: {
    card_type?: string;
    last_four?: string;
    exp_month?: string;
    exp_year?: string;
    routing_number?: string; // For bank accounts
    account_last_four?: string; // For bank accounts
  };
  
  // Additional Information
  current_provider?: string;
  reason_for_switching?: string;
  household_size?: number;
  special_requirements?: string;
  
  // Call Outcome
  qualified_lead?: boolean;
  appointment_scheduled?: boolean;
  follow_up_required?: boolean;
  dnc_requested?: boolean;
  notes?: string;
  
  // Data Quality Tracking
  data_complete?: boolean;
  missing_fields?: string[];
  collected_at?: string;
  updated_at?: string;
}

export interface CallAnalytics {
  id: string;
  call_sid: string;
  phone_number_to: string;
  direction: string;
  status: string;
  duration_seconds: number;
  created_at: string;
  campaign_id?: string;
  outcome?: 'answered' | 'voicemail' | 'no_answer' | 'busy' | 'failed';
  recording_url?: string;
  transcription?: string;
  
  // Lead data collected during call
  lead_data?: LeadDataFields;
  
  // Quality metrics
  data_completeness_score?: number; // 0-100 percentage
  conversation_quality?: 'excellent' | 'good' | 'fair' | 'poor';
  
  // Lead information
  lead_info?: {
    first_name?: string;
    last_name?: string;
    phone_number?: string;
    email?: string;
  };
}

// Required fields for complete lead data
export const REQUIRED_LEAD_FIELDS = [
  'full_name',
  'email', 
  'phone',
  'date_of_birth',
  'ssn_last_four',
  'current_address.street',
  'current_address.city', 
  'current_address.state',
  'current_address.zip_code',
  'internet_plan.plan_name',
  'preferred_install_date',
  'payment_method',
  'autopay_enrollment'
];

// Function definitions for AI to use during calls
export const AI_FUNCTION_DEFINITIONS = [
  {
    name: 'collect_personal_info',
    description: 'Collect basic personal information from the customer',
    parameters: {
      type: 'object',
      properties: {
        full_name: {
          type: 'string',
          description: 'Customer\'s full name (first and last)'
        },
        email: {
          type: 'string',
          description: 'Customer\'s email address'
        },
        phone: {
          type: 'string', 
          description: 'Customer\'s phone number'
        },
        date_of_birth: {
          type: 'string',
          description: 'Customer\'s date of birth (MM/DD/YYYY)'
        },
        ssn_last_four: {
          type: 'string',
          description: 'Last 4 digits of SSN for verification'
        }
      },
      required: ['full_name', 'email', 'phone']
    }
  },
  {
    name: 'collect_address_info',
    description: 'Collect current and previous address information',
    parameters: {
      type: 'object',
      properties: {
        current_address: {
          type: 'object',
          properties: {
            street: { type: 'string', description: 'Street address' },
            city: { type: 'string', description: 'City' },
            state: { type: 'string', description: 'State' },
            zip_code: { type: 'string', description: 'ZIP code' }
          }
        },
        moved_recently: {
          type: 'boolean',
          description: 'Has customer moved in the last year?'
        },
        previous_address: {
          type: 'object',
          properties: {
            street: { type: 'string', description: 'Previous street address' },
            city: { type: 'string', description: 'Previous city' },
            state: { type: 'string', description: 'Previous state' },
            zip_code: { type: 'string', description: 'Previous ZIP code' },
            move_date: { type: 'string', description: 'When did they move? (MM/DD/YYYY)' }
          }
        }
      },
      required: ['current_address']
    }
  },
  {
    name: 'collect_service_preferences',
    description: 'Collect internet service plan and installation preferences',
    parameters: {
      type: 'object',
      properties: {
        internet_plan: {
          type: 'object',
          properties: {
            plan_name: { type: 'string', description: 'Selected internet plan name' },
            speed: { type: 'string', description: 'Internet speed (e.g., "100 Mbps")' },
            price: { type: 'number', description: 'Monthly price' },
            promotional_price: { type: 'number', description: 'Promotional price if applicable' },
            contract_length: { type: 'string', description: 'Contract length (e.g., "12 months")' }
          }
        },
        preferred_install_date: {
          type: 'string',
          description: 'Preferred installation date (MM/DD/YYYY)'
        },
        preferred_install_time: {
          type: 'string',
          description: 'Preferred installation time (e.g., "Morning", "Afternoon", "Evening")'
        },
        current_provider: {
          type: 'string',
          description: 'Current internet service provider'
        },
        reason_for_switching: {
          type: 'string',
          description: 'Why are they switching providers?'
        }
      },
      required: ['internet_plan', 'preferred_install_date']
    }
  },
  {
    name: 'collect_payment_info',
    description: 'Collect payment and billing information',
    parameters: {
      type: 'object',
      properties: {
        payment_method: {
          type: 'string',
          enum: ['credit_card', 'bank_account', 'check', 'cash'],
          description: 'Preferred payment method'
        },
        autopay_enrollment: {
          type: 'boolean',
          description: 'Does customer want to enroll in autopay?'
        },
        payment_details: {
          type: 'object',
          properties: {
            card_type: { type: 'string', description: 'Credit card type (Visa, Mastercard, etc.)' },
            last_four: { type: 'string', description: 'Last 4 digits of card' },
            exp_month: { type: 'string', description: 'Expiration month (MM)' },
            exp_year: { type: 'string', description: 'Expiration year (YYYY)' }
          }
        }
      },
      required: ['payment_method', 'autopay_enrollment']
    }
  },
  {
    name: 'set_dnc_request',
    description: 'Customer has requested to be added to Do Not Call list',
    parameters: {
      type: 'object',
      properties: {
        dnc_requested: {
          type: 'boolean',
          description: 'Customer requested Do Not Call'
        },
        dnc_reason: {
          type: 'string',
          description: 'Reason for DNC request'
        }
      },
      required: ['dnc_requested']
    }
  },
  {
    name: 'finalize_lead_data',
    description: 'Finalize and validate all collected lead data',
    parameters: {
      type: 'object',
      properties: {
        qualified_lead: {
          type: 'boolean',
          description: 'Is this a qualified lead?'
        },
        appointment_scheduled: {
          type: 'boolean',
          description: 'Was an installation appointment scheduled?'
        },
        follow_up_required: {
          type: 'boolean',
          description: 'Does this lead require follow-up?'
        },
        notes: {
          type: 'string',
          description: 'Additional notes about the call'
        },
        missing_information: {
          type: 'array',
          items: { type: 'string' },
          description: 'List any missing required information'
        }
      },
      required: ['qualified_lead']
    }
  }
];

// Calculate data completeness score
export const calculateDataCompleteness = (leadData: LeadDataFields): number => {
  if (!leadData) return 0;
  
  let collectedFields = 0;
  const totalFields = REQUIRED_LEAD_FIELDS.length;
  
  REQUIRED_LEAD_FIELDS.forEach(field => {
    const value = getNestedValue(leadData, field);
    if (value && value.toString().trim() !== '') {
      collectedFields++;
    }
  });
  
  return Math.round((collectedFields / totalFields) * 100);
};

// Helper function to get nested object values
const getNestedValue = (obj: any, path: string): any => {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : null;
  }, obj);
};

// Get missing fields for a lead
export const getMissingFields = (leadData: LeadDataFields): string[] => {
  if (!leadData) return REQUIRED_LEAD_FIELDS;
  
  return REQUIRED_LEAD_FIELDS.filter(field => {
    const value = getNestedValue(leadData, field);
    return !value || value.toString().trim() === '';
  });
};
