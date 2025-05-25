/**
 * Form wizard step configuration
 */
export interface WizardStep {
    id: string;
    title: string;
    description: string;
    fields: Array<{
        name: string;
        type: 'text' | 'email' | 'number' | 'select' | 'textarea' | 'checkbox';
        label: string;
        required?: boolean;
        options?: string[];
        validation?: string;
        conditional?: {
            dependsOn: string;
            value: any;
        };
    }>;
    nextStepLogic?: (data: any) => string | null;
}
/**
 * Dynamic Form Wizard Example
 *
 * This example demonstrates:
 * - Multi-step wizard forms with conditional logic
 * - AI-powered form generation and validation
 * - State persistence across steps
 * - Real-time field generation based on user input
 * - Integration with our enhanced state management
 *
 * @example
 * ```tsx
 * <FormWizardExample
 *   initialPrompt="Create a user onboarding form"
 *   onComplete={(data) => console.log('Form completed:', data)}
 * />
 * ```
 */
export interface FormWizardExampleProps {
    /** Initial prompt for form generation */
    initialPrompt?: string;
    /** Theme for the form wizard */
    theme?: 'default' | 'modern' | 'minimal';
    /** Callback when form is completed */
    onComplete?: (data: any) => void;
    /** Callback for step changes */
    onStepChange?: (step: number, data: any) => void;
    /** Enable state persistence */
    enablePersistence?: boolean;
    /** Custom wizard steps (if not using AI generation) */
    customSteps?: WizardStep[];
}
export declare function FormWizardExample({ initialPrompt, theme, onComplete, onStepChange, enablePersistence, customSteps }: FormWizardExampleProps): import("react/jsx-runtime").JSX.Element;
/**
 * Example usage component
 */
export declare function FormWizardExampleUsage(): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=FormWizardExample.d.ts.map