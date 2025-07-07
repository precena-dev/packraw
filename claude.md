# freee打刻デスクトップアプリ仕様書

## プロジェクト概要

### アプリ名
freee Desktop Kintai

### 目的
freeeの勤怠打刻をデスクトップから素早く行えるようにし、打刻忘れを防ぎ、業務効率を向上させる。

### 主な機能
- **APIモード**: freee APIを使用したネイティブ打刻機能
- **WebViewモード**: freeeの打刻画面をWebViewで常駐表示
- ワンクリックで打刻可能なネイティブボタン
- OAuth2.0認証によるセキュアなAPI連携
- リアルタイム勤務時間表示とデータ取得
- refreshTokenの90日有効期限管理

## 技術スタック

### 実装済み環境
- **フレームワーク**: Electron 37.2.0
- **言語**: TypeScript 5.8.3
- **UI Framework**: React 19.1.0 + Tailwind CSS 4.1.11
- **ビルドツール**: Vite 5.4.19
- **HTTP Client**: axios 1.10.0
- **開発支援**: concurrently, electron-builder

### 主要な依存関係
```json
{
  "dependencies": {
    "axios": "^1.10.0",
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

### 1. freee API連携機能 ✅実装済み
- OAuth2.0による認証フロー
- freee人事労務APIとの統合
- 打刻API（勤務開始/終了、休憩開始/終了）
- 勤務記録取得API
- アクセストークンの自動更新機能
- refreshTokenの90日有効期限管理

### 2. WebView表示機能 ✅実装済み（従来モード）
- freeeの打刻画面を`<webview>`タグで表示
- Cookie/セッション情報の永続化
- Chromeライクなユーザーエージェント設定

### 3. ネイティブ打刻ボタン ✅実装済み
- **APIモード**: freee APIを直接呼び出し
  - 勤務開始（clock_in）
  - 勤務終了（clock_out）
  - 休憩開始（break_begin）
  - 休憩終了（break_end）
- **WebViewモード**: JavaScript実行による打刻処理

### 4. 勤務時間表示機能 ✅実装済み
- 本日の勤務時間をリアルタイム表示
- 勤務開始からの経過時間を自動更新（1秒ごと）
- APIモード: freee APIから実際の勤務記録を取得
- useTimeTracker hookによる状態管理

### 5. ウィンドウ管理 ✅実装済み
- 常に最前面表示（Always on Top）
- 固定サイズ（500x500px）
- カスタムタイトルバー
- 開発者ツールとリロードボタン

### 6. 認証・プロファイル管理 ✅実装済み
- **APIモード**: OAuth2.0認証によるセキュアなAPI連携
- **WebViewモード**: ユーザープロファイル別のセッション管理
- 設定ファイル（config.json）による動的プロファイル設定
- 永続化パーティションによるログイン状態保持

## 設定ファイル管理

### config.json構造（APIモード対応）
```json
{
  "user": {
    "email": "user@example.com",
    "profile": "user@example.com"
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
  },
  "api": {
    "clientId": "YOUR_CLIENT_ID",
    "clientSecret": "YOUR_CLIENT_SECRET",
    "redirectUri": "http://localhost:3000/callback",
    "companyId": 12345,
    "employeeId": 67890,
    "accessToken": "AUTO_GENERATED",
    "refreshToken": "AUTO_GENERATED",
    "refreshTokenExpiresAt": "2025-04-01T00:00:00.000Z"
  }
}
```

### 動作モード切り替え
- **APIモード**: `config.json`に`api`設定がある場合
- **WebViewモード**: `api`設定がない場合（従来の動作）

### マルチユーザー対応
- `config.json`の`user.profile`を変更することで異なるユーザーで利用可能
- パーティション名: `persist:freee-{user.profile}`
- 各ユーザーのログイン状態とAPIトークンが独立して保持される

## freee API認証設定

### 1. freee開発者アカウントでのアプリケーション作成
1. [freee Developers](https://developer.freee.co.jp/)にアクセス
2. 「新規アプリケーション作成」
3. 必要な情報を入力：
   - アプリケーション名: "freee Desktop Kintai"
   - 利用API: 「人事労務API」
   - リダイレクトURI: `http://localhost:3000/callback`
   - スコープ: 
     - `hr:employees:me:read`
     - `hr:employees:me:time_clocks:write`
     - `hr:employees:me:work_records:read`

### 2. 取得した認証情報の設定
```json
{
  "api": {
    "clientId": "取得したClient ID",
    "clientSecret": "取得したClient Secret",
    "redirectUri": "http://localhost:3000/callback",
    "companyId": 事業所ID
  }
}
```

### 3. トークン有効期限
- **アクセストークン**: 6時間（21,600秒）
- **リフレッシュトークン**: 90日間
- アプリケーションが自動的にトークンを更新・管理

## UI/UXデザイン

### APIモードレイアウト
```
┌─────────────────────────────────┐
│  freee勤怠管理    user@xxx.com  │ (500x500px)
├─────────────────────────────────┤
│  本日の勤務時間: 08:30:45 🟢    │
├─────────────────────────────────┤
│                                 │
│         [🏢 勤務開始]           │
│         [🏠 勤務終了]           │
│                                 │
│         [☕ 休憩開始]           │
│         [💼 休憩終了]           │
│                                 │
├─────────────────────────────────┤
│  ステータス: 認証済み           │
└─────────────────────────────────┘
```

### WebViewモードレイアウト（従来）
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

## ディレクトリ構成

```
freee-webview-app/
├── config.json            # ユーザー設定ファイル（.gitignoreに含む）
├── config.sample.json     # 設定ファイルテンプレート
├── .vscode/
│   └── settings.json      # VS Code設定（スペルチェック等）
├── src/
│   ├── main/              # Electronメインプロセス
│   │   ├── index.ts       # メインエントリーポイント
│   │   ├── config.ts      # 設定ファイル管理
│   │   └── freeeApi.ts    # freee API連携サービス
│   ├── renderer/          # レンダラープロセス（React）
│   │   ├── App.tsx        # メインアプリコンポーネント
│   │   ├── components/
│   │   │   ├── ApiModePanel.tsx    # APIモード用UI
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

### Phase 2: freee API連携機能 ✅完了
1. **OAuth2.0認証** ✅
   - freee開発者アカウント連携
   - 認証フロー実装
   - トークン管理

2. **API連携サービス** ✅
   - FreeeApiServiceクラス
   - 打刻API連携
   - 勤務記録取得API

3. **トークン管理** ✅
   - アクセストークン自動更新
   - refreshToken 90日有効期限管理
   - 期限切れ時の再認証フロー

4. **ネイティブUI** ✅
   - ApiModePanelコンポーネント
   - 動作モード自動切り替え
   - エラーハンドリング

### Phase 3: 勤務時間機能 ✅完了
1. 勤務時間計測ロジック ✅
2. リアルタイム表示 ✅
3. API連携による実データ取得 ✅

### Phase 4: 最適化・改善 🚧進行中
1. エラーハンドリングの強化
2. ユーザビリティ向上
3. 自動アップデート機能
4. インストーラー作成

## 実装例

### freee API認証フロー (main/freeeApi.ts)
```typescript
export class FreeeApiService {
  private config: FreeeConfig;

  async authorize(): Promise<string> {
    const authUrl = this.getAuthorizationUrl();
    // OAuth認証ウィンドウを開く
    const authWindow = new BrowserWindow({...});
    // 認証コードを取得してトークンに交換
    await this.exchangeCodeForToken(code);
    // 90日後の有効期限を設定
    this.config.refreshTokenExpiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
  }

  async timeClock(type: 'clock_in' | 'clock_out' | 'break_begin' | 'break_end'): Promise<any> {
    const response = await this.axiosInstance.post(
      `/hr/api/v1/employees/${this.config.employeeId}/time_clocks`,
      {
        company_id: this.config.companyId,
        type,
        base_date: new Date().toISOString().split('T')[0],
        datetime: new Date().toISOString(),
      }
    );
    return response.data;
  }
}
```

### APIモード用UIコンポーネント (renderer/components/ApiModePanel.tsx)
```typescript
export const ApiModePanel: React.FC = () => {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const { workingTime, isWorking, startWork, endWork } = useTimeTracker();

  const handleTimeClock = async (type: 'clock_in' | 'clock_out' | 'break_begin' | 'break_end') => {
    await window.electronAPI.freeeApi.timeClock(type);
    if (type === 'clock_in') startWork();
    else if (type === 'clock_out') endWork();
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      <button onClick={() => handleTimeClock('clock_in')}>
        勤務開始
      </button>
      {/* その他のボタン */}
    </div>
  );
};
```

### 動作モード自動切り替え (renderer/App.tsx)
```typescript
function App() {
  const [useApiMode, setUseApiMode] = useState(false);

  useEffect(() => {
    window.electronAPI.getConfig().then(config => {
      if (config.api) {
        setUseApiMode(true);
      }
    });
  }, []);

  if (useApiMode) {
    return <ApiModePanel />;
  }

  return (
    // WebViewモードのUI
  );
}
```

## セキュリティ考慮事項

### 実装済みセキュリティ機能
- OAuth2.0による認証
- アクセストークンの6時間有効期限
- refreshTokenの90日有効期限管理
- Client Secretの設定ファイル分離（.gitignoreに追加）
- contextIsolation: true（メインプロセス）
- nodeIntegration: false
- webviewTag サンドボックス化
- 永続化パーティションによる認証情報隔離

### セキュリティ推奨事項
- config.jsonをバージョン管理から除外
- 本番環境では環境変数を使用してClient Secretを管理
- 定期的なrefreshTokenの更新確認

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

# TypeScript型チェック
npx tsc --noEmit
```

## 使用方法

### 初回セットアップ（APIモード）

1. **freee開発者アカウントでアプリケーション作成**
   - [freee Developers](https://developer.freee.co.jp/)でアプリ登録
   - Client IDとClient Secretを取得

2. **設定ファイル作成**
   ```bash
   cp config.sample.json config.json
   ```

3. **認証情報設定**
   ```json
   {
     "api": {
       "clientId": "YOUR_CLIENT_ID",
       "clientSecret": "YOUR_CLIENT_SECRET",
       "redirectUri": "http://localhost:3000/callback",
       "companyId": YOUR_COMPANY_ID
     }
   }
   ```

4. **アプリケーション起動**
   ```bash
   npm run dev
   ```

5. **freee認証**
   - 「freeeにログイン」ボタンをクリック
   - freeeの認証画面で許可
   - 自動的に従業員情報とトークンが保存される

### 初回セットアップ（WebViewモード）

1. **設定ファイル作成**
   ```bash
   cp config.sample.json config.json
   ```

2. **api設定を削除またはコメントアウト**
   ```json
   {
     "user": {
       "email": "your.email@company.com",
       "profile": "your.email@company.com"
     }
   }
   ```

3. **アプリケーション起動**
   ```bash
   npm run dev
   ```

4. **WebView内でfreeeにログイン**

### 操作方法

#### APIモード
- 4つの打刻ボタンで直接API経由で打刻
- リアルタイム勤務時間表示
- 認証状態とrefreshToken期限の表示

#### WebViewモード
- 右上の🔧ボタン: WebView開発者ツール
- 右上の🔄ボタン: WebView再読み込み
- 下部の4つのボタン: JavaScript経由での打刻操作

## トラブルシューティング

### よくある問題

1. **「API service not initialized」エラー**
   - config.jsonのapi設定を確認
   - Client IDとClient Secretが正しく設定されているか確認

2. **「リフレッシュトークンの有効期限が切れています」エラー**
   - 90日以上経過している場合は再認証が必要
   - 「freeeにログイン」ボタンで再認証

3. **打刻が失敗する**
   - 事業所ID（companyId）が正しく設定されているか確認
   - 従業員IDが正しく取得されているか確認
   - freee側の勤怠設定を確認

## 今後の拡張案

### 追加機能候補
- refreshToken期限の3日前からの警告通知
- 打刻リマインダー通知
- 月次勤務時間レポート
- ショートカットキー対応
- 設定UI画面
- 複数アカウント同時利用
- freee以外の勤怠システムとの連携