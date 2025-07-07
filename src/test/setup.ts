import { vi } from 'vitest';

// Electronのグローバルモック
Object.defineProperty(global, 'BrowserWindow', {
  value: vi.fn().mockImplementation(() => ({
    loadURL: vi.fn(),
    close: vi.fn(),
    on: vi.fn(),
    webContents: {
      on: vi.fn()
    }
  })),
  writable: true
});

// Consoleログの設定
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

// テスト実行時にログを制御
if (process.env.NODE_ENV === 'test') {
  console.log = vi.fn();
  console.error = vi.fn();
}

// 実際のAPIテスト時はログを有効にする
if (process.env.TEST_REAL_API === 'true') {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
}