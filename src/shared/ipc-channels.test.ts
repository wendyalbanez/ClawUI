import { IPC } from './ipc-channels'

describe('IPC channels', () => {
   it('exports IPC object with expected keys', () => {
      expect(IPC).toBeDefined()
      expect(typeof IPC).toBe('object')
      expect(IPC.GATEWAY_RPC).toBeDefined()
      expect(IPC.GATEWAY_CONNECT).toBeDefined()
      expect(IPC.GATEWAY_DISCONNECT).toBeDefined()
      expect(IPC.GATEWAY_EVENT).toBeDefined()
      expect(IPC.GATEWAY_STATE_CHANGED).toBeDefined()
      expect(IPC.APP_GET_INFO).toBeDefined()
      expect(IPC.SPEECH_TRANSCRIBE).toBeDefined()
   })

   it('has no duplicate channel values', () => {
      const values = Object.values(IPC)
      const unique = new Set(values)
      expect(unique.size).toBe(values.length)
   })

   it('all channel values are non-empty strings', () => {
      for (const [key, value] of Object.entries(IPC)) {
         expect(typeof value).toBe('string')
         expect(value.length).toBeGreaterThan(0)
         // Verify naming convention: namespace:action
         expect(value).toMatch(/^[a-z]+:[a-z-]+$/)
      }
   })

   it('contains all expected gateway channels', () => {
      const expectedKeys = [
         'GATEWAY_RPC',
         'GATEWAY_CONNECT',
         'GATEWAY_DISCONNECT',
         'GATEWAY_GET_STATUS',
         'GATEWAY_LOAD_CONFIG',
         'GATEWAY_SAVE_CONFIG',
         'GATEWAY_EVENT',
         'GATEWAY_STATE_CHANGED',
         'GATEWAY_GET_MODE',
         'GATEWAY_SET_MODE',
         'GATEWAY_BUILTIN_STATUS',
         'GATEWAY_BUILTIN_START',
         'GATEWAY_BUILTIN_STOP',
         'GATEWAY_BUILTIN_RESTART',
         'GATEWAY_CHECK_BUNDLED',
         'GATEWAY_BUILTIN_STATUS_CHANGED',
         'GATEWAY_MARK_ONBOARDING_COMPLETE',
      ]
      for (const key of expectedKeys) {
         expect(IPC).toHaveProperty(key)
      }
   })
})
