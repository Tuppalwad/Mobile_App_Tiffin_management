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
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Card, Badge } from '../../components/Card';
import { COLORS, SIZES, FONTS } from '../../constants/theme';
import { ownerApi } from '../../api/ownerApi';
import { useNotificationAutoRefresh } from '../../services/notificationEvents';

const STATUS_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Received', value: 'order_received' },
  { label: 'Preparing', value: 'preparing' },
  { label: 'Ready', value: 'tiffin_ready' },
  { label: 'Out for Delivery', value: 'out_for_delivery' },
  { label: 'Delivered', value: 'delivered' },
  { label: 'Cancelled', value: 'cancelled' },
];

const QUICK_CANCEL_REASONS = [
  'Customer ordered too late ⏰',
  'Kitchen closed for the day 🚪',
  'Out of meal ingredients 🥘',
  'Delivery address unserviceable 📍',
];

export const OwnerOrdersScreen = () => {
  const [orders, setOrders] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Cancellation Modal State
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancellingOrder, setCancellingOrder] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

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

  // Auto-fetch latest orders whenever owner focuses/opens the Orders page
  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, [fetchOrders])
  );

  // Real-time auto refresh when customer places order or cancels
  useNotificationAutoRefresh(['order', 'NEW_ORDER', 'ORDER_CANCELLED', 'ORDER_STATUS_UPDATED'], fetchOrders);

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

  const handleOpenCancelModal = (order) => {
    setCancellingOrder(order);
    setCancelReason('');
    setCancelModalVisible(true);
  };

  const handleConfirmCancel = async () => {
    if (!cancellingOrder) return;
    setIsCancelling(true);
    try {
      await ownerApi.updateOrderStatus(cancellingOrder.id, 'cancelled', {
        reason: cancelReason.trim() || undefined,
      });
      setCancelModalVisible(false);
      const orderNum = cancellingOrder.order_number;
      setCancellingOrder(null);
      setCancelReason('');
      fetchOrders();
      Alert.alert(
        'Order Cancelled',
        `Order #${orderNum} has been cancelled and customer notified via push notification.`
      );
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to cancel order');
    } finally {
      setIsCancelling(false);
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

        {/* Notes / Special Instructions / Cancel Reason */}
        {item.notes ? (
          <View style={styles.notesBox}>
            <Text style={styles.notesText}>📝 {item.notes}</Text>
          </View>
        ) : null}

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
              style={[styles.statusBtn, { backgroundColor: '#FF9800', flex: 1, marginRight: 8 }]}
              onPress={() => handleUpdateStatus(item.id, 'preparing')}
            >
              <Text style={styles.statusBtnText}>Start Preparing 🍲</Text>
            </TouchableOpacity>
          )}

          {item.order_status === 'preparing' && (
            <TouchableOpacity
              style={[styles.statusBtn, { backgroundColor: '#1976D2', flex: 1, marginRight: 8 }]}
              onPress={() => handleUpdateStatus(item.id, 'tiffin_ready')}
            >
              <Text style={styles.statusBtnText}>Tiffin Ready 🍱</Text>
            </TouchableOpacity>
          )}

          {item.order_status === 'tiffin_ready' && (
            <TouchableOpacity
              style={[styles.statusBtn, { backgroundColor: '#0288D1', flex: 1, marginRight: 8 }]}
              onPress={() => handleUpdateStatus(item.id, 'out_for_delivery')}
            >
              <Text style={styles.statusBtnText}>Out for Delivery 🛵</Text>
            </TouchableOpacity>
          )}

          {item.order_status === 'out_for_delivery' && (
            <TouchableOpacity
              style={[styles.statusBtn, { backgroundColor: '#2E7D32', flex: 1, marginRight: 8 }]}
              onPress={() => handleUpdateStatus(item.id, 'delivered')}
            >
              <Text style={styles.statusBtnText}>Mark Delivered ✅</Text>
            </TouchableOpacity>
          )}

          {item.order_status !== 'delivered' && item.order_status !== 'cancelled' && (
            <TouchableOpacity
              style={[
                styles.cancelBtn,
                ['order_received', 'preparing', 'tiffin_ready', 'out_for_delivery'].includes(item.order_status)
                  ? { flex: 0.8 }
                  : { flex: 1 }
              ]}
              onPress={() => handleOpenCancelModal(item)}
            >
              <Text style={styles.cancelBtnText}>Cancel ❌</Text>
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
      {/* Cancellation Modal with Optional Reason */}
      <Modal
        visible={cancelModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => !isCancelling && setCancelModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cancel Order ❌</Text>
              <Text style={styles.modalSubtitle}>
                Order #{cancellingOrder?.order_number} • {cancellingOrder?.customer?.name || 'Customer'}
              </Text>
            </View>

            <Text style={styles.modalPrompt}>
              Reason for cancellation (optional):
            </Text>

            {/* Quick chips */}
            <View style={styles.quickChipsContainer}>
              {QUICK_CANCEL_REASONS.map((r, i) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.reasonChip,
                    cancelReason === r && styles.activeReasonChip,
                  ]}
                  onPress={() => setCancelReason(r)}
                >
                  <Text
                    style={[
                      styles.reasonChipText,
                      cancelReason === r && styles.activeReasonChipText,
                    ]}
                  >
                    {r}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Custom reason input */}
            <TextInput
              style={styles.reasonInput}
              placeholder="Or type a custom reason..."
              placeholderTextColor={COLORS.textMuted}
              value={cancelReason}
              onChangeText={setCancelReason}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.keepBtn}
                onPress={() => setCancelModalVisible(false)}
                disabled={isCancelling}
              >
                <Text style={styles.keepBtnText}>Keep Order</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmCancelBtn}
                onPress={handleConfirmCancel}
                disabled={isCancelling}
              >
                {isCancelling ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.confirmCancelBtnText}>Cancel Order</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  notesBox: {
    backgroundColor: '#FFF3E0',
    padding: 8,
    borderRadius: 6,
    marginBottom: 10,
  },
  notesText: {
    fontSize: 13,
    color: '#E65100',
    fontWeight: '500',
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
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
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
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: SIZES.radiusSm,
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#FFCDD2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: '#D32F2F',
    fontWeight: '700',
    fontSize: 13,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  modalSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  modalPrompt: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  quickChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  reasonChip: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginRight: 6,
    marginBottom: 6,
  },
  activeReasonChip: {
    backgroundColor: '#FFEBEE',
    borderColor: '#E53935',
  },
  reasonChipText: {
    fontSize: 12,
    color: COLORS.text,
  },
  activeReasonChipText: {
    color: '#D32F2F',
    fontWeight: '600',
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: COLORS.text,
    minHeight: 64,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
  },
  keepBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    marginRight: 8,
  },
  keepBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  confirmCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#D32F2F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmCancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
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

