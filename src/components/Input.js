/**
 * Custom Input Component
 */

import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { COLORS, SIZES } from '../constants/theme';

export const Input = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  secureTextEntry = false,
  multiline = false,
  numberOfLines = 1,
  maxLength,
  error,
  prefix,
  style,
  inputStyle,
}) => {
  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputWrapper, error && styles.inputError]}>
        {prefix && <Text style={styles.prefix}>{prefix}</Text>}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textMuted}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          multiline={multiline}
          numberOfLines={numberOfLines}
          maxLength={maxLength}
          style={[
            styles.input,
            multiline && { height: 24 * numberOfLines, textAlignVertical: 'top' },
            inputStyle,
          ]}
        />
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1.2,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusMd,
    paddingHorizontal: 14,
  },
  inputError: {
    borderColor: COLORS.danger,
  },
  prefix: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginRight: 6,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 12,
    marginTop: 4,
  },
});

export default Input;

