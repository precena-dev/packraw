import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FreeeApiService, FreeeConfig } from '../main/freeeApi';
import * as fs from 'fs';
import * as path from 'path';

// 実際のAPIテスト（実際の認証情報が必要）
describe('FreeeApiService Integration Tests', () => {
  let service: FreeeApiService;
  let config: FreeeConfig;
  let originalConfig: any;

  beforeAll(() => {
    // 実際のAPIテストをスキップする条件
    if (process.env.TEST_REAL_API !== 'true') {
      return;
    }

    // config.jsonから実際の設定を読み込み
    const configPath = path.join(process.cwd(), 'config.json');
    
    if (!fs.existsSync(configPath)) {
      throw new Error('config.json not found. Real API tests require valid configuration.');
    }

    originalConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    
    if (!originalConfig.api) {
      throw new Error('API configuration not found in config.json');
    }

    config = {
      clientId: originalConfig.api.clientId,
      clientSecret: originalConfig.api.clientSecret,
      redirectUri: originalConfig.api.redirectUri,
      accessToken: originalConfig.api.accessToken,
      refreshToken: originalConfig.api.refreshToken,
      refreshTokenExpiresAt: originalConfig.api.refreshTokenExpiresAt,
      companyId: originalConfig.api.companyId,
      employeeId: originalConfig.api.employeeId,
    };

    service = new FreeeApiService(config);
  });

  afterAll(() => {
    // トークンが更新された場合、config.jsonに保存
    if (process.env.TEST_REAL_API === 'true' && service && originalConfig) {
      const currentConfig = service.getConfig();
      
      if (currentConfig.accessToken !== config.accessToken || 
          currentConfig.refreshToken !== config.refreshToken) {
        
        originalConfig.api.accessToken = currentConfig.accessToken;
        originalConfig.api.refreshToken = currentConfig.refreshToken;
        originalConfig.api.refreshTokenExpiresAt = currentConfig.refreshTokenExpiresAt;
        
        const configPath = path.join(process.cwd(), 'config.json');
        fs.writeFileSync(configPath, JSON.stringify(originalConfig, null, 2));
        
        console.log('✅ Updated config.json with new tokens');
      }
    }
  });

  const skipIfMockMode = process.env.TEST_REAL_API !== 'true' ? it.skip : it;

  skipIfMockMode('should get employee information from real API', async () => {
    const result = await service.getEmployeeInfo();
    
    expect(result).toBeDefined();
    expect(result.user).toBeDefined();
    expect(result.employee).toBeDefined();
    expect(result.user.id).toBeDefined();
    expect(result.employee.id).toBeDefined();
    expect(result.employee.display_name).toBeDefined();
    
    console.log('Employee Info:', {
      userId: result.user.id,
      employeeId: result.employee.id,
      displayName: result.employee.display_name,
      companyName: result.employee.company_name
    });
  }, 30000);

  skipIfMockMode('should get today work record from real API', async () => {
    const result = await service.getTodayWorkRecord();
    
    // 結果がnullでも正常（勤務記録がない日もある）
    if (result) {
      expect(result.date).toBeDefined();
      expect(result.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      
      // 日本時間の今日の日付と一致するか確認
      const now = new Date();
      const jstTime = new Date(now.getTime() + 9 * 60 * 60 * 1000);
      const expectedDate = jstTime.toISOString().split('T')[0];
      
      expect(result.date).toBe(expectedDate);
      
      console.log('Today Work Record:', {
        date: result.date,
        clockInAt: result.clockInAt,
        clockOutAt: result.clockOutAt,
        breakRecords: result.breakRecords.length
      });
    } else {
      console.log('No work record found for today');
    }
  }, 30000);

  skipIfMockMode('should get companies list from real API', async () => {
    const result = await service.getCompanies();
    console.log(result)
    
    expect(result).toBeDefined();
    expect(result.companies).toBeDefined();
    expect(Array.isArray(result.companies)).toBe(true);
    expect(result.companies.length).toBeGreaterThan(0);
    
    // 設定されている会社IDが存在するか確認
    const currentCompany = result.companies.find((c: any) => c.id === config.companyId);
    expect(currentCompany).toBeDefined();
    
    console.log('Companies:', result.companies.map((c: any) => ({
      id: c.id,
      name: c.name
    })));
  }, 30000);

  skipIfMockMode('should calculate refresh token remaining days correctly', async () => {
    const remainingDays = service.getRefreshTokenRemainingDays();
    
    expect(remainingDays).toBeDefined();
    expect(typeof remainingDays).toBe('number');
    
    if (remainingDays !== null) {
      expect(remainingDays).toBeGreaterThanOrEqual(0);
      expect(remainingDays).toBeLessThanOrEqual(90);
      
      console.log('Refresh Token Remaining Days:', remainingDays);
      
      if (remainingDays <= 3) {
        console.warn('⚠️ Refresh token will expire soon!');
      }
    }
  });

  skipIfMockMode('should get work record for specific date', async () => {
    // 昨日の日付で勤務記録を取得
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const jstYesterday = new Date(yesterday.getTime() + 9 * 60 * 60 * 1000);
    const testDate = jstYesterday.toISOString().split('T')[0];
    
    const result = await service.getWorkRecord(testDate);
    
    // 結果がnullでも正常（勤務記録がない日もある）
    if (result) {
      expect(result.date).toBe(testDate);
      expect(result).toHaveProperty('clockInAt');
      expect(result).toHaveProperty('clockOutAt');
      expect(result).toHaveProperty('breakRecords');
      
      console.log(`Work Record for ${testDate}:`, {
        date: result.date,
        clockInAt: result.clockInAt,
        clockOutAt: result.clockOutAt,
        breakRecords: result.breakRecords.length
      });
    } else {
      console.log(`No work record found for ${testDate}`);
    }
  }, 30000);

  // 注意: 実際の打刻テストは本番データに影響するため、コメントアウト
  // 必要に応じて慎重に有効化してください
  /*
  skipIfMockMode('should perform time clock operations', async () => {
    // ⚠️ 実際の打刻データに影響するため注意
    
    try {
      // 勤務開始の例（実際には使用しないでください）
      // const result = await service.timeClock('clock_in');
      // expect(result).toBeDefined();
      
      console.log('⚠️ Time clock test skipped to avoid affecting real data');
    } catch (error) {
      console.error('Time clock test error:', error);
      throw error;
    }
  }, 30000);
  */
});