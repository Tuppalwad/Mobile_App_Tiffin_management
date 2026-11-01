/**
 * Notification API Service
 * Handles fetching, reading, and deleting notifications
 */

import apiClient from './client';

export const notificationApi = {
  // Get paginated notifications
  getNotifications: (params) => apiClient.get('/notifications', { params }),

  // Mark single notification as read
  markAsRead: (id) => apiClient.patch(`/notifications/${id}/read`),

  // Mark all notifications as read
  markAllAsRead: () => apiClient.patch('/notifications/read-all'),

  // Delete single notification (disappears from DB)
  deleteNotification: (id) => apiClient.delete(`/notifications/${id}`),

  // Clear all notifications for user
  clearAll: () => apiClient.delete('/notifications/clear-all'),
};

export default notificationApi;

