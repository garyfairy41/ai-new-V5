import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AppProvider } from './contexts/AppContext';
import { UserProvider } from './contexts/UserContext';
import { useAuth } from './hooks/useAuth';
import AuthPage from './pages/AuthPage';
import VerifyPage from './pages/VerifyPage';
import DashboardPage from './pages/DashboardPage';
import AgentsPage from './pages/AgentsPage';
import CallsPage from './pages/CallsPage';
import LiveCallsPage from './pages/LiveCallsPage';
import AppointmentsPage from './pages/AppointmentsPage';
import CampaignsPage from './pages/CampaignsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import DNCPage from './pages/DNCPage';
import WebhooksPage from './pages/WebhooksPage';
import BillingPage from './pages/BillingPage';
import StatusPage from './pages/StatusPage';
import SettingsPage from './pages/SettingsPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import RoutingPage from './pages/RoutingPage';
import Layout from './components/Layout';
import LoadingSpinner from './components/LoadingSpinner';
import ProtectedRoute from './components/ProtectedRoute';

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  // Check if this is a verification page
  const currentPath = window.location.pathname;
  const currentSearch = window.location.search;
  const isVerificationPage = currentPath === '/verify' || currentSearch.includes('token=') || currentSearch.includes('type=signup');
  
  if (isVerificationPage) {
    return <VerifyPage />;
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/verify" element={<VerifyPage />} />
        <Route path="/dashboard" element={
          <ProtectedRoute requiredPermission="dashboard">
            <DashboardPage />
          </ProtectedRoute>
        } />
        <Route path="/agents" element={
          <ProtectedRoute requiredPermission="agents">
            <AgentsPage />
          </ProtectedRoute>
        } />
        <Route path="/routing" element={
          <ProtectedRoute requiredPermission="agents">
            <RoutingPage />
          </ProtectedRoute>
        } />
        <Route path="/calls" element={
          <ProtectedRoute requiredPermission="calls">
            <CallsPage />
          </ProtectedRoute>
        } />
        <Route path="/live-calls" element={
          <ProtectedRoute requiredPermission="calls">
            <LiveCallsPage />
          </ProtectedRoute>
        } />
        <Route path="/appointments" element={
          <ProtectedRoute requiredPermission="appointments">
            <AppointmentsPage />
          </ProtectedRoute>
        } />
        <Route path="/campaigns" element={
          <ProtectedRoute requiredPermission="campaigns">
            <CampaignsPage />
          </ProtectedRoute>
        } />
        <Route path="/analytics" element={
          <ProtectedRoute requiredPermission="analytics">
            <AnalyticsPage />
          </ProtectedRoute>
        } />
        <Route path="/dnc" element={
          <ProtectedRoute requiredPermission="dnc">
            <DNCPage />
          </ProtectedRoute>
        } />
        <Route path="/webhooks" element={
          <ProtectedRoute requiredPermission="webhooks">
            <WebhooksPage />
          </ProtectedRoute>
        } />
        <Route path="/billing" element={
          <ProtectedRoute requiredPermission="billing">
            <BillingPage />
          </ProtectedRoute>
        } />
        <Route path="/status" element={
          <ProtectedRoute requiredPermission="status">
            <StatusPage />
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute requiredPermission="settings">
            <SettingsPage />
          </ProtectedRoute>
        } />
        <Route path="/admin/dashboard" element={
          <ProtectedRoute adminOnly>
            <AdminDashboardPage />
          </ProtectedRoute>
        } />
        <Route path="/admin/users" element={
          <ProtectedRoute adminOnly>
            <AdminUsersPage />
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  );
}

function App() {
  return (
    <Router>
      <AppProvider>
        <UserProvider>
          <AppContent />
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#fff',
                },
              },
              error: {
                duration: 5000,
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
        </UserProvider>
      </AppProvider>
    </Router>
  );
}

export default App;