const {app, BrowserWindow} = require('electron')
const path = require('path')
function createWindow () {
  const mainWindow = new BrowserWindow({
    width: 1080,
    height: 720,
    resizable: false,
    icon: __dirname + '/icon.ico',
    webPreferences: {
        nodeIntegration: true,
        enableRemoteModule: true
    }
  });
  //mainWindow.removeMenu();
  mainWindow.loadFile('index.html');
}

app.whenReady().then(function() {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  })
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})
