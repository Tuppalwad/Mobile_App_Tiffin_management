/**
 * Customer Orders Screen
 * Shows order history with live status timeline tracking
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Card, Badge } from '../../components/Card';
import { COLORS, SIZES, FONTS } from '../../constants/theme';
import { customerApi } from '../../api/customerApi';
import { useNotificationAutoRefresh } from '../../services/notificationEvents';

const STATUS_STEPS = [
  { key: 'order_received', label: 'Received' },
  { key: 'preparing', label: 'Preparing' },
  { key: 'tiffin_ready', label: 'Ready' },
  { key: 'out_for_delivery', label: 'Out for Delivery' },
  { key: 'delivered', label: 'Delivered' },
];

export const CustomerOrdersScreen = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      const response = await customerApi.getOrders();
      setOrders(response.data.items || []);
    } catch (err) {
      console.warn('Error fetching customer orders:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Fetch orders when user navigates to this screen
  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, [fetchOrders])
  );

  // Real-time auto refresh when push notification arrives (e.g. preparing -> ready -> out_for_delivery)
  useNotificationAutoRefresh(['order', 'ORDER_STATUS_UPDATED', 'ORDER_CANCELLED', 'NEW_ORDER'], fetchOrders);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const handleCancelOrder = (orderId) => {
    Alert.alert('Cancel Order', 'Are you sure you want to cancel this order?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            await customerApi.cancelOrder(orderId);
            fetchOrders();
            Alert.alert('Order Cancelled', 'Your order was successfully cancelled.');
          } catch (err) {
            Alert.alert('Cannot Cancel', err.message || 'Order is already being prepared.');
          }
        },
      },
    ]);
  };

  const getStatusIndex = (status) => {
    return STATUS_STEPS.findIndex((s) => s.key === status);
  };

  const renderOrder = ({ item }) => {
    const currentStepIdx = getStatusIndex(item.order_status);
    const isCancelled = item.order_status === 'cancelled';

    return (
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.orderNumber}>#{item.order_number}</Text>
            <Text style={styles.providerName}>
              From: {item.owner?.ownerProfile?.business_name || 'Tiffin Provider'}
            </Text>
          </View>
          <Badge text={item.order_status} status={item.order_status} />
        </View>

        {/* Live Status Tracker Bar (if not cancelled) */}
        {!isCancelled && (
          <View style={styles.trackerContainer}>
            <View style={styles.stepLabelsRow}>
              {STATUS_STEPS.map((step, idx) => {
                const isPassed = idx <= currentStepIdx;
                const isCurrent = idx === currentStepIdx;
                return (
                  <View key={step.key} style={styles.stepItem}>
                    <View
                      style={[
                        styles.stepDot,
                        isPassed && styles.stepDotPassed,
                        isCurrent && styles.stepDotCurrent,
                      ]}
                    >
                      <Text style={styles.stepDotText}>{isPassed ? '✓' : idx + 1}</Text>
                    </View>
                    <Text
                      style={[
                        styles.stepLabel,
                        isPassed && styles.stepLabelPassed,
                        isCurrent && styles.stepLabelCurrent,
                      ]}
                      numberOfLines={1}
                    >
                      {step.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Food Items */}
        <View style={styles.itemsBox}>
          {item.items?.map((fi, idx) => (
            <View key={idx} style={styles.itemRow}>
              <Text style={styles.itemText}>
                {fi.quantity}x {fi.item_name}
              </Text>
              <Text style={styles.itemPrice}>₹{fi.total_price}</Text>
            </View>
          ))}
        </View>

        {/* Order Details & Total */}
        <View style={styles.footerRow}>
          <Text style={styles.orderDate}>
            {item.order_date} • {item.meal_timing?.toUpperCase()} • {item.delivery_type?.toUpperCase()}
          </Text>
          <Text style={styles.grandTotal}>₹{item.total_amount}</Text>
        </View>

        {/* Cancel button if still received */}
        {item.order_status === 'order_received' && (
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => handleCancelOrder(item.id)}
          >
            <Text style={styles.cancelText}>Cancel Order</Text>
          </TouchableOpacity>
        )}
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderOrder}
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>My Orders</Text>
            <Text style={styles.subtitle}>Track your daily meal deliveries in real time</Text>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📦</Text>
              <Text style={styles.emptyTitle}>No Orders Yet</Text>
              <Text style={styles.emptySubtitle}>
                Your daily and extra food orders will show up here.
              </Text>
            </View>
          )
        }
      />
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
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderNumber: {
    ...FONTS.h3,
    color: COLORS.text,
  },
  providerName: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  trackerContainer: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: SIZES.radiusSm,
    marginVertical: 8,
  },
  stepLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
  },
  stepDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stepDotPassed: {
    backgroundColor: COLORS.secondary,
  },
  stepDotCurrent: {
    backgroundColor: COLORS.primary,
  },
  stepDotText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
  },
  stepLabel: {
    fontSize: 9,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  stepLabelPassed: {
    color: COLORS.secondary,
    fontWeight: '700',
  },
  stepLabelCurrent: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  itemsBox: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.divider,
    paddingVertical: 10,
    marginVertical: 10,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  itemText: {
    fontSize: 14,
    color: COLORS.text,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  grandTotal: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
  },
  cancelBtn: {
    marginTop: 12,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.danger,
    borderRadius: SIZES.radiusSm,
  },
  cancelText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 50,
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
  },
});

export default CustomerOrdersScreen;

