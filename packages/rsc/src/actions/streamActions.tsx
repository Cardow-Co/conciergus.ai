'use server';

import React from 'react';
import { streamUI, createStreamableUI, createStreamableValue } from 'ai/rsc';
import { openai } from '@ai-sdk/openai';
import { generateId } from 'ai';
import { z } from 'zod';
import { 
  StreamUIOptions, 
  StreamUIResult, 
  ClientMessage,
  ServerMessage,
  ConciergusRSCTool,
  LoadingState
} from '../types/rsc';

/**
 * Default configuration for Conciergus RSC
 */
const DEFAULT_CONFIG = {
  model: 'gpt-4o',
  temperature: 0.7,
  maxTokens: 8192,
  systemPrompt: 'You are a helpful AI assistant integrated into the Conciergus chat system. Generate appropriate UI components for user requests.'
};

/**
 * Create a progressive loading component with enhanced animations
 */
function createLoadingComponent(state: LoadingState) {
  return (
    <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
      {state.spinner && (
        <div className="relative">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <div className="absolute inset-0 w-5 h-5 border-2 border-blue-300 border-t-transparent rounded-full animate-spin opacity-30" 
               style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
        </div>
      )}
      <div className="flex-1">
        <span className="text-blue-700 font-medium">{state.message}</span>
        {state.progress !== undefined && (
          <div className="mt-2">
            <div className="w-full h-2 bg-blue-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500 ease-out"
                style={{ width: `${state.progress}%` }}
              />
            </div>
            <div className="text-xs text-blue-600 mt-1">{state.progress}% complete</div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Enhanced streamUI wrapper with progressive streaming and better error handling
 */
export async function conciergusStreamUI(options: StreamUIOptions): Promise<StreamUIResult> {
  const config = { ...DEFAULT_CONFIG, ...options };
  
  try {
    const result = await streamUI({
      model: openai(config.model || DEFAULT_CONFIG.model),
      prompt: options.prompt,
      messages: options.messages || [],
      system: config.systemPrompt,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      text: ({ content, done }) => {
        if (done) {
          return (
            <div className="prose max-w-none">
              <div className="whitespace-pre-wrap text-gray-800">{content}</div>
            </div>
          );
        }
        return (
          <div className="prose max-w-none">
            <div className="whitespace-pre-wrap text-gray-800">{content}</div>
            <div className="inline-block w-2 h-5 bg-blue-500 animate-pulse ml-1" />
          </div>
        );
      },
      tools: options.tools || {},
      onFinish: (result) => {
        // Enhanced logging and analytics
        console.log('ConciergusStreamUI completed:', {
          usage: result.usage,
          timestamp: new Date().toISOString(),
          model: config.model
        });
        
        if (options.onFinish) {
          options.onFinish(result);
        }
      }
    });

    return {
      value: result.value,
      usage: result.usage
    };
  } catch (error) {
    console.error('ConciergusStreamUI Error:', error);
    
    // Enhanced error component with better UX
    const errorComponent = (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">Error generating response</h3>
            <p className="text-sm mt-1">
              {error instanceof Error ? error.message : 'An unexpected error occurred while generating the AI response.'}
            </p>
            {process.env.NODE_ENV === 'development' && error instanceof Error && error.stack && (
              <details className="mt-2">
                <summary className="text-xs cursor-pointer">Technical details</summary>
                <pre className="text-xs mt-1 bg-red-100 p-2 rounded overflow-auto">{error.stack}</pre>
              </details>
            )}
          </div>
        </div>
      </div>
    );
    
    return {
      value: errorComponent
    };
  }
}

/**
 * Create a progressive streamable UI with enhanced loading states
 */
export async function createProgressiveUI(initialContent: React.ReactNode): Promise<React.ReactNode> {
  const streamableUI = createStreamableUI(
    createLoadingComponent({ 
      message: 'Initializing...', 
      spinner: true 
    })
  );

  // Simulate progressive updates
  setTimeout(() => {
    streamableUI.update(
      createLoadingComponent({ 
        message: 'Processing request...', 
        spinner: true, 
        progress: 25 
      })
    );
  }, 500);

  setTimeout(() => {
    streamableUI.update(
      createLoadingComponent({ 
        message: 'Generating response...', 
        spinner: true, 
        progress: 75 
      })
    );
  }, 1500);

  setTimeout(() => {
    streamableUI.done(initialContent);
  }, 2500);

  return streamableUI.value;
}

/**
 * Generate a dynamic form with enhanced streaming and validation
 */
export async function generateDynamicForm(prompt: string): Promise<StreamUIResult> {
  const formGenerationTool: ConciergusRSCTool = {
    description: 'Generate a dynamic form based on user requirements with real-time validation',
    parameters: z.object({
      title: z.string().min(1, 'Title is required'),
      description: z.string().optional(),
      fields: z.array(z.object({
        name: z.string().min(1, 'Field name is required'),
        type: z.enum(['text', 'email', 'number', 'textarea', 'select', 'checkbox', 'radio', 'date', 'file']),
        label: z.string().min(1, 'Field label is required'),
        placeholder: z.string().optional(),
        required: z.boolean().optional().default(false),
        options: z.array(z.string()).optional(),
        validation: z.object({
          min: z.number().optional(),
          max: z.number().optional(),
          pattern: z.string().optional(),
          message: z.string().optional()
        }).optional()
      })).min(1, 'At least one field is required'),
      submitButtonText: z.string().optional().default('Submit'),
      theme: z.enum(['default', 'modern', 'minimal']).optional().default('modern')
    }),
    generate: async function* ({ title, description, fields, submitButtonText, theme }) {
      // Progressive loading states
      yield createLoadingComponent({ 
        message: 'Analyzing form requirements...', 
        spinner: true,
        progress: 10
      });

      await new Promise(resolve => setTimeout(resolve, 800));

      yield createLoadingComponent({ 
        message: 'Designing form structure...', 
        spinner: true,
        progress: 40
      });

      await new Promise(resolve => setTimeout(resolve, 600));

      yield createLoadingComponent({ 
        message: 'Applying styling and validation...', 
        spinner: true,
        progress: 80
      });

      await new Promise(resolve => setTimeout(resolve, 400));

      // Theme-based styling
      const themeClasses = {
        default: 'bg-white shadow-md',
        modern: 'bg-gradient-to-b from-white to-gray-50 shadow-xl border border-gray-100',
        minimal: 'bg-white border border-gray-200'
      };

      const fieldThemeClasses = {
        default: 'border-gray-300 focus:ring-2 focus:ring-blue-500',
        modern: 'border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50 focus:bg-white',
        minimal: 'border-gray-300 focus:border-gray-500'
      };

      return (
        <div className={`max-w-2xl mx-auto p-8 rounded-xl ${themeClasses[theme]}`}>
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">{title}</h2>
            {description && (
              <p className="text-gray-600 text-lg">{description}</p>
            )}
          </div>
          
          <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
            {fields.map((field, index) => (
              <div key={index} className="space-y-2">
                <label className="block text-sm font-semibold text-gray-800">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                
                {field.type === 'textarea' ? (
                  <textarea
                    name={field.name}
                    placeholder={field.placeholder}
                    required={field.required}
                    className={`w-full px-4 py-3 rounded-lg ${fieldThemeClasses[theme]} transition-all duration-200`}
                    rows={4}
                  />
                ) : field.type === 'select' ? (
                  <select
                    name={field.name}
                    required={field.required}
                    className={`w-full px-4 py-3 rounded-lg ${fieldThemeClasses[theme]} transition-all duration-200`}
                  >
                    <option value="">Select an option</option>
                    {field.options?.map((option, optIndex) => (
                      <option key={optIndex} value={option}>{option}</option>
                    ))}
                  </select>
                ) : field.type === 'radio' ? (
                  <div className="space-y-2">
                    {field.options?.map((option, optIndex) => (
                      <label key={optIndex} className="flex items-center space-x-3">
                        <input
                          type="radio"
                          name={field.name}
                          value={option}
                          className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                        />
                        <span className="text-sm text-gray-700">{option}</span>
                      </label>
                    ))}
                  </div>
                ) : field.type === 'checkbox' ? (
                  <label className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      name={field.name}
                      className="mt-1 w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700">{field.placeholder || 'Check this option'}</span>
                  </label>
                ) : (
                  <input
                    type={field.type}
                    name={field.name}
                    placeholder={field.placeholder}
                    required={field.required}
                    min={field.validation?.min}
                    max={field.validation?.max}
                    pattern={field.validation?.pattern}
                    className={`w-full px-4 py-3 rounded-lg ${fieldThemeClasses[theme]} transition-all duration-200`}
                  />
                )}
                
                {field.validation?.message && (
                  <p className="text-xs text-gray-500 mt-1">{field.validation.message}</p>
                )}
              </div>
            ))}
            
            <div className="pt-4">
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200 transform hover:scale-[1.02]"
              >
                {submitButtonText}
              </button>
            </div>
          </form>
          
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-700">
              <strong>Form generated successfully!</strong> This form includes validation, responsive design, and modern styling.
            </p>
          </div>
        </div>
      );
    }
  };

  return conciergusStreamUI({
    prompt: `Generate a form based on this request: ${prompt}. Make it modern, accessible, and user-friendly.`,
    tools: {
      generateForm: formGenerationTool
    }
  });
}

/**
 * Generate an interactive dashboard
 */
export async function generateDashboard(prompt: string): Promise<StreamUIResult> {
  const dashboardTool: ConciergusRSCTool = {
    description: 'Generate an interactive dashboard with widgets',
    parameters: z.object({
      title: z.string(),
      widgets: z.array(z.object({
        id: z.string(),
        title: z.string(),
        type: z.enum(['metric', 'chart', 'table', 'text']),
        value: z.string().optional(),
        data: z.array(z.any()).optional()
      }))
    }),
    generate: async function* ({ title, widgets }) {
      yield createLoadingComponent({ 
        message: 'Building dashboard...', 
        spinner: true,
        progress: 0 
      });

      await new Promise(resolve => setTimeout(resolve, 800));

      yield createLoadingComponent({ 
        message: 'Adding widgets...', 
        spinner: true,
        progress: 50 
      });

      await new Promise(resolve => setTimeout(resolve, 800));

      return (
        <div className="p-6 bg-gray-50 min-h-screen">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">{title}</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {widgets.map((widget) => (
              <div key={widget.id} className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-700 mb-4">{widget.title}</h3>
                {widget.type === 'metric' && (
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">{widget.value}</div>
                    <div className="text-sm text-gray-500 mt-1">Current Value</div>
                  </div>
                )}
                {widget.type === 'chart' && (
                  <div className="h-32 bg-gradient-to-r from-blue-400 to-purple-500 rounded flex items-center justify-center text-white font-semibold">
                    Chart Placeholder
                  </div>
                )}
                {widget.type === 'table' && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2">Item</th>
                          <th className="text-left py-2">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {widget.data?.slice(0, 3).map((item, index) => (
                          <tr key={index} className="border-b border-gray-100">
                            <td className="py-2">{item?.name || `Item ${index + 1}`}</td>
                            <td className="py-2">{item?.value || 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {widget.type === 'text' && (
                  <p className="text-gray-600">{widget.value || 'Text content here'}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    }
  };

  return conciergusStreamUI({
    prompt: `Generate a dashboard based on this request: ${prompt}`,
    tools: {
      generateDashboard: dashboardTool
    }
  });
}

/**
 * Enhanced conversation continuation with better state management
 */
export async function continueConversation(
  input: string,
  previousMessages: ServerMessage[] = []
): Promise<ClientMessage> {
  try {
    const result = await streamUI({
      model: openai('gpt-4o'),
      messages: [
        ...previousMessages,
        { role: 'user', content: input }
      ],
      text: ({ content, done }) => {
        if (done) {
          return (
            <div className="prose max-w-none">
              <div className="whitespace-pre-wrap text-gray-800">{content}</div>
            </div>
          );
        }
        return (
          <div className="prose max-w-none">
            <div className="whitespace-pre-wrap text-gray-800">{content}</div>
            <div className="inline-block w-2 h-5 bg-blue-500 animate-pulse ml-1" />
          </div>
        );
      },
      tools: {
        createStreamableValue: {
          description: 'Create a streamable value for progressive updates',
          parameters: z.object({
            initialValue: z.string(),
            updates: z.array(z.string())
          }),
          generate: async function* ({ initialValue, updates }) {
            const streamableValue = createStreamableValue(initialValue);
            
            yield (
              <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
                <div className="font-medium text-blue-800">Streaming Value:</div>
                <div className="mt-2 font-mono text-sm">{initialValue}</div>
              </div>
            );
            
            // Progressive updates
            for (let i = 0; i < updates.length; i++) {
              await new Promise(resolve => setTimeout(resolve, 1000));
              streamableValue.update(updates[i]);
              
              yield (
                <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
                  <div className="font-medium text-blue-800">Streaming Value (Update {i + 1}):</div>
                  <div className="mt-2 font-mono text-sm">{updates[i]}</div>
                </div>
              );
            }
            
            streamableValue.done();
            
            return (
              <div className="p-4 border border-green-200 rounded-lg bg-green-50">
                <div className="font-medium text-green-800">Final Streaming Value:</div>
                <div className="mt-2 font-mono text-sm">{updates[updates.length - 1] || initialValue}</div>
              </div>
            );
          }
        }
      }
    });

    return {
      id: generateId(),
      role: 'assistant',
      display: result.value
    };
  } catch (error) {
    console.error('Conversation error:', error);
    
    return {
      id: generateId(),
      role: 'assistant',
      display: (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <p className="font-semibold">Error in conversation</p>
          <p className="text-sm">{error instanceof Error ? error.message : 'Unknown error'}</p>
        </div>
      )
    };
  }
} 