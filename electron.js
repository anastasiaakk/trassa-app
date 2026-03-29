const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

function createWindow() {
  const win = new BrowserWindow({
    title: "Трасса",
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  win.loadURL(`file://${path.join(__dirname, 'dist', 'index.html')}`);
}

app.whenReady().then(() => {
  createWindow();

  // Проверка обновлений
  autoUpdater.checkForUpdatesAndNotify();

  autoUpdater.on("update-available", () => {
    dialog.showMessageBox({
      type: "info",
      title: "Обновление доступно",
      message: "Доступна новая версия приложения Трасса. Она будет скачана автоматически."
    });
  });

  autoUpdater.on("update-downloaded", () => {
    dialog.showMessageBox({
      type: "info",
      title: "Обновление готово",
      message: "Обновление скачано. Установить сейчас?",
      buttons: ["Да", "Позже"]
    }).then(result => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall();
      }
    });
  });
});