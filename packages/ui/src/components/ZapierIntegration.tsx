import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

interface ZapierWebhook {
  id: string;
  name: string;
  webhook_url: string;
  event_type: 'call_completed' | 'appointment_scheduled' | 'lead_updated' | 'follow_up_required';
  is_active: boolean;
  created_at: string;
}

interface WebhookFormData {
  name: string;
  webhook_url: string;
  event_type: 'call_completed' | 'appointment_scheduled' | 'lead_updated' | 'follow_up_required';
  is_active: boolean;
}

const EVENT_TYPE_OPTIONS = [
  { value: 'call_completed', label: 'Call Completed', description: 'Triggered when a call ends' },
  { value: 'appointment_scheduled', label: 'Appointment Scheduled', description: 'Triggered when an appointment is booked' },
  { value: 'lead_updated', label: 'Lead Updated', description: 'Triggered when lead status changes' },
  { value: 'follow_up_required', label: 'Follow-up Required', description: 'Triggered when follow-up is needed' }
];

export default function ZapierIntegration() {
  const { user } = useAuth();
  const [webhooks, setWebhooks] = useState<ZapierWebhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<ZapierWebhook | null>(null);
  const [formData, setFormData] = useState<WebhookFormData>({
    name: '',
    webhook_url: '',
    event_type: 'call_completed',
    is_active: true
  });

  useEffect(() => {
    if (user) {
      loadWebhooks();
    }
  }, [user]);

  const loadWebhooks = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/zapier/webhooks?profile_id=${user?.id}`);
      if (response.ok) {
        const webhooks = await response.json();
        setWebhooks(webhooks);
      }
    } catch (error) {
      console.error('Error loading webhooks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const webhookData = {
        ...formData,
        profile_id: user?.id
      };

      const response = await fetch('/api/zapier/webhooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookData)
      });

      if (response.ok) {
        const webhook = await response.json();
        setWebhooks(prev => [...prev, webhook]);
        resetForm();
        
        // Test the webhook
        if (webhook.is_active) {
          await testWebhook(webhook);
        }
      } else {
        throw new Error('Failed to save webhook');
      }
    } catch (error) {
      console.error('Error saving webhook:', error);
      alert('Error saving webhook. Please try again.');
    }
  };

  const testWebhook = async (webhook: ZapierWebhook) => {
    try {
      const testPayload = {
        event_type: webhook.event_type,
        timestamp: new Date().toISOString(),
        test: true,
        data: {
          message: 'This is a test webhook from AI Call Center',
          webhook_name: webhook.name
        }
      };

      const response = await fetch(webhook.webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testPayload)
      });

      if (response.ok) {
        alert('✅ Test webhook sent successfully!');
      } else {
        alert('⚠️ Test webhook failed. Please check your Zapier webhook URL.');
      }
    } catch (error) {
      console.error('Error testing webhook:', error);
      alert('❌ Error testing webhook. Please check your URL.');
    }
  };

  const handleEdit = (webhook: ZapierWebhook) => {
    setEditingWebhook(webhook);
    setFormData({
      name: webhook.name,
      webhook_url: webhook.webhook_url,
      event_type: webhook.event_type,
      is_active: webhook.is_active
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this webhook?')) {
      try {
        const response = await fetch(`/api/zapier/webhooks/${id}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          setWebhooks(prev => prev.filter(w => w.id !== id));
        } else {
          throw new Error('Failed to delete webhook');
        }
      } catch (error) {
        console.error('Error deleting webhook:', error);
        alert('Error deleting webhook. Please try again.');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      webhook_url: '',
      event_type: 'call_completed',
      is_active: true
    });
    setEditingWebhook(null);
    setShowForm(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  if (loading) {
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Zapier Integration</h2>
          <p className="text-gray-600">Connect your AI Call Center to 1000+ apps with Zapier webhooks</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Add Webhook
        </button>
      </div>

      {/* Setup Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-800 mb-2">🔗 How to Set Up Zapier Webhooks</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm text-blue-700">
          <li>Create a new Zap in Zapier</li>
          <li>Choose "Webhooks by Zapier" as the trigger</li>
          <li>Select "Catch Hook" and copy the webhook URL</li>
          <li>Paste the URL below and configure your event type</li>
          <li>Test the webhook to ensure it's working</li>
          <li>Complete your Zap with the action you want (Gmail, Slack, CRM, etc.)</li>
        </ol>
      </div>

      {/* Webhook Form */}
      {showForm && (
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">
            {editingWebhook ? 'Edit Webhook' : 'Add New Webhook'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Webhook Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g., Send to Slack, Create CRM Contact"
                className="w-full border rounded p-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Zapier Webhook URL</label>
              <input
                type="url"
                name="webhook_url"
                value={formData.webhook_url}
                onChange={handleInputChange}
                placeholder="https://hooks.zapier.com/hooks/catch/..."
                className="w-full border rounded p-2"
                required
              />
              <p className="text-xs text-gray-600 mt-1">
                Get this URL from your Zapier "Catch Hook" trigger
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Event Type</label>
              <select
                name="event_type"
                value={formData.event_type}
                onChange={handleInputChange}
                className="w-full border rounded p-2"
                required
              >
                {EVENT_TYPE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label} - {option.description}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleInputChange}
                className="mr-2"
              />
              <label className="text-sm">Active (webhook will be triggered)</label>
            </div>

            <div className="flex space-x-2">
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                {editingWebhook ? 'Update' : 'Create'} & Test Webhook
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Webhooks List */}
      <div className="bg-white border rounded-lg">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Configured Webhooks ({webhooks.length})</h3>
        </div>
        
        {webhooks.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>No webhooks configured yet.</p>
            <p className="text-sm">Add your first webhook to start automating with Zapier!</p>
          </div>
        ) : (
          <div className="divide-y">
            {webhooks.map(webhook => (
              <div key={webhook.id} className="p-4 flex justify-between items-center">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-medium">{webhook.name}</h4>
                    <span className={`px-2 py-1 text-xs rounded ${
                      webhook.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {webhook.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Event: {EVENT_TYPE_OPTIONS.find(e => e.value === webhook.event_type)?.label}
                  </p>
                  <p className="text-xs text-gray-500 truncate max-w-md">
                    URL: {webhook.webhook_url}
                  </p>
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => testWebhook(webhook)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Test
                  </button>
                  <button
                    onClick={() => handleEdit(webhook)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(webhook.id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sample Payload */}
      <div className="bg-gray-50 border rounded-lg p-4">
        <h3 className="font-semibold mb-2">📋 Sample Webhook Payload</h3>
        <pre className="text-xs bg-white p-3 rounded border overflow-x-auto">
{`{
  "event_type": "call_completed",
  "timestamp": "2025-06-23T12:00:00Z",
  "user_id": "user-123",
  "call_id": "call-456",
  "data": {
    "duration": 180,
    "caller_number": "+1234567890",
    "agent_name": "Sales Agent",
    "summary": "Customer interested in premium plan",
    "sentiment": "positive",
    "action_items": ["Send pricing info", "Schedule demo"]
  }
}`}
        </pre>
      </div>
    </div>
  );
}