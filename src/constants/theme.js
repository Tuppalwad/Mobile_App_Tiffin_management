/**
 * Theme & Design System
 * Homemade Tiffin Management App
 */

export const COLORS = {
  // Brand Warm Food Palette
  primary: '#E65100', // Deep Warm Orange
  primaryLight: '#FFE082',
  primaryDark: '#BF360C',
  accent: '#FF9800',

  // Fresh & Health Accents
  secondary: '#2E7D32', // Leaf Green
  secondaryLight: '#E8F5E9',

  // Neutrals & Backgrounds
  background: '#F8F9FA',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  border: '#E0E0E0',
  divider: '#EEEEEE',

  // Text
  text: '#212121',
  textSecondary: '#666666',
  textMuted: '#9E9E9E',
  textLight: '#FFFFFF',

  // Status & Badges
  success: '#2E7D32',
  warning: '#F57C00',
  danger: '#D32F2F',
  info: '#1976D2',

  // Chips & Badges
  chipBg: '#F0F0F0',
  highlight: '#FFF3E0',
};

export const SIZES = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
  radiusSm: 8,
  radiusMd: 12,
  radiusLg: 16,
  radiusFull: 9999,
};

export const FONTS = {
  regular: { fontSize: 14, color: COLORS.text },
  bold: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  subtitle: { fontSize: 15, fontWeight: '500', color: COLORS.textSecondary },
  caption: { fontSize: 12, color: COLORS.textMuted },
  h1: { fontSize: 26, fontWeight: '800', color: COLORS.text },
  h2: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  h3: { fontSize: 18, fontWeight: '600', color: COLORS.text },
};

