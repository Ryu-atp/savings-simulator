/**
 * linkChecker.js - アフィリエイトURL生存確認ユーティリティ
 *
 * アプリ起動時に一度だけ primaryUrl の生存チェックを行い、
 * 無効（ネットワークエラー / 4xx/5xx）の場合は fallbackUrl を返す。
 *
 * ・タイムアウト: 5秒（ユーザー体験を損なわないよう短く設定）
 * ・HEADリクエストを使用（ボディを取得しないため最軽量）
 * ・結果はモジュールスコープにキャッシュ（二重チェック防止）
 */

import Constants from 'expo-constants';

/** キャッシュ: 一度確認したら再チェックしない */
let _cachedActiveUrl = null;

/**
 * タイムアウト付き fetch ラッパー
 * @param {string} url
 * @param {number} timeoutMs
 * @returns {Promise<Response>}
 */
const fetchWithTimeout = (url, timeoutMs = 5000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  return fetch(url, {
    method: 'HEAD',
    signal: controller.signal,
  }).finally(() => clearTimeout(timer));
};

/**
 * アフィリエイトURLの生存確認を行い、有効なURLを返す
 *
 * @returns {Promise<string>} 有効なURL（primary or fallback）
 */
export const getActiveAffiliateUrl = async () => {
  // キャッシュがあればそれを返す
  if (_cachedActiveUrl) {
    return _cachedActiveUrl;
  }

  const { affiliate } = Constants.expoConfig?.extra ?? {};
  const primaryUrl = affiliate?.primaryUrl ?? '';
  const fallbackUrl = affiliate?.fallbackUrl ?? 'https://www.rakuten-sec.co.jp/';

  // primaryUrl が未設定の場合は即座にfallback
  if (!primaryUrl || primaryUrl.includes('example-affiliate')) {
    console.info('[LinkChecker] primaryURLは開発用プレースホルダーのため、fallbackを使用します。');
    _cachedActiveUrl = fallbackUrl;
    return fallbackUrl;
  }

  try {
    console.info('[LinkChecker] URL生存確認中:', primaryUrl);
    const response = await fetchWithTimeout(primaryUrl, 5000);

    if (response.ok || response.status === 405) {
      // 200-299: 正常 / 405: HEADが許可されていないが存在はする
      console.info('[LinkChecker] primaryURL 有効:', primaryUrl);
      _cachedActiveUrl = primaryUrl;
      return primaryUrl;
    } else {
      console.warn(`[LinkChecker] primaryURL が ${response.status} を返しました。fallbackを使用します。`);
      _cachedActiveUrl = fallbackUrl;
      return fallbackUrl;
    }
  } catch (error) {
    // ネットワークエラー・タイムアウト・AbortError
    if (error.name === 'AbortError') {
      console.warn('[LinkChecker] タイムアウト。fallbackを使用します。');
    } else {
      console.warn('[LinkChecker] ネットワークエラー。fallbackを使用します:', error.message);
    }
    _cachedActiveUrl = fallbackUrl;
    return fallbackUrl;
  }
};

/**
 * キャッシュをリセットする（テスト用・設定変更時）
 */
export const resetLinkCache = () => {
  _cachedActiveUrl = null;
};
