import { BrowserWindow, session } from 'electron';

export class AuthManager {
  private authWindow: BrowserWindow | null = null;

  async startAuth(mainWindow: BrowserWindow): Promise<boolean> {
    return new Promise((resolve, reject) => {
      // 認証用の新しいウィンドウを作成
      this.authWindow = new BrowserWindow({
        width: 800,
        height: 600,
        parent: mainWindow,
        modal: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
        }
      });

      const authUrl = 'https://p.secure.freee.co.jp/#';
      this.authWindow.loadURL(authUrl);

      // 認証完了を検知
      this.authWindow.webContents.on('did-navigate', async (event, url) => {
        // ログイン成功後のURLパターンを確認
        if (!url.includes('login') && !url.includes('sign_in') && !url.includes('oauth')) {
          // 認証成功と判断
          try {
            // Cookieを取得
            const cookies = await this.authWindow!.webContents.session.cookies.get({});
            
            // メインアプリのセッションにCookieをコピー
            const mainSession = session.fromPartition('persist:freee');
            for (const cookie of cookies) {
              await mainSession.cookies.set({
                url: `https://${cookie.domain}`,
                name: cookie.name,
                value: cookie.value,
                domain: cookie.domain,
                path: cookie.path,
                secure: cookie.secure,
                httpOnly: cookie.httpOnly,
                expirationDate: cookie.expirationDate
              });
            }

            this.authWindow?.close();
            resolve(true);
          } catch (error) {
            console.error('Cookie transfer error:', error);
            reject(error);
          }
        }
      });

      this.authWindow.on('closed', () => {
        this.authWindow = null;
        resolve(false);
      });
    });
  }
}