/**
 * Lead Personalization Variables Service
 * Provides variables from the lead record for personalizing conversations
 * These are used in system instructions to customize greetings and conversation flow
 */

export interface LeadPersonalizationVariables {
  // Basic lead information
  firstName: string;
  lastName: string;
  fullName: string;
  phoneNumber: string;
  email: string;
  address: string;
  serviceRequested: string;
}

/**
 * Extract personalization variables from a lead record
 */
export function extractLeadPersonalizationVariables(lead: any): LeadPersonalizationVariables {
  const firstName = lead.first_name || '';
  const lastName = lead.last_name || '';
  const fullName = firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || '';
  
  return {
    firstName,
    lastName,
    fullName,
    phoneNumber: lead.phone_number || '',
    email: lead.email || '',
    address: lead.address || '',
    serviceRequested: lead.service_requested || ''
  };
}

/**
 * Get the list of available personalization variables for system instructions
 */
export function getPersonalizationVariables(): string[] {
  return [
    'firstName',
    'lastName', 
    'fullName',
    'phoneNumber',
    'email',
    'address',
    'serviceRequested'
  ];
}

/**
 * Generate copy-paste friendly variable list for system instructions
 */
export function getPersonalizationVariablesList(): string {
  return `Available Lead Variables (copy and paste into system instructions):

{{firstName}} - Customer's first name
{{lastName}} - Customer's last name  
{{fullName}} - Customer's full name
{{phoneNumber}} - Customer's phone number
{{email}} - Customer's email address
{{address}} - Customer's address
{{serviceRequested}} - Service they requested

Example usage:
"Hi {{firstName}}, this is [Agent Name] calling about your {{serviceRequested}} installation scheduled for {{address}}. How are you doing today?"

"Hello {{fullName}}, I'm following up on your interest in {{serviceRequested}} for your location at {{address}}."`;
}

/**
 * Generate a complete template for outbound calls
 */
export function getOutboundCallTemplate(): string {
  return `LEAD PERSONALIZATION VARIABLES - Copy the variables you need:

{{firstName}} {{lastName}} {{fullName}} {{phoneNumber}} {{email}} {{address}} {{serviceRequested}}

SAMPLE GREETING TEMPLATES:

Template 1 (Friendly):
"Hi {{firstName}}, this is [Your Name] from [Company]. I'm calling about your {{serviceRequested}} installation scheduled for {{address}}. How are you doing today?"

Template 2 (Professional):  
"Hello {{fullName}}, this is [Your Name] calling regarding your {{serviceRequested}} service inquiry for {{address}}. Do you have a moment to discuss the details?"

Template 3 (Appointment Confirmation):
"Hi {{firstName}}, I'm calling to confirm your {{serviceRequested}} installation appointment at {{address}}. Are you still available for the scheduled time?"

Just copy the variables you need and paste them into your system instructions!`;
}
