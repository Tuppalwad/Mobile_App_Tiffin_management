/**
 * Firebase Cloud Messaging (FCM) Push Notification Service
 * Handles notification permissions, FCM device tokens, foreground & background handlers.
 */

import { Platform, PermissionsAndroid, Alert } from 'react-native';
import { getMessaging } from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from '../api/authApi';
import { emitNotificationEvent } from './notificationEvents';

// Helper to safely get messaging instance
const getMessagingInstance = () => {
  try {
    if (typeof getMessaging === 'function') {
      return getMessaging();
    }
  } catch (err) {
    console.warn('⚠️ [FCM] Could not get messaging instance:', err.message);
  }
  return null;
};

class NotificationService {
  constructor() {
    this.fcmToken = null;
    this.isInitialized = false;
  }

  /**
   * Request push notification permissions (Android 13+ & iOS).
   */
  async requestUserPermission() {
    try {
      if (Platform.OS === 'android') {
        if (Platform.Version >= 33) {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
          );
          return granted === PermissionsAndroid.RESULTS.GRANTED;
        }
        return true;
      }

      const messaging = getMessagingInstance();
      if (messaging && typeof messaging.requestPermission === 'function') {
        const authStatus = await messaging.requestPermission();
        return authStatus === 1 || authStatus === 2; // 1 = AUTHORIZED, 2 = PROVISIONAL
      }
      return false;
    } catch (err) {
      console.warn('Error requesting notification permission:', err);
      return false;
    }
  }

  /**
   * Get the current device FCM token.
   */
  async getFCMToken() {
    try {
      // Check stored token first
      if (!this.fcmToken) {
        this.fcmToken = await AsyncStorage.getItem('fcm_token');
      }

      // Fetch from Firebase Messaging
      const messaging = getMessagingInstance();
      if (messaging && typeof messaging.getToken === 'function') {
        const token = await messaging.getToken();
        if (token) {
          this.fcmToken = token;
          await AsyncStorage.setItem('fcm_token', token);
          return token;
        }
      }
    } catch (err) {
      console.warn('Error getting FCM token:', err);
    }
    return this.fcmToken;
  }

  /**
   * Register or sync FCM token with the backend.
   */
  async syncTokenWithBackend() {
    try {
      const token = await this.getFCMToken();
      const authToken = await AsyncStorage.getItem('auth_token');

      if (token && authToken) {
        await authApi.updateFcmToken(token);
        console.log('✅ [FCM] Device token synced with backend server');
      }
    } catch (err) {
      console.warn('Could not sync FCM token with backend:', err.message);
    }
  }

  /**
   * Initialize FCM listeners (foreground, token refresh, notification clicked).
   */
  async initialize() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    try {
      // 1. Request permission
      await this.requestUserPermission();

      // 2. Fetch and sync initial FCM token
      await this.syncTokenWithBackend();

      const messaging = getMessagingInstance();
      if (!messaging) return;

      // 3. Listen for token refreshes
      if (typeof messaging.onTokenRefresh === 'function') {
        messaging.onTokenRefresh(async (newToken) => {
          console.log('🔄 [FCM] Token refreshed:', newToken);
          this.fcmToken = newToken;
          await AsyncStorage.setItem('fcm_token', newToken);
          await this.syncTokenWithBackend();
        });
      }

      // 4. Foreground notification listener
      if (typeof messaging.onMessage === 'function') {
        messaging.onMessage(async (remoteMessage) => {
          console.log('🔔 [FCM] Foreground Notification Received:', remoteMessage);

          const title = remoteMessage.notification?.title || 'Homemade Tiffin';
          const body = remoteMessage.notification?.body || '';
          const data = remoteMessage.data || {};

          // Broadcast to all mounted screens for instant auto-refresh
          emitNotificationEvent({
            title,
            body,
            data,
            action: data.action,
            type: data.type,
          });

          // Show in-app alert banner for user awareness
          Alert.alert(title, body, [{ text: 'OK' }]);
        });
      }

      // 5. Notification opened from background
      if (typeof messaging.onNotificationOpenedApp === 'function') {
        messaging.onNotificationOpenedApp((remoteMessage) => {
          console.log('📱 [FCM] App opened from notification in background:', remoteMessage);
          const data = remoteMessage.data || {};
          emitNotificationEvent({
            title: remoteMessage.notification?.title,
            body: remoteMessage.notification?.body,
            data,
            action: data.action,
            type: data.type,
          });
        });
      }

      // 6. Check if app was opened from a quit state via notification
      if (typeof messaging.getInitialNotification === 'function') {
        const initialNotification = await messaging.getInitialNotification();
        if (initialNotification) {
          console.log('🚀 [FCM] App launched from quit state via notification:', initialNotification);
          const data = initialNotification.data || {};
          emitNotificationEvent({
            title: initialNotification.notification?.title,
            body: initialNotification.notification?.body,
            data,
            action: data.action,
            type: data.type,
          });
        }
      }
    } catch (initErr) {
      console.warn('⚠️ [FCM] Error during notification service initialize:', initErr);
    }
  }
}

export const notificationService = new NotificationService();
export default notificationService;

