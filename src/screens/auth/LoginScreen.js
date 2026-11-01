/**
 * Login Screen
 * Allows users to enter mobile number and request OTP
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { COLORS, SIZES, FONTS } from '../../constants/theme';
import { authApi } from '../../api/authApi';

export const LoginScreen = ({ navigation }) => {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      Alert.alert('Error', err.message || 'Failed to send OTP. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.logo}>🍱</Text>
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
                setPhone(text);
                if (error) setError('');
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

          {/* Quick Demo Switcher Hint */}
          {/* <View style={styles.demoBox}>
            <Text style={styles.demoTitle}>💡 Quick Test Accounts:</Text>
            <Text
              style={styles.demoItem}
              onPress={() => setPhone('9876543210')}
            >
              • Owner Demo: <Text style={styles.demoBold}>9876543210</Text>
            </Text>
            <Text
              style={styles.demoItem}
              onPress={() => setPhone('9123456789')}
            >
              • Customer Demo: <Text style={styles.demoBold}>9123456789</Text>
            </Text>
          </View> */}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
  demoBox: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#FFF8E1',
    borderRadius: SIZES.radiusMd,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  demoTitle: {
    fontWeight: '700',
    color: '#8D6E63',
    marginBottom: 6,
  },
  demoItem: {
    color: '#5D4037',
    fontSize: 13,
    marginVertical: 2,
  },
  demoBold: {
    fontWeight: '700',
    color: COLORS.primary,
  },
});

export default LoginScreen;

