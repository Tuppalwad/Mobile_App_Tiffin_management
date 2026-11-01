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
  Alert,
} from 'react-native';
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

  const handleUpdateSkip = async (skipId, status) => {
    try {
      await ownerApi.updateSkipStatus(skipId, { status });
      Alert.alert('Success', `Skip request ${status}!`);
      fetchData();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to update skip request');
    }
  };

  const renderSubscription = ({ item }) => {
    const customer = item.customer || {};
    return (
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.customerName}>{customer.name || 'Customer'}</Text>
            <Text style={styles.customerPhone}>📞 {customer.phone}</Text>
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
      </Card>
    );
  };

  const renderSkipRequest = ({ item }) => {
    return (
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.customerName}>{item.customer?.name || 'Customer'}</Text>
            <Text style={styles.skipDate}>Date to skip: {item.skip_date}</Text>
          </View>
          <Badge text={item.status} status={item.status} />
        </View>

        {item.reason ? (
          <Text style={styles.reasonText}>Reason: "{item.reason}"</Text>
        ) : null}

        {item.status === 'requested' && (
          <View style={styles.skipActions}>
            <TouchableOpacity
              style={[styles.skipBtn, { backgroundColor: COLORS.secondary }]}
              onPress={() => handleUpdateSkip(item.id, 'approved')}
            >
              <Text style={styles.skipBtnText}>Approve Skip & Deduct Meal ✓</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.skipBtn, { backgroundColor: COLORS.danger, marginTop: 8 }]}
              onPress={() => handleUpdateSkip(item.id, 'rejected')}
            >
              <Text style={styles.skipBtnText}>Reject ✕</Text>
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
              <Text style={styles.emptyIcon}>👥</Text>
              <Text style={styles.emptyTitle}>No Subscriptions Yet</Text>
              <Text style={styles.emptySubtitle}>
                When customers subscribe to your monthly plans, they will appear here.
              </Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={skipRequests}
          keyExtractor={(item) => item.id.toString()}
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
});

export default OwnerSubscriptionsScreen;

