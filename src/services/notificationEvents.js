/**
 * Notification Event Bus & Auto-Refresh Hook
 * Allows any screen to automatically refresh its data in real time
 * when a push notification arrives.
 */

import { useEffect, useRef } from 'react';

const listeners = new Set();

/**
 * Subscribe a callback to push notification events.
 * @param {Function} callback - Receives notification payload { title, body, data, action, type }
 * @returns {Function} unsubscribe
 */
export const subscribeNotificationEvent = (callback) => {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
};

/**
 * Broadcast an incoming notification event to all listening components.
 * @param {Object} event
 */
export const emitNotificationEvent = (event) => {
  listeners.forEach((callback) => {
    try {
      callback(event);
    } catch (err) {
      console.warn('Error in notification subscriber:', err);
    }
  });
};

/**
 * Custom hook to automatically trigger a refresh function
 * when push notifications of matching actions or types arrive.
 *
 * @param {string|Array<string>} targetActions - Action(s) or type(s) to match, e.g. 'order', 'ORDER_STATUS_UPDATED'
 * @param {Function} onRefresh - Function to re-fetch/refresh screen data
 */
export const useNotificationAutoRefresh = (targetActions, onRefresh) => {
  const refreshRef = useRef(onRefresh);
  refreshRef.current = onRefresh;

  useEffect(() => {
    const unsubscribe = subscribeNotificationEvent((event) => {
      if (!targetActions) {
        refreshRef.current?.();
        return;
      }

      const targets = Array.isArray(targetActions) ? targetActions : [targetActions];
      const eventAction = event.data?.action || event.action;
      const eventType = event.data?.type || event.type;

      const isMatch = targets.some(
        (t) => t === '*' || t === eventAction || t === eventType
      );

      if (isMatch) {
        console.log(`🔄 [AutoRefresh] Matching push notification (${eventAction || eventType}). Screen auto-refreshing!`);
        refreshRef.current?.();
      }
    });

    return unsubscribe;
  }, [targetActions]);
};

