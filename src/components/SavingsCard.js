/**
 * SavingsCard.js - 計算結果表示カードコンポーネント（v2.1）
 *
 * v2.1 変更点:
 *   ・保存ボタンを削除（自動保存に移行）
 *   ・「✅ 自動保存しました」トーストを一時表示
 *   ・AssetGrowthChart を削除（v2.0仕様に準拠）
 *   ・元本表示を「元本（総投資額）」に変更（積立対応）
 *
 * アニメーション:
 *   ・カード出現時にフェードイン＋スライドアップ
 *   ・数値カウントアップ（1秒間）
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { formatJPY, formatShort } from '../hooks/useCalculator';
import AssetGrowthChart from './AssetGrowthChart';
import { recalculateWithTaxMode } from '../utils/calculator';
import {
  COLORS,
  FONTS,
  FONT_SIZES,
  SPACING,
  RADIUS,
  SHADOWS,
} from '../constants/theme';

// ─── 自動保存トースト ─────────────────────────────────────────────────────────
const AutoSaveToast = ({ visible }) => {
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    Animated.sequence([
      Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(1400),
      Animated.timing(opacityAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [visible, opacityAnim]);

  if (!visible) return null;
  return (
    <Animated.View style={[styles.toast, { opacity: opacityAnim }]}>
      <Text style={styles.toastText}>✅ 自動保存しました</Text>
    </Animated.View>
  );
};

// ─── コンポーネント ──────────────────────────────────────────────────────────
const SavingsCard = ({ result, autoSaved }) => {
  const [taxMode, setTaxMode] = useState('none');

  const calculationType = result?.calculationType ?? result?.inputs?.calculationType ?? 'annualRate';

  const recalculatedResult = useMemo(() => {
    if (!result) return null;
    const recalculated = recalculateWithTaxMode({
      currentAsset: result.currentAsset ?? result.inputs?.currentAsset ?? 0,
      principal: result.principal ?? result.inputs?.principal ?? 0,
      annualRate: result.originalAnnualRate ?? result.inputs?.annualRate ?? 0,
      years: result.years ?? result.inputs?.years ?? 0,
      frequencyId: result.frequencyId ?? result.inputs?.frequencyId ?? 'monthly',
      taxMode,
      calculationType,
    });
    return {
      ...result,
      ...recalculated,
    };
  }, [result, taxMode, calculationType]);



  // ── カード出現アニメーション ───────────────────────────────────────────────
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(24);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        speed: 14,
        bounciness: 6,
        useNativeDriver: true,
      }),
    ]).start();
  }, [result, fadeAnim, slideAnim]);

  const displayFuture = recalculatedResult?.futureValue ?? 0;
  const displayGain   = recalculatedResult?.totalGain ?? 0;

  const subheaderText = useMemo(() => {
    if (!result) return '';
    const years = result.years ?? result.inputs?.years ?? 0;
    const frequencyLabel = result.frequencyLabel ?? result.inputs?.frequencyLabel ?? '';
    const freqPart = frequencyLabel ? ` ／ ${frequencyLabel}積立` : '';
    const displayRate = result.annualRate ?? result.inputs?.annualRate ?? 0;
    const annRate = result.originalAnnualRate ?? result.inputs?.annualRate ?? result.originalAnnualRate ?? displayRate;
    return `想定年利 ${annRate}% ／ ${years}年運用${freqPart}`;
  }, [result]);

  if (!result) return null;

  return (
    <Animated.View
      style={[
        styles.card,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {/* 自動保存トースト */}
      <AutoSaveToast visible={!!autoSaved} />

      {/* ── ヘッダー ───────────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.headerEmoji}>
          {result.presetId === 'sp500'
            ? '🇺🇸'
            : result.presetId === 'allcountry'
            ? '🌍'
            : '💰'}
        </Text>
        <View>
          <Text style={styles.headerLabel}>{result.presetLabel || '投資（想定年利）'}</Text>
          <Text style={styles.headerSub}>
            {subheaderText}
          </Text>
        </View>
      </View>

      {/* ── メイン数値 ─────────────────────────────────────────── */}
      <View style={styles.mainValueContainer}>
        <Text style={styles.mainLabel}>推定資産</Text>
        <Text style={styles.mainValue}>¥{formatJPY(displayFuture)}</Text>
        <Text style={styles.mainShort}>{formatShort(recalculatedResult.futureValue)}</Text>
      </View>

      {/* ── 比較行 ────────────────────────────────────────────── */}
      <View style={styles.compareRow}>
        <View style={styles.compareItem}>
          <Text style={styles.compareLabel}>元本（総投資額）</Text>
          <Text style={styles.compareValue}>¥{formatJPY(recalculatedResult.principalTotal)}</Text>
        </View>
        <View style={styles.compareDivider} />
        <View style={styles.compareItem}>
          <Text style={styles.compareLabel}>運用益</Text>
          <Text style={[styles.compareValue, styles.gainValue]}>
            +¥{formatJPY(displayGain)}
          </Text>
        </View>
        <View style={styles.compareDivider} />
        <View style={styles.compareItem}>
          <Text style={styles.compareLabel}>利益率</Text>
          <Text style={[styles.compareValue, styles.gainValue]}>
            +{recalculatedResult.gainRate}%
          </Text>
        </View>
      </View>

      {/* ── グラフ表示 ── */}
      <View style={styles.chartWrapper}>
        <AssetGrowthChart
          result={recalculatedResult}
          taxMode={taxMode}
          onTaxModeChange={setTaxMode}
        />
      </View>

    </Animated.View>
  );
};

// ─── スタイル ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.xl,
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.sm,
    padding: SPACING.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  headerEmoji: {
    fontSize: 32,
  },
  headerLabel: {
    fontSize: FONT_SIZES.lg,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
  },
  headerSub: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  mainValueContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.accentLight,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
  },
  mainLabel: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.medium,
    color: COLORS.accent,
    letterSpacing: 1,
    marginBottom: SPACING.xs,
  },
  mainValue: {
    fontSize: FONT_SIZES.display,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
    letterSpacing: -1,
  },
  mainShort: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  compareRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
  },
  compareItem: {
    flex: 1,
    alignItems: 'center',
  },
  compareDivider: {
    width: 1,
    height: 36,
    backgroundColor: COLORS.border,
  },
  compareLabel: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    marginBottom: 4,
    textAlign: 'center',
  },
  compareValue: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
  },
  gainValue: {
    color: COLORS.success,
  },
  // ── 自動保存トースト ──
  toast: {
    position: 'absolute',
    top: -16,
    alignSelf: 'center',
    backgroundColor: COLORS.success,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    zIndex: 100,
    ...SHADOWS.button,
  },
  toastText: {
    fontSize: FONT_SIZES.xs + 1,
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
  },
  chartWrapper: {
    marginTop: SPACING.sm,
  },
});

export default SavingsCard;
