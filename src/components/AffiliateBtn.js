/**
 * AffiliateBtn.js - アフィリエイトリンクボタンコンポーネント
 *
 * ・AppContext から affiliateUrl を取得（linkChecker.js で生存確認済み）
 * ・URLが未確認中（null）のときはスケルトン表示
 * ・Linking.openURL で外部ブラウザを起動
 * ・押下時に軽微なスケールアニメーションを付与
 */

import React, { useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  Linking,
  Alert,
  View,
  ActivityIndicator,
} from 'react-native';
import { useAppContext } from '../context/AppContext';
import { COLORS, FONTS, FONT_SIZES, SPACING, RADIUS, SHADOWS } from '../constants/theme';

// ─── コンポーネント ──────────────────────────────────────────────────────────
const AffiliateBtn = () => {
  const { affiliateUrl } = useAppContext();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // ── ボタン押下アニメーション ───────────────────────────────────────────────
  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  // ── リンクを開く ──────────────────────────────────────────────────────────
  const handlePress = async () => {
    if (!affiliateUrl) return;

    try {
      const canOpen = await Linking.canOpenURL(affiliateUrl);
      if (canOpen) {
        await Linking.openURL(affiliateUrl);
      } else {
        Alert.alert('エラー', 'リンクを開けませんでした。');
      }
    } catch (_error) {
      Alert.alert('エラー', 'ブラウザの起動に失敗しました。');
    }
  };

  // ── URL確認中はローディング表示 ───────────────────────────────────────────
  if (!affiliateUrl) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="small" color={COLORS.accent} />
        <Text style={styles.loadingText}>投資情報を読み込み中...</Text>
      </View>
    );
  }

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={styles.container}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        accessibilityLabel="投資を始める（外部リンク）"
        accessibilityRole="link"
      >
        <Text style={styles.emoji}>📈</Text>
        <View style={styles.textBlock}>
          <Text style={styles.title}>投資を始めてみる</Text>
          <Text style={styles.subtitle}>おすすめの証券口座を確認する →</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>PR</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accentLight,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.accent,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.sm,
    ...SHADOWS.card,
  },
  loadingContainer: {
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  loadingText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    fontFamily: FONTS.regular,
  },
  emoji: {
    fontSize: 28,
    marginRight: SPACING.sm,
  },
  textBlock: {
    flex: 1,
  },
  title: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
    color: COLORS.accent,
  },
  badge: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.xs + 2,
    paddingVertical: 2,
    marginLeft: SPACING.sm,
  },
  badgeText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
    color: COLORS.textOnAccent,
    letterSpacing: 0.5,
  },
});

export default AffiliateBtn;
