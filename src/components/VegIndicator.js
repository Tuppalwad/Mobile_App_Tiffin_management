/**
 * Veg / Non-Veg Indicator Badge
 * Standard green/red square-with-dot dietary symbol.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const VegIndicator = ({ isVeg = true, showLabel = true }) => {
  const veg = isVeg !== false;
  const color = veg ? '#16A34A' : '#DC2626';

  return (
    <View style={styles.row}>
      <View style={[styles.box, { borderColor: color }]}>
        <View style={[styles.dot, { backgroundColor: color }]} />
      </View>
      {showLabel && (
        <Text style={[styles.label, { color }]}>{veg ? 'Veg' : 'Non-Veg'}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  box: {
    width: 14,
    height: 14,
    borderWidth: 1.5,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
  },
});
