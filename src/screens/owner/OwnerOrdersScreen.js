/**
 * Owner Orders Screen
 * Allows viewing all daily orders, filtering by status, and updating status
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
import { Card, Badge } from '../../components/Card';
import { COLORS, SIZES, FONTS } from '../../constants/theme';
import { ownerApi } from '../../api/ownerApi';

const STATUS_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Received', value: 'order_received' },
  { label: 'Preparing', value: 'preparing' },
  { label: 'Ready', value: 'tiffin_ready' },
  { label: 'Out for Delivery', value: 'out_for_delivery' },
  { label: 'Delivered', value: 'delivered' },
];

export const OwnerOrdersScreen = () => {
  const [orders, setOrders] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      const response = await ownerApi.getOrders({
        status: selectedFilter || undefined,
      });
      setOrders(response.data.items || []);
    } catch (err) {
      console.warn('Error fetching orders:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      await ownerApi.updateOrderStatus(orderId, newStatus);
      Alert.alert('Status Updated', `Order marked as ${newStatus.replace(/_/g, ' ')}`);
      fetchOrders();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to update order status');
    }
  };

  const renderOrderItem = ({ item }) => {
    return (
      <Card style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <View>
            <Text style={styles.orderNumber}>#{item.order_number}</Text>
            <Text style={styles.orderDate}>{item.order_date} • {item.meal_timing?.toUpperCase()}</Text>
          </View>
          <Badge text={item.order_status} status={item.order_status} />
        </View>

        {/* Customer Info */}
        <View style={styles.customerBox}>
          <Text style={styles.customerName}>👤 {item.customer?.name || 'Customer'}</Text>
          <Text style={styles.customerPhone}>📞 {item.customer?.phone}</Text>
          {item.delivery_address && (
            <Text style={styles.customerAddress}>📍 {item.delivery_address}</Text>
          )}
        </View>

        {/* Items List */}
        <View style={styles.itemsBox}>
          {item.orderItems?.map((foodItem, idx) => (
            <View key={idx} style={styles.itemRow}>
              <Text style={styles.itemText}>
                {foodItem.quantity}x {foodItem.item_name}
              </Text>
              <Text style={styles.itemPrice}>₹{foodItem.total_price}</Text>
            </View>
          ))}
        </View>

        {/* Total & Payment Status */}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Amount:</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.totalPrice}>₹{item.total_amount}</Text>
            <Badge
              text={item.payment_status}
              status={item.payment_status}
              style={{ marginLeft: 8 }}
            />
          </View>
        </View>

        {/* Quick Status Action Buttons */}
        <View style={styles.statusButtonsRow}>
          {item.order_status === 'order_received' && (
            <TouchableOpacity
              style={[styles.statusBtn, { backgroundColor: '#FF9800' }]}
              onPress={() => handleUpdateStatus(item.id, 'preparing')}
            >
              <Text style={styles.statusBtnText}>Start Preparing 🍲</Text>
            </TouchableOpacity>
          )}

          {item.order_status === 'preparing' && (
            <TouchableOpacity
              style={[styles.statusBtn, { backgroundColor: '#1976D2' }]}
              onPress={() => handleUpdateStatus(item.id, 'tiffin_ready')}
            >
              <Text style={styles.statusBtnText}>Tiffin Ready 🍱</Text>
            </TouchableOpacity>
          )}

          {item.order_status === 'tiffin_ready' && (
            <TouchableOpacity
              style={[styles.statusBtn, { backgroundColor: '#0288D1' }]}
              onPress={() => handleUpdateStatus(item.id, 'out_for_delivery')}
            >
              <Text style={styles.statusBtnText}>Out for Delivery 🛵</Text>
            </TouchableOpacity>
          )}

          {item.order_status === 'out_for_delivery' && (
            <TouchableOpacity
              style={[styles.statusBtn, { backgroundColor: '#2E7D32' }]}
              onPress={() => handleUpdateStatus(item.id, 'delivered')}
            >
              <Text style={styles.statusBtnText}>Mark Delivered ✅</Text>
            </TouchableOpacity>
          )}
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Filter Horizontal Scroll */}
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={STATUS_FILTERS}
          keyExtractor={(item) => item.value}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setSelectedFilter(item.value)}
              style={[
                styles.filterChip,
                selectedFilter === item.value && styles.activeFilterChip,
              ]}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedFilter === item.value && styles.activeFilterText,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderOrderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyTitle}>No Orders Found</Text>
              <Text style={styles.emptySubtitle}>
                {selectedFilter ? 'No orders match this status filter.' : 'You have no customer orders right now.'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  filterContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: SIZES.radiusFull,
    backgroundColor: COLORS.chipBg,
    marginRight: 8,
  },
  activeFilterChip: {
    backgroundColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  activeFilterText: {
    color: '#FFF',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  orderCard: {
    marginBottom: 16,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderNumber: {
    ...FONTS.h3,
    color: COLORS.text,
  },
  orderDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  customerBox: {
    backgroundColor: '#F9FAFB',
    padding: 10,
    borderRadius: SIZES.radiusSm,
    marginBottom: 12,
  },
  customerName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  customerPhone: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  customerAddress: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  itemsBox: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.divider,
    paddingVertical: 10,
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 3,
  },
  itemText: {
    fontSize: 14,
    color: COLORS.text,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  totalPrice: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
  },
  statusButtonsRow: {
    marginTop: 4,
  },
  statusBtn: {
    paddingVertical: 10,
    borderRadius: SIZES.radiusSm,
    alignItems: 'center',
  },
  statusBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
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
});

export default OwnerOrdersScreen;

