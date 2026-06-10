import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
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

const HistoryCard = ({ item, index, isPremium, onToggleFavorite }) => {
  const [expanded, setExpanded] = useState(false);
  const [taxMode, setTaxMode] = useState('none');

  const calculationType = item.inputs?.calculationType ?? 'annualRate';



  const recalculatedItem = useMemo(() => {
    const recalculated = recalculateWithTaxMode({
      currentAsset: item.inputs?.currentAsset ?? 0,
      principal: item.inputs?.principal ?? 0,
      annualRate: item.inputs?.annualRate ?? 0,
      years: item.inputs?.years ?? 0,
      frequencyId: item.inputs?.frequencyId ?? 'monthly',
      taxMode: taxMode,
      calculationType,
    });
    return {
      ...item,
      result: {
        ...(item.result ?? {}),
        ...recalculated,
      }
    };
  }, [item, taxMode, calculationType]);

  const savedDate = new Date(item.savedAt || item.calculatedAt || Date.now());
  const dateStr = `${savedDate.getFullYear()}/${String(savedDate.getMonth() + 1).padStart(2, '0')}/${String(savedDate.getDate()).padStart(2, '0')}`;

  const presetEmoji = item.inputs?.presetId === 'sp500' ? '🇺🇸' : item.inputs?.presetId === 'allcountry' ? '🌍' : '💰';

  const handleHeartPress = () => {
    if (!isPremium) {
      Alert.alert('❤️ お気に入り機能', 'プレミアムプランに登録すると\nお気に入りの登録・フィルタリングが使えます。', [{ text: 'OK' }]);
      return;
    }
    onToggleFavorite(item.id);
  };

  return (
    <View style={[styles.card, item.isFavorite && styles.cardFavorite]}>
      {/* ── 上段 ── */}
      <View style={styles.topRow}>
        <View style={styles.indexBadge}>
          <Text style={styles.indexBadgeText}>{index + 1}</Text>
        </View>

        <View style={styles.topCenter}>
          <View style={styles.presetRow}>
            <Text style={styles.presetEmoji}>{presetEmoji}</Text>
            <Text style={styles.presetLabel} numberOfLines={1}>
              {item.inputs?.presetLabel || '投資（想定年利）'}  年利 {item.inputs?.annualRate}%
            </Text>
            {item.inputs?.frequencyLabel ? (
              <View style={styles.freqBadge}>
                <Text style={styles.freqBadgeText}>{item.inputs.frequencyLabel}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.dateText}>{dateStr}</Text>
        </View>

        <TouchableOpacity
          style={styles.heartButton}
          onPress={handleHeartPress}
          accessibilityLabel={item.isFavorite ? 'お気に入り解除' : 'お気に入りに追加'}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.heartIcon}>{item.isFavorite ? '❤️' : '🤍'}</Text>
          {!isPremium && (
            <View style={styles.heartLock}><Text style={styles.heartLockText}>🔒</Text></View>
          )}
        </TouchableOpacity>
      </View>

      {/* ── 中段 ── */}
      <View style={styles.valuesRow}>
        <View style={styles.valueBlock}>
          <Text style={styles.valueLabel}>元本</Text>
          <Text style={styles.valueAmount}>¥{formatJPY(recalculatedItem.result?.principalTotal)}</Text>
        </View>
        <Text style={styles.arrow}>→</Text>
        <View style={[styles.valueBlock, styles.valueBlockRight]}>
          <Text style={styles.valueLabel}>{item.inputs?.years}年後</Text>
          <Text style={styles.valueFuture}>{formatShort(recalculatedItem.result?.futureValue)}</Text>
        </View>
        <View style={styles.gainBadge}>
          <Text style={styles.gainBadgeText}>+{recalculatedItem.result?.gainRate}%</Text>
        </View>
      </View>

      {/* ── アコーディオンボタン ── */}
      <TouchableOpacity 
        style={styles.expandBtn} 
        onPress={() => setExpanded(!expanded)}
      >
        <Text style={styles.expandBtnText}>
          {expanded ? '▲ グラフを閉じる' : '▼ 詳細グラフを見る'}
        </Text>
      </TouchableOpacity>

      {/* ── グラフ展開部分 ── */}
      {expanded && (
        <View style={styles.chartWrapper}>
          <AssetGrowthChart
            result={recalculatedItem}
            taxMode={taxMode}
            onTaxModeChange={setTaxMode}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.card,
  },
  cardFavorite: {
    borderColor: '#E53E3E',
    borderWidth: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  indexBadge: {
    width: 26,
    height: 26,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
    marginTop: 2,
    flexShrink: 0,
  },
  indexBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
    color: COLORS.accent,
  },
  topCenter: {
    flex: 1,
  },
  presetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  presetEmoji: {
    fontSize: 15,
  },
  presetLabel: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
  },
  freqBadge: {
    backgroundColor: '#EEF2FF',
    borderRadius: RADIUS.sm,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  freqBadgeText: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    color: '#4F46E5',
  },
  dateText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  heartButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    position: 'relative',
  },
  heartIcon: {
    fontSize: 20,
  },
  heartLock: {
    position: 'absolute',
    bottom: 1,
    right: 1,
  },
  heartLockText: {
    fontSize: 9,
  },
  valuesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  valueBlock: {
    flex: 1,
  },
  valueBlockRight: {
    alignItems: 'flex-end',
  },
  valueLabel: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  valueAmount: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
  },
  valueFuture: {
    fontSize: FONT_SIZES.lg,
    fontFamily: FONTS.bold,
    color: COLORS.accent,
  },
  arrow: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.textMuted,
    marginHorizontal: SPACING.xs,
  },
  gainBadge: {
    backgroundColor: '#FFF0F0',
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    marginLeft: SPACING.xs,
  },
  gainBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
    color: '#E53E3E',
  },
  expandBtn: {
    alignItems: 'center',
    paddingTop: SPACING.sm,
    marginTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  expandBtnText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.medium,
  },
  chartWrapper: {
    marginTop: SPACING.sm,
  },
});

export default HistoryCard;
