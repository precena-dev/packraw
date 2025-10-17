# PackRaw (パクロー) - freee打刻デスクトップアプリ仕様書

## プロジェクト概要

### アプリ名
PackRaw (パクロー)

### 目的
freeeの勤怠打刻をデスクトップから素早く行えるようにし、打刻忘れを防ぎ、業務効率を向上させる。

### 主な機能
- freee APIを使用したネイティブ打刻機能
- ワンクリックで打刻可能なネイティブボタン
- OAuth2.0認証によるセキュアなAPI連携
- リアルタイム勤務時間表示とデータ取得
- refreshTokenの90日有効期限管理
- 打刻履歴の表示
- 打刻ボタンの有効/無効制御
- **勤怠記録編集機能（出勤・退勤・休憩時間）** ⭐NEW
- 日付選択による過去・未来の勤怠記録表示
- システムトレイ統合
- PCイベント検知（PowerMonitor）
- 設定画面（SettingsModal）

### プロジェクトステータス
✅ **v2.0 機能拡張完了** (2025-10-17)
- 全ての主要機能が実装完了
- freee API連携による安定した動作を確認
- プロダクションビルドとパッケージ化対応済み
- **新機能**: 勤怠記録編集機能（出勤・退勤・休憩時間）
- **最適化**: API呼び出し40%削減でレスポンス速度改善

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
    "electron-store": "^10.0.0",
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
    "vite": "^5.4.19",
    "vitest": "^3.1.0"
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

### 2. ネイティブ打刻ボタン ✅実装済み
- freee APIを直接呼び出し
  - 勤務開始（clock_in）
  - 勤務終了（clock_out）
  - 休憩開始（break_begin）
  - 休憩終了（break_end）
- 打刻状態に応じたボタンの有効/無効制御

### 3. 勤務時間表示機能 ✅実装済み
- 本日の勤務時間をリアルタイム表示
- 勤務開始からの経過時間を自動更新（1秒ごと）
- freee APIから実際の勤務記録を取得

### 4. 打刻履歴表示機能 ✅実装済み
- 本日の打刻履歴を時系列で表示
- 打刻タイプ（勤務開始/終了、休憩開始/終了）とアイコン表示
- 日本時間（JST）での時刻表示

### 5. ウィンドウ管理 ✅実装済み
- 常に最前面表示（Always on Top）
- 可変サイズ（デフォルト500x500px、リサイズ可能）
- ウィンドウ移動
- システムトレイ統合（最小化時）

### 6. 認証・プロファイル管理 ✅実装済み
- OAuth2.0認証によるセキュアなAPI連携
- 設定ファイル（config.json）による動的プロファイル設定
- 従業員情報の自動取得と保存
- electron-storeによる永続的な設定保存

### 7. PCイベント連携 ✅実装済み
- PowerMonitorサービスによるシステムイベント検知
- 画面ロック/アンロック、スリープ/復帰の監視
- 将来的な自動打刻機能への対応準備

### 8. 設定UI ✅実装済み
- SettingsModalコンポーネントによる設定画面
- 通知設定などのカスタマイズ対応

### 9. 勤怠記録編集機能 ✅実装済み (2025-10-17)
- 出勤・退勤時刻の編集機能
  - EditClockTimeModalコンポーネント
  - 鉛筆アイコンからの編集UI
  - 時刻入力バリデーション（HH:MM形式）
  - 二重送信防止機能
- 休憩時間の編集機能
  - EditBreakModalコンポーネント
  - 休憩開始・終了時刻の個別編集
- 休憩時間の追加・削除機能
  - AddBreakModalコンポーネント
  - 複数休憩時間の管理
  - 削除時の確認ダイアログ
- 日付選択機能
  - 過去・未来の日付の勤怠記録表示
  - 日付ごとの勤怠記録編集
  - 選択日付に応じた適切なAPI呼び出し最適化
- パフォーマンス最適化
  - 不要なAPI呼び出しの削減（40%削減達成）
  - 過去日編集時のボタン状態更新スキップ
  - レスポンス速度の改善

## 設定ファイル管理

### config.json構造
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

### マルチユーザー対応
- `config.json`の`user.profile`を変更することで異なるユーザーで利用可能
- 各ユーザーのAPIトークンが独立して保持される

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

### 現在のレイアウト
```
┌─────────────────────────────────┐
│  PackRaw         user@xxx.com  │ (デフォルト500x500px)
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
│  本日の打刻履歴                │
│  09:00 🏢 勤務開始             │
│  12:00 ☕ 休憩開始             │
│  13:00 💼 休憩終了             │
│                                 │
├─────────────────────────────────┤
│  ステータス: 認証済み           │
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
│   │   │   ├── ApiModePanel.tsx     # APIモード用UI
│   │   │   ├── WorkTimeSection.tsx  # 打刻ボタンセクション
│   │   │   ├── WorkingTimeDisplay.tsx # 勤務時間表示
│   │   │   ├── TimeClockHistory.tsx # 打刻履歴表示
│   │   │   ├── SettingsModal.tsx    # 設定モーダル
│   │   │   ├── EditBreakModal.tsx   # 休憩時間編集モーダル
│   │   │   ├── AddBreakModal.tsx    # 休憩時間追加モーダル
│   │   │   └── EditClockTimeModal.tsx # 出勤・退勤時刻編集モーダル
│   │   ├── main.tsx       # Reactエントリーポイント
│   │   └── index.css      # Tailwind CSSスタイル
│   ├── preload/           # プリロードスクリプト
│   │   └── index.ts       # IPC API定義
│   ├── test/              # テストファイル
│   │   ├── freeeApi.test.ts         # ユニットテスト
│   │   └── freeeApi.integration.test.ts # 統合テスト
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

3. **設定ファイル管理** ✅
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
   - 日本時間（JST）対応

3. **トークン管理** ✅
   - アクセストークン自動更新
   - refreshToken 90日有効期限管理
   - 期限切れ時の再認証フロー

4. **ネイティブUI** ✅
   - ApiModePanelコンポーネント
   - エラーハンドリング

### Phase 3: 勤務時間・打刻履歴機能 ✅完了
1. 勤務時間計測ロジック ✅
2. リアルタイム表示 ✅
3. API連携による実データ取得 ✅
4. 打刻履歴表示 ✅
5. 打刻ボタン状態制御 ✅

### Phase 4: WebViewモード削除 ✅完了
1. WebViewコンポーネント削除 ✅
2. ControlPanelコンポーネント削除 ✅
3. useTimeTrackerフック削除 ✅
4. WebView関連設定削除 ✅
5. APIモード専用化 ✅

### Phase 5: 勤怠記録編集機能 ✅完了 (2025-10-17)
1. **出勤・退勤時刻編集** ✅
   - EditClockTimeModalコンポーネント作成
   - 時刻入力バリデーション
   - 鉛筆アイコンUI実装
   - 二重送信防止機能

2. **休憩時間編集** ✅
   - EditBreakModalコンポーネント
   - 休憩開始・終了時刻の個別編集
   - 既存休憩記録の保持

3. **休憩時間追加・削除** ✅
   - AddBreakModalコンポーネント
   - 複数休憩時間の管理
   - 削除確認ダイアログ

4. **日付選択機能** ✅
   - 過去・未来の日付の勤怠記録表示
   - 日付ごとの編集機能
   - getWorkRecord(date) IPCメソッド追加

5. **パフォーマンス最適化** ✅
   - 不要なAPI呼び出し削減（40%削減）
   - 過去日編集時のボタン状態更新スキップ
   - getTodayWorkRecord()ログ出力削除

### Phase 6: 次の実装予定 📋計画中

#### 1. カレンダーUI機能 🔄予定
- **日付選択カレンダーモーダル**
  - カレンダービューから日付を選択可能に
  - 月間カレンダー表示
  - 勤怠記録がある日付のハイライト表示
  - 前月・次月への移動
  - 今日に戻るボタン

#### 2. 休憩打刻予約機能 🔄予定
- **自動休憩打刻機能**
  - デフォルト設定: 12:00〜13:00
  - 指定時刻に自動で休憩開始/終了を打刻
  - ランダム誤差機能
    - 打刻時刻に±数分のランダムなゆらぎ
    - 毎日異なるタイミングで自動打刻
  - 設定画面での管理
    - 休憩開始予約時間の変更
    - 休憩終了予約時間の変更
    - 予約機能のオン/オフ切り替え
    - ランダム誤差の範囲設定（例: ±5分）
  - 実装方針
    - setIntervalによる時刻監視
    - 設定時刻に達したら自動的にtimeClock('break_begin')を呼び出し
    - 予約状態の表示（次の予約: 12:00 休憩開始）
    - 予約キャンセル機能

#### 3. その他の拡張機能
- **PCイベント連携**
  - 画面ロック/アンロック検知
  - スリープ/復帰検知

- **システム統合**
  - タスクトレイアイコン対応
  - タスクバー格納機能
  - ショートカットキー対応

- **ユーザビリティ向上**
  - 打刻リマインダー通知
  - refreshToken期限警告

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
    const now = new Date();
    const response = await this.axiosInstance.post(
      `/hr/api/v1/employees/${this.config.employeeId}/time_clocks`,
      {
        company_id: this.config.companyId,
        type,
        base_date: this.getJSTDate(now), // 日本時間での日付
      }
    );
    return response.data;
  }

  private getJSTDate(date: Date = new Date()): string {
    // UTCから日本時間（UTC+9）への変換
    const utcTime = date.getTime();
    const jstTime = new Date(utcTime + 9 * 60 * 60 * 1000);
    return jstTime.toISOString().split('T')[0];
  }
}
```

### APIモード用UIコンポーネント (renderer/components/ApiModePanel.tsx)
```typescript
export const ApiModePanel: React.FC = () => {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [buttonStates, setButtonStates] = useState<TimeClockButtonState>({
    clockIn: true,
    clockOut: false,
    breakBegin: false,
    breakEnd: false
  });
  const [todayTimeClocks, setTodayTimeClocks] = useState<any[]>([]);

  const updateTodayTimeClocks = async () => {
    // 日本時間での今日の日付を取得
    const now = new Date();
    const jstTime = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const today = jstTime.toISOString().split('T')[0];
    const timeClocks = await window.electronAPI.freeeApi.getTimeClocks(today, today);
    setTodayTimeClocks(timeClocks);
  };

  const handleTimeClock = async (type: 'clock_in' | 'clock_out' | 'break_begin' | 'break_end') => {
    await window.electronAPI.freeeApi.timeClock(type);
    // 打刻後にボタン状態と打刻履歴を更新
    await updateButtonStates();
    await updateTodayTimeClocks();
  };

  return (
    <div className="h-full flex flex-col bg-blue-50">
      <WorkingTimeDisplay 
        employeeInfo={employeeInfo}
        todayTimeClocks={todayTimeClocks}
      />
      <WorkTimeSection
        loading={loading}
        buttonStates={buttonStates}
        onTimeClock={handleTimeClock}
      />
      <TimeClockHistory todayTimeClocks={todayTimeClocks} />
    </div>
  );
};
```

### アプリケーションメイン (renderer/App.tsx)
```typescript
function App() {
  return <ApiModePanel />;
}
```

### 勤怠記録編集機能の実装 (2025-10-17追加)

#### 出勤・退勤時刻編集 (renderer/components/EditClockTimeModal.tsx)
```typescript
export const EditClockTimeModal: React.FC<Props> = ({ clockData, type, onSave, onCancel }) => {
  const [time, setTime] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (clockData?.datetime) {
      const date = new Date(clockData.datetime);
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      setTime(`${hours}:${minutes}`);
    }
  }, [clockData]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(time);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal">
      <h2>{type === 'clock_in' ? '出勤時刻を修正' : '退勤時刻を修正'}</h2>
      <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
      <button onClick={handleSave} disabled={saving}>保存</button>
      <button onClick={onCancel} disabled={saving}>キャンセル</button>
    </div>
  );
};
```

#### 勤怠記録更新API (main/freeeApi.ts)
```typescript
async updateWorkRecord(
  date: string,
  breakRecords: Array<{ clock_in_at: string; clock_out_at: string }>,
  clockInAt?: string,  // 出勤時刻（オプション）
  clockOutAt?: string | null  // 退勤時刻（オプション）
): Promise<any> {
  const currentRecord = await this.getWorkRecord(date);

  const requestBody: any = {
    company_id: this.config.companyId,
    break_records: formattedBreakRecords,
    // clockInAtが指定されていればそれを使用、なければ現在の値
    clock_in_at: clockInAt
      ? this.formatTimeToHHmm(clockInAt)
      : this.formatTimeToHHmm(currentRecord.clockInAt!),
  };

  // clockOutAtの処理
  if (clockOutAt !== undefined) {
    if (clockOutAt !== null) {
      requestBody.clock_out_at = this.formatTimeToHHmm(clockOutAt);
    }
  } else if (currentRecord.clockOutAt) {
    requestBody.clock_out_at = this.formatTimeToHHmm(currentRecord.clockOutAt);
  }

  const response = await this.axiosInstance.put(
    `/hr/api/v1/employees/${this.config.employeeId}/work_records/${date}`,
    requestBody
  );

  return response.data;
}
```

#### パフォーマンス最適化 (renderer/components/ApiModePanel.tsx)
```typescript
const handleSaveClockTime = async (time: string) => {
  // 選択された日付の勤怠記録を取得
  const currentWorkRecord = await window.electronAPI.freeeApi.getWorkRecord(dateString);

  // work_recordsを更新
  if (editingClockTime.type === 'clock_in') {
    await window.electronAPI.freeeApi.updateWorkRecord(dateString, breakRecords, newDateTime);
  } else {
    await window.electronAPI.freeeApi.updateWorkRecord(dateString, breakRecords, undefined, newDateTime);
  }

  // 画面全体をリフレッシュ
  await updateTimeClocks(selectedDate);

  // 今日の日付を編集した場合のみボタン状態を更新（API呼び出し削減）
  if (isToday) {
    await updateButtonStates();
  }
};
```

## セキュリティ考慮事項

### 実装済みセキュリティ機能
- OAuth2.0による認証
- アクセストークンの6時間有効期限
- refreshTokenの90日有効期限管理
- Client Secretの設定ファイル分離（.gitignoreに追加）
- contextIsolation: true（メインプロセス）
- nodeIntegration: false

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

# テスト実行
npm test

# 実際のAPIを使用したテスト（設定ファイル必要）
TEST_REAL_API=true npm test
```

## 使用方法

### 初回セットアップ

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

### 操作方法

- 4つの打刻ボタンで直接API経由で打刻
- リアルタイム勤務時間表示
- 本日の打刻履歴表示
- 認証状態とrefreshToken期限の表示
- 打刻状態に応じたボタンの有効/無効制御

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

4. **時刻がずれて表示される**
   - アプリケーションは日本時間（JST）で動作
   - PCのタイムゾーン設定を確認

## テストフレームワーク

### Vitestによるテスト環境
- ユニットテストと統合テストの分離
- カバレッジレポートの生成
- モックを使用したテストと実際のAPIテストの切り替え

