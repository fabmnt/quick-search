import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import { app, App, BrowserWindow, globalShortcut, ipcMain, Menu, shell, Tray } from 'electron'
import { join } from 'path'
import icon from '../../resources/icon.png?asset'
// Express imports
import cors from 'cors'
import express from 'express'
import streamAi from './stream-ai'
// Add isQuitting property to app object
interface AppWithIsQuitting extends App {
  isQuitting: boolean
}

// Cast app to our extended interface
const appWithQuitting = app as AppWithIsQuitting
appWithQuitting.isQuitting = false

// Set app to start at login
app.setLoginItemSettings({
  openAtLogin: true,
  openAsHidden: true // App starts minimized in the tray
})

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let expressApp: express.Express | null = null
const PORT = 3131

// Create Express server
function createExpressServer(): void {
  expressApp = express()

  expressApp.use(express.json())
  // Define routes
  expressApp.use(cors({ origin: '*' }))
  expressApp.use('/api/', streamAi)

  // API endpoint for app info
  expressApp.get('/api/app-info', (_, res) => {
    res.json({
      appName: app.getName(),
      appVersion: app.getVersion(),
      electronVersion: process.versions.electron,
      nodeVersion: process.versions.node,
      platform: process.platform,
      isDevMode: is.dev
    })
  })

  // Start server
  expressApp.listen(PORT, () => {
    console.log(`Express server running on port ${PORT}`)
  })
}

function createWindow(): void {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 900,
    height: 520,
    resizable: false,
    show: false,
    autoHideMenuBar: true,
    title: 'Quick Search',
    roundedCorners: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  // Create tray icon
  createTray()

  // Register local escape key shortcut to hide the window
  mainWindow.webContents.on('before-input-event', (_, input) => {
    if (input.type === 'keyDown' && input.key === 'Escape') {
      if (mainWindow && mainWindow.isFocused()) {
        mainWindow.hide()
      }
    }
  })

  // Prevent window from being closed, hide it instead
  mainWindow.on('close', (event): boolean => {
    if (mainWindow && !appWithQuitting.isQuitting) {
      event.preventDefault()
      mainWindow.hide()
      return false
    }
    return true
  })

  mainWindow.on('ready-to-show', () => {
    if (mainWindow) mainWindow.show()
  })

  // Register global shortcut to show and focus the app
  globalShortcut.register('Alt+L', () => {
    if (mainWindow) {
      if (!mainWindow.isVisible()) {
        mainWindow.show()
      }
      if (!mainWindow.isFocused()) {
        mainWindow.focus()
      }
    }
  })

  // Unregister the shortcut when the window is closed
  mainWindow.on('closed', () => {
    globalShortcut.unregister('Alt+L')
    mainWindow = null
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Create tray icon with menu
function createTray(): void {
  if (!mainWindow) return

  tray = new Tray(icon)
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show App',
      click: (): void => {
        if (mainWindow) {
          mainWindow.show()
          mainWindow.focus()
        }
      }
    },
    {
      label: 'Quit',
      click: (): void => {
        appWithQuitting.isQuitting = true
        app.quit()
      }
    }
  ])

  tray.setToolTip('Quick Search')
  tray.setContextMenu(contextMenu)

  // Show app on tray icon click (Windows/Linux behavior)
  tray.on('click', (): void => {
    if (mainWindow) {
      mainWindow.show()
      mainWindow.focus()
    }
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  createWindow()

  // Start Express server
  createExpressServer()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  // Do nothing to keep the app running in the background
  // Only quit on macOS if user explicitly quits
  if (process.platform === 'darwin') {
    // On macOS, don't quit
  }
})

// Unregister all shortcuts when the app is about to quit
app.on('will-quit', () => {
  globalShortcut.unregister('Alt+L')
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
