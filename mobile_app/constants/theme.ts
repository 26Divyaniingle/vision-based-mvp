// Color Palette & Design Tokens
export const COLORS = {
  // Primary gradient
  gradientStart: '#0f0c29',
  gradientMid: '#302b63',
  gradientEnd: '#24243e',

  // Accent
  accent: '#00d2ff',
  accentSecondary: '#7b2ff7',
  accentGold: '#f9d423',

  // Status colors
  success: '#00e676',
  warning: '#ffab40',
  danger: '#ff5252',

  // UI
  cardBg: 'rgba(255, 255, 255, 0.07)',
  cardBorder: 'rgba(255, 255, 255, 0.12)',
  textPrimary: '#ffffff',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.35)',

  // Overlays
  overlayLight: 'rgba(255,255,255,0.05)',
  overlayDark: 'rgba(0,0,0,0.4)',
};

export const FONTS = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const RADIUS = {
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  full: 9999,
};

// Backend API URL — update this to your deployed FastAPI server
export const API_BASE_URL = 'http://192.168.1.100:8000';
export const WS_BASE_URL  = 'ws://192.168.1.100:8000';
