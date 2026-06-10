/**
 * MainScreen.js - メイン画面（計算シミュレーター）v2.1
 *
 * v2.1 変更点:
 *   ・積立頻度セレクター（毎月/毎週/毎日/一括）を追加
 *   ・handleCalculate 内で自動保存 (addToHistory) を呼び出す
 *   ・保存ボタンは SavingsCard から削除済み（自動保存に移行）
 *   ・投資先プリセット名を日本語化（S&P500 → 米国株 (S&P500) 等）
 *
 * UX仕様:
 *   ・SafeAreaViewでiPhone専用設計
 *   ・画面タップでキーボードを閉じる
 *   ・keyboardType="number-pad"
 */

import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  StyleSheet,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import useCalculator, { INVESTMENT_PRESETS, FREQUENCY_OPTIONS } from '../hooks/useCalculator';
import { useAppContext } from '../context/AppContext';
import { useAdVideo } from '../components/AdVideo';
import SavingsCard from '../components/SavingsCard';
import TargetCalculator from '../components/TargetCalculator';
import AffiliateBtn from '../components/AffiliateBtn';
import AdBanner from '../components/AdBanner';
import {
  COLORS,
  FONTS,
  FONT_SIZES,
  SPACING,
  RADIUS,
  SHADOWS,
} from '../constants/theme';

// ─── コンポーネント ──────────────────────────────────────────────────────────
const MainScreen = () => {
  const {
    inputs,
    result,
    errors,
    updateInput,
    selectPreset,
    selectFrequency,
    calculate,
    reset,
  } = useCalculator();

  const { addToHistory, currentAsset, isPremium, updateCurrentAsset } = useAppContext();
  const [autoSaved, setAutoSaved] = useState(false);
  const [calcCount, setCalcCount] = useState(0);
  const { showAdIfRequired } = useAdVideo(isPremium);
  const [localAsset, setLocalAsset] = useState(currentAsset ? String(Math.floor(currentAsset / 10000)) : '');

  useEffect(() => {
    setLocalAsset(currentAsset ? String(Math.floor(currentAsset / 10000)) : '');
  }, [currentAsset]);

  const handleAssetBlur = () => {
    const val = parseInt(localAsset, 10) || 0;
    updateCurrentAsset(val * 10000);
  };

  // ── 計算ボタンのスケールアニメーション ──────────────────────────────────────
  const calcBtnScale = useRef(new Animated.Value(1)).current;

  const handleCalcPressIn = () => {
    Animated.spring(calcBtnScale, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 50,
    }).start();
  };

  const handleCalcPressOut = () => {
    Animated.spring(calcBtnScale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
    }).start();
  };

  // ── 計算 + 自動保存 ────────────────────────────────────────────────────────
  const handleCalculate = async () => {
    Keyboard.dismiss();
    const calculatedResult = calculate(currentAsset);
    if (!calculatedResult) return; // バリデーション失敗

    const executeCalculationAndSave = async () => {
      setAutoSaved(false);
      const res = await addToHistory({
        inputs: {
          principal:    calculatedResult.principal,
          years:        calculatedResult.years,
          presetId:     calculatedResult.presetId,
          presetLabel:  calculatedResult.presetLabel,
          annualRate:   calculatedResult.annualRate,
          frequencyId:  calculatedResult.frequencyId,
          frequencyLabel: calculatedResult.frequencyLabel,
          currentAsset: calculatedResult.currentAsset,
          calculationType: 'annualRate',
        },
        result: {
          futureValue:      calculatedResult.futureValue,
          totalGain:        calculatedResult.totalGain,
          gainRate:         calculatedResult.gainRate,
          principalTotal:   calculatedResult.principalTotal,
          yearlyBreakdown:  calculatedResult.yearlyBreakdown,
        },
      });

      if (res.success) {
        setAutoSaved(true);
        setTimeout(() => setAutoSaved(false), 2000);
      }
    };

    // 1. 計算結果の保存とStateへのセットを即座に実行（広告の背後ですでに完了）
    executeCalculationAndSave();

    // 2. 非プレミアムかつ3回に1回の頻度で動画を表示する
    if (!isPremium) {
      const nextCount = calcCount + 1;
      setCalcCount(nextCount);
      
      if (nextCount % 3 === 0) {
        showAdIfRequired(() => {
          console.log('[AdVideo] Interstitial ad closed. Results were already rendered.');
        });
      }
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* 画面タップでキーボードを閉じる */}
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* ── ヘッダー ────────────────────────────────────── */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>資産形成シミュレーター</Text>
              <Text style={styles.headerSubtitle}>
                節約したお金を投資したら将来いくらになる？
              </Text>
            </View>

            {/* ── 入力エリア ──────────────────────────────────── */}
            <View style={styles.card}>
              {/* 積立額 と 運用年数 の横並びレイアウト */}
              <View style={styles.inputRow}>
                <View style={styles.inputCol}>
                  <Text style={styles.inputLabel}>💴 積立額（円）</Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      errors.principal && styles.textInputError,
                    ]}
                    value={inputs.principal}
                    onChangeText={(v) => updateInput('principal', v)}
                    placeholder="例: 30000"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="number-pad"
                    returnKeyType="done"
                    maxLength={12}
                    accessibilityLabel="積立額入力"
                  />
                  {errors.principal ? (
                    <Text style={styles.errorText}>{errors.principal}</Text>
                  ) : null}
                </View>

                <View style={styles.inputCol}>
                  <Text style={styles.inputLabel}>📅 運用年数（年）</Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      errors.years && styles.textInputError,
                    ]}
                    value={inputs.years}
                    onChangeText={(v) => updateInput('years', v)}
                    placeholder="例: 20"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="number-pad"
                    returnKeyType="done"
                    maxLength={2}
                    accessibilityLabel="運用年数入力"
                  />
                  {errors.years ? (
                    <Text style={styles.errorText}>{errors.years}</Text>
                  ) : null}
                </View>
              </View>

              {/* 現在の資産額 と 想定年利 の横並びレイアウト */}
              <View style={[styles.inputRow, styles.inputRowMargin]}>
                {/* 現在の資産額 */}
                <View style={[styles.inputCol, { flex: 2 }]}>
                  <Text style={styles.inputLabel}>💰 現在の資産額（万円）</Text>
                  <TextInput
                    style={styles.textInput}
                    value={localAsset}
                    onChangeText={(v) => setLocalAsset(v.replace(/[^0-9]/g, ''))}
                    onBlur={handleAssetBlur}
                    keyboardType="numeric"
                    placeholder="例: 100 (100万円)"
                    placeholderTextColor={COLORS.textMuted}
                    returnKeyType="done"
                    maxLength={6}
                    accessibilityLabel="現在の資産額入力"
                  />
                  <Text style={styles.settingDescription}>
                    ※シミュレーションの初期値（0年目）となります
                  </Text>
                </View>

                {/* 想定年利 */}
                <View style={[styles.inputCol, { flex: 1.1, alignItems: 'flex-end' }]}>
                  <Text style={[styles.inputLabel, { alignSelf: 'stretch', textAlign: 'right' }]}>📈 想定年利</Text>
                  <View style={[styles.rateRow, { justifyContent: 'flex-end', width: '100%' }]}>
                    <TextInput
                      style={[
                        styles.textInput,
                        styles.rateInput,
                        errors.annualRate && styles.textInputError,
                        { textAlign: 'right', flex: 1 }
                      ]}
                      value={inputs.annualRate}
                      onChangeText={(v) => updateInput('annualRate', v)}
                      placeholder="例: 7"
                      placeholderTextColor={COLORS.textMuted}
                      keyboardType="numeric"
                      returnKeyType="done"
                      maxLength={5}
                      accessibilityLabel="想定年利入力"
                    />
                    <Text style={styles.rateUnit}>％</Text>
                  </View>
                  {errors.annualRate ? (
                    <Text style={[styles.errorText, { textAlign: 'right', alignSelf: 'stretch' }]}>{errors.annualRate}</Text>
                  ) : null}
                </View>
              </View>

              {/* 積立頻度セレクター（🆕 v2.1） */}
              <Text style={[styles.inputLabel, styles.inputLabelMargin]}>
                🔄 積立頻度
              </Text>
              <View style={styles.frequencyRow}>
                {FREQUENCY_OPTIONS.map((freq) => {
                  const isSelected = inputs.frequencyId === freq.id;
                  return (
                    <TouchableOpacity
                      key={freq.id}
                      style={[
                        styles.frequencyButton,
                        isSelected && styles.frequencyButtonSelected,
                      ]}
                      onPress={() => selectFrequency(freq.id)}
                      accessibilityLabel={freq.label}
                      accessibilityState={{ selected: isSelected }}
                    >
                      <Text
                        style={[
                          styles.frequencyLabel,
                          isSelected && styles.frequencyLabelSelected,
                        ]}
                      >
                        {freq.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* 投資先プリセット */}
              <Text style={[styles.inputLabel, styles.inputLabelMargin]}>
                🏦 NISA（投資先を選択）
              </Text>
              <View style={styles.presetRow}>
                {INVESTMENT_PRESETS.map((preset) => {
                  const isSelected = inputs.presetId === preset.id;
                  return (
                    <TouchableOpacity
                      key={preset.id}
                      style={[
                        styles.presetButton,
                        isSelected && styles.presetButtonSelected,
                      ]}
                      onPress={() => selectPreset(preset.id)}
                      accessibilityLabel={`${preset.label} 上昇率${preset.rate}%`}
                      accessibilityState={{ selected: isSelected }}
                    >
                      <Text style={styles.presetEmoji}>{preset.emoji}</Text>
                      <Text
                        style={[
                          styles.presetLabel,
                          isSelected && styles.presetLabelSelected,
                        ]}
                        numberOfLines={2}
                        adjustsFontSizeToFit
                      >
                        {preset.label}
                      </Text>
                      <Text
                        style={[
                          styles.presetRate,
                          isSelected && styles.presetRateSelected,
                        ]}
                      >
                        上昇率 {preset.rate}%
                      </Text>
                      {preset.note && (
                        <Text
                          style={[
                            styles.presetNote,
                            isSelected && styles.presetNoteSelected,
                          ]}
                        >
                          {preset.note}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* ── 計算ボタン ──────────────────────────────────── */}
            <Animated.View style={{ transform: [{ scale: calcBtnScale }] }}>
              <TouchableOpacity
                style={styles.calcButton}
                onPress={handleCalculate}
                onPressIn={handleCalcPressIn}
                onPressOut={handleCalcPressOut}
                activeOpacity={1}
                accessibilityLabel="シミュレートする"
                accessibilityRole="button"
              >
                <Text style={styles.calcButtonText}>🧮 シミュレートする</Text>
              </TouchableOpacity>
            </Animated.View>

            {/* ── 計算結果 ────────────────── */}
            {result && (
              <>
                <SavingsCard result={result} autoSaved={autoSaved} />
                <TouchableOpacity
                  style={styles.resetButton}
                  onPress={reset}
                  accessibilityLabel="リセット"
                >
                  <Text style={styles.resetButtonText}>↺ リセット</Text>
                </TouchableOpacity>
              </>
            )}

            {/* ── 目標から逆算する（シミュレートボタンの20px下へ配置） ────────── */}
            <View style={{ marginTop: 20 }}>
              <TargetCalculator />
            </View>

            {/* ── アフィリエイトボタン ─────────────────────────── */}
            {result && <AffiliateBtn />}

            <View style={styles.bottomPadding} />
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      {/* ── バナー広告（画面最下部・無料ユーザーのみ） ─── */}
      <AdBanner />
    </SafeAreaView>
  );
};

// ─── スタイル ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xxl,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    lineHeight: 20,
  },
  card: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.xl,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    padding: SPACING.lg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  inputLabel: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    letterSpacing: 0.3,
  },
  inputLabelMargin: {
    marginTop: SPACING.md,
  },
  textInput: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 4,
    fontSize: FONT_SIZES.xl,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
  },
  textInputError: {
    borderColor: COLORS.error,
    backgroundColor: '#FFF5F5',
  },
  errorText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
    color: COLORS.error,
    marginTop: SPACING.xs,
  },
  // ── 想定年利 ──
  rateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  rateInput: {
    flex: 1,
  },
  rateUnit: {
    fontSize: FONT_SIZES.xl,
    fontFamily: FONTS.bold,
    color: COLORS.textSecondary,
    minWidth: 20,
  },
  // ── 積立頻度 ──
  frequencyRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  frequencyButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  frequencyButtonSelected: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accentLight,
  },
  frequencyLabel: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
    color: COLORS.textSecondary,
  },
  frequencyLabelSelected: {
    color: COLORS.accent,
  },
  // ── 投資先プリセット ──
  presetRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  presetButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 4,
  },
  presetButtonSelected: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accentLight,
  },
  presetEmoji: {
    fontSize: 22,
    marginBottom: 4,
  },
  presetLabel: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
    color: COLORS.textSecondary,
    textAlign: 'center',
    minHeight: 28,
  },
  presetLabelSelected: {
    color: COLORS.accent,
  },
  presetRate: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  presetRateSelected: {
    color: COLORS.accentDark,
  },
  presetNote: {
    fontSize: 8,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
  presetNoteSelected: {
    color: COLORS.accentDark,
  },
  // ── 計算ボタン ──
  calcButton: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.full,
    paddingVertical: SPACING.md,
    marginHorizontal: SPACING.md,
    alignItems: 'center',
    ...SHADOWS.button,
  },
  calcButtonText: {
    fontSize: FONT_SIZES.lg,
    fontFamily: FONTS.bold,
    color: COLORS.textOnAccent,
    letterSpacing: 0.5,
  },
  resetButton: {
    alignSelf: 'center',
    marginTop: SPACING.sm,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
  },
  resetButtonText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
  },
  bottomPadding: {
    height: SPACING.xl,
  },
  inputRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  inputRowMargin: {
    marginTop: SPACING.md,
  },
  inputCol: {
    flex: 1,
  },
  disabledInput: {
    opacity: 0.5,
    backgroundColor: '#F5F5F5',
  },
  settingDescription: {
    fontSize: 9,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    marginTop: 4,
  },
});

export default MainScreen;
