/**
 * Customer Home Screen
 * Displays active subscription widget, nearby tiffin providers, search, and meal options.
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
import { useSelector, useDispatch } from 'react-redux';
import { Card, Badge } from '../../components/Card';
import { Input } from '../../components/Input';
import { COLORS, SIZES, FONTS } from '../../constants/theme';
import { customerApi } from '../../api/customerApi';
import { notificationApi } from '../../api/notificationApi';
import { useNotificationAutoRefresh } from '../../services/notificationEvents';

export const CustomerHomeScreen = ({ navigation }) => {
  const { user } = useSelector((state) => state.auth);
  const cart = useSelector((state) => state.cart);
  const [providers, setProviders] = useState([]);
  const [activeSubscription, setActiveSubscription] = useState(null);
  const [search, setSearch] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [provRes, subsRes, notifRes] = await Promise.all([
        customerApi.getProviders({ search: search.trim() || undefined }),
        customerApi.getSubscriptions({ status: 'active' }),
        notificationApi.getNotifications({ pageSize: 1 }).catch(() => null),
      ]);
      setProviders(provRes.data || []);
      if (subsRes.data?.length > 0) {
        setActiveSubscription(subsRes.data[0]);
      } else {
        setActiveSubscription(null);
      }
      if (notifRes?.data) {
        setUnreadCount(notifRes.data.unreadCount || notifRes.data.items?.length || 0);
      }
    } catch (err) {
      console.warn('Customer home fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real-time auto refresh notifications count on incoming push notifications
  useNotificationAutoRefresh('*', fetchData);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const renderProvider = ({ item }) => {
    return (
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={() => navigation.navigate('ProviderDetail', { providerId: item.user_id, provider: item })}
      >
        <Card style={styles.providerCard}>
          <View style={styles.providerHeader}>
            <View style={styles.avatarBox}>
              <Text style={{ fontSize: 28 }}>🍱</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.providerName}>{item.business_name}</Text>
              <Text style={styles.providerArea}>
                📍 {item.city || 'Nearby'} {item.service_radius_km ? `• Within ${item.service_radius_km} km` : ''}
              </Text>
              <View style={styles.badgeRow}>
                <Badge text={item.delivery_available ? 'Delivery Available' : 'Pickup Only'} status="active" />
                <Text style={styles.menuMetaText}>
                  {item.menuItemCount || 0} Dishes • {item.planCount || 0} Plans
                </Text>
              </View>
            </View>
          </View>

          {item.description ? (
            <Text style={styles.providerDesc} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}

          <View style={styles.viewMenuRow}>
            <Text style={styles.viewMenuText}>View Menu & Plans →</Text>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={providers}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderProvider}
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
        ListHeaderComponent={
          <View>
            {/* Header Greeting */}
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text style={styles.greeting}>Hello, {user?.name || 'Foodie'} 👋</Text>
                <Text style={styles.tagline}>Craving healthy ghar ka khana?</Text>
              </View>

              <View style={styles.headerActions}>
                <TouchableOpacity
                  style={styles.notifBtn}
                  onPress={() => navigation.navigate('Notifications')}
                >
                  <Text style={{ fontSize: 22 }}>🔔</Text>
                  {unreadCount > 0 && (
                    <View style={styles.cartBadge}>
                      <Text style={styles.cartBadgeText}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                {cart.items.length > 0 && (
                  <TouchableOpacity
                    style={[styles.cartBtn, { marginLeft: 10 }]}
                    onPress={() => navigation.navigate('CustomerCart')}
                  >
                    <Text style={{ fontSize: 20 }}>🛒</Text>
                    <View style={styles.cartBadge}>
                      <Text style={styles.cartBadgeText}>{cart.items.length}</Text>
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Active Subscription Banner */}
            {activeSubscription && (
              <View style={styles.subBanner}>
                <View style={styles.subBannerHeader}>
                  <Text style={styles.subBadge}>ACTIVE SUBSCRIPTION</Text>
                  <Text style={styles.subDaysLeft}>
                    {activeSubscription.remaining_days} days left
                  </Text>
                </View>
                <Text style={styles.subPlanName}>{activeSubscription.plan?.name}</Text>
                <Text style={styles.subProvider}>
                  From: {activeSubscription.owner?.ownerProfile?.business_name || 'Chef'}
                </Text>

                <TouchableOpacity
                  style={styles.skipButton}
                  onPress={() => navigation.navigate('CustomerSubscriptions')}
                >
                  <Text style={styles.skipButtonText}>Manage or Skip Today's Meal ⏸️</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Search Bar */}
            <Input
              placeholder="Search tiffin providers, thali, Punjabi, Jain..."
              prefix="🔍"
              value={search}
              onChangeText={setSearch}
              style={{ marginTop: 12, marginBottom: 8 }}
            />

            <Text style={styles.sectionTitle}>Local Homemade Tiffin Providers</Text>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyTitle}>No Providers Found</Text>
              <Text style={styles.emptySubtitle}>Try adjusting your search query.</Text>
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
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  greeting: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  tagline: {
    ...FONTS.h2,
    color: COLORS.text,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notifBtn: {
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
  cartBtn: {
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
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  cartBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
  },
  subBanner: {
    backgroundColor: '#FFF3E0',
    borderRadius: SIZES.radiusLg,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#FFE0B2',
    marginBottom: 16,
  },
  subBannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  subBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  subDaysLeft: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  subPlanName: {
    ...FONTS.h3,
    color: COLORS.text,
  },
  subProvider: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  skipButton: {
    backgroundColor: '#FFF',
    paddingVertical: 10,
    borderRadius: SIZES.radiusSm,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  skipButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  sectionTitle: {
    ...FONTS.h3,
    marginTop: 12,
    marginBottom: 12,
  },
  providerCard: {
    marginBottom: 14,
  },
  providerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatarBox: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFF3E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerName: {
    ...FONTS.h3,
    color: COLORS.text,
  },
  providerArea: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginVertical: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  menuMetaText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginLeft: 8,
  },
  providerDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 10,
    lineHeight: 18,
  },
  viewMenuRow: {
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    alignItems: 'flex-end',
  },
  viewMenuText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
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

export default CustomerHomeScreen;

