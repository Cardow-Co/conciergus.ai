import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useCallback } from 'react';
import { generateDynamicForm } from '../../src/actions/streamActions';
import { useConciergusState } from '../../src/components/ConciergusStateProvider';
import { ConciergusStreamUI } from '../../src/components/ConciergusStreamUI';
export function FormWizardExample({ initialPrompt = "Create a comprehensive user registration form", theme = 'modern', onComplete, onStepChange, enablePersistence = true, customSteps }) {
    const [currentStep, setCurrentStep] = useState(0);
    const [formData, setFormData] = useState({});
    const [wizardSteps, setWizardSteps] = useState(customSteps || []);
    const [isGeneratingSteps, setIsGeneratingSteps] = useState(false);
    const [errors, setErrors] = useState({});
    // Access our enhanced state management
    const { addMessageWithOptimism, exportState, importState, config: stateConfig } = useConciergusState();
    /**
     * Generate wizard steps using AI
     */
    const generateWizardSteps = useCallback(async () => {
        if (customSteps)
            return; // Skip if custom steps provided
        setIsGeneratingSteps(true);
        try {
            // Use our state management for optimistic updates
            await addMessageWithOptimism({
                id: `wizard-${Date.now()}`,
                role: 'user',
                content: `Generate wizard steps for: ${initialPrompt}`,
                timestamp: new Date()
            }, async () => {
                // Simulate AI-generated wizard steps
                const steps = [
                    {
                        id: 'personal-info',
                        title: 'Personal Information',
                        description: 'Let\'s start with your basic information',
                        fields: [
                            { name: 'firstName', type: 'text', label: 'First Name', required: true },
                            { name: 'lastName', type: 'text', label: 'Last Name', required: true },
                            { name: 'email', type: 'email', label: 'Email Address', required: true },
                            { name: 'phone', type: 'text', label: 'Phone Number' }
                        ],
                        nextStepLogic: (data) => data.email ? 'preferences' : null
                    },
                    {
                        id: 'preferences',
                        title: 'Preferences',
                        description: 'Tell us about your preferences',
                        fields: [
                            {
                                name: 'interests',
                                type: 'select',
                                label: 'Primary Interest',
                                options: ['Technology', 'Business', 'Design', 'Marketing'],
                                required: true
                            },
                            {
                                name: 'experience',
                                type: 'select',
                                label: 'Experience Level',
                                options: ['Beginner', 'Intermediate', 'Advanced'],
                                required: true
                            },
                            {
                                name: 'newsletter',
                                type: 'checkbox',
                                label: 'Subscribe to newsletter'
                            }
                        ],
                        nextStepLogic: (data) => data.interests === 'Technology' ? 'technical' : 'general'
                    },
                    {
                        id: 'technical',
                        title: 'Technical Details',
                        description: 'Additional technical information',
                        fields: [
                            {
                                name: 'programmingLanguages',
                                type: 'select',
                                label: 'Preferred Programming Language',
                                options: ['JavaScript', 'Python', 'Java', 'C++', 'Other']
                            },
                            {
                                name: 'frameworks',
                                type: 'textarea',
                                label: 'Frameworks you\'ve used'
                            }
                        ],
                        conditional: {
                            dependsOn: 'interests',
                            value: 'Technology'
                        }
                    },
                    {
                        id: 'general',
                        title: 'Additional Information',
                        description: 'Any additional details',
                        fields: [
                            {
                                name: 'comments',
                                type: 'textarea',
                                label: 'Additional Comments'
                            },
                            {
                                name: 'referral',
                                type: 'text',
                                label: 'How did you hear about us?'
                            }
                        ]
                    }
                ];
                setWizardSteps(steps);
                return steps;
            });
        }
        catch (error) {
            console.error('Failed to generate wizard steps:', error);
            // Fallback to basic steps
            setWizardSteps([
                {
                    id: 'basic',
                    title: 'Basic Information',
                    description: 'Please provide your basic information',
                    fields: [
                        { name: 'name', type: 'text', label: 'Name', required: true },
                        { name: 'email', type: 'email', label: 'Email', required: true }
                    ]
                }
            ]);
        }
        finally {
            setIsGeneratingSteps(false);
        }
    }, [initialPrompt, customSteps, addMessageWithOptimism]);
    /**
     * Validate current step
     */
    const validateStep = useCallback((stepData) => {
        const step = wizardSteps[currentStep];
        if (!step)
            return {};
        const stepErrors = {};
        step.fields.forEach(field => {
            if (field.required && !stepData[field.name]) {
                stepErrors[field.name] = `${field.label} is required`;
            }
            if (field.type === 'email' && stepData[field.name]) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(stepData[field.name])) {
                    stepErrors[field.name] = 'Please enter a valid email address';
                }
            }
            // Custom validation
            if (field.validation && stepData[field.name]) {
                try {
                    const validationRegex = new RegExp(field.validation);
                    if (!validationRegex.test(stepData[field.name])) {
                        stepErrors[field.name] = `${field.label} format is invalid`;
                    }
                }
                catch (e) {
                    console.warn('Invalid validation regex:', field.validation);
                }
            }
        });
        return stepErrors;
    }, [wizardSteps, currentStep]);
    /**
     * Handle step progression
     */
    const nextStep = useCallback(() => {
        const currentStepData = { ...formData };
        const stepErrors = validateStep(currentStepData);
        if (Object.keys(stepErrors).length > 0) {
            setErrors(stepErrors);
            return;
        }
        setErrors({});
        const step = wizardSteps[currentStep];
        let nextStepIndex = currentStep + 1;
        // Apply next step logic
        if (step?.nextStepLogic) {
            const nextStepId = step.nextStepLogic(currentStepData);
            if (nextStepId) {
                const nextIndex = wizardSteps.findIndex(s => s.id === nextStepId);
                if (nextIndex !== -1) {
                    nextStepIndex = nextIndex;
                }
            }
        }
        if (nextStepIndex < wizardSteps.length) {
            setCurrentStep(nextStepIndex);
            onStepChange?.(nextStepIndex, currentStepData);
        }
        else {
            // Form completed
            onComplete?.(currentStepData);
        }
    }, [formData, currentStep, wizardSteps, validateStep, onStepChange, onComplete]);
    /**
     * Handle previous step
     */
    const previousStep = useCallback(() => {
        if (currentStep > 0) {
            const newStep = currentStep - 1;
            setCurrentStep(newStep);
            setErrors({});
            onStepChange?.(newStep, formData);
        }
    }, [currentStep, formData, onStepChange]);
    /**
     * Update form data
     */
    const updateFormData = useCallback((field, value) => {
        setFormData(prev => {
            const updated = { ...prev, [field]: value };
            // Persist state if enabled
            if (enablePersistence && stateConfig.enablePersistence) {
                // Store in our state management system
                localStorage.setItem('wizard-form-data', JSON.stringify(updated));
            }
            return updated;
        });
        // Clear field error if it exists
        if (errors[field]) {
            setErrors(prev => {
                const { [field]: removed, ...rest } = prev;
                return rest;
            });
        }
    }, [enablePersistence, stateConfig.enablePersistence, errors]);
    /**
     * Load persisted form data
     */
    React.useEffect(() => {
        if (enablePersistence) {
            try {
                const saved = localStorage.getItem('wizard-form-data');
                if (saved) {
                    setFormData(JSON.parse(saved));
                }
            }
            catch (error) {
                console.warn('Failed to load persisted form data:', error);
            }
        }
    }, [enablePersistence]);
    /**
     * Generate initial steps on mount
     */
    React.useEffect(() => {
        generateWizardSteps();
    }, [generateWizardSteps]);
    // Show loading state while generating steps
    if (isGeneratingSteps) {
        return (_jsx("div", { className: "max-w-2xl mx-auto p-8", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" }), _jsx("h3", { className: "text-lg font-semibold text-gray-900 mb-2", children: "Generating Form Wizard" }), _jsx("p", { className: "text-gray-600", children: "Creating a personalized form based on your requirements..." })] }) }));
    }
    if (wizardSteps.length === 0) {
        return (_jsx("div", { className: "max-w-2xl mx-auto p-8", children: _jsxs("div", { className: "text-center text-red-600", children: [_jsx("h3", { className: "text-lg font-semibold mb-2", children: "Unable to Generate Form" }), _jsx("p", { children: "Please try again or provide custom steps." })] }) }));
    }
    const currentStepData = wizardSteps[currentStep];
    const progress = ((currentStep + 1) / wizardSteps.length) * 100;
    return (_jsxs("div", { className: "max-w-2xl mx-auto p-8", children: [_jsxs("div", { className: "mb-8", children: [_jsxs("div", { className: "flex justify-between text-sm text-gray-600 mb-2", children: [_jsxs("span", { children: ["Step ", currentStep + 1, " of ", wizardSteps.length] }), _jsxs("span", { children: [Math.round(progress), "% Complete"] })] }), _jsx("div", { className: "w-full bg-gray-200 rounded-full h-2", children: _jsx("div", { className: "bg-blue-600 h-2 rounded-full transition-all duration-300", style: { width: `${progress}%` } }) })] }), _jsxs("div", { className: "bg-white rounded-xl shadow-lg p-8", children: [_jsxs("div", { className: "mb-6", children: [_jsx("h2", { className: "text-2xl font-bold text-gray-900 mb-2", children: currentStepData.title }), _jsx("p", { className: "text-gray-600", children: currentStepData.description })] }), _jsx(ConciergusStreamUI, { action: async () => {
                            return await generateDynamicForm({
                                fields: currentStepData.fields,
                                values: formData,
                                theme,
                                onFieldChange: updateFormData,
                                errors
                            });
                        }, loadingComponent: _jsx("div", { className: "space-y-4", children: currentStepData.fields.map((field, index) => (_jsxs("div", { className: "animate-pulse", children: [_jsx("div", { className: "h-4 bg-gray-200 rounded w-1/4 mb-2" }), _jsx("div", { className: "h-10 bg-gray-200 rounded" })] }, index))) }), errorComponent: (error) => (_jsxs("div", { className: "p-4 bg-red-50 border border-red-200 rounded-lg text-red-700", children: [_jsx("h4", { className: "font-semibold mb-2", children: "Form Generation Error" }), _jsx("p", { className: "text-sm", children: error.message })] })) }), _jsxs("div", { className: "flex justify-between mt-8", children: [_jsx("button", { onClick: previousStep, disabled: currentStep === 0, className: "px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors", children: "Previous" }), _jsx("button", { onClick: nextStep, className: "px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors", children: currentStep === wizardSteps.length - 1 ? 'Complete' : 'Next' })] })] }), process.env.NODE_ENV === 'development' && (_jsxs("div", { className: "mt-8 p-4 bg-gray-100 rounded-lg", children: [_jsx("h4", { className: "font-semibold mb-2", children: "Debug Info" }), _jsxs("details", { children: [_jsx("summary", { className: "cursor-pointer text-sm text-gray-600", children: "Current Form Data" }), _jsx("pre", { className: "mt-2 text-xs overflow-auto", children: JSON.stringify(formData, null, 2) })] }), _jsxs("details", { className: "mt-2", children: [_jsx("summary", { className: "cursor-pointer text-sm text-gray-600", children: "State Management Status" }), _jsx("pre", { className: "mt-2 text-xs overflow-auto", children: JSON.stringify(exportState(), null, 2) })] })] }))] }));
}
/**
 * Example usage component
 */
export function FormWizardExampleUsage() {
    return (_jsx("div", { className: "min-h-screen bg-gray-50 py-12", children: _jsxs("div", { className: "max-w-4xl mx-auto px-4", children: [_jsxs("div", { className: "text-center mb-12", children: [_jsx("h1", { className: "text-4xl font-bold text-gray-900 mb-4", children: "Dynamic Form Wizard Example" }), _jsx("p", { className: "text-xl text-gray-600", children: "Demonstrating AI-powered form generation with React Server Components" })] }), _jsx(FormWizardExample, { initialPrompt: "Create a comprehensive user onboarding form with conditional logic", theme: "modern", enablePersistence: true, onComplete: (data) => {
                        console.log('Form completed with data:', data);
                        alert('Form completed! Check console for details.');
                    }, onStepChange: (step, data) => {
                        console.log(`Step ${step} completed with:`, data);
                    } })] }) }));
}
//# sourceMappingURL=FormWizardExample.js.map