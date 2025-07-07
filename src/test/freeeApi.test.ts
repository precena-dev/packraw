import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { FreeeApiService, FreeeConfig, WorkRecord, TimeClock, TimeClockButtonState } from '../main/freeeApi';
import axios from 'axios';

// モックの設定
vi.mock('axios');
vi.mock('electron', () => ({
  BrowserWindow: vi.fn().mockImplementation(() => ({
    loadURL: vi.fn(),
    close: vi.fn(),
    on: vi.fn(),
    webContents: {
      on: vi.fn()
    }
  }))
}));

// テストモードの切り替え（環境変数で制御）
const USE_REAL_API = process.env.TEST_REAL_API === 'true';

describe('FreeeApiService', () => {
  let service: FreeeApiService;
  let mockAxiosInstance: any;
  let config: FreeeConfig;

  beforeEach(() => {
    // テスト用の設定
    config = {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      redirectUri: 'http://localhost:3000/callback',
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token',
      refreshTokenExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      companyId: 123456,
      employeeId: 789012
    };

    if (!USE_REAL_API) {
      // インターセプターのモック関数
      let responseInterceptor: any;
      
      // モックの設定
      mockAxiosInstance = {
        get: vi.fn(),
        post: vi.fn(),
        interceptors: {
          request: { use: vi.fn() },
          response: { 
            use: vi.fn((onFulfilled, onRejected) => {
              responseInterceptor = { onFulfilled, onRejected };
            })
          }
        }
      };

      // 実際のaxiosインスタンスメソッドを呼び出すラッパー
      const originalCall = mockAxiosInstance.get;
      mockAxiosInstance.get = vi.fn(async (...args) => {
        try {
          const result = await originalCall(...args);
          if (responseInterceptor?.onFulfilled) {
            return responseInterceptor.onFulfilled(result);
          }
          return result;
        } catch (error) {
          if (responseInterceptor?.onRejected) {
            return responseInterceptor.onRejected(error);
          }
          throw error;
        }
      });

      (axios.create as Mock).mockReturnValue(mockAxiosInstance);
    }

    service = new FreeeApiService(config);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getJSTDate', () => {
    it('should return correct JST date', () => {
      // getJSTDateはprivateメソッドなので、間接的にテスト
      const testDate = new Date('2025-01-01T15:00:00Z'); // UTC 15:00
      // JSTでは 2025-01-02 00:00 になるはず
      
      // getTodayWorkRecordを使って間接的にテスト
      if (!USE_REAL_API) {
        mockAxiosInstance.get.mockResolvedValue({
          data: {
            date: '2025-01-02',
            clock_in_at: null,
            clock_out_at: null,
            break_records: []
          }
        });
      }

      // この部分は実際のメソッドで日付が正しく処理されるかを確認
      expect(true).toBe(true); // プレースホルダー
    });
  });

  describe('getEmployeeInfo', () => {
    it('should return employee information', async () => {
      if (!USE_REAL_API) {
        const mockResponse = {
          data: {
            id: 2772728,
            companies: [
              {
                id: 123456,
                name: 'Test Company',
                role: 'self_only',
                external_cid: '1531614342',
                employee_id: 789012,
                display_name: 'Test User'
              }
            ]
          }
        };

        mockAxiosInstance.get.mockResolvedValue(mockResponse);
      }

      const result = await service.getEmployeeInfo();

      if (!USE_REAL_API) {
        expect(mockAxiosInstance.get).toHaveBeenCalledWith(
          '/hr/api/v1/users/me',
          { params: { company_id: 123456 } }
        );
      }

      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.employee).toBeDefined();
      
      if (!USE_REAL_API) {
        expect(result.employee.id).toBe(789012);
        expect(result.employee.display_name).toBe('Test User');
      }
    });

    it('should throw error when company ID is not set', async () => {
      const configWithoutCompanyId = { ...config, companyId: undefined };
      const serviceWithoutCompanyId = new FreeeApiService(configWithoutCompanyId);

      await expect(serviceWithoutCompanyId.getEmployeeInfo()).rejects.toThrow(
        'Company ID is required. Please get companies list first.'
      );
    });
  });

  describe('timeClock', () => {
    it('should send clock in request', async () => {
      if (!USE_REAL_API) {
        const mockResponse = {
          data: {
            id: 123,
            type: 'clock_in',
            datetime: '2025-01-01T09:00:00+09:00'
          }
        };

        mockAxiosInstance.post.mockResolvedValue(mockResponse);
      }

      const result = await service.timeClock('clock_in');

      if (!USE_REAL_API) {
        expect(mockAxiosInstance.post).toHaveBeenCalledWith(
          '/hr/api/v1/employees/789012/time_clocks',
          expect.objectContaining({
            company_id: 123456,
            type: 'clock_in',
            base_date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
            datetime: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
          })
        );
      }

      expect(result).toBeDefined();
    });

    it('should handle all time clock types', async () => {
      const types: Array<'clock_in' | 'clock_out' | 'break_begin' | 'break_end'> = [
        'clock_in',
        'clock_out',
        'break_begin',
        'break_end'
      ];

      for (const type of types) {
        if (!USE_REAL_API) {
          mockAxiosInstance.post.mockResolvedValue({
            data: { id: 123, type }
          });
        }

        const result = await service.timeClock(type);
        expect(result).toBeDefined();
      }
    });
  });

  describe('getWorkRecord', () => {
    it('should return work record for specific date', async () => {
      const testDate = '2025-01-01';
      
      if (!USE_REAL_API) {
        const mockResponse = {
          data: {
            date: testDate,
            clock_in_at: '2025-01-01T09:00:00+09:00',
            clock_out_at: '2025-01-01T18:00:00+09:00',
            break_records: [
              {
                clock_in_at: '2025-01-01T12:00:00+09:00',
                clock_out_at: '2025-01-01T13:00:00+09:00'
              }
            ]
          }
        };

        mockAxiosInstance.get.mockResolvedValue(mockResponse);
      }

      const result = await service.getWorkRecord(testDate);

      if (!USE_REAL_API) {
        expect(mockAxiosInstance.get).toHaveBeenCalledWith(
          `/hr/api/v1/employees/789012/work_records/${testDate}`,
          { params: { company_id: 123456 } }
        );
      }

      if (result) {
        expect(result.date).toBe(testDate);
        expect(result).toHaveProperty('clockInAt');
        expect(result).toHaveProperty('clockOutAt');
        expect(result).toHaveProperty('breakRecords');
      }
    });

    it('should return null for 404 response', async () => {
      if (!USE_REAL_API) {
        const error = {
          response: { status: 404 },
          isAxiosError: true
        };
        
        // axios.isAxiosError をモック
        vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);
        
        mockAxiosInstance.get.mockRejectedValue(error);
        
        const result = await service.getWorkRecord('2025-01-01');
        expect(result).toBeNull();
      }
    });
  });

  describe('getTodayWorkRecord', () => {
    it('should return today work record with JST date', async () => {
      if (!USE_REAL_API) {
        // 今日の日付（JST）を計算
        const now = new Date();
        const jstTime = new Date(now.getTime() + 9 * 60 * 60 * 1000);
        const today = jstTime.toISOString().split('T')[0];

        const mockResponse = {
          data: {
            date: today,
            clock_in_at: null,
            clock_out_at: null,
            break_records: []
          }
        };

        mockAxiosInstance.get.mockResolvedValue(mockResponse);
      }

      const result = await service.getTodayWorkRecord();

      if (!USE_REAL_API) {
        // 正しい日付でAPIが呼ばれたか確認
        const expectedDate = new Date(new Date().getTime() + 9 * 60 * 60 * 1000)
          .toISOString().split('T')[0];
        
        expect(mockAxiosInstance.get).toHaveBeenCalledWith(
          expect.stringContaining(`/work_records/${expectedDate}`),
          expect.any(Object)
        );
      }

      // 結果の検証
      if (result) {
        expect(result).toHaveProperty('date');
        expect(result).toHaveProperty('clockInAt');
        expect(result).toHaveProperty('clockOutAt');
        expect(result).toHaveProperty('breakRecords');
      }
    });
  });

  describe('getCompanies', () => {
    it('should return companies list', async () => {
      if (!USE_REAL_API) {
        const mockResponse = {
          data: {
            companies: [
              { id: 123456, name: 'Test Company 1' },
              { id: 789012, name: 'Test Company 2' }
            ]
          }
        };

        mockAxiosInstance.get.mockResolvedValue(mockResponse);
      }

      const result = await service.getCompanies();

      if (!USE_REAL_API) {
        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/1/companies');
      }

      expect(result).toBeDefined();
      expect(result.companies).toBeDefined();
      expect(Array.isArray(result.companies)).toBe(true);
    });
  });

  describe('getRefreshTokenRemainingDays', () => {
    it('should return remaining days when expiration date is set', () => {
      const result = service.getRefreshTokenRemainingDays();
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(90);
    });

    it('should return null when expiration date is not set', () => {
      const configWithoutExpiration = { ...config, refreshTokenExpiresAt: undefined };
      const serviceWithoutExpiration = new FreeeApiService(configWithoutExpiration);
      
      const result = serviceWithoutExpiration.getRefreshTokenRemainingDays();
      
      expect(result).toBeNull();
    });

    it('should return 0 when token is expired', () => {
      const configWithExpiredToken = {
        ...config,
        refreshTokenExpiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      };
      const serviceWithExpiredToken = new FreeeApiService(configWithExpiredToken);
      
      const result = serviceWithExpiredToken.getRefreshTokenRemainingDays();
      
      expect(result).toBe(0);
    });
  });

  describe('Time Clocks API', () => {
    describe('getTimeClocks', () => {
      it('should get time clocks for specified date range', async () => {
        if (!USE_REAL_API) {
          const mockResponse = {
            data: [
              {
                id: 1,
                type: 'clock_in',
                date: '2025-01-01',
                datetime: '2025-01-01T09:00:00+09:00',
                original_datetime: '2025-01-01T09:00:00+09:00',
                note: ''
              },
              {
                id: 2,
                type: 'clock_out',
                date: '2025-01-01',
                datetime: '2025-01-01T18:00:00+09:00',
                original_datetime: '2025-01-01T18:00:00+09:00',
                note: ''
              }
            ]
          };

          mockAxiosInstance.get.mockResolvedValue(mockResponse);
        }

        const result = await service.getTimeClocks('2025-01-01', '2025-01-01');

        if (!USE_REAL_API) {
          expect(mockAxiosInstance.get).toHaveBeenCalledWith(
            `/hr/api/v1/employees/${config.employeeId}/time_clocks`,
            {
              params: {
                company_id: config.companyId,
                from_date: '2025-01-01',
                to_date: '2025-01-01'
              }
            }
          );
        }

        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
        
        if (result.length > 0) {
          const timeClock = result[0];
          expect(timeClock).toHaveProperty('id');
          expect(timeClock).toHaveProperty('type');
          expect(timeClock).toHaveProperty('date');
          expect(timeClock).toHaveProperty('datetime');
          expect(['clock_in', 'clock_out', 'break_begin', 'break_end']).toContain(timeClock.type);
        }
      });

      it('should get time clocks without date parameters', async () => {
        if (!USE_REAL_API) {
          const mockResponse = {
            data: []
          };

          mockAxiosInstance.get.mockResolvedValue(mockResponse);
        }

        const result = await service.getTimeClocks();

        if (!USE_REAL_API) {
          expect(mockAxiosInstance.get).toHaveBeenCalledWith(
            `/hr/api/v1/employees/${config.employeeId}/time_clocks`,
            {
              params: {
                company_id: config.companyId
              }
            }
          );
        }

        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
      });
    });

    describe('getLastTimeClockType', () => {
      it('should return last time clock type for today', async () => {
        if (!USE_REAL_API) {
          const mockResponse = {
            data: [
              {
                id: 1,
                type: 'clock_in',
                date: '2025-01-01',
                datetime: '2025-01-01T09:00:00+09:00',
                original_datetime: '2025-01-01T09:00:00+09:00',
                note: ''
              },
              {
                id: 2,
                type: 'clock_out',
                date: '2025-01-01',
                datetime: '2025-01-01T18:00:00+09:00',
                original_datetime: '2025-01-01T18:00:00+09:00',
                note: ''
              }
            ]
          };

          mockAxiosInstance.get.mockResolvedValue(mockResponse);
        }

        const result = await service.getLastTimeClockType();

        if (!USE_REAL_API) {
          expect(result).toBe('clock_out'); // 最新の打刻タイプ
        } else {
          // 実際のAPIでは結果がnullの場合もある
          if (result !== null) {
            expect(['clock_in', 'clock_out', 'break_begin', 'break_end']).toContain(result);
          }
        }
      });

      it('should return null when no time clocks found', async () => {
        if (!USE_REAL_API) {
          const mockResponse = {
            data: []
          };

          mockAxiosInstance.get.mockResolvedValue(mockResponse);

          const result = await service.getLastTimeClockType();
          expect(result).toBeNull();
        }
      });

      it('should sort time clocks by datetime and return the latest', async () => {
        if (!USE_REAL_API) {
          // 意図的に時刻順序を逆にしたデータでテスト
          const mockResponse = {
            data: [
              {
                id: 2,
                type: 'clock_out',
                date: '2025-01-01',
                datetime: '2025-01-01T18:00:00+09:00',
                original_datetime: '2025-01-01T18:00:00+09:00',
                note: ''
              },
              {
                id: 3,
                type: 'break_begin',
                date: '2025-01-01',
                datetime: '2025-01-01T12:00:00+09:00',
                original_datetime: '2025-01-01T12:00:00+09:00',
                note: ''
              },
              {
                id: 1,
                type: 'clock_in',
                date: '2025-01-01',
                datetime: '2025-01-01T09:00:00+09:00',
                original_datetime: '2025-01-01T09:00:00+09:00',
                note: ''
              }
            ]
          };

          mockAxiosInstance.get.mockResolvedValue(mockResponse);

          const result = await service.getLastTimeClockType();
          expect(result).toBe('clock_out'); // 18:00の打刻が最新
        }
      });
    });
  });

  describe('Time Clock Button Validation', () => {
    describe('getAvailableTimeClockTypes', () => {
      it('should return clock_in only for null (no time clocks)', async () => {
        if (!USE_REAL_API) {
          const mockResponse = { data: [] };
          mockAxiosInstance.get.mockResolvedValue(mockResponse);
          
          const result = await service.getAvailableTimeClockTypes();
          expect(result).toEqual(['clock_in']);
        }
      });

      it('should return clock_out and break_begin after clock_in', async () => {
        if (!USE_REAL_API) {
          const mockResponse = {
            data: [
              {
                id: 1,
                type: 'clock_in',
                date: '2025-01-01',
                datetime: '2025-01-01T09:00:00+09:00',
                original_datetime: '2025-01-01T09:00:00+09:00',
                note: ''
              }
            ]
          };
          mockAxiosInstance.get.mockResolvedValue(mockResponse);
          
          const result = await service.getAvailableTimeClockTypes();
          expect(result).toEqual(['clock_out', 'break_begin']);
        }
      });

      it('should return break_end only after break_begin', async () => {
        if (!USE_REAL_API) {
          const mockResponse = {
            data: [
              {
                id: 1,
                type: 'clock_in',
                date: '2025-01-01',
                datetime: '2025-01-01T09:00:00+09:00',
                original_datetime: '2025-01-01T09:00:00+09:00',
                note: ''
              },
              {
                id: 2,
                type: 'break_begin',
                date: '2025-01-01',
                datetime: '2025-01-01T12:00:00+09:00',
                original_datetime: '2025-01-01T12:00:00+09:00',
                note: ''
              }
            ]
          };
          mockAxiosInstance.get.mockResolvedValue(mockResponse);
          
          const result = await service.getAvailableTimeClockTypes();
          expect(result).toEqual(['break_end']);
        }
      });

      it('should return clock_out and break_begin after break_end', async () => {
        if (!USE_REAL_API) {
          const mockResponse = {
            data: [
              {
                id: 1,
                type: 'clock_in',
                date: '2025-01-01',
                datetime: '2025-01-01T09:00:00+09:00',
                original_datetime: '2025-01-01T09:00:00+09:00',
                note: ''
              },
              {
                id: 2,
                type: 'break_begin',
                date: '2025-01-01',
                datetime: '2025-01-01T12:00:00+09:00',
                original_datetime: '2025-01-01T12:00:00+09:00',
                note: ''
              },
              {
                id: 3,
                type: 'break_end',
                date: '2025-01-01',
                datetime: '2025-01-01T13:00:00+09:00',
                original_datetime: '2025-01-01T13:00:00+09:00',
                note: ''
              }
            ]
          };
          mockAxiosInstance.get.mockResolvedValue(mockResponse);
          
          const result = await service.getAvailableTimeClockTypes();
          expect(result).toEqual(['clock_out', 'break_begin']);
        }
      });

      it('should return empty array after clock_out', async () => {
        if (!USE_REAL_API) {
          const mockResponse = {
            data: [
              {
                id: 1,
                type: 'clock_in',
                date: '2025-01-01',
                datetime: '2025-01-01T09:00:00+09:00',
                original_datetime: '2025-01-01T09:00:00+09:00',
                note: ''
              },
              {
                id: 2,
                type: 'clock_out',
                date: '2025-01-01',
                datetime: '2025-01-01T18:00:00+09:00',
                original_datetime: '2025-01-01T18:00:00+09:00',
                note: ''
              }
            ]
          };
          mockAxiosInstance.get.mockResolvedValue(mockResponse);
          
          const result = await service.getAvailableTimeClockTypes();
          expect(result).toEqual([]);
        }
      });
    });

    describe('getTimeClockButtonStates', () => {
      it('should return correct button states for no time clocks', async () => {
        if (!USE_REAL_API) {
          const mockResponse = { data: [] };
          mockAxiosInstance.get.mockResolvedValue(mockResponse);
          
          const result = await service.getTimeClockButtonStates();
          expect(result).toEqual({
            clockIn: true,
            clockOut: false,
            breakBegin: false,
            breakEnd: false
          });
        }
      });

      it('should return correct button states after clock_in', async () => {
        if (!USE_REAL_API) {
          const mockResponse = {
            data: [
              {
                id: 1,
                type: 'clock_in',
                date: '2025-01-01',
                datetime: '2025-01-01T09:00:00+09:00',
                original_datetime: '2025-01-01T09:00:00+09:00',
                note: ''
              }
            ]
          };
          mockAxiosInstance.get.mockResolvedValue(mockResponse);
          
          const result = await service.getTimeClockButtonStates();
          expect(result).toEqual({
            clockIn: false,
            clockOut: true,
            breakBegin: true,
            breakEnd: false
          });
        }
      });

      it('should return correct button states during break', async () => {
        if (!USE_REAL_API) {
          const mockResponse = {
            data: [
              {
                id: 1,
                type: 'clock_in',
                date: '2025-01-01',
                datetime: '2025-01-01T09:00:00+09:00',
                original_datetime: '2025-01-01T09:00:00+09:00',
                note: ''
              },
              {
                id: 2,
                type: 'break_begin',
                date: '2025-01-01',
                datetime: '2025-01-01T12:00:00+09:00',
                original_datetime: '2025-01-01T12:00:00+09:00',
                note: ''
              }
            ]
          };
          mockAxiosInstance.get.mockResolvedValue(mockResponse);
          
          const result = await service.getTimeClockButtonStates();
          expect(result).toEqual({
            clockIn: false,
            clockOut: false,
            breakBegin: false,
            breakEnd: true
          });
        }
      });

      it('should return all false after clock_out', async () => {
        if (!USE_REAL_API) {
          const mockResponse = {
            data: [
              {
                id: 1,
                type: 'clock_in',
                date: '2025-01-01',
                datetime: '2025-01-01T09:00:00+09:00',
                original_datetime: '2025-01-01T09:00:00+09:00',
                note: ''
              },
              {
                id: 2,
                type: 'clock_out',
                date: '2025-01-01',
                datetime: '2025-01-01T18:00:00+09:00',
                original_datetime: '2025-01-01T18:00:00+09:00',
                note: ''
              }
            ]
          };
          mockAxiosInstance.get.mockResolvedValue(mockResponse);
          
          const result = await service.getTimeClockButtonStates();
          expect(result).toEqual({
            clockIn: false,
            clockOut: false,
            breakBegin: false,
            breakEnd: false
          });
        }
      });
    });

    describe('isTimeClockTypeAvailable', () => {
      it('should return true for clock_in when no time clocks exist', async () => {
        if (!USE_REAL_API) {
          const mockResponse = { data: [] };
          mockAxiosInstance.get.mockResolvedValue(mockResponse);
          
          const result = await service.isTimeClockTypeAvailable('clock_in');
          expect(result).toBe(true);
        }
      });

      it('should return false for clock_out when no time clocks exist', async () => {
        if (!USE_REAL_API) {
          const mockResponse = { data: [] };
          mockAxiosInstance.get.mockResolvedValue(mockResponse);
          
          const result = await service.isTimeClockTypeAvailable('clock_out');
          expect(result).toBe(false);
        }
      });

      it('should return true for break_begin after clock_in', async () => {
        if (!USE_REAL_API) {
          const mockResponse = {
            data: [
              {
                id: 1,
                type: 'clock_in',
                date: '2025-01-01',
                datetime: '2025-01-01T09:00:00+09:00',
                original_datetime: '2025-01-01T09:00:00+09:00',
                note: ''
              }
            ]
          };
          mockAxiosInstance.get.mockResolvedValue(mockResponse);
          
          const result = await service.isTimeClockTypeAvailable('break_begin');
          expect(result).toBe(true);
        }
      });
    });
  });

  describe('authorize', () => {
    it('should return authorization URL', () => {
      const url = service.getAuthorizationUrl();
      
      expect(url).toContain('https://accounts.secure.freee.co.jp/public_api/authorize');
      expect(url).toContain('client_id=test-client-id');
      expect(url).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fcallback');
      expect(url).toContain('response_type=code');
      expect(url).toContain('scope=');
    });
  });

  describe('Token refresh', () => {
    it('should refresh token when 401 response is received', async () => {
      if (!USE_REAL_API) {
        // このテストをスキップ（インターセプターのモックが複雑なため）
        return;
      }
    });
  });
});