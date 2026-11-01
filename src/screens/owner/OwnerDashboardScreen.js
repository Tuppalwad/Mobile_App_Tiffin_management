/**
 * Owner Dashboard Screen
 * Complete business overview: subscribers, orders, revenues, collections, and quick actions.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { Card } from '../../components/Card';
import { SetupTracker } from '../../components/SetupTracker';
import { COLORS, SIZES, FONTS } from '../../constants/theme';
import { ownerApi } from '../../api/ownerApi';
import { notificationApi } from '../../api/notificationApi';
import { useNotificationAutoRefresh } from '../../services/notificationEvents';

export const OwnerDashboardScreen = ({ navigation }) => {
  const { user } = useSelector((state) => state.auth);
  const [stats, setStats] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [menuCount, setMenuCount] = useState(0);
  const [planCount, setPlanCount] = useState(0);
  const [hasProfileDetails, setHasProfileDetails] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    try {
      const [dashRes, notifRes, menuRes, planRes, profRes] = await Promise.all([
        ownerApi.getDashboardStats(),
        notificationApi.getNotifications({ pageSize: 1 }).catch(() => null),
        ownerApi.getMenuItems().catch(() => ({ data: [] })),
        ownerApi.getPlans().catch(() => ({ data: [] })),
        ownerApi.getProfile().catch(() => ({ data: null })),
      ]);
      setStats(dashRes.data);
      if (notifRes?.data) {
        setUnreadCount(notifRes.data.unreadCount || notifRes.data.items?.length || 0);
      }
      setMenuCount(menuRes.data?.length || 0);
      setPlanCount(planRes.data?.length || 0);
      const prof = profRes?.data;
      setHasProfileDetails(Boolean(prof && (prof.address || prof.description || prof.city)));
    } catch (error) {
      console.warn('Dashboard stats error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Fetch fresh data every time user focuses/visits the Home page
  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [fetchDashboardData])
  );

  // Real-time auto refresh dashboard stats on incoming push notifications
  useNotificationAutoRefresh(['order', 'subscription', 'skip', 'payment', 'NEW_ORDER', 'NEW_SUBSCRIPTION'], fetchDashboardData);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const ownerSetupSteps = [
    {
      id: 'step_menu',
      title: 'Add Your Menu Items 🥘',
      desc: menuCount > 0 ? `${menuCount} dishes added` : 'Add homemade curries, rotis, rice & daily specials',
      badge: menuCount > 0 ? `${menuCount} Added` : 'Required',
      isCompleted: menuCount > 0,
      onPress: () => navigation.navigate('OwnerMenu'),
    },
    {
      id: 'step_plans',
      title: 'Create Subscription Plans 📅',
      desc: planCount > 0 ? `${planCount} active plans` : 'Set weekly/monthly plans (e.g. 30-Day Lunch Plan)',
      badge: planCount > 0 ? `${planCount} Created` : 'Required',
      isCompleted: planCount > 0,
      onPress: () => navigation.navigate('OwnerPlans'),
    },
    {
      id: 'step_settings',
      title: 'Update Kitchen & Service Details ⚙️',
      desc: hasProfileDetails ? 'Kitchen profile completed' : 'Set delivery radius, kitchen address & phone in Settings',
      badge: hasProfileDetails ? 'Done' : 'Important',
      isCompleted: hasProfileDetails,
      onPress: () => navigation.navigate('OwnerProfile'),
    },
  ];

  if (loading && !stats) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading Dashboard...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
      >
        {/* Header Greeting */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.businessName}>
              {user?.ownerProfile?.business_name || 'My Tiffin Service'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.notifBadge}
            onPress={() => navigation.navigate('Notifications')}
          >
            <Text style={{ fontSize: 22 }}>🔔</Text>
            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* First-time Onboarding & Setup Tracker */}
        <SetupTracker
          title="🚀 Kitchen Setup Tracker"
          subtitle="Follow these steps to start receiving and managing tiffins"
          steps={ownerSetupSteps}
          storageKey={`owner_setup_dismissed_${user?.id || 'default'}`}
        />

        {/* Financial Highlights Card */}
        <View style={styles.revenueCard}>
          <Text style={styles.revenueTitle}>Today's Earnings</Text>
          <Text style={styles.revenueValue}>₹{stats?.todayEarnings || 0}</Text>
          <View style={styles.revenueDivider} />
          <View style={styles.revenueRow}>
            <View>
              <Text style={styles.revSmallLabel}>Monthly Revenue</Text>
              <Text style={styles.revSmallValue}>₹{stats?.monthlyRevenue || 0}</Text>
            </View>
            <View>
              <Text style={styles.revSmallLabel}>Total Collected</Text>
              <Text style={styles.revSmallValue}>₹{stats?.totalCollected || 0}</Text>
            </View>
            <View>
              <Text style={styles.revSmallLabel}>Pending</Text>
              <Text style={[styles.revSmallValue, { color: COLORS.primaryLight }]}>
                ₹{stats?.totalPending || 0}
              </Text>
            </View>
          </View>
        </View>

        {/* Daily Operations Grid */}
        <Text style={styles.sectionTitle}>Today's Operations</Text>
        <View style={styles.grid}>
          <TouchableOpacity
            style={styles.gridCard}
            onPress={() => navigation.navigate('OwnerOrders')}
          >
            <Text style={styles.gridIcon}>🍱</Text>
            <Text style={styles.gridValue}>{stats?.todayOrders || 0}</Text>
            <Text style={styles.gridLabel}>Total Orders</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridCard}
            onPress={() => navigation.navigate('OwnerOrders')}
          >
            <Text style={styles.gridIcon}>✅</Text>
            <Text style={styles.gridValue}>{stats?.todayCompletedOrders || 0}</Text>
            <Text style={styles.gridLabel}>Delivered</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridCard}
            onPress={() => navigation.navigate('OwnerSubscriptions')}
          >
            <Text style={styles.gridIcon}>⏸️</Text>
            <Text style={styles.gridValue}>{stats?.todaySkippedTiffins || 0}</Text>
            <Text style={styles.gridLabel}>Skipped Tiffins</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridCard}
            onPress={() => navigation.navigate('OwnerSubscriptions')}
          >
            <Text style={styles.gridIcon}>👥</Text>
            <Text style={styles.gridValue}>{stats?.activeSubscribers || 0}</Text>
            <Text style={styles.gridLabel}>Active Subscribers</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Action Shortcuts */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('OwnerOrders')}
          >
            <Text style={styles.actionEmoji}>📋</Text>
            <Text style={styles.actionText}>Manage Orders</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('OwnerMenu')}
          >
            <Text style={styles.actionEmoji}>🥘</Text>
            <Text style={styles.actionText}>Menu & Items</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('OwnerPlans')}
          >
            <Text style={styles.actionEmoji}>📅</Text>
            <Text style={styles.actionText}>Tiffin Plans</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('OwnerPayments')}
          >
            <Text style={styles.actionEmoji}>💳</Text>
            <Text style={styles.actionText}>Payments</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  container: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  greeting: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  businessName: {
    ...FONTS.h2,
    color: COLORS.text,
  },
  notifBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    position: 'relative',
  },
  unreadBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: COLORS.danger,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  revenueCard: {
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radiusLg,
    padding: 20,
    marginBottom: 24,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  revenueTitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontWeight: '600',
  },
  revenueValue: {
    color: '#FFF',
    fontSize: 34,
    fontWeight: '800',
    marginVertical: 6,
  },
  revenueDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: 14,
  },
  revenueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  revSmallLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
  },
  revSmallValue: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  sectionTitle: {
    ...FONTS.h3,
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  gridCard: {
    width: '48%',
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radiusMd,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  gridIcon: {
    fontSize: 26,
    marginBottom: 6,
  },
  gridValue: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
  },
  gridLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: '48%',
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radiusMd,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionEmoji: {
    fontSize: 30,
    marginBottom: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
});

export default OwnerDashboardScreen;

