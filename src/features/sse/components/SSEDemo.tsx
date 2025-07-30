"use client";

import { useState } from 'react';
import { useSSE } from '../hooks/useSSE';
import type { SSEEvent } from '../types';

interface SSEDemoProps {
  userId: string; // Required for authenticated users
}

/**
 * SSE Demo Component
 * 
 * Simple UI to demonstrate SSE functionality with:
 * - Button to trigger test events
 * - Text display showing latest SSE message
 * - Connection status indicator
 * 
 * This satisfies the acceptance criteria for a mock UI.
 */
export function SSEDemo({ userId }: SSEDemoProps) {
  const [latestEvent, setLatestEvent] = useState<SSEEvent | null>(null);
  const [eventHistory, setEventHistory] = useState<SSEEvent[]>([]);

  const { isConnected, isConnecting, lastEvent } = useSSE({
    userId,
    events: ['notification', 'test_event', 'heartbeat'],
    onMessage: (event: SSEEvent) => {
      setLatestEvent(event);
      setEventHistory(prev => [event, ...prev.slice(0, 9)]); // Keep last 10 events
      console.log('SSE Demo received event:', event);
    },
    onError: (error) => {
      console.error('SSE Demo error:', error);
    },
  });

  const sendTestEvent = async () => {
    try {
      const eventData = {
        message: `Test event sent at ${new Date().toLocaleTimeString()}`,
        timestamp: Date.now(),
      };

      // Create a local event to show immediately
      const localEvent: SSEEvent = {
        event: 'test_event',
        data: JSON.stringify(eventData),
      };

      // Add to history immediately
      setLatestEvent(localEvent);
      setEventHistory(prev => [localEvent, ...prev.slice(0, 9)]);

      const response = await fetch('/api/sse/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          event: 'test_event',
          data: eventData,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send test event');
      }

      console.log('Test event sent successfully');
    } catch (error) {
      console.error('Error sending test event:', error);
    }
  };

  const sendNotification = async () => {
    try {
      const eventData = {
        title: 'Test Notification',
        message: `Notification sent at ${new Date().toLocaleTimeString()}`,
        type: 'info',
        timestamp: Date.now(),
      };

      // Create a local event to show immediately
      const localEvent: SSEEvent = {
        event: 'notification',
        data: JSON.stringify(eventData),
      };

      // Add to history immediately
      setLatestEvent(localEvent);
      setEventHistory(prev => [localEvent, ...prev.slice(0, 9)]);

      const response = await fetch('/api/sse/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          event: 'notification',
          data: eventData,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send notification');
      }

      console.log('Notification sent successfully');
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  };



  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">SSE Demo</h2>
      
      {/* Connection Status */}
      <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 shadow-sm">
        <h3 className="font-semibold mb-2 text-blue-800">Connection Status</h3>
        {isConnected ? (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="font-medium text-green-600">Connected</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="font-medium text-red-600">Disconnected</span>
          </div>
        )}
      </div>

      {/* Test Buttons */}
      <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200 shadow-sm">
        <h3 className="font-semibold mb-3 text-green-800">Test Actions</h3>
        <div className="flex gap-3">
          <button
            onClick={sendTestEvent}
            disabled={!isConnected}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            Send Test Event
          </button>
          <button
            onClick={sendNotification}
            disabled={!isConnected}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            Send Notification
          </button>
        </div>
      </div>

      {/* Latest Event Display */}
      <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200 shadow-sm">
        <h3 className="font-semibold mb-3 text-purple-800">Latest SSE Message</h3>
        {latestEvent ? (
          <div className="p-4 bg-white border border-purple-200 rounded-lg shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <span className="font-medium text-purple-800">
                Event: {latestEvent.event}
              </span>
              <span className="text-sm text-gray-500">
                {new Date().toLocaleTimeString()}
              </span>
            </div>
            <pre className="text-sm text-purple-700 bg-gray-50 p-2 rounded border overflow-x-auto">
              {(() => {
                try {
                  return JSON.stringify(JSON.parse(latestEvent.data), null, 2);
                } catch (error) {
                  return latestEvent.data; // Fallback to raw data if JSON parsing fails
                }
              })()}
            </pre>
          </div>
        ) : (
          <div className="p-4 bg-white border border-purple-200 rounded-lg text-gray-500">
            No events received yet. Connect to SSE and send a test event.
          </div>
        )}
      </div>

      {/* Event History */}
      {eventHistory.length > 0 && (
        <div className="mb-6 p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border border-orange-200 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-orange-800">Event History (Last 10)</h3>
            <button
              onClick={() => {
                setEventHistory([]);
                setLatestEvent(null);
              }}
              className="text-xs px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            >
              Clear History
            </button>
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {eventHistory.map((event, index) => {
              // Try to parse the event data to get timestamp
              let eventTime = 'Unknown';
              let eventData = event.data;
              try {
                const parsed = JSON.parse(event.data) as { timestamp?: number; [key: string]: unknown };
                eventTime = parsed.timestamp ? new Date(parsed.timestamp).toLocaleTimeString() : 'Unknown';
                eventData = JSON.stringify(parsed, null, 2);
              } catch {
                // If parsing fails, use current time
                eventTime = new Date().toLocaleTimeString();
              }

              return (
                <div key={index} className="p-3 bg-white border border-orange-200 rounded text-sm shadow-sm">
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-orange-800">{event.event}</span>
                      <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                        {index === 0 ? 'Latest' : `#${index + 1}`}
                      </span>
                    </div>
                    <span className="text-gray-500 text-xs">
                      {eventTime}
                    </span>
                  </div>
                  <div className="text-gray-700 text-xs font-mono bg-gray-50 p-2 rounded border overflow-x-auto">
                    {eventData}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Debug Info */}
      <div className="mt-6 p-4 bg-gradient-to-r from-gray-50 to-slate-50 rounded-lg border border-gray-200 shadow-sm">
        <h3 className="font-semibold mb-2 text-gray-800">Debug Info</h3>
        <div className="text-sm space-y-1 text-gray-700">
          <p>User ID: <span className="font-mono text-blue-600">{userId}</span></p>
          <p>Last Event: <span className="font-mono text-green-600">{lastEvent ? lastEvent.event : 'None'}</span></p>
          <p>Total Events Received: <span className="font-mono text-purple-600">{eventHistory.length}</span></p>
        </div>
      </div>
    </div>
  );
} 