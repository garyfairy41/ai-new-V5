import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { 
  XMarkIcon, 
  PlusIcon, 
  TrashIcon, 
  DocumentArrowUpIcon,
  MagnifyingGlassIcon,
  PhoneIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import type { Campaign, Lead as CampaignLead } from '../../services/campaignService';
import { campaignService } from '../../services/campaignService';
import toast from 'react-hot-toast';

interface LeadsModalProps {
  campaign: Campaign;
  isOpen: boolean;
  onClose: () => void;
  onLeadsUpdated: () => void;
}

interface NewLead {
  phone_number: string;
  first_name: string;
  last_name: string;
  email: string;
}

export default function LeadsModal({ campaign, isOpen, onClose, onLeadsUpdated }: LeadsModalProps) {
  const [leads, setLeads] = useState<CampaignLead[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLead, setNewLead] = useState<NewLead>({
    phone_number: '',
    first_name: '',
    last_name: '',
    email: ''
  });
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadLeads();
    }
  }, [isOpen, campaign.id]);

  const loadLeads = async () => {
    try {
      setLoading(true);
      const campaignLeads = await campaignService.getCampaignLeads(campaign.id);
      setLeads(campaignLeads);
    } catch (error) {
      console.error('Error loading leads:', error);
      toast.error('Failed to load leads');
    } finally {
      setLoading(false);
    }
  };

  const filteredLeads = leads.filter(lead => 
    lead.phone_number.includes(searchTerm) ||
    (lead.first_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (lead.last_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (lead.email?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleAddLead = async () => {
    if (!newLead.phone_number.trim()) {
      toast.error('Phone number is required');
      return;
    }

    try {
      await campaignService.addLeadsToCampaign(campaign.id, [newLead]);
      toast.success('Lead added successfully');
      setNewLead({ phone_number: '', first_name: '', last_name: '', email: '' });
      setShowAddForm(false);
      loadLeads();
      onLeadsUpdated();
    } catch (error) {
      console.error('Error adding lead:', error);
      toast.error('Failed to add lead');
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    if (!confirm('Are you sure you want to delete this lead?')) return;

    try {
      await campaignService.deleteLead(leadId);
      toast.success('Lead deleted successfully');
      loadLeads();
      onLeadsUpdated();
    } catch (error) {
      console.error('Error deleting lead:', error);
      toast.error('Failed to delete lead');
    }
  };

  const handleCsvUpload = async () => {
    if (!csvFile) {
      toast.error('Please select a CSV file');
      return;
    }

    try {
      setUploading(true);
      
      const text = await csvFile.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length === 0) {
        toast.error('CSV file is empty');
        return;
      }

      // Parse CSV (assuming first line is header)
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const phoneIndex = headers.findIndex(h => h.includes('phone'));
      const firstNameIndex = headers.findIndex(h => h.includes('first') || h.includes('fname'));
      const lastNameIndex = headers.findIndex(h => h.includes('last') || h.includes('lname'));
      const emailIndex = headers.findIndex(h => h.includes('email'));

      if (phoneIndex === -1) {
        toast.error('CSV must contain a phone number column');
        return;
      }

      const leadsToAdd: NewLead[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const columns = lines[i].split(',').map(c => c.trim().replace(/"/g, ''));
        
        if (columns[phoneIndex]) {
          leadsToAdd.push({
            phone_number: columns[phoneIndex],
            first_name: firstNameIndex >= 0 ? columns[firstNameIndex] || '' : '',
            last_name: lastNameIndex >= 0 ? columns[lastNameIndex] || '' : '',
            email: emailIndex >= 0 ? columns[emailIndex] || '' : ''
          });
        }
      }

      if (leadsToAdd.length === 0) {
        toast.error('No valid leads found in CSV');
        return;
      }

      await campaignService.addLeadsToCampaign(campaign.id, leadsToAdd);
      toast.success(`Successfully imported ${leadsToAdd.length} leads`);
      setCsvFile(null);
      loadLeads();
      onLeadsUpdated();
      
    } catch (error) {
      console.error('Error uploading CSV:', error);
      toast.error('Failed to upload CSV file');
    } finally {
      setUploading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'called':
        return <PhoneIcon className="h-5 w-5 text-blue-500" />;
      case 'calling':
        return <PhoneIcon className="h-5 w-5 text-yellow-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      pending: 'bg-gray-100 text-gray-800',
      calling: 'bg-yellow-100 text-yellow-800',
      called: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800'
    };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status as keyof typeof colors] || colors.pending}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

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
              <Dialog.Panel className="w-full max-w-6xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-center justify-between mb-6">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                    Manage Leads: {campaign.name}
                  </Dialog.Title>
                  <button
                    type="button"
                    className="rounded-md text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onClick={onClose}
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* Actions Bar */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="flex-1 relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search leads..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddForm(!showAddForm)}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Add Lead
                    </button>
                    
                    <div className="relative">
                      <input
                        type="file"
                        accept=".csv"
                        onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                        className="hidden"
                        id="csv-upload"
                      />
                      <label
                        htmlFor="csv-upload"
                        className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      >
                        <DocumentArrowUpIcon className="h-4 w-4 mr-2" />
                        {csvFile ? csvFile.name : 'Import CSV'}
                      </label>
                    </div>
                    
                    {csvFile && (
                      <button
                        type="button"
                        onClick={handleCsvUpload}
                        disabled={uploading}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                      >
                        {uploading ? 'Uploading...' : 'Upload'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Add Lead Form */}
                {showAddForm && (
                  <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Add New Lead</h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <input
                        type="text"
                        placeholder="Phone Number *"
                        className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        value={newLead.phone_number}
                        onChange={(e) => setNewLead({ ...newLead, phone_number: e.target.value })}
                      />
                      <input
                        type="text"
                        placeholder="First Name"
                        className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        value={newLead.first_name}
                        onChange={(e) => setNewLead({ ...newLead, first_name: e.target.value })}
                      />
                      <input
                        type="text"
                        placeholder="Last Name"
                        className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        value={newLead.last_name}
                        onChange={(e) => setNewLead({ ...newLead, last_name: e.target.value })}
                      />
                      <input
                        type="email"
                        placeholder="Email"
                        className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        value={newLead.email}
                        onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                      />
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                      <button
                        type="button"
                        onClick={() => setShowAddForm(false)}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleAddLead}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                      >
                        Add Lead
                      </button>
                    </div>
                  </div>
                )}

                {/* Leads Table */}
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Contact
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Phone
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Attempts
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Last Call
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {loading ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                            Loading leads...
                          </td>
                        </tr>
                      ) : filteredLeads.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                            {searchTerm ? 'No leads match your search' : 'No leads added yet'}
                          </td>
                        </tr>
                      ) : (
                        filteredLeads.map((lead) => (
                          <tr key={lead.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {lead.first_name} {lead.last_name}
                                </div>
                                {lead.email && (
                                  <div className="text-sm text-gray-500">{lead.email}</div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {lead.phone_number}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                {getStatusIcon(lead.status)}
                                {getStatusBadge(lead.status)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {lead.call_attempts}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {lead.last_call_at 
                                ? new Date(lead.last_call_at).toLocaleDateString() 
                                : 'Never'
                              }
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() => handleDeleteLead(lead.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Summary */}
                <div className="mt-4 text-sm text-gray-600">
                  Showing {filteredLeads.length} of {leads.length} leads
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
