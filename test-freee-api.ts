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

// config.jsonを読み込む（新しいパス）
const os = require('os');
const configPath = path.join(os.homedir(), 'Library', 'Application Support', 'PackRaw', 'freee-app-config.json');
console.log('Config path:', configPath);

if (!fs.existsSync(configPath)) {
  console.error('❌ Config file not found at:', configPath);
  process.exit(1);
}

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

// 生のfreee API work_recordを直接叩くテスト
async function testUpdateWorkRecord() {
  console.log('\n========================================');
  console.log('Testing RAW freee API - work_records');
  console.log('========================================\n');

  // テスト用の日付（過去の日付を指定）
  //const testDate = '2024-10-10'; // 適切な過去の日付に変更してください
  const testDate = '2025-10-10'; // 適切な過去の日付に変更してください
  console.log(`📅 テスト日付: ${testDate}`);
  console.log(`📍 Employee ID: ${config.api.employeeId}`);
  console.log(`📍 Company ID: ${config.api.companyId}\n`);

  // APIクライアントの設定（既存のaxiosインスタンスを使用）
  const apiClient = axios.create({
    baseURL: 'https://api.freee.co.jp',
    headers: {
      'Authorization': `Bearer ${config.api.accessToken}`,
      'Content-Type': 'application/json',
    }
  });

  try {
    // 1. 現在の勤怠記録を取得（GET）
    console.log('1️⃣  GET /hr/api/v1/employees/{id}/work_records/{date}');
    console.log('----------------------------------------');

    let getResponse;
    try {
      getResponse = await apiClient.get(
        `/hr/api/v1/employees/${config.api.employeeId}/work_records/${testDate}?company_id=${config.api.companyId}`
      );
      console.log('✅ 取得成功');
      console.log('レスポンス（主要項目）:');
      console.log(`  - date: ${getResponse.data.date}`);
      console.log(`  - clock_in_at: ${getResponse.data.clock_in_at || 'null'}`);
      console.log(`  - clock_out_at: ${getResponse.data.clock_out_at || 'null'}`);
      console.log(`  - break_records: ${getResponse.data.break_records?.length || 0}件`);
      console.log(`  - is_editable: ${getResponse.data.is_editable}`);
      console.log(`  - day_pattern: ${getResponse.data.day_pattern}`);
    } catch (error: any) {
      console.error('❌ エラー:', error.response?.status, error.response?.statusText);
      if (error.response?.data) {
        console.error('エラー詳細:', JSON.stringify(error.response.data, null, 2));
      }
      return;
    }
    console.log();

    // 2. さまざまなパラメータパターンをテスト
    console.log(`2️⃣  PUT /hr/api/v1/employees/${config.api.employeeId}/work_records/${testDate}?company_id=${config.api.companyId}`);
    console.log('----------------------------------------');

    // テストケース配列
    const testCases = [
      {
        name: 'A. 最小限のパラメータ（company_idのみ）',
        body: {
          company_id: config.api.companyId
        }
      },
      {
        name: 'B. 出勤時刻のみ（HH:mm形式）',
        body: {
          company_id: config.api.companyId,
          clock_in_at: '09:00'
        }
      },
      {
        name: 'C. 出勤時刻のみ（HH:mm:ss形式）',
        body: {
          company_id: config.api.companyId,
          clock_in_at: '09:00:00'
        }
      },
      {
        name: 'D. 出勤時刻のみ（YYYY-MM-DD HH:mm:ss形式）',
        body: {
          company_id: config.api.companyId,
          clock_in_at: `${testDate} 09:00:00`
        }
      },
      {
        name: 'E. 出勤・退勤時刻（HH:mm形式）',
        body: {
          company_id: config.api.companyId,
          clock_in_at: '09:00',
          clock_out_at: '18:00'
        }
      },
      {
        name: 'F. 空のbreak_recordsあり',
        body: {
          company_id: config.api.companyId,
          clock_in_at: `${testDate} 08:30`,
          clock_out_at: `${testDate} 17:30`
        }
      },
      {
        name: 'G. 休憩記録あり（HH:mm形式）',
        body: {
          company_id: config.api.companyId,
          clock_in_at: `${testDate} 08:30`,
          clock_out_at: `${testDate} 17:30`,
          break_records: [
            {
              clock_in_at: `${testDate} 12:00`,
              clock_out_at: `${testDate} 13:00`
            }
          ]
        }
      },
      {
        name: 'H. 休憩記録あり（HH:mm:ss形式）',
        body: {
          company_id: config.api.companyId,
          clock_in_at: '09:00',
          clock_out_at: '18:00',
          break_records: [
            {
              clock_in_at: '12:00:00',
              clock_out_at: '13:00:00'
            }
          ]
        }
      },
      {
        name: 'I. 複数の休憩記録',
        body: {
          company_id: config.api.companyId,
          clock_in_at: '09:00',
          clock_out_at: '18:00',
          break_records: [
            {
              clock_in_at: '10:30',
              clock_out_at: '10:45'
            },
            {
              clock_in_at: '12:00',
              clock_out_at: '13:00'
            },
            {
              clock_in_at: '15:00',
              clock_out_at: '15:15'
            }
          ]
        }
      },
      {
        name: 'J. 退勤時刻なしで休憩記録あり（エラーになる可能性）',
        body: {
          company_id: config.api.companyId,
          clock_in_at: '09:00',
          break_records: [
            {
              clock_in_at: '12:00',
              clock_out_at: '13:00'
            }
          ]
        }
      }
    ];

    // 各テストケースを実行（コメントアウトしたい場合は以下の行を変更）
    //const testCasesToRun = testCases.slice(0, 5); // 最初の5個だけ実行（全部実行したい場合は testCases を使用）
    const testCasesToRun = [testCases[6]]; // 最初の5個だけ実行（全部実行したい場合は testCases を使用）

    for (const testCase of testCasesToRun) {
      console.log(`\n📝 テストケース: ${testCase.name}`);
      console.log('リクエストボディ:', JSON.stringify(testCase.body, null, 2));

      //try {
      //  const response = await apiClient.put(
      //    `/hr/api/v1/employees/${config.api.employeeId}/work_records/${testDate}`,
      //    testCase.body
      //  );
      //  console.log('✅ 成功');
      //  console.log('レスポンス（主要項目）:');
      //  console.log(`  - clock_in_at: ${response.data.clock_in_at || 'null'}`);
      //  console.log(`  - clock_out_at: ${response.data.clock_out_at || 'null'}`);
      //  console.log(`  - break_records: ${response.data.break_records?.length || 0}件`);
      //  if (response.data.break_records?.length > 0) {
      //    response.data.break_records.forEach((br: any, i: number) => {
      //      console.log(`    ${i + 1}. ${br.clock_in_at} - ${br.clock_out_at}`);
      //    });
      //  }
      //} catch (error: any) {
      //  console.error('❌ エラー:', error.response?.status, error.response?.statusText);
      //  if (error.response?.data) {
      //    console.error('エラー詳細:', JSON.stringify(error.response.data, null, 2));
      //  }
      //}

      // API制限を考慮して少し待機
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // 3. 最終的な勤怠記録を確認
    console.log('\n3️⃣  最終的な勤怠記録を確認');
    console.log('----------------------------------------');

    try {
      const finalResponse = await apiClient.get(
        `/hr/api/v1/employees/${config.api.employeeId}/work_records/${testDate}?company_id=${config.api.companyId}`
      );
      console.log('最終的な勤怠記録:');
      console.log(`  - clock_in_at: ${finalResponse.data.clock_in_at || 'null'}`);
      console.log(`  - clock_out_at: ${finalResponse.data.clock_out_at || 'null'}`);
      console.log(`  - break_records: ${finalResponse.data.break_records?.length || 0}件`);
      if (finalResponse.data.break_records?.length > 0) {
        console.log('  休憩記録詳細:');
        finalResponse.data.break_records.forEach((br: any, i: number) => {
          console.log(`    ${i + 1}. ${br.clock_in_at} - ${br.clock_out_at}`);
        });
      }
    } catch (error: any) {
      console.error('❌ エラー:', error.response?.status, error.response?.statusText);
    }

    // トークンがリフレッシュされた可能性があるので、config.jsonを更新
    const currentConfig = freeeApi.getConfig();
    if (currentConfig.accessToken !== config.api.accessToken ||
        currentConfig.refreshToken !== config.api.refreshToken) {
      saveConfigToFile();
    }

  } catch (error: any) {
    console.log('\n❌ 予期しないエラー:', error.message);

    // エラーが発生してもトークンがリフレッシュされた可能性があるので確認
    const currentConfig = freeeApi.getConfig();
    if (currentConfig.accessToken !== config.api.accessToken ||
        currentConfig.refreshToken !== config.api.refreshToken) {
      saveConfigToFile();
    }

    throw error;
  }
}

// コマンドライン引数でどのテストを実行するか選択
const testType = process.argv[2] || 'employee';

// テストを実行
console.log('Starting test...\n');

if (testType === 'update') {
  testUpdateWorkRecord()
    .then(() => {
      console.log('\nTest completed successfully!');
      process.exit(0);
    })
    .catch(() => {
      console.log('\nTest failed!');
      process.exit(1);
    });
} else {
  testGetEmployeeInfo()
    .then(() => {
      console.log('\nTest completed successfully!');
      process.exit(0);
    })
    .catch(() => {
      console.log('\nTest failed!');
      process.exit(1);
    });
}