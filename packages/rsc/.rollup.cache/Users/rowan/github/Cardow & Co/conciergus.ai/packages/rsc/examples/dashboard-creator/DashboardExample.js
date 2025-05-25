import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useCallback, useRef, useEffect } from 'react';
import { generateDashboard } from '../../src/actions/streamActions';
import { useConciergusState } from '../../src/components/ConciergusStateProvider';
import { ConciergusStreamUI } from '../../src/components/ConciergusStreamUI';
import { useRealtimeStream } from '../../src/hooks/useStreamableUI';
export function DashboardExample({ initialPrompt = "Create a comprehensive analytics dashboard", enableCollaboration = false, enableRealtime = true, theme = 'light', onSave, onWidgetUpdate, initialLayout, enableAISuggestions = true }) {
    const [dashboard, setDashboard] = useState(initialLayout || {
        id: `dashboard-${Date.now()}`,
        name: 'New Dashboard',
        widgets: [],
        settings: {
            theme,
            refreshInterval: 30000,
            gridSize: 20,
            enableCollaboration,
            allowPublicView: false
        },
        metadata: {
            createdAt: new Date(),
            updatedAt: new Date()
        }
    });
    const [selectedWidget, setSelectedWidget] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [draggedWidget, setDraggedWidget] = useState(null);
    const [showWidgetPanel, setShowWidgetPanel] = useState(false);
    const [aiSuggestions, setAISuggestions] = useState([]);
    // Refs for drag and drop
    const dashboardRef = useRef(null);
    const dragOffset = useRef({ x: 0, y: 0 });
    // Access our enhanced state management
    const { addMessageWithOptimism, forceSync, getDebugReport, config: stateConfig } = useConciergusState();
    // Real-time updates for collaborative editing
    const realtimeStream = useRealtimeStream({
        onUpdate: (data) => {
            if (data.type === 'dashboard-update' && enableCollaboration) {
                setDashboard(prev => ({ ...prev, ...data.dashboard }));
            }
        },
        onError: (error) => {
            console.error('Real-time update error:', error);
        }
    });
    /**
     * Generate dashboard using AI
     */
    const generateAIDashboard = useCallback(async () => {
        setIsGenerating(true);
        try {
            await addMessageWithOptimism({
                id: `dashboard-${Date.now()}`,
                role: 'user',
                content: `Generate dashboard for: ${initialPrompt}`,
                timestamp: new Date()
            }, async () => {
                // Simulate AI-generated dashboard widgets
                const generatedWidgets = [
                    {
                        id: 'widget-1',
                        type: 'metric',
                        title: 'Total Revenue',
                        position: { x: 0, y: 0, width: 300, height: 150 },
                        data: { value: '$125,430', change: '+12.5%', trend: 'up' },
                        config: { color: '#10b981', theme }
                    },
                    {
                        id: 'widget-2',
                        type: 'chart',
                        title: 'Sales Trend',
                        position: { x: 320, y: 0, width: 500, height: 300 },
                        data: {
                            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                            datasets: [
                                {
                                    label: 'Sales',
                                    data: [12000, 19000, 15000, 25000, 22000, 30000],
                                    borderColor: '#3b82f6',
                                    backgroundColor: 'rgba(59, 130, 246, 0.1)'
                                }
                            ]
                        },
                        config: { chartType: 'line', color: '#3b82f6', theme }
                    },
                    {
                        id: 'widget-3',
                        type: 'table',
                        title: 'Top Products',
                        position: { x: 0, y: 170, width: 300, height: 250 },
                        data: {
                            headers: ['Product', 'Sales', 'Change'],
                            rows: [
                                ['Product A', '$45,230', '+8.2%'],
                                ['Product B', '$32,100', '+5.1%'],
                                ['Product C', '$28,900', '-2.3%'],
                                ['Product D', '$21,500', '+15.7%']
                            ]
                        },
                        config: { theme }
                    },
                    {
                        id: 'widget-4',
                        type: 'chart',
                        title: 'Customer Segments',
                        position: { x: 320, y: 320, width: 250, height: 250 },
                        data: {
                            labels: ['Enterprise', 'SMB', 'Individual'],
                            datasets: [{
                                    data: [45, 35, 20],
                                    backgroundColor: ['#8b5cf6', '#06b6d4', '#f59e0b']
                                }]
                        },
                        config: { chartType: 'pie', theme }
                    }
                ];
                setDashboard(prev => ({
                    ...prev,
                    widgets: generatedWidgets,
                    metadata: {
                        ...prev.metadata,
                        updatedAt: new Date()
                    }
                }));
                return generatedWidgets;
            });
        }
        catch (error) {
            console.error('Failed to generate dashboard:', error);
        }
        finally {
            setIsGenerating(false);
        }
    }, [initialPrompt, theme, addMessageWithOptimism]);
    /**
     * Update widget position
     */
    const updateWidgetPosition = useCallback((widgetId, position) => {
        setDashboard(prev => ({
            ...prev,
            widgets: prev.widgets.map(w => w.id === widgetId ? { ...w, position } : w),
            metadata: {
                ...prev.metadata,
                updatedAt: new Date()
            }
        }));
        // Sync with real-time collaboration
        if (enableCollaboration) {
            realtimeStream.send({
                type: 'widget-position-update',
                widgetId,
                position
            });
        }
    }, [enableCollaboration, realtimeStream]);
    /**
     * Add new widget
     */
    const addWidget = useCallback(async (type) => {
        const newWidget = {
            id: `widget-${Date.now()}`,
            type,
            title: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
            position: {
                x: Math.random() * 300,
                y: Math.random() * 200,
                width: 300,
                height: 200
            },
            config: { theme: dashboard.settings.theme }
        };
        // Generate widget content using AI
        setIsGenerating(true);
        try {
            const generatedContent = await generateDashboard({
                widgetType: type,
                context: initialPrompt,
                existingWidgets: dashboard.widgets
            });
            newWidget.data = generatedContent.data;
            newWidget.config = { ...newWidget.config, ...generatedContent.config };
        }
        catch (error) {
            console.error('Failed to generate widget content:', error);
        }
        finally {
            setIsGenerating(false);
        }
        setDashboard(prev => ({
            ...prev,
            widgets: [...prev.widgets, newWidget],
            metadata: {
                ...prev.metadata,
                updatedAt: new Date()
            }
        }));
        onWidgetUpdate?.(newWidget);
    }, [dashboard.widgets, dashboard.settings.theme, initialPrompt, onWidgetUpdate]);
    /**
     * Delete widget
     */
    const deleteWidget = useCallback((widgetId) => {
        setDashboard(prev => ({
            ...prev,
            widgets: prev.widgets.filter(w => w.id !== widgetId),
            metadata: {
                ...prev.metadata,
                updatedAt: new Date()
            }
        }));
        if (selectedWidget === widgetId) {
            setSelectedWidget(null);
        }
    }, [selectedWidget]);
    /**
     * Handle drag start
     */
    const handleDragStart = useCallback((widget, event) => {
        setDraggedWidget(widget);
        const rect = event.currentTarget.getBoundingClientRect();
        dragOffset.current = {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };
        setSelectedWidget(widget.id);
    }, []);
    /**
     * Handle drag end
     */
    const handleDragEnd = useCallback((event) => {
        if (draggedWidget && dashboardRef.current) {
            const dashboardRect = dashboardRef.current.getBoundingClientRect();
            const newPosition = {
                x: Math.max(0, event.clientX - dashboardRect.left - dragOffset.current.x),
                y: Math.max(0, event.clientY - dashboardRect.top - dragOffset.current.y),
                width: draggedWidget.position.width,
                height: draggedWidget.position.height
            };
            updateWidgetPosition(draggedWidget.id, newPosition);
        }
        setDraggedWidget(null);
    }, [draggedWidget, updateWidgetPosition]);
    /**
     * Generate AI suggestions
     */
    const generateAISuggestions = useCallback(async () => {
        if (!enableAISuggestions)
            return;
        try {
            // Simulate AI suggestions based on current dashboard
            const suggestions = [
                "Add a conversion funnel chart to track user journey",
                "Include a geographic heat map for regional performance",
                "Add real-time notifications for important metrics",
                "Create a comparative analysis widget for period-over-period data"
            ];
            setAISuggestions(suggestions);
        }
        catch (error) {
            console.error('Failed to generate AI suggestions:', error);
        }
    }, [enableAISuggestions]);
    /**
     * Save dashboard
     */
    const saveDashboard = useCallback(async () => {
        try {
            // Sync state
            if (stateConfig.enableSync) {
                await forceSync();
            }
            onSave?.(dashboard);
            // Show success message
            console.log('Dashboard saved successfully');
        }
        catch (error) {
            console.error('Failed to save dashboard:', error);
        }
    }, [dashboard, onSave, forceSync, stateConfig.enableSync]);
    /**
     * Generate initial dashboard on mount
     */
    useEffect(() => {
        if (!initialLayout && dashboard.widgets.length === 0) {
            generateAIDashboard();
        }
    }, [generateAIDashboard, initialLayout, dashboard.widgets.length]);
    /**
     * Generate AI suggestions when widgets change
     */
    useEffect(() => {
        if (dashboard.widgets.length > 0) {
            generateAISuggestions();
        }
    }, [dashboard.widgets, generateAISuggestions]);
    // Render widget component
    const renderWidget = (widget) => {
        const isSelected = selectedWidget === widget.id;
        const isDragging = draggedWidget?.id === widget.id;
        return (_jsxs("div", { className: `absolute bg-white dark:bg-gray-800 rounded-lg shadow-lg border-2 transition-all duration-200 ${isSelected ? 'border-blue-500 shadow-xl' : 'border-gray-200 dark:border-gray-700'} ${isDragging ? 'opacity-50 scale-105' : 'opacity-100'}`, style: {
                left: widget.position.x,
                top: widget.position.y,
                width: widget.position.width,
                height: widget.position.height,
                cursor: isDragging ? 'grabbing' : 'grab'
            }, onMouseDown: (e) => handleDragStart(widget, e), onClick: () => setSelectedWidget(widget.id), children: [_jsxs("div", { className: "flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700", children: [_jsx("h3", { className: "font-semibold text-gray-900 dark:text-white truncate", children: widget.title }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-300", children: widget.type }), _jsx("button", { onClick: (e) => {
                                        e.stopPropagation();
                                        deleteWidget(widget.id);
                                    }, className: "text-gray-400 hover:text-red-500 transition-colors", children: _jsx("svg", { className: "w-4 h-4", fill: "currentColor", viewBox: "0 0 20 20", children: _jsx("path", { fillRule: "evenodd", d: "M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z", clipRule: "evenodd" }) }) })] })] }), _jsx("div", { className: "p-4 h-full overflow-auto", children: _jsx(ConciergusStreamUI, { action: async () => {
                            return await generateDashboard({
                                widgetType: widget.type,
                                data: widget.data,
                                config: widget.config
                            });
                        }, loadingComponent: _jsx("div", { className: "flex items-center justify-center h-full", children: _jsx("div", { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" }) }), errorComponent: (error) => (_jsxs("div", { className: "flex items-center justify-center h-full text-red-500 text-sm", children: ["Failed to load widget: ", error.message] })) }) })] }, widget.id));
    };
    return (_jsxs("div", { className: "min-h-screen bg-gray-50 dark:bg-gray-900", children: [_jsx("div", { className: "bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700", children: _jsx("div", { className: "max-w-7xl mx-auto px-4 py-4", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900 dark:text-white", children: dashboard.name }), _jsxs("p", { className: "text-gray-600 dark:text-gray-400", children: [dashboard.widgets.length, " widgets \u2022 Updated ", dashboard.metadata?.updatedAt.toLocaleTimeString()] })] }), _jsxs("div", { className: "flex items-center gap-4", children: [enableCollaboration && (_jsxs("div", { className: "flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400", children: [_jsx("div", { className: "w-2 h-2 bg-green-500 rounded-full" }), "Collaborative Mode"] })), _jsx("button", { onClick: () => setShowWidgetPanel(!showWidgetPanel), className: "px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors", children: "Add Widget" }), _jsx("button", { onClick: saveDashboard, className: "px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors", children: "Save" })] })] }) }) }), _jsxs("div", { className: "flex", children: [_jsx("div", { className: "flex-1 p-6", children: _jsxs("div", { ref: dashboardRef, className: "relative bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 min-h-[600px]", onMouseMove: (e) => {
                                if (draggedWidget) {
                                    // Visual feedback during drag
                                    const rect = dashboardRef.current?.getBoundingClientRect();
                                    if (rect) {
                                        const x = e.clientX - rect.left - dragOffset.current.x;
                                        const y = e.clientY - rect.top - dragOffset.current.y;
                                        // Update visual position in real-time
                                    }
                                }
                            }, onMouseUp: handleDragEnd, children: [isGenerating && dashboard.widgets.length === 0 && (_jsx("div", { className: "absolute inset-0 flex items-center justify-center", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" }), _jsx("h3", { className: "text-lg font-semibold text-gray-900 dark:text-white mb-2", children: "Generating Dashboard" }), _jsx("p", { className: "text-gray-600 dark:text-gray-400", children: "Creating widgets based on your requirements..." })] }) })), dashboard.widgets.map(renderWidget), dashboard.widgets.length === 0 && !isGenerating && (_jsx("div", { className: "absolute inset-0 flex items-center justify-center", children: _jsxs("div", { className: "text-center", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900 dark:text-white mb-2", children: "Empty Dashboard" }), _jsx("p", { className: "text-gray-600 dark:text-gray-400 mb-4", children: "Add widgets to get started with your dashboard" }), _jsx("button", { onClick: generateAIDashboard, className: "px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors", children: "Generate AI Dashboard" })] }) }))] }) }), showWidgetPanel && (_jsxs("div", { className: "w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 p-6", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900 dark:text-white mb-4", children: "Add Widgets" }), _jsx("div", { className: "space-y-3 mb-6", children: [
                                    { type: 'metric', label: 'Metric Card', icon: '📊' },
                                    { type: 'chart', label: 'Chart', icon: '📈' },
                                    { type: 'table', label: 'Data Table', icon: '📋' },
                                    { type: 'text', label: 'Text Widget', icon: '📝' },
                                    { type: 'map', label: 'Map View', icon: '🗺️' }
                                ].map(({ type, label, icon }) => (_jsxs("button", { onClick: () => addWidget(type), className: "w-full flex items-center gap-3 p-3 text-left border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors", disabled: isGenerating, children: [_jsx("span", { className: "text-xl", children: icon }), _jsx("span", { className: "font-medium text-gray-900 dark:text-white", children: label })] }, type))) }), enableAISuggestions && aiSuggestions.length > 0 && (_jsxs("div", { children: [_jsx("h4", { className: "text-md font-semibold text-gray-900 dark:text-white mb-3", children: "AI Suggestions" }), _jsx("div", { className: "space-y-2", children: aiSuggestions.map((suggestion, index) => (_jsxs("div", { className: "p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-800 dark:text-blue-200", children: ["\uD83D\uDCA1 ", suggestion] }, index))) })] }))] }))] }), process.env.NODE_ENV === 'development' && (_jsxs("div", { className: "fixed bottom-4 right-4 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4", children: [_jsx("h4", { className: "font-semibold mb-2", children: "Dashboard Debug" }), _jsxs("details", { children: [_jsx("summary", { className: "cursor-pointer text-sm text-gray-600 dark:text-gray-400", children: "Dashboard State" }), _jsx("pre", { className: "mt-2 text-xs overflow-auto max-h-40", children: JSON.stringify(dashboard, null, 2) })] })] }))] }));
}
/**
 * Example usage component
 */
export function DashboardExampleUsage() {
    return (_jsx(DashboardExample, { initialPrompt: "Create a comprehensive business analytics dashboard", enableCollaboration: true, enableRealtime: true, theme: "light", enableAISuggestions: true, onSave: (dashboard) => {
            console.log('Dashboard saved:', dashboard);
            alert('Dashboard saved successfully!');
        }, onWidgetUpdate: (widget) => {
            console.log('Widget updated:', widget);
        } }));
}
//# sourceMappingURL=DashboardExample.js.map