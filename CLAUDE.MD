# PackRaw (パクロー) - freee打刻デスクトップアプリ仕様書

## 開発ルール

### Git コミットポリシー
- **重要**: Claude Codeは勝手にコミットを作成しないこと
- コミットはユーザーが明示的に指示した場合のみ実行する
- 修正内容を説明し、ユーザーの確認を得てからコミットする

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
- **勤怠記録編集機能（出勤・退勤・休憩時間）**
- **休憩打刻予約機能（時刻指定・ランダム誤差）** ⭐NEW
- **自動出勤・退勤機能（起動時・シャットダウン時）** ⭐NEW
- 日付選択による過去・未来の勤怠記録表示
- システムトレイ統合
- PCイベント検知（PowerMonitor）
- 設定画面（SettingsModal）
- **自動更新機能（electron-updater + GitHub Releases）** ⭐NEW

### プロジェクトステータス
✅ **v2.4 カレンダーUI機能完了** (2025-10-22)
- **カレンダーモーダル実装**:
  - 日付クリックでカレンダー表示
  - 月間カレンダービュー（月曜始まり、7x6グリッド）
  - 前月・次月への移動、今日に戻るボタン
  - 勤怠記録がある日付に緑のドット表示
  - モダンなUIデザイン（白背景、丸角、シャドウ）
- **ヘッダーレイアウト改善**:
  - 日付と勤務時間を中央揃え
  - 時刻を36pxに拡大表示
  - 「勤務時間」ラベルと時刻を横並び
- **PowerMonitor表示**:
  - システムイベント監視中を稲妻アイコンで表示
  - 休憩履歴セクションに配置

✅ **v2.3 UI/UX改善完了** (2025-10-22)
- **UI統一化**:
  - 出勤ボタン: 人アイコン + 「出勤」テキスト（履歴表示と統一）
  - 退勤ボタン: ドアアイコン + 「退勤」テキスト（履歴表示と統一）
  - 休憩予約表示: シンプルな時計アイコン（休憩履歴の+ボタンの左）
    - マウスホバーでツールチップ表示
    - 過去日選択時は非表示
    - アンバー色のパルスアニメーション
- **自動出勤条件の最適化**:
  - 初回起動時（lastType === null）のみ自動出勤
  - 前回退勤している場合は手動出勤を促す
  - シャットダウン時の処理フローを改善（finally で app.quit() 保証）

✅ **v2.2 自動出勤・退勤機能完了** (2025-10-20)
- 全ての主要機能が実装完了
- freee API連携による安定した動作を確認
- プロダクションビルドとパッケージ化対応済み
- **新機能**:
  - 休憩打刻予約機能（自動休憩打刻・ランダム誤差）
  - 自動出勤・退勤機能（アプリ起動時・PCシャットダウン時）
- **既存機能**: 勤怠記録編集機能（出勤・退勤・休憩時間）
- **最適化**: API呼び出し40%削減でレスポンス速度改善
- **UI改善**: 次回予約バナー、設定フィールドの無効化

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
    "electron-log": "^5.0.0",
    "electron-store": "^10.0.0",
    "electron-updater": "^6.1.0",
    "react": "^19.1.0",
    "react-dom": "^19.1.0"
  },
  "devDependencies": {
    "@electron/notarize": "^2.0.0",
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

### 10. 自動更新機能 📋計画中
- **electron-updater による自動更新**
  - GitHub Releases との連携
  - macOS/Windows/Linux 対応
  - バージョンチェックとダウンロード
  - 自動インストール（再起動時）
- **配布方式**
  - GitHub Releases を配布サーバーとして使用
  - 無料で帯域制限なし
  - CI/CD 統合（GitHub Actions）
- **コード署名**
  - macOS: Developer ID 証明書 + 公証（Notarization）
  - Windows: コード署名証明書（オプション）
  - セキュアな配布とインストール
- **更新チェックタイミング**
  - アプリ起動後5秒後に初回チェック
  - その後24時間ごとに定期チェック
  - 手動チェック機能
- **ユーザー体験**
  - 更新利用可能時にダイアログ通知
  - ダウンロード進捗表示
  - 再起動して更新を促すダイアログ
  - ダウングレード防止機能

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
│   │   ├── freeeApi.ts    # freee API連携サービス
│   │   └── updater.ts     # 自動更新サービス
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
├── build/                 # ビルド設定
│   ├── entitlements.mac.plist  # macOS entitlements（公証用）
│   ├── icon.icns          # macOSアイコン
│   └── icon.ico           # Windowsアイコン
├── scripts/               # ビルドスクリプト
│   └── notarize.js        # macOS公証スクリプト
├── .github/
│   └── workflows/
│       └── release.yml    # CI/CD自動リリース
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

### Phase 6: 休憩打刻予約機能 ✅完了 (2025-10-20)

#### 休憩打刻予約機能 ✅実装済み
- **自動休憩打刻機能**
  - デフォルト設定: 12:00〜13:00
  - 指定時刻に自動で休憩開始/終了を打刻
  - ランダム誤差機能
    - 打刻時刻に±数分のランダムなゆらぎ（デフォルト±5分）
    - 毎日異なるタイミングで自動打刻
  - 設定画面での管理
    - 休憩開始予約時間の変更
    - 休憩終了予約時間の変更
    - 予約機能のオン/オフ切り替え
    - ランダム誤差の範囲設定（0〜30分）
  - 実装内容
    - BreakSchedulerクラス（src/main/breakScheduler.ts）
    - setIntervalによる1分ごとの時刻監視
    - 設定時刻に達したら自動的にtimeClock()を呼び出し
    - 予約状態の表示（次の予約: 12:05 休憩開始）
    - 設定の永続化（config.jsonへの保存）
    - 日付変更時の自動スケジュール再生成
  - UI改善
    - 次回予約バナーは当日の予約のみ表示
    - 自動休憩打刻が無効時は時刻設定フィールドをdisabled化

### Phase 7: 自動出勤・退勤機能 ✅完了 (2025-10-20)

#### 自動出勤・退勤機能 ✅実装済み
- **アプリ起動時の自動出勤**
  - アプリ起動時に最後の打刻状態をチェック
  - 出勤していない場合（最後の打刻が退勤または打刻記録なし）に自動出勤
  - 設定でオン/オフ可能
  - freee API初期化後に自動実行

- **PCシャットダウン時の自動退勤**
  - Electronの`powerMonitor.on('shutdown')`イベントで検知
  - 退勤していない場合に自動退勤
  - シャットダウンを一時停止して打刻完了後に許可
  - 設定でオン/オフ可能

- **設定画面の追加**
  - 「自動出勤・退勤機能」セクション
  - アプリ起動時に自動出勤のトグル
  - PCシャットダウン時に自動退勤のトグル
  - 注意事項の表示

- **実装内容**
  - PowerMonitorServiceに自動出勤・退勤ロジック追加
  - ConfigManagerに設定管理メソッド追加
  - config.jsonに設定項目追加
  - 設定の永続化対応

### Phase 8: UI/UX改善 ✅完了 (2025-10-22)

#### 0. 自動出勤条件の最適化 ✅実装済み
- **変更内容**
  - 変更前: 最後の打刻が退勤（clock_out）または打刻記録なし（null）の場合に自動出勤
  - 変更後: 打刻記録なし（null）の場合のみ自動出勤（初回起動時のみ）

- **理由**
  - 前回正常に退勤している場合は、意図的に退勤している可能性が高い
  - 毎日のアプリ起動時に自動出勤されるのを防ぐ
  - より適切な自動化動作を実現

- **シャットダウン処理の改善**
  - `finally` ブロックで `app.quit()` を確実に実行
  - 自動退勤が失敗した場合でもアプリが適切に終了する

- **実装ファイル**
  - src/main/powerMonitor.ts (handleAutoClockInOnStartup メソッド)

#### 1. ボタンアイコンとテキストの統一 ✅実装済み
- **出勤ボタンの変更**
  - アイコン: 時計 → 人アイコン（出勤時間の行と統一）
  - テキスト: 「勤務開始」→「出勤」
  - src/renderer/components/WorkTimeSection.tsx で実装

- **退勤ボタンの変更**
  - アイコン: 時計 → ドアから出るアイコン（退勤時間の行と統一）
  - テキスト: 「勤務終了」→「退勤」
  - src/renderer/components/WorkTimeSection.tsx で実装

#### 2. 休憩予約表示のUI改善 ✅実装済み
- **位置の変更**
  - 変更前: ヘッダー部分に帯バナー表示
  - 変更後: 休憩履歴の「+」ボタンの左にシンプルなアイコン表示

- **アイコンの統一**
  - 時計SVGアイコン（編集・削除ボタンと同じスタイル）
  - 16x16pxサイズ
  - アンバー色（#f59e0b）で視認性を確保

- **インタラクション**
  - マウスホバーでツールチップ表示
    - 例: 「次の予約: 12:05 休憩開始」
  - ホバー時に拡大＋色が濃くなるエフェクト
  - パルスアニメーション（透明度の変化）

- **表示条件の最適化**
  - 今日の日付の場合のみ表示
  - 過去日・未来日選択時は非表示
  - 自動休憩打刻が有効で予約がある場合のみ表示

- **実装ファイル**
  - src/renderer/components/TimeClockHistory.tsx
  - src/renderer/components/ApiModePanel.tsx
  - src/renderer/index.css

#### 3. アイコン統一による視認性向上 ✅完了
- **人アイコン**: 出勤関連（出勤ボタン、出勤時間の行）
- **ドアアイコン**: 退勤関連（退勤ボタン、退勤時間の行）
- **時計アイコン**: 予約表示（休憩履歴セクション）
- **一時停止アイコン**: 休憩開始ボタン
- **再生アイコン**: 休憩終了ボタン
- **鉛筆アイコン**: 編集ボタン
- **ゴミ箱アイコン**: 削除ボタン
- **+アイコン**: 追加ボタン

### Phase 9: カレンダーUI機能 ✅完了 (2025-10-22)

#### 1. カレンダーモーダル機能 ✅実装済み
- **CalendarModalコンポーネント作成**
  - src/renderer/components/CalendarModal.tsx
  - モーダル形式のカレンダー表示
  - 月曜日始まりの7x6グリッドレイアウト

- **月間カレンダー表示**
  - 現在の月を中心に表示
  - 前月・次月の日付も表示（グレーアウト）
  - 曜日ヘッダー（月〜日）

- **日付選択機能**
  - 日付部分をクリックでカレンダーモーダルを開く
  - カレンダーから任意の日付を選択
  - 選択後、自動的にモーダルが閉じる
  - 未来日の選択は不可

- **ナビゲーション機能**
  - 前月・次月への移動ボタン
  - 「今日に戻る」ボタン
  - 「閉じる」ボタン

- **視覚的フィードバック**
  - 今日の日付: 青色テキストで強調
  - 選択中の日付: 青背景
  - 他の月の日付: グレーアウト
  - ホバーエフェクト: グレー背景

- **勤怠記録のハイライト表示** ✅実装済み
  - 過去30日分の打刻記録を取得
  - 勤怠記録がある日付に緑の小さなドット（●）表示
  - 選択中の日付の場合は白いドット
  - fetchDatesWithRecords() で日付リストを取得

- **スタイリング**
  - モダンな白背景のモーダル
  - 丸角（border-radius: 12px）
  - ドロップシャドウで浮き上がり効果
  - レスポンシブデザイン（max-width: 400px）

- **実装ファイル**
  - src/renderer/components/CalendarModal.tsx（新規作成）
  - src/renderer/components/WorkingTimeDisplay.tsx（カレンダー連携）
  - src/renderer/components/ApiModePanel.tsx（日付選択ハンドラー）
  - src/renderer/index.css（カレンダースタイル追加、約150行）

### Phase 10: 時間帯別自動退勤と土日制御機能 ✅完了 (2025-10-25)

#### 1. 時間帯別スリープ自動退勤機能 ✅実装済み
- **指定時刻以降の自動退勤**
  - デフォルト17:00以降にスリープ・サスペンドで自動退勤
  - 設定画面で時刻変更可能
  - シャットダウンは既存設定で制御（重複回避）

- **実装ファイル**
  - src/main/powerMonitor.ts（時間判定ロジック追加）
  - src/main/config.ts（autoClockOutAfterTime設定）
  - src/renderer/components/SettingsModal.tsx（設定UI追加）

#### 2. 土日打刻制御機能 ✅実装済み
- **デフォルトで土日打刻無効化**
  - 当日の打刻・編集のみ制限
  - 過去の土日記録は編集可能（休日出勤の修正対応）
  - 設定画面でON/OFF切り替え可能

- **設定の永続化**
  - デフォルト: ON（土日打刻無効）
  - OFFにした場合のみ設定ファイルに保存
  - 設定がない場合はデフォルトON

- **実装ファイル**
  - src/main/freeeApi.ts（isWeekend、isWeekendClockDisabled追加）
  - src/main/breakScheduler.ts（土日チェック追加）
  - src/main/powerMonitor.ts（起動時自動出勤の土日チェック）

#### 3. UI/UX改善 ✅実装済み
- **休憩時間設定の自動保存**
  - 保存ボタン削除、onBlurで自動保存
  - すべての時刻・数値設定が自動保存に統一

- **エラーメッセージの自動クリア**
  - 日付変更時にエラーメッセージを自動削除
  - handleDateChange、handleDateSelectに処理追加

### Phase 11: 自動更新機能 📋計画中

#### 概要
electron-updater + GitHub Releases を使用した自動更新機能の実装。無料で実装でき、macOS/Windows/Linux すべてに対応。

#### アーキテクチャ
```
開発者                     GitHub Releases                ユーザー
  │                              │                          │
  │ 1. コード修正                │                          │
  │ 2. バージョンアップ          │                          │
  │ 3. git tag v1.1.0           │                          │
  │ 4. git push origin v1.1.0   │                          │
  │                              │                          │
  ├──► GitHub Actions 実行       │                          │
  │    - macOS/Win/Linuxビルド   │                          │
  │    - latest.yml生成          │                          │
  │                              │                          │
  │────► 自動アップロード ────────►│                          │
  │                              │                          │
  │                              │  定期チェック（24h毎）    │
  │                              │◄──────────────────────────┤
  │                              │                          │
  │                              │  新バージョン発見         │
  │                              ├─────────────────────────►│
  │                              │  ダウンロード             │
  │                              │◄──────────────────────────┤
  │                              │                          │
  │                              │  インストール・再起動     │
  │                              │                          ✅
```

#### 実装手順

##### Phase 11-1: 基本実装（2-4時間、証明書なしテスト）
1. **パッケージ追加**
   ```bash
   npm install electron-updater electron-log --save
   ```

2. **AutoUpdaterService作成** (`src/main/updater.ts`)
   - 更新チェックロジック
   - ダウンロード処理
   - インストール処理
   - イベントハンドラー（update-available, download-progress, update-downloaded）
   - ユーザー通知ダイアログ

3. **メインプロセス統合** (`src/main/index.ts`)
   - AutoUpdaterServiceの初期化
   - アプリ起動5秒後に更新チェック
   - 24時間ごとの定期チェック

4. **electron-builder設定** (`electron-builder.yml`)
   ```yaml
   publish:
     - provider: github
       owner: precena-dev
       repo: packraw
       releaseType: release

   mac:
     target:
       - dmg
       - zip  # 自動更新に必須

   win:
     target:
       - nsis
   ```

5. **動作テスト**
   - 開発環境で動作確認
   - プロダクションビルドでテスト

##### Phase 11-2: macOS署名・公証（2-3時間 + 証明書取得）
1. **Apple Developer Program登録**
   - 費用: $99/年
   - Developer ID Application証明書取得

2. **Entitlements設定** (`build/entitlements.mac.plist`)
   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
   <plist version="1.0">
   <dict>
     <key>com.apple.security.cs.allow-jit</key>
     <true/>
     <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
     <true/>
     <key>com.apple.security.cs.allow-dyld-environment-variables</key>
     <true/>
   </dict>
   </plist>
   ```

3. **公証スクリプト** (`scripts/notarize.js`)
   ```javascript
   const { notarize } = require('@electron/notarize');

   exports.default = async function notarizing(context) {
     const { electronPlatformName, appOutDir } = context;
     if (electronPlatformName !== 'darwin') return;

     const appName = context.packager.appInfo.productFilename;

     return await notarize({
       appBundleId: 'com.packraw.desktop.app',
       appPath: `${appOutDir}/${appName}.app`,
       appleId: process.env.APPLE_ID,
       appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
       teamId: process.env.APPLE_TEAM_ID,
     });
   };
   ```

4. **electron-builder.yml更新**
   ```yaml
   mac:
     identity: "Developer ID Application: Your Name (TEAM_ID)"
     hardenedRuntime: true
     gatekeeperAssess: false
     entitlements: build/entitlements.mac.plist
     entitlementsInherit: build/entitlements.mac.plist

   afterSign: scripts/notarize.js
   ```

5. **環境変数設定**
   ```bash
   export APPLE_ID="your-apple-id@example.com"
   export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
   export APPLE_TEAM_ID="XXXXXXXXXX"
   ```

##### Phase 11-3: CI/CD自動化（1-2時間）
1. **GitHub Actions設定** (`.github/workflows/release.yml`)
   ```yaml
   name: Build and Release

   on:
     push:
       tags:
         - 'v*.*.*'

   jobs:
     release:
       runs-on: ${{ matrix.os }}

       strategy:
         matrix:
           os: [macos-latest, windows-latest, ubuntu-latest]

       steps:
         - name: Check out Git repository
           uses: actions/checkout@v3

         - name: Install Node.js
           uses: actions/setup-node@v3
           with:
             node-version: 18

         - name: Install dependencies
           run: npm install

         - name: Build and release (macOS)
           if: matrix.os == 'macos-latest'
           env:
             GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
             APPLE_ID: ${{ secrets.APPLE_ID }}
             APPLE_APP_SPECIFIC_PASSWORD: ${{ secrets.APPLE_APP_SPECIFIC_PASSWORD }}
             APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
             CSC_LINK: ${{ secrets.MAC_CERT_BASE64 }}
             CSC_KEY_PASSWORD: ${{ secrets.MAC_CERT_PASSWORD }}
           run: npm run dist:mac

         - name: Build and release (Windows)
           if: matrix.os == 'windows-latest'
           env:
             GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
           run: npm run dist:win

         - name: Build and release (Linux)
           if: matrix.os == 'ubuntu-latest'
           env:
             GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
           run: npm run dist:linux
   ```

2. **GitHub Secrets設定**
   - `APPLE_ID`: Apple IDメールアドレス
   - `APPLE_APP_SPECIFIC_PASSWORD`: App-Specific Password
   - `APPLE_TEAM_ID`: Apple Developer Team ID
   - `MAC_CERT_BASE64`: 証明書をBase64エンコードしたもの
   - `MAC_CERT_PASSWORD`: 証明書のパスワード

3. **リリースフロー**
   ```bash
   # バージョン更新
   npm version patch  # または minor, major

   # タグをプッシュ
   git push origin --tags

   # GitHub Actionsが自動的にビルド・リリース
   ```

#### コスト試算

##### パターンA: macOSのみ（推奨）
| 項目 | 初年度 | 2年目以降 |
|------|--------|----------|
| Apple Developer Program | $99 | $99/年 |
| GitHub（無料プラン） | $0 | $0 |
| **合計** | **$99** | **$99/年** |

##### パターンB: macOS + Windows
| 項目 | 初年度 | 2年目以降 |
|------|--------|----------|
| Apple Developer Program | $99 | $99/年 |
| Windows Code Signing (Standard) | $150 | $150/年 |
| GitHub（無料プラン） | $0 | $0 |
| **合計** | **$249** | **$249/年** |

#### Windows対応について
- **証明書なしでも配布可能**
- 初回起動時にWindows SmartScreen警告が表示される
- ユーザーは「詳細情報」→「実行」で回避可能
- 証明書取得により警告を軽減/削除可能

#### 段階的導入アプローチ
1. **まず証明書なしで実装・テスト**（無料）
   - macOS: 警告あり（右クリック→開く で回避可能）
   - Windows: SmartScreen警告（詳細情報→実行 で回避可能）

2. **macOS証明書取得**（$99/年）
   - macOSユーザーに対して警告なし配布
   - 最優先で対応推奨

3. **Windows証明書検討**（予算次第、$150-400/年）
   - ユーザー数が増えてから検討
   - Standard証明書でも効果あり

#### トラブルシューティング

##### macOSで「破損しているため開けません」
- **原因**: 公証なし or 証明書なし
- **解決**: App-Specific Passwordと公証スクリプト設定

##### Windows SmartScreen警告
- **原因**: コード署名なし or レピュテーション不足
- **解決**: EV証明書取得 or ダウンロード数増加を待つ

##### 更新チェックが動作しない
- **原因**: `app.isPackaged` が false
- **解決**: `npm run dist` でビルドしてテスト

##### GitHub Releasesから404エラー
- **原因**: リポジトリ名やOwner名が間違っている
- **解決**: `electron-builder.yml` の publish 設定確認

#### 実装チェックリスト

**必須作業**
- [ ] `electron-updater`, `electron-log` パッケージ追加
- [ ] `src/main/updater.ts` 作成
- [ ] `src/main/index.ts` に統合
- [ ] `electron-builder.yml` に publish 設定追加
- [ ] macOS用に `.zip` ターゲット追加
- [ ] `package.json` のバージョン管理ルール決定
- [ ] GitHub Releases 設定

**macOS署名・公証（推奨）**
- [ ] Apple Developer Program登録（$99/年）
- [ ] Developer ID Application証明書取得
- [ ] `build/entitlements.mac.plist` 作成
- [ ] `scripts/notarize.js` 作成
- [ ] App-Specific Password生成
- [ ] 環境変数設定

**CI/CD（推奨）**
- [ ] `.github/workflows/release.yml` 作成
- [ ] GitHub Secrets設定
- [ ] タグベースのリリースフロー確立

**テスト**
- [ ] 開発環境で更新チェック動作確認
- [ ] プロダクションビルドでテスト
- [ ] GitHubでテストリリース作成
- [ ] 自動更新フロー確認

### Phase 12: その他の拡張機能 📋計画中

#### 1. PCイベント連携強化
- **画面ロック/アンロック検知**
  - 自動休憩打刻への応用

- **スリープ/復帰検知の拡張**
  - より細かい制御

#### 2. システム統合
- **タスクトレイアイコン対応**
  - システムトレイから起動

- **タスクバー格納機能**
  - 最小化時の動作改善

- **ショートカットキー対応**
  - グローバルショートカット

#### 3. ユーザビリティ向上
- **打刻リマインダー通知**
  - 定時に通知

- **refreshToken期限警告**
  - 期限切れ前に通知

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

