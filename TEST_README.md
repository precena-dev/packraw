# freee API テストガイド

このプロジェクトには、freee APIの機能をテストするための包括的なテストスイートが含まれています。

## テストの種類

### 1. ユニットテスト（モック使用）
- `src/test/freeeApi.test.ts`
- 実際のAPIリクエストを送信せず、モックを使用してテスト
- CIパイプラインで定常的に実行可能
- 高速で外部依存がない

### 2. 統合テスト（実際のAPI使用）
- `src/test/freeeApi.integration.test.ts`
- 実際のfreee APIにリクエストを送信
- 有効な認証情報とconfig.jsonが必要
- 実際のデータに影響する可能性があるため注意が必要

## テスト実行方法

### 必要な依存関係のインストール

```bash
npm install
```

### ユニットテスト（推奨：CI用）

```bash
# 全テストを実行
npm test

# ウォッチモードで実行
npm run test:watch

# カバレッジレポート付きで実行
npm run test:coverage
```

### 統合テスト（実際のAPI使用）

**⚠️ 注意: 実際のfreee APIを使用するため、有効な認証情報が必要です**

```bash
# 全統合テストを実行
npm run test:real

# 特定の統合テストのみ実行
npm run test:integration
```

## 統合テストの設定

### 1. config.jsonの準備

プロジェクトルートに有効な`config.json`ファイルが必要です：

```json
{
  "api": {
    "clientId": "YOUR_CLIENT_ID",
    "clientSecret": "YOUR_CLIENT_SECRET",
    "redirectUri": "http://localhost:3000/callback",
    "companyId": YOUR_COMPANY_ID,
    "employeeId": YOUR_EMPLOYEE_ID,
    "accessToken": "VALID_ACCESS_TOKEN",
    "refreshToken": "VALID_REFRESH_TOKEN",
    "refreshTokenExpiresAt": "2025-04-01T00:00:00.000Z"
  }
}
```

### 2. 認証情報の取得

1. [freee Developers](https://developer.freee.co.jp/)でアプリケーションを作成
2. Client IDとClient Secretを取得
3. アプリケーションでOAuth認証を実行してトークンを取得

## テスト内容

### ユニットテスト

- ✅ getEmployeeInfo() - 従業員情報取得
- ✅ timeClock() - 打刻処理（全4種類）
- ✅ getWorkRecord() - 特定日の勤務記録取得
- ✅ getTodayWorkRecord() - 今日の勤務記録取得
- ✅ getCompanies() - 会社一覧取得
- ✅ getRefreshTokenRemainingDays() - トークン残日数計算
- ✅ authorize() - 認証URL生成
- ✅ Token refresh - 自動トークン更新

### 統合テスト

- ✅ 実際のAPI経由での従業員情報取得
- ✅ 実際のAPI経由での勤務記録取得
- ✅ 実際のAPI経由での会社一覧取得
- ✅ 日本時間（JST）での日付計算検証
- ✅ リフレッシュトークン残日数計算
- ⚠️ 打刻API（実データに影響するためコメントアウト）

## CI/CDでの使用

### GitHub Actions例

```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test  # ユニットテストのみ実行
```

### モックテストとリアルテストの切り替え

環境変数`TEST_REAL_API`でテストモードを制御：

- `TEST_REAL_API=false` または未設定: モックテスト
- `TEST_REAL_API=true`: 実際のAPIテスト

## 注意事項

### 統合テスト実行時の注意

1. **実際のデータに影響**: 統合テストは実際のfreee APIを使用するため、勤務記録等に影響する可能性があります
2. **レート制限**: 頻繁な実行はAPIレート制限に引っかかる可能性があります
3. **認証情報の管理**: config.jsonは機密情報を含むため、バージョン管理から除外してください
4. **トークンの自動更新**: テスト実行後、新しいトークンがconfig.jsonに自動保存されます

### セキュリティ

- config.jsonは`.gitignore`に含まれており、バージョン管理されません
- 本番環境では環境変数を使用してください
- Client Secretは外部に漏洩しないよう注意してください

## トラブルシューティング

### よくあるエラー

1. **「config.json not found」**
   - プロジェクトルートにconfig.jsonを作成してください

2. **「Company ID is required」**
   - config.jsonにcompanyIdが設定されているか確認してください

3. **「認証に失敗しました」**
   - アクセストークンが期限切れの可能性があります
   - アプリケーションで再認証を実行してください

4. **「リフレッシュトークンの有効期限が切れています」**
   - リフレッシュトークンが90日経過しています
   - アプリケーションで再認証を実行してください

## パフォーマンス

- ユニットテスト: 通常数秒で完了
- 統合テスト: ネットワーク環境により30秒程度要する場合があります
- タイムアウト設定: 統合テストは30秒でタイムアウト