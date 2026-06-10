import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Keyboard,
} from 'react-native';
import { useAppContext } from '../context/AppContext';
import { BENCHMARKS } from '../constants/benchmarks';
import { calculateRequiredSavingsWithPresetOrCustom } from '../utils/calculator';
import { COLORS, FONTS, FONT_SIZES, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { formatJPY, INVESTMENT_PRESETS } from '../hooks/useCalculator';

const TARGET_OPTIONS = [
  {
    id: 'retirement',
    label: '👴 老後資金 (4,000万円)',
    amount: BENCHMARKS.RETIREMENT.STANDARD,
    defaultTargetAge: 65,
  },
  {
    id: 'education_public',
    label: '🎓 教育費・公立 (500万円)',
    amount: BENCHMARKS.EDUCATION.PUBLIC,
    defaultTargetAge: null, // 現在の年齢 + 15 などを初期値にする
  },
  {
    id: 'education_private',
    label: '🎓 教育費・私立 (3,000万円)',
    amount: BENCHMARKS.EDUCATION.PRIVATE,
    defaultTargetAge: null,
  },
  {
    id: 'custom',
    label: '✏️ その他（手入力）',
    amount: 0,
    defaultTargetAge: null,
  },
];



const TargetCalculator = () => {
  const { userAge, updateUserAge } = useAppContext();
  
  const [localAge, setLocalAge] = useState(String(userAge));
  const [selectedTarget, setSelectedTarget] = useState(TARGET_OPTIONS[0]);
  const [targetAge, setTargetAge] = useState(String(TARGET_OPTIONS[0].defaultTargetAge));
  const [customAmount, setCustomAmount] = useState('1000'); // デフォルト1000万円
  const [freeInputAmount, setFreeInputAmount] = useState(''); // 新設：自由入力目標金額（万円単位）
  const [annualRate, setAnnualRate] = useState('13');
  const [selectedRatePreset, setSelectedRatePreset] = useState('sp500');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // コンテキストのuserAgeが変更されたら同期
  useEffect(() => {
    setLocalAge(String(userAge));
  }, [userAge]);

  const handleAgeBlur = () => {
    updateUserAge(localAge || '30');
  };

  const handleTargetSelect = (target) => {
    setSelectedTarget(target);
    setFreeInputAmount(''); // プリセット選択時は自由入力をクリア
    if (target.defaultTargetAge) {
      setTargetAge(String(target.defaultTargetAge));
    } else if (target.id !== 'custom') {
      // デフォルトがない場合は現在年齢+15を設定
      const current = parseInt(localAge, 10) || 30;
      setTargetAge(String(current + 15));
    }
    setResult(null);
  };

  const handleFreeInputChange = (text) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    setFreeInputAmount(cleaned);
    setSelectedTarget(null); // 自由入力変更時はプリセットを自動クリア
    setResult(null);
  };

  const handleRatePresetSelect = (preset) => {
    setAnnualRate(String(preset.rate));
    setSelectedRatePreset(preset.id);
  };

  const handleRateChange = (text) => {
    setAnnualRate(text);
    setSelectedRatePreset(null); // 手入力時はプリセット選択を解除
  };

  const handleCalculate = () => {
    Keyboard.dismiss();
    setError(null);

    const currentAgeNum = parseInt(localAge, 10);
    const targetAgeNum = parseInt(targetAge, 10);
    const rateNum = parseFloat(annualRate);

    if (isNaN(currentAgeNum) || currentAgeNum < 0) {
      setError('現在の年齢を正しく入力してください。');
      return;
    }
    if (isNaN(targetAgeNum) || targetAgeNum <= currentAgeNum) {
      setError('目標年齢は現在の年齢より大きく設定してください。');
      return;
    }
    if (isNaN(rateNum) || rateNum < 0 || rateNum > 50) {
      setError('年利は0〜50%の間で入力してください。');
      return;
    }

    // 金額チェック
    const isCustomPreset = selectedTarget && selectedTarget.id === 'custom';
    const finalAmount = selectedTarget
      ? (isCustomPreset ? (parseInt(customAmount, 10) || 0) * 10000 : selectedTarget.amount)
      : (parseInt(freeInputAmount, 10) || 0) * 10000;

    if (finalAmount <= 0) {
      setError('目標金額を正しく入力してください。');
      return;
    }

    try {
      const requiredMonthly = calculateRequiredSavingsWithPresetOrCustom({
        age: currentAgeNum,
        targetAge: targetAgeNum,
        selectedTarget,
        customAmount: selectedTarget ? customAmount : freeInputAmount,
        annualRate: rateNum,
      });
      setResult(requiredMonthly);
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>🎯 目標から逆算する</Text>
      
      {/* ユーザープロフィール（現在の年齢） */}
      <View style={styles.row}>
        <Text style={styles.label}>👤 あなたの現在の年齢</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            value={localAge}
            onChangeText={(text) => setLocalAge(text.replace(/[^0-9]/g, ''))}
            onBlur={handleAgeBlur}
            keyboardType="number-pad"
            placeholder="30"
            maxLength={3}
            returnKeyType="done"
          />
          <Text style={styles.unit}>歳</Text>
        </View>
      </View>

      {/* 自由入力目標（万円単位） */}
      <Text style={styles.label}>💰 自由入力目標（万円）</Text>
      <View style={[styles.row, { marginBottom: SPACING.sm }]}>
        <View style={[styles.inputWrapper, { width: '100%' }]}>
          <TextInput
            style={[styles.input, { textAlign: 'left' }]}
            value={freeInputAmount}
            onChangeText={handleFreeInputChange}
            keyboardType="number-pad"
            placeholder="例: 2000 (入力すると下の選択がクリアされます)"
            placeholderTextColor={COLORS.textMuted}
            returnKeyType="done"
            accessibilityLabel="自由目標金額入力"
          />
          <Text style={styles.unit}>万円</Text>
        </View>
      </View>

      {/* 目標選択 */}
      <Text style={styles.label}>🏁 目標を選択</Text>
      <View style={styles.optionsRow}>
        {TARGET_OPTIONS.map((option) => {
          const isSelected = selectedTarget && selectedTarget.id === option.id;
          return (
            <TouchableOpacity
              key={option.id}
              style={[styles.optionBtn, isSelected && styles.optionBtnSelected]}
              onPress={() => handleTargetSelect(option)}
            >
              <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* カスタム目標金額入力 */}
      {selectedTarget && selectedTarget.id === 'custom' && (
        <View style={[styles.row, styles.customAmountRow]}>
          <Text style={styles.label}>💰 目標金額</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              value={customAmount}
              onChangeText={(text) => setCustomAmount(text.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              placeholder="1000"
              maxLength={7}
              returnKeyType="done"
            />
            <Text style={styles.unit}>万円</Text>
          </View>
        </View>
      )}

      {/* 目標年齢と想定利回り */}
      <View style={styles.row}>
        <Text style={styles.label}>⏳ 達成目標年齢</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            value={targetAge}
            onChangeText={setTargetAge}
            keyboardType="number-pad"
            maxLength={3}
            returnKeyType="done"
          />
          <Text style={styles.unit}>歳</Text>
        </View>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>📈 想定年利</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            value={annualRate}
            onChangeText={handleRateChange}
            keyboardType="numeric"
            maxLength={4}
            returnKeyType="done"
          />
          <Text style={styles.unit}>%</Text>
        </View>
      </View>

      {/* 年利プリセットボタン */}
      <View style={styles.presetRow}>
        {INVESTMENT_PRESETS.map((preset) => {
          const isSelected = selectedRatePreset === preset.id;
          return (
            <TouchableOpacity
              key={preset.id}
              style={[
                styles.presetButton,
                isSelected && styles.presetButtonSelected,
              ]}
              onPress={() => handleRatePresetSelect(preset)}
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
                年利 {preset.rate}%
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

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity style={styles.calcBtn} onPress={handleCalculate}>
        <Text style={styles.calcBtnText}>積立額を計算する</Text>
      </TouchableOpacity>

      {/* 計算結果 */}
      {result !== null && (
        <View style={styles.resultBox}>
          <Text style={styles.resultTitle}>必要な月々の積立額</Text>
          <View style={styles.resultAmountRow}>
            <Text style={styles.resultAmount}>{formatJPY(result)}</Text>
            <Text style={styles.resultUnit}>円 / 月</Text>
          </View>
          <Text style={styles.resultDesc}>
            ※ 年利{annualRate}%で{parseInt(targetAge, 10) - parseInt(localAge, 10)}年間運用した場合の目安です。
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.xl,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
    padding: SPACING.lg,
    borderWidth: 1.5,
    borderColor: COLORS.accent,
    ...SHADOWS.card,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontFamily: FONTS.bold,
    color: COLORS.accentDark,
    marginBottom: SPACING.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  halfCol: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.sm,
    width: 90, // 幅を固定して大きすぎないようにする
  },
  input: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
    paddingVertical: SPACING.sm,
    textAlign: 'right',
  },
  unit: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.medium,
    color: COLORS.textMuted,
    marginLeft: SPACING.xs,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  customAmountRow: {
    backgroundColor: COLORS.surfaceElevated,
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    marginTop: -SPACING.sm,
    marginBottom: SPACING.md,
  },
  optionBtn: {
    paddingVertical: SPACING.xs + 2,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  optionBtnSelected: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accentLight,
  },
  optionText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
  },
  optionTextSelected: {
    color: COLORS.accentDark,
    fontFamily: FONTS.bold,
  },
  presetRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
    marginTop: -SPACING.xs,
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
  calcBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.full,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  calcBtnText: {
    color: COLORS.textOnAccent,
    fontFamily: FONTS.bold,
    fontSize: FONT_SIZES.md,
  },
  errorText: {
    color: COLORS.error,
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  resultBox: {
    marginTop: SPACING.lg,
    padding: SPACING.md,
    backgroundColor: COLORS.accentLight,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
  },
  resultTitle: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
    color: COLORS.accentDark,
    marginBottom: SPACING.xs,
  },
  resultAmountRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  resultAmount: {
    fontSize: FONT_SIZES.xxl,
    fontFamily: FONTS.bold,
    color: COLORS.accentDark,
  },
  resultUnit: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.medium,
    color: COLORS.accentDark,
    marginBottom: 4,
    marginLeft: 4,
  },
  resultDesc: {
    fontSize: 10,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
});

export default TargetCalculator;
