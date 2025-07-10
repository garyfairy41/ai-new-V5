import React, { useState, useEffect } from 'react';
import { XMarkIcon, PhoneIcon } from '@heroicons/react/24/outline';
import { DatabaseService } from '../services/database';
import { useUser } from '../contexts/UserContext';
import type { AIAgent } from '../lib/supabase';
import toast from 'react-hot-toast';

interface TestCallModalProps {
  onClose: () => void;
}

export default function TestCallModal({ onClose }: TestCallModalProps) {
  const { user } = useUser();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('');
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    if (!user) return;
    try {
      const agentsData = await DatabaseService.getAIAgents(user.id);
      const activeAgents = agentsData.filter(agent => 
        agent.is_active && (agent.call_direction === 'outbound' || agent.call_direction === 'both')
      );
      setAgents(activeAgents);
      
      if (activeAgents.length === 1) {
        setSelectedAgent(activeAgents[0].id);
      }
    } catch (error) {
      console.error('Error loading agents:', error);
      toast.error('Failed to load AI agents');
    }
  };

  const validatePhoneNumber = (phone: string) => {
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    
    // Check if it's a valid US phone number (10 or 11 digits)
    if (cleaned.length === 10) {
      return `+1${cleaned}`;
    } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+${cleaned}`;
    }
    return null;
  };

  const handleTestCall = async () => {
    const validatedNumber = validatePhoneNumber(phoneNumber);
    
    if (!validatedNumber) {
      toast.error('Please enter a valid phone number (10 digits)');
      return;
    }

    if (!selectedAgent) {
      toast.error('Please select an AI agent');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/test-call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: validatedNumber,
          from: process.env.TWILIO_PHONE_NUMBER || '+18186006909',
          agentId: selectedAgent,
          message: 'This is a test call from your AI call center system. If you can hear this message, your outbound calling is working correctly.'
        })
      });

      const result = await response.json();

      if (response.ok) {
        toast.success(`Test call initiated to ${validatedNumber}! Call SID: ${result.callSid}`);
        onClose();
      } else {
        toast.error(`Failed to initiate test call: ${result.error}`);
      }
    } catch (error) {
      console.error('Error making test call:', error);
      toast.error('Failed to initiate test call. Please check your configuration.');
    } finally {
      setLoading(false);
    }
  };

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digit characters
    const cleaned = value.replace(/\D/g, '');
    
    // Format as (XXX) XXX-XXXX
    if (cleaned.length >= 6) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
    } else if (cleaned.length >= 3) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    } else {
      return cleaned;
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-6 border w-full max-w-md shadow-lg rounded-lg bg-white">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-gray-900">Test Outbound Call</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex">
              <PhoneIcon className="h-5 w-5 text-blue-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  Test Your Calling Setup
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>Enter your phone number to receive a test call and verify your outbound calling configuration.</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={handlePhoneChange}
              placeholder="(555) 123-4567"
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              maxLength={14}
            />
            <p className="mt-1 text-sm text-gray-500">
              Enter a 10-digit US phone number
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              AI Agent <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select an AI Agent</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name} ({agent.agent_type})
                </option>
              ))}
            </select>
            <p className="mt-1 text-sm text-gray-500">
              Choose which AI agent will handle the test call
            </p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="text-sm text-yellow-800">
              <p><strong>What this test does:</strong></p>
              <ul className="mt-2 space-y-1 list-disc list-inside">
                <li>Initiates a real outbound call using Twilio</li>
                <li>Uses your configured Twilio number as caller ID</li>
                <li>Plays a test message when you answer</li>
                <li>Verifies your calling infrastructure is working</li>
              </ul>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={handleTestCall}
              disabled={loading || !phoneNumber || !selectedAgent}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Calling...
                </>
              ) : (
                <>
                  <PhoneIcon className="h-4 w-4 mr-2" />
                  Make Test Call
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
