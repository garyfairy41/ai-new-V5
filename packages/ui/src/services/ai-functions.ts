import type { LeadDataFields } from '../types/lead-data';

// AI Function Definitions for Lead Data Collection
export const AI_FUNCTION_DEFINITIONS = [
  {
    name: "collect_customer_personal_info",
    description: "Collect customer's personal information during sales call",
    parameters: {
      type: "object",
      properties: {
        full_name: { type: "string", description: "Customer's full name" },
        first_name: { type: "string", description: "Customer's first name" },
        last_name: { type: "string", description: "Customer's last name" },
        email: { type: "string", description: "Customer's email address" },
        phone: { type: "string", description: "Customer's phone number" },
        date_of_birth: { type: "string", description: "Customer's date of birth (YYYY-MM-DD)" },
        ssn_last_four: { type: "string", description: "Last four digits of SSN" }
      }
    }
  },
  {
    name: "collect_address_information",
    description: "Collect customer's current and previous address information",
    parameters: {
      type: "object",
      properties: {
        current_address: {
          type: "object",
          properties: {
            street: { type: "string", description: "Street address" },
            city: { type: "string", description: "City" },
            state: { type: "string", description: "State" },
            zip_code: { type: "string", description: "ZIP code" }
          }
        },
        previous_address: {
          type: "object",
          properties: {
            street: { type: "string", description: "Previous street address" },
            city: { type: "string", description: "Previous city" },
            state: { type: "string", description: "Previous state" },
            zip_code: { type: "string", description: "Previous ZIP code" },
            move_date: { type: "string", description: "Date moved from previous address" }
          }
        },
        moved_in_last_year: { type: "boolean", description: "Has customer moved in the last year" }
      }
    }
  },
  {
    name: "collect_service_preferences",
    description: "Collect customer's internet service preferences and installation details",
    parameters: {
      type: "object",
      properties: {
        internet_plan: {
          type: "object",
          properties: {
            plan_name: { type: "string", description: "Selected internet plan name" },
            speed: { type: "string", description: "Internet speed (e.g., '100 Mbps')" },
            price: { type: "number", description: "Monthly price" },
            promotional_price: { type: "number", description: "Promotional price if applicable" },
            contract_length: { type: "string", description: "Contract length (e.g., '24 months')" }
          }
        },
        preferred_install_date: { type: "string", description: "Preferred installation date (YYYY-MM-DD)" },
        preferred_install_time: { type: "string", description: "Preferred installation time" },
        installation_notes: { type: "string", description: "Special installation requirements or notes" }
      }
    }
  },
  {
    name: "collect_payment_information",
    description: "Collect customer's payment and autopay preferences",
    parameters: {
      type: "object",
      properties: {
        payment_method: { 
          type: "string", 
          enum: ["credit_card", "bank_account", "check", "cash"],
          description: "Preferred payment method" 
        },
        autopay_enrollment: { type: "boolean", description: "Customer wants to enroll in autopay" },
        payment_details: {
          type: "object",
          properties: {
            card_type: { type: "string", description: "Credit card type (Visa, MasterCard, etc.)" },
            last_four: { type: "string", description: "Last four digits of card/account" },
            exp_month: { type: "string", description: "Expiration month (MM)" },
            exp_year: { type: "string", description: "Expiration year (YYYY)" }
          }
        }
      }
    }
  },
  {
    name: "record_call_outcome",
    description: "Record the outcome of the sales call",
    parameters: {
      type: "object",
      properties: {
        call_outcome: {
          type: "string",
          enum: ["answered", "voicemail", "no_answer", "busy", "failed"],
          description: "How the call was answered"
        },
        is_qualified: { type: "boolean", description: "Is the lead qualified for service" },
        appointment_scheduled: { type: "boolean", description: "Was an installation appointment scheduled" },
        appointment_datetime: { type: "string", description: "Scheduled appointment date and time" },
        do_not_call_requested: { type: "boolean", description: "Customer requested to not be called again" },
        dnc_reason: { type: "string", description: "Reason for do not call request" },
        call_notes: { type: "string", description: "Additional notes from the call" }
      }
    }
  }
];

// Function to calculate data completeness score
export function calculateDataCompleteness(leadData: Partial<LeadDataFields>): number {
  const requiredFields = [
    'full_name', 'email', 'phone', 'date_of_birth', 'ssn_last_four',
    'current_address', 'internet_plan', 'preferred_install_date', 'payment_method'
  ];
  
  let completedFields = 0;
  
  requiredFields.forEach(field => {
    if (leadData[field as keyof LeadDataFields]) {
      if (typeof leadData[field as keyof LeadDataFields] === 'object') {
        // For object fields, check if they have meaningful data
        const obj = leadData[field as keyof LeadDataFields] as any;
        if (obj && Object.keys(obj).length > 0 && Object.values(obj).some(val => val)) {
          completedFields++;
        }
      } else {
        completedFields++;
      }
    }
  });
  
  return Number((completedFields / requiredFields.length).toFixed(2));
}

// Function to get missing required fields
export function getMissingFields(leadData: Partial<LeadDataFields>): string[] {
  const requiredFields = [
    { key: 'full_name', label: 'Full Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'date_of_birth', label: 'Date of Birth' },
    { key: 'ssn_last_four', label: 'SSN (Last 4)' },
    { key: 'current_address', label: 'Current Address' },
    { key: 'internet_plan', label: 'Internet Plan' },
    { key: 'preferred_install_date', label: 'Install Date' },
    { key: 'payment_method', label: 'Payment Method' }
  ];
  
  return requiredFields
    .filter(field => {
      const value = leadData[field.key as keyof LeadDataFields];
      if (!value) return true;
      if (typeof value === 'object') {
        return !Object.values(value).some(val => val);
      }
      return false;
    })
    .map(field => field.label);
}
