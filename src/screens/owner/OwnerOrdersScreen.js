/**
 * Owner Orders Screen
 * Allows viewing all daily orders, filtering by status, and updating status
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  PanResponder,
} from 'react-native';
import { CustomAlert } from "../../components/CustomAlert";
import {
  User,
  Phone,
  MapPin,
  MessageCircle,
  Truck,
  Store,
  FileText,
  Inbox,
  Check,
  X,
} from 'lucide-react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Card, Badge } from '../../components/Card';
import { KeyboardModalView } from '../../components/KeyboardModalView';
import { COLORS, SIZES, FONTS } from '../../constants/theme';
import { ownerApi } from '../../api/ownerApi';
import { chatApi } from '../../api/chatApi';
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
  const navigation = useNavigation();
  const [orders, setOrders] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const filterListRef = useRef(null);
  const selectedFilterRef = useRef(selectedFilter);
  useEffect(() => {
    selectedFilterRef.current = selectedFilter;
    const idx = STATUS_FILTERS.findIndex((f) => f.value === selectedFilter);
    if (idx >= 0 && filterListRef.current) {
      filterListRef.current.scrollToIndex({
        index: idx,
        animated: true,
        viewPosition: 0.5,
      });
    }
  }, [selectedFilter]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > 20 &&
        Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5,
      onPanResponderRelease: (_, gestureState) => {
        const currentIndex = STATUS_FILTERS.findIndex(
          (f) => f.value === selectedFilterRef.current
        );
        if (currentIndex === -1) return;

        if (gestureState.dx < -50 && currentIndex < STATUS_FILTERS.length - 1) {
          setSelectedFilter(STATUS_FILTERS[currentIndex + 1].value);
        } else if (gestureState.dx > 50 && currentIndex > 0) {
          setSelectedFilter(STATUS_FILTERS[currentIndex - 1].value);
        }
      },
    })
  ).current;

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
      CustomAlert.alert('Status Updated', `Order marked as ${newStatus.replace(/_/g, ' ')}`);
      fetchOrders();
    } catch (err) {
      CustomAlert.alert('Error', err.message || 'Failed to update order status');
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
      CustomAlert.alert(
        'Order Cancelled',
        `Order #${orderNum} has been cancelled and customer notified via push notification.`
      );
    } catch (err) {
      CustomAlert.alert('Error', err.message || 'Failed to cancel order');
    } finally {
      setIsCancelling(false);
    }
  };

  const renderOrderItem = ({ item }) => {
    const isPickup = item.delivery_type === 'pickup';
    const customerDeliveryAddress =
      item.delivery_address ||
      item.customer?.customerProfile?.delivery_address ||
      item.customer?.customerProfile?.address ||
      '';
    const canCancelOrder = ['order_received', 'confirmed', 'preparing'].includes(item.order_status);

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
          <View style={styles.customerTopRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <User size={14} color={COLORS.text} />
              <Text style={styles.customerName}>{item.customer?.name || 'Customer'}</Text>
            </View>
            <View style={[styles.deliveryTypePill, isPickup ? styles.pickupPill : styles.deliveryPill, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
              {isPickup ? (
                <Store size={12} color={COLORS.primary} />
              ) : (
                <Truck size={12} color={COLORS.secondary} />
              )}
              <Text style={[styles.deliveryTypeText, isPickup ? styles.pickupPillText : styles.deliveryPillText]}>
                {isPickup ? 'Kitchen Pickup' : 'Doorstep Delivery'}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
            <Phone size={12} color={COLORS.textSecondary} />
            <Text style={styles.customerPhone}>{item.customer?.phone}</Text>
          </View>
          {!isPickup && customerDeliveryAddress ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
              <MapPin size={12} color={COLORS.textSecondary} />
              <Text style={[styles.customerAddress, { flex: 1 }]}>{customerDeliveryAddress}</Text>
            </View>
          ) : null}
          {item.customer_id && (
            <TouchableOpacity
              style={[styles.chatCustomerBtn, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }]}
              onPress={async () => {
                try {
                  const res = await chatApi.startDirectChat(item.customer_id);
                  if (res?.data?.id) {
                    navigation.navigate('ChatRoom', {
                      conversationId: res.data.id,
                      title: item.customer?.name || 'Customer',
                      type: 'direct',
                      peer: { id: item.customer_id, displayName: item.customer?.name || 'Customer' },
                    });
                  }
                } catch (err) {
                  CustomAlert.alert('Chat Unavailable', err.message || 'Could not start chat');
                }
              }}
            >
              <MessageCircle size={14} color={COLORS.primary} />
              <Text style={styles.chatCustomerBtnText}>Chat with Customer</Text>
            </TouchableOpacity>
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
          <View style={[styles.notesBox, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
            <FileText size={13} color={COLORS.textSecondary} />
            <Text style={[styles.notesText, { flex: 1 }]}>{item.notes}</Text>
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
              style={[styles.statusBtn, { backgroundColor: '#FF9800', flex: 1, marginRight: canCancelOrder ? 8 : 0 }]}
              onPress={() => handleUpdateStatus(item.id, 'preparing')}
            >
              <Text style={styles.statusBtnText}>Start Preparing</Text>
            </TouchableOpacity>
          )}

          {item.order_status === 'preparing' && (
            <TouchableOpacity
              style={[styles.statusBtn, { backgroundColor: '#1976D2', flex: 1, marginRight: canCancelOrder ? 8 : 0 }]}
              onPress={() => handleUpdateStatus(item.id, 'tiffin_ready')}
            >
              <Text style={styles.statusBtnText}>Tiffin Ready</Text>
            </TouchableOpacity>
          )}

          {item.order_status === 'tiffin_ready' && !isPickup && (
            <TouchableOpacity
              style={[styles.statusBtn, { backgroundColor: '#0288D1', flex: 1 }]}
              onPress={() => handleUpdateStatus(item.id, 'out_for_delivery')}
            >
              <Text style={styles.statusBtnText}>Out for Delivery</Text>
            </TouchableOpacity>
          )}

          {item.order_status === 'tiffin_ready' && isPickup && (
            <TouchableOpacity
              style={[styles.statusBtn, { backgroundColor: '#2E7D32', flex: 1, flexDirection: 'row', justifyContent: 'center', gap: 5 }]}
              onPress={() => handleUpdateStatus(item.id, 'delivered')}
            >
              <Check size={15} color="#FFF" />
              <Text style={styles.statusBtnText}>Mark Picked Up</Text>
            </TouchableOpacity>
          )}

          {item.order_status === 'out_for_delivery' && (
            <TouchableOpacity
              style={[styles.statusBtn, { backgroundColor: '#2E7D32', flex: 1, flexDirection: 'row', justifyContent: 'center', gap: 5 }]}
              onPress={() => handleUpdateStatus(item.id, 'delivered')}
            >
              <Check size={15} color="#FFF" />
              <Text style={styles.statusBtnText}>Mark Delivered</Text>
            </TouchableOpacity>
          )}

          {canCancelOrder && (
            <TouchableOpacity
              style={[styles.cancelBtn, { flex: 0.8, flexDirection: 'row', justifyContent: 'center', gap: 4 }]}
              onPress={() => handleOpenCancelModal(item)}
            >
              <X size={14} color={COLORS.danger} />
              <Text style={styles.cancelBtnText}>Cancel</Text>
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
          ref={filterListRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          data={STATUS_FILTERS}
          keyExtractor={(item) => item.value}
          onScrollToIndexFailed={() => {}}
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

      <View style={{ flex: 1 }} {...panResponder.panHandlers}>
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
                <Inbox size={48} color={COLORS.textMuted} style={{ marginBottom: 12 }} />
                <Text style={styles.emptyTitle}>No Orders Found</Text>
                <Text style={styles.emptySubtitle}>
                  {selectedFilter ? 'No orders match this status filter.' : 'You have no customer orders right now.'}
                </Text>
              </View>
            }
          />
        )}
      </View>
      {/* Cancellation Modal with Optional Reason */}
      <Modal
        visible={cancelModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => !isCancelling && setCancelModalVisible(false)}
      >
        <KeyboardModalView style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cancel Order</Text>
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
        </KeyboardModalView>
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
  customerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 2,
  },
  deliveryTypePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  pickupPill: {
    backgroundColor: '#E3F2FD',
  },
  deliveryPill: {
    backgroundColor: '#E8F5E9',
  },
  deliveryTypeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  pickupPillText: {
    color: '#1565C0',
  },
  deliveryPillText: {
    color: '#2E7D32',
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
  chatCustomerBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: SIZES.radiusSm,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  chatCustomerBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
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

