/**
 * Socket.IO Real-Time Chat Client
 * Manages persistent WebSocket connection, typing events, rooms, and message acks.
 */

import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CHAT_SOCKET_URL, APP_ID } from '../api/chatApi';

class ChatSocketService {
  constructor() {
    this.socket = null;
    this.activeConversationId = null;
    this.connectingPromise = null;
  }

  isConnected() {
    return Boolean(this.socket && this.socket.connected);
  }

  setActiveConversation(conversationId) {
    this.activeConversationId = conversationId ? Number(conversationId) : null;
  }

  getActiveConversation() {
    return this.activeConversationId;
  }

  async connect() {
    if (!CHAT_SOCKET_URL) {
      return null;
    }

    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    if (this.connectingPromise) {
      return this.connectingPromise;
    }

    this.connectingPromise = (async () => {
      try {
        const token = await AsyncStorage.getItem('auth_token');
        if (!token) {
          return null;
        }

        if (this.socket) {
          this.socket.disconnect();
        }

        this.socket = io(CHAT_SOCKET_URL, {
          auth: { token, appId: APP_ID },
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 2000,
          timeout: 8000,
        });

        this.socket.on('connect', () => {
          console.log('🔌 [ChatSocket] Connected:', this.socket.id);
          if (this.activeConversationId) {
            this.joinConversation(this.activeConversationId);
          }
        });

        this.socket.on('connect_error', (err) => {
          console.warn('⚠️ [ChatSocket] Connection error:', err.message);
        });

        return this.socket;
      } finally {
        this.connectingPromise = null;
      }
    })();

    return this.connectingPromise;
  }

  disconnect() {
    this.activeConversationId = null;
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  on(event, handler) {
    if (!this.socket) return () => {};
    this.socket.on(event, handler);
    return () => {
      this.socket?.off(event, handler);
    };
  }

  emitWithAck(event, payload) {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.socket.connected) {
        return reject(new Error('Socket not connected'));
      }
      this.socket.timeout(8000).emit(event, payload, (err, response) => {
        if (err) {
          return reject(new Error('Real-time request timed out'));
        }
        if (response && response.ok === false) {
          return reject(new Error(response.error || 'Socket operation failed'));
        }
        resolve(response);
      });
    });
  }

  async joinConversation(conversationId) {
    const sock = await this.connect();
    if (!sock || !sock.connected) return;
    sock.emit('conversation:join', { conversationId });
  }

  leaveConversation(conversationId) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('conversation:leave', { conversationId });
    }
  }

  startTyping(conversationId) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('typing:start', { conversationId });
    }
  }

  stopTyping(conversationId) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('typing:stop', { conversationId });
    }
  }

  async sendMessage(payload) {
    if (this.socket && this.socket.connected) {
      const res = await this.emitWithAck('message:send', payload);
      return res?.data;
    }
    throw new Error('Socket not connected');
  }

  async editMessage(messageId, content) {
    if (this.socket && this.socket.connected) {
      const res = await this.emitWithAck('message:edit', { messageId, content });
      return res?.data;
    }
    throw new Error('Socket not connected');
  }

  async deleteMessage(messageId) {
    if (this.socket && this.socket.connected) {
      const res = await this.emitWithAck('message:delete', { messageId });
      return res?.data;
    }
    throw new Error('Socket not connected');
  }

  markRead(conversationId) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('conversation:read', { conversationId });
    }
  }
}

export const chatSocketService = new ChatSocketService();
export default chatSocketService;
