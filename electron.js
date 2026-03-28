const { app, BrowserWindow } = require('electron');
const path = require('path');

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
});