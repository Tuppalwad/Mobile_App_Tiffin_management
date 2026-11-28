/**
 * Owner Subscriptions & Skip Requests Screen
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
} from 'react-native';
import { CustomAlert } from "../../components/CustomAlert";
import { Phone, Check, X, Users } from 'lucide-react-native';
import { Card, Badge } from '../../components/Card';
import { COLORS, SIZES, FONTS } from '../../constants/theme';
import { ownerApi } from '../../api/ownerApi';
import { useNotificationAutoRefresh } from '../../services/notificationEvents';

export const OwnerSubscriptionsScreen = () => {
  const [activeTab, setActiveTab] = useState('subscriptions'); // 'subscriptions' | 'skips'
  const [subscriptions, setSubscriptions] = useState([]);
  const [skipRequests, setSkipRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [subsRes, skipsRes] = await Promise.all([
        ownerApi.getSubscriptions(),
        ownerApi.getSkipRequests(),
      ]);
      setSubscriptions(subsRes.data.items || []);
      setSkipRequests(skipsRes.data || []);
    } catch (err) {
      console.warn('Error fetching subscriptions/skips:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real-time auto refresh when customer subscribes or requests skip
  useNotificationAutoRefresh(['subscription', 'skip', 'NEW_SUBSCRIPTION', 'NEW_SKIP_REQUEST'], fetchData);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleUpdateSkip = async (skipIds, status) => {
    try {
      const ids = Array.isArray(skipIds) ? skipIds : [skipIds];
      await Promise.all(ids.map((id) => ownerApi.updateSkipStatus(id, { status })));
      CustomAlert.alert('Success', `Skip request ${status}!`);
      fetchData();
    } catch (err) {
      CustomAlert.alert('Error', err.message || 'Failed to update skip request');
    }
  };

  const getTodayStr = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const groupSkipRequests = (items) => {
    const addOneDay = (dateStr) => {
      const d = new Date(`${dateStr}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() + 1);
      return d.toISOString().split('T')[0];
    };

    const grouped = [];
    for (const curr of items) {
      const prev = grouped[grouped.length - 1];
      const currCreated = curr.created_at || curr.createdAt;
      const sameBatchTime =
        !prev?.createdAt ||
        !currCreated ||
        Math.abs(new Date(currCreated).getTime() - new Date(prev.createdAt).getTime()) < 10000;

      if (
        prev &&
        prev.subscription_id === curr.subscription_id &&
        prev.status === curr.status &&
        (prev.reason || '') === (curr.reason || '') &&
        addOneDay(prev.end_date) === curr.skip_date &&
        sameBatchTime
      ) {
        prev.end_date = curr.skip_date;
        prev.ids.push(curr.id);
        prev.day_count = prev.ids.length;
      } else {
        grouped.push({
          ...curr,
          ids: [curr.id],
          start_date: curr.skip_date,
          end_date: curr.skip_date,
          day_count: 1,
          createdAt: currCreated,
        });
      }
    }
    return grouped;
  };

  const handleCancelDecision = async (subId, status) => {
    try {
      await ownerApi.updateSubscriptionCancelStatus(subId, status);
      CustomAlert.alert(
        'Success',
        status === 'approved'
          ? 'Subscription cancellation approved.'
          : 'Cancellation request rejected.'
      );
      fetchData();
    } catch (err) {
      CustomAlert.alert('Error', err.message || 'Failed to update cancellation request');
    }
  };

  const renderSubscription = ({ item }) => {
    const customer = item.customer || {};
    return (
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.customerName}>{customer.name || 'Customer'}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <Phone size={12} color={COLORS.textSecondary} />
              <Text style={styles.customerPhone}>{customer.phone}</Text>
            </View>
          </View>
          <Badge text={item.status} status={item.status} />
        </View>

        <View style={styles.planBox}>
          <Text style={styles.planName}>{item.plan?.name || 'Tiffin Plan'}</Text>
          <Text style={styles.planDates}>
            {item.start_date} to {item.end_date}
          </Text>
        </View>

        <View style={styles.paymentInfoRow}>
          <View>
            <Text style={styles.infoLabel}>Total Plan Fee</Text>
            <Text style={styles.infoVal}>₹{item.total_amount}</Text>
          </View>
          <View>
            <Text style={styles.infoLabel}>Paid</Text>
            <Text style={[styles.infoVal, { color: COLORS.secondary }]}>₹{item.paid_amount || 0}</Text>
          </View>
          <View>
            <Text style={styles.infoLabel}>Days Remaining</Text>
            <Text style={styles.infoVal}>{item.remaining_days || 0} days</Text>
          </View>
        </View>

        {item.cancel_status === 'requested' && (
          <View style={styles.cancelRequestBox}>
            <Text style={styles.cancelRequestTitle}>Cancellation Requested</Text>
            {item.cancel_reason ? (
              <Text style={styles.cancelReasonText}>Reason: "{item.cancel_reason}"</Text>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
              <TouchableOpacity
                style={[styles.skipBtn, { backgroundColor: COLORS.danger, flex: 1, flexDirection: 'row', justifyContent: 'center', gap: 6 }]}
                onPress={() => handleCancelDecision(item.id, 'approved')}
              >
                <Check size={16} color="#FFF" />
                <Text style={styles.skipBtnText}>Approve Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.skipBtn, { backgroundColor: COLORS.textSecondary, flex: 1, flexDirection: 'row', justifyContent: 'center', gap: 6 }]}
                onPress={() => handleCancelDecision(item.id, 'rejected')}
              >
                <X size={16} color="#FFF" />
                <Text style={styles.skipBtnText}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Card>
    );
  };

  const renderSkipRequest = ({ item }) => {
    const todayStr = getTodayStr();
    const isRange = item.start_date !== item.end_date;
    const dateLabel = isRange
      ? `${item.start_date} to ${item.end_date} (${item.day_count} days)`
      : item.start_date === todayStr
        ? `Today (${item.start_date})`
        : item.start_date;

    return (
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.customerName}>{item.customer?.name || 'Customer'}</Text>
            <Text style={styles.skipDate}>Date to skip: {dateLabel}</Text>
          </View>
          <Badge text={item.status} status={item.status} />
        </View>

        {item.reason ? (
          <Text style={styles.reasonText}>Reason: "{item.reason}"</Text>
        ) : null}

        {item.status === 'requested' && (
          <View style={styles.skipActions}>
            <TouchableOpacity
              style={[styles.skipBtn, { backgroundColor: COLORS.secondary, flexDirection: 'row', justifyContent: 'center', gap: 5 }]}
              onPress={() => handleUpdateSkip(item.ids || [item.id], 'approved')}
            >
              <Text style={styles.skipBtnText}>Approve Skip & Deduct Meal</Text>
              <Check size={15} color="#FFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.skipBtn, { backgroundColor: COLORS.danger, marginTop: 8, flexDirection: 'row', justifyContent: 'center', gap: 5 }]}
              onPress={() => handleUpdateSkip(item.ids || [item.id], 'rejected')}
            >
              <Text style={styles.skipBtnText}>Reject</Text>
              <X size={15} color="#FFF" />
            </TouchableOpacity>
          </View>
        )}
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          onPress={() => setActiveTab('subscriptions')}
          style={[styles.tab, activeTab === 'subscriptions' && styles.activeTab]}
        >
          <Text style={[styles.tabText, activeTab === 'subscriptions' && styles.activeTabText]}>
            Active Subscribers ({subscriptions.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('skips')}
          style={[styles.tab, activeTab === 'skips' && styles.activeTab]}
        >
          <Text style={[styles.tabText, activeTab === 'skips' && styles.activeTabText]}>
            Skip Requests ({skipRequests.filter((s) => s.status === 'requested').length})
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : activeTab === 'subscriptions' ? (
        <FlatList
          data={subscriptions}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderSubscription}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Users size={48} color={COLORS.textMuted} style={{ marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>No Subscriptions Yet</Text>
              <Text style={styles.emptySubtitle}>
                When customers subscribe to your monthly plans, they will appear here.
              </Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={groupSkipRequests(skipRequests)}
          keyExtractor={(item) => (item.ids ? item.ids.join('-') : item.id.toString())}
          renderItem={renderSkipRequest}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>⏸️</Text>
              <Text style={styles.emptyTitle}>No Skip Requests</Text>
              <Text style={styles.emptySubtitle}>
                No customers have requested to skip their tiffin today.
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  activeTabText: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  customerName: {
    ...FONTS.h3,
    color: COLORS.text,
  },
  customerPhone: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  planBox: {
    backgroundColor: '#FFF8F2',
    padding: 10,
    borderRadius: SIZES.radiusSm,
    marginVertical: 8,
  },
  planName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
  },
  planDates: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  paymentInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    marginTop: 6,
  },
  infoLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  infoVal: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 2,
  },
  skipDate: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 2,
  },
  reasonText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginVertical: 8,
  },
  skipActions: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  skipBtn: {
    paddingVertical: 10,
    borderRadius: SIZES.radiusSm,
    alignItems: 'center',
  },
  skipBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
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
  cancelRequestBox: {
    marginTop: 12,
    padding: 10,
    borderRadius: SIZES.radiusSm,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  cancelRequestTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.danger,
  },
  cancelReasonText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
  },
});

export default OwnerSubscriptionsScreen;

