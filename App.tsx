/**
 * Homemade Tiffin Management App
 * Root Component with Redux Provider, NavigationContainer & SafeAreaProvider
 */

import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import {  } from 'react-native-safe-area-context';
import { store } from './src/store';
import { RootNavigator } from './src/navigation/RootNavigator';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { notificationService } from './src/services/notificationService';
import { CustomAlertProvider } from './src/components/CustomAlert';

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
        <CustomAlertProvider>
          <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom']}>
            <NavigationContainer>
              <StatusBar barStyle="dark-content" />
              <RootNavigator />
            </NavigationContainer>
          </SafeAreaView>
        </CustomAlertProvider>
      </SafeAreaProvider>
    </Provider>
  );
}

export default App;
