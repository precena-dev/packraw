import React, { useRef, useEffect } from 'react';
import { WebView, WebViewHandle } from './components/WebView';
import { ControlPanel } from './components/ControlPanel';
import { WorkingTimeDisplay } from './components/WorkingTimeDisplay';
import { useTimeTracker } from './hooks/useTimeTracker';

function App() {
  const webviewRef = useRef<Electron.WebviewTag | null>(null);
  const webviewHandleRef = useRef<WebViewHandle>(null);
  const { workingTime, isWorking, startWork, endWork } = useTimeTracker();

  useEffect(() => {
    // WebViewのリロードイベントをリッスン
    window.electronAPI.onReloadWebview(() => {
      webviewHandleRef.current?.reload();
    });
  }, []);

  const handleWebViewReady = (webview: Electron.WebviewTag) => {
    webviewRef.current = webview;
  };

  const handleClockIn = (type: 'start' | 'end' | 'break-start' | 'break-end') => {
    if (!webviewRef.current) return;

    const scripts = {
      'start': `document.querySelector('[data-action="clock_in"]')?.click()`,
      'end': `document.querySelector('[data-action="clock_out"]')?.click()`,
      'break-start': `document.querySelector('[data-action="break_begin"]')?.click()`,
      'break-end': `document.querySelector('[data-action="break_end"]')?.click()`
    };

    webviewRef.current.executeJavaScript(scripts[type])
      .then(() => {
        console.log('打刻成功');
        if (type === 'start') {
          startWork();
        } else if (type === 'end') {
          endWork();
        }
      })
      .catch((error) => {
        console.error('打刻エラー:', error);
      });
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <div className="bg-white shadow-sm p-4 flex justify-between items-center">
        <h1 className="text-lg font-semibold text-gray-800">freee打刻</h1>
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (webviewRef.current) {
                webviewRef.current.openDevTools();
              }
            }}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="開発者ツール"
          >
            <svg className="w-5 h-5 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
            </svg>
          </button>
          <button
            onClick={() => webviewHandleRef.current?.reload()}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="再読み込み"
          >
            <svg className="w-5 h-5 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 4v6h6M23 20v-6h-6" />
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
            </svg>
          </button>
        </div>
      </div>
      
      <WorkingTimeDisplay workingTime={workingTime} isWorking={isWorking} />
      
      <div className="flex-1">
        <WebView 
          ref={webviewHandleRef}
          onReady={handleWebViewReady}
        />
      </div>
      
      <ControlPanel onClockIn={handleClockIn} />
    </div>
  );
}

export default App;