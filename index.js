/**
 * @format
 */

import { AppRegistry } from 'react-native';
import { getMessaging } from '@react-native-firebase/messaging';
import App from './App';
import { name as appName } from './app.json';

// Register background handler for FCM push notifications
try {
  const messaging = getMessaging();
  if (messaging && typeof messaging.setBackgroundMessageHandler === 'function') {
    messaging.setBackgroundMessageHandler(async (remoteMessage) => {
      console.log('🔔 [FCM Background] Notification received:', remoteMessage);
    });
  }
} catch (err) {
  console.warn('⚠️ [FCM] Could not register background handler:', err);
}

AppRegistry.registerComponent(appName, () => App);
