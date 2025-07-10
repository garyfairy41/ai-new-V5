import React, { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import type { IVRMenu, IVROption, AIAgent } from '../lib/supabase';

interface IVRMenuFormData {
  name: string;
  greeting_text: string;
  timeout_message: string;
  invalid_message: string;
  max_attempts: number;
}

interface IVRMenuManagerProps {
  agentId: string;
  onClose: () => void;
}

const IVRMenuManager: React.FC<IVRMenuManagerProps> = ({ agentId, onClose }) => {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [ivrMenu, setIvrMenu] = useState<IVRMenu | null>(null);
  const [ivrOptions, setIvrOptions] = useState<IVROption[]>([]);
  const [menuFormData, setMenuFormData] = useState<IVRMenuFormData>({
    name: '',
    greeting_text: '',
    timeout_message: 'I didn\'t hear your selection. Let me connect you with our general assistant.',
    invalid_message: 'That\'s not a valid option. Let me connect you with our general assistant.',
    max_attempts: 3
  });
  
  // Load agent and IVR menu data
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      
      setLoading(true);
      try {
        // Fetch the current agent
        const response = await fetch(`/api/agents/${agentId}`);
        if (!response.ok) throw new Error('Failed to fetch agent');
        const agent = await response.json();
        // Note: currentAgent state removed as it was unused
        
        // Fetch all agents for options with proper profile_id filtering
        const agentsResponse = await fetch(`/api/agents?profile_id=${user.id}`);
        if (!agentsResponse.ok) throw new Error('Failed to fetch agents');
        const agentsData = await agentsResponse.json();
        setAgents(agentsData);
        
        // If agent has an IVR menu, fetch it
        if (agent.ivr_menu_id) {
          const menuResponse = await fetch(`/api/ivr-menus/${agent.ivr_menu_id}`);
          if (menuResponse.ok) {
            const menuData = await menuResponse.json();
            setIvrMenu(menuData);
            setMenuFormData({
              name: menuData.name,
              greeting_text: menuData.greeting_text,
              timeout_message: menuData.timeout_message,
              invalid_message: menuData.invalid_message,
              max_attempts: menuData.max_attempts
            });
            
            if (menuData.ivr_options) {
              setIvrOptions(menuData.ivr_options);
            }
          }
        }
      } catch (error) {
        console.error('Error loading IVR data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (agentId && user) {
      loadData();
    }
  }, [agentId, user]);
  
  const handleMenuInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setMenuFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSaveMenu = async () => {
    try {
      let menuId = ivrMenu?.id;
      
      // If no menu exists, create one
      if (!menuId) {
        const createResponse = await fetch('/api/ivr-menus', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(menuFormData)
        });
        
        if (!createResponse.ok) throw new Error('Failed to create IVR menu');
        const newMenu = await createResponse.json();
        menuId = newMenu.id;
        setIvrMenu(newMenu);
        
        // Update agent with new menu ID
        await fetch(`/api/agents/${agentId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ivr_menu_id: menuId })
        });
      } else {
        // Update existing menu
        const updateResponse = await fetch(`/api/ivr-menus/${menuId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(menuFormData)
        });
        
        if (!updateResponse.ok) throw new Error('Failed to update IVR menu');
      }
      
      alert('IVR menu saved successfully!');
    } catch (error) {
      console.error('Error saving IVR menu:', error);
      alert('Error saving IVR menu. Please try again.');
    }
  };
  
  const handleAddOption = async () => {
    if (!ivrMenu?.id) {
      alert('Please save the IVR menu first');
      return;
    }
    
    try {
      const newOption: Partial<IVROption> = {
        ivr_menu_id: ivrMenu.id,
        digit: '',
        description: '',
        agent_id: ''
      };
      
      setIvrOptions([...ivrOptions, newOption as IVROption]);
    } catch (error) {
      console.error('Error adding option:', error);
    }
  };
  
  const handleOptionChange = (index: number, field: keyof IVROption, value: string) => {
    const updatedOptions = [...ivrOptions];
    updatedOptions[index] = {
      ...updatedOptions[index],
      [field]: value
    };
    setIvrOptions(updatedOptions);
  };
  
  const handleSaveOption = async (option: IVROption, index: number) => {
    try {
      if (!option.digit || !option.agent_id) {
        alert('Digit and target agent are required');
        return;
      }
      
      let response;
      
      if (option.id) {
        // Update existing option
        response = await fetch(`/api/ivr-options/${option.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(option)
        });
      } else {
        // Create new option
        response = await fetch('/api/ivr-options', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(option)
        });
      }
      
      if (!response.ok) throw new Error('Failed to save IVR option');
      
      const savedOption = await response.json();
      
      // Update the options array with the saved option
      const updatedOptions = [...ivrOptions];
      updatedOptions[index] = savedOption;
      setIvrOptions(updatedOptions);
      
      alert('Option saved successfully!');
    } catch (error) {
      console.error('Error saving option:', error);
      alert('Error saving option. Please try again.');
    }
  };
  
  const handleDeleteOption = async (option: IVROption, index: number) => {
    try {
      if (option.id) {
        // Delete from database
        await fetch(`/api/ivr-options/${option.id}`, {
          method: 'DELETE'
        });
      }
      
      // Remove from state
      const updatedOptions = ivrOptions.filter((_, i) => i !== index);
      setIvrOptions(updatedOptions);
    } catch (error) {
      console.error('Error deleting option:', error);
      alert('Error deleting option. Please try again.');
    }
  };
  
  if (loading) {
    return <div className="p-4">Loading IVR menu...</div>;
  }
  
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Phone Menu Configuration</h2>
        <button 
          onClick={onClose}
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          Close
        </button>
      </div>
      
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-4">Menu Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Menu Name</label>
            <input
              type="text"
              name="name"
              value={menuFormData.name || ''}
              onChange={handleMenuInputChange}
              className="w-full border rounded p-2"
              placeholder="Main Menu"
              required
            />
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">
              Greeting Text
              <span className="text-xs text-gray-500 ml-1">(What callers will hear)</span>
            </label>
            <textarea
              name="greeting_text"
              value={menuFormData.greeting_text || ''}
              onChange={handleMenuInputChange}
              className="w-full border rounded p-2 h-24"
              placeholder="Thank you for calling. Press 1 for sales, press 2 for support..."
              required
            />
            <p className="text-xs text-gray-600 mt-1">
              Include clear instructions for each menu option (e.g., "Press 1 for...")
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Timeout Message</label>
            <input
              type="text"
              name="timeout_message"
              value={menuFormData.timeout_message || ''}
              onChange={handleMenuInputChange}
              className="w-full border rounded p-2"
              placeholder="I didn't hear your selection..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Invalid Selection Message</label>
            <input
              type="text"
              name="invalid_message"
              value={menuFormData.invalid_message || ''}
              onChange={handleMenuInputChange}
              className="w-full border rounded p-2"
              placeholder="That's not a valid option..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Max Attempts</label>
            <input
              type="number"
              name="max_attempts"
              value={menuFormData.max_attempts || 3}
              onChange={handleMenuInputChange}
              className="w-full border rounded p-2"
              min="1"
              max="5"
            />
          </div>
        </div>
        
        <div className="mt-4">
          <button
            onClick={handleSaveMenu}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Save Menu Settings
          </button>
        </div>
      </div>
      
      {ivrMenu && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold">Menu Options</h3>
            <button
              onClick={handleAddOption}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Add Option
            </button>
          </div>
          
          {ivrOptions.length === 0 ? (
            <p className="text-gray-500 italic">No options configured. Add options to create your IVR menu.</p>
          ) : (
            <div className="space-y-4">
              {ivrOptions.map((option, index) => (
                <div key={option.id || index} className="border rounded p-4 bg-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Digit</label>
                      <input
                        type="text"
                        value={option.digit || ''}
                        onChange={(e) => handleOptionChange(index, 'digit', e.target.value)}
                        className="w-full border rounded p-2"
                        placeholder="1"
                        maxLength={1}
                        required
                      />
                      <p className="text-xs text-gray-600 mt-1">
                        Single digit that caller will press (0-9, *, #)
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Description</label>
                      <input
                        type="text"
                        value={option.description || ''}
                        onChange={(e) => handleOptionChange(index, 'description', e.target.value)}
                        className="w-full border rounded p-2"
                        placeholder="Sales Department"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Target Agent</label>
                      <select
                        value={option.agent_id || ''}
                        onChange={(e) => handleOptionChange(index, 'agent_id', e.target.value)}
                        className="w-full border rounded p-2"
                        required
                      >
                        <option value="">Select an agent</option>
                        {agents.map(agent => (
                          <option key={agent.id} value={agent.id}>
                            {agent.name} ({agent.agent_type})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div className="flex justify-end mt-4 space-x-2">
                    <button
                      onClick={() => handleSaveOption(option, index)}
                      className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => handleDeleteOption(option, index)}
                      className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default IVRMenuManager;