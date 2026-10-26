/**
 * Owner Plans Screen
 * Allows creating and managing daily/monthly subscription plans
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Card, Badge } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { COLORS, SIZES, FONTS } from '../../constants/theme';
import { ownerApi } from '../../api/ownerApi';

export const OwnerPlansScreen = () => {
  const [plans, setPlans] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [planType, setPlanType] = useState('monthly');
  const [price, setPrice] = useState('');
  const [durationDays, setDurationDays] = useState('30');
  const [deliveryCharges, setDeliveryCharges] = useState('0');
  const [selectedMenuItemId, setSelectedMenuItemId] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [plansRes, menuRes] = await Promise.all([
        ownerApi.getPlans(),
        ownerApi.getMenuItems(),
      ]);
      setPlans(plansRes.data || []);
      setMenuItems(menuRes.data || []);
      if (menuRes.data?.length > 0) {
        setSelectedMenuItemId(menuRes.data[0].id);
      }
    } catch (err) {
      console.warn('Error fetching plans:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreatePlan = async () => {
    if (!name.trim() || !price) {
      Alert.alert('Required Fields', 'Please enter plan name and price.');
      return;
    }

    setSubmitting(true);
    try {
      const items = selectedMenuItemId
        ? [{ menu_item_id: selectedMenuItemId, quantity: 1 }]
        : [];

      await ownerApi.createPlan({
        name: name.trim(),
        description: description.trim(),
        plan_type: planType,
        price: parseFloat(price),
        duration_days: parseInt(durationDays, 10) || 30,
        delivery_charges: parseFloat(deliveryCharges) || 0,
        items,
      });

      setSubmitting(false);
      setModalVisible(false);
      setName('');
      setDescription('');
      setPrice('');
      fetchData();
      Alert.alert('Success', 'Subscription plan created!');
    } catch (err) {
      setSubmitting(false);
      Alert.alert('Error', err.message || 'Failed to create plan');
    }
  };

  const handleDeletePlan = (id, planName) => {
    Alert.alert('Confirm Delete', `Deactivate "${planName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Deactivate',
        style: 'destructive',
        onPress: async () => {
          try {
            await ownerApi.deletePlan(id);
            setPlans((prev) => prev.filter((p) => p.id !== id));
          } catch (err) {
            Alert.alert('Error', err.message || 'Failed to delete plan');
          }
        },
      },
    ]);
  };

  const renderPlan = ({ item }) => {
    return (
      <Card style={styles.planCard}>
        <View style={styles.planHeader}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.planName}>{item.name}</Text>
            <Text style={styles.planMeta}>
              {item.plan_type === 'monthly' ? '📅 Monthly Subscription' : '☀️ Daily Plan'} • {item.duration_days} Days
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.planPrice}>₹{item.price}</Text>
            <Text style={styles.perMonth}>per {item.duration_days} days</Text>
          </View>
        </View>

        {item.description ? (
          <Text style={styles.planDesc}>{item.description}</Text>
        ) : null}

        {item.planItems?.length > 0 && (
          <View style={styles.inclusionsBox}>
            <Text style={styles.inclusionsTitle}>Includes:</Text>
            {item.planItems.map((pi, idx) => (
              <Text key={idx} style={styles.inclusionItem}>
                • {pi.quantity}x {pi.menuItem?.name || 'Tiffin Meal'}
              </Text>
            ))}
          </View>
        )}

        <View style={styles.cardFooter}>
          <Text style={styles.deliveryInfo}>
            Delivery: {parseFloat(item.delivery_charges) === 0 ? 'Free' : `₹${item.delivery_charges}`}
          </Text>
          <TouchableOpacity
            onPress={() => handleDeletePlan(item.id, item.name)}
            style={styles.deleteBtn}
          >
            <Text style={styles.deleteText}>Deactivate</Text>
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Subscription Plans</Text>
          <Text style={styles.subtitle}>{plans.length} Active Plans</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.addBtnText}>+ New Plan</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={plans}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderPlan}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📅</Text>
              <Text style={styles.emptyTitle}>No Subscription Plans</Text>
              <Text style={styles.emptySubtitle}>
                Create monthly meal subscriptions to get recurring daily customers.
              </Text>
            </View>
          }
        />
      )}

      {/* Create Plan Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Subscription Plan</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalForm}>
              <Input
                label="Plan Name *"
                placeholder="e.g. Monthly Standard Lunch Plan"
                value={name}
                onChangeText={setName}
              />

              <Input
                label="Description"
                placeholder="e.g. 6 days a week wholesome homestyle lunch"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={2}
              />

              <View style={styles.twoCol}>
                <Input
                  label="Price (₹) *"
                  placeholder="2500"
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="numeric"
                  style={{ flex: 1, marginRight: 8 }}
                />
                <Input
                  label="Duration (Days)"
                  placeholder="30"
                  value={durationDays}
                  onChangeText={setDurationDays}
                  keyboardType="numeric"
                  style={{ flex: 1, marginLeft: 8 }}
                />
              </View>

              <Input
                label="Delivery Charges (₹)"
                placeholder="0 for free delivery"
                value={deliveryCharges}
                onChangeText={setDeliveryCharges}
                keyboardType="numeric"
              />

              {menuItems.length > 0 && (
                <View style={{ marginBottom: 16 }}>
                  <Text style={styles.label}>Select Primary Meal Item</Text>
                  {menuItems.map((mi) => (
                    <TouchableOpacity
                      key={mi.id}
                      onPress={() => setSelectedMenuItemId(mi.id)}
                      style={[
                        styles.menuSelectItem,
                        selectedMenuItemId === mi.id && styles.activeMenuSelect,
                      ]}
                    >
                      <Text style={[styles.menuSelectText, selectedMenuItemId === mi.id && styles.activeSelectText]}>
                        {selectedMenuItemId === mi.id ? '✓ ' : '○ '} {mi.name} (₹{mi.price})
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Button
                title="Save Subscription Plan"
                onPress={handleCreatePlan}
                loading={submitting}
                style={{ marginTop: 10 }}
              />
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    ...FONTS.h2,
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  addBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: SIZES.radiusMd,
  },
  addBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  planCard: {
    marginBottom: 14,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  planName: {
    ...FONTS.h3,
    color: COLORS.text,
  },
  planMeta: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  planPrice: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primary,
  },
  perMonth: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  planDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 8,
    lineHeight: 18,
  },
  inclusionsBox: {
    backgroundColor: '#F9FAFB',
    padding: 10,
    borderRadius: SIZES.radiusSm,
    marginTop: 10,
  },
  inclusionsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  inclusionItem: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginVertical: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  deliveryInfo: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  deleteBtn: {
    padding: 6,
  },
  deleteText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: '600',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    ...FONTS.h3,
    color: COLORS.text,
  },
  emptySubtitle: {
    ...FONTS.subtitle,
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: SIZES.radiusLg,
    borderTopRightRadius: SIZES.radiusLg,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    ...FONTS.h3,
  },
  closeBtn: {
    fontSize: 20,
    color: COLORS.textSecondary,
    padding: 4,
  },
  modalForm: {
    padding: 20,
    paddingBottom: 40,
  },
  twoCol: {
    flexDirection: 'row',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  menuSelectItem: {
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusSm,
    marginBottom: 6,
  },
  activeMenuSelect: {
    borderColor: COLORS.primary,
    backgroundColor: '#FFF8F2',
  },
  menuSelectText: {
    fontSize: 14,
    color: COLORS.text,
  },
  activeSelectText: {
    fontWeight: '700',
    color: COLORS.primary,
  },
});

export default OwnerPlansScreen;

