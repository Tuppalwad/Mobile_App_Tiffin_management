/**
 * Notifications Screen
 * Displays incoming alerts for Owners and Customers.
 * Notifications disappear on tap and are permanently removed from the database.
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
import { useSelector } from 'react-redux';
import {
  UtensilsCrossed,
  PartyPopper,
  PauseCircle,
  CreditCard,
  Bell,
  X,
  ArrowLeft,
} from 'lucide-react-native';
import { CustomAlert } from "../../components/CustomAlert";
import { COLORS, SIZES, FONTS } from '../../constants/theme';
import { notificationApi } from '../../api/notificationApi';
import { useNotificationAutoRefresh } from '../../services/notificationEvents';

export const NotificationsScreen = ({ navigation }) => {
  const { role } = useSelector((state) => state.auth);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await notificationApi.getNotifications({ pageSize: 50 });
      setNotifications(response.data?.items || []);
    } catch (err) {
      console.warn('Error fetching notifications:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Auto-refresh notifications in real-time when new push notifications arrive
  useNotificationAutoRefresh('*', fetchNotifications);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  /**
   * When user clicks on a notification:
   * 1. Remove it immediately from the mobile UI (disappear).
   * 2. Delete it permanently from the database.
   */
  const handleNotificationPress = async (item) => {
    const notifId = item.id;

    // Instantly remove from mobile state so it disappears
    setNotifications((prev) => prev.filter((n) => n.id !== notifId));

    try {
      // Delete permanently from the database
      await notificationApi.deleteNotification(notifId);
    } catch (err) {
      console.warn('Could not delete notification from DB:', err.message);
    }

    // Optional navigation based on reference
    if (item.reference_type === 'order') {
      CustomAlert.alert(
        item.title || 'Order Notification',
        item.message,
        [
          { text: 'Close', style: 'cancel' },
          {
            text: 'View Orders',
            onPress: () => {
              if (role === 'owner') {
                navigation.navigate('OwnerTabs', { screen: 'OwnerOrders' });
              } else {
                navigation.navigate('CustomerTabs', { screen: 'CustomerOrders' });
              }
            },
          },
        ]
      );
    } else {
      CustomAlert.alert(item.title || 'Notification', item.message, [{ text: 'OK' }]);
    }
  };

  const handleClearAll = () => {
    if (notifications.length === 0) return;

    CustomAlert.alert(
      'Clear All Notifications',
      'Are you sure you want to delete all notifications?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            setNotifications([]);
            try {
              await notificationApi.clearAll();
            } catch (err) {
              console.warn('Could not clear all notifications:', err.message);
            }
          },
        },
      ]
    );
  };

  const renderNotificationIcon = (type) => {
    switch (type) {
      case 'order':
        return <UtensilsCrossed size={20} color={COLORS.primary} />;
      case 'subscription':
        return <PartyPopper size={20} color={COLORS.secondary} />;
      case 'skip':
        return <PauseCircle size={20} color={COLORS.warning} />;
      case 'payment':
        return <CreditCard size={20} color={COLORS.info} />;
      default:
        return <Bell size={20} color={COLORS.primary} />;
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  const renderNotification = ({ item }) => {
    return (
      <TouchableOpacity
        style={[styles.itemCard, !item.is_read && styles.itemCardUnread]}
        activeOpacity={0.7}
        onPress={() => handleNotificationPress(item)}
      >
        <View style={styles.iconCircle}>
          {renderNotificationIcon(item.type)}
        </View>

        <View style={styles.contentBox}>
          <View style={styles.titleRow}>
            <Text style={styles.itemTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.timeText}>{formatTime(item.created_at)}</Text>
          </View>

          <Text style={styles.itemMessage} numberOfLines={3}>
            {item.message}
          </Text>

          <Text style={styles.dismissHint}>Tap to dismiss and view details</Text>
        </View>

        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => handleNotificationPress(item)}
        >
          <X size={16} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={[styles.backButton, { flexDirection: 'row', alignItems: 'center', gap: 4 }]} onPress={() => navigation.goBack()}>
          <ArrowLeft size={18} color={COLORS.primary} />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {notifications.length > 0 ? (
          <TouchableOpacity onPress={handleClearAll}>
            <Text style={styles.clearAllText}>Clear All</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderNotification}
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
          />
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 60 }} />
          ) : (
            <View style={styles.emptyContainer}>
              <Bell size={48} color={COLORS.textMuted} style={{ marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>No Notifications</Text>
              <Text style={styles.emptySubtitle}>
                You're all caught up! New alerts and order updates will appear here.
              </Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    paddingVertical: 6,
    paddingRight: 10,
  },
  backButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  headerTitle: {
    ...FONTS.h3,
    color: COLORS.text,
  },
  clearAllText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: '700',
  },
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: SIZES.radiusMd,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 1,
    alignItems: 'flex-start',
  },
  itemCardUnread: {
    borderColor: COLORS.primary,
    backgroundColor: '#FFF9F5',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 22,
  },
  contentBox: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
    marginRight: 8,
  },
  timeText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  itemMessage: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  dismissHint: {
    fontSize: 11,
    color: COLORS.primary,
    marginTop: 6,
    fontWeight: '600',
  },
  deleteBtn: {
    paddingLeft: 8,
    paddingVertical: 4,
  },
  deleteBtnText: {
    color: COLORS.textMuted,
    fontSize: 16,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyIcon: {
    fontSize: 54,
    marginBottom: 12,
  },
  emptyTitle: {
    ...FONTS.h3,
    color: COLORS.text,
  },
  emptySubtitle: {
    ...FONTS.subtitle,
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: 30,
  },
});

export default NotificationsScreen;

