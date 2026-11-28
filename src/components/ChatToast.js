/**
 * Global In-App Toast Banner for Foreground Chat Notifications
 * Slides in from the top when a chat message arrives while the user is in the app.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MessageCircle, X } from 'lucide-react-native';
import { COLORS, SIZES } from '../constants/theme';

let globalShowToast = null;

export const ChatToast = {
  show: ({ title, message, conversationId = null, senderName = '', duration = 3500 }) => {
    if (typeof globalShowToast === 'function') {
      globalShowToast({
        id: Date.now(),
        title: title ? String(title) : 'New Message',
        message: message ? String(message) : '',
        conversationId,
        senderName,
        duration,
      });
    }
  },
};

export const ChatToastProvider = ({ children, navigationRef }) => {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState(null);
  const translateY = useRef(new Animated.Value(-140)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef(null);

  const hideToast = useCallback(() => {
    clearTimeout(timerRef.current);
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -140,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setToast(null);
    });
  }, [translateY, opacity]);

  useEffect(() => {
    globalShowToast = (payload) => {
      clearTimeout(timerRef.current);
      setToast(payload);
      translateY.setValue(-140);
      opacity.setValue(0);

      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          friction: 8,
          tension: 70,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();

      timerRef.current = setTimeout(() => {
        hideToast();
      }, payload.duration || 3500);
    };

    return () => {
      globalShowToast = null;
      clearTimeout(timerRef.current);
    };
  }, [hideToast, translateY, opacity]);

  const handlePress = () => {
    const convId = toast?.conversationId;
    const title = toast?.senderName || toast?.title || 'Chat';
    hideToast();
    if (convId && navigationRef?.isReady?.()) {
      navigationRef.navigate('ChatRoom', {
        conversationId: convId,
        title,
      });
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {children}
      {toast ? (
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.wrapper,
            {
              top: (insets.top || (Platform.OS === 'ios' ? 44 : 12)) + 8,
              transform: [{ translateY }],
              opacity,
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.92}
            onPress={handlePress}
            style={styles.toastCard}
          >
            <View style={styles.iconBox}>
              <MessageCircle size={20} color="#FFF" />
            </View>
            <View style={styles.textBox}>
              <Text style={styles.title} numberOfLines={1}>
                {toast.title}
              </Text>
              {toast.message ? (
                <Text style={styles.message} numberOfLines={2}>
                  {toast.message}
                </Text>
              ) : null}
            </View>
            <TouchableOpacity
              onPress={hideToast}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.closeBtn}
            >
              <X size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          </TouchableOpacity>
        </Animated.View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 14,
    right: 14,
    zIndex: 9999,
    elevation: 12,
  },
  toastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusLg,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 10,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textBox: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  message: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
});

export default ChatToast;
