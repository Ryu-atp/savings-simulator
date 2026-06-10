/**
 * theme.js - 配色・フォント・共通スタイル定数
 * 仕様: 背景 #FFFFFF / アクセント #00CED1 を厳守
 */

export const COLORS = {
  // ── ベースカラー ──────────────────────────────
  background: '#FFFFFF',
  surface: '#F7FFFE',        // カード背景（白に近い薄いティール）
  surfaceElevated: '#EFFFFE', // 少し浮いたカード

  // ── アクセントカラー ──────────────────────────
  accent: '#00CED1',          // ダークターコイズ（メインアクセント）
  accentLight: '#E0FAFB',     // アクセントの薄い背景用
  accentDark: '#009EA1',      // ボタン押下時・シャドウ用

  // ── テキスト ──────────────────────────────────
  textPrimary: '#0D1F2D',     // メインテキスト（濃いネイビー）
  textSecondary: '#4A6572',   // サブテキスト
  textMuted: '#9AABB5',       // プレースホルダー・補足
  textOnAccent: '#FFFFFF',    // アクセント背景上のテキスト

  // ── ボーダー・区切り ──────────────────────────
  border: '#E8F5F5',
  borderFocus: '#00CED1',

  // ── 状態カラー ────────────────────────────────
  success: '#2ECC71',
  warning: '#F39C12',
  error: '#E74C3C',
  info: '#3498DB',

  // ── グラジェント（LinearGradient用の配列）────
  gradientAccent: ['#00CED1', '#009EA1'],
  gradientCard: ['#EFFFFE', '#F7FFFE'],
  gradientHero: ['#00CED1', '#00A8AB'],

  // ── 半透明 ────────────────────────────────────
  overlay: 'rgba(0, 206, 209, 0.08)',
  shadow: 'rgba(0, 206, 209, 0.18)',
};

/**
 * フォントファミリー定数
 * React Native ではシステムフォントを使用（iOS: SF Pro）
 * expo-font で外部フォント導入も可能
 */
export const FONTS = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
  // 将来的に expo-font 追加時:
  // regular: 'NotoSansJP_400Regular',
  // medium:  'NotoSansJP_500Medium',
  // bold:    'NotoSansJP_700Bold',
};

export const FONT_SIZES = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 26,
  display: 36,
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
  md: 12,
  lg: 20,
  xl: 28,
  full: 9999,
};

export const SHADOWS = {
  card: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  },
  button: {
    shadowColor: COLORS.accentDark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
};
