/**
 * AppContext.js - アプリ全体の状態管理（v2.1）
 *
 * 管理する状態:
 *   1. isPremium       : サブスク加入状態（RevenueCat連携）
 *   2. history         : 計算履歴（AsyncStorage連携）
 *   3. affiliateUrl    : 有効なアフィリエイトURL（linkChecker連携）
 *   4. isLoading       : 初期化中フラグ
 *
 * v2.1 変更点:
 *   ・addToHistory  : 自動保存モード（保存ボタン廃止）
 *                     無料ユーザーは slice(-3) で最新3件を保持（古いものを自動削除）
 *   ・toggleFavorite: お気に入りフラグを反転（有料ユーザーのみフィルタ可能）
 *   ・deleteNonFavorites: お気に入り以外を一括削除（有料ユーザー専用）
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import {
  getHistory,
  addHistory as addHistoryStorage,
  deleteOldHistory as deleteOldHistoryStorage,
  toggleFavoriteInStorage,
  deleteNonFavorites as deleteNonFavoritesStorage,
  clearAllHistory as clearAllHistoryStorage,
  saveSubscriptionInfo,
  getSubscriptionInfo,
  getCurrentAsset,
  saveCurrentAsset,
  getUserAge,
  saveUserAge,
} from '../utils/storage';
import { getActiveAffiliateUrl } from '../utils/linkChecker';

// ─── 【環境切り替え】react-native-purchases ─────────────────────────────────
// 開発環境 (__DEV__ = true) の場合はネイティブエラーを回避するためにモックを使用。
// 本番ビルド時は require でネイティブモジュールを動的に読み込みます。
const mockPurchases = {
  getCustomerInfo:  async () => ({ entitlements: { active: {} } }),
  getOfferings:     async () => ({ current: { monthly: { product: { identifier: 'monthly' } }, lifetime: { product: { identifier: 'lifetime' } } } }),
  purchasePackage:  async (pkg) => { 
    console.log('[Purchases Mock] purchasePackage called:', pkg);
    return { customerInfo: { entitlements: { active: { premium: {} } } } };
  },
  restorePurchases: async () => ({ entitlements: { active: { premium: {} } } }),
};

const Purchases = __DEV__
  ? mockPurchases
  : require('react-native-purchases').default;

// ─── Context 生成 ────────────────────────────────────────────────────────────
const AppContext = createContext(null);

// ─── Provider ────────────────────────────────────────────────────────────────
export const AppProvider = ({ children }) => {
  const [isPremium, setIsPremium] = useState(false);
  const [history, setHistory] = useState([]);
  const [affiliateUrl, setAffiliateUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [subscribeError, setSubscribeError] = useState(null);
  const [currentAsset, setCurrentAsset] = useState(0);
  const [userAge, setUserAge] = useState(30);

  // ── 初期化 ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const initialize = async () => {
      try {
        // 1. キャッシュされたサブスク状態を即時反映
        const cached = await getSubscriptionInfo();
        if (cached.isPremium) setIsPremium(true);

        // 2. 履歴をAsyncStorageから読み込む
        const savedHistory = await getHistory();
        setHistory(savedHistory);

        // 3. 現在の資産と年齢をAsyncStorageから読み込む
        const savedAsset = await getCurrentAsset();
        setCurrentAsset(savedAsset);
        
        const savedAge = await getUserAge();
        setUserAge(savedAge);

        // 4. アフィリエイトURLの生存確認（バックグラウンド実行）
        getActiveAffiliateUrl().then(setAffiliateUrl);
      } catch (error) {
        console.error('[AppContext] 初期化エラー:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, []);

  // ── サブスク状態の同期（Expo Goモック） ──────────────────────────────────
  const syncSubscriptionStatus = useCallback(async () => {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      const isActive = Object.keys(customerInfo.entitlements.active).length > 0;
      setIsPremium(isActive);
      await saveSubscriptionInfo({ isPremium: isActive, expiresAt: null });
      return isActive;
    } catch (_error) {
      console.warn('[AppContext] RevenueCat未接続（Expo Goモック）');
      return false;
    }
  }, []);

  // ── サブスクリプション / 買い切り購入 ─────────────────────────────────────
  const purchaseSubscription = useCallback(async (planId = 'monthly') => {
    setSubscribeError(null);
    try {
      if (__DEV__) {
        console.warn(`[AppContext] 購入モック (${planId}): isPremiumをトグル`);
        const next = !isPremium;
        setIsPremium(next);
        await saveSubscriptionInfo({ isPremium: next, expiresAt: null });
        return { success: next, userCancelled: false };
      }

      const offerings = await Purchases.getOfferings();
      let targetPackage = null;
      if (offerings?.current) {
        if (planId === 'lifetime') {
          targetPackage = offerings.current.lifetime;
        } else {
          targetPackage = offerings.current.monthly;
        }
      }

      if (!targetPackage) {
        throw new Error('指定されたプランのパッケージが見つかりませんでした。');
      }

      const { customerInfo } = await Purchases.purchasePackage(targetPackage);
      const isActive = Object.keys(customerInfo.entitlements.active).length > 0;
      setIsPremium(isActive);
      await saveSubscriptionInfo({ isPremium: isActive, expiresAt: null });
      return { success: isActive, userCancelled: false };
    } catch (error) {
      console.error('[AppContext] purchaseSubscription 失敗:', error);
      
      // 開発中に何らかのエラーが起きた場合のセーフガード
      if (__DEV__) {
        const next = !isPremium;
        setIsPremium(next);
        await saveSubscriptionInfo({ isPremium: next, expiresAt: null });
        return { success: next, userCancelled: false };
      }

      setSubscribeError(error.message);
      return { success: false, userCancelled: error.userCancelled || false };
    }
  }, [isPremium]);

  // ── 購入内容の復元（Expo Goモック） ─────────────────────────────────────
  const restorePurchases = useCallback(async () => {
    setSubscribeError(null);
    try {
      const customerInfo = await Purchases.restorePurchases();
      const isActive = Object.keys(customerInfo.entitlements.active).length > 0;
      setIsPremium(isActive);
      await saveSubscriptionInfo({ isPremium: isActive, expiresAt: null });
      return { success: true, isActive };
    } catch (error) {
      setSubscribeError(error.message);
      return { success: false };
    }
  }, []);

  // ── 履歴追加（v2.1: 自動保存モード） ────────────────────────────────────────
  /**
   * 計算結果を履歴に自動保存する
   * ・無料ユーザー: 最新3件を保持（古いものを自動削除）
   * ・有料ユーザー: 無制限
   * @param {Object} entry { inputs: {...}, result: {...} }
   * @returns {Promise<{success: boolean}>}
   */
  const addToHistory = useCallback(
    async (entry) => {
      try {
        const newEntry = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          savedAt: new Date().toISOString(),
          isFavorite: false,
          ...entry,
        };

        const updated = await addHistoryStorage(newEntry, isPremium);
        setHistory(updated);
        return { success: true };
      } catch (error) {
        console.error('[AppContext] addToHistory 失敗:', error);
        return { success: false };
      }
    },
    [isPremium],
  );

  // ── お気に入りフラグの反転（v2.1 新規） ────────────────────────────────────
  /**
   * 履歴アイテムのお気に入りフラグを切り替える
   * @param {string} id 履歴エントリのID
   */
  const toggleFavorite = useCallback(async (id) => {
    try {
      const updated = await toggleFavoriteInStorage(id);
      setHistory(updated);
      return { success: true };
    } catch (error) {
      console.error('[AppContext] toggleFavorite 失敗:', error);
      return { success: false };
    }
  }, []);

  // ── お気に入り以外を一括削除（v2.1 新規・有料ユーザー専用） ────────────────
  const deleteNonFavorites = useCallback(async () => {
    if (!isPremium) return { success: false, reason: 'premium_required' };

    try {
      const updated = await deleteNonFavoritesStorage();
      setHistory(updated);
      return { success: true, remaining: updated.length };
    } catch (error) {
      console.error('[AppContext] deleteNonFavorites 失敗:', error);
      return { success: false };
    }
  }, [isPremium]);

  // ── 30日以上前の履歴を一括削除（有料ユーザー専用） ────────────────────
  const deleteOldHistory = useCallback(async () => {
    if (!isPremium) return { success: false, reason: 'premium_required' };

    try {
      const updated = await deleteOldHistoryStorage();
      setHistory(updated);
      return { success: true, remaining: updated.length };
    } catch (error) {
      console.error('[AppContext] deleteOldHistory 失敗:', error);
      return { success: false };
    }
  }, [isPremium]);

  // ── 全履歴を完全削除（警告ダイアログは呼び出し側で表示） ─────────────────
  const deleteAllHistory = useCallback(async () => {
    try {
      await clearAllHistoryStorage();
      setHistory([]);
      return { success: true };
    } catch (error) {
      console.error('[AppContext] deleteAllHistory 失敗:', error);
      return { success: false };
    }
  }, []);

  // ── 現在の資産の更新 ──────────────────────────────────────────────────────────
  const updateCurrentAsset = useCallback(async (amount) => {
    try {
      const parsedAmount = parseInt(amount, 10);
      const validAmount = isNaN(parsedAmount) || parsedAmount < 0 ? 0 : parsedAmount;
      setCurrentAsset(validAmount);
      await saveCurrentAsset(validAmount);
      return { success: true };
    } catch (error) {
      console.error('[AppContext] updateCurrentAsset 失敗:', error);
      return { success: false };
    }
  }, []);

  // ── 年齢の更新 ───────────────────────────────────────────────────────────────
  const updateUserAge = useCallback(async (age) => {
    try {
      const parsedAge = parseInt(age, 10);
      const validAge = isNaN(parsedAge) || parsedAge < 0 ? 0 : parsedAge;
      setUserAge(validAge);
      await saveUserAge(validAge);
      return { success: true };
    } catch (error) {
      console.error('[AppContext] updateUserAge 失敗:', error);
      return { success: false };
    }
  }, []);

  // ── Context Value ───────────────────────────────────────────────────────────
  const value = {
    // 状態
    isPremium,
    history,
    affiliateUrl,
    isLoading,
    subscribeError,
    currentAsset,
    userAge,

    // アクション
    addToHistory,
    toggleFavorite,
    deleteNonFavorites,
    deleteAllHistory,
    deleteOldHistory,
    purchaseSubscription,
    restorePurchases,
    syncSubscriptionStatus,
    updateCurrentAsset,
    updateUserAge,

    // 定数
    FREE_HISTORY_LIMIT: 3,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// ─── カスタムフック ──────────────────────────────────────────────────────────
/**
 * AppContextを使用するカスタムフック
 * Provider外で呼ばれた場合はエラーを投げる
 */
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext は AppProvider の内側で使用してください。');
  }
  return context;
};

export default AppContext;
