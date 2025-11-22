const { app, components, BrowserWindow } = require('electron');
const os = require('os');
const crypto = require('crypto');

// Handle --quit command line argument for installer
if (process.argv.includes('--quit')) {
  app.quit();
  process.exit(0);
}

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

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
    appVersion: '8081'
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

  // Inject localStorage after page loads
  win.webContents.on('did-finish-load', () => {
    injectLocalStorage(win.webContents, machineInfo);
  });

  win.loadURL('https://app.theuniqueacademycommerce.com/dashboard');
}
app.whenReady().then(async () => {
  await components.whenReady();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
