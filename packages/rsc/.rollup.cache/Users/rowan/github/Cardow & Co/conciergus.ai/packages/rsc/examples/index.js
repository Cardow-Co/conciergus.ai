/**
 * Advanced RSC Examples
 *
 * This module provides comprehensive examples demonstrating advanced
 * React Server Components capabilities with Conciergus AI integration.
 */
// Dynamic Forms Examples
export * from './dynamic-forms/FormWizardExample';
// Dashboard Creator Examples  
export * from './dashboard-creator/DashboardExample';
// Chat Interface Examples
export * from './chat-interface/ChatExample';
// Re-export usage components for easy access
export { FormWizardExampleUsage } from './dynamic-forms/FormWizardExample';
export { DashboardExampleUsage } from './dashboard-creator/DashboardExample';
export { ChatExampleUsage } from './chat-interface/ChatExample';
/**
 * Example configurations for different use cases
 */
export const ExampleConfigs = {
    /**
     * Production-ready configuration
     */
    production: {
        formWizard: {
            enablePersistence: true,
            theme: 'modern'
        },
        dashboard: {
            enableCollaboration: false,
            enableRealtime: false,
            theme: 'light',
            enableAISuggestions: false
        },
        chat: {
            enableGenerativeUI: true,
            enableToolVisualization: true,
            enableRealTimeStreaming: true,
            enableOptimisticUpdates: false,
            theme: 'light'
        }
    },
    /**
     * Development configuration with debugging
     */
    development: {
        formWizard: {
            enablePersistence: true,
            theme: 'modern'
        },
        dashboard: {
            enableCollaboration: true,
            enableRealtime: true,
            theme: 'light',
            enableAISuggestions: true
        },
        chat: {
            enableGenerativeUI: true,
            enableToolVisualization: true,
            enableRealTimeStreaming: true,
            enableOptimisticUpdates: true,
            theme: 'light'
        }
    },
    /**
     * Demo configuration for showcasing features
     */
    demo: {
        formWizard: {
            enablePersistence: false,
            theme: 'modern'
        },
        dashboard: {
            enableCollaboration: true,
            enableRealtime: true,
            theme: 'light',
            enableAISuggestions: true
        },
        chat: {
            enableGenerativeUI: true,
            enableToolVisualization: true,
            enableRealTimeStreaming: true,
            enableOptimisticUpdates: true,
            theme: 'light'
        }
    }
};
/**
 * Example prompts for different scenarios
 */
export const ExamplePrompts = {
    formWizard: [
        "Create a comprehensive user registration form with conditional logic",
        "Build a multi-step product configuration wizard",
        "Generate a survey form with branching questions",
        "Create an onboarding workflow with progressive disclosure"
    ],
    dashboard: [
        "Create a comprehensive business analytics dashboard",
        "Build a real-time monitoring dashboard for system metrics",
        "Generate a sales performance dashboard with KPIs",
        "Create a project management dashboard with team insights"
    ],
    chat: [
        "You are a helpful business analyst assistant with access to data visualization tools",
        "You are a technical support agent with diagnostic tools and documentation access",
        "You are a creative assistant with design tools and content generation capabilities",
        "You are a productivity coach with task management and calendar tools"
    ]
};
/**
 * Helper function to get recommended configuration based on environment
 */
export function getRecommendedConfig(environment = 'development') {
    return ExampleConfigs[environment];
}
/**
 * Helper function to get random example prompt
 */
export function getRandomPrompt(exampleType) {
    const prompts = ExamplePrompts[exampleType];
    return prompts[Math.floor(Math.random() * prompts.length)];
}
//# sourceMappingURL=index.js.map