/**
 * OTP Verification Screen
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { COLORS, SIZES, FONTS } from '../../constants/theme';
import { verifyOtpThunk } from '../../store/slices/authSlice';
import { authApi } from '../../api/authApi';

export const OtpScreen = ({ route, navigation }) => {
  const { phone, receivedOtp } = route.params || {};
  const [otp, setOtp] = useState(receivedOtp || '123456');
  const [resending, setResending] = useState(false);
  const dispatch = useDispatch();
  const { isLoading, error } = useSelector((state) => state.auth);

  const handleVerify = async () => {
    if (!otp || otp.length < 6) {
      Alert.alert('Invalid OTP', 'Please enter a valid 6-digit verification code.');
      return;
    }

    const resultAction = await dispatch(verifyOtpThunk({ phone, otp }));
    if (verifyOtpThunk.fulfilled.match(resultAction)) {
      const user = resultAction.payload.user;
      // If user hasn't selected a role yet, go to RoleSelectionScreen
      if (!user.role) {
        navigation.navigate('RoleSelection');
      }
    } else {
      Alert.alert('Verification Failed', resultAction.payload || 'Invalid OTP code.');
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      const res = await authApi.sendOtp(phone);
      setResending(false);
      if (res?.data?.otp) {
        setOtp(res.data.otp);
      }
      Alert.alert('OTP Sent', 'A new verification code has been sent.');
    } catch (err) {
      setResending(false);
      Alert.alert('Error', err.message || 'Could not resend OTP.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Enter OTP</Text>
        <Text style={styles.subtitle}>
          We sent a 6-digit verification code to{' '}
          <Text style={styles.boldPhone}>+91 {phone}</Text>
        </Text>

        <View style={styles.inputCard}>
          <Input
            label="Verification Code"
            placeholder="• • • • • •"
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            maxLength={6}
            error={error}
            inputStyle={styles.otpInput}
          />

          <Button
            title="Verify & Continue"
            onPress={handleVerify}
            loading={isLoading}
            style={styles.verifyButton}
          />

          <View style={styles.resendRow}>
            <Text style={styles.resendText}>Didn't receive the code? </Text>
            <TouchableOpacity onPress={handleResend} disabled={resending}>
              <Text style={styles.resendLink}>
                {resending ? 'Sending...' : 'Resend OTP'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {receivedOtp ? (
          <View style={styles.hintBox}>
            <Text style={styles.hintText}>
              ⚡ Dev Master OTP Auto-filled: <Text style={{ fontWeight: '700' }}>{otp}</Text>
            </Text>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    padding: 24,
    flex: 1,
  },
  backButton: {
    marginBottom: 20,
    paddingVertical: 8,
  },
  backText: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600',
  },
  title: {
    ...FONTS.h1,
    color: COLORS.text,
  },
  subtitle: {
    ...FONTS.subtitle,
    marginTop: 6,
    marginBottom: 24,
  },
  boldPhone: {
    fontWeight: '700',
    color: COLORS.text,
  },
  inputCard: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radiusLg,
    padding: 20,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  otpInput: {
    textAlign: 'center',
    letterSpacing: 8,
    fontSize: 22,
    fontWeight: '700',
  },
  verifyButton: {
    marginTop: 10,
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  resendText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  resendLink: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  hintBox: {
    marginTop: 20,
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: SIZES.radiusSm,
    borderWidth: 1,
    borderColor: '#C8E6C9',
    alignItems: 'center',
  },
  hintText: {
    color: '#2E7D32',
    fontSize: 13,
  },
});

export default OtpScreen;

