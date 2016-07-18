import path from 'path';
import fs from 'fs';
import { BrowserWindow, Tray, app, Menu, protocol, shell, ipcMain } from 'electron';
import Positioner from 'electron-positioner';

const configFile = path.join(getUserHome(), '.postit.json');

function getUserHome() {
  return process.env.HOME || process.env.USERPROFILE;
}

function readFile(file, cb) {
  fs.readFile(file, "utf8", (err, data) => {
    if (err) {
      throw err;
    }
    cb(data);
  });
}

function writeFile(file, data, cb) {
  fs.writeFile(file, data, { encoding: 'utf8' }, err => {
    if (err) {
      throw err;
    }
    cb();
  });
}

function checkForFile(file, content, cb) {
  fs.exists(file, exists => {
    if (exists) {
      cb();
    } else {
      fs.writeFile(file, content, { flag: 'wx' }, (err, data) => {
        cb();
      })
    }
  });
}

function setupConfig(cb) {
  const defaultConfig = JSON.stringify({
    store: path.join(getUserHome(), '.postit.md')
  }, null, 2);
  checkForFile(configFile, defaultConfig, () => {
    readFile(configFile, content => {
      const config = JSON.parse(content);
      const storeFile = config.store;
      checkForFile(storeFile, '# Hello PostIt !!!', () => {
        cb(storeFile);
      });
    });
  });
}

app.on('ready', () => {

  function fullInit(storeFile) {
    if (app.dock) app.dock.hide();
    protocol.interceptHttpProtocol('http', (request, callback) => {
      shell.openExternal(request.url);
    }, (error) => {
      if (error) console.error('Failed to register http protocol');
    });
    protocol.interceptHttpProtocol('https', (request, callback) => {
      shell.openExternal(request.url);
    }, (error) => {
      if (error) console.error('Failed to register https protocol');
    });
    const view = 'file://' + path.join(__dirname, '..', '..', 'static', 'index.html');
    const iconPath = path.join(__dirname, '..', '..', 'static', 'notepad.png');
    const tray =  new Tray(iconPath);
    tray.setToolTip('Just some nice markdown notes ...');

    const win = new BrowserWindow({ width: 600, height: 800, show: false, frame: false });
    win.on('blur', () => hideWindow());
    win.setVisibleOnAllWorkspaces(true);
    win.loadURL(view);
    win.webContents.on('did-finish-load', () => {
      readFile(storeFile, data => {
        win.webContents.send('lifecycle-event', { event: 'init', initalText: data });
      })
    });

    const positioner = new Positioner(win);
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Reload',
        accelerator: 'CmdOrCtrl+R',
        click(item, focusedWindow) {
          if (focusedWindow) focusedWindow.reload();
        }
      },
      {
        type: 'separator'
      },
      {
        label: 'Quit',
        accelerator: 'CmdOrCtrl+Q',
        click(item, focusedWindow) {
          app.quit();
        }
      }
    ]);

    function hideWindow() {
      win.hide();
    }

    function showWindow(trayPos) {
      let noBoundsPosition = (process.platform === 'win32') ? 'bottomRight' : 'trayCenter';
      let position = positioner.calculate(noBoundsPosition, trayPos);
      win.setPosition(position.x, position.y);
      win.show();
    }

    function clicked(e, bounds) {
      if (e.altKey || e.shiftKey || e.ctrlKey || e.metaKey) return hideWindow();
      if (win && win.isVisible()) return hideWindow();
      showWindow(bounds);
    }

    tray.on('click', (e, bounds) => {
      clicked(e, bounds);
    });
    tray.on('right-click', (e, bounds) => {
      tray.popUpContextMenu(contextMenu);
    });
    tray.on('double-click', clicked);

    ipcMain.on('save-content-to-file', (evt, payload) => {
      writeFile(storeFile, payload.text, () => '');
    });
    ipcMain.on('console.log', (evt, payload) => {
      console.log(payload);
    });
  }

  setupConfig(storeFile => {
    fullInit(storeFile);
  })
});
