/**
 * Advanced RSC Examples
 *
 * This module provides comprehensive examples demonstrating advanced
 * React Server Components capabilities with Conciergus AI integration.
 */
export * from './dynamic-forms/FormWizardExample';
export * from './dashboard-creator/DashboardExample';
export * from './chat-interface/ChatExample';
export { FormWizardExampleUsage } from './dynamic-forms/FormWizardExample';
export { DashboardExampleUsage } from './dashboard-creator/DashboardExample';
export { ChatExampleUsage } from './chat-interface/ChatExample';
/**
 * Example configurations for different use cases
 */
export declare const ExampleConfigs: {
    /**
     * Production-ready configuration
     */
    production: {
        formWizard: {
            enablePersistence: boolean;
            theme: "modern";
        };
        dashboard: {
            enableCollaboration: boolean;
            enableRealtime: boolean;
            theme: "light";
            enableAISuggestions: boolean;
        };
        chat: {
            enableGenerativeUI: boolean;
            enableToolVisualization: boolean;
            enableRealTimeStreaming: boolean;
            enableOptimisticUpdates: boolean;
            theme: "light";
        };
    };
    /**
     * Development configuration with debugging
     */
    development: {
        formWizard: {
            enablePersistence: boolean;
            theme: "modern";
        };
        dashboard: {
            enableCollaboration: boolean;
            enableRealtime: boolean;
            theme: "light";
            enableAISuggestions: boolean;
        };
        chat: {
            enableGenerativeUI: boolean;
            enableToolVisualization: boolean;
            enableRealTimeStreaming: boolean;
            enableOptimisticUpdates: boolean;
            theme: "light";
        };
    };
    /**
     * Demo configuration for showcasing features
     */
    demo: {
        formWizard: {
            enablePersistence: boolean;
            theme: "modern";
        };
        dashboard: {
            enableCollaboration: boolean;
            enableRealtime: boolean;
            theme: "light";
            enableAISuggestions: boolean;
        };
        chat: {
            enableGenerativeUI: boolean;
            enableToolVisualization: boolean;
            enableRealTimeStreaming: boolean;
            enableOptimisticUpdates: boolean;
            theme: "light";
        };
    };
};
/**
 * Example prompts for different scenarios
 */
export declare const ExamplePrompts: {
    formWizard: string[];
    dashboard: string[];
    chat: string[];
};
/**
 * Helper function to get recommended configuration based on environment
 */
export declare function getRecommendedConfig(environment?: 'production' | 'development' | 'demo'): {
    formWizard: {
        enablePersistence: boolean;
        theme: "modern";
    };
    dashboard: {
        enableCollaboration: boolean;
        enableRealtime: boolean;
        theme: "light";
        enableAISuggestions: boolean;
    };
    chat: {
        enableGenerativeUI: boolean;
        enableToolVisualization: boolean;
        enableRealTimeStreaming: boolean;
        enableOptimisticUpdates: boolean;
        theme: "light";
    };
} | {
    formWizard: {
        enablePersistence: boolean;
        theme: "modern";
    };
    dashboard: {
        enableCollaboration: boolean;
        enableRealtime: boolean;
        theme: "light";
        enableAISuggestions: boolean;
    };
    chat: {
        enableGenerativeUI: boolean;
        enableToolVisualization: boolean;
        enableRealTimeStreaming: boolean;
        enableOptimisticUpdates: boolean;
        theme: "light";
    };
} | {
    formWizard: {
        enablePersistence: boolean;
        theme: "modern";
    };
    dashboard: {
        enableCollaboration: boolean;
        enableRealtime: boolean;
        theme: "light";
        enableAISuggestions: boolean;
    };
    chat: {
        enableGenerativeUI: boolean;
        enableToolVisualization: boolean;
        enableRealTimeStreaming: boolean;
        enableOptimisticUpdates: boolean;
        theme: "light";
    };
};
/**
 * Helper function to get random example prompt
 */
export declare function getRandomPrompt(exampleType: keyof typeof ExamplePrompts): string;
//# sourceMappingURL=index.d.ts.map