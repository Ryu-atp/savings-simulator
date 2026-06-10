/**
 * SettingsScreen.js - 設定画面
 *
 * 機能:
 *   ・現在のプラン表示（無料 / プレミアム）
 *   ・プレミアム購入ボタン
 *   ・プラン説明（機能比較）
 *   ・「購入内容の復元 (Restore)」ボタン ← Apple規約必須・最下部に配置
 *   ・バナー広告（無料ユーザーのみ）
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { Button } from 'react-native-paper';
import { useAppContext } from '../context/AppContext';
import AdBanner from '../components/AdBanner';
import {
  COLORS,
  FONTS,
  FONT_SIZES,
  SPACING,
  RADIUS,
  SHADOWS,
} from '../constants/theme';

// ─── プラン比較テーブルデータ（v2.2 最終仕様） ─────────────────────────────
const PLAN_FEATURES = [
  { feature: 'お気に入り機能',       free: '利用不可',   premium: '利用可',     freeOk: false, premiumOk: true },
  { feature: 'お気に入り以外の一括削除', free: '利用不可',   premium: '利用可',     freeOk: false, premiumOk: true },
  { feature: '広告（バナー・動画）',  free: '表示あり',   premium: '完全非表示', freeOk: false, premiumOk: true },
  { feature: '履歴保存数',           free: '最大3件まで', premium: '無制限',    freeOk: false, premiumOk: true },
];

// ─── セクションヘッダー ──────────────────────────────────────────────────────
const SectionHeader = ({ title }) => (
  <Text style={styles.sectionHeader}>{title}</Text>
);

// ─── メインコンポーネント ────────────────────────────────────────────────────
const SettingsScreen = () => {
  const {
    isPremium,
    purchaseSubscription,
    restorePurchases,
    subscribeError,
  } = useAppContext();

  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isFeedbackExpanded, setIsFeedbackExpanded] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');

  const handleSendFeedback = async () => {
    if (!feedbackText.trim()) {
      Alert.alert('入力してください', 'フィードバック内容を入力してください。');
      return;
    }
    const email = 'ryuc3mm5012@gmail.com';
    const subject = '[資産形成シミュレーター] ユーザーからのフィードバック';
    const body = feedbackText;
    const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    try {
      const canOpen = await Linking.canOpenURL(mailtoUrl);
      if (canOpen) {
        await Linking.openURL(mailtoUrl);
        setFeedbackText('');
        setIsFeedbackExpanded(false);
      } else {
        Alert.alert(
          'メールを開けません',
          'お使いのデバイスにメールアカウントが設定されていないため、メールを開くことができませんでした。\n\n宛先：ryuc3mm5012@gmail.com までメールをお送りください。'
        );
      }
    } catch (err) {
      console.error('Mail open error:', err);
      Alert.alert('エラー', 'メールアプリの起動に失敗しました。');
    }
  };

  // support form actions

  const priceLabel = '¥100 / 月 または ¥1,000（買い切り）';

  // ── 購入処理 ───────────────────────────────────────────────────────────────
  const handlePurchase = async (planId = 'monthly') => {
    setIsPurchasing(true);
    try {
      const result = await purchaseSubscription(planId);
      if (result.success) {
        Alert.alert(
          'プレミアム登録完了 🎉',
          '広告が非表示になり、履歴が無制限に保存できるようになりました！',
          [{ text: 'OK' }],
        );
      } else if (!result.userCancelled) {
        Alert.alert(
          '購入できませんでした',
          subscribeError ?? '時間を置いて再度お試しください。',
          [{ text: 'OK' }],
        );
      }
    } finally {
      setIsPurchasing(false);
    }
  };

  // ── サブスクリプションの管理・解約（Apple規約準拠） ───────────────────────
  const handleManageSubscription = async () => {
    const url = 'https://apps.apple.com/account/subscriptions';
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(
          'エラー',
          'サブスクリプション管理画面を開けませんでした。App Storeアプリから直接ご確認ください。'
        );
      }
    } catch (e) {
      console.error('[SettingsScreen] handleManageSubscription error:', e);
      Alert.alert('エラー', '管理画面の起動に失敗しました。');
    }
  };

  // ── 購入内容の復元（Apple規約準拠） ────────────────────────────────────────
  const handleRestore = async () => {
    setIsRestoring(true);
    try {
      const result = await restorePurchases();
      if (result.success && result.isActive) {
        Alert.alert(
          '復元完了 ✅',
          'プレミアムプランが復元されました。',
          [{ text: 'OK' }],
        );
      } else if (result.success && !result.isActive) {
        Alert.alert(
          '復元する購入がありません',
          'このApple IDには有効なプレミアムサブスクリプションが見つかりませんでした。',
          [{ text: 'OK' }],
        );
      } else {
        Alert.alert(
          '復元に失敗しました',
          subscribeError ?? 'ネットワークを確認して再度お試しください。',
          [{ text: 'OK' }],
        );
      }
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── ヘッダー ───────────────────────────────────────────── */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>設定</Text>
        </View>

        {/* ── プラン管理 ── */}

        {/* ── 現在のプラン ────────────────────────────────────────── */}
        <SectionHeader title="現在のプラン" />
        <View style={[styles.card, isPremium && styles.cardPremium]}>
          <View style={styles.planRow}>
            <Text style={styles.planEmoji}>{isPremium ? '👑' : '🆓'}</Text>
            <View style={styles.planTextBlock}>
              <Text style={styles.planName}>
                {isPremium ? 'プレミアムプラン' : '無料プラン'}
              </Text>
              <Text style={styles.planPrice}>
                {isPremium ? priceLabel : '¥0 / 月'}
              </Text>
            </View>
            <View
              style={[
                styles.planBadge,
                isPremium ? styles.planBadgePremium : styles.planBadgeFree,
              ]}
            >
              <Text style={styles.planBadgeText}>
                {isPremium ? '加入中' : '未加入'}
              </Text>
            </View>
          </View>
        </View>

        {/* ── プレミアム購入ボタン（未加入時のみ） ─────────────────── */}
        {!isPremium && (
          <>
            <SectionHeader title="プレミアムにアップグレード" />
            <View style={styles.card}>
              <Text style={styles.upgradeDescription}>
                広告を完全非表示にし、計算履歴を無制限に保存できます。ニーズに合わせてプランをお選びください。
              </Text>
              
              {/* 月額サブスクリプションボタン */}
              <Button
                mode="contained"
                onPress={() => handlePurchase('monthly')}
                loading={isPurchasing}
                disabled={isPurchasing}
                buttonColor={COLORS.accent}
                textColor={COLORS.textOnAccent}
                style={styles.paperButton}
                labelStyle={styles.paperButtonLabel}
                accessibilityLabel="月額サブスクリプション（¥100/月）を購入"
              >
                👑 月額サブスクリプション（¥100 / 月）
              </Button>

              {/* 買い切りプランボタン */}
              <Button
                mode="contained"
                onPress={() => handlePurchase('lifetime')}
                loading={isPurchasing}
                disabled={isPurchasing}
                buttonColor={COLORS.accentDark}
                textColor={COLORS.textOnAccent}
                style={[styles.paperButton, { marginTop: 12 }]}
                labelStyle={styles.paperButtonLabel}
                accessibilityLabel="買い切りライフタイム（¥1,000）を購入"
              >
                💎 買い切りライフタイム（¥1,000）
              </Button>
              
              <Text style={styles.purchaseNote}>
                ・Apple IDに請求されます{'\n'}
                ・サブスクリプションプランは各期間終了の24時間以上前にキャンセルしない限り自動更新されます。App Store設定からいつでもキャンセル可能です{'\n'}
                ・買い切りプランは一度の購入で永続的にすべてのプレミアム機能をご利用いただけます。
              </Text>
            </View>
          </>
        )}

        {/* ── プラン機能比較 ────────────────────────────────────────── */}
        <SectionHeader title="プラン比較" />
        <View style={styles.card}>
          {/* テーブルヘッダー */}
          <View style={[styles.tableRow, styles.tableHeaderRow]}>
            <Text style={[styles.tableCell, styles.tableCellFeature, styles.tableHeaderText]}>
              機能
            </Text>
            <Text style={[styles.tableCell, styles.tableCellPlan, styles.tableHeaderText]}>
              無料
            </Text>
            <Text style={[styles.tableCell, styles.tableCellPlan, styles.tableHeaderText, styles.tablePremiumHeader]}>
              プレミアム
            </Text>
          </View>

          {PLAN_FEATURES.map((row, idx) => (
            <View
              key={row.feature}
              style={[
                styles.tableRow,
                idx < PLAN_FEATURES.length - 1 && styles.tableRowBorder,
              ]}
            >
              <Text style={[styles.tableCell, styles.tableCellFeature, styles.tableFeatureText]}>
                {row.feature}
              </Text>
              <View style={[styles.tableCell, styles.tableCellPlan, styles.tableCellCenter]}>
                <Text style={[styles.tablePlanText, !row.freeOk && styles.tablePlanTextNg]}>
                  {row.freeOk ? '✅' : '❌'} {row.free}
                </Text>
              </View>
              <View style={[styles.tableCell, styles.tableCellPlan, styles.tableCellCenter]}>
                <Text style={[styles.tablePlanText, styles.tablePremiumText]}>
                  {row.premiumOk ? '✅' : '❌'} {row.premium}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── 質問・レビュー ─── */}
        <SectionHeader title="サポート" />
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.feedbackHeaderRow}
            onPress={() => {
              if (!isPremium) {
                Alert.alert(
                  '🔒 プレミアム機能',
                  '「質問・レビュー」はプレミアムプラン専用機能です。アップグレードしてサポートをご利用ください。',
                  [{ text: '閉じる' }]
                );
                return;
              }
              setIsFeedbackExpanded(!isFeedbackExpanded);
            }}
            activeOpacity={0.7}
            accessibilityLabel="質問・レビューを開く"
            accessibilityRole="button"
          >
            <Text style={styles.feedbackTitleText}>
              {isPremium ? '💬 質問・レビュー' : '🔒 質問・レビュー（プレミアム専用）'}
            </Text>
            {isPremium && (
              <Text style={styles.feedbackArrowText}>
                {isFeedbackExpanded ? '▲' : '▼'}
              </Text>
            )}
          </TouchableOpacity>

          {isPremium && isFeedbackExpanded && (
            <View style={styles.feedbackContent}>
              <TextInput
                style={styles.feedbackInput}
                multiline={true}
                numberOfLines={4}
                maxLength={200}
                value={feedbackText}
                onChangeText={setFeedbackText}
                placeholder="アプリへのご要望、不具合報告、ご質問などをご自由にご記入ください。"
                placeholderTextColor={COLORS.textMuted}
              />
              <View style={styles.feedbackFooter}>
                <Text style={styles.charCountText}>
                  {feedbackText.length} / 200
                </Text>
                <TouchableOpacity
                  style={[styles.feedbackSendButton, !feedbackText.trim() && styles.disabledSendButton]}
                  onPress={handleSendFeedback}
                  disabled={!feedbackText.trim()}
                  accessibilityLabel="送信"
                  accessibilityRole="button"
                >
                  <Text style={styles.feedbackSendButtonText}>送信</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* ── 購入内容の復元（Apple規約必須・最下部に配置） ─────────── */}
        <SectionHeader title="その他" />
        <View style={styles.card}>
          <Text style={styles.restoreDescription}>
            以前に購入したプレミアムプランを別の端末や再インストール後に復元できます。
          </Text>

          {/* サブスクリプションの管理・解約ボタン */}
          <TouchableOpacity
            style={[styles.restoreButton, { marginBottom: 12 }]}
            onPress={handleManageSubscription}
            accessibilityLabel="サブスクリプションの管理と解約"
            accessibilityRole="button"
          >
            <Text style={styles.restoreButtonText}>
              💳 サブスクリプションの管理・解約
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.restoreButton}
            onPress={handleRestore}
            disabled={isRestoring}
            accessibilityLabel="購入内容の復元"
            accessibilityRole="button"
          >
            {isRestoring ? (
              <ActivityIndicator color={COLORS.accent} />
            ) : (
              <Text style={styles.restoreButtonText}>
                🔄 購入内容の復元 (Restore)
              </Text>
            )}
          </TouchableOpacity>

          {/* ── 法的URL（プライバシーポリシー・EULA） ── */}
          <View style={styles.legalLinksRow}>
            <TouchableOpacity
              onPress={() => Linking.openURL('https://github.com/ryuc3mm5012/savings-simulator/blob/main/privacy-policy.md')}
              accessibilityLabel="プライバシーポリシーを開く"
              accessibilityRole="link"
            >
              <Text style={styles.legalLinkText}>プライバシーポリシー</Text>
            </TouchableOpacity>
            <Text style={styles.legalLinkDivider}>|</Text>
            <TouchableOpacity
              onPress={() => Linking.openURL('https://github.com/ryuc3mm5012/savings-simulator/blob/main/eula.md')}
              accessibilityLabel="利用規約 (EULA) を開く"
              accessibilityRole="link"
            >
              <Text style={styles.legalLinkText}>利用規約 (EULA)</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── アプリ情報 ───────────────────────────────────────────── */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>資産形成シミュレーター</Text>
          <Text style={styles.appInfoVersion}>
            Version {Constants.expoConfig?.version ?? '1.0.0'}
          </Text>
          <Text style={styles.appInfoDisclaimer}>
            ※ 計算結果は将来の運用成果を保証するものではありません。
            投資は自己責任でご判断ください。
          </Text>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* ── バナー広告（無料ユーザーのみ・最下部） ─────────────────── */}
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
    paddingBottom: SPACING.xl,
  },
  header: {
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
  sectionHeader: {
    fontSize: FONT_SIZES.xs + 1,
    fontFamily: FONTS.bold,
    color: COLORS.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xs,
  },
  card: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.xl,
    marginHorizontal: SPACING.md,
    padding: SPACING.lg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  cardPremium: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accentLight,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  planEmoji: {
    fontSize: 36,
  },
  planTextBlock: {
    flex: 1,
  },
  planName: {
    fontSize: FONT_SIZES.lg,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
  },
  planPrice: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  planBadge: {
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: SPACING.xs,
  },
  planBadgeFree: {
    backgroundColor: COLORS.border,
  },
  planBadgePremium: {
    backgroundColor: COLORS.accent,
  },
  planBadgeText: {
    fontSize: FONT_SIZES.xs + 1,
    fontFamily: FONTS.bold,
    color: COLORS.textOnAccent,
  },
  upgradeDescription: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: SPACING.md,
  },
  purchaseButton: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.full,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
    ...SHADOWS.button,
  },
  purchaseButtonText: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
    color: COLORS.textOnAccent,
    letterSpacing: 0.3,
  },
  purchaseNote: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    lineHeight: 18,
    marginTop: SPACING.md,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  tableHeaderRow: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.border,
    marginBottom: SPACING.xs,
  },
  tableRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tableCell: {
    paddingHorizontal: SPACING.xs,
  },
  tableCellFeature: {
    flex: 2,
  },
  tableCellPlan: {
    flex: 3,
  },
  tableCellCenter: {
    alignItems: 'flex-start',
  },
  tableHeaderText: {
    fontSize: FONT_SIZES.xs + 1,
    fontFamily: FONTS.bold,
    color: COLORS.textSecondary,
  },
  tablePremiumHeader: {
    color: COLORS.accent,
  },
  tableFeatureText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.medium,
    color: COLORS.textPrimary,
  },
  tablePlanText: {
    fontSize: FONT_SIZES.xs + 1,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    flexWrap: 'wrap',
  },
  tablePlanTextNg: {
    color: COLORS.textMuted,
  },
  tablePremiumText: {
    color: COLORS.accent,
    fontFamily: FONTS.medium,
  },
  restoreDescription: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: SPACING.md,
  },
  restoreButton: {
    borderWidth: 1.5,
    borderColor: COLORS.accent,
    borderRadius: RADIUS.full,
    paddingVertical: SPACING.sm + 4,
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
  },
  restoreButtonText: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
    color: COLORS.accent,
    letterSpacing: 0.3,
  },
  appInfo: {
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
  },
  appInfoText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
    color: COLORS.textMuted,
  },
  appInfoVersion: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  appInfoDisclaimer: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: SPACING.md,
  },
  bottomPadding: {
    height: SPACING.xl,
  },
  settingLabel: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.medium,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  assetInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.regular,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.background,
  },
  settingDescription: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
  },
  feedbackHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  feedbackTitleText: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
  },
  feedbackArrowText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  feedbackContent: {
    marginTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.md,
  },
  feedbackInput: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    padding: SPACING.sm,
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
    color: COLORS.textPrimary,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  feedbackFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  charCountText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
  },
  feedbackSendButton: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.full,
    paddingVertical: 8,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.button,
  },
  feedbackSendButtonText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
    color: COLORS.textOnAccent,
  },
  disabledSendButton: {
    opacity: 0.5,
    backgroundColor: COLORS.textMuted,
  },
  paperButton: {
    borderRadius: RADIUS.full,
    paddingVertical: 6,
    ...SHADOWS.button,
  },
  paperButtonLabel: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
    letterSpacing: 0.3,
  },
  legalLinksRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  legalLinkText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.medium,
    color: COLORS.accent,
    textDecorationLine: 'underline',
  },
  legalLinkDivider: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
  },
});

export default SettingsScreen;
