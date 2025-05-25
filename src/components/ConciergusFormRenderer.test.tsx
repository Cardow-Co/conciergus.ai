import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';
import { ConciergusFormRenderer, type FormSchema, type FormSubmissionData } from './ConciergusFormRenderer';
import { ConciergusProvider } from '../context/ConciergusProvider';

// Mock the AI SDK useObject hook
jest.mock('@ai-sdk/react', () => ({
  experimental_useObject: jest.fn()
}));

// Mock the useConciergus hook
jest.mock('../context/useConciergus', () => ({
  useConciergus: jest.fn()
}));

// Mock zod directly in the test file
const createChainableMock = () => {
  const mock = jest.fn(() => mock);
  mock.optional = jest.fn(() => mock);
  mock.min = jest.fn(() => mock);
  mock.max = jest.fn(() => mock);
  mock.parse = jest.fn();
  mock.safeParse = jest.fn();
  return mock;
};

jest.mock('zod', () => ({
  z: {
    object: jest.fn(() => createChainableMock()),
    string: jest.fn(() => createChainableMock()),
    number: jest.fn(() => createChainableMock()),
    boolean: jest.fn(() => createChainableMock()),
    array: jest.fn(() => createChainableMock()),
    enum: jest.fn(() => createChainableMock()),
    literal: jest.fn(() => createChainableMock()),
    union: jest.fn(() => createChainableMock()),
    nullable: jest.fn(() => createChainableMock()),
    optional: jest.fn(() => createChainableMock()),
    ZodError: class ZodError extends Error {
      constructor(message) {
        super(message);
        this.name = 'ZodError';
      }
    }
  }
}));

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
      expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument();
    });

    test('calls onGenerationComplete when schema is generated', () => {
      const onGenerationComplete = jest.fn();
      
      (experimental_useObject as jest.Mock).mockReturnValue({
        object: sampleFormSchema,
        submit: jest.fn(),
        isLoading: false,
        error: null,
        stop: jest.fn(),
        onFinish: ({ object }: { object: any }) => {
          if (object) {
            onGenerationComplete(object);
          }
        }
      });

      render(
        <TestWrapper>
          <ConciergusFormRenderer 
            {...defaultProps}
            onGenerationComplete={onGenerationComplete}
          />
        </TestWrapper>
      );

      // The onFinish callback should be called during hook setup
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

      expect(screen.getByRole('heading', { name: 'Contact Form' })).toBeInTheDocument();
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
      expect(screen.getByRole('button', { name: 'Send Message' })).toBeInTheDocument();
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
      expect(formFields).toHaveStyle('grid-template-columns: repeat(2, 1fr)');
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

      const submitButton = screen.getByRole('button', { name: 'Send Message' });
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
            renderOptions={{ validationMode: 'onBlur' }}
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

      // Test maximum length
      await user.clear(nameInput);
      await user.type(nameInput, 'A'.repeat(51));
      await user.tab();

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

      const submitButton = screen.getByRole('button', { name: 'Send Message' });
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
      
      const submitButton = screen.getByRole('button', { name: 'Send Message' });
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

      const submitButton = screen.getByRole('button', { name: 'Send Message' });
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

      const submitButton = screen.getByRole('button', { name: 'Send Message' });
      await user.click(submitButton);

      // Button should be disabled and show loading text
      expect(submitButton).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Submitting...' })).toBeInTheDocument();
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

      const CustomLoading = () => <div>Custom loading message</div>;

      render(
        <TestWrapper>
          <ConciergusFormRenderer 
            {...defaultProps}
            loadingComponent={<CustomLoading />}
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

      const form = screen.getByRole('form');
      expect(form).toHaveAttribute('aria-label', 'Test form');
      expect(form).toHaveAttribute('aria-describedby', 'form-description');
    });

    test('sets aria-invalid on fields with errors', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ConciergusFormRenderer 
            {...defaultProps}
            renderOptions={{ validationMode: 'onBlur' }}
          />
        </TestWrapper>
      );

      const nameInput = screen.getByLabelText(/Full Name/);
      await user.tab(); // Focus and blur to trigger validation

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

      const submitButton = screen.getByRole('button', { name: 'Send Message' });
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

      const submitButton = screen.getByRole('button', { name: 'Send Message' });
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
      
      (experimental_useObject as jest.Mock).mockReturnValue({
        object: sampleFormSchema,
        submit: jest.fn(),
        isLoading: false,
        error: null,
        stop: jest.fn(),
        onFinish: ({ object }: { object: any }) => {
          if (object) {
            console.log('Form generation completed:', { object });
          }
        }
      });

      render(
        <TestWrapper>
          <ConciergusFormRenderer 
            {...defaultProps}
            debug={true}
          />
        </TestWrapper>
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        'Form generation completed:',
        expect.objectContaining({ object: sampleFormSchema })
      );

      consoleSpy.mockRestore();
    });
  });
}); 