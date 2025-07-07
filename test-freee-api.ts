import * as fs from 'fs';
import * as path from 'path';

// Electronのモックを作成（BrowserWindowを使わないため）
const mockBrowserWindow = {
  BrowserWindow: class {
    constructor() {}
    loadURL() {}
    close() {}
    on() {}
    webContents = {
      on: () => {}
    }
  }
};

// global に BrowserWindow を設定
(global as any).BrowserWindow = mockBrowserWindow.BrowserWindow;

// すべてのaxiosリクエストにインターセプターを追加
const axios = require('axios');

// グローバルインターセプターを追加（リフレッシュトークンAPIも含む）
axios.interceptors.request.use((config: any) => {
  if (config.url?.includes('freee.co.jp')) {
    console.log('\n========== REQUEST ==========');
    console.log('URL:', config.url);
    console.log('Method:', config.method?.toUpperCase());
    console.log('Headers:', JSON.stringify(config.headers, null, 2));
    console.log('Params:', JSON.stringify(config.params, null, 2));
    if (config.data) {
      console.log('Body:', JSON.stringify(config.data, null, 2));
    }
    console.log('==============================\n');
  }
  return config;
});

axios.interceptors.response.use(
  (response: any) => {
    if (response.config.url?.includes('freee.co.jp')) {
      console.log('\n========== RESPONSE ==========');
      console.log('Status:', response.status, response.statusText);
      console.log('Headers:', JSON.stringify(response.headers, null, 2));
      console.log('Data:', JSON.stringify(response.data, null, 2));
      console.log('===============================\n');
    }
    return response;
  },
  (error: any) => {
    if (error.config?.url?.includes('freee.co.jp')) {
      console.log('\n========== ERROR RESPONSE ==========');
      if (error.response) {
        console.log('Status:', error.response.status, error.response.statusText);
        console.log('Headers:', JSON.stringify(error.response.headers, null, 2));
        console.log('Data:', JSON.stringify(error.response.data, null, 2));
      } else {
        console.log('Error:', error.message);
      }
      console.log('====================================\n');
    }
    return Promise.reject(error);
  }
);


// axiosのcreateメソッドをオーバーライドした後でFreeeApiServiceをインポート
import { FreeeApiService } from './src/main/freeeApi';

// config.jsonを読み込む
const configPath = path.join(__dirname, '..', 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

// FreeeApiServiceのインスタンスを作成
const freeeApi = new FreeeApiService({
  clientId: config.api.clientId,
  clientSecret: config.api.clientSecret,
  redirectUri: config.api.redirectUri,
  accessToken: config.api.accessToken,
  refreshToken: config.api.refreshToken,
  refreshTokenExpiresAt: config.api.refreshTokenExpiresAt,
  companyId: config.api.companyId,
  employeeId: config.api.employeeId,
});

// トークンがリフレッシュされた時にconfig.jsonを更新する関数
function saveConfigToFile() {
  const updatedConfig = freeeApi.getConfig();
  config.api.accessToken = updatedConfig.accessToken;
  config.api.refreshToken = updatedConfig.refreshToken;
  config.api.refreshTokenExpiresAt = updatedConfig.refreshTokenExpiresAt;
  
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log('\n✅ Updated config.json with new tokens');
}

// getEmployeeInfo()をテスト
async function testGetEmployeeInfo() {
  console.log('Testing FreeeApiService.getEmployeeInfo() with current config...\n');
  console.log('Config:');
  console.log('- Company ID:', config.api.companyId);
  console.log('- Employee ID:', config.api.employeeId);
  console.log('- Access Token:', config.api.accessToken ? config.api.accessToken.substring(0, 20) + '...' : 'Not set');
  console.log('- Refresh Token:', config.api.refreshToken ? config.api.refreshToken.substring(0, 20) + '...' : 'Not set');
  console.log('- Refresh Token Expires At:', config.api.refreshTokenExpiresAt);
  
  try {
    console.log('\nCalling getEmployeeInfo()...');
    const result = await freeeApi.getEmployeeInfo();
    
    console.log('\n✅ SUCCESS!');
    console.log('\nUser Info:');
    console.log('- User ID:', result.user.id);
    console.log('- Companies:', result.user.companies.length);
    
    if (result.employee) {
      console.log('\nEmployee Info (Current Company):');
      console.log('- Employee ID:', result.employee.id);
      console.log('- Name:', result.employee.display_name);
      console.log('- Company:', result.employee.company_name);
      console.log('- Company ID:', result.employee.company_id);
    }
    
    // トークンがリフレッシュされた可能性があるので、config.jsonを更新
    const currentConfig = freeeApi.getConfig();
    if (currentConfig.accessToken !== config.api.accessToken || 
        currentConfig.refreshToken !== config.api.refreshToken) {
      saveConfigToFile();
    }
    
    return result;
  } catch (error: any) {
    console.log('\n❌ FAILED!');
    console.log('Error:', error.message);
    
    // エラーが発生してもトークンがリフレッシュされた可能性があるので確認
    const currentConfig = freeeApi.getConfig();
    if (currentConfig.accessToken !== config.api.accessToken || 
        currentConfig.refreshToken !== config.api.refreshToken) {
      saveConfigToFile();
    }
    
    if (error.message.includes('認証')) {
      console.log('\n対処法:');
      console.log('1. アプリで再度ログインする');
      console.log('2. または、新しいアクセストークンを取得する');
    }
    
    throw error;
  }
}

// テストを実行
console.log('Starting test...\n');
testGetEmployeeInfo()
  .then(() => {
    console.log('\nTest completed successfully!');
    process.exit(0);
  })
  .catch(() => {
    console.log('\nTest failed!');
    process.exit(1);
  });