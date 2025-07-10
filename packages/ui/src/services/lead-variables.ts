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
 * Get the list of available personalization variables for use in system instructions
 * These allow agents to personalize their greeting and conversation
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
 * Generate help text showing available personalization variables
 */
export function getPersonalizationHelpText(): string {
  const variables = getPersonalizationVariables();
  const variableList = variables.map(v => `{{${v}}}`).join(', ');
  
  return `Available personalization variables: ${variableList}

Example usage in system instructions:
"Hi {{firstName}}, I'm calling about your {{serviceRequested}} installation at {{address}}."

Variables will be automatically replaced with lead data from the campaign during calls.`;
}
