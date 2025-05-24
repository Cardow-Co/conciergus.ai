'use server';

import React from 'react';
import { streamUI } from 'ai/rsc';
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
 * Create a loading component with configurable message and style
 */
function createLoadingComponent(state: LoadingState) {
  return (
    <div className="flex items-center gap-2 p-4 bg-gray-50 rounded-lg animate-pulse">
      {state.spinner && (
        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      )}
      <span className="text-gray-600">{state.message}</span>
      {state.progress !== undefined && (
        <div className="ml-auto">
          <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${state.progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Enhanced streamUI wrapper with Conciergus features
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
      text: ({ content }) => (
        <div className="prose max-w-none">
          <p>{content}</p>
        </div>
      ),
      tools: options.tools || {},
      onFinish: options.onFinish
    });

    return {
      value: result.value,
      usage: result.usage
    };
  } catch (error) {
    console.error('ConciergusStreamUI Error:', error);
    return {
      value: (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <p className="font-semibold">Error generating response</p>
          <p className="text-sm">{error instanceof Error ? error.message : 'Unknown error'}</p>
        </div>
      )
    };
  }
}

/**
 * Generate a dynamic form based on user requirements
 */
export async function generateDynamicForm(prompt: string): Promise<StreamUIResult> {
  const formGenerationTool: ConciergusRSCTool = {
    description: 'Generate a dynamic form based on user requirements',
    parameters: z.object({
      title: z.string(),
      fields: z.array(z.object({
        name: z.string(),
        type: z.enum(['text', 'email', 'number', 'textarea', 'select', 'checkbox']),
        label: z.string(),
        placeholder: z.string().optional(),
        required: z.boolean().optional(),
        options: z.array(z.string()).optional()
      }))
    }),
    generate: async function* ({ title, fields }) {
      yield createLoadingComponent({ 
        message: 'Generating form structure...', 
        spinner: true 
      });

      // Simulate form generation delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      return (
        <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold mb-6 text-gray-800">{title}</h2>
          <form className="space-y-4">
            {fields.map((field, index) => (
              <div key={index} className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                {field.type === 'textarea' ? (
                  <textarea
                    name={field.name}
                    placeholder={field.placeholder}
                    required={field.required}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                ) : field.type === 'select' ? (
                  <select
                    name={field.name}
                    required={field.required}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select an option</option>
                    {field.options?.map((option, optIndex) => (
                      <option key={optIndex} value={option}>{option}</option>
                    ))}
                  </select>
                ) : field.type === 'checkbox' ? (
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      name={field.name}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-600">{field.placeholder || 'Check this box'}</span>
                  </label>
                ) : (
                  <input
                    type={field.type}
                    name={field.name}
                    placeholder={field.placeholder}
                    required={field.required}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}
              </div>
            ))}
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              Submit Form
            </button>
          </form>
        </div>
      );
    }
  };

  return conciergusStreamUI({
    prompt: `Generate a form based on this request: ${prompt}`,
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
 * Continue a conversation with streamUI
 */
export async function continueConversation(
  input: string,
  previousMessages: ServerMessage[] = []
): Promise<ClientMessage> {
  const result = await conciergusStreamUI({
    prompt: input,
    messages: [...previousMessages, { role: 'user', content: input }]
  });

  return {
    id: generateId(),
    role: 'assistant',
    display: result.value,
    timestamp: new Date(),
    metadata: {
      usage: result.usage
    }
  };
} 