import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, PhoneIcon, CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import type { Campaign, Lead as CampaignLead } from '../../services/campaignService';

interface CampaignStatsModalProps {
  campaign: Campaign;
  leads: CampaignLead[];
  isOpen: boolean;
  onClose: () => void;
}

export default function CampaignStatsModal({ campaign, leads, isOpen, onClose }: CampaignStatsModalProps) {
  const totalLeads = leads.length;
  const calledLeads = leads.filter(lead => lead.status === 'called').length;
  const connectedLeads = leads.filter(lead => lead.status === 'completed').length;
  const failedLeads = leads.filter(lead => lead.status === 'failed').length;
  const pendingLeads = leads.filter(lead => lead.status === 'pending').length;

  const callRate = totalLeads > 0 ? (calledLeads / totalLeads) * 100 : 0;
  const connectionRate = calledLeads > 0 ? (connectedLeads / calledLeads) * 100 : 0;
  const failureRate = calledLeads > 0 ? (failedLeads / calledLeads) * 100 : 0;

  const stats = [
    {
      name: 'Total Leads',
      value: totalLeads,
      icon: PhoneIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      name: 'Calls Made',
      value: calledLeads,
      icon: PhoneIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      name: 'Connected',
      value: connectedLeads,
      icon: CheckCircleIcon,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
    },
    {
      name: 'Failed',
      value: failedLeads,
      icon: XCircleIcon,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
    {
      name: 'Pending',
      value: pendingLeads,
      icon: ClockIcon,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
    },
  ];

  const rates = [
    {
      name: 'Call Rate',
      value: `${callRate.toFixed(1)}%`,
      description: 'Percentage of leads called',
    },
    {
      name: 'Connection Rate',
      value: `${connectionRate.toFixed(1)}%`,
      description: 'Percentage of calls connected',
    },
    {
      name: 'Failure Rate',
      value: `${failureRate.toFixed(1)}%`,
      description: 'Percentage of calls failed',
    },
  ];

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-center justify-between mb-6">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                    Campaign Statistics: {campaign.name}
                  </Dialog.Title>
                  <button
                    type="button"
                    className="rounded-md text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onClick={onClose}
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* Overview Stats */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
                  {stats.map((stat) => (
                    <div key={stat.name} className="bg-white rounded-lg border border-gray-200 p-4">
                      <div className="flex items-center">
                        <div className={`flex-shrink-0 p-2 rounded-lg ${stat.bgColor}`}>
                          <stat.icon className={`h-5 w-5 ${stat.color}`} />
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                          <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Performance Rates */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  {rates.map((rate) => (
                    <div key={rate.name} className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm font-medium text-gray-600">{rate.name}</p>
                      <p className="text-3xl font-bold text-gray-900 mt-1">{rate.value}</p>
                      <p className="text-xs text-gray-500 mt-1">{rate.description}</p>
                    </div>
                  ))}
                </div>

                {/* Campaign Details */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Campaign Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-600">Status:</span>
                      <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                        campaign.status === 'active' ? 'bg-green-100 text-green-800' :
                        campaign.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                        campaign.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {campaign.status}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Agent:</span>
                      <span className="ml-2 text-gray-900">{campaign.agent_id || 'No agent assigned'}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Created:</span>
                      <span className="ml-2 text-gray-900">
                        {new Date(campaign.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Last Updated:</span>
                      <span className="ml-2 text-gray-900">
                        {new Date(campaign.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                    {campaign.scheduled_start_date && (
                      <div>
                        <span className="font-medium text-gray-600">Scheduled Start:</span>
                        <span className="ml-2 text-gray-900">
                          {new Date(campaign.scheduled_start_date).toLocaleString()}
                        </span>
                      </div>
                    )}
                    {campaign.scheduled_end_date && (
                      <div>
                        <span className="font-medium text-gray-600">Scheduled End:</span>
                        <span className="ml-2 text-gray-900">
                          {new Date(campaign.scheduled_end_date).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                  {campaign.description && (
                    <div className="mt-3">
                      <span className="font-medium text-gray-600">Description:</span>
                      <p className="ml-2 text-gray-900 mt-1">{campaign.description}</p>
                    </div>
                  )}
                </div>

                <div className="flex justify-end mt-6">
                  <button
                    type="button"
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onClick={onClose}
                  >
                    Close
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
