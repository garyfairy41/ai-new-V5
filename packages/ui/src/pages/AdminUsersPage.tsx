import { useState, useEffect } from 'react';
import { PlusIcon, TrashIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { AdminAPI, type CreateUserData, type UserData } from '../services/adminApi';

interface UserPermissions {
  dashboard: boolean
  agents: boolean
  calls: boolean
  campaigns: boolean
  analytics: boolean
  appointments: boolean
  billing: boolean
  settings: boolean
  webhooks: boolean
  dnc: boolean
  status: boolean
}

// Use the UserData interface from AdminAPI
type User = UserData & {
  generatedPassword?: string
}

const defaultPermissions: UserPermissions = {
  dashboard: true,
  agents: false,
  calls: false,
  campaigns: false,
  analytics: false,
  appointments: false,
  billing: false,
  settings: false,
  webhooks: false,
  dnc: false,
  status: false
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    clientName: '',
    companyName: '',
    phoneNumber: '',
    usageCap: 1000, // default 1000 minutes per month
    maxAgents: 3, // default 3 agents per user
    permissions: { ...defaultPermissions }
  });

  // Load users on component mount
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const { users: fetchedUsers, error } = await AdminAPI.getUsers();
      if (error) {
        toast.error(`Failed to load users: ${error}`);
      } else {
        setUsers(fetchedUsers);
      }
    } catch {
      toast.error('Failed to load users');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Generate random password
  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const generatedPassword = generatePassword();
      
      const createUserData: CreateUserData = {
        email: formData.email,
        password: generatedPassword,
        clientName: formData.clientName,
        companyName: formData.companyName,
        phoneNumber: formData.phoneNumber,
        usageCap: formData.usageCap,
        maxAgents: formData.maxAgents,
        permissions: formData.permissions
      };

      const { user: newUser, error } = await AdminAPI.createUser(createUserData);

      if (error) {
        toast.error(`Failed to create user: ${error}`);
        return;
      }

      if (newUser) {
        setUsers(prev => [...prev, { ...newUser, generatedPassword }]);
        
        // Show the generated password to admin with copy functionality
        const credentials = `Email: ${formData.email}\nPassword: ${generatedPassword}`;
        navigator.clipboard.writeText(credentials);
        
        toast.success(
          `✅ User created successfully!\n\n📧 Email: ${formData.email}\n🔑 Password: ${generatedPassword}\n📋 Credentials copied to clipboard!\n\n⚠️ Please save these credentials and share with the customer.`,
          { duration: 15000 }
        );

        // Reset form
        setFormData({
          email: '',
          clientName: '',
          companyName: '',
          phoneNumber: '',
          usageCap: 1000,
          maxAgents: 3,
          permissions: { ...defaultPermissions }
        });
        setShowCreateForm(false);
      }

    } catch (error) {
      console.error('Error creating user:', error);
      toast.error('Failed to create user. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePermissionChange = (permission: keyof UserPermissions) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [permission]: !prev.permissions[permission]
      }
    }));
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await AdminAPI.updateUserStatus(userId, !currentStatus);
      if (error) {
        toast.error(`Failed to update user status: ${error}`);
        return;
      }

      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, isActive: !currentStatus } : user
      ));

      toast.success(`User ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
    } catch {
      toast.error('Failed to update user status');
    }
  };

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to delete user ${userEmail}? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await AdminAPI.deleteUser(userId);
      if (error) {
        toast.error(`Failed to delete user: ${error}`);
        return;
      }

      setUsers(prev => prev.filter(user => user.id !== userId));
      toast.success('User deleted successfully');
    } catch {
      toast.error('Failed to delete user');
    }
  };



  const permissionLabels = {
    dashboard: 'Dashboard',
    agents: 'AI Agents',
    calls: 'Call History',
    campaigns: 'Campaigns',
    analytics: 'Analytics',
    appointments: 'Appointments',
    billing: 'Billing',
    settings: 'Settings',
    webhooks: 'Webhooks',
    dnc: 'DNC List',
    status: 'System Status'
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600">Create and manage customer accounts</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <PlusIcon className="h-5 w-5" />
          Create User
        </button>
      </div>

      {/* Create User Form */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Create New User</h2>
            
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.clientName}
                    onChange={(e) => setFormData(prev => ({ ...prev, clientName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monthly Usage Cap (Minutes) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.usageCap}
                    onChange={(e) => setFormData(prev => ({ ...prev, usageCap: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="1000"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Maximum minutes this user can use per month (0 = unlimited)
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Maximum AI Agents *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="100"
                    value={formData.maxAgents}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxAgents: parseInt(e.target.value) || 1 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="3"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Maximum number of AI agents this user can create
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Permissions (Select what this user can access)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(permissionLabels).map(([key, label]) => (
                    <label key={key} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.permissions[key as keyof UserPermissions]}
                        onChange={() => handlePermissionChange(key as keyof UserPermissions)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isLoading ? 'Creating...' : 'Create User & Generate Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Customer Accounts</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Permissions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoadingUsers ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      <span className="ml-2">Loading users...</span>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No users created yet. Click "Create User" to add your first customer.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{user.clientName}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                        {user.phoneNumber && (
                          <div className="text-sm text-gray-500">{user.phoneNumber}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.companyName || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {user.usedMinutes} / {user.usageCap === 0 ? '∞' : user.usageCap} min
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div 
                          className={`h-2 rounded-full ${
                            user.usageCap === 0 ? 'bg-blue-600' : 
                            (user.usedMinutes / user.usageCap) > 0.9 ? 'bg-red-600' :
                            (user.usedMinutes / user.usageCap) > 0.7 ? 'bg-yellow-600' : 'bg-green-600'
                          }`}
                          style={{ 
                            width: user.usageCap === 0 ? '20%' : `${Math.min((user.usedMinutes / user.usageCap) * 100, 100)}%` 
                          }}
                        ></div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {user.usageCap === 0 ? 'Unlimited' : 
                         `${Math.round((user.usedMinutes / user.usageCap) * 100)}% used`}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(user.permissions)
                          .filter(([, enabled]) => enabled)
                          .map(([permission]) => (
                            <span
                              key={permission}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {permissionLabels[permission as keyof UserPermissions]}
                            </span>
                          ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          user.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleToggleUserStatus(user.id, user.isActive)}
                        className={`${
                          user.isActive ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'
                        }`}
                        title={user.isActive ? 'Deactivate user' : 'Activate user'}
                      >
                        {user.isActive ? (
                          <EyeSlashIcon className="h-5 w-5" />
                        ) : (
                          <EyeIcon className="h-5 w-5" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id, user.email)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete user"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}