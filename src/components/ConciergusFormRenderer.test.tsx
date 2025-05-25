import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';

// Create a working inline zod mock
jest.mock('zod', () => {
  // Helper function to validate email format
  const isValidEmail = (email) => {
    const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
    return emailRegex.test(email);
  };

  // Create a mock schema object that mimics zod's validation behavior
  const createZodSchema = (type = 'unknown', constraints = {}) => {
    const schema = {
      _type: type,
      _optional: false,
      _nullable: false,
      _constraints: { ...constraints },
      
      // Chainable methods that preserve constraints
      optional: () => {
        const optionalSchema = createZodSchema(type, { ...constraints });
        optionalSchema._optional = true;
        return optionalSchema;
      },
      
      nullable: () => {
        const nullableSchema = createZodSchema(type, { ...constraints });
        nullableSchema._nullable = true;
        return nullableSchema;
      },
      
      min: (value) => {
        const minSchema = createZodSchema(type, { ...constraints, min: value });
        return minSchema;
      },
      
      max: (value) => {
        const maxSchema = createZodSchema(type, { ...constraints, max: value });
        return maxSchema;
      },
      
      email: () => {
        const emailSchema = createZodSchema('string', { ...constraints, email: true });
        return emailSchema;
      },
      
      regex: (pattern) => {
        const regexSchema = createZodSchema('string', { ...constraints, pattern });
        return regexSchema;
      },
      
      // Validation methods with realistic behavior
      parse: (value) => {
        const result = schema.safeParse(value);
        if (!result.success) {
          const ZodError = class ZodError extends Error {
            constructor(issues = []) {
              super('Zod validation error');
              this.name = 'ZodError';
              this.issues = issues;
            }
          };
          const error = new ZodError(result.error.issues);
          throw error;
        }
        return result.data;
      },
      
      safeParse: (value) => {
        const issues = [];
        
        // Handle null/undefined for required fields
        if ((value === null || value === undefined || value === '') && !schema._optional) {
          return {
            success: false,
            error: {
              issues: [{ 
                code: 'required',
                message: 'Required',
                path: []
              }]
            }
          };
        }
        
        // Handle optional null/undefined values
        if ((value === null || value === undefined) && schema._optional) {
          return { success: true, data: value };
        }
        
        // Type-specific validation
        switch (type) {
          case 'string':
            if (typeof value !== 'string') {
              issues.push({
                code: 'invalid_type',
                expected: 'string',
                received: typeof value,
                message: 'Expected string, received ' + typeof value
              });
            } else {
              // Length validation
              if (constraints.min && value.length < constraints.min) {
                issues.push({
                  code: 'too_small',
                  minimum: constraints.min,
                  type: 'string',
                  inclusive: true,
                  message: `String must contain at least ${constraints.min} character(s)`
                });
              }
              if (constraints.max && value.length > constraints.max) {
                issues.push({
                  code: 'too_big',
                  maximum: constraints.max,
                  type: 'string',
                  inclusive: true,
                  message: `String must contain at most ${constraints.max} character(s)`
                });
              }
              
              // Email validation
              if (constraints.email && !isValidEmail(value)) {
                issues.push({
                  code: 'invalid_string',
                  validation: 'email',
                  message: 'Invalid email'
                });
              }
              
              // Pattern validation
              if (constraints.pattern && !new RegExp(constraints.pattern).test(value)) {
                issues.push({
                  code: 'invalid_string',
                  validation: 'regex',
                  message: 'Invalid format'
                });
              }
            }
            break;
            
          case 'number':
            if (typeof value !== 'number' || isNaN(value)) {
              issues.push({
                code: 'invalid_type',
                expected: 'number',
                received: typeof value,
                message: 'Expected number, received ' + typeof value
              });
            } else {
              if (constraints.min && value < constraints.min) {
                issues.push({
                  code: 'too_small',
                  minimum: constraints.min,
                  type: 'number',
                  inclusive: true,
                  message: `Number must be greater than or equal to ${constraints.min}`
                });
              }
              if (constraints.max && value > constraints.max) {
                issues.push({
                  code: 'too_big',
                  maximum: constraints.max,
                  type: 'number',
                  inclusive: true,
                  message: `Number must be less than or equal to ${constraints.max}`
                });
              }
            }
            break;
            
          case 'boolean':
            if (typeof value !== 'boolean') {
              issues.push({
                code: 'invalid_type',
                expected: 'boolean',
                received: typeof value,
                message: 'Expected boolean, received ' + typeof value
              });
            }
            break;
            
          case 'object':
            if (typeof value !== 'object' || value === null || Array.isArray(value)) {
              issues.push({
                code: 'invalid_type',
                expected: 'object',
                received: Array.isArray(value) ? 'array' : typeof value,
                message: 'Expected object, received ' + (Array.isArray(value) ? 'array' : typeof value)
              });
            } else if (schema._shape) {
              // Validate object shape
              Object.keys(schema._shape).forEach(key => {
                const fieldSchema = schema._shape[key];
                const fieldValue = value[key];
                const fieldResult = fieldSchema.safeParse(fieldValue);
                if (!fieldResult.success) {
                  fieldResult.error.issues.forEach(issue => {
                    issues.push({
                      ...issue,
                      path: [key, ...(issue.path || [])]
                    });
                  });
                }
              });
            }
            break;
        }
        
        if (issues.length > 0) {
          return {
            success: false,
            error: { issues }
          };
        }
        
        return { success: true, data: value };
      },
      
      // For debugging
      toString: () => `ZodSchema(${type})`
    };
    
    return schema;
  };

  // Create object schema with special object methods
  const createObjectSchema = (shape = {}) => {
    const schema = createZodSchema('object');
    schema._shape = shape;
    schema.shape = shape;
    return schema;
  };

  // Main zod mock object
  const z = {
    // Primitive types with enhanced constructors
    string: () => createZodSchema('string'),
    number: () => createZodSchema('number'),
    boolean: () => createZodSchema('boolean'),
    date: () => createZodSchema('date'),
    undefined: () => createZodSchema('undefined'),
    null: () => createZodSchema('null'),
    any: () => createZodSchema('any'),
    unknown: () => createZodSchema('unknown'),
    never: () => createZodSchema('never'),
    void: () => createZodSchema('void'),
    
    // Complex types
    array: (element) => createZodSchema('array'),
    object: (shape = {}) => createObjectSchema(shape),
    
    // Union type
    union: (options) => {
      const unionSchema = createZodSchema('union');
      unionSchema._options = options;
      
      // Override safeParse for union validation
      unionSchema.safeParse = (value) => {
        for (const option of options) {
          const result = option.safeParse(value);
          if (result.success) {
            return result;
          }
        }
        return {
          success: false,
          error: {
            issues: [{
              code: 'invalid_union',
              message: 'Invalid input'
            }]
          }
        };
      };
      
      return unionSchema;
    },
    
    // Literals and enums
    literal: (value) => createZodSchema('literal', { value }),
    enum: (values) => createZodSchema('enum', { values }),
    
    // Error handling
    ZodError: class ZodError extends Error {
      constructor(issues = []) {
        super('Zod validation error');
        this.name = 'ZodError';
        this.issues = issues;
      }
      
      get errors() {
        return this.issues;
      }
      
      format() {
        const formatted = {};
        this.issues.forEach(issue => {
          const path = issue.path?.join('.') || '_root';
          if (!formatted[path]) {
            formatted[path] = [];
          }
          formatted[path].push(issue.message);
        });
        return formatted;
      }
    }
  };

  return { z };
});

// Mock the AI SDK useObject hook
jest.mock('@ai-sdk/react', () => ({
  experimental_useObject: jest.fn()
}));

// Mock the useConciergus hook
jest.mock('../context/useConciergus', () => ({
  useConciergus: jest.fn()
}));

// Import components AFTER mocking dependencies
import { ConciergusFormRenderer, type FormSchema, type FormSubmissionData } from './ConciergusFormRenderer';
import { ConciergusProvider } from '../context/ConciergusProvider';

// Sample form schema for testing
const sampleFormSchema: FormSchema = {
  title: 'Contact Form',
  description: 'Please fill out this contact form',
  fields: [
    {
      id: 'name',
      name: 'name',
      type: 'text',
      label: 'Full Name',
      description: 'Enter your full name',
      placeholder: 'John Doe',
      validation: {
        required: true,
        minLength: 2,
        maxLength: 50
      }
    },
    {
      id: 'email',
      name: 'email',
      type: 'email',
      label: 'Email Address',
      placeholder: 'john@example.com',
      validation: {
        required: true,
        pattern: '^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$'
      }
    },
    {
      id: 'message',
      name: 'message',
      type: 'textarea',
      label: 'Message',
      description: 'Tell us what you need help with',
      placeholder: 'Your message here...',
      validation: {
        required: true,
        minLength: 10,
        maxLength: 500
      }
    },
    {
      id: 'subscribe',
      name: 'subscribe',
      type: 'checkbox',
      label: 'Subscribe to newsletter',
      defaultValue: false
    }
  ],
  submitButton: {
    text: 'Send Message',
    className: 'primary-button'
  }
};

const complexFormSchema: FormSchema = {
  title: 'User Registration',
  fields: [
    {
      id: 'username',
      name: 'username',
      type: 'text',
      label: 'Username',
      validation: { required: true }
    },
    {
      id: 'userType',
      name: 'userType',
      type: 'select',
      label: 'User Type',
      options: [
        { value: 'individual', label: 'Individual' },
        { value: 'business', label: 'Business' }
      ],
      validation: { required: true }
    },
    {
      id: 'companyName',
      name: 'companyName',
      type: 'text',
      label: 'Company Name',
      conditional: {
        dependsOn: 'userType',
        showWhen: 'business'
      },
      validation: { required: true }
    }
  ]
};

// Default props for testing
const defaultProps = {
  prompt: 'Create a contact form',
  onSubmit: jest.fn()
};

// Wrapper component with provider
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ConciergusProvider>
    {children}
  </ConciergusProvider>
);

// Get the mocked functions
const { experimental_useObject } = require('@ai-sdk/react');
const { useConciergus } = require('../context/useConciergus');

describe('ConciergusFormRenderer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default useConciergus mock
    (useConciergus as jest.Mock).mockReturnValue({
      config: {
        defaultModel: 'gpt-4',
        apiKey: 'test-key'
      },
      isEnhanced: true,
      hasFeature: jest.fn().mockReturnValue(true)
    });
  });

  describe('Form Generation', () => {
    test('renders loading state during form generation', () => {
      (experimental_useObject as jest.Mock).mockReturnValue({
        object: null,
        submit: jest.fn(),
        isLoading: true,
        error: null,
        stop: jest.fn()
      });

      render(
        <TestWrapper>
          <ConciergusFormRenderer {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByText('Generating form...')).toBeInTheDocument();
      expect(screen.getByText('This may take a few moments')).toBeInTheDocument();
      expect(screen.getByText('Analyzing prompt and generating form structure...')).toBeInTheDocument();
    });

    test('calls generateForm with enhanced prompt', () => {
      const mockSubmit = jest.fn();
      (experimental_useObject as jest.Mock).mockReturnValue({
        object: null,
        submit: mockSubmit,
        isLoading: false,
        error: null,
        stop: jest.fn()
      });

      render(
        <TestWrapper>
          <ConciergusFormRenderer 
            {...defaultProps}
            generationOptions={{
              complexity: 7,
              maxFields: 5,
              theme: 'modern',
              includeConditional: true
            }}
          />
        </TestWrapper>
      );

      expect(mockSubmit).toHaveBeenCalledWith(
        expect.stringContaining('Create a contact form')
      );
      expect(mockSubmit).toHaveBeenCalledWith(
        expect.stringContaining('Complexity level: 7/10')
      );
      expect(mockSubmit).toHaveBeenCalledWith(
        expect.stringContaining('Maximum fields: 5')
      );
      expect(mockSubmit).toHaveBeenCalledWith(
        expect.stringContaining('Form theme: modern')
      );
    });

    test('renders error state when generation fails', () => {
      const mockRetry = jest.fn();
      const error = new Error('Generation failed');
      
      (experimental_useObject as jest.Mock).mockReturnValue({
        object: null,
        submit: jest.fn(),
        isLoading: false,
        error,
        stop: jest.fn()
      });

      render(
        <TestWrapper>
          <ConciergusFormRenderer {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByText('Form Generation Failed')).toBeInTheDocument();
      expect(screen.getByText('Generation failed')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    test('calls onGenerationComplete when schema is generated', () => {
      const onGenerationComplete = jest.fn();
      
      // Mock the hook to return the schema and track the config
      let mockConfig: any = null;
      (experimental_useObject as jest.Mock).mockImplementation((config) => {
        mockConfig = config;
        return {
          object: sampleFormSchema,
          submit: jest.fn(),
          isLoading: false,
          error: null,
          stop: jest.fn()
        };
      });

      render(
        <TestWrapper>
          <ConciergusFormRenderer 
            {...defaultProps}
            onGenerationComplete={onGenerationComplete}
          />
        </TestWrapper>
      );

      // Manually trigger the onFinish callback
      if (mockConfig?.onFinish) {
        act(() => {
          mockConfig.onFinish({ object: sampleFormSchema, error: null });
        });
      }

      expect(onGenerationComplete).toHaveBeenCalledWith(sampleFormSchema);
    });
  });

  describe('Form Rendering', () => {
    beforeEach(() => {
      (experimental_useObject as jest.Mock).mockReturnValue({
        object: sampleFormSchema,
        submit: jest.fn(),
        isLoading: false,
        error: null,
        stop: jest.fn()
      });
    });

    test('renders generated form with title and description', () => {
      render(
        <TestWrapper>
          <ConciergusFormRenderer {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByText('Contact Form')).toBeInTheDocument();
      expect(screen.getByText('Please fill out this contact form')).toBeInTheDocument();
    });

    test('renders all form fields correctly', () => {
      render(
        <TestWrapper>
          <ConciergusFormRenderer {...defaultProps} />
        </TestWrapper>
      );

      // Text input
      expect(screen.getByLabelText(/Full Name/)).toBeInTheDocument();
      expect(screen.getByPlaceholderText('John Doe')).toBeInTheDocument();

      // Email input
      expect(screen.getByLabelText(/Email Address/)).toBeInTheDocument();
      expect(screen.getByPlaceholderText('john@example.com')).toBeInTheDocument();

      // Textarea
      expect(screen.getByLabelText(/Message/)).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Your message here...')).toBeInTheDocument();

      // Checkbox
      expect(screen.getByLabelText(/Subscribe to newsletter/)).toBeInTheDocument();

      // Submit button
      expect(screen.getByText('Send Message')).toBeInTheDocument();
    });

    test('renders required field indicators', () => {
      render(
        <TestWrapper>
          <ConciergusFormRenderer {...defaultProps} />
        </TestWrapper>
      );

      const requiredIndicators = screen.getAllByText('*');
      expect(requiredIndicators).toHaveLength(3); // name, email, message are required
    });

    test('renders field descriptions', () => {
      render(
        <TestWrapper>
          <ConciergusFormRenderer {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByText('Enter your full name')).toBeInTheDocument();
      expect(screen.getByText('Tell us what you need help with')).toBeInTheDocument();
    });

    test('applies grid layout when specified', () => {
      render(
        <TestWrapper>
          <ConciergusFormRenderer 
            {...defaultProps}
            renderOptions={{
              layout: 'grid',
              gridColumns: 2
            }}
          />
        </TestWrapper>
      );

      const formFields = document.querySelector('.form-fields');
      expect(formFields).toHaveClass('form-grid');
      expect(formFields).toHaveStyle({ gridTemplateColumns: 'repeat(2, 1fr)' });
    });
  });

  describe('Form Validation', () => {
    beforeEach(() => {
      (experimental_useObject as jest.Mock).mockReturnValue({
        object: sampleFormSchema,
        submit: jest.fn(),
        isLoading: false,
        error: null,
        stop: jest.fn()
      });
    });

    test('validates required fields on form submission', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ConciergusFormRenderer {...defaultProps} />
        </TestWrapper>
      );

      const submitButton = screen.getByText('Send Message');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Full Name is required')).toBeInTheDocument();
        expect(screen.getByText('Email Address is required')).toBeInTheDocument();
        expect(screen.getByText('Message is required')).toBeInTheDocument();
      });
    });

    test('validates field length constraints', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ConciergusFormRenderer 
            {...defaultProps}
            renderOptions={{ validationMode: 'immediate' }}
          />
        </TestWrapper>
      );

      const nameInput = screen.getByLabelText(/Full Name/);
      
      // Test minimum length
      await user.type(nameInput, 'A');
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText('Full Name must be at least 2 characters')).toBeInTheDocument();
      });

      // Test maximum length by manually setting the value to bypass maxlength attribute
      await user.clear(nameInput);
      const longValue = 'A'.repeat(51); // 51 characters to exceed the 50 character limit
      
      // Manually trigger the validation by setting the value directly and triggering change
      fireEvent.change(nameInput, { target: { value: longValue } });

      await waitFor(() => {
        expect(screen.getByText('Full Name must be no more than 50 characters')).toBeInTheDocument();
      });
    });

    test('validates email pattern', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ConciergusFormRenderer 
            {...defaultProps}
            renderOptions={{ validationMode: 'onBlur' }}
          />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/Email Address/);
      
      await user.type(emailInput, 'invalid-email');
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText('Email Address format is invalid')).toBeInTheDocument();
      });
    });

    test('shows validation errors immediately when validationMode is immediate', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ConciergusFormRenderer 
            {...defaultProps}
            renderOptions={{ validationMode: 'immediate' }}
          />
        </TestWrapper>
      );

      const nameInput = screen.getByLabelText(/Full Name/);
      
      await user.type(nameInput, 'A');

      await waitFor(() => {
        expect(screen.getByText('Full Name must be at least 2 characters')).toBeInTheDocument();
      });
    });

    test('calls onValidationChange when validation state changes', async () => {
      const user = userEvent.setup();
      const onValidationChange = jest.fn();
      
      render(
        <TestWrapper>
          <ConciergusFormRenderer 
            {...defaultProps}
            onValidationChange={onValidationChange}
          />
        </TestWrapper>
      );

      const submitButton = screen.getByText('Send Message');
      await user.click(submitButton);

      await waitFor(() => {
        expect(onValidationChange).toHaveBeenCalledWith(
          expect.objectContaining({
            isValid: false,
            fieldErrors: expect.objectContaining({
              name: expect.stringContaining('required'),
              email: expect.stringContaining('required'),
              message: expect.stringContaining('required')
            })
          })
        );
      });
    });
  });

  describe('Form Submission', () => {
    beforeEach(() => {
      (experimental_useObject as jest.Mock).mockReturnValue({
        object: sampleFormSchema,
        submit: jest.fn(),
        isLoading: false,
        error: null,
        stop: jest.fn()
      });
    });

    test('submits form with valid data', async () => {
      const user = userEvent.setup();
      const onSubmit = jest.fn();
      
      render(
        <TestWrapper>
          <ConciergusFormRenderer 
            {...defaultProps}
            onSubmit={onSubmit}
          />
        </TestWrapper>
      );

      // Fill out the form
      await user.type(screen.getByLabelText(/Full Name/), 'John Doe');
      await user.type(screen.getByLabelText(/Email Address/), 'john@example.com');
      await user.type(screen.getByLabelText(/Message/), 'This is a test message');
      
      const submitButton = screen.getByText('Send Message');
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            data: {
              name: 'John Doe',
              email: 'john@example.com',
              message: 'This is a test message',
              subscribe: false
            },
            schema: sampleFormSchema,
            metadata: expect.objectContaining({
              timestamp: expect.any(Date),
              completionTime: expect.any(Number),
              errorCount: 0
            })
          })
        );
      });
    });

    test('prevents submission with invalid data', async () => {
      const user = userEvent.setup();
      const onSubmit = jest.fn();
      
      render(
        <TestWrapper>
          <ConciergusFormRenderer 
            {...defaultProps}
            onSubmit={onSubmit}
          />
        </TestWrapper>
      );

      const submitButton = screen.getByText('Send Message');
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).not.toHaveBeenCalled();
      });
    });

    test('calls onFieldChange when field values change', async () => {
      const user = userEvent.setup();
      const onFieldChange = jest.fn();
      
      render(
        <TestWrapper>
          <ConciergusFormRenderer 
            {...defaultProps}
            onFieldChange={onFieldChange}
          />
        </TestWrapper>
      );

      const nameInput = screen.getByLabelText(/Full Name/);
      await user.type(nameInput, 'John');

      await waitFor(() => {
        expect(onFieldChange).toHaveBeenCalledWith('name', 'John');
      });
    });

    test('disables submit button during submission', async () => {
      const user = userEvent.setup();
      const onSubmit = jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      render(
        <TestWrapper>
          <ConciergusFormRenderer 
            {...defaultProps}
            onSubmit={onSubmit}
          />
        </TestWrapper>
      );

      // Fill out valid form
      await user.type(screen.getByLabelText(/Full Name/), 'John Doe');
      await user.type(screen.getByLabelText(/Email Address/), 'john@example.com');
      await user.type(screen.getByLabelText(/Message/), 'This is a test message');

      const submitButton = screen.getByText('Send Message');
      await user.click(submitButton);

      // Button should be disabled and show loading text
      expect(submitButton).toBeDisabled();
      expect(screen.getByText('Submitting...')).toBeInTheDocument();
    });
  });

  describe('Conditional Fields', () => {
    beforeEach(() => {
      (experimental_useObject as jest.Mock).mockReturnValue({
        object: complexFormSchema,
        submit: jest.fn(),
        isLoading: false,
        error: null,
        stop: jest.fn()
      });
    });

    test('shows conditional field when condition is met', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ConciergusFormRenderer {...defaultProps} />
        </TestWrapper>
      );

      // Initially, company name should not be visible
      expect(screen.queryByLabelText(/Company Name/)).not.toBeInTheDocument();

      // Select business user type
      const userTypeSelect = screen.getByLabelText(/User Type/);
      await user.selectOptions(userTypeSelect, 'business');

      // Now company name should be visible
      await waitFor(() => {
        expect(screen.getByLabelText(/Company Name/)).toBeInTheDocument();
      });
    });

    test('hides conditional field when condition is not met', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ConciergusFormRenderer {...defaultProps} />
        </TestWrapper>
      );

      // Select business first to show company name
      const userTypeSelect = screen.getByLabelText(/User Type/);
      await user.selectOptions(userTypeSelect, 'business');

      await waitFor(() => {
        expect(screen.getByLabelText(/Company Name/)).toBeInTheDocument();
      });

      // Switch to individual
      await user.selectOptions(userTypeSelect, 'individual');

      await waitFor(() => {
        expect(screen.queryByLabelText(/Company Name/)).not.toBeInTheDocument();
      });
    });
  });

  describe('Field Types', () => {
    test('renders select field with options correctly', () => {
      const selectSchema: FormSchema = {
        fields: [{
          id: 'category',
          name: 'category',
          type: 'select',
          label: 'Category',
          options: [
            { value: 'tech', label: 'Technology' },
            { value: 'health', label: 'Healthcare' },
            { value: 'finance', label: 'Finance' }
          ]
        }]
      };

      (experimental_useObject as jest.Mock).mockReturnValue({
        object: selectSchema,
        submit: jest.fn(),
        isLoading: false,
        error: null,
        stop: jest.fn()
      });

      render(
        <TestWrapper>
          <ConciergusFormRenderer {...defaultProps} />
        </TestWrapper>
      );

      const select = screen.getByLabelText(/Category/);
      expect(select).toBeInTheDocument();
      expect(screen.getByText('Technology')).toBeInTheDocument();
      expect(screen.getByText('Healthcare')).toBeInTheDocument();
      expect(screen.getByText('Finance')).toBeInTheDocument();
    });

    test('renders radio field with options correctly', () => {
      const radioSchema: FormSchema = {
        fields: [{
          id: 'size',
          name: 'size',
          type: 'radio',
          label: 'Size',
          options: [
            { value: 'small', label: 'Small' },
            { value: 'medium', label: 'Medium' },
            { value: 'large', label: 'Large' }
          ]
        }]
      };

      (experimental_useObject as jest.Mock).mockReturnValue({
        object: radioSchema,
        submit: jest.fn(),
        isLoading: false,
        error: null,
        stop: jest.fn()
      });

      render(
        <TestWrapper>
          <ConciergusFormRenderer {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByLabelText('Small')).toBeInTheDocument();
      expect(screen.getByLabelText('Medium')).toBeInTheDocument();
      expect(screen.getByLabelText('Large')).toBeInTheDocument();
    });

    test('renders range field with value display', async () => {
      const user = userEvent.setup();
      const rangeSchema: FormSchema = {
        fields: [{
          id: 'price',
          name: 'price',
          type: 'range',
          label: 'Price Range',
          validation: { min: 0, max: 100 }
        }]
      };

      (experimental_useObject as jest.Mock).mockReturnValue({
        object: rangeSchema,
        submit: jest.fn(),
        isLoading: false,
        error: null,
        stop: jest.fn()
      });

      render(
        <TestWrapper>
          <ConciergusFormRenderer {...defaultProps} />
        </TestWrapper>
      );

      const rangeInput = screen.getByLabelText(/Price Range/);
      expect(rangeInput).toHaveAttribute('type', 'range');
      expect(rangeInput).toHaveAttribute('min', '0');
      expect(rangeInput).toHaveAttribute('max', '100');

      // Change the range value
      fireEvent.change(rangeInput, { target: { value: '50' } });

      // Value should be displayed
      expect(screen.getByText('50')).toBeInTheDocument();
    });
  });

  describe('Custom Components', () => {
    test('renders custom loading component', () => {
      (experimental_useObject as jest.Mock).mockReturnValue({
        object: null,
        submit: jest.fn(),
        isLoading: true,
        error: null,
        stop: jest.fn()
      });

      // Define a proper React component function that can be instantiated
      const CustomLoadingComponent: React.FC = () => <div>Custom loading message</div>;

      render(
        <TestWrapper>
          <ConciergusFormRenderer 
            {...defaultProps}
            loadingComponent={CustomLoadingComponent}
          />
        </TestWrapper>
      );

      expect(screen.getByText('Custom loading message')).toBeInTheDocument();
    });

    test('renders custom error component', () => {
      const error = new Error('Custom error');
      const CustomError = ({ error }: { error: Error }) => <div>Custom error: {error.message}</div>;

      (experimental_useObject as jest.Mock).mockReturnValue({
        object: null,
        submit: jest.fn(),
        isLoading: false,
        error,
        stop: jest.fn()
      });

      render(
        <TestWrapper>
          <ConciergusFormRenderer 
            {...defaultProps}
            errorComponent={CustomError}
          />
        </TestWrapper>
      );

      expect(screen.getByText('Custom error: Custom error')).toBeInTheDocument();
    });

    test('renders custom field renderer', () => {
      const CustomFieldRenderer = ({ field }: { field: any }) => (
        <div>Custom field: {field.label}</div>
      );

      (experimental_useObject as jest.Mock).mockReturnValue({
        object: sampleFormSchema,
        submit: jest.fn(),
        isLoading: false,
        error: null,
        stop: jest.fn()
      });

      render(
        <TestWrapper>
          <ConciergusFormRenderer 
            {...defaultProps}
            fieldRenderer={CustomFieldRenderer}
          />
        </TestWrapper>
      );

      expect(screen.getByText('Custom field: Full Name')).toBeInTheDocument();
      expect(screen.getByText('Custom field: Email Address')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      (experimental_useObject as jest.Mock).mockReturnValue({
        object: sampleFormSchema,
        submit: jest.fn(),
        isLoading: false,
        error: null,
        stop: jest.fn()
      });
    });

    test('sets proper ARIA attributes', () => {
      render(
        <TestWrapper>
          <ConciergusFormRenderer 
            {...defaultProps}
            ariaLabel="Test form"
            ariaDescription="Test description"
          />
        </TestWrapper>
      );

      const form = document.querySelector('form');
      expect(form).toHaveAttribute('aria-label', 'Test form');
      expect(form).toHaveAttribute('aria-describedby', 'form-description');
    });

    test('sets aria-invalid on fields with errors', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ConciergusFormRenderer 
            {...defaultProps}
            renderOptions={{ validationMode: 'immediate' }}
          />
        </TestWrapper>
      );

      const nameInput = screen.getByLabelText(/Full Name/);
      await user.type(nameInput, 'A'); // Type a short value to trigger validation

      await waitFor(() => {
        expect(nameInput).toHaveAttribute('aria-invalid', 'true');
      });
    });

    test('associates error messages with fields using aria-describedby', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ConciergusFormRenderer {...defaultProps} />
        </TestWrapper>
      );

      const submitButton = screen.getByText('Send Message');
      await user.click(submitButton);

      await waitFor(() => {
        const nameInput = screen.getByLabelText(/Full Name/);
        const errorElement = screen.getByText('Full Name is required');
        
        expect(nameInput).toHaveAttribute('aria-describedby', 'name-error');
        expect(errorElement).toHaveAttribute('id', 'name-error');
      });
    });

    test('marks error messages with role="alert"', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ConciergusFormRenderer {...defaultProps} />
        </TestWrapper>
      );

      const submitButton = screen.getByText('Send Message');
      await user.click(submitButton);

      await waitFor(() => {
        const errorMessage = screen.getByText('Full Name is required');
        expect(errorMessage.closest('[role="alert"]')).toBeInTheDocument();
      });
    });
  });

  describe('Debug Mode', () => {
    test('logs generation events when debug is enabled', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      let mockConfig: any = null;
      (experimental_useObject as jest.Mock).mockImplementation((config) => {
        mockConfig = config;
        return {
          object: sampleFormSchema,
          submit: jest.fn(),
          isLoading: false,
          error: null,
          stop: jest.fn()
        };
      });

      render(
        <TestWrapper>
          <ConciergusFormRenderer 
            {...defaultProps}
            debug={true}
          />
        </TestWrapper>
      );

      // Manually trigger the onFinish callback to test debug logging
      if (mockConfig?.onFinish) {
        act(() => {
          mockConfig.onFinish({ object: sampleFormSchema, error: null });
        });
      }

      expect(consoleSpy).toHaveBeenCalledWith(
        'Form generation completed:',
        expect.objectContaining({ object: sampleFormSchema })
      );

      consoleSpy.mockRestore();
    });
  });
}); 