// Utility to generate sample call data for testing analytics
// This is for development/testing purposes only

export interface SampleCallData {
  phone_number_from: string;
  phone_number_to: string;
  direction: 'inbound' | 'outbound';
  status: 'completed' | 'failed' | 'in_progress' | 'abandoned';
  duration_seconds: number;
  call_summary?: string;
  outcome?: string;
  tags?: string[];
}

export const generateSampleCallData = (count: number = 50): SampleCallData[] => {
  const phoneNumbers = [
    '+1-555-123-4567', '+1-555-987-6543', '+1-555-456-7890',
    '+1-555-321-0987', '+1-555-654-3210', '+1-555-789-0123'
  ];
  
  const statuses: Array<'completed' | 'failed' | 'abandoned'> = ['completed', 'failed', 'abandoned'];
  const outcomes = [
    'Appointment scheduled', 'Information provided', 'Follow-up required',
    'Sale completed', 'Not interested', 'Callback requested', 'Issue resolved'
  ];
  
  const summaries = [
    'Customer inquiry about product features and pricing',
    'Technical support call for account setup',
    'Sales call for new service package',
    'Follow-up on previous appointment',
    'Complaint resolution and customer satisfaction',
    'Product demonstration and feature explanation'
  ];

  const data: SampleCallData[] = [];
  
  for (let i = 0; i < count; i++) {
    const isInbound = Math.random() > 0.4; // 60% inbound, 40% outbound
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const duration = status === 'completed' 
      ? Math.floor(Math.random() * 600) + 60  // 1-10 minutes for completed
      : Math.floor(Math.random() * 120) + 15; // 15 seconds - 2 minutes for others
    
    const hasAppointment = Math.random() > 0.85; // 15% chance
    const hasSale = Math.random() > 0.9; // 10% chance
    
    let outcome = outcomes[Math.floor(Math.random() * outcomes.length)];
    const tags: string[] = [];
    
    if (hasAppointment) {
      outcome = 'Appointment scheduled';
      tags.push('appointment');
    }
    
    if (hasSale) {
      outcome = 'Sale completed';
      tags.push('sale');
    }

    data.push({
      phone_number_from: isInbound 
        ? phoneNumbers[Math.floor(Math.random() * phoneNumbers.length)]
        : '+1-555-000-0000', // Your business number
      phone_number_to: isInbound 
        ? '+1-555-000-0000' // Your business number
        : phoneNumbers[Math.floor(Math.random() * phoneNumbers.length)],
      direction: isInbound ? 'inbound' : 'outbound',
      status,
      duration_seconds: duration,
      call_summary: summaries[Math.floor(Math.random() * summaries.length)],
      outcome,
      tags: tags.length > 0 ? tags : undefined
    });
  }
  
  return data;
};

export const createSampleCallsForUser = async (_userId: string, count: number = 30) => {
  console.log(`Generating ${count} sample calls for testing analytics...`);
  
  const sampleCalls = generateSampleCallData(count);
  
  // Note: This would require a proper API endpoint to insert test data
  // For now, this is just a utility to understand the data structure
  console.log('Sample call data structure:', sampleCalls[0]);
  console.log(`Generated ${sampleCalls.length} sample calls`);
  
  return sampleCalls;
};
