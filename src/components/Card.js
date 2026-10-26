/**
 * Card & Badge Components
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SIZES } from '../constants/theme';

export const Card = ({ children, style }) => {
  return <View style={[styles.card, style]}>{children}</View>;
};

export const Badge = ({ text, status = 'default', style }) => {
  const getColors = () => {
    switch (status) {
      case 'active':
      case 'paid':
      case 'delivered':
      case 'approved':
        return { bg: '#E8F5E9', text: '#2E7D32' };
      case 'preparing':
      case 'confirmed':
      case 'order_received':
        return { bg: '#FFF3E0', text: '#E65100' };
      case 'out_for_delivery':
      case 'tiffin_ready':
        return { bg: '#E3F2FD', text: '#1565C0' };
      case 'pending':
      case 'partial':
      case 'requested':
        return { bg: '#FFF8E1', text: '#F57F17' };
      case 'cancelled':
      case 'expired':
      case 'rejected':
        return { bg: '#FFEBEE', text: '#C62828' };
      default:
        return { bg: '#F5F5F5', text: '#616161' };
    }
  };

  const { bg, text: textColor } = getColors();

  return (
    <View style={[styles.badge, { backgroundColor: bg }, style]}>
      <Text style={[styles.badgeText, { color: textColor }]}>
        {text ? text.replace(/_/g, ' ').toUpperCase() : ''}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radiusMd,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: SIZES.radiusSm,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
});

export default { Card, Badge };

