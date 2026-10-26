/**
 * Provider Detail Screen
 * Shows kitchen profile, full menu, subscription plans, and add-to-cart actions
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Card, Badge } from '../../components/Card';
import { Button } from '../../components/Button';
import { COLORS, SIZES, FONTS } from '../../constants/theme';
import { customerApi } from '../../api/customerApi';
import { addToCart, updateQuantity } from '../../store/slices/cartSlice';

export const ProviderDetailScreen = ({ route, navigation }) => {
  const { providerId } = route.params;
  const dispatch = useDispatch();
  const cart = useSelector((state) => state.cart);

  const [activeTab, setActiveTab] = useState('menu'); // 'menu' | 'plans'
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const response = await customerApi.getProviderDetails(providerId);
        setData(response.data);
      } catch (err) {
        Alert.alert('Error', err.message || 'Could not load provider details.');
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [providerId]);

  const handleSubscribe = async (plan) => {
    Alert.alert(
      'Confirm Subscription',
      `Subscribe to "${plan.name}" for ₹${plan.price} (30 Days)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm & Subscribe',
          onPress: async () => {
            setSubscribing(true);
            try {
              const today = new Date().toISOString().split('T')[0];
              await customerApi.createSubscription({
                owner_id: providerId,
                plan_id: plan.id,
                start_date: today,
                notes: 'Subscribed via app',
              });
              setSubscribing(false);
              Alert.alert('Subscribed!', 'Your monthly tiffin plan is now active.', [
                {
                  text: 'View Subscriptions',
                  onPress: () =>
                    navigation.navigate('CustomerTabs', {
                      screen: 'CustomerSubscriptions',
                    }),
                },
              ]);
            } catch (err) {
              setSubscribing(false);
              Alert.alert('Error', err.message || 'Subscription failed');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  const { provider, menu = [], plans = [] } = data || {};

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Back Button */}
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back to Providers</Text>
        </TouchableOpacity>

        {/* Kitchen Profile Card */}
        <Card style={styles.profileCard}>
          <Text style={styles.businessName}>{provider?.business_name}</Text>
          <Text style={styles.address}>📍 {provider?.address || `${provider?.city}, ${provider?.state}`}</Text>
          {provider?.description ? (
            <Text style={styles.desc}>{provider?.description}</Text>
          ) : null}

          <View style={styles.metaRow}>
            <Text style={styles.metaBadge}>🛵 Delivery Available</Text>
            <Text style={styles.metaBadge}>⏰ 08:00 AM - 09:30 PM</Text>
          </View>
        </Card>

        {/* Menu vs Plans Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            onPress={() => setActiveTab('menu')}
            style={[styles.tab, activeTab === 'menu' && styles.activeTab]}
          >
            <Text style={[styles.tabText, activeTab === 'menu' && styles.activeTabText]}>
              Daily Menu ({menu.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('plans')}
            style={[styles.tab, activeTab === 'plans' && styles.activeTab]}
          >
            <Text style={[styles.tabText, activeTab === 'plans' && styles.activeTabText]}>
              Monthly Plans ({plans.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab 1: Menu Items */}
        {activeTab === 'menu' && (
          <View>
            {menu.map((item) => {
              const cartItem = cart.items.find((i) => i.menuItemId === item.id);
              const qty = cartItem ? cartItem.quantity : 0;

              return (
                <Card key={item.id} style={styles.menuCard}>
                  <View style={styles.itemHeader}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={styles.itemCategory}>{item.category} • {item.serving_size || '1 person'}</Text>
                    </View>
                    <Text style={styles.itemPrice}>₹{item.price}</Text>
                  </View>

                  {item.description ? (
                    <Text style={styles.itemDesc}>{item.description}</Text>
                  ) : null}

                  <View style={styles.itemActionRow}>
                    {qty > 0 ? (
                      <View style={styles.qtyContainer}>
                        <TouchableOpacity
                          style={styles.qtyBtn}
                          onPress={() =>
                            dispatch(updateQuantity({ menuItemId: item.id, quantity: qty - 1 }))
                          }
                        >
                          <Text style={styles.qtyBtnText}>−</Text>
                        </TouchableOpacity>
                        <Text style={styles.qtyValue}>{qty}</Text>
                        <TouchableOpacity
                          style={styles.qtyBtn}
                          onPress={() =>
                            dispatch(updateQuantity({ menuItemId: item.id, quantity: qty + 1 }))
                          }
                        >
                          <Text style={styles.qtyBtnText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.addCartBtn}
                        onPress={() =>
                          dispatch(
                            addToCart({
                              providerId: provider.user_id,
                              providerName: provider.business_name,
                              item,
                            })
                          )
                        }
                      >
                        <Text style={styles.addCartText}>+ ADD TO CART</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </Card>
              );
            })}
          </View>
        )}

        {/* Tab 2: Subscription Plans */}
        {activeTab === 'plans' && (
          <View>
            {plans.map((plan) => (
              <Card key={plan.id} style={styles.planCard}>
                <View style={styles.planHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.planName}>{plan.name}</Text>
                    <Text style={styles.planDuration}>
                      📅 {plan.duration_days} Days Plan • Free Delivery
                    </Text>
                  </View>
                  <Text style={styles.planPrice}>₹{plan.price}</Text>
                </View>

                {plan.description ? (
                  <Text style={styles.planDesc}>{plan.description}</Text>
                ) : null}

                {plan.planItems?.length > 0 && (
                  <View style={styles.inclusionBox}>
                    <Text style={styles.incTitle}>Included in this plan:</Text>
                    {plan.planItems.map((pi, idx) => (
                      <Text key={idx} style={styles.incItem}>
                        ✓ {pi.quantity}x {pi.menuItem?.name || 'Tiffin Meal'}
                      </Text>
                    ))}
                  </View>
                )}

                <Button
                  title="Subscribe Now"
                  onPress={() => handleSubscribe(plan)}
                  loading={subscribing}
                  style={{ marginTop: 12 }}
                />
              </Card>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Floating Cart Button */}
      {cart.items.length > 0 && (
        <View style={styles.floatingCart}>
          <View>
            <Text style={styles.cartItemsCount}>
              {cart.items.reduce((acc, i) => acc + i.quantity, 0)} Items Added
            </Text>
            <Text style={styles.cartTotal}>
              ₹{cart.items.reduce((acc, i) => acc + i.price * i.quantity, 0)}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.checkoutBtn}
            onPress={() =>
              navigation.navigate('CustomerTabs', {
                screen: 'CustomerCart',
              })
            }
          >
            <Text style={styles.checkoutText}>View Cart 🛒 →</Text>
          </TouchableOpacity>
        </View>
      )}
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
    paddingBottom: 90,
  },
  backBtn: {
    marginBottom: 12,
  },
  backText: {
    fontSize: 15,
    color: COLORS.primary,
    fontWeight: '600',
  },
  profileCard: {
    marginBottom: 16,
  },
  businessName: {
    ...FONTS.h2,
    color: COLORS.text,
  },
  address: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginVertical: 4,
  },
  desc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginTop: 4,
  },
  metaRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  metaBadge: {
    fontSize: 12,
    backgroundColor: '#F5F5F5',
    color: COLORS.textSecondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: SIZES.radiusSm,
    marginRight: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMd,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radiusMd - 1,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  activeTabText: {
    color: '#FFF',
  },
  menuCard: {
    marginBottom: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  itemName: {
    ...FONTS.h3,
    color: COLORS.text,
  },
  itemCategory: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  itemDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 6,
    lineHeight: 18,
  },
  itemActionRow: {
    alignItems: 'flex-end',
    marginTop: 12,
  },
  addCartBtn: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: SIZES.radiusSm,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  addCartText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  qtyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radiusSm,
  },
  qtyBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  qtyBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  qtyValue: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
    paddingHorizontal: 8,
  },
  planCard: {
    marginBottom: 14,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  planName: {
    ...FONTS.h3,
    color: COLORS.text,
  },
  planDuration: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  planPrice: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primary,
  },
  planDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  inclusionBox: {
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
  floatingCart: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: COLORS.text,
    borderRadius: SIZES.radiusLg,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  cartItemsCount: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  cartTotal: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
  },
  checkoutBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: SIZES.radiusMd,
  },
  checkoutText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ProviderDetailScreen;
