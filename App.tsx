/**
 * Homemade Tiffin Management App
 * Root Component with Redux Provider, NavigationContainer & SafeAreaProvider
 */

import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { store } from './src/store';
import { RootNavigator } from './src/navigation/RootNavigator';
import { COLORS } from './src/constants/theme';
import { notificationService } from './src/services/notificationService';

function App() {
  useEffect(() => {
    // Initialize push notifications (permission request, token sync, listeners)
    notificationService.initialize().catch((err) => {
      console.warn('Notification init failed:', err);
    });
  }, []);

  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <NavigationContainer>
          <StatusBar barStyle="dark-content" />
          <RootNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </Provider>
  );
}

export default App;
