import { autoUpdater } from 'electron-updater';
import { dialog, BrowserWindow, app } from 'electron';
import log from 'electron-log';

/**
 * 自動更新サービス
 * electron-updater を使用してアプリケーションの自動更新を管理
 */
export class UpdaterService {
  private mainWindow: BrowserWindow;

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
    this.setupAutoUpdater();
  }

  private setupAutoUpdater() {
    // 基本設定
    autoUpdater.autoDownload = false;        // ユーザー確認後にダウンロード
    autoUpdater.autoInstallOnAppQuit = true; // アプリ終了時に自動インストール

    // ロギング設定
    autoUpdater.logger = log;
    log.transports.file.level = 'info';

    // 開発環境では更新チェックをスキップ
    if (!app.isPackaged) {
      log.info('開発環境のため更新チェックをスキップ');
      return;
    }

    // 起動30秒後に初回更新チェック
    setTimeout(() => {
      this.checkForUpdates();
    }, 30000);

    // 6時間ごとに定期的な更新チェック
    setInterval(() => {
      this.checkForUpdates();
    }, 6 * 3600000);

    // イベントハンドラーの設定
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    // 更新チェック開始
    autoUpdater.on('checking-for-update', () => {
      log.info('更新を確認中...');
    });

    // 更新が利用可能
    autoUpdater.on('update-available', (info) => {
      log.info('更新が利用可能:', info.version);

      dialog.showMessageBox(this.mainWindow, {
        type: 'info',
        title: '更新が利用可能',
        message: `PackRaw ${info.version} が利用可能です。\n今すぐダウンロードしますか？`,
        detail: this.formatReleaseNotes(info.releaseNotes),
        buttons: ['ダウンロード', 'スキップ'],
        defaultId: 0,
        cancelId: 1
      }).then((result) => {
        if (result.response === 0) {
          autoUpdater.downloadUpdate();
          // レンダラープロセスに通知（オプション）
          this.mainWindow.webContents.send('update-downloading');
        }
      });
    });

    // 最新版（更新なし）
    autoUpdater.on('update-not-available', (info) => {
      log.info('最新版です:', info.version);
    });

    // ダウンロード進捗
    autoUpdater.on('download-progress', (progressObj) => {
      const percent = Math.round(progressObj.percent);
      log.info(`ダウンロード中: ${percent}% (${progressObj.bytesPerSecond} bytes/sec)`);

      // レンダラープロセスに進捗を通知（オプション）
      this.mainWindow.webContents.send('update-download-progress', percent);
    });

    // ダウンロード完了
    autoUpdater.on('update-downloaded', (info) => {
      log.info('更新のダウンロード完了:', info.version);

      dialog.showMessageBox(this.mainWindow, {
        type: 'info',
        title: '更新の準備完了',
        message: `PackRaw ${info.version} のインストール準備ができました。`,
        detail: 'アプリを再起動して更新を適用します。',
        buttons: ['今すぐ再起動', '次回起動時'],
        defaultId: 0,
        cancelId: 1
      }).then((result) => {
        if (result.response === 0) {
          // 即座に再起動してインストール
          autoUpdater.quitAndInstall(false, true);
        }
        // response === 1 の場合、autoInstallOnAppQuit により
        // 次回終了時に自動インストール
      });
    });

    // エラー処理
    autoUpdater.on('error', (error) => {
      log.error('更新エラー:', error);

      // ネットワークエラーなどの場合は静かに失敗する
      // ユーザーに毎回エラーダイアログを表示しない
      if (error.message.includes('Cannot find channel')) {
        log.info('GitHub Releasesに更新が見つかりません（初回リリース前の可能性）');
        return;
      }

      dialog.showMessageBox(this.mainWindow, {
        type: 'error',
        title: '更新エラー',
        message: '更新の確認中にエラーが発生しました。',
        detail: error.message,
        buttons: ['OK']
      });
    });
  }

  /**
   * 手動で更新チェックを実行
   */
  checkForUpdates() {
    if (!app.isPackaged) {
      log.info('開発環境のため更新チェックをスキップ');
      return;
    }

    log.info('手動更新チェックを開始');
    autoUpdater.checkForUpdates();
  }

  /**
   * リリースノートを整形
   */
  private formatReleaseNotes(notes: string | any): string {
    if (typeof notes === 'string') {
      return notes;
    }
    if (Array.isArray(notes) && notes.length > 0) {
      return notes[0]?.note || '詳細はリリースノートをご確認ください。';
    }
    return '詳細はリリースノートをご確認ください。';
  }
}
