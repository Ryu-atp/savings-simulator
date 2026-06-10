/**
 * App.js - エントリポイント
 * ・NavigationContainerのルート設定
 * ・AppContextProviderでアプリ全体を包む
 *
 * ※ AdMob / RevenueCat の初期化は本番ビルド時に有効化する。
 *    Expo Go 開発中はネイティブモジュールが存在しないため無効化済み。
 */

import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Text, Platform } from 'react-native';
import { requestTrackingPermissionsAsync } from 'expo-tracking-transparency';
import Constants from 'expo-constants';

// Context
import { AppProvider } from './src/context/AppContext';

// Screens
import MainScreen from './src/screens/MainScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import SettingsScreen from './src/screens/SettingsScreen';

// Theme
import { COLORS, FONTS } from './src/constants/theme';

const Tab = createBottomTabNavigator();

// タブアイコン（絵文字でシンプルに）
const TAB_ICONS = {
  Main: '🧮',
  History: '📊',
  Settings: '⚙️',
};

const TAB_LABELS = {
  Main: 'シミュレート',
  History: '履歴',
  Settings: '設定',
};

export default function App() {
  useEffect(() => {
    // 本番ビルド時（__DEV__ = false）のみ、ネイティブ広告と課金システムを初期化する
    if (!__DEV__) {
      // 1. AdMob の初期化
      try {
        const mobileAds = require('react-native-google-mobile-ads').default;
        mobileAds().initialize().then((status) => {
          console.log('[AdMob] Initialized:', status);
        });
      } catch (e) {
        console.warn('[AdMob] Initialization failed:', e);
      }

      // 2. RevenueCat の初期化
      try {
        const Purchases = require('react-native-purchases').default;
        const iosKey = Constants.expoConfig?.extra?.revenuecat?.iosApiKey;
        if (iosKey && iosKey !== 'YOUR_REVENUECAT_IOS_API_KEY_HERE') {
          Purchases.configure({ apiKey: iosKey });
          console.log('[RevenueCat] Initialized.');
        } else {
          console.warn('[RevenueCat] API Key is placeholder. Skipping initialization.');
        }
      } catch (e) {
        console.warn('[RevenueCat] Initialization failed:', e);
      }
    }

    const requestATT = async () => {
      if (Platform.OS === 'ios') {
        try {
          const { status } = await requestTrackingPermissionsAsync();
          if (status === 'granted') {
            console.log('[ATT] Tracking permission granted.');
          } else {
            console.log('[ATT] Tracking permission denied or not determined.');
          }
        } catch (e) {
          console.warn('[ATT] Request tracking permission failed:', e);
        }
      }
    };

    const timer = setTimeout(() => {
      requestATT();
    }, 1000);

    return () => clearTimeout(timer);
  }, []);


  return (
    <SafeAreaProvider>
      <AppProvider>
        <StatusBar style="dark" backgroundColor={COLORS.background} />
        <NavigationContainer>
          <Tab.Navigator
            screenOptions={({ route }) => ({
              headerShown: false,
              tabBarStyle: {
                backgroundColor: COLORS.background,
                borderTopColor: COLORS.border,
                borderTopWidth: 1,
                height: 80,
                paddingBottom: 16,
                paddingTop: 8,
              },
              tabBarActiveTintColor: COLORS.accent,
              tabBarInactiveTintColor: COLORS.textMuted,
              tabBarLabelStyle: {
                fontFamily: FONTS.medium,
                fontSize: 11,
              },
              tabBarIcon: ({ focused }) => (
                <Text
                  style={{
                    fontSize: 22,
                    opacity: focused ? 1 : 0.5,
                  }}
                >
                  {TAB_ICONS[route.name]}
                </Text>
              ),
              tabBarLabel: TAB_LABELS[route.name] ?? route.name,
            })}
          >
            <Tab.Screen name="Main" component={MainScreen} />
            <Tab.Screen name="History" component={HistoryScreen} />
            <Tab.Screen name="Settings" component={SettingsScreen} />
          </Tab.Navigator>
        </NavigationContainer>
      </AppProvider>
    </SafeAreaProvider>
  );
}
