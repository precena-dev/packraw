# PackRaw

プレセナの勤怠打刻をデスクトップから素早く行えるElectronアプリケーション

![License](https://img.shields.io/badge/license-ISC-blue.svg)
![Electron](https://img.shields.io/badge/electron-37.2.0-47848F?logo=electron)
![React](https://img.shields.io/badge/react-19.1.0-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/typescript-5.8.3-3178C6?logo=typescript)

## 概要

* 勤怠打刻用デスクトップアプリ
* 既存の打刻に対して解決したい課題
  * freeeのweb打刻時のセッション切れイライラ問題
  * スリープ・離席時に休憩わすれて後で修正しないといけない＆結局修正忘れる問題

## 主な機能と解決する手段

- 🏢 **ワンクリック打刻** - 勤務開始/終了、休憩開始/終了をボタン一つで
- ⏱️ **リアルタイム勤務時間表示** - 本日の勤務時間を秒単位で表示
- 📋 **打刻履歴表示** - 本日の打刻履歴を時系列で確認
- 🔐 **OAuth2.0認証** - freee APIとのセキュアな連携
- 🔄 **トークン自動更新** - アクセストークンの自動リフレッシュ
- 💻 **システムトレイ対応** - 最小化時はトレイに格納
- 🔌 **PCイベント連携** - 画面ロック/スリープ時の自動休憩打刻（オプション）

## インストール

### 動作環境

- macOS 10.15以降
- Windows 10以降

### ダウンロード

[ダウンロードページ](https://drive.google.com/drive/folders/1iSum8GMah5t5AZS-wMM0aTwhjhRrjDc2)から各OS用の最新版をダウンロードしてください。

## 初期設定

### 1. インストール手順

#### macOS
1. ダウンロードした`PackRaw-<version>-arm64.dmg`を開く
2. PackRawアプリケーションをApplicationsフォルダにドラッグ
3. 設定ファイルを配置する:
   ```bash
   # electron-storeの設定ディレクトリに配置
   cp config.precena.json ~/Library/Application\ Support/PackRaw/freee-app-config.json
   ```
   ※ アプリケーションを一度起動すると自動的にディレクトリが作成されます。が初回はconfigがないのでエラーになります。先に入れといたほうが良いかもです。
   ※ プレセナ用の設定ファイル(config.precena.json)は[ダウンロードページ](https://drive.google.com/drive/folders/1iSum8GMah5t5AZS-wMM0aTwhjhRrjDc2)のmacOSフォルダにあります。

#### Windows
1. ダウンロードした`PackRaw-x.x.x-win.zip`を任意のフォルダに解凍
2. 解凍したフォルダ内の`install.bat`をダブルクリックして実行（設定ファイルの初期化）
3. `PackRaw-<version>.exe`をダブルクリックして起動

### 2. 初回認証

1. アプリケーションを起動
2. 「freeeにログイン」ボタンをクリック
3. freeeの認証画面で許可
4. 自動的に従業員情報とトークンが保存されます

## 使い方

### 基本的な打刻操作

- **🏢 勤務開始**: 出社時にクリック
- **🏠 勤務終了**: 退社時にクリック
- **☕ 休憩開始**: 休憩開始時にクリック
- **💼 休憩終了**: 休憩終了時にクリック

### その他の機能

- **勤務時間表示**: 画面上部に本日の勤務時間がリアルタイムで表示されます
- **打刻履歴**: 画面下部に本日の打刻履歴が表示されます
- **システムトレイ**: ウィンドウを閉じるとトレイに格納されます（macOS）
- **設定画面**: 歯車アイコンから自動休憩機能の設定が可能

## 開発者向け情報

### 開発環境のセットアップ

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev
```

### ビルド

```bash
# プロダクションビルド
npm run build

# 各プラットフォーム向けパッケージ作成
npm run dist:mac    # macOS
npm run dist:win    # Windows
npm run dist:linux  # Linux
```

### テスト

```bash
# ユニットテスト
npm test

# カバレッジレポート付きテスト
npm run test:coverage

# 実際のAPIを使用したテスト（要設定）
TEST_REAL_API=true npm test
```

## トラブルシューティング

### よくある問題と解決方法

1. **「API service not initialized」エラー**
   - config.jsonが正しく設定されているか確認してください
   - Client IDとClient Secretが正しいか確認してください

2. **「リフレッシュトークンの有効期限が切れています」エラー**
   - 90日以上経過している場合は再認証が必要です
   - 「freeeにログイン」ボタンから再度認証してください

3. **打刻が失敗する**
   - 事業所ID（companyId）が正しいか確認してください
   - freee側の勤怠設定を確認してください

4. **時刻がずれて表示される**
   - アプリケーションは日本時間（JST）で動作します
   - PCのタイムゾーン設定を確認してください

## セキュリティ

- OAuth2.0による安全な認証
- アクセストークンは6時間で自動更新
- リフレッシュトークンは90日間有効
- 認証情報はローカルに暗号化して保存

## ライセンス

ISC License

## リリースとアップデート

### 自動更新機能

PackRawは自動更新機能を搭載しています。新しいバージョンがリリースされると、アプリケーションが自動的に検出し、更新を促します。

**更新チェックのタイミング**:
- アプリ起動後5秒後に初回チェック
- その後24時間ごとに定期チェック

**更新手順**:
1. 新バージョンが利用可能になると通知ダイアログが表示されます
2. 「ダウンロード」をクリックすると自動的にダウンロードが開始されます
3. ダウンロード完了後、「再起動して更新」をクリックします
4. アプリが再起動し、新バージョンが適用されます

**注意**: macOSでは現在手動更新のみ対応しています。最新版は[GitHubリリースページ](https://github.com/precena-dev/freee-webview-app/releases)からダウンロードしてください。

### バージョン履歴

最新のリリース情報は[GitHubリリースページ](https://github.com/precena-dev/freee-webview-app/releases)をご覧ください。

## 開発者向け: リリース手順

### パッチリリース（バグ修正）

```bash
# 1. バグを修正してコミット
git add .
git commit -m "fix: バグの説明"

# 2. パッチバージョンアップ（2.5.0 → 2.5.1）
npm version patch
# 自動的に以下が実行される:
# - package.jsonのバージョン更新
# - 自動コミット（メッセージ: "v2.5.1"）
# - Gitタグ作成（タグ名: "v2.5.1"）

# 3. 変更をプッシュ
git push origin main --tags
```

### マイナーリリース（新機能追加）

```bash
# 1. 機能を実装してコミット
git add .
git commit -m "feat: 新機能の説明"

# 2. マイナーバージョンアップ（2.5.0 → 2.6.0）
npm version minor

# 3. 変更をプッシュ
git push origin main --tags
```

### メジャーリリース（破壊的変更）

```bash
# 1. 破壊的変更を実装してコミット
git add .
git commit -m "feat!: 破壊的変更の説明"

# 2. メジャーバージョンアップ（2.5.0 → 3.0.0）
npm version major

# 3. 変更をプッシュ
git push origin main --tags
```

**自動ビルド**: タグをプッシュすると、GitHub Actionsが自動的にビルドを実行し、macOS/Windows/Linux向けの配布パッケージを作成してGitHub Releasesに公開します（約10-15分）。

詳細な開発ガイドラインは [CLAUDE.md](CLAUDE.md) を参照してください。

## 貢献

Issue や Pull Request は歓迎です。（らしい）

## サポート

問題が発生した場合は、[#times_kobaken](https://precena.slack.com/archives/CF7PFK3SN) から報告してください。
