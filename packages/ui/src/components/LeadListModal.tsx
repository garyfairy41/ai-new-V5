import { useState, useEffect } from 'react';
import { 
  XMarkIcon, 
  MagnifyingGlassIcon,
  TrashIcon,
  PencilIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import { DatabaseService } from '../services/database';
import type { CampaignLead } from '../lib/supabase';
import toast from 'react-hot-toast';

interface LeadListModalProps {
  campaignId: string;
  campaignName: string;
  onClose: () => void;
  onEdit: (lead: CampaignLead) => void;
}

type LeadStatus = 'pending' | 'calling' | 'called' | 'completed' | 'failed' | 'dnc';

const STATUS_COLORS: Record<LeadStatus, string> = {
  pending: 'bg-gray-100 text-gray-800',
  calling: 'bg-blue-100 text-blue-800',
  called: 'bg-green-100 text-green-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  dnc: 'bg-purple-100 text-purple-800'
};

const STATUS_LABELS: Record<LeadStatus, string> = {
  pending: 'Pending',
  calling: 'Calling',
  called: 'Called',
  completed: 'Completed',
  failed: 'Failed',
  dnc: 'Do Not Call'
};

export default function LeadListModal({
  campaignId,
  campaignName,
  onClose,
  onEdit
}: LeadListModalProps) {
  const [leads, setLeads] = useState<CampaignLead[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const itemsPerPage = 10;

  useEffect(() => {
    loadLeads();
  }, [campaignId]);

  const loadLeads = async () => {
    setLoading(true);
    try {
      const leadsData = await DatabaseService.getCampaignLeads(campaignId);
      setLeads(leadsData);
    } catch (error) {
      console.error('Error loading leads:', error);
      toast.error('Failed to load leads');
    } finally {
      setLoading(false);
    }
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = 
      lead.phone_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.notes?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedLeads = filteredLeads.slice(startIndex, startIndex + itemsPerPage);

  const handleSelectLead = (leadId: string) => {
    setSelectedLeads(prev => 
      prev.includes(leadId) 
        ? prev.filter(id => id !== leadId)
        : [...prev, leadId]
    );
  };

  const handleSelectAll = () => {
    if (selectedLeads.length === paginatedLeads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(paginatedLeads.map(lead => lead.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedLeads.length === 0) {
      toast.error('Please select leads to delete');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedLeads.length} lead(s)?`)) {
      return;
    }

    setLoading(true);
    try {
      await Promise.all(
        selectedLeads.map(leadId => DatabaseService.deleteLead(campaignId, leadId))
      );
      
      setLeads(prev => prev.filter(lead => !selectedLeads.includes(lead.id)));
      setSelectedLeads([]);
      toast.success(`Successfully deleted ${selectedLeads.length} lead(s)`);
    } catch (error) {
      console.error('Error deleting leads:', error);
      toast.error('Failed to delete leads');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (leadId: string, newStatus: LeadStatus) => {
    try {
      await DatabaseService.updateLeadStatus(campaignId, leadId, newStatus);
      setLeads(prev => 
        prev.map(lead => 
          lead.id === leadId ? { ...lead, status: newStatus } : lead
        )
      );
      toast.success('Lead status updated');
    } catch (error) {
      console.error('Error updating lead status:', error);
      toast.error('Failed to update lead status');
    }
  };

  const exportLeads = () => {
    const csvContent = [
      ['Phone Number', 'First Name', 'Last Name', 'Email', 'Address', 'Service Requested', 'Status', 'Call Attempts', 'Last Call', 'Notes'],
      ...filteredLeads.map(lead => [
        lead.phone_number,
        lead.first_name || '',
        lead.last_name || '',
        lead.email || '',
        lead.address || '',
        lead.service_requested || '',
        lead.status,
        lead.call_attempts?.toString() || '0',
        lead.last_called_at || '',
        lead.notes || ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${campaignName}-leads.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-4 mx-auto p-6 border w-full max-w-6xl shadow-lg rounded-lg bg-white my-8">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900">
            Campaign Leads - {campaignName}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Filters and Actions */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex flex-1 items-center space-x-4">
            <div className="relative flex-1 max-w-md">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search leads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as LeadStatus | 'all')}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="all">All Status</option>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={exportLeads}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
              Export
            </button>
            
            {selectedLeads.length > 0 && (
              <button
                onClick={handleBulkDelete}
                disabled={loading}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
              >
                <TrashIcon className="h-4 w-4 mr-2" />
                Delete ({selectedLeads.length})
              </button>
            )}
          </div>
        </div>

        {/* Leads Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectedLeads.length === paginatedLeads.length && paginatedLeads.length > 0}
                    onChange={handleSelectAll}
                    className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Address
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    Loading leads...
                  </td>
                </tr>
              ) : paginatedLeads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    No leads found
                  </td>
                </tr>
              ) : (
                paginatedLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedLeads.includes(lead.id)}
                        onChange={() => handleSelectLead(lead.id)}
                        className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {lead.first_name} {lead.last_name}
                      </div>
                      <div className="text-sm text-gray-500">{lead.phone_number}</div>
                      {lead.email && <div className="text-sm text-gray-500">{lead.email}</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{lead.address || '-'}</div>
                      <div className="text-sm text-gray-500">{lead.service_requested || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={lead.status}
                        onChange={(e) => handleUpdateStatus(lead.id, e.target.value as LeadStatus)}
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border-0 ${STATUS_COLORS[lead.status as LeadStatus]}`}
                      >
                        {Object.entries(STATUS_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {lead.call_attempts || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {lead.last_called_at ? new Date(lead.last_called_at).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => onEdit(lead)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(lead.id, 'failed')}
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-gray-700">
              Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredLeads.length)} of {filteredLeads.length} leads
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </button>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1 text-sm border rounded-md ${
                    page === currentPage
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{leads.length}</div>
              <div className="text-sm text-gray-500">Total Leads</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {leads.filter(l => l.status === 'completed').length}
              </div>
              <div className="text-sm text-gray-500">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {leads.filter(l => l.status === 'called').length}
              </div>
              <div className="text-sm text-gray-500">Called</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">
                {leads.filter(l => l.status === 'pending').length}
              </div>
              <div className="text-sm text-gray-500">Pending</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
