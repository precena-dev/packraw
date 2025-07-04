import React, { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react';

interface WebViewProps {
  onReady: (webview: Electron.WebviewTag) => void;
}

export interface WebViewHandle {
  reload: () => void;
}

export const WebView = forwardRef<WebViewHandle, WebViewProps>(({ onReady }, ref) => {
  const webviewRef = useRef<Electron.WebviewTag>(null);
  const [config, setConfig] = useState<any>(null);

  useImperativeHandle(ref, () => ({
    reload: () => {
      if (webviewRef.current) {
        webviewRef.current.reload();
      }
    }
  }));

  useEffect(() => {
    // 設定情報を取得
    window.electronAPI.getConfig().then(setConfig);
  }, []);

  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview || !config) return;

    const handleDomReady = () => {
      // Chromeのユーザーエージェントとプロファイル情報を設定
      webview.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      onReady(webview);
    };

    webview.addEventListener('dom-ready', handleDomReady);

    webview.src = config.app.freee.url;

    return () => {
      webview.removeEventListener('dom-ready', handleDomReady);
    };
  }, [onReady, config]);

  if (!config) {
    return <div className="w-full h-full flex items-center justify-center">設定読み込み中...</div>;
  }

  const partitionName = `persist:freee-${config.user.profile}`;

  return (
    <webview
      ref={webviewRef}
      className="w-full h-full"
      partition={partitionName}
      webpreferences="contextIsolation=false"
    />
  );
});