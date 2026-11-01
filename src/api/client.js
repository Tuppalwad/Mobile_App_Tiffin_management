/**
 * API Client
 * Configures Axios instance, base URL, auth token injection, and error handling.
 */

import axios from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// In development, Android emulator connects to host machine via 10.0.2.2
// iOS simulator connects via localhost or 127.0.0.1
export const BASE_URL = Platform.select({
  android: 'https://tiffin-backend-1-1-1.onrender.com/api',
  ios: 'https://tiffin-backend-1-1-1.onrender.com/api',
  default: 'https://tiffin-backend-1-1-1.onrender.com/api',
});

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Request Interceptor: Attach JWT bearer token from AsyncStorage
apiClient.interceptors.request.use(

  // consoe full url 

  async (config) => {
    console.log('Request URL:', config.baseURL + config.url);
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.warn('Failed to retrieve auth token from storage', e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Format errors and handle 401
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.message ||
      'Something went wrong. Please check your network connection.';
    return Promise.reject(new Error(message));
  }
);

export default apiClient;

