// AI Function Calling Configuration for Lead Data Collection
// This file defines the AI functions that should be called during outbound sales calls

export const AI_LEAD_COLLECTION_FUNCTIONS = [
  {
    name: "collect_customer_personal_info",
    description: "Collect and store customer's personal information including name, email, phone, and date of birth",
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
          description: "Last 4 digits of customer's SSN for verification"
        }
      },
      required: ["full_name", "email", "phone"]
    }
  },
  {
    name: "collect_customer_address",
    description: "Collect customer's current address and previous address if they moved in the last year",
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
          description: "Has the customer moved in the last year?"
        },
        previous_address: {
          type: "object",
          properties: {
            street: { type: "string", description: "Previous street address" },
            city: { type: "string", description: "Previous city" },
            state: { type: "string", description: "Previous state" },
            zip_code: { type: "string", description: "Previous ZIP code" },
            move_date: { type: "string", description: "Date of move (YYYY-MM-DD)" }
          }
        }
      },
      required: ["current_address"]
    }
  },
  {
    name: "collect_internet_plan_selection",
    description: "Collect information about the internet plan the customer has selected",
    parameters: {
      type: "object", 
      properties: {
        plan_name: {
          type: "string",
          description: "Name of the internet plan selected"
        },
        speed: {
          type: "string", 
          description: "Internet speed (e.g., '100 Mbps', '1 Gbps')"
        },
        price: {
          type: "number",
          description: "Monthly price of the plan"
        },
        promotional_price: {
          type: "number",
          description: "Promotional/discounted price if applicable"
        },
        contract_length: {
          type: "string",
          description: "Contract length (e.g., '12 months', '24 months', 'no contract')"
        }
      },
      required: ["plan_name", "speed", "price"]
    }
  },
  {
    name: "collect_installation_preferences",
    description: "Collect customer's preferred installation date and time",
    parameters: {
      type: "object",
      properties: {
        preferred_date: {
          type: "string",
          description: "Preferred installation date (YYYY-MM-DD format)"
        },
        preferred_time: {
          type: "string", 
          description: "Preferred time slot (e.g., 'morning', 'afternoon', 'evening', or specific time)"
        },
        special_instructions: {
          type: "string",
          description: "Any special installation instructions or notes"
        }
      },
      required: ["preferred_date", "preferred_time"]
    }
  },
  {
    name: "collect_payment_information",
    description: "Collect customer's payment method and autopay preferences",
    parameters: {
      type: "object",
      properties: {
        payment_method: {
          type: "string",
          enum: ["credit_card", "bank_account", "check", "cash"],
          description: "Customer's preferred payment method"
        },
        autopay_enrollment: {
          type: "boolean",
          description: "Whether customer wants to enroll in autopay"
        },
        card_type: {
          type: "string",
          description: "Type of credit card (Visa, Mastercard, etc.) if applicable"
        },
        last_four_digits: {
          type: "string",
          description: "Last 4 digits of credit card or bank account"
        }
      },
      required: ["payment_method", "autopay_enrollment"]
    }
  },
  {
    name: "mark_lead_as_qualified",
    description: "Mark the lead as qualified based on the conversation",
    parameters: {
      type: "object",
      properties: {
        is_qualified: {
          type: "boolean",
          description: "Whether the lead meets qualification criteria"
        },
        qualification_notes: {
          type: "string",
          description: "Notes about why the lead is qualified or not"
        },
        budget_confirmed: {
          type: "boolean",
          description: "Whether customer confirmed they have budget for the service"
        },
        decision_maker: {
          type: "boolean", 
          description: "Whether customer is the decision maker"
        }
      },
      required: ["is_qualified"]
    }
  },
  {
    name: "schedule_appointment",
    description: "Schedule an appointment with the customer",
    parameters: {
      type: "object",
      properties: {
        appointment_date: {
          type: "string",
          description: "Scheduled appointment date (YYYY-MM-DD format)"
        },
        appointment_time: {
          type: "string",
          description: "Scheduled appointment time"
        },
        appointment_type: {
          type: "string",
          enum: ["installation", "consultation", "follow_up"],
          description: "Type of appointment"
        },
        appointment_notes: {
          type: "string",
          description: "Notes about the appointment"
        }
      },
      required: ["appointment_date", "appointment_time", "appointment_type"]
    }
  },
  {
    name: "handle_dnc_request",
    description: "Handle a do not call (DNC) request from the customer",
    parameters: {
      type: "object",
      properties: {
        dnc_requested: {
          type: "boolean",
          description: "Customer requested to be added to do not call list"
        },
        dnc_reason: {
          type: "string",
          description: "Reason for DNC request"
        },
        remove_from_all_lists: {
          type: "boolean",
          description: "Whether to remove from all marketing lists"
        }
      },
      required: ["dnc_requested"]
    }
  },
  {
    name: "save_call_outcome",
    description: "Save the final outcome of the call",
    parameters: {
      type: "object",
      properties: {
        call_outcome: {
          type: "string",
          enum: ["sale_completed", "appointment_scheduled", "follow_up_needed", "not_interested", "dnc_request", "invalid_number"],
          description: "Final outcome of the call"
        },
        follow_up_date: {
          type: "string",
          description: "Date for follow-up if needed (YYYY-MM-DD format)"
        },
        call_notes: {
          type: "string",
          description: "Additional notes about the call"
        },
        data_completeness_score: {
          type: "number",
          description: "Percentage of required data collected (0-100)"
        }
      },
      required: ["call_outcome"]
    }
  }
];

// Function to calculate data completeness based on collected information
export function calculateDataCompletenessScore(leadData: any): number {
  const requiredFields = [
    'full_name', 'email', 'phone', 'current_address.street', 
    'current_address.city', 'current_address.state', 'current_address.zip_code',
    'plan_name', 'speed', 'price', 'preferred_date', 'preferred_time', 'payment_method'
  ];

  let completedFields = 0;
  
  requiredFields.forEach(field => {
    const fieldPath = field.split('.');
    let value = leadData;
    
    for (const path of fieldPath) {
      value = value?.[path];
    }
    
    if (value && value !== '') {
      completedFields++;
    }
  });

  return Math.round((completedFields / requiredFields.length) * 100);
}

// Prompt template for AI agent to use these functions
export const AI_LEAD_COLLECTION_PROMPT = `
You are an AI sales agent for an internet service provider. Your job is to collect complete customer information during outbound sales calls.

REQUIRED INFORMATION TO COLLECT:
1. Personal Info: Full name, email, phone, date of birth
2. Address: Current address (and previous if moved in last year)  
3. Internet Plan: Selected plan, speed, price
4. Installation: Preferred date and time
5. Payment: Payment method and autopay preferences

IMPORTANT GUIDELINES:
- Use the provided functions to save information as you collect it
- Be natural and conversational, don't rush through a checklist
- Ask follow-up questions to get complete information
- If customer requests DNC, immediately use handle_dnc_request function
- Mark qualified leads and schedule appointments when appropriate
- Always save the final call outcome

FUNCTION USAGE:
- Call collect_customer_personal_info() when you get name, email, phone
- Call collect_customer_address() when you get address information  
- Call collect_internet_plan_selection() when discussing plans
- Call collect_installation_preferences() when scheduling installation
- Call collect_payment_information() when discussing payment
- Call mark_lead_as_qualified() if lead meets criteria
- Call schedule_appointment() if customer wants to schedule
- Call handle_dnc_request() if customer requests no more calls
- Call save_call_outcome() at the end of every call

Remember to be helpful, professional, and respect customer preferences at all times.
`;

export default {
  AI_LEAD_COLLECTION_FUNCTIONS,
  calculateDataCompletenessScore,
  AI_LEAD_COLLECTION_PROMPT
};
