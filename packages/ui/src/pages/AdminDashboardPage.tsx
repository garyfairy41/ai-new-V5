import { useState, useEffect } from 'react';
import { 
  UsersIcon, 
  ServerIcon, 
  ChartBarIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  PhoneIcon,
  CircleStackIcon,
  CloudIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalCalls: number;
  activeCalls: number;
  systemUptime: string;
  serverHealth: 'healthy' | 'warning' | 'error';
  databaseStatus: 'connected' | 'disconnected' | 'slow';
  apiStatus: 'operational' | 'degraded' | 'down';
}

interface SystemService {
  name: string;
  status: 'running' | 'stopped' | 'error';
  uptime: string;
  memory: string;
  cpu: string;
  restarts: number;
}

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<SystemStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalCalls: 0,
    activeCalls: 0,
    systemUptime: '0h 0m',
    serverHealth: 'healthy',
    databaseStatus: 'connected',
    apiStatus: 'operational'
  });
  const [services, setServices] = useState<SystemService[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'services' | 'users' | 'logs'>('overview');

  useEffect(() => {
    if (user) {
      loadDashboardData();
      // Refresh data every 30 seconds
      const interval = setInterval(loadDashboardData, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load system stats
      const statsResponse = await fetch('/api/admin/stats');
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

      // Load services status
      const servicesResponse = await fetch('/api/admin/services');
      if (servicesResponse.ok) {
        const servicesData = await servicesResponse.json();
        setServices(servicesData);
      }

      // Load system logs
      const logsResponse = await fetch('/api/admin/logs?lines=50');
      if (logsResponse.ok) {
        const logsData = await logsResponse.json();
        setLogs(logsData);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleServiceAction = async (serviceName: string, action: 'start' | 'stop' | 'restart') => {
    try {
      const response = await fetch(`/api/admin/services/${serviceName}/${action}`, {
        method: 'POST'
      });

      if (response.ok) {
        toast.success(`Service ${serviceName} ${action}ed successfully`);
        loadDashboardData();
      } else {
        throw new Error(`Failed to ${action} service`);
      }
    } catch (error) {
      console.error(`Error ${action}ing service:`, error);
      toast.error(`Failed to ${action} service ${serviceName}`);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
      case 'healthy':
      case 'connected':
      case 'operational':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'warning':
      case 'degraded':
      case 'slow':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      case 'stopped':
      case 'error':
      case 'disconnected':
      case 'down':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
      case 'healthy':
      case 'connected':
      case 'operational':
        return 'text-green-600 bg-green-100';
      case 'warning':
      case 'degraded':
      case 'slow':
        return 'text-yellow-600 bg-yellow-100';
      case 'stopped':
      case 'error':
      case 'disconnected':
      case 'down':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading && services.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">System overview and management</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`px-3 py-1 rounded-full text-sm ${getStatusColor(stats.serverHealth)}`}>
            {getStatusIcon(stats.serverHealth)}
            <span className="ml-1">System {stats.serverHealth}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: 'Overview', icon: ChartBarIcon },
            { id: 'services', name: 'Services', icon: ServerIcon },
            { id: 'users', name: 'Users', icon: UsersIcon },
            { id: 'logs', name: 'Logs', icon: CircleStackIcon }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as any)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                selectedTab === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-5 w-5" />
              <span>{tab.name}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {selectedTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <UsersIcon className="h-8 w-8 text-blue-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Users</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.totalUsers}</dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <PhoneIcon className="h-8 w-8 text-green-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Active Calls</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.activeCalls}</dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ClockIcon className="h-8 w-8 text-purple-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">System Uptime</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.systemUptime}</dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ShieldCheckIcon className="h-8 w-8 text-indigo-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">API Status</dt>
                    <dd className="text-lg font-medium text-gray-900 capitalize">{stats.apiStatus}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* System Health */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium">System Health</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <ServerIcon className="h-6 w-6 text-gray-600" />
                    <span className="font-medium">Server</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(stats.serverHealth)}
                    <span className={`px-2 py-1 rounded text-sm ${getStatusColor(stats.serverHealth)}`}>
                      {stats.serverHealth}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <CircleStackIcon className="h-6 w-6 text-gray-600" />
                    <span className="font-medium">Database</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(stats.databaseStatus)}
                    <span className={`px-2 py-1 rounded text-sm ${getStatusColor(stats.databaseStatus)}`}>
                      {stats.databaseStatus}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <CloudIcon className="h-6 w-6 text-gray-600" />
                    <span className="font-medium">API</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(stats.apiStatus)}
                    <span className={`px-2 py-1 rounded text-sm ${getStatusColor(stats.apiStatus)}`}>
                      {stats.apiStatus}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Services Tab */}
      {selectedTab === 'services' && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium">System Services</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Uptime
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Memory
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CPU
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {services.map((service) => (
                  <tr key={service.name}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <ServerIcon className="h-5 w-5 text-gray-400 mr-3" />
                        <span className="text-sm font-medium text-gray-900">{service.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(service.status)}
                        <span className={`px-2 py-1 rounded text-sm ${getStatusColor(service.status)}`}>
                          {service.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {service.uptime}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {service.memory}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {service.cpu}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {service.status === 'stopped' ? (
                          <button
                            onClick={() => handleServiceAction(service.name, 'start')}
                            className="text-green-600 hover:text-green-900"
                          >
                            Start
                          </button>
                        ) : (
                          <button
                            onClick={() => handleServiceAction(service.name, 'stop')}
                            className="text-red-600 hover:text-red-900"
                          >
                            Stop
                          </button>
                        )}
                        <button
                          onClick={() => handleServiceAction(service.name, 'restart')}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Restart
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {selectedTab === 'users' && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center">
            <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">User Management</h3>
            <p className="mt-1 text-sm text-gray-500">
              Go to the dedicated Users page for full user management capabilities.
            </p>
            <div className="mt-6">
              <button
                onClick={() => window.location.href = '/admin/users'}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <UsersIcon className="-ml-1 mr-2 h-5 w-5" />
                Manage Users
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logs Tab */}
      {selectedTab === 'logs' && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium">System Logs</h3>
          </div>
          <div className="p-6">
            <div className="bg-gray-900 rounded-lg p-4 h-96 overflow-y-auto">
              <div className="font-mono text-sm space-y-1">
                {logs.length > 0 ? (
                  logs.map((log, index) => (
                    <div 
                      key={index} 
                      className={`${
                        log.level === 'error' ? 'text-red-400' : 
                        log.level === 'warning' ? 'text-yellow-400' : 
                        'text-green-400'
                      }`}
                    >
                      [{log.timestamp}] {log.level.toUpperCase()}: {log.message}
                    </div>
                  ))
                ) : (
                  <div className="text-gray-400">
                    <div>[{new Date().toISOString()}] INFO: System monitoring active</div>
                    <div>[{new Date().toISOString()}] INFO: No recent log entries</div>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-4 flex justify-between items-center">
              <p className="text-sm text-gray-500">Live system logs - Auto-refreshing every 30 seconds</p>
              <button
                onClick={loadDashboardData}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}