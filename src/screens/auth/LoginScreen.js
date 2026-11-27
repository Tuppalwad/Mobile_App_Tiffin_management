/**
 * Login Screen
 * Allows users to enter mobile number and request OTP
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  ScrollView,
  Keyboard,
} from 'react-native';
import { CustomAlert } from "../../components/CustomAlert";
import { UtensilsCrossed } from 'lucide-react-native';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { COLORS, SIZES, FONTS } from '../../constants/theme';
import { authApi } from '../../api/authApi';

export const LoginScreen = ({ navigation }) => {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollViewRef = useRef(null);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      const height = e?.endCoordinates?.height || 0;
      setKeyboardHeight(height);
      if (Platform.OS !== 'ios') {
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleSendOtp = async () => {
    if (!phone || phone.replace(/\D/g, '').length < 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await authApi.sendOtp(phone);
      setLoading(false);
      // Pass phone and dev OTP to OTP screen
      const receivedOtp = response?.data?.otp || '';
      navigation.navigate('Otp', { phone, receivedOtp });
    } catch (err) {
      setLoading(false);
      CustomAlert.alert('Error', err.message || 'Failed to send OTP. Please try again.');
    }
  };

  const iosBottomPadding = Platform.OS === 'ios' && keyboardHeight > 0 ? Math.max(0, keyboardHeight - 16) : 0;

  return (
    <View style={[styles.safeArea, iosBottomPadding > 0 && { paddingBottom: iosBottomPadding }]}>
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={[
          styles.scrollContent,
          Platform.OS !== 'ios' && keyboardHeight > 0 && styles.scrollContentKeyboardOpen,
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
          <View style={styles.header}>
            <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: '#FFF3E0', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <UtensilsCrossed size={42} color={COLORS.primary} />
            </View>
            <Text style={styles.title}>Homemade Tiffin</Text>
            <Text style={styles.subtitle}>Ghar jaisa swad, har roz apke paas</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Login or Sign Up</Text>
            <Text style={styles.cardSubtitle}>
              Enter your mobile number to receive an OTP verification code
            </Text>

            <Input
              label="Mobile Number"
              placeholder="Enter 10-digit mobile number"
              prefix="+91"
              value={phone}
              onChangeText={(text) => {
                setPhone(text.replace(/[^0-9]/g, '').slice(0, 10));
                if (error) setError('');
              }}
              onFocus={() => {
                if (Platform.OS !== 'ios') {
                  setTimeout(() => {
                    scrollViewRef.current?.scrollToEnd({ animated: true });
                  }, 150);
                }
              }}
              keyboardType="phone-pad"
              maxLength={10}
              error={error}
            />

            <Button
              title="Get OTP"
              onPress={handleSendOtp}
              loading={loading}
              style={styles.button}
            />
          </View>
        </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    justifyContent: 'center',
    flexGrow: 1,
  },
  scrollContentKeyboardOpen: {
    justifyContent: 'flex-start',
    paddingTop: 28,
    paddingBottom: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    fontSize: 64,
    marginBottom: 8,
  },
  title: {
    ...FONTS.h1,
    color: COLORS.primary,
  },
  subtitle: {
    ...FONTS.subtitle,
    marginTop: 4,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radiusLg,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    ...FONTS.h2,
    marginBottom: 6,
  },
  cardSubtitle: {
    ...FONTS.subtitle,
    marginBottom: 20,
  },
  button: {
    marginTop: 10,
  },
});

export default LoginScreen;
