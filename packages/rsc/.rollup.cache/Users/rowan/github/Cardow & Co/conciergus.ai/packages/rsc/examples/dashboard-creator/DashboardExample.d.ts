/**
 * Dashboard widget configuration
 */
export interface DashboardWidget {
    id: string;
    type: 'chart' | 'metric' | 'table' | 'text' | 'image' | 'map';
    title: string;
    position: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    data?: any;
    config?: {
        chartType?: 'line' | 'bar' | 'pie' | 'area';
        color?: string;
        theme?: 'light' | 'dark';
        refreshInterval?: number;
    };
    dataSource?: {
        type: 'api' | 'static' | 'realtime';
        url?: string;
        params?: Record<string, any>;
    };
}
/**
 * Dashboard layout configuration
 */
export interface DashboardLayout {
    id: string;
    name: string;
    description?: string;
    widgets: DashboardWidget[];
    settings: {
        theme: 'light' | 'dark' | 'auto';
        refreshInterval: number;
        gridSize: number;
        enableCollaboration?: boolean;
        allowPublicView?: boolean;
    };
    metadata?: {
        createdAt: Date;
        updatedAt: Date;
        createdBy?: string;
        collaborators?: string[];
    };
}
/**
 * Interactive Dashboard Creator Example
 *
 * This example demonstrates:
 * - Real-time data visualization generation
 * - Drag-and-drop widget arrangement
 * - Collaborative dashboard editing
 * - Performance optimized streaming updates
 * - AI-powered widget suggestions
 * - Real-time data updates
 *
 * @example
 * ```tsx
 * <DashboardExample
 *   initialPrompt="Create a sales performance dashboard"
 *   enableCollaboration={true}
 *   onSave={(dashboard) => console.log('Dashboard saved:', dashboard)}
 * />
 * ```
 */
export interface DashboardExampleProps {
    /** Initial prompt for dashboard generation */
    initialPrompt?: string;
    /** Enable collaborative editing */
    enableCollaboration?: boolean;
    /** Enable real-time data updates */
    enableRealtime?: boolean;
    /** Dashboard theme */
    theme?: 'light' | 'dark' | 'auto';
    /** Callback when dashboard is saved */
    onSave?: (dashboard: DashboardLayout) => void;
    /** Callback when widget is updated */
    onWidgetUpdate?: (widget: DashboardWidget) => void;
    /** Initial dashboard layout */
    initialLayout?: DashboardLayout;
    /** Enable AI suggestions */
    enableAISuggestions?: boolean;
}
export declare function DashboardExample({ initialPrompt, enableCollaboration, enableRealtime, theme, onSave, onWidgetUpdate, initialLayout, enableAISuggestions }: DashboardExampleProps): import("react/jsx-runtime").JSX.Element;
/**
 * Example usage component
 */
export declare function DashboardExampleUsage(): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=DashboardExample.d.ts.map