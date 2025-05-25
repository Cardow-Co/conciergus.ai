import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { experimental_useObject as useObject } from '@ai-sdk/react';
import { z } from 'zod';
import { useConciergus } from '../context/useConciergus';
import type { 
  EnhancedUIMessage,
  MessageMetadata,
  PerformanceMetrics 
} from '../types/ai-sdk-5';

// ==========================================
// COMPONENT INTERFACES
// ==========================================

/**
 * Form field type definitions for dynamic rendering
 */
export type FormFieldType = 
  | 'text'
  | 'email'
  | 'password'
  | 'number'
  | 'tel'
  | 'url'
  | 'search'
  | 'textarea'
  | 'select'
  | 'checkbox'
  | 'radio'
  | 'date'
  | 'time'
  | 'datetime-local'
  | 'file'
  | 'range'
  | 'color'
  | 'hidden';

/**
 * Form field validation rule interface
 */
export interface FormFieldValidation {
  /** Field is required */
  required?: boolean;
  /** Minimum length for text fields */
  minLength?: number;
  /** Maximum length for text fields */
  maxLength?: number;
  /** Minimum value for number fields */
  min?: number;
  /** Maximum value for number fields */
  max?: number;
  /** Regular expression pattern */
  pattern?: string;
  /** Custom validation function */
  validator?: (value: any) => string | null;
  /** Custom error message */
  errorMessage?: string;
}

/**
 * Form field option for select/radio fields
 */
export interface FormFieldOption {
  /** Option value */
  value: string | number;
  /** Option display label */
  label: string;
  /** Option is disabled */
  disabled?: boolean;
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Dynamic form field definition
 */
export interface FormField {
  /** Unique field identifier */
  id: string;
  /** Field name attribute */
  name: string;
  /** Field type */
  type: FormFieldType;
  /** Field label */
  label: string;
  /** Field description/help text */
  description?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Default value */
  defaultValue?: any;
  /** Field validation rules */
  validation?: FormFieldValidation;
  /** Options for select/radio fields */
  options?: FormFieldOption[];
  /** Field is conditionally shown */
  conditional?: {
    /** Field name this depends on */
    dependsOn: string;
    /** Value that triggers this field to show */
    showWhen: any;
  };
  /** Field styling */
  style?: React.CSSProperties;
  /** Additional CSS classes */
  className?: string;
  /** Field metadata */
  metadata?: Record<string, any>;
}

/**
 * Generated form schema interface
 */
export interface FormSchema {
  /** Form title */
  title?: string;
  /** Form description */
  description?: string;
  /** Form fields */
  fields: FormField[];
  /** Form-level validation */
  validation?: {
    /** Custom form validation function */
    validator?: (data: Record<string, any>) => Record<string, string> | null;
  };
  /** Submit button configuration */
  submitButton?: {
    /** Button text */
    text?: string;
    /** Button styling */
    style?: React.CSSProperties;
    /** Button CSS classes */
    className?: string;
  };
  /** Form metadata */
  metadata?: Record<string, any>;
}

/**
 * Form validation state
 */
export interface FormValidationState {
  /** Field-level errors */
  fieldErrors: Record<string, string>;
  /** Form-level errors */
  formErrors: string[];
  /** Whether form is valid */
  isValid: boolean;
  /** Fields that have been touched */
  touchedFields: Set<string>;
}

/**
 * Form generation options
 */
export interface FormGenerationOptions {
  /** Target form complexity (1-10) */
  complexity?: number;
  /** Include conditional fields */
  includeConditional?: boolean;
  /** Maximum number of fields */
  maxFields?: number;
  /** Preferred field types */
  preferredTypes?: FormFieldType[];
  /** Form style/theme */
  theme?: 'default' | 'compact' | 'modern' | 'minimal';
  /** Language/locale for labels */
  locale?: string;
  /** Additional context for generation */
  context?: Record<string, any>;
}

/**
 * Form rendering options
 */
export interface FormRenderOptions {
  /** Form layout */
  layout?: 'vertical' | 'horizontal' | 'grid' | 'inline';
  /** Grid columns for grid layout */
  gridColumns?: number;
  /** Show field descriptions */
  showDescriptions?: boolean;
  /** Show required field indicators */
  showRequired?: boolean;
  /** Animate field appearance */
  animateFields?: boolean;
  /** Field spacing */
  fieldSpacing?: 'compact' | 'normal' | 'loose';
  /** Validation display mode */
  validationMode?: 'immediate' | 'onSubmit' | 'onBlur';
  /** Show progress indicators */
  showProgress?: boolean;
}

/**
 * Form submission data
 */
export interface FormSubmissionData {
  /** Form field values */
  data: Record<string, any>;
  /** Form schema used */
  schema: FormSchema;
  /** Form metadata */
  metadata: {
    /** Submission timestamp */
    timestamp: Date;
    /** Time to complete form */
    completionTime: number;
    /** Number of validation errors encountered */
    errorCount: number;
    /** Generation performance metrics */
    generationMetrics?: PerformanceMetrics;
  };
}

/**
 * Properties for ConciergusFormRenderer component
 */
export interface ConciergusFormRendererProps {
  /** Prompt for AI form generation */
  prompt: string;
  
  /** Form submission handler */
  onSubmit: (submission: FormSubmissionData) => void | Promise<void>;
  
  /** Form generation options */
  generationOptions?: FormGenerationOptions;
  
  /** Form rendering options */
  renderOptions?: FormRenderOptions;
  
  /** Additional CSS classes */
  className?: string;
  
  /** Form loading component */
  loadingComponent?: React.ComponentType;
  
  /** Form error component */
  errorComponent?: React.ComponentType<{ error: Error; retry: () => void }>;
  
  /** Custom field renderer */
  fieldRenderer?: React.ComponentType<FormFieldRendererProps>;
  
  // === Display Options ===
  /** Show generation progress */
  showProgress?: boolean;
  
  /** Show schema information */
  showSchema?: boolean;
  
  /** Show performance metrics */
  showMetrics?: boolean;
  
  /** Compact display mode */
  compact?: boolean;
  
  // === Events ===
  /** Form generation start handler */
  onGenerationStart?: () => void;
  
  /** Form generation complete handler */
  onGenerationComplete?: (schema: FormSchema) => void;
  
  /** Form generation error handler */
  onGenerationError?: (error: Error) => void;
  
  /** Field value change handler */
  onFieldChange?: (fieldName: string, value: any) => void;
  
  /** Form validation change handler */
  onValidationChange?: (validation: FormValidationState) => void;
  
  // === API Configuration ===
  /** Custom API endpoint for form generation */
  api?: string;
  
  /** Custom headers for API requests */
  headers?: Record<string, string>;
  
  /** API request credentials */
  credentials?: RequestCredentials;
  
  // === Accessibility ===
  /** Accessibility label */
  ariaLabel?: string;
  
  /** Accessibility description */
  ariaDescription?: string;
  
  // === Advanced Options ===
  /** Debounce delay for field updates (ms) */
  debounceDelay?: number;
  
  /** Enable debug mode */
  debug?: boolean;
  
  /** Form schema validation */
  schemaValidation?: z.ZodSchema<any>;
  
  /** Enable retry on error */
  enableRetry?: boolean;
  
  /** Maximum retry attempts */
  maxRetries?: number;
  
  /** Custom form data processor */
  dataProcessor?: (data: Record<string, any>) => Record<string, any>;
  
  // === Extensibility ===
  /** Additional props */
  [key: string]: any;
}

/**
 * Properties for custom field renderer
 */
export interface FormFieldRendererProps {
  /** Field definition */
  field: FormField;
  /** Current field value */
  value: any;
  /** Field change handler */
  onChange: (value: any) => void;
  /** Field blur handler */
  onBlur: () => void;
  /** Field validation error */
  error?: string;
  /** Field is touched */
  touched: boolean;
  /** Field is disabled */
  disabled?: boolean;
  /** Form is submitting */
  isSubmitting?: boolean;
  /** Render options */
  renderOptions?: FormRenderOptions;
  /** Additional CSS classes */
  className?: string;
}

// ==========================================
// DEFAULT COMPONENTS
// ==========================================

/**
 * Default loading component
 */
const DefaultLoadingComponent: React.FC = () => (
  <div className="conciergus-form-loading">
    <div className="loading-spinner" />
    <div className="loading-text">Generating form...</div>
    <div className="loading-hint">This may take a few moments</div>
  </div>
);

/**
 * Default error component
 */
const DefaultErrorComponent: React.FC<{ error: Error; retry: () => void }> = ({ error, retry }) => (
  <div className="conciergus-form-error">
    <div className="error-icon">⚠️</div>
    <div className="error-content">
      <h3>Form Generation Failed</h3>
      <p>{error.message}</p>
      <button onClick={retry} className="retry-button">
        Try Again
      </button>
    </div>
  </div>
);

/**
 * Default field renderer component
 */
const DefaultFieldRenderer: React.FC<FormFieldRendererProps> = ({
  field,
  value,
  onChange,
  onBlur,
  error,
  touched,
  disabled = false,
  isSubmitting = false,
  renderOptions = {},
  className = ''
}) => {
  const {
    showDescriptions = true,
    showRequired = true,
    validationMode = 'onSubmit'
  } = renderOptions;

  const showError = error && (
    validationMode === 'immediate' ||
    (validationMode === 'onBlur' && touched) ||
    (validationMode === 'onSubmit' && touched)
  );

  const fieldClasses = [
    'conciergus-form-field',
    `field-type-${field.type}`,
    showError ? 'field-error' : '',
    disabled ? 'field-disabled' : '',
    className
  ].filter(Boolean).join(' ');

  const renderInput = () => {
    const baseProps = {
      id: field.id,
      name: field.name,
      value: value || '',
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => 
        onChange(e.target.value),
      onBlur,
      disabled: disabled || isSubmitting,
      placeholder: field.placeholder,
      className: 'field-input',
      'aria-invalid': showError,
      'aria-describedby': error ? `${field.id}-error` : undefined
    };

    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            {...baseProps}
            rows={4}
          />
        );

      case 'select':
        return (
          <select {...baseProps} value={value || ''}>
            <option value="">Select an option...</option>
            {field.options?.map((option) => (
              <option 
                key={option.value} 
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'checkbox':
        return (
          <input
            {...baseProps}
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
            value=""
          />
        );

      case 'radio':
        return (
          <div className="radio-group">
            {field.options?.map((option) => (
              <label key={option.value} className="radio-option">
                <input
                  type="radio"
                  name={field.name}
                  value={option.value}
                  checked={value === option.value}
                  onChange={(e) => onChange(e.target.value)}
                  disabled={disabled || isSubmitting || option.disabled}
                />
                <span className="radio-label">{option.label}</span>
              </label>
            ))}
          </div>
        );

      case 'file':
        return (
          <input
            {...baseProps}
            type="file"
            value=""
            onChange={(e) => onChange(e.target.files)}
          />
        );

      case 'range':
        return (
          <div className="range-input">
            <input
              {...baseProps}
              type="range"
              min={field.validation?.min}
              max={field.validation?.max}
              value={value || field.validation?.min || 0}
              onChange={(e) => onChange(Number(e.target.value))}
            />
            <span className="range-value">{value || field.validation?.min || 0}</span>
          </div>
        );

      default:
        return (
          <input
            {...baseProps}
            type={field.type}
            min={field.validation?.min}
            max={field.validation?.max}
            minLength={field.validation?.minLength}
            maxLength={field.validation?.maxLength}
            pattern={field.validation?.pattern}
            required={field.validation?.required}
          />
        );
    }
  };

  return (
    <div className={fieldClasses} style={field.style}>
      <label htmlFor={field.id} className="field-label">
        {field.label}
        {showRequired && field.validation?.required && (
          <span className="required-indicator" aria-label="required">*</span>
        )}
      </label>
      
      {showDescriptions && field.description && (
        <div className="field-description">{field.description}</div>
      )}
      
      <div className="field-input-wrapper">
        {renderInput()}
      </div>
      
      {showError && (
        <div id={`${field.id}-error`} className="field-error-message" role="alert">
          {error}
        </div>
      )}
    </div>
  );
};

// ==========================================
// MAIN COMPONENT
// ==========================================

/**
 * ConciergusFormRenderer Component
 * 
 * A dynamic form generation component that leverages AI SDK 5's useObject hook
 * to create forms based on natural language prompts. Supports progressive
 * rendering, real-time validation, and comprehensive customization.
 * 
 * @example Basic usage:
 * ```tsx
 * <ConciergusFormRenderer
 *   prompt="Create a contact form with name, email, and message fields"
 *   onSubmit={(submission) => console.log('Form submitted:', submission)}
 * />
 * ```
 * 
 * @example Advanced usage:
 * ```tsx
 * <ConciergusFormRenderer
 *   prompt="Create a user registration form"
 *   generationOptions={{
 *     complexity: 7,
 *     includeConditional: true,
 *     theme: 'modern'
 *   }}
 *   renderOptions={{
 *     layout: 'grid',
 *     gridColumns: 2,
 *     animateFields: true
 *   }}
 *   onSubmit={handleSubmit}
 *   onGenerationComplete={(schema) => console.log('Generated:', schema)}
 * />
 * ```
 */
export const ConciergusFormRenderer: React.FC<ConciergusFormRendererProps> = ({
  prompt,
  onSubmit,
  generationOptions = {},
  renderOptions = {},
  className = '',
  loadingComponent: LoadingComponent = DefaultLoadingComponent,
  errorComponent: ErrorComponent = DefaultErrorComponent,
  fieldRenderer: FieldRenderer = DefaultFieldRenderer,
  
  // Display options
  showProgress = true,
  showSchema = false,
  showMetrics = false,
  compact = false,
  
  // Events
  onGenerationStart,
  onGenerationComplete,
  onGenerationError,
  onFieldChange,
  onValidationChange,
  
  // API Configuration
  api = '/api/generate-form',
  headers = {},
  credentials = 'same-origin',
  
  // Accessibility
  ariaLabel = 'Dynamic AI-generated form',
  ariaDescription,
  
  // Advanced options
  debounceDelay = 300,
  debug = false,
  schemaValidation,
  enableRetry = true,
  maxRetries = 3,
  dataProcessor,
  
  ...rest
}) => {
  // Context integration
  const { config, isEnhanced, hasFeature } = useConciergus();
  
  // Form generation state
  const [retryCount, setRetryCount] = useState(0);
  const [generationStartTime, setGenerationStartTime] = useState<number | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [validationState, setValidationState] = useState<FormValidationState>({
    fieldErrors: {},
    formErrors: [],
    isValid: false,
    touchedFields: new Set()
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Refs
  const formRef = useRef<HTMLFormElement>(null);
  const submitTimeRef = useRef<number | null>(null);

  // Create schema for form generation
  const formGenerationSchema = useMemo(() => {
    return schemaValidation || z.object({
      title: z.string().optional(),
      description: z.string().optional(),
      fields: z.array(z.object({
        id: z.string(),
        name: z.string(),
        type: z.enum([
          'text', 'email', 'password', 'number', 'tel', 'url', 'search',
          'textarea', 'select', 'checkbox', 'radio', 'date', 'time',
          'datetime-local', 'file', 'range', 'color', 'hidden'
        ]),
        label: z.string(),
        description: z.string().optional(),
        placeholder: z.string().optional(),
        defaultValue: z.any().optional(),
        validation: z.object({
          required: z.boolean().optional(),
          minLength: z.number().optional(),
          maxLength: z.number().optional(),
          min: z.number().optional(),
          max: z.number().optional(),
          pattern: z.string().optional(),
          errorMessage: z.string().optional()
        }).optional(),
        options: z.array(z.object({
          value: z.union([z.string(), z.number()]),
          label: z.string(),
          disabled: z.boolean().optional()
        })).optional(),
        conditional: z.object({
          dependsOn: z.string(),
          showWhen: z.any()
        }).optional()
      })),
      submitButton: z.object({
        text: z.string().optional(),
        style: z.any().optional(),
        className: z.string().optional()
      }).optional()
    });
  }, [schemaValidation]);

  // AI form generation
  const {
    object: generatedSchema,
    submit: generateForm,
    isLoading: isGenerating,
    error: generationError,
    stop: stopGeneration
  } = useObject({
    api,
    schema: formGenerationSchema,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    credentials,
    onFinish: ({ object, error }) => {
      if (debug) {
        console.log('Form generation completed:', { object, error });
      }
      
      if (object && !error) {
        onGenerationComplete?.(object as FormSchema);
        
        // Set default values
        const defaultData: Record<string, any> = {};
        object.fields?.forEach((field: FormField) => {
          if (field.defaultValue !== undefined) {
            defaultData[field.name] = field.defaultValue;
          } else if (field.type === 'checkbox') {
            // Set default value for checkboxes to false if not specified
            defaultData[field.name] = false;
          }
        });
        setFormData(defaultData);
        
        // Track generation time
        if (generationStartTime) {
          const generationTime = Date.now() - generationStartTime;
          if (debug) {
            console.log(`Form generation took ${generationTime}ms`);
          }
        }
      } else if (error) {
        onGenerationError?.(new Error(error.message || 'Schema validation failed'));
      }
    },
    onError: (error) => {
      if (debug) {
        console.error('Form generation error:', error);
      }
      onGenerationError?.(error);
    }
  });

  // Enhanced prompt with generation options
  const enhancedPrompt = useMemo(() => {
    const options = generationOptions;
    let prompt_text = prompt;
    
    if (options.complexity) {
      prompt_text += `\n\nComplexity level: ${options.complexity}/10`;
    }
    
    if (options.maxFields) {
      prompt_text += `\nMaximum fields: ${options.maxFields}`;
    }
    
    if (options.preferredTypes?.length) {
      prompt_text += `\nPreferred field types: ${options.preferredTypes.join(', ')}`;
    }
    
    if (options.theme) {
      prompt_text += `\nForm theme: ${options.theme}`;
    }
    
    if (options.locale) {
      prompt_text += `\nLanguage/locale: ${options.locale}`;
    }
    
    if (options.includeConditional) {
      prompt_text += '\nInclude conditional/dependent fields where appropriate';
    }
    
    if (options.context) {
      prompt_text += `\nAdditional context: ${JSON.stringify(options.context)}`;
    }
    
    return prompt_text;
  }, [prompt, generationOptions]);

  // Initialize form generation
  useEffect(() => {
    if (prompt && !generatedSchema && !isGenerating && !generationError) {
      setGenerationStartTime(Date.now());
      onGenerationStart?.();
      generateForm(enhancedPrompt);
    }
  }, [prompt, enhancedPrompt, generatedSchema, isGenerating, generationError, generateForm, onGenerationStart]);

  // Form validation
  const validateField = useCallback((field: FormField, value: any): string | null => {
    const validation = field.validation;
    if (!validation) return null;

    // Required validation
    if (validation.required && (!value || (typeof value === 'string' && !value.trim()))) {
      return validation.errorMessage || `${field.label} is required`;
    }

    // Skip other validations if field is empty and not required
    if (!value && !validation.required) return null;

    // Type-specific validations
    if (typeof value === 'string') {
      if (validation.minLength && value.length < validation.minLength) {
        return `${field.label} must be at least ${validation.minLength} characters`;
      }
      if (validation.maxLength && value.length > validation.maxLength) {
        return `${field.label} must be no more than ${validation.maxLength} characters`;
      }
      if (validation.pattern && !new RegExp(validation.pattern).test(value)) {
        return validation.errorMessage || `${field.label} format is invalid`;
      }
    }

    if (typeof value === 'number') {
      if (validation.min !== undefined && value < validation.min) {
        return `${field.label} must be at least ${validation.min}`;
      }
      if (validation.max !== undefined && value > validation.max) {
        return `${field.label} must be no more than ${validation.max}`;
      }
    }

    // Custom validation
    if (validation.validator) {
      return validation.validator(value);
    }

    return null;
  }, []);

  // Validate entire form
  const validateForm = useCallback((data: Record<string, any>, schema: FormSchema): FormValidationState => {
    const fieldErrors: Record<string, string> = {};
    const formErrors: string[] = [];

    // Validate each field
    schema.fields?.forEach(field => {
      const error = validateField(field, data[field.name]);
      if (error) {
        fieldErrors[field.name] = error;
      }
    });

    // Form-level validation
    if (schema.validation?.validator) {
      const formLevelErrors = schema.validation.validator(data);
      if (formLevelErrors) {
        Object.entries(formLevelErrors).forEach(([field, error]) => {
          if (typeof error === 'string') {
            if (field === '_form') {
              formErrors.push(error);
            } else {
              fieldErrors[field] = error;
            }
          }
        });
      }
    }

    return {
      fieldErrors,
      formErrors,
      isValid: Object.keys(fieldErrors).length === 0 && formErrors.length === 0,
      touchedFields: validationState.touchedFields
    };
  }, [validateField, validationState.touchedFields]);

  // Handle field changes
  const handleFieldChange = useCallback((fieldName: string, value: any) => {
    const processedValue = dataProcessor ? dataProcessor({ [fieldName]: value })[fieldName] : value;
    
    setFormData(prev => ({ ...prev, [fieldName]: processedValue }));
    onFieldChange?.(fieldName, processedValue);

    // Real-time validation for immediate mode
    if (renderOptions.validationMode === 'immediate' && generatedSchema) {
      const field = generatedSchema.fields?.find(f => f.name === fieldName);
      if (field) {
        const error = validateField(field, processedValue);
        setValidationState(prev => {
          const newState = {
            ...prev,
            fieldErrors: { ...prev.fieldErrors, [fieldName]: error || '' }
          };
          if (!error) {
            delete newState.fieldErrors[fieldName];
          }
          return newState;
        });
      }
    }
  }, [dataProcessor, onFieldChange, renderOptions.validationMode, generatedSchema, validateField]);

  // Handle field blur
  const handleFieldBlur = useCallback((fieldName: string) => {
    setValidationState(prev => ({
      ...prev,
      touchedFields: new Set([...prev.touchedFields, fieldName])
    }));

    // Validate on blur
    if (renderOptions.validationMode === 'onBlur' && generatedSchema) {
      const field = generatedSchema.fields?.find(f => f.name === fieldName);
      if (field) {
        const error = validateField(field, formData[fieldName]);
        setValidationState(prev => {
          const newState = {
            ...prev,
            fieldErrors: { ...prev.fieldErrors, [fieldName]: error || '' }
          };
          if (!error) {
            delete newState.fieldErrors[fieldName];
          }
          return newState;
        });
      }
    }
  }, [renderOptions.validationMode, generatedSchema, validateField, formData]);

  // Handle form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!generatedSchema || isSubmitting) return;

    setIsSubmitting(true);
    submitTimeRef.current = Date.now();

    // Validate form
    const validation = validateForm(formData, generatedSchema);
    
    // Mark all fields as touched to show validation errors
    const allFieldNames = generatedSchema.fields?.map(f => f.name) || [];
    const newTouchedFields = new Set([...validation.touchedFields, ...allFieldNames]);
    const updatedValidation = {
      ...validation,
      touchedFields: newTouchedFields
    };
    
    setValidationState(updatedValidation);
    onValidationChange?.(updatedValidation);

    if (!validation.isValid) {
      setIsSubmitting(false);
      return;
    }

    try {
      // Ensure all fields have values in the submission data
      const completeFormData = { ...formData };
      visibleFields.forEach(field => {
        if (!(field.name in completeFormData)) {
          if (field.type === 'checkbox') {
            completeFormData[field.name] = false;
          } else if (field.defaultValue !== undefined) {
            completeFormData[field.name] = field.defaultValue;
          }
        }
      });

      const submission: FormSubmissionData = {
        data: completeFormData,
        schema: generatedSchema,
        metadata: {
          timestamp: new Date(),
          completionTime: submitTimeRef.current ? Date.now() - submitTimeRef.current : 0,
          errorCount: Object.keys(validation.fieldErrors).length,
          generationMetrics: generationStartTime ? {
            startTime: generationStartTime,
            endTime: Date.now(),
            duration: Date.now() - generationStartTime
          } as PerformanceMetrics : undefined
        }
      };

      await onSubmit(submission);
    } catch (error) {
      console.error('Form submission error:', error);
      setValidationState(prev => ({
        ...prev,
        formErrors: [`Submission failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      }));
    } finally {
      setIsSubmitting(false);
    }
  }, [generatedSchema, isSubmitting, formData, validateForm, onValidationChange, onSubmit, generationStartTime]);

  // Retry generation
  const handleRetry = useCallback(() => {
    if (retryCount < maxRetries) {
      setRetryCount(prev => prev + 1);
      setGenerationStartTime(Date.now());
      onGenerationStart?.();
      generateForm(enhancedPrompt);
    }
  }, [retryCount, maxRetries, enhancedPrompt, generateForm, onGenerationStart]);

  // Filter visible fields based on conditional logic
  const visibleFields = useMemo(() => {
    if (!generatedSchema?.fields) return [];

    return generatedSchema.fields.filter(field => {
      if (!field.conditional) return true;
      
      const dependentValue = formData[field.conditional.dependsOn];
      return dependentValue === field.conditional.showWhen;
    });
  }, [generatedSchema?.fields, formData]);

  // Component CSS classes
  const componentClasses = [
    'conciergus-form-renderer',
    compact ? 'compact' : '',
    renderOptions.layout ? `layout-${renderOptions.layout}` : 'layout-vertical',
    renderOptions.fieldSpacing ? `spacing-${renderOptions.fieldSpacing}` : 'spacing-normal',
    className
  ].filter(Boolean).join(' ');

  // Render loading state
  if (isGenerating && !generatedSchema) {
    return (
      <div className={componentClasses} {...rest}>
        <LoadingComponent />
        {showProgress && (
          <div className="generation-progress">
            <div className="progress-text">Analyzing prompt and generating form structure...</div>
          </div>
        )}
      </div>
    );
  }

  // Render error state
  if (generationError && !generatedSchema) {
    return (
      <div className={componentClasses} {...rest}>
        <ErrorComponent 
          error={generationError} 
          retry={enableRetry && retryCount < maxRetries ? handleRetry : () => {}} 
        />
      </div>
    );
  }

  // Render generated form
  if (generatedSchema) {
    return (
      <div className={componentClasses} {...rest}>
        {showSchema && (
          <div className="form-schema-info">
            <h4>Generated Form Schema</h4>
            <pre>{JSON.stringify(generatedSchema, null, 2)}</pre>
          </div>
        )}

        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="generated-form"
          aria-label={ariaLabel}
          aria-describedby={ariaDescription ? 'form-description' : undefined}
          noValidate
        >
          {generatedSchema.title && (
            <h2 className="form-title">{generatedSchema.title}</h2>
          )}
          
          {generatedSchema.description && (
            <p id="form-description" className="form-description">
              {generatedSchema.description}
            </p>
          )}

          {validationState.formErrors.length > 0 && (
            <div className="form-errors" role="alert">
              {validationState.formErrors.map((error, index) => (
                <div key={index} className="form-error">
                  {error}
                </div>
              ))}
            </div>
          )}

          <div 
            className={`form-fields ${renderOptions.layout === 'grid' ? 'form-grid' : ''}`}
            style={renderOptions.layout === 'grid' ? {
              gridTemplateColumns: `repeat(${renderOptions.gridColumns || 2}, 1fr)`
            } : undefined}
          >
            {visibleFields.map((field, index) => (
              <FieldRenderer
                key={field.id}
                field={field}
                value={formData[field.name]}
                onChange={(value) => handleFieldChange(field.name, value)}
                onBlur={() => handleFieldBlur(field.name)}
                error={validationState.fieldErrors[field.name]}
                touched={validationState.touchedFields.has(field.name)}
                disabled={isSubmitting}
                isSubmitting={isSubmitting}
                renderOptions={renderOptions}
                className={renderOptions.animateFields ? `animate-field-${index}` : ''}
              />
            ))}
          </div>

          <div className="form-actions">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`submit-button ${generatedSchema.submitButton?.className || ''}`}
              style={generatedSchema.submitButton?.style}
            >
              {isSubmitting ? 'Submitting...' : (generatedSchema.submitButton?.text || 'Submit')}
            </button>
          </div>
        </form>

        {showMetrics && generationStartTime && (
          <div className="generation-metrics">
            <h4>Generation Metrics</h4>
            <div className="metrics">
              <span>Generation Time: {Date.now() - generationStartTime}ms</span>
              <span>Fields Generated: {generatedSchema.fields?.length || 0}</span>
              <span>Retry Count: {retryCount}</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Fallback empty state
  return (
    <div className={componentClasses} {...rest}>
      <div className="empty-state">
        <p>No form schema available. Please provide a valid prompt.</p>
      </div>
    </div>
  );
};

export default ConciergusFormRenderer; 