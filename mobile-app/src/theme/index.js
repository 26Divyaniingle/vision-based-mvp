// MediSense AI - Design System / Theme
export const Colors = {
  // Background layers
  bg: '#0a0a14',
  bgCard: 'rgba(255,255,255,0.06)',
  bgCardBorder: 'rgba(255,255,255,0.10)',

  // Primary Brand
  indigo: '#6366f1',
  purple: '#a855f7',
  indigoLight: 'rgba(99,102,241,0.20)',
  purpleLight: 'rgba(168,85,247,0.20)',

  // Semantic
  emerald: '#10b981',
  emeraldLight: 'rgba(16,185,129,0.18)',
  rose: '#f43f5e',
  roseLight: 'rgba(244,63,94,0.18)',
  amber: '#f59e0b',

  // Text
  textPrimary: '#f1f5f9',
  textSecondary: '#94a3b8',
  textMuted: '#475569',

  // Gradients (used with LinearGradient)
  gradientPrimary: ['#6366f1', '#a855f7'],
  gradientEmerald: ['#10b981', '#059669'],
  gradientDark: ['#0f0c29', '#302b63', '#24243e'],
  gradientCard: ['rgba(99,102,241,0.15)', 'rgba(168,85,247,0.08)'],
};

export const Typography = {
  fontFamily: 'System', // Will use system sans-serif; integrate custom font if desired
  sizes: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 24,
    '2xl': 30,
    '3xl': 38,
  },
  weights: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
};

export const Radii = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  full: 9999,
};

export const Shadows = {
  glow: {
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 18,
    elevation: 12,
  },
  glowEmerald: {
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
};
