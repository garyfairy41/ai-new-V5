import { useState, useEffect } from 'react';
import { 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  DocumentArrowDownIcon,
  ClipboardDocumentCheckIcon,
  NoSymbolIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  CreditCardIcon,
  CalendarIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import type { CallAnalytics } from '../types/lead-data';
import { calculateDataCompleteness, getMissingFields, REQUIRED_LEAD_FIELDS } from '../types/lead-data';

interface LeadDataTabProps {
  callAnalytics: CallAnalytics[];
  selectedCampaignId: string;
  onExportToGoogleSheets: (data: any[]) => void;
}

interface LeadDataSummary {
  total_leads: number;
  complete_data: number;
  partial_data: number;
  no_data: number;
  avg_completeness: number;
  dnc_requests: number;
  qualified_leads: number;
  appointments_scheduled: number;
}

export default function LeadDataTab({ callAnalytics, selectedCampaignId, onExportToGoogleSheets }: LeadDataTabProps) {
  const [leadDataSummary, setLeadDataSummary] = useState<LeadDataSummary>({
    total_leads: 0,
    complete_data: 0,
    partial_data: 0,
    no_data: 0,
    avg_completeness: 0,
    dnc_requests: 0,
    qualified_leads: 0,
    appointments_scheduled: 0
  });
  
  const [expandedLeads, setExpandedLeads] = useState<Set<string>>(new Set());
  const [filterBy, setFilterBy] = useState<'all' | 'complete' | 'partial' | 'incomplete' | 'dnc' | 'qualified'>('all');

  useEffect(() => {
    calculateLeadDataSummary();
  }, [callAnalytics, selectedCampaignId]);

  const calculateLeadDataSummary = () => {
    // Filter calls by selected campaign if not 'all'
    const filteredCalls = selectedCampaignId === 'all' 
      ? callAnalytics 
      : callAnalytics.filter(call => call.campaign_id === selectedCampaignId);
      
    const answered_calls = filteredCalls.filter(call => 
      call.outcome === 'answered' && call.duration_seconds > 10
    );

    let complete_data = 0;
    let partial_data = 0;
    let no_data = 0;
    let total_completeness = 0;
    let dnc_requests = 0;
    let qualified_leads = 0;
    let appointments_scheduled = 0;

    answered_calls.forEach(call => {
      const leadData = call.lead_data;
      
      if (leadData?.dnc_requested) {
        dnc_requests++;
      }
      
      if (leadData?.qualified_lead) {
        qualified_leads++;
      }
      
      if (leadData?.appointment_scheduled) {
        appointments_scheduled++;
      }

      if (leadData) {
        const completeness = calculateDataCompleteness(leadData);
        total_completeness += completeness;
        
        if (completeness >= 90) {
          complete_data++;
        } else if (completeness >= 30) {
          partial_data++;
        } else {
          no_data++;
        }
      } else {
        no_data++;
      }
    });

    const avg_completeness = answered_calls.length > 0 
      ? Math.round(total_completeness / answered_calls.length) 
      : 0;

    setLeadDataSummary({
      total_leads: answered_calls.length,
      complete_data,
      partial_data,
      no_data,
      avg_completeness,
      dnc_requests,
      qualified_leads,
      appointments_scheduled
    });
  };

  const getFilteredCalls = () => {
    const answered_calls = callAnalytics.filter(call => 
      call.outcome === 'answered' && call.duration_seconds > 10
    );

    switch (filterBy) {
      case 'complete':
        return answered_calls.filter(call => {
          const completeness = call.lead_data ? calculateDataCompleteness(call.lead_data) : 0;
          return completeness >= 90;
        });
      case 'partial':
        return answered_calls.filter(call => {
          const completeness = call.lead_data ? calculateDataCompleteness(call.lead_data) : 0;
          return completeness >= 30 && completeness < 90;
        });
      case 'incomplete':
        return answered_calls.filter(call => {
          const completeness = call.lead_data ? calculateDataCompleteness(call.lead_data) : 0;
          return completeness < 30;
        });
      case 'dnc':
        return answered_calls.filter(call => call.lead_data?.dnc_requested);
      case 'qualified':
        return answered_calls.filter(call => call.lead_data?.qualified_lead);
      default:
        return answered_calls;
    }
  };

  const toggleLeadExpansion = (callId: string) => {
    const newExpanded = new Set(expandedLeads);
    if (newExpanded.has(callId)) {
      newExpanded.delete(callId);
    } else {
      newExpanded.add(callId);
    }
    setExpandedLeads(newExpanded);
  };

  const getCompletenessColor = (completeness: number) => {
    if (completeness >= 90) return 'text-green-600 bg-green-50';
    if (completeness >= 70) return 'text-yellow-600 bg-yellow-50';
    if (completeness >= 30) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  const getCompletenessIcon = (completeness: number) => {
    if (completeness >= 90) return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
    if (completeness >= 30) return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
    return <XCircleIcon className="h-5 w-5 text-red-500" />;
  };

  const exportLeadData = () => {
    const exportData = getFilteredCalls().map(call => {
      const leadData = call.lead_data || {};
      return {
        // Call Information
        phone_number: call.phone_number_to,
        call_date: new Date(call.created_at).toLocaleDateString(),
        call_duration: Math.round(call.duration_seconds / 60) + ' min',
        call_outcome: call.outcome,
        
        // Personal Information
        full_name: leadData.full_name || '',
        email: leadData.email || '',
        phone: leadData.phone || '',
        date_of_birth: leadData.date_of_birth || '',
        ssn_last_four: leadData.ssn_last_four || '',
        
        // Address Information
        current_street: leadData.current_address?.street || '',
        current_city: leadData.current_address?.city || '',
        current_state: leadData.current_address?.state || '',
        current_zip: leadData.current_address?.zip_code || '',
        
        // Previous Address (if moved)
        previous_street: leadData.previous_address?.street || '',
        previous_city: leadData.previous_address?.city || '',
        previous_state: leadData.previous_address?.state || '',
        previous_zip: leadData.previous_address?.zip_code || '',
        move_date: leadData.previous_address?.move_date || '',
        
        // Service Information
        internet_plan: leadData.internet_plan?.plan_name || '',
        internet_speed: leadData.internet_plan?.speed || '',
        monthly_price: leadData.internet_plan?.price || '',
        promotional_price: leadData.internet_plan?.promotional_price || '',
        contract_length: leadData.internet_plan?.contract_length || '',
        
        // Installation
        preferred_install_date: leadData.preferred_install_date || '',
        preferred_install_time: leadData.preferred_install_time || '',
        
        // Payment Information
        payment_method: leadData.payment_method || '',
        autopay_enrollment: leadData.autopay_enrollment ? 'Yes' : 'No',
        card_type: leadData.payment_details?.card_type || '',
        card_last_four: leadData.payment_details?.last_four || '',
        
        // Lead Quality
        qualified_lead: leadData.qualified_lead ? 'Yes' : 'No',
        appointment_scheduled: leadData.appointment_scheduled ? 'Yes' : 'No',
        follow_up_required: leadData.follow_up_required ? 'Yes' : 'No',
        dnc_requested: leadData.dnc_requested ? 'Yes' : 'No',
        
        // Data Quality
        data_completeness: call.lead_data ? calculateDataCompleteness(call.lead_data) + '%' : '0%',
        missing_fields: call.lead_data ? getMissingFields(call.lead_data).join(', ') : 'All fields missing',
        
        // Additional
        current_provider: leadData.current_provider || '',
        reason_for_switching: leadData.reason_for_switching || '',
        notes: leadData.notes || ''
      };
    });

    onExportToGoogleSheets(exportData);
  };

  const filteredCalls = getFilteredCalls();

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Answered Calls
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {leadDataSummary.total_leads}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Complete Data
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {leadDataSummary.complete_data} ({Math.round((leadDataSummary.complete_data / Math.max(leadDataSummary.total_leads, 1)) * 100)}%)
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClipboardDocumentCheckIcon className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Qualified Leads
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {leadDataSummary.qualified_leads}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <NoSymbolIcon className="h-6 w-6 text-red-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    DNC Requests
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {leadDataSummary.dnc_requests}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Export */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex space-x-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Filter by Data Quality</label>
              <select
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value as any)}
                className="mt-1 block rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="all">All Calls ({leadDataSummary.total_leads})</option>
                <option value="complete">Complete Data ({leadDataSummary.complete_data})</option>
                <option value="partial">Partial Data ({leadDataSummary.partial_data})</option>
                <option value="incomplete">Incomplete Data ({leadDataSummary.no_data})</option>
                <option value="qualified">Qualified Leads ({leadDataSummary.qualified_leads})</option>
                <option value="dnc">DNC Requests ({leadDataSummary.dnc_requests})</option>
              </select>
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={exportLeadData}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
              Export to Google Sheets
            </button>
          </div>
        </div>
      </div>

      {/* Lead Data List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {filteredCalls.map(call => {
            const leadData = call.lead_data;
            const completeness = leadData ? calculateDataCompleteness(leadData) : 0;
            const missingFields = leadData ? getMissingFields(leadData) : REQUIRED_LEAD_FIELDS;
            const isExpanded = expandedLeads.has(call.id);

            return (
              <li key={call.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {getCompletenessIcon(completeness)}
                    <div className="ml-4">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-gray-900">
                          {call.phone_number_to}
                        </p>
                        {leadData?.full_name && (
                          <span className="text-sm text-gray-500">
                            ({leadData.full_name})
                          </span>
                        )}
                        {leadData?.dnc_requested && (
                          <NoSymbolIcon className="h-4 w-4 text-red-500" title="Do Not Call Requested" />
                        )}
                        {leadData?.qualified_lead && (
                          <CheckCircleIcon className="h-4 w-4 text-green-500" title="Qualified Lead" />
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {new Date(call.created_at).toLocaleDateString()} • {Math.round(call.duration_seconds / 60)} min
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCompletenessColor(completeness)}`}>
                        {completeness}% Complete
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {missingFields.length} missing fields
                      </p>
                    </div>
                    <button
                      onClick={() => toggleLeadExpansion(call.id)}
                      className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                    >
                      {isExpanded ? 'Hide Details' : 'View Details'}
                    </button>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && leadData && (
                  <div className="mt-4 border-t border-gray-200 pt-4">
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                      {/* Personal Information */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                          <UserIcon className="h-4 w-4 mr-2" />
                          Personal Information
                        </h4>
                        <dl className="space-y-2">
                          <div>
                            <dt className="text-xs text-gray-500">Full Name</dt>
                            <dd className="text-sm text-gray-900">{leadData.full_name || 'Not provided'}</dd>
                          </div>
                          <div>
                            <dt className="text-xs text-gray-500 flex items-center">
                              <EnvelopeIcon className="h-3 w-3 mr-1" />
                              Email
                            </dt>
                            <dd className="text-sm text-gray-900">{leadData.email || 'Not provided'}</dd>
                          </div>
                          <div>
                            <dt className="text-xs text-gray-500 flex items-center">
                              <PhoneIcon className="h-3 w-3 mr-1" />
                              Phone
                            </dt>
                            <dd className="text-sm text-gray-900">{leadData.phone || 'Not provided'}</dd>
                          </div>
                          <div>
                            <dt className="text-xs text-gray-500 flex items-center">
                              <CalendarIcon className="h-3 w-3 mr-1" />
                              Date of Birth
                            </dt>
                            <dd className="text-sm text-gray-900">{leadData.date_of_birth || 'Not provided'}</dd>
                          </div>
                          <div>
                            <dt className="text-xs text-gray-500">SSN (Last 4)</dt>
                            <dd className="text-sm text-gray-900">{leadData.ssn_last_four || 'Not provided'}</dd>
                          </div>
                        </dl>
                      </div>

                      {/* Address Information */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                          <MapPinIcon className="h-4 w-4 mr-2" />
                          Address Information
                        </h4>
                        <dl className="space-y-2">
                          <div>
                            <dt className="text-xs text-gray-500">Current Address</dt>
                            <dd className="text-sm text-gray-900">
                              {leadData.current_address ? 
                                `${leadData.current_address.street || ''}, ${leadData.current_address.city || ''}, ${leadData.current_address.state || ''} ${leadData.current_address.zip_code || ''}`.trim().replace(/^,\s*/, '') || 'Not provided'
                                : 'Not provided'
                              }
                            </dd>
                          </div>
                          {leadData.previous_address && (
                            <div>
                              <dt className="text-xs text-gray-500">Previous Address</dt>
                              <dd className="text-sm text-gray-900">
                                {`${leadData.previous_address.street || ''}, ${leadData.previous_address.city || ''}, ${leadData.previous_address.state || ''} ${leadData.previous_address.zip_code || ''}`.trim().replace(/^,\s*/, '') || 'Not provided'}
                              </dd>
                            </div>
                          )}
                        </dl>
                      </div>

                      {/* Service & Payment */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                          <CreditCardIcon className="h-4 w-4 mr-2" />
                          Service & Payment
                        </h4>
                        <dl className="space-y-2">
                          <div>
                            <dt className="text-xs text-gray-500">Internet Plan</dt>
                            <dd className="text-sm text-gray-900">{leadData.internet_plan?.plan_name || 'Not selected'}</dd>
                          </div>
                          <div>
                            <dt className="text-xs text-gray-500">Install Date</dt>
                            <dd className="text-sm text-gray-900">{leadData.preferred_install_date || 'Not scheduled'}</dd>
                          </div>
                          <div>
                            <dt className="text-xs text-gray-500">Payment Method</dt>
                            <dd className="text-sm text-gray-900">{leadData.payment_method || 'Not provided'}</dd>
                          </div>
                          <div>
                            <dt className="text-xs text-gray-500">Autopay</dt>
                            <dd className="text-sm text-gray-900">{leadData.autopay_enrollment ? 'Yes' : 'No'}</dd>
                          </div>
                        </dl>
                      </div>
                    </div>

                    {/* Missing Fields */}
                    {missingFields.length > 0 && (
                      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                        <p className="text-sm font-medium text-yellow-800">Missing Information:</p>
                        <p className="text-sm text-yellow-700 mt-1">
                          {missingFields.join(', ')}
                        </p>
                      </div>
                    )}

                    {/* Notes */}
                    {leadData.notes && (
                      <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
                        <p className="text-sm font-medium text-gray-800">Notes:</p>
                        <p className="text-sm text-gray-700 mt-1">{leadData.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        {filteredCalls.length === 0 && (
          <div className="text-center py-12">
            <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No lead data found</h3>
            <p className="mt-1 text-sm text-gray-500">
              No calls match the selected filter criteria.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
