/**
 * index.js - アプリケーションエントリポイント
 *
 * package.json の "main": "index.js" から呼ばれる。
 * AppRegistry に App コンポーネントを登録する。
 */
import { registerRootComponent } from 'expo';
import App from './App';

// registerRootComponent は AppRegistry.registerComponent('main', ...) と同等。
// Expo が管理する環境でも、ネイティブ環境でも正しく動作する。
registerRootComponent(App);
