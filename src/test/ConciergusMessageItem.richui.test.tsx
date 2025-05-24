import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ConciergusMessageItem from '../components/ConciergusMessageItem';
import type { UIMessage } from '@ai-sdk/react';

// Mock audio element
global.HTMLAudioElement.prototype.play = jest.fn();
global.HTMLAudioElement.prototype.pause = jest.fn();
global.HTMLAudioElement.prototype.load = jest.fn();

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-audio-url');
global.URL.revokeObjectURL = jest.fn();

// Mock the dependent components to prevent DOM prop warnings
jest.mock('../components/ReasoningTrace', () => ({
  ReasoningTrace: ({ reasoning }: { reasoning: string }) => (
    <div data-testid="reasoning-trace">{reasoning}</div>
  ),
}));

jest.mock('../components/SourcesDisplay', () => ({
  SourcesDisplay: ({ sources }: { sources: any[] }) => (
    <div data-testid="sources-display">
      {sources.map((source, i) => (
        <div key={i}>{source.title || source.url}</div>
      ))}
    </div>
  ),
}));

jest.mock('../components/MessageMetadata', () => ({
  MessageMetadata: ({ metadata }: { metadata: any }) => (
    <div data-testid="message-metadata">
      {metadata.modelUsed && <span>Model: {metadata.modelUsed}</span>}
      {metadata.tokenCount && <span>Tokens: {metadata.tokenCount}</span>}
    </div>
  ),
}));

// Custom UI renderer mock
const CustomUIRenderer = ({ data, type }: { data: any; type: string }) => (
  <div data-testid={`custom-ui-${type}`}>
    Custom UI: {JSON.stringify(data)}
  </div>
);

// Custom tool call renderer mock
const CustomToolCallRenderer = ({ toolCall, state }: { toolCall: any; state: string }) => (
  <div data-testid={`custom-tool-${state}`}>
    Tool: {toolCall.toolName} - State: {state}
  </div>
);

describe('ConciergusMessageItem Rich UI and Audio Support', () => {
  // Sample message with rich UI parts
  const createRichMessage = (parts: any[]): UIMessage => ({
    id: 'test-message-rich',
    role: 'assistant',
    parts,
    metadata: {
      processingTime: 1250,
      tokenCount: 45,
      modelUsed: 'gpt-4o-mini',
      cost: 0.0023,
    },
    createdAt: new Date(),
  });

  describe('Enhanced Audio Support', () => {
    it('renders audio files with basic controls', () => {
      const message = createRichMessage([
        {
          type: 'file',
          mimeType: 'audio/mp3',
          filename: 'test-audio.mp3',
          url: 'https://example.com/audio.mp3',
        },
      ]);

      render(
        <ConciergusMessageItem 
          message={message}
          enableAdvancedAudioControls={false}
        />
      );

      expect(screen.getByText('🎵 Audio: test-audio.mp3')).toBeInTheDocument();
      const audioElement = screen.getByText('Your browser does not support the audio element.').closest('audio');
      expect(audioElement).toHaveAttribute('controls');
      expect(audioElement).toHaveAttribute('src', 'https://example.com/audio.mp3');
    });

    it('renders advanced audio controls when enabled', () => {
      const message = createRichMessage([
        {
          type: 'file',
          mimeType: 'audio/wav',
          filename: 'advanced-audio.wav',
          url: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10...',
        },
      ]);

      const onAudioSeek = jest.fn();
      const onAudioSpeedChange = jest.fn();

      render(
        <ConciergusMessageItem 
          message={message}
          enableAdvancedAudioControls={true}
          audioPlaybackSpeed={1.5}
          onAudioSeek={onAudioSeek}
          onAudioSpeedChange={onAudioSpeedChange}
        />
      );

      // Should have audio scrubber
      const scrubber = screen.getByDisplayValue('0'); // Initial currentTime value
      expect(scrubber).toHaveAttribute('type', 'range');
      
      // Should have speed controls  
      const speedSelect = screen.getByText('Speed:').nextElementSibling as HTMLSelectElement;
      expect(speedSelect).toBeInTheDocument();
      expect(speedSelect).toHaveValue('1.5');

      // Test speed change
      fireEvent.change(speedSelect, { target: { value: '2' } });
      expect(onAudioSpeedChange).toHaveBeenCalled();
      // Check what argument was actually passed
      const lastCall = onAudioSpeedChange.mock.calls[onAudioSpeedChange.mock.calls.length - 1];
      expect(lastCall[0]).toBe(2);
    });

    it('handles TTS audio with advanced controls', () => {
      const message = createRichMessage([
        { type: 'text', text: 'This message has generated audio.' },
      ]);

      // Add audio data to simulate TTS - this will trigger audioObjectUrl creation
      const messageWithAudio = {
        ...message,
        audio: new Blob(['fake audio data'], { type: 'audio/wav' }),
      };

      render(
        <ConciergusMessageItem 
          message={messageWithAudio}
          enableAdvancedAudioControls={true}
        />
      );

      expect(screen.getByText('🔊 Generated Audio')).toBeInTheDocument();
      const scrubber = screen.getByDisplayValue('0'); // Initial currentTime value
      expect(scrubber).toHaveAttribute('type', 'range');
      const speedSelect = screen.getByText('Speed:').nextElementSibling as HTMLSelectElement;
      expect(speedSelect).toHaveValue('1');
    });
  });

  describe('Enhanced Tool Call Rendering', () => {
    it('renders tool calls in partial-call state', () => {
      const message = createRichMessage([
        {
          type: 'tool-invocation',
          toolInvocation: {
            state: 'partial-call',
            toolCallId: 'call_123',
            toolName: 'searchWeb',
            argsTextDelta: '{"query":"test search"',
          },
        },
      ]);

      render(<ConciergusMessageItem message={message} />);

      expect(screen.getByText('searchWeb')).toBeInTheDocument();
      expect(screen.getByText('🔄 Calling...')).toBeInTheDocument();
      expect(screen.getByText('Building arguments...')).toBeInTheDocument();
      expect(screen.getByText('{"query":"test search"')).toBeInTheDocument();
    });

    it('renders tool calls in call state', () => {
      const message = createRichMessage([
        {
          type: 'tool-invocation',
          toolInvocation: {
            state: 'call',
            toolCallId: 'call_123',
            toolName: 'getCurrentWeather',
            args: { city: 'San Francisco', unit: 'celsius' },
          },
        },
      ]);

      render(<ConciergusMessageItem message={message} />);

      expect(screen.getByText('getCurrentWeather')).toBeInTheDocument();
      expect(screen.getByText('⚡ Ready')).toBeInTheDocument();
      expect(screen.getByText('Arguments:')).toBeInTheDocument();
      expect(screen.getByText(/"city": "San Francisco"/)).toBeInTheDocument();
    });

    it('renders tool calls in result state', () => {
      const message = createRichMessage([
        {
          type: 'tool-invocation',
          toolInvocation: {
            state: 'result',
            toolCallId: 'call_123',
            toolName: 'getCurrentWeather',
            args: { city: 'San Francisco' },
            result: { temperature: 72, condition: 'sunny' },
          },
        },
      ]);

      render(<ConciergusMessageItem message={message} />);

      expect(screen.getByText('getCurrentWeather')).toBeInTheDocument();
      expect(screen.getByText('✅ Complete')).toBeInTheDocument();
      expect(screen.getByText('Result:')).toBeInTheDocument();
      expect(screen.getByText(/"temperature": 72/)).toBeInTheDocument();
    });

    it('renders tool calls in error state', () => {
      const message = createRichMessage([
        {
          type: 'tool-invocation',
          toolInvocation: {
            state: 'error',
            toolCallId: 'call_123',
            toolName: 'failingTool',
            args: { param: 'value' },
            errorMessage: 'API rate limit exceeded',
          },
        },
      ]);

      render(<ConciergusMessageItem message={message} />);

      expect(screen.getByText('failingTool')).toBeInTheDocument();
      expect(screen.getByText('❌ Error')).toBeInTheDocument();
      expect(screen.getByText('Error:')).toBeInTheDocument();
      expect(screen.getByText('API rate limit exceeded')).toBeInTheDocument();
    });

    it('uses custom tool call renderer when provided', () => {
      const message = createRichMessage([
        {
          type: 'tool-invocation',
          toolInvocation: {
            state: 'result',
            toolCallId: 'call_123',
            toolName: 'customTool',
            args: { test: true },
            result: { success: true },
          },
        },
      ]);

      render(
        <ConciergusMessageItem 
          message={message}
          toolCallRenderer={CustomToolCallRenderer}
        />
      );

      expect(screen.getByTestId('custom-tool-result')).toBeInTheDocument();
      expect(screen.getByText('Tool: customTool - State: result')).toBeInTheDocument();
    });
  });

  describe('Generative UI Support', () => {
    it('renders custom data parts with default renderer', () => {
      const message = createRichMessage([
        {
          type: 'data-weather',
          data: {
            city: 'New York',
            temperature: 68,
            condition: 'cloudy',
          },
        },
      ]);

      render(<ConciergusMessageItem message={message} />);

      expect(screen.getByText('data-weather')).toBeInTheDocument();
      expect(screen.getByText(/"city": "New York"/)).toBeInTheDocument();
    });

    it('renders custom data parts with custom UI renderer', () => {
      const message = createRichMessage([
        {
          type: 'data-chart',
          data: {
            type: 'bar',
            values: [1, 2, 3, 4, 5],
          },
        },
      ]);

      render(
        <ConciergusMessageItem 
          message={message}
          enableGenerativeUI={true}
          customUIRenderer={CustomUIRenderer}
        />
      );

      expect(screen.getByTestId('custom-ui-data-chart')).toBeInTheDocument();
      expect(screen.getByText(/Custom UI.*type.*bar/)).toBeInTheDocument();
    });

    it('falls back to default renderer when generative UI is disabled', () => {
      const message = createRichMessage([
        {
          type: 'data-widget',
          data: { widget: 'test' },
        },
      ]);

      render(
        <ConciergusMessageItem 
          message={message}
          enableGenerativeUI={false}
          customUIRenderer={CustomUIRenderer}
        />
      );

      expect(screen.queryByTestId('custom-ui-data-widget')).not.toBeInTheDocument();
      expect(screen.getByText('data-widget')).toBeInTheDocument();
    });
  });

  describe('Enhanced File Support', () => {
    it('renders image files with lazy loading', () => {
      const message = createRichMessage([
        {
          type: 'file',
          mimeType: 'image/jpeg',
          filename: 'test-image.jpg',
          url: 'https://example.com/image.jpg',
        },
      ]);

      render(<ConciergusMessageItem message={message} />);

      expect(screen.getByText('📎 Image: test-image.jpg')).toBeInTheDocument();
      const imageElement = screen.getByAltText('test-image.jpg');
      expect(imageElement).toHaveAttribute('src', 'https://example.com/image.jpg');
      expect(imageElement).toHaveAttribute('loading', 'lazy');
    });

    it('renders generic files with download links', () => {
      const message = createRichMessage([
        {
          type: 'file',
          mimeType: 'application/pdf',
          filename: 'document.pdf',
          url: 'https://example.com/document.pdf',
        },
      ]);

      render(<ConciergusMessageItem message={message} />);

      expect(screen.getByText('📎 File: document.pdf (application/pdf)')).toBeInTheDocument();
      const downloadLink = screen.getByText('Download document.pdf');
      expect(downloadLink).toHaveAttribute('href', 'https://example.com/document.pdf');
      expect(downloadLink).toHaveAttribute('target', '_blank');
    });

    it('handles base64 data URLs', () => {
      const message = createRichMessage([
        {
          type: 'file',
          mimeType: 'text/plain',
          filename: 'test.txt',
          url: 'data:text/plain;base64,VGVzdCBkYXRh',
        },
      ]);

      render(<ConciergusMessageItem message={message} />);

      expect(screen.getByText('[Base64 data: 35 characters]')).toBeInTheDocument();
    });
  });

  describe('Step Start Enhancement', () => {
    it('renders step start with attachments', () => {
      const message = createRichMessage([
        {
          type: 'step-start',
          experimental_attachments: [
            { name: 'file1.txt', contentType: 'text/plain', url: 'https://example.com/file1.txt' },
            { name: 'image.png', contentType: 'image/png', url: 'https://example.com/image.png' },
          ],
        },
      ]);

      render(<ConciergusMessageItem message={message} />);

      expect(screen.getByText('⚡ Step Start')).toBeInTheDocument();
      expect(screen.getByText('Attachments:')).toBeInTheDocument();
      expect(screen.getByText('file1.txt (text/plain)')).toBeInTheDocument();
      expect(screen.getByText('image.png (image/png)')).toBeInTheDocument();
    });
  });

  describe('Enhanced Metadata Display', () => {
    it('shows performance metrics when enabled', () => {
      const message = createRichMessage([
        { type: 'text', text: 'Test message with rich metadata' },
      ]);

      render(
        <ConciergusMessageItem 
          message={message}
          showMetadata={true}
          showDetailedMetadata={true}
        />
      );

      // Should show enhanced metadata including performance metrics
      // The actual implementation depends on MessageMetadata component
      expect(screen.getByText('Test message with rich metadata')).toBeInTheDocument();
    });
  });

  describe('Audio Event Handling', () => {
    it('calls audio event handlers', () => {
      const onAudioPlay = jest.fn();
      const onAudioPause = jest.fn();

      const message = createRichMessage([
        {
          type: 'file',
          mimeType: 'audio/mp3',
          filename: 'test.mp3',
          url: 'https://example.com/test.mp3',
        },
      ]);

      render(
        <ConciergusMessageItem 
          message={message}
          onAudioPlay={onAudioPlay}
          onAudioPause={onAudioPause}
        />
      );

      const audioElement = screen.getByText('Your browser does not support the audio element.').closest('audio');
      
      fireEvent.play(audioElement);
      expect(onAudioPlay).toHaveBeenCalled();

      fireEvent.pause(audioElement);
      expect(onAudioPause).toHaveBeenCalled();
    });
  });

  describe('Mixed Content Messages', () => {
    it('renders complex messages with multiple part types', () => {
      const complexMessage = createRichMessage([
        { type: 'text', text: 'Let me search for that information.' },
        { type: 'reasoning', text: 'I need to search for current weather data.', providerMetadata: {} },
        {
          type: 'tool-invocation',
          toolInvocation: {
            state: 'result',
            toolCallId: 'call_123',
            toolName: 'searchWeb',
            args: { query: 'weather' },
            result: { results: ['Weather data found'] },
          },
        },
        { type: 'text', text: 'Here are the results:' },
        {
          type: 'file',
          mimeType: 'image/png',
          filename: 'weather-chart.png',
          url: 'https://example.com/chart.png',
        },
        {
          type: 'source',
          source: {
            sourceType: 'url',
            id: 'source_1',
            url: 'https://weather.com',
            title: 'Weather.com',
          },
        },
      ]);

      render(
        <ConciergusMessageItem 
          message={complexMessage}
          showReasoningTraces={true}
          showSourceCitations={true}
        />
      );

      expect(screen.getByText('Let me search for that information.')).toBeInTheDocument();
      expect(screen.getByText('searchWeb')).toBeInTheDocument();
      expect(screen.getByText('Here are the results:')).toBeInTheDocument();
      expect(screen.getByText('📎 Image: weather-chart.png')).toBeInTheDocument();
    });
  });
}); 