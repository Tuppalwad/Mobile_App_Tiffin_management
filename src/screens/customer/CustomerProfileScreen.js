/**
 * Customer Profile Screen
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Card } from '../../components/Card';
import { COLORS, SIZES, FONTS } from '../../constants/theme';
import { customerApi } from '../../api/customerApi';
import { logoutThunk, selectRoleThunk } from '../../store/slices/authSlice';

export const CustomerProfileScreen = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [foodPreferences, setFoodPreferences] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await customerApi.getProfile();
        const p = response.data;
        if (p) {
          setName(p.user?.name || '');
          setDeliveryAddress(p.delivery_address || p.address || '');
          setCity(p.city || '');
          setPincode(p.pincode || '');
          setFoodPreferences(p.food_preferences || '');
        }
      } catch (err) {
        console.warn('Customer profile fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await customerApi.updateProfile({
        name,
        delivery_address: deliveryAddress,
        city,
        pincode,
        food_preferences: foodPreferences,
      });

      setSaving(false);
      Alert.alert('Saved', 'Your profile details have been updated.');
    } catch (err) {
      setSaving(false);
      Alert.alert('Error', err.message || 'Failed to update profile');
    }
  };

  const handleSwitchToOwner = () => {
    Alert.alert('Switch Role', 'Do you want to switch to Owner / Tiffin Provider mode?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Switch',
        onPress: () => {
          dispatch(selectRoleThunk('owner'));
        },
      },
    ]);
  };

  const handleLogout = () => {
    Alert.alert('Confirm Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => dispatch(logoutThunk()),
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>My Profile</Text>
          <Text style={styles.subtitle}>Manage your delivery address & dietary preferences</Text>
        </View>

        <Card style={styles.card}>
          <Text style={styles.sectionHeading}>Personal Details</Text>
          <Input
            label="Full Name"
            placeholder="e.g. Rahul Sharma"
            value={name}
            onChangeText={setName}
          />

          <Input
            label="Phone Number"
            value={user?.phone || ''}
            editable={false}
            inputStyle={{ color: COLORS.textMuted }}
          />

          <Input
            label="Default Delivery Address"
            placeholder="Flat / Building, Street, Landmark"
            value={deliveryAddress}
            onChangeText={setDeliveryAddress}
            multiline
            numberOfLines={2}
          />

          <View style={styles.row}>
            <Input
              label="City"
              placeholder="e.g. Jaipur"
              value={city}
              onChangeText={setCity}
              style={{ flex: 1, marginRight: 8 }}
            />
            <Input
              label="Pincode"
              placeholder="302020"
              value={pincode}
              onChangeText={setPincode}
              keyboardType="numeric"
              style={{ flex: 1, marginLeft: 8 }}
            />
          </View>

          <Input
            label="Dietary & Cooking Preferences"
            placeholder="e.g. No onion no garlic on Tuesdays, less oily, Jain option preferred"
            value={foodPreferences}
            onChangeText={setFoodPreferences}
            multiline
            numberOfLines={3}
          />
        </Card>

        <Button
          title="Save Profile"
          onPress={handleSaveProfile}
          loading={saving}
          style={{ marginBottom: 16 }}
        />

        <Button
          title="Switch to Owner / Chef Mode"
          variant="outline"
          onPress={handleSwitchToOwner}
          style={{ marginBottom: 12 }}
        />

        <Button
          title="Logout"
          variant="danger"
          onPress={handleLogout}
          style={{ marginBottom: 30 }}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    ...FONTS.h2,
    color: COLORS.text,
  },
  subtitle: {
    ...FONTS.subtitle,
    marginTop: 2,
  },
  card: {
    marginBottom: 16,
  },
  sectionHeading: {
    ...FONTS.h3,
    marginBottom: 14,
    color: COLORS.primary,
  },
  row: {
    flexDirection: 'row',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default CustomerProfileScreen;

