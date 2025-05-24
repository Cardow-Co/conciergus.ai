'use server';

import React from 'react';
import { streamUI, createStreamableUI, createStreamableValue } from 'ai/rsc';
import { openai } from '@ai-sdk/openai';
import { generateId } from 'ai';
import { z } from 'zod';
import { 
  GenerativeWizardConfig,
  WizardStep,
  StreamUIResult,
  ConciergusRSCTool,
  LoadingState
} from '../types/rsc';

/**
 * Generate a multi-step wizard interface
 */
export async function generateWizard(prompt: string): Promise<StreamUIResult> {
  const wizardTool: ConciergusRSCTool = {
    description: 'Generate a multi-step wizard interface',
    parameters: z.object({
      title: z.string(),
      steps: z.array(z.object({
        id: z.string(),
        title: z.string(),
        description: z.string().optional(),
        fields: z.array(z.object({
          name: z.string(),
          type: z.enum(['text', 'email', 'number', 'textarea', 'select', 'checkbox']),
          label: z.string(),
          placeholder: z.string().optional(),
          required: z.boolean().optional(),
          options: z.array(z.string()).optional()
        })).optional()
      }))
    }),
    generate: async function* ({ title, steps }) {
      yield (
        <div className="flex items-center gap-2 p-4 bg-gray-50 rounded-lg animate-pulse">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-600">Designing wizard steps...</span>
        </div>
      );

      await new Promise(resolve => setTimeout(resolve, 1200));

      return (
        <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">{title}</h1>
            <p className="text-gray-600">Complete the following steps to proceed</p>
          </div>

          {/* Progress indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                    ${index === 0 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}
                  `}>
                    {index + 1}
                  </div>
                  <span className="ml-2 text-sm font-medium text-gray-700">{step.title}</span>
                  {index < steps.length - 1 && (
                    <div className="w-12 h-0.5 bg-gray-300 mx-4" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Current step content */}
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">{steps[0]?.title}</h2>
            {steps[0]?.description && (
              <p className="text-gray-600 mb-6">{steps[0].description}</p>
            )}
            
            {steps[0]?.fields && (
              <div className="space-y-4">
                {steps[0].fields.map((field, index) => (
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
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex justify-between">
            <button
              disabled
              className="px-6 py-2 text-gray-400 bg-gray-100 rounded-md cursor-not-allowed"
            >
              Previous
            </button>
            <button className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
              Next Step
            </button>
          </div>
        </div>
      );
    }
  };

  try {
    const result = await streamUI({
      model: openai('gpt-4o'),
      prompt: `Generate a wizard interface based on this request: ${prompt}`,
      tools: {
        generateWizard: wizardTool
      }
    });

    return {
      value: result.value,
      usage: result.usage
    };
  } catch (error) {
    console.error('Wizard generation error:', error);
    return {
      value: (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <p className="font-semibold">Error generating wizard</p>
          <p className="text-sm">{error instanceof Error ? error.message : 'Unknown error'}</p>
        </div>
      )
    };
  }
}

/**
 * Generate a collaborative editing interface
 */
export async function generateCollaborativeEditor(prompt: string): Promise<StreamUIResult> {
  const editorTool: ConciergusRSCTool = {
    description: 'Generate a collaborative editing interface',
    parameters: z.object({
      title: z.string(),
      content: z.string(),
      collaborators: z.array(z.object({
        id: z.string(),
        name: z.string(),
        avatar: z.string().optional(),
        status: z.enum(['online', 'offline', 'away'])
      })).optional()
    }),
    generate: async function* ({ title, content, collaborators = [] }) {
      yield (
        <div className="flex items-center gap-2 p-4 bg-gray-50 rounded-lg animate-pulse">
          <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-600">Setting up collaborative editor...</span>
        </div>
      );

      await new Promise(resolve => setTimeout(resolve, 1000));

      return (
        <div className="h-screen flex flex-col bg-white">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-gray-50">
            <div>
              <h1 className="text-xl font-semibold text-gray-800">{title}</h1>
              <p className="text-sm text-gray-600">Collaborative Document</p>
            </div>
            
            {/* Collaborators */}
            <div className="flex items-center space-x-4">
              <div className="flex -space-x-2">
                {collaborators.slice(0, 4).map((collaborator) => (
                  <div
                    key={collaborator.id}
                    className="relative w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-medium border-2 border-white"
                    title={collaborator.name}
                  >
                    {collaborator.name.charAt(0).toUpperCase()}
                    <div className={`
                      absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white
                      ${collaborator.status === 'online' ? 'bg-green-500' : 
                        collaborator.status === 'away' ? 'bg-yellow-500' : 'bg-gray-400'}
                    `} />
                  </div>
                ))}
                {collaborators.length > 4 && (
                  <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-xs font-medium border-2 border-white">
                    +{collaborators.length - 4}
                  </div>
                )}
              </div>
              
              <button className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">
                Share
              </button>
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex items-center space-x-1 p-2 border-b bg-gray-50">
            <button className="p-2 rounded hover:bg-gray-200 text-gray-600">
              <strong>B</strong>
            </button>
            <button className="p-2 rounded hover:bg-gray-200 text-gray-600">
              <em>I</em>
            </button>
            <button className="p-2 rounded hover:bg-gray-200 text-gray-600">
              <u>U</u>
            </button>
            <div className="w-px h-6 bg-gray-300 mx-2" />
            <button className="p-2 rounded hover:bg-gray-200 text-gray-600">
              H1
            </button>
            <button className="p-2 rounded hover:bg-gray-200 text-gray-600">
              H2
            </button>
            <div className="w-px h-6 bg-gray-300 mx-2" />
            <button className="p-2 rounded hover:bg-gray-200 text-gray-600">
              📝
            </button>
            <button className="p-2 rounded hover:bg-gray-200 text-gray-600">
              💬
            </button>
          </div>

          {/* Editor Area */}
          <div className="flex-1 flex">
            <div className="flex-1 p-6">
              <textarea
                className="w-full h-full resize-none border-none outline-none text-gray-800 leading-relaxed"
                placeholder="Start typing..."
                defaultValue={content}
                style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
              />
            </div>
            
            {/* Comments Sidebar */}
            <div className="w-80 border-l bg-gray-50 p-4">
              <h3 className="font-semibold text-gray-800 mb-4">Comments & Suggestions</h3>
              <div className="space-y-4">
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium">
                      J
                    </div>
                    <span className="text-sm font-medium text-gray-700">John Doe</span>
                    <span className="text-xs text-gray-500">2 min ago</span>
                  </div>
                  <p className="text-sm text-gray-600">Great start! Maybe we could expand on the introduction section?</p>
                  <button className="text-xs text-blue-600 hover:text-blue-800 mt-2">Reply</button>
                </div>
                
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs font-medium">
                      S
                    </div>
                    <span className="text-sm font-medium text-gray-700">Sarah Smith</span>
                    <span className="text-xs text-gray-500">5 min ago</span>
                  </div>
                  <p className="text-sm text-gray-600">I've made some edits to the formatting. Let me know what you think!</p>
                  <button className="text-xs text-blue-600 hover:text-blue-800 mt-2">Reply</button>
                </div>
              </div>
              
              <button className="w-full mt-4 p-2 text-sm text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50">
                + Add Comment
              </button>
            </div>
          </div>

          {/* Status Bar */}
          <div className="flex items-center justify-between p-2 border-t bg-gray-50 text-sm text-gray-600">
            <div className="flex items-center space-x-4">
              <span>Last saved: just now</span>
              <span>•</span>
              <span>{collaborators.filter(c => c.status === 'online').length} online</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span>Auto-save enabled</span>
            </div>
          </div>
        </div>
      );
    }
  };

  try {
    const result = await streamUI({
      model: openai('gpt-4o'),
      prompt: `Generate a collaborative editing interface based on this request: ${prompt}`,
      tools: {
        generateEditor: editorTool
      }
    });

    return {
      value: result.value,
      usage: result.usage
    };
  } catch (error) {
    console.error('Collaborative editor generation error:', error);
    return {
      value: (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <p className="font-semibold">Error generating collaborative editor</p>
          <p className="text-sm">{error instanceof Error ? error.message : 'Unknown error'}</p>
        </div>
      )
    };
  }
}

/**
 * Create a streamable value for real-time updates
 */
export async function createStreamableCounter(initialValue: number = 0) {
  const stream = createStreamableValue(initialValue);

  // Simulate real-time counter updates
  const interval = setInterval(() => {
    const newValue = initialValue + Math.floor(Math.random() * 100);
    stream.update(newValue);
  }, 1000);

  // Clean up after 10 seconds
  setTimeout(() => {
    clearInterval(interval);
    stream.done();
  }, 10000);

  return stream.value;
}

/**
 * Create a streamable UI for progressive enhancement
 */
export async function createProgressiveUI(title: string) {
  const ui = createStreamableUI();

  (async () => {
    // Initial loading state
    ui.update(
      <div className="p-4 bg-gray-100 rounded-lg animate-pulse">
        <div className="h-4 bg-gray-300 rounded mb-2 w-3/4"></div>
        <div className="h-3 bg-gray-300 rounded w-1/2"></div>
      </div>
    );

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Partial content
    ui.update(
      <div className="p-4 bg-white rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <div className="animate-pulse">
          <div className="h-3 bg-gray-200 rounded mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );

    await new Promise(resolve => setTimeout(resolve, 1500));

    // Final content
    ui.done(
      <div className="p-4 bg-white rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-gray-600 mb-4">
          This content was progressively loaded using React Server Components 
          and the AI SDK's streamable UI capabilities.
        </p>
        <div className="flex space-x-2">
          <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Action 1
          </button>
          <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50">
            Action 2
          </button>
        </div>
      </div>
    );
  })().catch(error => {
    ui.error(
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
        <p className="font-semibold">Error loading content</p>
        <p className="text-sm">{error.message}</p>
      </div>
    );
  });

  return ui.value;
} 