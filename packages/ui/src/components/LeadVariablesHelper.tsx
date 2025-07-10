import { useState } from 'react';
import { InformationCircleIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline';
import { getPersonalizationVariables, getPersonalizationHelpText } from '../services/lead-variables';
import toast from 'react-hot-toast';

interface LeadVariablesHelperProps {
  onVariableInsert?: (variable: string) => void;
}

export default function LeadVariablesHelper({ onVariableInsert }: LeadVariablesHelperProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const variables = getPersonalizationVariables();

  const handleCopyVariable = (variable: string) => {
    const placeholder = `{{${variable}}}`;
    navigator.clipboard.writeText(placeholder);
    toast.success(`Copied ${placeholder} to clipboard`);
    
    if (onVariableInsert) {
      onVariableInsert(placeholder);
    }
  };

  const handleCopyAllHelp = () => {
    navigator.clipboard.writeText(getPersonalizationHelpText());
    toast.success('Copied help text to clipboard');
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <InformationCircleIcon className="h-5 w-5 text-blue-500 mr-2" />
          <h3 className="text-sm font-medium text-blue-900">
            Lead Data Variables
          </h3>
        </div>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleCopyAllHelp}
            className="text-blue-600 hover:text-blue-800 text-xs flex items-center"
          >
            <ClipboardDocumentIcon className="h-4 w-4 mr-1" />
            Copy Help
          </button>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-blue-600 hover:text-blue-800 text-xs"
          >
            {isExpanded ? 'Hide' : 'Show'} Variables
          </button>
        </div>
      </div>
      
      <p className="text-xs text-blue-700 mt-2">
        Use these variables in system instructions to personalize conversations with lead data.
      </p>

      {isExpanded && (
        <div className="mt-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {variables.map((variable) => (
              <button
                key={variable}
                type="button"
                onClick={() => handleCopyVariable(variable)}
                className="text-left p-2 bg-white border border-blue-200 rounded text-xs hover:bg-blue-50 hover:border-blue-300 transition-colors"
                title={`Click to copy {{${variable}}}`}
              >
                <code className="text-blue-800">{'{{' + variable + '}}'}</code>
              </button>
            ))}
          </div>
          
          <div className="mt-4 p-3 bg-white border border-blue-200 rounded text-xs">
            <strong className="text-blue-900">Example usage:</strong>
            <div className="mt-2 font-mono text-blue-800 bg-blue-50 p-2 rounded">
              "Hi {'{{firstName}}'}, I'm calling about your {'{{serviceRequested}}'} installation at {'{{address}}'}.
              Is this still the best number to reach you?"
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
