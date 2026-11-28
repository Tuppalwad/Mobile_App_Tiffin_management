/**
 * Customer Subscriptions & Skip Tiffin Screen
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
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { CustomAlert } from "../../components/CustomAlert";
import { ChefHat, CalendarDays, PauseCircle, X, Info } from 'lucide-react-native';
import { Card, Badge } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { KeyboardModalView } from '../../components/KeyboardModalView';
import { COLORS, SIZES, FONTS } from '../../constants/theme';
import { customerApi } from '../../api/customerApi';
import { useNotificationAutoRefresh } from '../../services/notificationEvents';

export const CustomerSubscriptionsScreen = () => {
  const getTodayStr = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const [subscriptions, setSubscriptions] = useState([]);
  const [skips, setSkips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedSub, setSelectedSub] = useState(null);

  // Skip Form State
  const [skipMode, setSkipMode] = useState('today'); // 'today' | 'range'
  const [startDate, setStartDate] = useState(getTodayStr());
  const [endDate, setEndDate] = useState(getTodayStr());
  const [reason, setReason] = useState('Out of town / not needed today');
  const [submitting, setSubmitting] = useState(false);

  // Cancel Request Modal State
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelSub, setCancelSub] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [subsRes, skipsRes] = await Promise.all([
        customerApi.getSubscriptions(),
        customerApi.getSkips(),
      ]);
      setSubscriptions(subsRes.data || []);
      setSkips(skipsRes.data || []);
    } catch (err) {
      console.warn('Subscriptions fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real-time auto refresh when owner approves/rejects skip or updates subscription
  useNotificationAutoRefresh(['subscription', 'skip', 'SKIP_STATUS_UPDATED', 'SUBSCRIPTION_STATUS_UPDATED'], fetchData);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleOpenSkipModal = (sub) => {
    const today = getTodayStr();
    setSelectedSub(sub);
    setSkipMode('today');
    setStartDate(today);
    setEndDate(today);
    setReason('Out of town / not needed today');
    setModalVisible(true);
  };

  const handleSubmitSkip = async () => {
    if (!selectedSub) return;

    const today = getTodayStr();
    const effectiveStart = skipMode === 'today' ? today : startDate.trim();
    const effectiveEnd = skipMode === 'today' ? today : endDate.trim();
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

    if (!dateRegex.test(effectiveStart) || !dateRegex.test(effectiveEnd)) {
      CustomAlert.alert('Invalid Date', 'Please enter dates in YYYY-MM-DD format.');
      return;
    }

    const startMs = Date.parse(`${effectiveStart}T00:00:00Z`);
    const endMs = Date.parse(`${effectiveEnd}T00:00:00Z`);
    if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
      CustomAlert.alert('Invalid Date', 'Please enter valid calendar dates.');
      return;
    }

    if (effectiveStart < today || effectiveEnd < today) {
      CustomAlert.alert('Invalid Date', 'Past dates cannot be selected.');
      return;
    }

    if (effectiveEnd < effectiveStart) {
      CustomAlert.alert('Invalid Range', 'End date must be on or after start date.');
      return;
    }

    const diffDays = Math.floor((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1;
    const maxSkipDays = selectedSub?.owner?.ownerProfile?.max_skip_days || 7;
    if (diffDays > maxSkipDays) {
      CustomAlert.alert(
        'Range Too Long',
        `This kitchen allows skipping at most ${maxSkipDays} day(s) at a time.`
      );
      return;
    }

    setSubmitting(true);
    try {
      await customerApi.requestSkipTiffin({
        subscription_id: selectedSub.id,
        start_date: effectiveStart,
        end_date: effectiveEnd,
        reason: reason.trim(),
      });

      setSubmitting(false);
      setModalVisible(false);
      fetchData();
      CustomAlert.alert('Request Submitted!', 'The kitchen has been notified to skip your meal(s).');
    } catch (err) {
      setSubmitting(false);
      CustomAlert.alert('Error', err.message || 'Failed to submit skip request');
    }
  };

  const handleOpenCancelModal = (sub) => {
    setCancelSub(sub);
    setCancelReason('');
    setCancelModalVisible(true);
  };

  const handleSubmitCancelRequest = async () => {
    if (!cancelSub) return;
    setCancelling(true);
    try {
      await customerApi.requestCancelSubscription(cancelSub.id, {
        reason: cancelReason.trim(),
      });
      setCancelling(false);
      setCancelModalVisible(false);
      fetchData();
      CustomAlert.alert(
        'Request Sent',
        'Your cancellation request has been sent to the owner for approval.'
      );
    } catch (err) {
      setCancelling(false);
      CustomAlert.alert('Error', err.message || 'Failed to send cancellation request');
    }
  };

  const renderSubscription = ({ item }) => {
    const owner = item.owner?.ownerProfile || {};
    const isCancelled = item.status === 'cancelled' || item.cancel_status === 'approved';
    return (
      <Card style={[styles.card, isCancelled && styles.cancelledCard]}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.planName}>{item.plan?.name}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
              <ChefHat size={14} color={COLORS.primary} />
              <Text style={styles.ownerName}>{owner.business_name || 'Chef'}</Text>
            </View>
          </View>
          <Badge text={item.status} status={item.status} />
        </View>

        <View style={styles.datesRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <CalendarDays size={14} color={COLORS.textSecondary} />
            <Text style={styles.datesText}>
              {item.start_date} to {item.end_date}
            </Text>
          </View>
          <Text style={styles.daysRemaining}>
            {item.remaining_days} service days left
          </Text>
        </View>

        {item.plan?.planItems?.length > 0 && (
          <View style={styles.inclusionsBox}>
            <Text style={styles.incTitle}>Included in this plan:</Text>
            {item.plan.planItems.map((pi, idx) => (
              <Text key={idx} style={styles.incItem}>
                • {pi.quantity}x {pi.menuItem?.name || 'Tiffin Meal'}
              </Text>
            ))}
          </View>
        )}

        {/* Skip Meal & Cancel Actions */}
        {isCancelled ? (
          <View style={{ marginTop: 12, gap: 8 }}>
            <TouchableOpacity
              disabled
              style={[
                styles.skipActionBtn,
                styles.skipActionBtnDisabled,
                { marginTop: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
              ]}
            >
              <PauseCircle size={15} color={COLORS.textMuted} />
              <Text style={[styles.skipActionText, { color: COLORS.textMuted }]}>
                Skip Meal / Today's Tiffin
              </Text>
            </TouchableOpacity>
            <View style={styles.cancelledBanner}>
              <Text style={styles.cancelledBannerText}>Subscription Cancelled</Text>
            </View>
          </View>
        ) : item.status === 'active' && (
          <View style={{ marginTop: 12, gap: 8 }}>
            <TouchableOpacity
              style={[styles.skipActionBtn, { marginTop: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }]}
              onPress={() => handleOpenSkipModal(item)}
            >
              <PauseCircle size={15} color={COLORS.primary} />
              <Text style={styles.skipActionText}>Skip Meal / Today's Tiffin</Text>
            </TouchableOpacity>

            {item.cancel_status === 'requested' ? (
              <View style={styles.cancelPendingBox}>
                <Text style={styles.cancelPendingText}>
                  Cancellation Requested (Pending Owner Approval)
                </Text>
              </View>
            ) : (
              <>
                {item.cancel_status === 'rejected' && (
                  <Text style={styles.cancelRejectedNote}>
                    Previous cancellation request was declined by the owner.
                  </Text>
                )}
                <TouchableOpacity
                  style={styles.cancelActionBtn}
                  onPress={() => handleOpenCancelModal(item)}
                >
                  <Text style={styles.cancelActionText}>Request Plan Cancellation</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={subscriptions}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderSubscription}
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>My Subscriptions</Text>
            <Text style={styles.subtitle}>Manage your monthly tiffins and pause or skip meals</Text>
          </View>
        }
        ListFooterComponent={
          skips.length > 0 && (
            <View style={{ marginTop: 20 }}>
              <Text style={styles.sectionTitle}>Meal Skip History</Text>
              {skips.map((s) => (
                <Card key={s.id} style={styles.skipCard}>
                  <View style={styles.skipRow}>
                    <View>
                      <Text style={styles.skipDateText}>Date: {s.skip_date}</Text>
                      {s.reason ? <Text style={styles.skipReasonText}>"{s.reason}"</Text> : null}
                    </View>
                    <Badge text={s.status} status={s.status} />
                  </View>
                </Card>
              ))}
            </View>
          )
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.emptyContainer}>
              <CalendarDays size={48} color={COLORS.textMuted} style={{ marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>No Active Subscriptions</Text>
              <Text style={styles.emptySubtitle}>
                Subscribe to a monthly tiffin plan to enjoy hot, daily homemade meals.
              </Text>
            </View>
          )
        }
      />

      {/* Skip Request Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardModalView style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Skip Tiffin Meal</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={[styles.noticeBox, { flexDirection: 'row', alignItems: 'flex-start', gap: 8 }]}>
                <Info size={16} color={COLORS.info} style={{ marginTop: 2 }} />
                <Text style={[styles.noticeText, { flex: 1 }]}>
                  Cutoff Notice: Please request skips at least 2 hours before meal preparation time so food is not wasted.
                </Text>
              </View>

              <View style={styles.modeToggleRow}>
                <TouchableOpacity
                  style={[styles.modeBtn, skipMode === 'today' && styles.modeBtnActive]}
                  onPress={() => setSkipMode('today')}
                >
                  <Text style={[styles.modeBtnText, skipMode === 'today' && styles.modeBtnTextActive]}>
                    Today Only
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modeBtn, skipMode === 'range' && styles.modeBtnActive]}
                  onPress={() => setSkipMode('range')}
                >
                  <Text style={[styles.modeBtnText, skipMode === 'range' && styles.modeBtnTextActive]}>
                    Date Range
                  </Text>
                </TouchableOpacity>
              </View>

              {skipMode === 'today' ? (
                <View style={styles.todayInfoBox}>
                  <Text style={styles.todayInfoText}>
                    Skipping today's tiffin ({getTodayStr()})
                  </Text>
                </View>
              ) : (
                <>
                  <Input
                    label="Start Date (YYYY-MM-DD)"
                    value={startDate}
                    onChangeText={setStartDate}
                    placeholder={getTodayStr()}
                  />
                  <Input
                    label="End Date (YYYY-MM-DD)"
                    value={endDate}
                    onChangeText={setEndDate}
                    placeholder={getTodayStr()}
                  />
                  <Text style={styles.rangeHintText}>
                    Max allowed: {selectedSub?.owner?.ownerProfile?.max_skip_days || 7} day(s). Past dates are not allowed.
                  </Text>
                </>
              )}

              <Input
                label="Reason (Optional)"
                value={reason}
                onChangeText={setReason}
                placeholder="e.g. Eating out with colleagues"
              />

              <Button
                title="Confirm Skip Request"
                onPress={handleSubmitSkip}
                loading={submitting}
                style={{ marginTop: 12 }}
              />
            </View>
          </View>
        </KeyboardModalView>
      </Modal>

      {/* Cancel Subscription Request Modal */}
      <Modal visible={cancelModalVisible} animationType="slide" transparent>
        <KeyboardModalView style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Request Cancellation</Text>
              <TouchableOpacity onPress={() => setCancelModalVisible(false)}>
                <X size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={[styles.noticeBox, { flexDirection: 'row', alignItems: 'flex-start', gap: 8 }]}>
                <Info size={16} color={COLORS.info} style={{ marginTop: 2 }} />
                <Text style={[styles.noticeText, { flex: 1 }]}>
                  Your subscription will remain active until the kitchen owner approves your cancellation request.
                </Text>
              </View>

              <Input
                label="Reason for Cancellation (Optional)"
                value={cancelReason}
                onChangeText={setCancelReason}
                placeholder="e.g. Moving out of town"
              />

              <Button
                title="Send Cancel Request"
                variant="danger"
                onPress={handleSubmitCancelRequest}
                loading={cancelling}
                style={{ marginTop: 12 }}
              />
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
  },
  planName: {
    ...FONTS.h3,
    color: COLORS.text,
  },
  ownerName: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  datesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  datesText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  daysRemaining: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.secondary,
  },
  inclusionsBox: {
    backgroundColor: '#F9FAFB',
    padding: 10,
    borderRadius: SIZES.radiusSm,
    marginTop: 10,
  },
  incTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  incItem: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginVertical: 1,
  },
  skipActionBtn: {
    backgroundColor: '#FFF3E0',
    borderWidth: 1,
    borderColor: '#FFE0B2',
    borderRadius: SIZES.radiusSm,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  skipActionText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  sectionTitle: {
    ...FONTS.h3,
    marginBottom: 10,
  },
  skipCard: {
    marginBottom: 8,
  },
  skipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipDateText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  skipReasonText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginTop: 2,
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
  modalBody: {
    padding: 20,
    paddingBottom: 40,
  },
  noticeBox: {
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: SIZES.radiusSm,
    marginBottom: 16,
  },
  noticeText: {
    fontSize: 12,
    color: '#0D47A1',
    lineHeight: 18,
  },
  modeToggleRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: SIZES.radiusSm,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  modeBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#FFF3E0',
  },
  modeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  modeBtnTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  todayInfoBox: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusSm,
    padding: 12,
    marginBottom: 12,
  },
  todayInfoText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  rangeHintText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: -6,
    marginBottom: 12,
  },
  cancelPendingBox: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: SIZES.radiusSm,
    paddingVertical: 9,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  cancelPendingText: {
    color: '#92400E',
    fontWeight: '700',
    fontSize: 12,
  },
  cancelRejectedNote: {
    fontSize: 12,
    color: COLORS.danger,
    textAlign: 'center',
  },
  cancelActionBtn: {
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    borderRadius: SIZES.radiusSm,
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelActionText: {
    color: COLORS.danger,
    fontWeight: '700',
    fontSize: 13,
  },
  cancelledCard: {
    opacity: 0.65,
    backgroundColor: '#F3F4F6',
  },
  skipActionBtnDisabled: {
    backgroundColor: '#E5E7EB',
    borderColor: '#D1D5DB',
  },
  cancelledBanner: {
    backgroundColor: '#E5E7EB',
    borderRadius: SIZES.radiusSm,
    paddingVertical: 9,
    alignItems: 'center',
  },
  cancelledBannerText: {
    color: COLORS.textSecondary,
    fontWeight: '700',
    fontSize: 12,
  },
});

export default CustomerSubscriptionsScreen;

