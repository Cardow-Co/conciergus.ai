import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ConciergusMetadataDisplay from './ConciergusMetadataDisplay';
import type { TelemetryManager } from '../context/EnhancedConciergusContext';

// Mock telemetry manager
const mockTelemetryManager: TelemetryManager = {
  track: jest.fn(),
  getUsageStats: jest.fn(() => ({
    totalTokens: 1500,
    totalCost: 0.0045,
    requestCount: 5,
    averageLatency: 850,
  })),
  getModelMetrics: jest.fn(() => ({
    averageLatency: 750,
    successRate: 0.96,
    tokenUsage: 1200,
    cost: 0.0035,
  })),
  setEnabled: jest.fn(),
};

describe('ConciergusMetadataDisplay', () => {
  it('renders without telemetry manager', () => {
    render(<ConciergusMetadataDisplay />);
    expect(screen.getByText('📊 Telemetry data unavailable')).toBeInTheDocument();
  });

  it('renders with telemetry data', () => {
    render(<ConciergusMetadataDisplay telemetryManager={mockTelemetryManager} />);
    
    // Check for usage stats
    expect(screen.getByText('5')).toBeInTheDocument(); // request count
    expect(screen.getByText('2K')).toBeInTheDocument(); // tokens formatted (1500 with 0 decimals = 2K)
    expect(screen.getByText('850ms')).toBeInTheDocument(); // latency
    
    // Check for cost
    expect(screen.getByText('$0.0045')).toBeInTheDocument();
    
    // Check for success rate
    expect(screen.getByText('96.0%')).toBeInTheDocument();
  });

  it('renders in compact mode', () => {
    render(
      <ConciergusMetadataDisplay 
        telemetryManager={mockTelemetryManager} 
        compact={true}
      />
    );
    
    // Should not show section titles in compact mode
    expect(screen.queryByText('Usage')).toBeNull();
    expect(screen.queryByText('Cost')).toBeNull();
    
    // But should still show the data
    expect(screen.getByText('5')).toBeDefined(); // request count
    expect(screen.getByText('2K')).toBeDefined(); // tokens
    expect(screen.getByText('$0.0045')).toBeDefined(); // cost
  });

  it('shows cost warning when threshold exceeded', () => {
    const highCostTelemetry: TelemetryManager = {
      ...mockTelemetryManager,
      getUsageStats: jest.fn(() => ({
        totalTokens: 15000,
        totalCost: 1.5, // Above default threshold of 1.0
        requestCount: 50,
        averageLatency: 850,
      })),
    };

    render(
      <ConciergusMetadataDisplay 
        telemetryManager={highCostTelemetry}
        costWarningThreshold={1.0}
      />
    );
    
    expect(screen.getByText('⚠️ Cost threshold reached')).toBeInTheDocument();
  });

  it('hides sections when disabled', () => {
    render(
      <ConciergusMetadataDisplay 
        telemetryManager={mockTelemetryManager}
        showUsageStats={false}
        showCostTracking={false}
        showPerformanceMetrics={false}
        showErrorRates={false}
      />
    );
    
    // Should only show header
    expect(screen.getByText('📊 Telemetry')).toBeDefined();
    
    // Should not show usage stats since showUsageStats=false
    expect(screen.queryByText('5')).toBeNull(); // request count
    expect(screen.queryByText('2K')).toBeNull(); // tokens
    expect(screen.queryByText('$0.0045')).toBeNull(); // cost
    expect(screen.queryByText('96.0%')).toBeNull(); // success rate
  });

  it('handles errors gracefully', () => {
    const errorTelemetry: TelemetryManager = {
      ...mockTelemetryManager,
      getUsageStats: jest.fn(() => {
        throw new Error('Network error');
      }),
    };

    render(<ConciergusMetadataDisplay telemetryManager={errorTelemetry} />);
    
    expect(screen.getByText(/Error loading telemetry/)).toBeInTheDocument();
    expect(screen.getByText(/Network error/)).toBeInTheDocument();
  });
}); 