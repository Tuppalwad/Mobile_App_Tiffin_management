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
  Alert,
} from 'react-native';
import { Card, Badge } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { COLORS, SIZES, FONTS } from '../../constants/theme';
import { customerApi } from '../../api/customerApi';

export const CustomerSubscriptionsScreen = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [skips, setSkips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedSubId, setSelectedSubId] = useState(null);

  // Skip Form State
  const [skipDate, setSkipDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('Out of town / not needed today');
  const [submitting, setSubmitting] = useState(false);

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

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleOpenSkipModal = (subId) => {
    setSelectedSubId(subId);
    setModalVisible(true);
  };

  const handleSubmitSkip = async () => {
    if (!selectedSubId || !skipDate) {
      Alert.alert('Required', 'Please select date to skip.');
      return;
    }

    setSubmitting(true);
    try {
      await customerApi.requestSkipTiffin({
        subscription_id: selectedSubId,
        skip_date: skipDate,
        reason: reason.trim(),
      });

      setSubmitting(false);
      setModalVisible(false);
      fetchData();
      Alert.alert('Request Submitted! ⏸️', 'The kitchen has been notified to skip your meal.');
    } catch (err) {
      setSubmitting(false);
      Alert.alert('Error', err.message || 'Failed to submit skip request');
    }
  };

  const renderSubscription = ({ item }) => {
    const owner = item.owner?.ownerProfile || {};
    return (
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.planName}>{item.plan?.name}</Text>
            <Text style={styles.ownerName}>🧑‍🍳 {owner.business_name || 'Chef'}</Text>
          </View>
          <Badge text={item.status} status={item.status} />
        </View>

        <View style={styles.datesRow}>
          <Text style={styles.datesText}>
            📅 {item.start_date} to {item.end_date}
          </Text>
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

        {/* Skip Meal Quick Action */}
        {item.status === 'active' && (
          <TouchableOpacity
            style={styles.skipActionBtn}
            onPress={() => handleOpenSkipModal(item.id)}
          >
            <Text style={styles.skipActionText}>⏸️ Skip A Meal / Today's Tiffin</Text>
          </TouchableOpacity>
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
              <Text style={styles.emptyIcon}>📅</Text>
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
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Skip Tiffin Meal</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.noticeBox}>
                <Text style={styles.noticeText}>
                  ℹ️ Cutoff Notice: Please request skips at least 2 hours before meal preparation time so food is not wasted.
                </Text>
              </View>

              <Input
                label="Date to Skip (YYYY-MM-DD)"
                value={skipDate}
                onChangeText={setSkipDate}
                placeholder="2024-10-25"
              />

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
});

export default CustomerSubscriptionsScreen;

