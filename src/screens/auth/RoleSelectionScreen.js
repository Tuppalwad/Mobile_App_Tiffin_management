/**
 * Role Selection Screen
 * Lets user choose between Owner (Tiffin Provider) and Customer
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
import { COLORS, SIZES, FONTS } from '../../constants/theme';
import { selectRoleThunk } from '../../store/slices/authSlice';

export const RoleSelectionScreen = () => {
  const [selectedRole, setSelectedRole] = useState('owner');
  const dispatch = useDispatch();
  const { isLoading } = useSelector((state) => state.auth);

  const handleContinue = async () => {
    const result = await dispatch(selectRoleThunk(selectedRole));
    if (selectRoleThunk.rejected.match(result)) {
      Alert.alert('Error', result.payload || 'Failed to set role. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.badge}>WELCOME</Text>
        <Text style={styles.title}>How would you like to use this app?</Text>
        <Text style={styles.subtitle}>
          Select your primary role. You can manage your homemade business or order delicious daily meals.
        </Text>

        {/* Role 1: Owner / Tiffin Provider */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setSelectedRole('owner')}
          style={[
            styles.roleCard,
            selectedRole === 'owner' && styles.selectedCard,
          ]}
        >
          <View style={styles.roleIconContainer}>
            <Text style={styles.roleIcon}>👩‍🍳</Text>
          </View>
          <View style={styles.roleDetails}>
            <Text style={styles.roleTitle}>Tiffin Service Owner</Text>
            <Text style={styles.roleDesc}>
              Publish menus, create monthly plans, manage subscribers, track orders and cash/online payments.
            </Text>
          </View>
          <View style={[styles.radioCircle, selectedRole === 'owner' && styles.radioSelected]}>
            {selectedRole === 'owner' && <View style={styles.radioDot} />}
          </View>
        </TouchableOpacity>

        {/* Role 2: Customer */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setSelectedRole('customer')}
          style={[
            styles.roleCard,
            selectedRole === 'customer' && styles.selectedCard,
          ]}
        >
          <View style={styles.roleIconContainer}>
            <Text style={styles.roleIcon}>😋</Text>
          </View>
          <View style={styles.roleDetails}>
            <Text style={styles.roleTitle}>Customer / Food Lover</Text>
            <Text style={styles.roleDesc}>
              Discover nearby home chefs, subscribe to monthly tiffins, order daily meals, and easily skip meals.
            </Text>
          </View>
          <View style={[styles.radioCircle, selectedRole === 'customer' && styles.radioSelected]}>
            {selectedRole === 'customer' && <View style={styles.radioDot} />}
          </View>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Button
            title={`Continue as ${selectedRole === 'owner' ? 'Owner' : 'Customer'}`}
            onPress={handleContinue}
            loading={isLoading}
            style={styles.continueButton}
          />
        </View>
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
    justifyContent: 'center',
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.highlight,
    color: COLORS.primary,
    fontWeight: '800',
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: SIZES.radiusSm,
    marginBottom: 8,
  },
  title: {
    ...FONTS.h1,
    marginBottom: 8,
  },
  subtitle: {
    ...FONTS.subtitle,
    marginBottom: 28,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radiusLg,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  selectedCard: {
    borderColor: COLORS.primary,
    backgroundColor: '#FFF8F2',
  },
  roleIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  roleIcon: {
    fontSize: 28,
  },
  roleDetails: {
    flex: 1,
    marginRight: 10,
  },
  roleTitle: {
    ...FONTS.h3,
    marginBottom: 4,
  },
  roleDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: COLORS.primary,
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },
  footer: {
    marginTop: 20,
  },
  continueButton: {
    marginTop: 10,
  },
});

export default RoleSelectionScreen;

