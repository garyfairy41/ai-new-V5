// AI Function Definitions for Lead Data Collection
// This should be integrated into your AI call handling system

export const LEAD_DATA_COLLECTION_FUNCTIONS = [
  {
    name: "collect_customer_personal_info",
    description: "Collect basic personal information from the customer",
    parameters: {
      type: "object",
      properties: {
        full_name: {
          type: "string",
          description: "Customer's full name (first and last)"
        },
        first_name: {
          type: "string", 
          description: "Customer's first name"
        },
        last_name: {
          type: "string",
          description: "Customer's last name"
        },
        email: {
          type: "string",
          description: "Customer's email address"
        },
        phone: {
          type: "string",
          description: "Customer's phone number"
        },
        date_of_birth: {
          type: "string",
          description: "Customer's date of birth (YYYY-MM-DD format)"
        },
        ssn_last_four: {
          type: "string",
          description: "Last 4 digits of customer's Social Security Number"
        }
      },
      required: ["full_name", "email", "phone"]
    }
  },
  {
    name: "collect_customer_address",
    description: "Collect current address information from the customer",
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
          },
          required: ["street", "city", "state", "zip_code"]
        },
        moved_recently: {
          type: "boolean",
          description: "Whether customer moved in the last year"
        }
      },
      required: ["current_address"]
    }
  },
  {
    name: "collect_previous_address",
    description: "Collect previous address if customer moved in the last year",
    parameters: {
      type: "object",
      properties: {
        previous_address: {
          type: "object",
          properties: {
            street: { type: "string", description: "Previous street address" },
            city: { type: "string", description: "Previous city" },
            state: { type: "string", description: "Previous state" },
            zip_code: { type: "string", description: "Previous ZIP code" },
            move_date: { type: "string", description: "Date of move (YYYY-MM-DD)" }
          },
          required: ["street", "city", "state", "zip_code"]
        }
      },
      required: ["previous_address"]
    }
  },
  {
    name: "collect_internet_plan_selection",
    description: "Collect information about the internet plan the customer is interested in",
    parameters: {
      type: "object",
      properties: {
        internet_plan: {
          type: "object",
          properties: {
            plan_name: { type: "string", description: "Name of the internet plan" },
            speed: { type: "string", description: "Internet speed (e.g., '100 Mbps')" },
            price: { type: "number", description: "Monthly price" },
            promotional_price: { type: "number", description: "Promotional price if applicable" },
            contract_length: { type: "string", description: "Contract length (e.g., '12 months')" }
          },
          required: ["plan_name", "speed", "price"]
        }
      },
      required: ["internet_plan"]
    }
  },
  {
    name: "collect_installation_preferences",
    description: "Collect preferred installation date and time",
    parameters: {
      type: "object",
      properties: {
        preferred_install_date: {
          type: "string",
          description: "Preferred installation date (YYYY-MM-DD format)"
        },
        preferred_install_time: {
          type: "string",
          description: "Preferred time slot (e.g., 'Morning 8-12', 'Afternoon 12-5', 'Evening 5-8')"
        },
        installation_notes: {
          type: "string",
          description: "Any special installation notes or requirements"
        }
      },
      required: ["preferred_install_date", "preferred_install_time"]
    }
  },
  {
    name: "collect_payment_information",
    description: "Collect autopay and payment method preferences",
    parameters: {
      type: "object",
      properties: {
        payment_method: {
          type: "string",
          enum: ["credit_card", "bank_account", "check", "cash"],
          description: "Preferred payment method"
        },
        autopay_enrollment: {
          type: "boolean",
          description: "Whether customer wants to enroll in autopay"
        },
        payment_details: {
          type: "object",
          properties: {
            card_type: { type: "string", description: "Credit card type (if applicable)" },
            last_four: { type: "string", description: "Last 4 digits of card/account" },
            exp_month: { type: "string", description: "Expiration month (MM)" },
            exp_year: { type: "string", description: "Expiration year (YYYY)" }
          }
        }
      },
      required: ["payment_method", "autopay_enrollment"]
    }
  },
  {
    name: "mark_dnc_request",
    description: "Mark that the customer has requested to not be called again",
    parameters: {
      type: "object",
      properties: {
        dnc_requested: {
          type: "boolean",
          description: "Customer requested Do Not Call"
        },
        dnc_reason: {
          type: "string",
          description: "Reason for DNC request (optional)"
        }
      },
      required: ["dnc_requested"]
    }
  },
  {
    name: "mark_qualified_lead",
    description: "Mark the lead as qualified based on the conversation",
    parameters: {
      type: "object",
      properties: {
        qualified_lead: {
          type: "boolean",
          description: "Whether this is a qualified lead"
        },
        qualification_reason: {
          type: "string",
          description: "Reason for qualification status"
        },
        interest_level: {
          type: "string",
          enum: ["high", "medium", "low"],
          description: "Customer's interest level"
        }
      },
      required: ["qualified_lead"]
    }
  },
  {
    name: "schedule_appointment",
    description: "Schedule a follow-up appointment or installation",
    parameters: {
      type: "object",
      properties: {
        appointment_scheduled: {
          type: "boolean",
          description: "Whether an appointment was scheduled"
        },
        appointment_type: {
          type: "string",
          enum: ["installation", "follow_up_call", "sales_meeting"],
          description: "Type of appointment"
        },
        appointment_date: {
          type: "string",
          description: "Appointment date (YYYY-MM-DD)"
        },
        appointment_time: {
          type: "string",
          description: "Appointment time"
        },
        appointment_notes: {
          type: "string",
          description: "Notes about the appointment"
        }
      },
      required: ["appointment_scheduled"]
    }
  }
];

export const AI_CONVERSATION_FLOW = {
  greeting: "Hi! I'm calling about internet services in your area. Do you have a moment to discuss high-speed internet options?",
  
  data_collection_sequence: [
    {
      stage: "personal_info",
      prompt: "Great! First, I'd like to get some basic information. Could you please confirm your full name?",
      function: "collect_customer_personal_info",
      required_fields: ["full_name", "email", "phone"]
    },
    {
      stage: "address_verification", 
      prompt: "Perfect! Now, could you confirm your current address for service availability?",
      function: "collect_customer_address",
      required_fields: ["current_address"]
    },
    {
      stage: "previous_address_check",
      prompt: "Have you moved to this address within the last year?",
      function: "collect_previous_address",
      conditional: "moved_recently === true"
    },
    {
      stage: "plan_selection",
      prompt: "Excellent! Based on your location, we have several internet plans available. Which speed would work best for your household?",
      function: "collect_internet_plan_selection",
      required_fields: ["internet_plan"]
    },
    {
      stage: "installation_scheduling",
      prompt: "Great choice! When would be the best time to schedule your installation?",
      function: "collect_installation_preferences", 
      required_fields: ["preferred_install_date", "preferred_install_time"]
    },
    {
      stage: "payment_setup",
      prompt: "Finally, let's set up your payment method. Would you like to enroll in autopay for a discount?",
      function: "collect_payment_information",
      required_fields: ["payment_method", "autopay_enrollment"]
    },
    {
      stage: "qualification",
      prompt: "Based on our conversation, I believe you'd be a great fit for our service!",
      function: "mark_qualified_lead",
      required_fields: ["qualified_lead"]
    }
  ],

  dnc_triggers: [
    "not interested",
    "remove from list", 
    "don't call",
    "stop calling",
    "take me off",
    "not call again"
  ],

  completion_check: {
    required_for_complete: [
      "full_name",
      "email", 
      "phone",
      "current_address",
      "internet_plan",
      "preferred_install_date",
      "payment_method"
    ],
    nice_to_have: [
      "date_of_birth",
      "ssn_last_four",
      "previous_address",
      "installation_notes"
    ]
  }
};
