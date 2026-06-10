import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import Svg, { Line } from 'react-native-svg';
import { COLORS, FONTS, FONT_SIZES, SPACING } from '../constants/theme';
import { BENCHMARKS } from '../constants/benchmarks';
import { recalculateWithTaxMode } from '../utils/calculator';

const AssetGrowthChart = ({ result, taxMode: propTaxMode, onTaxModeChange }) => {
  const { width } = Dimensions.get('window');
  // グラフ幅を画面幅から余白を引いて計算
  const chartWidth = width - SPACING.md * 4 - 40; 

  const [localTaxMode, setLocalTaxMode] = useState('none');
  const taxMode = propTaxMode !== undefined ? propTaxMode : localTaxMode;
  const setTaxMode = onTaxModeChange !== undefined ? onTaxModeChange : setLocalTaxMode;

  const calculationType = result?.calculationType ?? result?.inputs?.calculationType ?? result?.result?.calculationType ?? result?.result?.inputs?.calculationType ?? 'manual';

  const { stackData, maxValue } = useMemo(() => {
    const yearlyBreakdown = result?.result?.yearlyBreakdown ?? result?.yearlyBreakdown ?? [];
    if (!yearlyBreakdown.length) return { stackData: [], maxValue: 0 };

    const currentAsset = result.currentAsset ?? result.inputs?.currentAsset ?? 0;
    const principal = result.principal ?? result.inputs?.principal ?? 0;
    const annualRate = result.originalAnnualRate ?? result.inputs?.annualRate ?? result.inputs?.originalAnnualRate ?? 0;
    const years = result.years ?? result.inputs?.years ?? 0;
    const frequencyId = result.frequencyId ?? result.inputs?.frequencyId ?? 'monthly';

    const recalculated = recalculateWithTaxMode({
      currentAsset,
      principal,
      annualRate,
      years,
      frequencyId,
      taxMode,
      calculationType,
    });

    let maxVal = 0;
    const data = recalculated.yearlyBreakdown.map((item, index) => {
      if (item.value > maxVal) maxVal = item.value;
      
      const isLast = index === recalculated.yearlyBreakdown.length - 1;
      let label = '';
      if (item.year === 1 || item.year % 2 === 0 || isLast) {
        label = String(item.year);
      }

      // 3段スタックの計算
      const assetGrowth = item.assetGrowth || 0; // 現在の資産の将来価値（複利成長後・税引後）
      const savingsPrincipal = Math.max(0, item.principalAccum - currentAsset); // 積立元本の累計
      const savingsGain = Math.max(0, item.value - assetGrowth - savingsPrincipal); // 積立分から発生した運用益（税引後）

      return {
        stacks: [
          { value: assetGrowth, color: '#4A5568' }, // 現在の資産の成長後
          { value: savingsPrincipal, color: '#A0AEC0' }, // 積立元本
          { value: savingsGain, color: COLORS.accent, borderTopLeftRadius: 3, borderTopRightRadius: 3 } // 運用益（テーマのアクセントカラー）
        ],
        label: label,
      };
    });

    const calculatedMax = maxVal > 0 ? maxVal * 1.1 : 100;
    
    return { stackData: data, maxValue: calculatedMax };
  }, [result, taxMode, calculationType]);

  if (!stackData.length) return null;

  const numBars = stackData.length;
  const initialSpacing = 10;
  const endSpacing = 10;
  const availableWidth = chartWidth - initialSpacing - endSpacing;
  const spacePerBar = availableWidth / numBars;
  const barWidth = spacePerBar * 0.6;
  const spacing = spacePerBar * 0.4;

  return (
    <View style={styles.container}>
      {/* ── NISA非課税注記 ── */}
      <Text style={styles.nisaNote}>※NISA利用は元本1,200万円まで非課税</Text>

      {/* ── 税金/NISA 切り替えセグメント ── */}
      <View style={styles.segmentedContainer}>
        {[
          { id: 'none', label: '税金なし' },
          { id: 'tax', label: '税金（20％）' },
          { id: 'nisa', label: 'NISA利用' },
        ].map((tab) => {
          const isActive = taxMode === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.segmentButton,
                isActive && styles.segmentButtonActive,
              ]}
              onPress={() => setTaxMode(tab.id)}
            >
              <Text
                style={[
                  styles.segmentText,
                  isActive && styles.segmentTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.yAxisContainer}>
        <Text style={styles.yAxisUnitText}>(円)</Text>
      </View>
      <View style={styles.chartRow}>
        <View style={styles.chartWrapper}>
          <BarChart
            stackData={stackData}
            width={chartWidth}
            initialSpacing={initialSpacing}
            endSpacing={endSpacing}
            barWidth={barWidth}
            spacing={spacing}
            height={180}
            maxValue={maxValue}
            noOfSections={4}
            formatYLabel={(label) => {
              const val = Number(label);
              if (val >= 10000) return `${Math.round(val / 10000)}万`;
              return label;
            }}
            yAxisTextStyle={styles.yAxisLabel}
            xAxisLabelTextStyle={[
              styles.xAxisLabel,
              { width: 30, marginLeft: (barWidth + spacing - 30) / 2 }
            ]}
            yAxisThickness={1}
            xAxisThickness={1}
            yAxisColor={COLORS.border}
            xAxisColor={COLORS.border}
            rulesType="solid"
            rulesColor={COLORS.border}
            rulesLength={chartWidth}
            hideRules={false}
            yAxisLabelWidth={45}
          />

          {/* ── ベンチマークライン ──────────────────────────────── */}
          {[
            { label: '老後資金', amount: BENCHMARKS.RETIREMENT.STANDARD },
            { label: '教育費(私立)', amount: BENCHMARKS.EDUCATION.PRIVATE },
            { label: '教育費(公立)', amount: BENCHMARKS.EDUCATION.PUBLIC },
          ].map((item, idx) => {
            if (item.amount > maxValue) return null;
            // Y軸の高さ(180px)に基づいた位置計算
            const bottom = (item.amount / maxValue) * 180 + 30; // 30はX軸ラベル分
            const isNisaLine = item.label === 'NISA非課税枠';
            return (
              <View key={idx} style={[styles.benchmarkLineContainer, { bottom }]}>
                <Svg height="2" width="100%" style={styles.benchmarkSvg}>
                  <Line
                    x1="0"
                    y1="1"
                    x2="1000" // 十分な長さを確保（実際の幅はViewでクリップされる）
                    y2="1"
                    stroke={isNisaLine ? COLORS.accent : "#A0AEC0"}
                    strokeWidth="1.5"
                    strokeDasharray="4, 4"
                    opacity="0.8"
                  />
                </Svg>
                <View style={styles.benchmarkLabelWrapper}>
                  <Text style={[styles.benchmarkLabel, isNisaLine && { color: COLORS.accent, fontWeight: 'bold' }]}>
                    {item.label}: {Math.round(item.amount / 10000)}万円
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
        <Text style={styles.xAxisUnitText}>(年)</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 9999,
    padding: 3,
    marginBottom: SPACING.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    width: '90%',
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9999,
  },
  segmentButtonActive: {
    backgroundColor: COLORS.accent,
    shadowColor: COLORS.accentDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  segmentText: {
    fontSize: FONT_SIZES.sm - 1,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
  },
  segmentTextActive: {
    color: COLORS.textOnAccent,
    fontFamily: FONTS.bold,
  },
  nisaNote: {
    fontSize: 10,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginBottom: 8,
    textAlign: 'center',
  },
  container: {
    marginTop: SPACING.md,
    alignItems: 'center',
    width: '100%',
  },
  yAxisContainer: {
    alignSelf: 'flex-start',
    marginLeft: 17,
    marginBottom: -10,
    transform: [{ translateY: -15 }],
    zIndex: 10,
  },
  yAxisUnitText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
    color: COLORS.textMuted,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  yAxisLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    width: 44,
    textAlign: 'right',
    marginRight: 14,
  },
  xAxisLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  xAxisUnitText: {
    position: 'absolute',
    right: 25,
    bottom: -13,
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
    color: COLORS.textMuted,
  },
  chartWrapper: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  benchmarkLineContainer: {
    position: 'absolute',
    left: 45, // yAxisLabelWidthと合わせる
    right: 0,
    height: 2,
    zIndex: 5,
  },
  benchmarkSvg: {
    width: '100%',
    height: 2,
  },
  benchmarkLabelWrapper: {
    position: 'absolute',
    left: 0,
    top: -10,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  benchmarkLabel: {
    fontSize: 9,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
  },
});

export default AssetGrowthChart;
