import { useEffect, useState, useRef } from 'react';
import { Alert } from 'react-native';

// ─── 【環境切り替え】AdMob 動画広告モジュール ───────────────────────────────
// 開発環境 (__DEV__ = true) の場合はネイティブエラーを回避するために動的にrequire。
// 本番ビルド時のみ本物のパッケージを使用します。
let InterstitialAd = null;
let AdEventType = null;
let TestIds = null;

if (!__DEV__) {
  try {
    const googleMobileAds = require('react-native-google-mobile-ads');
    InterstitialAd = googleMobileAds.InterstitialAd;
    AdEventType = googleMobileAds.AdEventType;
    TestIds = googleMobileAds.TestIds;
  } catch (e) {
    console.warn('[AdVideo] Google Mobile Ads module dynamic import failed:', e);
  }
}

// 広告ユニットID
const getAdUnitId = () => {
  if (__DEV__ && TestIds) {
    return TestIds.INTERSTITIAL;
  }
  if (!TestIds) return 'mock-id';
  // 本番用広告ユニットID
  return 'ca-app-pub-3940256099942544/1033173712';
};

const AD_UNIT_ID = getAdUnitId();

/**
 * 動画広告（インターステシャル広告）表示用のカスタムフック
 * @param {boolean} isPremium - プレミアムユーザーかどうか
 * @returns {Object} { showAdIfRequired, isLoading }
 */
export const useAdVideo = (isPremium) => {
  const [adLoaded, setAdLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const adRef = useRef(null);

  // 広告の事前ロード
  useEffect(() => {
    if (isPremium) return;

    if (__DEV__) {
      // 開発用の疑似ロード完了設定
      setAdLoaded(true);
      return;
    }

    try {
      if (!InterstitialAd) return;
      
      const interstitial = InterstitialAd.createForAdRequest(AD_UNIT_ID, {
        requestNonPersonalizedAdsOnly: true,
        keywords: ['finance', 'stocks', 'investment'],
      });

      const unsubscribeLoaded = interstitial.addAdEventListener(
        AdEventType.LOADED,
        () => {
          setAdLoaded(true);
        }
      );

      const unsubscribeClosed = interstitial.addAdEventListener(
        AdEventType.CLOSED,
        () => {
          setAdLoaded(false);
          // 次回用の広告をロード
          interstitial.load();
        }
      );

      interstitial.load();
      adRef.current = interstitial;

      return () => {
        unsubscribeLoaded();
        unsubscribeClosed();
      };
    } catch (e) {
      console.warn('[AdVideo] 広告ロードに失敗しました:', e);
    }
  }, [isPremium]);

  /**
   * 必要に応じて動画広告を表示し、完了後にコールバックを実行する
   * @param {Function} onClosed - 広告クローズ後（または非表示・エラー時）に実行するコールバック
   */
  const showAdIfRequired = (onClosed) => {
    if (isPremium) {
      onClosed();
      return;
    }

    if (__DEV__) {
      // 開発環境用のモーダルモック表示
      setIsLoading(true);
      Alert.alert(
        '📢 動画広告（開発用モック）',
        '動画広告（インターステシャル）が表示されています。\n本番ビルドでは実際の広告が配信されます。',
        [
          {
            text: '広告を閉じる',
            onPress: () => {
              setIsLoading(false);
              onClosed();
            },
          },
        ],
        { cancelable: false }
      );
      return;
    }

    // 本番環境での表示
    try {
      if (adLoaded && adRef.current) {
        const unsubscribe = adRef.current.addAdEventListener(
          AdEventType.CLOSED,
          () => {
            unsubscribe();
            onClosed();
          }
        );
        adRef.current.show();
      } else {
        console.warn('[AdVideo] 広告がまだロードされていません。スキップして処理を継続します');
        onClosed();
      }
    } catch (e) {
      console.warn('[AdVideo] 広告表示に失敗しました:', e);
      onClosed();
    }
  };

  return {
    showAdIfRequired,
    isLoading,
  };
};

export default useAdVideo;
