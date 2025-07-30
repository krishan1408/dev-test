"use client";

import { useState } from 'react';
import { useSSE } from '../hooks/useSSE';
import type { SSEEvent } from '../types';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  actionUrl?: string;
  timestamp: number;
  dismissed: boolean;
}

interface SSENotificationsProps {
  userId: string;
  maxNotifications?: number;
  autoDismiss?: boolean;
  dismissDelay?: number;
}

/**
 * SSE Notifications Component
 * 
 * Displays real-time notifications received via SSE.
 * Supports auto-dismiss, manual dismiss, and click actions.
 */
export function SSENotifications({ 
  userId, 
  maxNotifications = 5, 
  autoDismiss = true, 
  dismissDelay = 5000 
}: SSENotificationsProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const { isConnected } = useSSE({
    userId,
    events: ['notification', 'system_alert'],
    onMessage: (event: SSEEvent) => {
      try {
        const eventData = JSON.parse(event.data) as {
          title?: string;
          message?: string;
          type?: string;
          actionUrl?: string;
          data?: {
            title?: string;
            message?: string;
            type?: string;
            actionUrl?: string;
          };
          timestamp?: number;
        };

        // Extract notification data from event
        const title = eventData.title ?? eventData.data?.title ?? 'Notification';
        const message = eventData.message ?? eventData.data?.message ?? 'New notification received';
        const type = (eventData.type ?? eventData.data?.type ?? 'info') as 'info' | 'success' | 'warning' | 'error';
        const actionUrl = eventData.actionUrl ?? eventData.data?.actionUrl;
        const timestamp = eventData.timestamp ?? Date.now();

        const notification: Notification = {
          id: `${event.event}-${timestamp}`,
          title,
          message,
          type,
          actionUrl,
          timestamp,
          dismissed: false,
        };

        setNotifications(prev => {
          const newNotifications = [notification, ...prev.filter(n => !n.dismissed)];
          return newNotifications.slice(0, maxNotifications);
        });

        // Auto-dismiss notification
        if (autoDismiss) {
          setTimeout(() => {
            dismissNotification(notification.id);
          }, dismissDelay);
        }
      } catch (error) {
        console.error('Failed to parse SSE notification:', error);
      }
    },
  });

  const dismissNotification = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, dismissed: true } : n)
    );
  };

  const handleNotificationClick = (notification: Notification) => {
    if (notification.actionUrl) {
      window.open(notification.actionUrl, '_blank');
    }
    dismissNotification(notification.id);
  };

  if (!isConnected) {
    return null;
  }

  const activeNotifications = notifications.filter(n => !n.dismissed);

  if (activeNotifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {activeNotifications.map(notification => (
        <div
          key={notification.id}
          className={`p-4 rounded-lg shadow-lg border-l-4 cursor-pointer transition-all duration-300 ${
            notification.type === 'error' ? 'bg-red-50 border-red-500 text-red-800' :
            notification.type === 'warning' ? 'bg-yellow-50 border-yellow-500 text-yellow-800' :
            notification.type === 'success' ? 'bg-green-50 border-green-500 text-green-800' :
            'bg-blue-50 border-blue-500 text-blue-800'
          }`}
          onClick={() => handleNotificationClick(notification)}
        >
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h4 className="font-semibold text-sm">{notification.title}</h4>
              <p className="text-sm mt-1">{notification.message}</p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                dismissNotification(notification.id);
              }}
              className="ml-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
} 