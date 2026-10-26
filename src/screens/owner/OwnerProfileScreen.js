/**
 * Owner Profile & Business Settings Screen
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Card } from '../../components/Card';
import { COLORS, SIZES, FONTS } from '../../constants/theme';
import { ownerApi } from '../../api/ownerApi';
import { logoutThunk, selectRoleThunk } from '../../store/slices/authSlice';

export const OwnerProfileScreen = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State
  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [serviceRadiusKm, setServiceRadiusKm] = useState('5');
  const [deliveryAvailable, setDeliveryAvailable] = useState(true);
  const [pickupAvailable, setPickupAvailable] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await ownerApi.getProfile();
        const p = response.data;
        if (p) {
          setBusinessName(p.business_name || '');
          setOwnerName(p.user?.name || '');
          setDescription(p.description || '');
          setAddress(p.address || '');
          setCity(p.city || '');
          setState(p.state || '');
          setPincode(p.pincode || '');
          setServiceRadiusKm(p.service_radius_km ? p.service_radius_km.toString() : '5');
          setDeliveryAvailable(p.delivery_available !== false);
          setPickupAvailable(p.pickup_available !== false);
        }
      } catch (err) {
        console.warn('Profile fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await ownerApi.updateProfile({
        business_name: businessName,
        owner_name: ownerName,
        description,
        address,
        city,
        state,
        pincode,
        service_radius_km: parseFloat(serviceRadiusKm) || 5,
        delivery_available: deliveryAvailable,
        pickup_available: pickupAvailable,
      });

      setSaving(false);
      Alert.alert('Saved', 'Business profile updated successfully!');
    } catch (err) {
      setSaving(false);
      Alert.alert('Error', err.message || 'Failed to update profile');
    }
  };

  const handleSwitchToCustomer = () => {
    Alert.alert('Switch Role', 'Do you want to switch to Customer mode?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Switch',
        onPress: () => {
          dispatch(selectRoleThunk('customer'));
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
          <Text style={styles.title}>Business Profile</Text>
          <Text style={styles.subtitle}>Configure your tiffin kitchen settings and area</Text>
        </View>

        <Card style={styles.card}>
          <Text style={styles.sectionHeading}>Kitchen & Brand Details</Text>
          <Input
            label="Business / Tiffin Name *"
            placeholder="e.g. Annapurna Homemade Meals"
            value={businessName}
            onChangeText={setBusinessName}
          />

          <Input
            label="Owner / Chef Name"
            placeholder="e.g. Sunita Sharma"
            value={ownerName}
            onChangeText={setOwnerName}
          />

          <Input
            label="Phone Number"
            value={user?.phone || ''}
            placeholder="+91"
            editable={false}
            inputStyle={{ color: COLORS.textMuted }}
          />

          <Input
            label="Business Description & Speciality"
            placeholder="e.g. Desi ghee homestyle satvik food"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionHeading}>Address & Service Area</Text>
          <Input
            label="Kitchen Address"
            placeholder="Flat / Building, Street"
            value={address}
            onChangeText={setAddress}
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
            label="Service Delivery Radius (km)"
            placeholder="5.0"
            value={serviceRadiusKm}
            onChangeText={setServiceRadiusKm}
            keyboardType="numeric"
          />

          <View style={styles.switchRow}>
            <View>
              <Text style={styles.switchLabel}>Doorstep Delivery</Text>
              <Text style={styles.switchSub}>Offer delivery to customer addresses</Text>
            </View>
            <Switch
              value={deliveryAvailable}
              onValueChange={setDeliveryAvailable}
              trackColor={{ false: '#CCC', true: COLORS.secondaryLight }}
              thumbColor={deliveryAvailable ? COLORS.secondary : '#FFF'}
            />
          </View>

          <View style={[styles.switchRow, { borderBottomWidth: 0 }]}>
            <View>
              <Text style={styles.switchLabel}>Customer Self-Pickup</Text>
              <Text style={styles.switchSub}>Allow customers to pick up from kitchen</Text>
            </View>
            <Switch
              value={pickupAvailable}
              onValueChange={setPickupAvailable}
              trackColor={{ false: '#CCC', true: COLORS.secondaryLight }}
              thumbColor={pickupAvailable ? COLORS.secondary : '#FFF'}
            />
          </View>
        </Card>

        <Button
          title="Save Changes"
          onPress={handleSaveProfile}
          loading={saving}
          style={{ marginBottom: 16 }}
        />

        <Button
          title="Switch to Customer Mode"
          variant="outline"
          onPress={handleSwitchToCustomer}
          style={{ marginBottom: 12 }}
        />

        <Button
          title="Logout"
          variant="danger"
          onPress={handleLogout}
          style={{ marginBottom: 24 }}
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
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  switchSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default OwnerProfileScreen;

