export function createMockApp() {
   return {
      getVersion: vi.fn().mockReturnValue('0.0.5-test'),
      isPackaged: false,
      getLocale: vi.fn().mockReturnValue('zh-CN'),
      getAppPath: vi.fn().mockReturnValue('/tmp/clawui-test'),
      getName: vi.fn().mockReturnValue('ClawUI'),
      whenReady: vi.fn().mockResolvedValue(undefined),
      on: vi.fn(),
      quit: vi.fn(),
      setName: vi.fn(),
   }
}

export function createMockIpcMain() {
   return {
      handle: vi.fn(),
      on: vi.fn(),
      removeHandler: vi.fn(),
   }
}

export function createMockIpcRenderer() {
   return {
      invoke: vi.fn().mockResolvedValue(undefined),
      on: vi.fn().mockReturnThis(),
      once: vi.fn(),
      removeAllListeners: vi.fn().mockReturnThis(),
      removeListener: vi.fn().mockReturnThis(),
      send: vi.fn(),
   }
}

export function createMockBrowserWindow() {
   return {
      webContents: {
         send: vi.fn(),
         openDevTools: vi.fn(),
      },
      isDestroyed: vi.fn().mockReturnValue(false),
      on: vi.fn(),
      loadFile: vi.fn(),
      loadURL: vi.fn(),
      show: vi.fn(),
      close: vi.fn(),
   }
}

export function createMockContextBridge() {
   return {
      exposeInMainWorld: vi.fn(),
   }
}

export function createMockShell() {
   return {
      openExternal: vi.fn().mockResolvedValue(undefined),
   }
}
