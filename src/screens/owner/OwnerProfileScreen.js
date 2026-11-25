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
  KeyboardAvoidingView,
  Platform,
  Switch,
  TouchableOpacity,
  Modal,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch, useSelector } from 'react-redux';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Card } from '../../components/Card';
import { COLORS, SIZES, FONTS } from '../../constants/theme';
import { ownerApi } from '../../api/ownerApi';
import { logoutThunk, selectRoleThunk, updateUser } from '../../store/slices/authSlice';
import { formatTime12h, TIME_SLOTS } from '../../utils/timeUtils';

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
  const [openingTime, setOpeningTime] = useState('');
  const [closingTime, setClosingTime] = useState('');

  // Time Picker Modal State: 'opening' | 'closing' | null
  const [timePickerTarget, setTimePickerTarget] = useState(null);

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
          setOpeningTime(p.opening_time || '');
          setClosingTime(p.closing_time || '');
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
    const trimmedPincode = pincode.trim();
    if (trimmedPincode && !/^\d{6}$/.test(trimmedPincode)) {
      Alert.alert('Invalid Pincode', 'Pincode must be exactly 6 digits.');
      return;
    }

    if (!deliveryAvailable && !pickupAvailable) {
      Alert.alert(
        'Delivery Option Required',
        'Please keep at least one option enabled (Doorstep Delivery or Customer Self-Pickup).'
      );
      return;
    }

    setSaving(true);
    try {
      const response = await ownerApi.updateProfile({
        business_name: businessName.trim(),
        owner_name: ownerName.trim(),
        description: description.trim(),
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: trimmedPincode,
        service_radius_km: parseFloat(serviceRadiusKm) || 5,
        delivery_available: deliveryAvailable,
        pickup_available: pickupAvailable,
        opening_time: openingTime || null,
        closing_time: closingTime || null,
      });

      const updatedUserPayload = {
        name: ownerName.trim() || user?.name,
        ownerProfile: response.data,
      };
      dispatch(updateUser(updatedUserPayload));
      await AsyncStorage.setItem(
        'user_info',
        JSON.stringify({ ...user, ...updatedUserPayload })
      ).catch(() => null);

      setSaving(false);
      Alert.alert('Saved', 'Business profile updated successfully!');
    } catch (err) {
      setSaving(false);
      Alert.alert('Error', err.message || 'Failed to update profile');
    }
  };

  const handleSelectTime = (slotValue) => {
    if (timePickerTarget === 'opening') {
      setOpeningTime(slotValue);
    } else if (timePickerTarget === 'closing') {
      setClosingTime(slotValue);
    }
    setTimePickerTarget(null);
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
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
                onChangeText={(text) => setPincode(text.replace(/[^0-9]/g, '').slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
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

            {/* Kitchen Service Hours */}
            <Text style={styles.labelText}>Kitchen Operating Hours</Text>
            <View style={[styles.row, { marginBottom: 16 }]}>
              <TouchableOpacity
                style={[styles.timePickerBtn, { marginRight: 8 }]}
                onPress={() => setTimePickerTarget('opening')}
              >
                <Text style={styles.timePickerLabel}>Opening Time</Text>
                <Text style={styles.timePickerValue}>
                  {openingTime ? `⏰ ${formatTime12h(openingTime)}` : 'Select time'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.timePickerBtn, { marginLeft: 8 }]}
                onPress={() => setTimePickerTarget('closing')}
              >
                <Text style={styles.timePickerLabel}>Closing Time</Text>
                <Text style={styles.timePickerValue}>
                  {closingTime ? `⏰ ${formatTime12h(closingTime)}` : 'Select time'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.switchRow}>
              <View style={{ flex: 1, paddingRight: 12 }}>
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
              <View style={{ flex: 1, paddingRight: 12 }}>
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
      </KeyboardAvoidingView>

      {/* Time Slot Picker Modal */}
      <Modal
        visible={Boolean(timePickerTarget)}
        transparent
        animationType="slide"
        onRequestClose={() => setTimePickerTarget(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Select {timePickerTarget === 'opening' ? 'Opening' : 'Closing'} Time
              </Text>
              <TouchableOpacity onPress={() => setTimePickerTarget(null)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={TIME_SLOTS}
              keyExtractor={(item) => item.value}
              style={{ maxHeight: 340 }}
              renderItem={({ item }) => {
                const currentVal = timePickerTarget === 'opening' ? openingTime : closingTime;
                const isSelected = currentVal?.slice(0, 5) === item.value.slice(0, 5);
                return (
                  <TouchableOpacity
                    style={[styles.slotRow, isSelected && styles.slotRowActive]}
                    onPress={() => handleSelectTime(item.value)}
                  >
                    <Text style={[styles.slotText, isSelected && styles.slotTextActive]}>
                      {item.label}
                    </Text>
                    {isSelected && <Text style={styles.slotCheck}>✓</Text>}
                  </TouchableOpacity>
                );
              }}
            />

            <TouchableOpacity
              style={styles.clearSlotBtn}
              onPress={() => handleSelectTime('')}
            >
              <Text style={styles.clearSlotText}>Clear Time</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  labelText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  timePickerBtn: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderWidth: 1.2,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusMd,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  timePickerLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 3,
  },
  timePickerValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 28,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    ...FONTS.h3,
    color: COLORS.text,
  },
  modalClose: {
    fontSize: 20,
    color: COLORS.textSecondary,
    padding: 4,
  },
  slotRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: SIZES.radiusSm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  slotRowActive: {
    backgroundColor: '#FFF3E0',
  },
  slotText: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '500',
  },
  slotTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  slotCheck: {
    color: COLORS.primary,
    fontWeight: '800',
    fontSize: 16,
  },
  clearSlotBtn: {
    marginTop: 12,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: SIZES.radiusSm,
    backgroundColor: '#F5F5F5',
  },
  clearSlotText: {
    color: COLORS.textSecondary,
    fontWeight: '600',
    fontSize: 14,
  },
});

export default OwnerProfileScreen;
