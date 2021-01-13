/**
 * @Date:   2020-12-05T23:36:55+01:00
 * @Last modified time: 2021-01-13T22:06:50+01:00
 * @License: MIT
 */

const {app, BrowserWindow} = require('electron')
const path = require('path')
function createWindow () {
  const mainWindow = new BrowserWindow({
    width: 550,
    height: 300,
    resizable: false,
    icon: __dirname + '/icon.ico',
    webPreferences: {
        nodeIntegration: true,
        enableRemoteModule: true
    }
  })
  mainWindow.removeMenu();
  mainWindow.loadFile('index.html')
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})
