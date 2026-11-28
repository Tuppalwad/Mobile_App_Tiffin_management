/**
 * Unified Chat API Client (via Backend API Gateway)
 * Routes all chat HTTP requests through the single backend gateway on Vercel,
 * while preserving `X-App-Id` multi-app scoping.
 */

import axios from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from './client';

export const APP_ID = 'homemade_tiffin';

// Optional dedicated WebSocket server URL when `chat-service` is hosted separately (e.g. Render/Railway/VPS)
export const CHAT_SOCKET_URL = Platform.select({
  android: '',
  ios: '',
  default: '',
});

const chatClient = axios.create({
  baseURL: `${BASE_URL}/chat`,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-App-Id': APP_ID,
  },
});

chatClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      config.headers['X-App-Id'] = APP_ID;
    } catch (e) {
      console.warn('Chat auth token fetch failed', e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

chatClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.message ||
      'Unable to reach chat gateway. Please check connection.';
    return Promise.reject(new Error(message));
  }
);

export const chatApi = {
  getContacts: () => chatClient.get('/contacts'),
  getConversations: () => chatClient.get('/conversations'),
  startDirectChat: (targetUserId) =>
    chatClient.post('/conversations/direct', { targetUserId }),
  createGroup: ({ name, description, memberIds }) =>
    chatClient.post('/conversations/group', { name, description, memberIds }),
  addGroupMembers: (conversationId, memberIds) =>
    chatClient.post(`/conversations/${conversationId}/members`, { memberIds }),
  removeGroupMember: (conversationId, userId) =>
    chatClient.delete(`/conversations/${conversationId}/members/${userId}`),
  getMessages: (conversationId, params) =>
    chatClient.get(`/conversations/${conversationId}/messages`, { params }),
  sendMessage: (conversationId, payload) =>
    chatClient.post(`/conversations/${conversationId}/messages`, payload),
  sendTyping: (conversationId, isTyping) =>
    chatClient.post(`/conversations/${conversationId}/typing`, { isTyping }),
  editMessage: (messageId, content) =>
    chatClient.patch(`/messages/${messageId}`, { content }),
  deleteMessage: (messageId) => chatClient.delete(`/messages/${messageId}`),
  markAsRead: (conversationId) =>
    chatClient.post(`/conversations/${conversationId}/read`),
  uploadImage: (base64, mimeType = 'image/jpeg') =>
    chatClient.post('/upload', { base64, mimeType }),
};

export default chatApi;
