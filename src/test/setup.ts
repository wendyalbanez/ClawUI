import '@testing-library/jest-dom'
import { createMockClawAPI } from './mocks/clawAPI'

// Polyfill localStorage for jsdom environments where it may be incomplete (Node 22+)
function ensureLocalStorage() {
   if (typeof globalThis.localStorage === 'undefined' || typeof globalThis.localStorage.getItem !== 'function') {
      const store = new Map<string, string>()
      const storage: Storage = {
         get length() {
            return store.size
         },
         clear() {
            store.clear()
         },
         getItem(key: string) {
            return store.get(key) ?? null
         },
         key(index: number) {
            return [...store.keys()][index] ?? null
         },
         removeItem(key: string) {
            store.delete(key)
         },
         setItem(key: string, value: string) {
            store.set(key, String(value))
         },
      }
      Object.defineProperty(globalThis, 'localStorage', { value: storage, writable: true })
   }
}

ensureLocalStorage()

// Install window.clawAPI mock before every test
beforeEach(() => {
   window.clawAPI = createMockClawAPI()
})

afterEach(() => {
   vi.restoreAllMocks()
   try {
      localStorage.clear()
   } catch {
      // localStorage may not be available in all test environments
   }
})
