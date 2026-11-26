/**
 * Keyboard-Aware Wrapper for Modals
 * Android Modals run in a separate Dialog window that isn't resized by MainActivity insets.
 * Tracks exact keyboard height on Android and uses padding behavior on iOS.
 */

import React, { useState, useEffect } from 'react';
import { KeyboardAvoidingView, Platform, Keyboard, View } from 'react-native';

export const KeyboardModalView = ({ children, style, keyboardVerticalOffset = 0 }) => {
  const [androidKeyboardHeight, setAndroidKeyboardHeight] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
      setAndroidKeyboardHeight(e?.endCoordinates?.height || 0);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setAndroidKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  if (Platform.OS === 'ios') {
    return (
      <KeyboardAvoidingView
        behavior="padding"
        keyboardVerticalOffset={keyboardVerticalOffset}
        style={style}
      >
        {children}
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={[style, androidKeyboardHeight > 0 && { paddingBottom: androidKeyboardHeight }]}>
      {children}
    </View>
  );
};

export default KeyboardModalView;
