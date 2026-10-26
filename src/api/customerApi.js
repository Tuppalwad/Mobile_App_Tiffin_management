/**
 * Customer & Notification API Services
 */

import apiClient from './client';

export const customerApi = {
  // Profile
  getProfile: () => apiClient.get('/customer/profile'),
  updateProfile: (data) => apiClient.put('/customer/profile', data),

  // Discover Providers
  getProviders: (params) => apiClient.get('/customer/providers', { params }),
  getProviderDetails: (id) => apiClient.get(`/customer/providers/${id}`),

  // Orders
  createOrder: (data) => apiClient.post('/customer/orders', data),
  getOrders: (params) => apiClient.get('/customer/orders', { params }),
  getOrderById: (id) => apiClient.get(`/customer/orders/${id}`),
  cancelOrder: (id) => apiClient.patch(`/customer/orders/${id}/cancel`),

  // Subscriptions
  createSubscription: (data) => apiClient.post('/customer/subscriptions', data),
  getSubscriptions: (params) => apiClient.get('/customer/subscriptions', { params }),

  // Skip Tiffin
  requestSkipTiffin: (data) => apiClient.post('/customer/skips', data),
  getSkips: () => apiClient.get('/customer/skips'),

  // Payments
  getPayments: () => apiClient.get('/customer/payments'),
};

export const notificationApi = {
  getNotifications: (params) => apiClient.get('/notifications', { params }),
  markAsRead: (id) => apiClient.patch(`/notifications/${id}/read`),
  markAllAsRead: () => apiClient.patch('/notifications/read-all'),
};

