import {
   createMockApp,
   createMockIpcMain,
   createMockIpcRenderer,
   createMockContextBridge,
   createMockShell,
} from './mocks/electron'
import { MockWebSocket } from './mocks/websocket'

// Mock electron module
vi.mock('electron', () => ({
   app: createMockApp(),
   ipcMain: createMockIpcMain(),
   ipcRenderer: createMockIpcRenderer(),
   contextBridge: createMockContextBridge(),
   shell: createMockShell(),
   BrowserWindow: vi.fn(),
   Menu: { buildFromTemplate: vi.fn(), setApplicationMenu: vi.fn() },
}))

// Mock ws module
vi.mock('ws', () => ({
   default: MockWebSocket,
   WebSocket: MockWebSocket,
}))

beforeEach(() => {
   MockWebSocket.reset()
})

afterEach(() => {
   vi.restoreAllMocks()
})
