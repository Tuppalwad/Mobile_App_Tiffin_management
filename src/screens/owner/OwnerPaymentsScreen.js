/**
 * Owner Payments Screen
 * Track collections, cash vs online, record payments, and view customer balances.
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
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Card, Badge } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { COLORS, SIZES, FONTS } from '../../constants/theme';
import { ownerApi } from '../../api/ownerApi';
import { useNotificationAutoRefresh } from '../../services/notificationEvents';

export const OwnerPaymentsScreen = () => {
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash' | 'upi' | 'online'
  const [paymentPurpose, setPaymentPurpose] = useState('subscription');
  const [notes, setNotes] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [paymentsRes, summaryRes, customersRes] = await Promise.all([
        ownerApi.getPayments(),
        ownerApi.getPaymentSummary(),
        ownerApi.getCustomers(),
      ]);
      setPayments(paymentsRes.data.items || []);
      setSummary(summaryRes.data || null);
      setCustomers(customersRes.data || []);
      if (customersRes.data?.length > 0) {
        setSelectedCustomerId(customersRes.data[0].customer_id || customersRes.data[0].id);
      }
    } catch (err) {
      console.warn('Error fetching payments:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real-time auto refresh when payments are recorded
  useNotificationAutoRefresh(['payment', 'PAYMENT_RECORDED'], fetchData);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleRecordPayment = async () => {
    if (!selectedCustomerId || !amount) {
      Alert.alert('Required Fields', 'Please select customer and enter amount.');
      return;
    }

    setSubmitting(true);
    try {
      await ownerApi.recordPayment({
        customer_id: selectedCustomerId,
        amount: parseFloat(amount),
        payment_method: paymentMethod,
        payment_purpose: paymentPurpose,
        payment_status: 'paid',
        notes: notes.trim(),
      });

      setSubmitting(false);
      setModalVisible(false);
      setAmount('');
      setNotes('');
      fetchData();
      Alert.alert('Payment Recorded', `Recorded ₹${amount} received from customer.`);
    } catch (err) {
      setSubmitting(false);
      Alert.alert('Error', err.message || 'Failed to record payment');
    }
  };

  const renderPayment = ({ item }) => {
    return (
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.customerName}>{item.customer?.name || 'Customer'}</Text>
            <Text style={styles.paymentDate}>{item.payment_date} • {item.payment_purpose?.toUpperCase()}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.amount}>₹{item.amount}</Text>
            <Badge text={item.payment_method} status="default" style={{ marginTop: 4 }} />
          </View>
        </View>

        {item.notes ? (
          <Text style={styles.notesText}>Note: {item.notes}</Text>
        ) : null}
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.sumLabel}>💵 Cash Received</Text>
          <Text style={styles.sumVal}>₹{summary?.cashCollections || 0}</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.sumLabel}>📱 UPI / Online</Text>
          <Text style={styles.sumVal}>₹{summary?.onlineCollections || 0}</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.sumLabel}>⏳ Pending</Text>
          <Text style={[styles.sumVal, { color: COLORS.warning }]}>
            ₹{summary?.pendingCollections || 0}
          </Text>
        </View>
      </View>

      <View style={styles.actionHeader}>
        <Text style={styles.sectionTitle}>Payment Transactions</Text>
        <TouchableOpacity
          style={styles.recordBtn}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.recordBtnText}>+ Record Cash/UPI</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={payments}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderPayment}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>💳</Text>
              <Text style={styles.emptyTitle}>No Payments Recorded</Text>
              <Text style={styles.emptySubtitle}>
                Record cash or UPI payments collected directly from your tiffin subscribers.
              </Text>
            </View>
          }
        />
      )}

      {/* Record Payment Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record Customer Payment</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalForm}>
              {/* Customer Selector */}
              {customers.length > 0 && (
                <View style={{ marginBottom: 16 }}>
                  <Text style={styles.label}>Select Customer *</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {customers.map((c) => {
                      const custId = c.customer_id || c.customer?.id || c.id;
                      const custName = c.customer?.name || 'Customer';
                      return (
                        <TouchableOpacity
                          key={custId}
                          onPress={() => setSelectedCustomerId(custId)}
                          style={[
                            styles.custChip,
                            selectedCustomerId === custId && styles.activeCustChip,
                          ]}
                        >
                          <Text
                            style={[
                              styles.custChipText,
                              selectedCustomerId === custId && styles.activeCustText,
                            ]}
                          >
                            {custName}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              <Input
                label="Amount Collected (₹) *"
                placeholder="e.g. 2999"
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
              />

              {/* Payment Method */}
              <Text style={styles.label}>Payment Method</Text>
              <View style={styles.methodRow}>
                {['cash', 'upi', 'online'].map((m) => (
                  <TouchableOpacity
                    key={m}
                    onPress={() => setPaymentMethod(m)}
                    style={[
                      styles.methodBtn,
                      paymentMethod === m && styles.activeMethodBtn,
                    ]}
                  >
                    <Text
                      style={[
                        styles.methodText,
                        paymentMethod === m && styles.activeMethodText,
                      ]}
                    >
                      {m.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Purpose */}
              <Text style={styles.label}>Purpose</Text>
              <View style={styles.methodRow}>
                {['subscription', 'extra_order', 'other'].map((p) => (
                  <TouchableOpacity
                    key={p}
                    onPress={() => setPaymentPurpose(p)}
                    style={[
                      styles.methodBtn,
                      paymentPurpose === p && styles.activeMethodBtn,
                    ]}
                  >
                    <Text
                      style={[
                        styles.methodText,
                        paymentPurpose === p && styles.activeMethodText,
                      ]}
                    >
                      {p.replace(/_/g, ' ').toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Input
                label="Optional Notes"
                placeholder="e.g. Received in cash at doorstep for May month"
                value={notes}
                onChangeText={setNotes}
              />

              <Button
                title="Save Payment"
                onPress={handleRecordPayment}
                loading={submitting}
                style={{ marginTop: 12 }}
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
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  summaryCard: {
    flex: 1,
    padding: 10,
    backgroundColor: '#F8F9FA',
    borderRadius: SIZES.radiusSm,
    marginHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sumLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  sumVal: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  actionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    ...FONTS.h3,
    color: COLORS.text,
  },
  recordBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: SIZES.radiusSm,
  },
  recordBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  customerName: {
    ...FONTS.h3,
    color: COLORS.text,
  },
  paymentDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  amount: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.secondary,
  },
  notesText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
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
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  custChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: SIZES.radiusFull,
    backgroundColor: COLORS.chipBg,
    marginRight: 8,
  },
  activeCustChip: {
    backgroundColor: COLORS.primary,
  },
  custChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  activeCustText: {
    color: '#FFF',
  },
  methodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  methodBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: SIZES.radiusSm,
    backgroundColor: COLORS.chipBg,
    marginHorizontal: 4,
  },
  activeMethodBtn: {
    backgroundColor: COLORS.primary,
  },
  methodText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  activeMethodText: {
    color: '#FFF',
  },
});

export default OwnerPaymentsScreen;

