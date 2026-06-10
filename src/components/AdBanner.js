import React from 'react';
import { View, StyleSheet, Text, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppContext } from '../context/AppContext';
import { COLORS, FONTS, FONT_SIZES } from '../constants/theme';

// ─── 【環境切り替え】AdMob バナー広告モジュール ───────────────────────────────
// 開発環境 (__DEV__ = true) の場合はネイティブエラーを回避するために動的にrequire。
// 本番ビルド時のみ本物のパッケージを使用します。
let BannerAd = null;
let BannerAdSize = null;
let TestIds = null;

if (!__DEV__) {
  try {
    const googleMobileAds = require('react-native-google-mobile-ads');
    BannerAd = googleMobileAds.BannerAd;
    BannerAdSize = googleMobileAds.BannerAdSize;
    TestIds = googleMobileAds.TestIds;
  } catch (e) {
    console.warn('[AdBanner] Google Mobile Ads dynamic import failed:', e);
  }
}

const getAdUnitId = () => {
  if (__DEV__ || !TestIds) return 'mock-banner-id';
  
  try {
    const Constants = require('expo-constants').default;
    const { admob } = Constants.expoConfig?.extra ?? {};
    return Platform.OS === 'ios'
      ? admob?.iosBannerAdUnitId ?? TestIds.BANNER
      : admob?.androidBannerAdUnitId ?? TestIds.BANNER;
  } catch (_e) {
    return TestIds.BANNER;
  }
};

const AD_UNIT_ID = getAdUnitId();

const AdBanner = () => {
  const { isPremium } = useAppContext();
  const insets = useSafeAreaInsets();

  // 有料ユーザーには広告を表示しない
  if (isPremium) return null;

  if (__DEV__) {
    // 開発環境用のモックバナー表示
    return (
      <View style={[styles.container, { paddingBottom: insets.bottom }]}>
        <View style={styles.separator} />
        <View style={styles.mockBanner}>
          <Text style={styles.mockText}>📢 広告枠（開発中モック）</Text>
          <Text style={styles.mockSubText}>本番ビルドで実際の広告に切り替わります</Text>
        </View>
      </View>
    );
  }

  // 本番環境（ネイティブ）バナー広告の描画
  try {
    if (!BannerAd || !BannerAdSize) {
      return null;
    }
    return (
      <View style={[styles.container, { paddingBottom: insets.bottom, alignItems: 'center' }]}>
        <View style={styles.separator} />
        <BannerAd
          unitId={AD_UNIT_ID}
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          requestOptions={{ requestNonPersonalizedAdsOnly: false }}
        />
      </View>
    );
  } catch (error) {
    console.error('[AdBanner] 広告表示に失敗しました:', error);
    return null;
  }
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background,
  },
  separator: {
    width: '100%',
    height: 1,
    backgroundColor: COLORS.border,
  },
  mockBanner: {
    height: 52,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#CCCCCC',
    margin: 4,
    borderRadius: 4,
  },
  mockText: {
    fontSize: FONT_SIZES.xs + 1,
    fontFamily: FONTS.medium,
    color: '#999999',
  },
  mockSubText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
    color: '#BBBBBB',
    marginTop: 2,
  },
});

export default AdBanner;
