/**
 * Customer Cart & Checkout Screen
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { COLORS, SIZES, FONTS } from '../../constants/theme';
import { updateQuantity, clearCart } from '../../store/slices/cartSlice';
import { customerApi } from '../../api/customerApi';

export const CustomerCartScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const cart = useSelector((state) => state.cart);
  const { user } = useSelector((state) => state.auth);

  const [deliveryType, setDeliveryType] = useState('delivery'); // 'delivery' | 'pickup'
  const [mealTiming, setMealTiming] = useState('lunch');
  const [deliveryAddress, setDeliveryAddress] = useState(
    user?.customerProfile?.delivery_address || user?.customerProfile?.address || 'Flat 402, Sunshine Residency'
  );
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const subtotal = cart.items.reduce((acc, i) => acc + i.price * i.quantity, 0);
  const deliveryCharge = deliveryType === 'delivery' ? 0 : 0; // Free delivery for demo
  const grandTotal = subtotal + deliveryCharge;

  const handlePlaceOrder = async () => {
    if (cart.items.length === 0) {
      Alert.alert('Empty Cart', 'Please add items to your cart first.');
      return;
    }

    if (deliveryType === 'delivery' && !deliveryAddress.trim()) {
      Alert.alert('Address Required', 'Please enter your delivery address.');
      return;
    }

    setSubmitting(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const itemsPayload = cart.items.map((i) => ({
        menu_item_id: i.menuItemId,
        quantity: i.quantity,
      }));

      await customerApi.createOrder({
        owner_id: cart.providerId,
        items: itemsPayload,
        order_date: today,
        meal_timing: mealTiming,
        delivery_type: deliveryType,
        delivery_address: deliveryAddress.trim(),
        notes: notes.trim(),
      });

      setSubmitting(false);
      dispatch(clearCart());

      Alert.alert(
        'Order Placed! 🍱',
        'Your daily meal order has been received by the kitchen.',
        [
          {
            text: 'Track Order',
            onPress: () => navigation.navigate('CustomerOrders'),
          },
        ]
      );
    } catch (err) {
      setSubmitting(false);
      Alert.alert('Error', err.message || 'Failed to place order');
    }
  };

  if (cart.items.length === 0) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Text style={styles.emptyIcon}>🛒</Text>
        <Text style={styles.emptyTitle}>Your Cart is Empty</Text>
        <Text style={styles.emptySubtitle}>
          Browse homemade tiffin providers and add your favorite dishes.
        </Text>
        <Button
          title="Explore Tiffins"
          onPress={() => navigation.navigate('CustomerHome')}
          style={{ marginTop: 20 }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Order Summary</Text>
        <Text style={styles.providerName}>From: {cart.providerName}</Text>

        {/* Items List Card */}
        <Card style={styles.card}>
          <Text style={styles.cardHeading}>Items in Cart</Text>
          {cart.items.map((item) => (
            <View key={item.menuItemId} style={styles.cartItemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemUnitPrice}>₹{item.price} each</Text>
              </View>

              <View style={styles.qtyContainer}>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() =>
                    dispatch(
                      updateQuantity({
                        menuItemId: item.menuItemId,
                        quantity: item.quantity - 1,
                      })
                    )
                  }
                >
                  <Text style={styles.qtyText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.qtyVal}>{item.quantity}</Text>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() =>
                    dispatch(
                      updateQuantity({
                        menuItemId: item.menuItemId,
                        quantity: item.quantity + 1,
                      })
                    )
                  }
                >
                  <Text style={styles.qtyText}>+</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.itemTotal}>₹{item.price * item.quantity}</Text>
            </View>
          ))}
        </Card>

        {/* Meal Timing & Delivery Options */}
        <Card style={styles.card}>
          <Text style={styles.cardHeading}>Meal Timing</Text>
          <View style={styles.optionRow}>
            {['lunch', 'dinner'].map((timing) => (
              <TouchableOpacity
                key={timing}
                onPress={() => setMealTiming(timing)}
                style={[
                  styles.optionBtn,
                  mealTiming === timing && styles.activeOptionBtn,
                ]}
              >
                <Text
                  style={[
                    styles.optionText,
                    mealTiming === timing && styles.activeOptionText,
                  ]}
                >
                  {timing === 'lunch' ? '☀️ Lunch' : '🌙 Dinner'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.cardHeading, { marginTop: 14 }]}>Delivery Option</Text>
          <View style={styles.optionRow}>
            <TouchableOpacity
              onPress={() => setDeliveryType('delivery')}
              style={[
                styles.optionBtn,
                deliveryType === 'delivery' && styles.activeOptionBtn,
              ]}
            >
              <Text
                style={[
                  styles.optionText,
                  deliveryType === 'delivery' && styles.activeOptionText,
                ]}
              >
                🛵 Doorstep Delivery
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setDeliveryType('pickup')}
              style={[
                styles.optionBtn,
                deliveryType === 'pickup' && styles.activeOptionBtn,
              ]}
            >
              <Text
                style={[
                  styles.optionText,
                  deliveryType === 'pickup' && styles.activeOptionText,
                ]}
              >
                🚶 Kitchen Pickup
              </Text>
            </TouchableOpacity>
          </View>

          {deliveryType === 'delivery' && (
            <Input
              label="Delivery Address"
              placeholder="Flat No, Building, Area"
              value={deliveryAddress}
              onChangeText={setDeliveryAddress}
              style={{ marginTop: 14 }}
            />
          )}

          <Input
            label="Cooking / Delivery Instructions"
            placeholder="e.g. Less oil, ring doorbell"
            value={notes}
            onChangeText={setNotes}
            style={{ marginTop: 8 }}
          />
        </Card>

        {/* Bill Breakdown */}
        <Card style={styles.card}>
          <Text style={styles.cardHeading}>Bill Details</Text>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Item Total</Text>
            <Text style={styles.billVal}>₹{subtotal}</Text>
          </View>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Delivery Fee</Text>
            <Text style={[styles.billVal, { color: COLORS.secondary }]}>FREE</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.billRow}>
            <Text style={styles.grandLabel}>To Pay</Text>
            <Text style={styles.grandVal}>₹{grandTotal}</Text>
          </View>
        </Card>

        <Button
          title={`Place Order • ₹${grandTotal}`}
          onPress={handlePlaceOrder}
          loading={submitting}
          style={{ marginBottom: 30 }}
        />
      </ScrollView>
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyIcon: {
    fontSize: 54,
    marginBottom: 12,
  },
  emptyTitle: {
    ...FONTS.h2,
    color: COLORS.text,
  },
  emptySubtitle: {
    ...FONTS.subtitle,
    textAlign: 'center',
    marginTop: 6,
  },
  title: {
    ...FONTS.h2,
    color: COLORS.text,
  },
  providerName: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '700',
    marginBottom: 16,
    marginTop: 2,
  },
  card: {
    marginBottom: 14,
  },
  cardHeading: {
    ...FONTS.h3,
    marginBottom: 12,
    color: COLORS.text,
  },
  cartItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  itemUnitPrice: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  qtyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: SIZES.radiusSm,
    marginHorizontal: 12,
  },
  qtyBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  qtyText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  qtyVal: {
    fontSize: 13,
    fontWeight: '700',
    paddingHorizontal: 6,
    color: COLORS.text,
  },
  itemTotal: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
    minWidth: 50,
    textAlign: 'right',
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  optionBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: SIZES.radiusSm,
    backgroundColor: COLORS.chipBg,
    marginHorizontal: 4,
  },
  activeOptionBtn: {
    backgroundColor: COLORS.primary,
  },
  optionText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  activeOptionText: {
    color: '#FFF',
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  billLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  billVal: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginVertical: 10,
  },
  grandLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  grandVal: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primary,
  },
});

export default CustomerCartScreen;

