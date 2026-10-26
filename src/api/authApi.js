/**
 * Auth API Service
 */

import apiClient from './client';

export const authApi = {
  // Send OTP
  sendOtp: (phone) => apiClient.post('/auth/send-otp', { phone }),

  // Verify OTP & login
  verifyOtp: (phone, otp) => apiClient.post('/auth/verify-otp', { phone, otp }),

  // Select User Role ('owner' | 'customer')
  selectRole: (role) => apiClient.post('/auth/select-role', { role }),

  // Get current user profile
  getProfile: () => apiClient.get('/auth/profile'),

  // Update profile
  updateProfile: (data) => apiClient.put('/auth/profile', data),

  // Logout
  logout: () => apiClient.post('/auth/logout'),
};

