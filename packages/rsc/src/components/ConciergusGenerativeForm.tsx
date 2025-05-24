import React, { ReactNode, useState } from 'react';
import { 
  GenerativeFormConfig, 
  GenerativeFormField,
  LoadingState 
} from '../types/rsc';

export interface ConciergusGenerativeFormProps {
  /** Configuration for the form generation */
  config?: GenerativeFormConfig;
  /** Whether the form is currently being generated */
  isGenerating?: boolean;
  /** Loading state configuration */
  loadingState?: LoadingState;
  /** Custom CSS classes */
  className?: string;
  /** Callback when form is submitted */
  onSubmit?: (data: Record<string, any>) => Promise<void> | void;
  /** Callback when form generation is requested */
  onGenerate?: (prompt: string) => Promise<void> | void;
  /** Children to render when no form is configured */
  children?: ReactNode;
}

/**
 * ConciergusGenerativeForm - A form component that can be dynamically generated
 * 
 * This component can either render a pre-configured form or provide an interface
 * for generating forms using AI based on user prompts.
 * 
 * @example
 * ```tsx
 * <ConciergusGenerativeForm
 *   config={{
 *     title: "Contact Form",
 *     fields: [
 *       { name: "email", type: "email", label: "Email", required: true },
 *       { name: "message", type: "textarea", label: "Message" }
 *     ]
 *   }}
 *   onSubmit={handleSubmit}
 * />
 * ```
 */
export function ConciergusGenerativeForm({
  config,
  isGenerating = false,
  loadingState,
  className = '',
  onSubmit,
  onGenerate,
  children
}: ConciergusGenerativeFormProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [generatePrompt, setGeneratePrompt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSubmit) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerate = async () => {
    if (!onGenerate || !generatePrompt.trim()) return;
    await onGenerate(generatePrompt.trim());
  };

  // Loading state while generating
  if (isGenerating) {
    return (
      <div className={`conciergus-generative-form ${className}`}>
        <div className="flex items-center gap-3 p-6 bg-gray-50 rounded-lg animate-pulse">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <div>
            <p className="font-medium text-gray-700">
              {loadingState?.message || 'Generating form...'}
            </p>
            {loadingState?.progress !== undefined && (
              <div className="mt-2 w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${loadingState.progress}%` }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Render configured form
  if (config) {
    return (
      <div className={`conciergus-generative-form ${className}`}>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              {config.title}
            </h2>
            {config.description && (
              <p className="text-gray-600">{config.description}</p>
            )}
          </div>

          <div className="space-y-4">
            {config.fields.map((field, index) => (
              <FormField
                key={`${field.name}-${index}`}
                field={field}
                value={formData[field.name] || ''}
                onChange={(value) => handleInputChange(field.name, value)}
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Submitting...
              </span>
            ) : (
              config.submitText || 'Submit'
            )}
          </button>
        </form>
      </div>
    );
  }

  // Form generation interface
  return (
    <div className={`conciergus-generative-form ${className}`}>
      {children || (
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Generate a Form
            </h3>
            <p className="text-gray-600">
              Describe the form you need and AI will generate it for you.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Form Description
              </label>
              <textarea
                value={generatePrompt}
                onChange={(e) => setGeneratePrompt(e.target.value)}
                placeholder="e.g., Create a contact form with name, email, phone, and message fields"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={3}
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={!generatePrompt.trim()}
              className="w-full px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Generate Form
            </button>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              Forms are generated using AI and may require refinement
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Individual form field component
 */
interface FormFieldProps {
  field: GenerativeFormField;
  value: any;
  onChange: (value: any) => void;
}

function FormField({ field, value, onChange }: FormFieldProps) {
  const fieldId = `field-${field.name}`;
  
  const baseInputClasses = "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500";

  const renderInput = () => {
    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            id={fieldId}
            name={field.name}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            className={`${baseInputClasses} resize-none`}
            rows={3}
          />
        );

      case 'select':
        return (
          <select
            id={fieldId}
            name={field.name}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
            className={baseInputClasses}
          >
            <option value="">Select an option</option>
            {field.options?.map((option, index) => (
              <option key={index} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case 'checkbox':
        return (
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              id={fieldId}
              name={field.name}
              checked={value || false}
              onChange={(e) => onChange(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">
              {field.placeholder || field.label}
            </span>
          </label>
        );

      case 'radio':
        return (
          <div className="space-y-2">
            {field.options?.map((option, index) => (
              <label key={index} className="flex items-center space-x-2">
                <input
                  type="radio"
                  name={field.name}
                  value={option}
                  checked={value === option}
                  onChange={(e) => onChange(e.target.value)}
                  className="border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        );

      default:
        return (
          <input
            type={field.type}
            id={fieldId}
            name={field.name}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            className={baseInputClasses}
          />
        );
    }
  };

  if (field.type === 'checkbox') {
    return (
      <div className="space-y-2">
        {renderInput()}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label htmlFor={fieldId} className="block text-sm font-medium text-gray-700">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {renderInput()}
    </div>
  );
} 