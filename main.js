const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  // Create the browser window
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false // Note: For security, consider enabling contextIsolation in production
    }
  });

  // Load your web app's index.html
  win.loadFile('index.html');
  // Or, if your web app is hosted online, use:
  // win.loadURL('http://your-webapp-url.com');

  // Open DevTools (optional, remove in production)
  win.webContents.openDevTools();
}

// When Electron has finished initialization
app.whenReady().then(() => {
  createWindow();

  // Handle window creation for macOS when activating with no windows open
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});