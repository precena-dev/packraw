# freee打刻デスクトップアプリ仕様書

## プロジェクト概要

### アプリ名
freee Desktop Kintai

### 目的
freeeの勤怠打刻をデスクトップから素早く行えるようにし、打刻忘れを防ぎ、業務効率を向上させる。

### 主な機能
- freeeの打刻画面をWebViewで常駐表示
- ワンクリックで打刻可能なネイティブボタン
- ユーザープロファイル別のログイン状態保持
- リアルタイム勤務時間表示

## 技術スタック

### 実装済み環境
- **フレームワーク**: Electron 37.2.0
- **言語**: TypeScript 5.8.3
- **UI Framework**: React 19.1.0 + Tailwind CSS 4.1.11
- **ビルドツール**: Vite 5.4.19
- **開発支援**: concurrently, electron-builder

### 主要な依存関係
```json
{
  "dependencies": {
    "electron": "^37.2.0",
    "react": "^19.1.0",
    "react-dom": "^19.1.0"
  },
  "devDependencies": {
    "@types/node": "^24.0.10",
    "@types/react": "^19.1.8",
    "@types/react-dom": "^19.1.6",
    "@vitejs/plugin-react": "^4.6.0",
    "@tailwindcss/postcss": "^4.1.11",
    "autoprefixer": "^10.4.21",
    "concurrently": "^9.2.0",
    "electron-builder": "^26.0.12",
    "tailwindcss": "^4.1.11",
    "typescript": "^5.8.3",
    "vite": "^5.4.19"
  }
}
```

## 機能要件

### 1. WebView表示機能 ✅実装済み
- freeeの打刻画面を`<webview>`タグで表示
- Cookie/セッション情報の永続化
- Chromeライクなユーザーエージェント設定

### 2. ネイティブ打刻ボタン ✅実装済み
- 勤務開始ボタン
- 勤務終了ボタン
- 休憩開始ボタン
- 休憩終了ボタン
- JavaScript実行による打刻処理

### 3. 勤務時間表示機能 ✅実装済み
- 本日の勤務時間をリアルタイム表示
- 勤務開始からの経過時間を自動更新（1秒ごと）
- useTimeTracker hookによる状態管理

### 4. ウィンドウ管理 ✅実装済み
- 常に最前面表示（Always on Top）
- 固定サイズ（500x500px）
- カスタムタイトルバー
- 開発者ツールとリロードボタン

### 5. 認証・プロファイル管理 ✅実装済み
- ユーザープロファイル別のセッション管理
- 設定ファイル（config.json）による動的プロファイル設定
- 永続化パーティションによるログイン状態保持

## 設定ファイル管理

### config.json構造
```json
{
  "user": {
    "email": "ken.kobayashi@precena.com",
    "profile": "ken.kobayashi@precena.com"
  },
  "app": {
    "window": {
      "width": 500,
      "height": 500,
      "alwaysOnTop": true
    },
    "freee": {
      "url": "https://p.secure.freee.co.jp/#"
    }
  }
}
```

### マルチユーザー対応
- `config.json`の`user.profile`を変更することで異なるユーザーで利用可能
- パーティション名: `persist:freee-{user.profile}`
- 各ユーザーのログイン状態が独立して保持される

## UI/UXデザイン

### 実装済みレイアウト
```
┌─────────────────────────────────┐
│  freee打刻    🔧 🔄            │ (500x500px)
├─────────────────────────────────┤
│  本日の勤務時間: 00:00:00 ⚫    │
├─────────────────────────────────┤
│                                 │
│         WebView                 │
│     (freee打刻画面)             │
│                                 │
│                                 │
├─────────────────────────────────┤
│  [勤務開始] [勤務終了]          │
│  [休憩開始] [休憩終了]          │
└─────────────────────────────────┘
```

### ウィンドウ仕様
- サイズ: 500x500px（設定ファイルで変更可能）
- 表示: 常に最前面（設定ファイルで変更可能）
- フレーム: hiddenInsetスタイル
- ボタン: 開発者ツール、リロード

## ディレクトリ構成

```
freee-webview-app/
├── config.json            # ユーザー設定ファイル
├── src/
│   ├── main/              # Electronメインプロセス
│   │   ├── index.ts       # メインエントリーポイント
│   │   ├── auth.ts        # 認証管理（未使用）
│   │   └── config.ts      # 設定ファイル管理
│   ├── renderer/          # レンダラープロセス（React）
│   │   ├── App.tsx        # メインアプリコンポーネント
│   │   ├── components/
│   │   │   ├── WebView.tsx         # WebView表示
│   │   │   ├── ControlPanel.tsx    # 打刻ボタンパネル
│   │   │   ├── WorkingTimeDisplay.tsx # 勤務時間表示
│   │   │   └── LoginButton.tsx     # ログインボタン（未使用）
│   │   ├── hooks/
│   │   │   └── useTimeTracker.ts   # 勤務時間管理Hook
│   │   ├── main.tsx       # Reactエントリーポイント
│   │   └── index.css      # Tailwind CSSスタイル
│   ├── preload/           # プリロードスクリプト
│   │   └── index.ts       # IPC API定義
│   └── types/
│       └── electron.d.ts  # TypeScript型定義
├── index.html             # HTMLテンプレート
├── package.json
├── tsconfig.json
├── tsconfig.electron.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
└── electron-builder.yml
```

## 実装計画

### Phase 1: 基本セットアップ ✅完了
1. **環境構築** ✅
   - Electron + React + TypeScript環境
   - Vite開発サーバー + Tailwind CSS
   - concurrent開発環境

2. **ウィンドウ表示** ✅
   - 500x500px固定サイズ
   - 常に最前面表示
   - カスタムタイトルバー

3. **WebViewコンポーネント** ✅
   - freee打刻画面表示
   - Chrome風ユーザーエージェント
   - 動的プロファイル設定

4. **設定ファイル管理** ✅
   - config.json による設定管理
   - ConfigManagerクラス
   - マルチユーザー対応

### Phase 2: 打刻機能実装 🚧進行中
1. WebView内でのJavaScript実行
2. 4つの打刻ボタンの実装
3. 打刻結果のフィードバック

### Phase 3: 勤務時間機能 ✅部分実装
1. 勤務時間計測ロジック ✅
2. リアルタイム表示 ✅
3. データの永続化 🚧

### Phase 4: 改善と配布準備
1. エラーハンドリング
2. 自動アップデート機能
3. インストーラー作成

## 実装例

### 設定管理 (main/config.ts)
```typescript
export class ConfigManager {
  private config: AppConfig = defaultConfig;
  private configPath: string;

  getPartitionName(): string {
    return `persist:freee-${this.config.user.profile}`;
  }

  getFreeeUrl(): string {
    return this.config.app.freee.url;
  }

  getWindowConfig() {
    return this.config.app.window;
  }
}
```

### WebView動的設定 (renderer/components/WebView.tsx)
```typescript
export const WebView = forwardRef<WebViewHandle, WebViewProps>(({ onReady }, ref) => {
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    window.electronAPI.getConfig().then(setConfig);
  }, []);

  const partitionName = `persist:freee-${config.user.profile}`;

  return (
    <webview
      ref={webviewRef}
      className="w-full h-full"
      partition={partitionName}
      webpreferences="contextIsolation=false"
    />
  );
});
```

### 打刻処理実装
```typescript
const handleClockIn = (type: 'start' | 'end' | 'break-start' | 'break-end') => {
  if (!webviewRef.current) return;

  const scripts = {
    'start': `document.querySelector('[data-action="clock_in"]')?.click()`,
    'end': `document.querySelector('[data-action="clock_out"]')?.click()`,
    'break-start': `document.querySelector('[data-action="break_begin"]')?.click()`,
    'break-end': `document.querySelector('[data-action="break_end"]')?.click()`
  };

  webviewRef.current.executeJavaScript(scripts[type])
    .then(() => {
      if (type === 'start') startWork();
      else if (type === 'end') endWork();
    })
    .catch(console.error);
};
```

## セキュリティ考慮事項

### 実装済みセキュリティ機能
- contextIsolation: true（メインプロセス）
- nodeIntegration: false
- webviewTag サンドボックス化
- 永続化パーティションによる認証情報隔離
- Chromeライクなセキュリティポリシー

## 開発コマンド

```bash
# 開発サーバー起動
npm run dev

# プロダクションビルド
npm run build

# 配布パッケージ作成
npm run dist:mac
npm run dist:win
npm run dist:linux
```

## 使用方法

### 初回セットアップ
1. `config.json`でユーザープロファイルを設定
2. `npm run dev`で開発サーバー起動
3. WebView内でfreeeにログイン

### マルチユーザー設定
```json
{
  "user": {
    "email": "your.email@company.com",
    "profile": "your.email@company.com"
  }
}
```

### 操作方法
- 右上の🔧ボタン: WebView開発者ツール
- 右上の🔄ボタン: WebView再読み込み
- 下部の4つのボタン: 各種打刻操作

## 今後の拡張案

### 追加機能候補
- 打刻リマインダー通知
- 月次勤務時間レポート
- ショートカットキー対応
- 設定UI画面
- 複数アカウント同時利用