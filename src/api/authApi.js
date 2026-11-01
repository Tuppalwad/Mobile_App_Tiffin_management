/**
 * Auth API Service
 */

import apiClient from './client';

export const authApi = {
  // Send OTP
  sendOtp: (phone) => apiClient.post('/auth/send-otp', { phone }),

  // Verify OTP & login (with optional fcm_token)
  verifyOtp: (phone, otp, fcm_token) => apiClient.post('/auth/verify-otp', { phone, otp, fcm_token }),

  // Update FCM device push token
  updateFcmToken: (fcm_token) => apiClient.post('/auth/fcm-token', { fcm_token }),

  // Select User Role ('owner' | 'customer')
  selectRole: (role) => apiClient.post('/auth/select-role', { role }),

  // Get current user profile
  getProfile: () => apiClient.get('/auth/profile'),

  // Update profile
  updateProfile: (data) => apiClient.put('/auth/profile', data),

  // Logout
  logout: () => apiClient.post('/auth/logout'),
};

