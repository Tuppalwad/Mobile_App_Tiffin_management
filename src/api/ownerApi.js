/**
 * Owner API Service
 */

import apiClient from './client';

export const ownerApi = {
  // Profile
  getProfile: () => apiClient.get('/owner/profile'),
  updateProfile: (data) => apiClient.put('/owner/profile', data),

  // Dashboard Stats
  getDashboardStats: () => apiClient.get('/owner/dashboard'),

  // Menu Items
  getMenuItems: (params) => apiClient.get('/owner/menu', { params }),
  createMenuItem: (data) => apiClient.post('/owner/menu', data),
  updateMenuItem: (id, data) => apiClient.put(`/owner/menu/${id}`, data),
  toggleAvailability: (id) => apiClient.patch(`/owner/menu/${id}/toggle`),
  deleteMenuItem: (id) => apiClient.delete(`/owner/menu/${id}`),

  // Subscription Plans
  getPlans: () => apiClient.get('/owner/plans'),
  createPlan: (data) => apiClient.post('/owner/plans', data),
  updatePlan: (id, data) => apiClient.put(`/owner/plans/${id}`, data),
  deletePlan: (id) => apiClient.delete(`/owner/plans/${id}`),

  // Orders
  getOrders: (params) => apiClient.get('/owner/orders', { params }),
  getOrderById: (id) => apiClient.get(`/owner/orders/${id}`),
  updateOrderStatus: (id, status, extra = {}) =>
    apiClient.patch(`/owner/orders/${id}/status`, { status, ...extra }),

  // Customers & Subscriptions
  getSubscriptions: (params) => apiClient.get('/owner/subscriptions', { params }),
  getCustomers: () => apiClient.get('/owner/customers'),
  getSkipRequests: (params) => apiClient.get('/owner/skips', { params }),
  updateSkipStatus: (id, data) => apiClient.patch(`/owner/skips/${id}`, data),

  // Payments
  getPayments: (params) => apiClient.get('/owner/payments', { params }),
  recordPayment: (data) => apiClient.post('/owner/payments', data),
  getPaymentSummary: () => apiClient.get('/owner/payments/summary'),

  // Service Calendar
  getCalendar: () => apiClient.get('/owner/calendar'),
  addHoliday: (data) => apiClient.post('/owner/calendar', data),
  deleteHoliday: (id) => apiClient.delete(`/owner/calendar/${id}`),
};

