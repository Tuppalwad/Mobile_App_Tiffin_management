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
  Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import {
  UtensilsCrossed,
  MapPin,
  Clock,
  ArrowRight,
  MessageCircle,
  Bell,
  PauseCircle,
  Search,
  User,
  Phone,
  SlidersHorizontal,
  X,
  Crosshair,
} from 'lucide-react-native';
import { Card, Badge } from '../../components/Card';
import { Input } from '../../components/Input';
import { VegIndicator } from '../../components/VegIndicator';
import { CustomAlert } from '../../components/CustomAlert';
import { requestLocationPermission, getCurrentPosition } from '../../utils/locationUtils';
import { COLORS, SIZES, FONTS } from '../../constants/theme';
import { customerApi } from '../../api/customerApi';
import { notificationApi } from '../../api/notificationApi';
import { chatApi } from '../../api/chatApi';
import { useNotificationAutoRefresh } from '../../services/notificationEvents';
import { formatKitchenHours } from '../../utils/timeUtils';

export const CustomerHomeScreen = ({ navigation }) => {
  const { user } = useSelector((state) => state.auth);
  const [providers, setProviders] = useState([]);
  const [activeSubscription, setActiveSubscription] = useState(null);
  const [search, setSearch] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Location & Filters State
  const [userCoords, setUserCoords] = useState(null);
  const [dietaryFilter, setDietaryFilter] = useState('all'); // 'all' | 'veg' | 'non_veg'
  const [maxDistanceKm, setMaxDistanceKm] = useState(null); // null | 2 | 5 | 10 | 20
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [draftDietary, setDraftDietary] = useState('all');
  const [draftDistance, setDraftDistance] = useState(null);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    let mounted = true;
    const initLocation = async () => {
      try {
        const granted = await requestLocationPermission();
        if (!granted || !mounted) return;
        const pos = await getCurrentPosition();
        if (mounted) setUserCoords(pos);
      } catch {
        // Location is optional until user filters by distance
      }
    };
    initLocation();
    return () => {
      mounted = false;
    };
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [provRes, subsRes, notifRes, chatRes] = await Promise.all([
        customerApi.getProviders({
          search: search.trim() || undefined,
          dietary: dietaryFilter !== 'all' ? dietaryFilter : undefined,
          lat: userCoords?.latitude,
          lng: userCoords?.longitude,
          max_distance_km: maxDistanceKm || undefined,
        }),
        customerApi.getSubscriptions({ status: 'active' }),
        notificationApi.getNotifications({ pageSize: 1 }).catch(() => null),
        chatApi.getConversations().catch(() => ({ data: [] })),
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
      const chatUnread = (chatRes?.data || []).reduce(
        (sum, c) => sum + (c.unreadCount || 0),
        0
      );
      setUnreadChatCount(chatUnread);
    } catch (err) {
      console.warn('Customer home fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, dietaryFilter, maxDistanceKm, userCoords]);

  // Always refresh latest data when screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  // Real-time auto refresh notifications count on incoming push notifications
  useNotificationAutoRefresh('*', fetchData);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const renderProvider = ({ item }) => {
    const canDeliver = item.delivery_available !== false;
    const canPickup = item.pickup_available !== false;
    const fulfillmentLabel =
      canDeliver && canPickup
        ? 'Delivery & Pickup'
        : canDeliver
        ? 'Delivery Only'
        : canPickup
        ? 'Pickup Only'
        : 'Unavailable';
    const kitchenHours = formatKitchenHours(item.opening_time, item.closing_time);

    return (
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={() => navigation.navigate('ProviderDetail', { providerId: item.user_id, provider: item })}
      >
        <Card style={styles.providerCard}>
          <View style={styles.providerHeader}>
            <View style={styles.avatarBox}>
              <UtensilsCrossed size={26} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.providerName}>{item.business_name}</Text>
              {(item.user?.name || item.user?.phone) ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 3 }}>
                  {item.user?.name ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <User size={12} color={COLORS.textSecondary} />
                      <Text style={styles.providerArea}>{item.user.name}</Text>
                    </View>
                  ) : null}
                  {item.user?.phone ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Phone size={12} color={COLORS.textSecondary} />
                      <Text style={styles.providerArea}>{item.user.phone}</Text>
                    </View>
                  ) : null}
                </View>
              ) : null}
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
                <MapPin size={12} color={COLORS.textSecondary} />
                <Text style={styles.providerArea}>
                  {item.city || 'Nearby'}
                  {item.distance_km !== null && item.distance_km !== undefined
                    ? ` • ${item.distance_km} km away`
                    : item.service_radius_km
                    ? ` • Within ${item.service_radius_km} km`
                    : ''}
                </Text>
                {kitchenHours ? (
                  <>
                    <Clock size={12} color={COLORS.textSecondary} style={{ marginLeft: 4 }} />
                    <Text style={styles.providerArea}>{kitchenHours}</Text>
                  </>
                ) : null}
              </View>
              <View style={styles.badgeRow}>
                <Badge text={fulfillmentLabel} status="active" />
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

          <View style={[styles.viewMenuRow, { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }]}>
            <Text style={styles.viewMenuText}>View Menu & Plans</Text>
            <ArrowRight size={14} color={COLORS.primary} />
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
                <Text style={styles.greeting}>Hello, {user?.name || 'Foodie'}</Text>
                <Text style={styles.tagline}>Craving healthy ghar ka khana?</Text>
              </View>

              <View style={styles.headerActions}>
                <TouchableOpacity
                  style={[styles.notifBtn, { marginRight: 10 }]}
                  onPress={() => navigation.navigate('ChatList')}
                >
                  <MessageCircle size={22} color={COLORS.text} />
                  {unreadChatCount > 0 && (
                    <View style={styles.cartBadge}>
                      <Text style={styles.cartBadgeText}>
                        {unreadChatCount > 9 ? '9+' : unreadChatCount}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.notifBtn}
                  onPress={() => navigation.navigate('Notifications')}
                >
                  <Bell size={22} color={COLORS.text} />
                  {unreadCount > 0 && (
                    <View style={styles.cartBadge}>
                      <Text style={styles.cartBadgeText}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
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
                  style={[styles.skipButton, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }]}
                  onPress={() => navigation.navigate('CustomerSubscriptions')}
                >
                  <PauseCircle size={15} color={COLORS.primary} />
                  <Text style={styles.skipButtonText}>Manage or Skip Today's Meal</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Search Bar & Filter Button */}
            <View style={styles.searchFilterRow}>
              <View style={{ flex: 1 }}>
                <Input
                  placeholder="Search tiffin providers"
                  prefix={<Search size={18} color={COLORS.textMuted} />}
                  value={search}
                  onChangeText={setSearch}
                  style={{ marginBottom: 0 }}
                />
              </View>
              <TouchableOpacity
                style={[
                  styles.filterBtn,
                  (dietaryFilter !== 'all' || maxDistanceKm !== null) && styles.filterBtnActive,
                ]}
                onPress={() => {
                  setDraftDietary(dietaryFilter);
                  setDraftDistance(maxDistanceKm);
                  setFilterModalVisible(true);
                }}
              >
                <SlidersHorizontal
                  size={20}
                  color={
                    dietaryFilter !== 'all' || maxDistanceKm !== null
                      ? '#FFF'
                      : COLORS.primary
                  }
                />
                {(dietaryFilter !== 'all' || maxDistanceKm !== null) && (
                  <View style={styles.filterActiveDot} />
                )}
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Local Homemade Tiffin Providers</Text>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.emptyContainer}>
              <Search size={48} color={COLORS.textMuted} style={{ marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>No Providers Found</Text>
              <Text style={styles.emptySubtitle}>Try adjusting your search query.</Text>
            </View>
          )
        }
      />

      {/* Bottom Sheet Filter Modal */}
      <Modal
        visible={filterModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.filterModalOverlay}>
          <View style={styles.filterModalSheet}>
            <View style={styles.filterModalHeader}>
              <Text style={styles.filterModalTitle}>Filter Kitchens</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <X size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.filterSectionLabel}>Dietary Preference</Text>
            <View style={styles.filterChipRow}>
              {[
                { key: 'all', label: 'Both (All)' },
                { key: 'veg', label: 'Veg Only' },
                { key: 'non_veg', label: 'Non-Veg Only' },
              ].map((opt) => {
                const active = draftDietary === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[styles.filterChip, active && styles.filterChipSelected]}
                    onPress={() => setDraftDietary(opt.key)}
                  >
                    {opt.key === 'veg' && <VegIndicator isVeg={true} showLabel={false} />}
                    {opt.key === 'non_veg' && <VegIndicator isVeg={false} showLabel={false} />}
                    <Text
                      style={[
                        styles.filterChipText,
                        active && styles.filterChipTextSelected,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.distanceHeaderRow}>
              <Text style={[styles.filterSectionLabel, { marginTop: 0, marginBottom: 0 }]}>
                Distance Range
              </Text>
              <TouchableOpacity
                style={styles.detectLocBtn}
                disabled={locating}
                onPress={async () => {
                  setLocating(true);
                  try {
                    const granted = await requestLocationPermission();
                    if (!granted) {
                      CustomAlert.alert(
                        'Permission Required',
                        'Please enable location permission to filter by nearest distance.'
                      );
                    } else {
                      const pos = await getCurrentPosition();
                      setUserCoords(pos);
                    }
                  } catch (err) {
                    CustomAlert.alert('Location Error', err.message || 'Unable to get location');
                  } finally {
                    setLocating(false);
                  }
                }}
              >
                {locating ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : (
                  <Crosshair size={14} color={COLORS.primary} />
                )}
                <Text style={styles.detectLocText}>
                  {userCoords ? 'Location Ready' : 'Detect Location'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.filterChipRow}>
              {[
                { key: null, label: 'Any Distance' },
                { key: 2, label: 'Within 2 km' },
                { key: 5, label: 'Within 5 km' },
                { key: 10, label: 'Within 10 km' },
                { key: 20, label: 'Within 20 km' },
              ].map((opt) => {
                const active = draftDistance === opt.key;
                return (
                  <TouchableOpacity
                    key={String(opt.key)}
                    style={[styles.filterChip, active && styles.filterChipSelected]}
                    onPress={async () => {
                      if (opt.key !== null && !userCoords) {
                        setLocating(true);
                        try {
                          const granted = await requestLocationPermission();
                          if (!granted) {
                            CustomAlert.alert(
                              'Location Permission',
                              'Location permission is needed to filter providers by distance.'
                            );
                            setLocating(false);
                            return;
                          }
                          const pos = await getCurrentPosition();
                          setUserCoords(pos);
                        } catch (err) {
                          CustomAlert.alert(
                            'Location Error',
                            err.message || 'Could not detect current location.'
                          );
                          setLocating(false);
                          return;
                        }
                        setLocating(false);
                      }
                      setDraftDistance(opt.key);
                    }}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        active && styles.filterChipTextSelected,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.filterActionsRow}>
              <TouchableOpacity
                style={styles.resetFilterBtn}
                onPress={() => {
                  setDraftDietary('all');
                  setDraftDistance(null);
                  setDietaryFilter('all');
                  setMaxDistanceKm(null);
                  setFilterModalVisible(false);
                }}
              >
                <Text style={styles.resetFilterText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyFilterBtn}
                onPress={() => {
                  setDietaryFilter(draftDietary);
                  setMaxDistanceKm(draftDistance);
                  setFilterModalVisible(false);
                }}
              >
                <Text style={styles.applyFilterText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
  searchFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    marginBottom: 8,
  },
  filterBtn: {
    width: 48,
    height: 48,
    borderRadius: SIZES.radiusMd,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterActiveDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FDE047',
  },
  filterModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  filterModalSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: SIZES.radiusLg,
    borderTopRightRadius: SIZES.radiusLg,
    padding: 20,
    paddingBottom: 32,
  },
  filterModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  filterModalTitle: {
    ...FONTS.h3,
    color: COLORS.text,
  },
  filterSectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 8,
    marginBottom: 10,
  },
  distanceHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 10,
  },
  detectLocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: SIZES.radiusFull,
    backgroundColor: '#FFF8F2',
  },
  detectLocText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  filterChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: SIZES.radiusFull,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  filterChipSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#FFF3E0',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  filterChipTextSelected: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  filterActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  resetFilterBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  resetFilterText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  applyFilterBtn: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: SIZES.radiusMd,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  applyFilterText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
});

export default CustomerHomeScreen;

