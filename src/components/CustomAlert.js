/**
 * Global Custom Alert Modal Component
 * Drop-in replacement for React Native's native Alert.alert with branded modal UI.
 *
 * Usage:
 *   import { CustomAlert } from '../components/CustomAlert';
 *   CustomAlert.alert('Title', 'Message', [{ text: 'Cancel', style: 'cancel' }, { text: 'OK', onPress: ... }]);
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  TouchableWithoutFeedback,
} from 'react-native';
import { Check, AlertCircle, AlertTriangle, Info } from 'lucide-react-native';
import { COLORS, SIZES, FONTS } from '../constants/theme';

let globalShowAlert = null;

const inferVariant = (title = '', buttons = []) => {
  const lower = String(title).toLowerCase();
  const hasDestructive = buttons.some((b) => b?.style === 'destructive');
  if (
    hasDestructive ||
    lower.includes('error') ||
    lower.includes('failed') ||
    lower.includes('invalid') ||
    lower.includes('cannot') ||
    lower.includes('unavailable')
  ) {
    return hasDestructive && !lower.includes('error') ? 'warning' : 'error';
  }
  if (
    lower.includes('success') ||
    lower.includes('saved') ||
    lower.includes('updated') ||
    lower.includes('recorded') ||
    lower.includes('submitted') ||
    lower.includes('subscribed') ||
    lower.includes('placed') ||
    lower.includes('approved') ||
    lower.includes('sent')
  ) {
    return 'success';
  }
  if (
    lower.includes('confirm') ||
    lower.includes('delete') ||
    lower.includes('cancel') ||
    lower.includes('logout') ||
    lower.includes('switch') ||
    lower.includes('required') ||
    lower.includes('empty') ||
    lower.includes('select')
  ) {
    return 'warning';
  }
  return 'info';
};

const VARIANT_META = {
  success: { Icon: Check, bg: '#E8F5E9', color: COLORS.success },
  error: { Icon: AlertCircle, bg: '#FFEBEE', color: COLORS.danger },
  warning: { Icon: AlertTriangle, bg: '#FFF3E0', color: COLORS.warning },
  info: { Icon: Info, bg: '#E3F2FD', color: COLORS.info },
};

export const CustomAlert = {
  alert: (title, message = '', buttons = [], options = {}) => {
    const normalizedButtons =
      Array.isArray(buttons) && buttons.length > 0 ? buttons : [{ text: 'OK', style: 'default' }];

    if (typeof globalShowAlert === 'function') {
      globalShowAlert({
        title: title ? String(title) : '',
        message: message ? String(message) : '',
        buttons: normalizedButtons,
        options: options || {},
      });
    } else {
      console.warn('CustomAlertProvider is not mounted yet:', title, message);
    }
  },
};

export const CustomAlertProvider = ({ children }) => {
  const [queue, setQueue] = useState([]);
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const current = queue[0] || null;

  useEffect(() => {
    globalShowAlert = (payload) => {
      setQueue((prev) => [...prev, payload]);
    };
    return () => {
      globalShowAlert = null;
    };
  }, []);

  useEffect(() => {
    if (current) {
      scaleAnim.setValue(0.9);
      opacityAnim.setValue(0);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 7,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [current, scaleAnim, opacityAnim]);

  const closeCurrent = useCallback((onPress) => {
    setQueue((prev) => prev.slice(1));
    if (typeof onPress === 'function') {
      setTimeout(() => onPress(), 50);
    }
  }, []);

  const handleBackdropPress = () => {
    if (!current) return;
    if (current.options?.cancelable === false) return;
    const cancelBtn = current.buttons.find((b) => b?.style === 'cancel');
    if (cancelBtn) {
      closeCurrent(cancelBtn.onPress);
    } else if (current.buttons.length === 1) {
      closeCurrent(current.buttons[0]?.onPress);
    }
  };

  const variant = current ? inferVariant(current.title, current.buttons) : 'info';
  const meta = VARIANT_META[variant];
  const VariantIcon = meta.Icon;
  const isStacked = current && current.buttons.length > 2;

  return (
    <>
      {children}
      <Modal
        visible={Boolean(current)}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={handleBackdropPress}
      >
        <TouchableWithoutFeedback onPress={handleBackdropPress}>
          <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]}>
            <TouchableWithoutFeedback>
              <Animated.View
                style={[
                  styles.dialog,
                  { transform: [{ scale: scaleAnim }] },
                ]}
              >
                <View style={[styles.iconCircle, { backgroundColor: meta.bg }]}>
                  <VariantIcon size={24} color={meta.color} />
                </View>

                {current?.title ? (
                  <Text style={styles.title}>{current.title}</Text>
                ) : null}

                {current?.message ? (
                  <Text style={styles.message}>{current.message}</Text>
                ) : null}

                <View style={[styles.buttonContainer, isStacked && styles.buttonContainerStacked]}>
                  {(current?.buttons || []).map((btn, idx) => {
                    const isCancel = btn?.style === 'cancel';
                    const isDestructive = btn?.style === 'destructive';
                    const isSingle = current.buttons.length === 1;

                    return (
                      <TouchableOpacity
                        key={`${btn?.text || 'btn'}-${idx}`}
                        activeOpacity={0.8}
                        onPress={() => closeCurrent(btn?.onPress)}
                        style={[
                          styles.btn,
                          isStacked ? styles.btnStacked : isSingle ? styles.btnSingle : styles.btnFlex,
                          isCancel && styles.btnCancel,
                          isDestructive && styles.btnDestructive,
                          !isCancel && !isDestructive && styles.btnPrimary,
                        ]}
                      >
                        <Text
                          style={[
                            styles.btnText,
                            isCancel && styles.btnCancelText,
                            (isDestructive || !isCancel) && styles.btnLightText,
                          ]}
                          numberOfLines={1}
                        >
                          {btn?.text || 'OK'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </Animated.View>
            </TouchableWithoutFeedback>
          </Animated.View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  dialog: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusLg,
    paddingTop: 22,
    paddingBottom: 18,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 10,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconText: {
    fontSize: 22,
    fontWeight: '800',
  },
  title: {
    ...FONTS.h3,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 6,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
  },
  buttonContainerStacked: {
    flexDirection: 'column',
    gap: 8,
  },
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: SIZES.radiusMd,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnFlex: {
    flex: 1,
  },
  btnSingle: {
    width: '100%',
  },
  btnStacked: {
    width: '100%',
  },
  btnPrimary: {
    backgroundColor: COLORS.primary,
  },
  btnCancel: {
    backgroundColor: COLORS.chipBg,
  },
  btnDestructive: {
    backgroundColor: COLORS.danger,
  },
  btnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  btnLightText: {
    color: COLORS.textLight,
  },
  btnCancelText: {
    color: COLORS.textSecondary,
  },
});

export default CustomAlert;
