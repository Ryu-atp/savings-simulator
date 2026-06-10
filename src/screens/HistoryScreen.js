/**
 * HistoryScreen.js - 計算履歴画面（v2.2）
 *
 * v2.2 変更点:
 *   ・「すべて削除」ボタン: 全ユーザー対象。Alert確認付き。
 *   ・「❤️以外削除」ボタン: プレミアム限定。
 *   ・グラフはHistoryCard内でデフォルト非表示→タップで展開（HistoryCard側実装）
 *   ・AdBanner 画面最下部（無料版のみ）
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppContext } from '../context/AppContext';
import AdBanner from '../components/AdBanner';
import HistoryCard from '../components/HistoryCard';
import {
  COLORS,
  FONTS,
  FONT_SIZES,
  SPACING,
  RADIUS,
  SHADOWS,
} from '../constants/theme';

// ─── 空状態 コンポーネント ────────────────────────────────────────────────────
const EmptyState = ({ showFavoriteFilter }) => (
  <View style={styles.emptyContainer}>
    <Text style={styles.emptyEmoji}>{showFavoriteFilter ? '💔' : '📭'}</Text>
    <Text style={styles.emptyTitle}>
      {showFavoriteFilter ? 'お気に入りがありません' : '履歴がありません'}
    </Text>
    <Text style={styles.emptySubtitle}>
      {showFavoriteFilter
        ? '❤️ を押してお気に入りに追加できます'
        : '「シミュレート」タブで計算すると\n自動で履歴に保存されます'}
    </Text>
  </View>
);

// SimpleHistoryCard has been replaced by HistoryCard component

// ─── メインコンポーネント ────────────────────────────────────────────────────
const HistoryScreen = () => {
  const {
    history,
    isPremium,
    toggleFavorite,
    deleteNonFavorites,
    deleteAllHistory,
    FREE_HISTORY_LIMIT,
  } = useAppContext();

  const [isDeleting, setIsDeleting]            = useState(false);
  const [showFavoriteOnly, setShowFavoriteOnly] = useState(false);

  // ── 表示する履歴（フィルタ適用） ─────────────────────────────────────────
  const displayedHistory = showFavoriteOnly
    ? history.filter((item) => item.isFavorite)
    : history;

  const favoriteCount    = history.filter((item) => item.isFavorite).length;
  const nonFavoriteCount = history.length - favoriteCount;

  // ── すべての履歴を削除（全ユーザー対象・Alert確認付き） ──────────────────
  const handleDeleteAll = () => {
    Alert.alert(
      '⚠️ すべての履歴を削除',
      'すべての履歴を削除しますか？\nこの操作は元に戻せません。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: 'すべて削除',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await deleteAllHistory();
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ],
    );
  };

  // ── お気に入り以外を一括削除（有料ユーザー専用） ──────────────────────────
  const handleDeleteNonFavorites = () => {
    const deleteCount = nonFavoriteCount;
    Alert.alert(
      '🗑 お気に入り以外を削除',
      `お気に入り以外の${deleteCount}件を削除します。\nこの操作は元に戻せません。`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除する',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              const result = await deleteNonFavorites();
              if (result.success) {
                Alert.alert('削除完了', `お気に入り${result.remaining}件が残っています。`);
              }
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>

      {/* ── ヘッダー ────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>計算履歴</Text>
          <Text style={styles.headerSubtitle}>
            {isPremium
              ? `${history.length}件保存済み（無制限）`
              : `${history.length} / ${FREE_HISTORY_LIMIT}件（無料プラン）`}
          </Text>
        </View>

        {/* 削除ボタン群: 履歴がある場合のみ表示 */}
        {history.length > 0 && (
          <View style={styles.headerActions}>

            {/* すべて削除: 無料・有料どちらでも利用可 */}
            <TouchableOpacity
              style={[styles.deleteButton, styles.deleteAllButton]}
              onPress={handleDeleteAll}
              disabled={isDeleting}
              accessibilityLabel="すべての履歴を削除"
            >
              {isDeleting
                ? <ActivityIndicator size="small" color={COLORS.error} />
                : <Text style={styles.deleteButtonText}>🗑 全削除</Text>}
            </TouchableOpacity>

            {/* ❤️以外削除: プレミアム限定 */}
            {isPremium && nonFavoriteCount > 0 && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDeleteNonFavorites}
                disabled={isDeleting}
                accessibilityLabel="お気に入り以外を一括削除"
              >
                {isDeleting
                  ? <ActivityIndicator size="small" color={COLORS.error} />
                  : <Text style={styles.deleteButtonText}>🗑 ❤️以外削除</Text>}
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* 無料ユーザーへの案内バナー */}
      {!isPremium && (
        <View style={styles.freeBanner}>
          <Text style={styles.freeBannerText}>
            📌 無料プランは最大{FREE_HISTORY_LIMIT}件まで自動保存されます
          </Text>
          <Text style={styles.freeBannerSub}>
            プレミアムで無制限 + お気に入り + 広告非表示
          </Text>
        </View>
      )}

      {/* お気に入りフィルタ（有料ユーザーのみ） */}
      {isPremium && history.length > 0 && (
        <View style={styles.filterBar}>
          <TouchableOpacity
            style={[styles.filterBtn, !showFavoriteOnly && styles.filterBtnActive]}
            onPress={() => setShowFavoriteOnly(false)}
          >
            <Text style={[styles.filterBtnText, !showFavoriteOnly && styles.filterBtnTextActive]}>
              すべて ({history.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterBtn, showFavoriteOnly && styles.filterBtnActive]}
            onPress={() => setShowFavoriteOnly(true)}
          >
            <Text style={[styles.filterBtnText, showFavoriteOnly && styles.filterBtnTextActive]}>
              ❤️ お気に入り ({favoriteCount})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── 履歴リスト ─────────────────────────────────────────── */}
      <FlatList
        data={displayedHistory}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <HistoryCard
            item={item}
            index={index}
            isPremium={isPremium}
            onToggleFavorite={toggleFavorite}
          />
        )}
        ListEmptyComponent={<EmptyState showFavoriteFilter={showFavoriteOnly} />}
        contentContainerStyle={[
          styles.listContent,
          displayedHistory.length === 0 && styles.listContentEmpty,
        ]}
        showsVerticalScrollIndicator={false}
      />

      {/* ── バナー広告（無料ユーザーのみ） ─────────────────────── */}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
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
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  deleteButton: {
    borderWidth: 1.5,
    borderColor: COLORS.error,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs + 2,
    minWidth: 44,
    alignItems: 'center',
  },
  deleteAllButton: {
    backgroundColor: '#FFF0F0',
  },
  deleteButtonText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
    color: COLORS.error,
  },
  freeBanner: {
    backgroundColor: COLORS.accentLight,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.accent,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  freeBannerText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
  },
  freeBannerSub: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  filterBar: {
    flexDirection: 'row',
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: 4,
    gap: 4,
  },
  filterBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.sm,
  },
  filterBtnActive: {
    backgroundColor: COLORS.background,
    ...SHADOWS.card,
  },
  filterBtnText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
  },
  filterBtnTextActive: {
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
  },
  listContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xl,
    gap: SPACING.sm,
  },
  listContentEmpty: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  emptyEmoji: {
    fontSize: 56,
    marginBottom: SPACING.md,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.lg,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  emptySubtitle: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
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
});

export default HistoryScreen;
