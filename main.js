const { app, components, BrowserWindow, Menu, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const os = require('os');
const crypto = require('crypto');

// Handle --quit command line argument for installer
if (process.argv.includes('--quit')) {
  app.quit();
  process.exit(0);
}

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

// Set app name
app.setName('Unique Academy App');

// Track main window and update state
let mainWindow = null;
let isQuittingForUpdate = false;

// Configure autoUpdater
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = false;

// Listen for update-downloaded event (Windows-specific handling)
autoUpdater.on('update-downloaded', () => {
  if (process.platform === 'win32') {
    // Set flag to allow window to close immediately
    isQuittingForUpdate = true;
    
    // Close the main window immediately to allow installer to proceed
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.removeAllListeners('close');
      mainWindow.close();
    }
    
    // Wait a short delay, then quit and install
    setTimeout(() => {
      autoUpdater.quitAndInstall(false, true);
    }, 1000);
  } else {
    // For other platforms, use standard behavior
    setTimeout(() => {
      autoUpdater.quitAndInstall();
    }, 1000);
  }
});

// Optional: Log update events for debugging
autoUpdater.on('checking-for-update', () => {
  console.log('Checking for update...');
});

autoUpdater.on('update-available', () => {
  console.log('Update available. Downloading...');
});

autoUpdater.on('update-not-available', () => {
  console.log('Update not available.');
});

autoUpdater.on('error', (error) => {
  console.error('AutoUpdater error:', error);
});

function getMachineInfo() {
  const networkInterfaces = os.networkInterfaces();
  const allMacs = [];
  let primaryMacAddress = '';

  // Collect all MAC addresses
  for (const interfaceName in networkInterfaces) {
    const interfaces = networkInterfaces[interfaceName];
    for (const iface of interfaces) {
      if (iface.mac && iface.mac !== '00:00:00:00:00:00' && !iface.internal) {
        allMacs.push(iface.mac);
        if (!primaryMacAddress) {
          primaryMacAddress = iface.mac;
        }
      }
    }
  }

  // Generate machineId from MAC address and hostname
  const machineIdSource = `${primaryMacAddress}-${os.hostname()}`;
  const machineId = crypto.createHash('sha256').update(machineIdSource).digest('hex');

  return {
    machineName: os.hostname(),
    macAddress: primaryMacAddress || '00:00:00:00:00:00',
    machineId: machineId,
    allMacs: allMacs.join(','),
    os: os.platform(),
    flag: process.platform === 'win32' ? 'win' : process.platform === 'darwin' ? 'mac' : 'linux',
    appVersion: '8085'
  };
}

function injectLocalStorage(webContents, machineInfo) {
  // Escape single quotes in values to prevent script injection
  const escapeValue = (value) => String(value).replace(/'/g, "\\'");
  
  const script = `
    localStorage.setItem('machineName', '${escapeValue(machineInfo.machineName)}');
    localStorage.setItem('macAddress', '${escapeValue(machineInfo.macAddress)}');
    localStorage.setItem('machineId', '${escapeValue(machineInfo.machineId)}');
    localStorage.setItem('allMacs', '${escapeValue(machineInfo.allMacs)}');
    localStorage.setItem('os', '${escapeValue(machineInfo.os)}');
    localStorage.setItem('flag', '${escapeValue(machineInfo.flag)}');
    localStorage.setItem('appVersion', '${escapeValue(machineInfo.appVersion)}');
  `;
  webContents.executeJavaScript(script);
}

function setCustomUserAgent(webContents) {
  const baseUA = webContents.getUserAgent();
  webContents.setUserAgent(`${baseUA} Unique Academy Desktop Application`);
}

const windowOptions = {
  width: 1200,
  height: 800,
  webPreferences: {
    nodeIntegration: false,
    sandbox: true,
    contextIsolation: true,
    webSecurity: true,
    plugins: true,
    devTools: false,
  },
};

function createWindow() {
  const machineInfo = getMachineInfo();
  
  const win = new BrowserWindow(windowOptions);
  mainWindow = win;
  
  // Enable screenshot prevention (content protection)
  win.setContentProtection(true);

  // Set custom user agent
  setCustomUserAgent(win.webContents);

  // Handle window open requests (for popups, etc.)
  win.webContents.setWindowOpenHandler(({ url }) => {
    const childWindow = new BrowserWindow({
      ...windowOptions,
      parent: win,
      modal: false,
      show: true,
    });
    childWindow.setContentProtection(true);
    setCustomUserAgent(childWindow.webContents);
    childWindow.loadURL(url);
    return { action: 'deny' };
  });

  // Handle window close event - allow quitting during update installation
  win.on('close', (event) => {
    // On Windows, if we're quitting for update, allow close immediately
    if (process.platform === 'win32' && isQuittingForUpdate) {
      mainWindow = null;
      return;
    }
    
    // For normal close on macOS, prevent default and hide window
    if (process.platform === 'darwin') {
      Menu.setApplicationMenu(null);
    }
  });

  // Inject localStorage after page loads
  win.webContents.on('did-finish-load', () => {
    injectLocalStorage(win.webContents, machineInfo);
  });

  win.loadURL('https://app.theuniqueacademycommerce.com/dashboard');

  // Setup custom menu
  setupMenu(win);
}

function setupMenu(mainWindow) {
  const menuTemplate = [
    {
      label: app.getName(),
      submenu: [
        {
          label: 'About ' + app.getName(),
          click: () => {
            showAboutDialog(mainWindow);
          },
        },
        {
          type: 'separator',
        },
        {
          label: 'Quit ' + app.getName(),
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          },
        },
      ],
    },
    {
      label: 'File',
    },
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);
}

function showAboutDialog(mainWindow) {
  const aboutOptions = {
    title: 'About ' + app.getName(),
    version: app.getVersion(),
    copyright: 'Copyright © Dtree Labs LLP',
    text: 'https://dtreelabs.com',
  };
  dialog.showMessageBox(mainWindow, aboutOptions);
}
app.whenReady().then(async () => {
  await components.whenReady();
  createWindow();
  
  // Check for updates after app is ready
  if (!app.isPackaged) {
    console.log('Skipping auto-update check in development mode');
  } else {
    autoUpdater.checkForUpdates();
    
    // Check for updates periodically (every 4 hours)
    setInterval(() => {
      autoUpdater.checkForUpdates();
    }, 4 * 60 * 60 * 1000);
  }
});

app.on('window-all-closed', () => {
  // Allow quit during update installation
  if (isQuittingForUpdate) {
    app.quit();
    return;
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle before-quit to ensure clean shutdown during update
app.on('before-quit', (event) => {
  if (isQuittingForUpdate) {
    // Allow quit to proceed
    return;
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
