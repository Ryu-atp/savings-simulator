/**
 * storage.js - AsyncStorageラッパー（v2.1）
 *
 * 全データはローカルのみで完結（外部通信なし）。
 * 外部DBコスト・課金リスクを物理的にゼロにする。
 *
 * ストレージキー:
 *   @savings_history   : 計算履歴の配列（JSON）
 *   @subscription_info : サブスク状態キャッシュ（JSON）
 *
 * v2.1 追加:
 *   - toggleFavoriteInStorage(id)    : お気に入りフラグを反転
 *   - deleteNonFavorites()           : お気に入り以外を一括削除（有料専用）
 *   - addHistory の自動保存モード    : 上限超過時は古いものを自動削除
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  HISTORY:      '@savings_history',
  SUBSCRIPTION: '@subscription_info',
  CURRENT_ASSET:'@current_asset',
  USER_AGE:     '@user_age',
};

// ─────────────────────────────────────────────────────────────────────────────
// 履歴 (History)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 全履歴を取得する
 * @returns {Promise<Array>} 履歴オブジェクトの配列（新しい順）
 */
export const getHistory = async () => {
  try {
    const raw = await AsyncStorage.getItem(KEYS.HISTORY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('[Storage] getHistory 失敗:', error);
    return [];
  }
};

/**
 * 履歴を1件自動保存する（v2.1 自動保存対応）
 * ・有料ユーザー: 無制限
 * ・無料ユーザー: slice(-3) で最新3件を保持（古いものを自動削除）
 *
 * @param {Object} entry   追加するデータ（id, savedAt, inputs, result, isFavorite を含む）
 * @param {boolean} isPremium サブスク加入状態
 * @returns {Promise<Array>} 更新後の履歴配列
 */
export const addHistory = async (entry, isPremium = false) => {
  try {
    const current = await getHistory();
    const FREE_LIMIT = 3;

    // isFavoriteフィールドを確実に付与
    const newEntry = { isFavorite: false, ...entry };

    // 新しいエントリを先頭に追加
    const updated = [newEntry, ...current];

    // 無料ユーザーは最新3件に自動トリム（保存できない、ではなく古いものを消す）
    const limited = isPremium ? updated : updated.slice(0, FREE_LIMIT);

    await AsyncStorage.setItem(KEYS.HISTORY, JSON.stringify(limited));
    return limited;
  } catch (error) {
    console.error('[Storage] addHistory 失敗:', error);
    throw error;
  }
};

/**
 * お気に入りフラグを反転させる（v2.1 新規）
 * @param {string} id  履歴エントリのID
 * @returns {Promise<Array>} 更新後の履歴配列
 */
export const toggleFavoriteInStorage = async (id) => {
  try {
    const current = await getHistory();
    const updated = current.map((item) =>
      item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
    );
    await AsyncStorage.setItem(KEYS.HISTORY, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.error('[Storage] toggleFavoriteInStorage 失敗:', error);
    throw error;
  }
};

/**
 * お気に入り以外の履歴を一括削除する（v2.1 新規・有料ユーザー専用）
 * @returns {Promise<Array>} 削除後の履歴配列（お気に入りのみ残る）
 */
export const deleteNonFavorites = async () => {
  try {
    const current = await getHistory();
    const filtered = current.filter((item) => item.isFavorite === true);
    await AsyncStorage.setItem(KEYS.HISTORY, JSON.stringify(filtered));
    return filtered;
  } catch (error) {
    console.error('[Storage] deleteNonFavorites 失敗:', error);
    throw error;
  }
};

/**
 * 30日以上前の履歴を一括削除する（有料ユーザー専用）
 * @returns {Promise<Array>} 削除後の履歴配列
 */
export const deleteOldHistory = async () => {
  try {
    const current = await getHistory();
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    const filtered = current.filter((item) => {
      const savedAt = new Date(item.savedAt).getTime();
      return savedAt >= thirtyDaysAgo;
    });

    await AsyncStorage.setItem(KEYS.HISTORY, JSON.stringify(filtered));
    return filtered;
  } catch (error) {
    console.error('[Storage] deleteOldHistory 失敗:', error);
    throw error;
  }
};

/**
 * 全履歴を完全削除する（デバッグ・リセット用）
 * @returns {Promise<void>}
 */
export const clearAllHistory = async () => {
  try {
    await AsyncStorage.removeItem(KEYS.HISTORY);
  } catch (error) {
    console.error('[Storage] clearAllHistory 失敗:', error);
    throw error;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// サブスクリプション状態キャッシュ (Subscription)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * サブスク状態をローカルにキャッシュ保存する
 * ※ 正規の検証はRevenueCat側で行う。ここはUI表示用キャッシュ。
 * @param {Object} info { isPremium: boolean, expiresAt: string|null }
 */
export const saveSubscriptionInfo = async (info) => {
  try {
    await AsyncStorage.setItem(KEYS.SUBSCRIPTION, JSON.stringify(info));
  } catch (error) {
    console.error('[Storage] saveSubscriptionInfo 失敗:', error);
  }
};

/**
 * キャッシュされたサブスク状態を取得する
 * @returns {Promise<{isPremium: boolean, expiresAt: string|null}>}
 */
export const getSubscriptionInfo = async () => {
  try {
    const raw = await AsyncStorage.getItem(KEYS.SUBSCRIPTION);
    if (!raw) return { isPremium: false, expiresAt: null };
    return JSON.parse(raw);
  } catch (error) {
    console.error('[Storage] getSubscriptionInfo 失敗:', error);
    return { isPremium: false, expiresAt: null };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 現在の資産 (Current Asset)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 現在の資産額を取得する
 * @returns {Promise<number>}
 */
export const getCurrentAsset = async () => {
  try {
    const raw = await AsyncStorage.getItem(KEYS.CURRENT_ASSET);
    return raw ? parseInt(raw, 10) : 0;
  } catch (error) {
    console.error('[Storage] getCurrentAsset 失敗:', error);
    return 0;
  }
};

/**
 * 現在の資産額を保存する
 * @param {number} amount 資産額
 */
export const saveCurrentAsset = async (amount) => {
  try {
    await AsyncStorage.setItem(KEYS.CURRENT_ASSET, amount.toString());
  } catch (error) {
    console.error('[Storage] saveCurrentAsset 失敗:', error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ユーザープロフィール (User Profile)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ユーザーの年齢を取得する
 * @returns {Promise<number>}
 */
export const getUserAge = async () => {
  try {
    const raw = await AsyncStorage.getItem(KEYS.USER_AGE);
    return raw ? parseInt(raw, 10) : 30; // デフォルトは30歳
  } catch (error) {
    console.error('[Storage] getUserAge 失敗:', error);
    return 30;
  }
};

/**
 * ユーザーの年齢を保存する
 * @param {number} age 年齢
 */
export const saveUserAge = async (age) => {
  try {
    await AsyncStorage.setItem(KEYS.USER_AGE, age.toString());
  } catch (error) {
    console.error('[Storage] saveUserAge 失敗:', error);
  }
};
