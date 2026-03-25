vi.mock('../paths', () => ({
   getDataDir: vi.fn().mockReturnValue('/tmp/clawui-test-dt'),
}))

vi.mock('fs', () => ({
   existsSync: vi.fn(),
   readFileSync: vi.fn(),
   writeFileSync: vi.fn(),
}))

import { existsSync, readFileSync, writeFileSync } from 'fs'
import { loadDeviceAuthToken, storeDeviceAuthToken, clearDeviceAuthToken } from './device-token'

const VALID_STORE = {
   version: 1,
   deviceId: 'device-123',
   tokens: {
      operator: {
         token: 'tok-abc',
         role: 'operator',
         scopes: ['read', 'write'],
         updatedAtMs: 1000,
      },
   },
}

describe('device-token', () => {
   beforeEach(() => {
      vi.clearAllMocks()
   })

   // ── loadDeviceAuthToken ──

   describe('loadDeviceAuthToken', () => {
      it('returns null when file does not exist', () => {
         vi.mocked(existsSync).mockReturnValue(false)
         const result = loadDeviceAuthToken({ deviceId: 'device-123', role: 'operator' })
         expect(result).toBeNull()
      })

      it('returns null when deviceId does not match', () => {
         vi.mocked(existsSync).mockReturnValue(true)
         vi.mocked(readFileSync).mockReturnValue(JSON.stringify(VALID_STORE))
         const result = loadDeviceAuthToken({ deviceId: 'other-device', role: 'operator' })
         expect(result).toBeNull()
      })

      it('returns token entry when deviceId and role match', () => {
         vi.mocked(existsSync).mockReturnValue(true)
         vi.mocked(readFileSync).mockReturnValue(JSON.stringify(VALID_STORE))
         const result = loadDeviceAuthToken({ deviceId: 'device-123', role: 'operator' })
         expect(result).toEqual({
            token: 'tok-abc',
            role: 'operator',
            scopes: ['read', 'write'],
            updatedAtMs: 1000,
         })
      })

      it('returns null when role does not exist', () => {
         vi.mocked(existsSync).mockReturnValue(true)
         vi.mocked(readFileSync).mockReturnValue(JSON.stringify(VALID_STORE))
         const result = loadDeviceAuthToken({ deviceId: 'device-123', role: 'admin' })
         expect(result).toBeNull()
      })

      it('normalizes role to lowercase', () => {
         vi.mocked(existsSync).mockReturnValue(true)
         vi.mocked(readFileSync).mockReturnValue(JSON.stringify(VALID_STORE))
         const result = loadDeviceAuthToken({ deviceId: 'device-123', role: '  Operator  ' })
         expect(result).not.toBeNull()
      })

      it('returns null on parse error', () => {
         vi.mocked(existsSync).mockReturnValue(true)
         vi.mocked(readFileSync).mockReturnValue('invalid json')
         const result = loadDeviceAuthToken({ deviceId: 'device-123', role: 'operator' })
         expect(result).toBeNull()
      })

      it('returns null for invalid store format', () => {
         vi.mocked(existsSync).mockReturnValue(true)
         vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ version: 2 }))
         const result = loadDeviceAuthToken({ deviceId: 'device-123', role: 'operator' })
         expect(result).toBeNull()
      })
   })

   // ── storeDeviceAuthToken ──

   describe('storeDeviceAuthToken', () => {
      it('creates new store when none exists', () => {
         vi.mocked(existsSync).mockReturnValue(false)
         storeDeviceAuthToken({
            deviceId: 'dev-1',
            role: 'operator',
            token: 'new-tok',
            scopes: ['read'],
         })
         expect(writeFileSync).toHaveBeenCalledOnce()
         const written = JSON.parse(vi.mocked(writeFileSync).mock.calls[0][1] as string)
         expect(written.version).toBe(1)
         expect(written.deviceId).toBe('dev-1')
         expect(written.tokens.operator.token).toBe('new-tok')
         expect(written.tokens.operator.scopes).toEqual(['read'])
      })

      it('adds to existing store with matching deviceId', () => {
         vi.mocked(existsSync).mockReturnValue(true)
         vi.mocked(readFileSync).mockReturnValue(JSON.stringify(VALID_STORE))
         storeDeviceAuthToken({
            deviceId: 'device-123',
            role: 'admin',
            token: 'admin-tok',
         })
         const written = JSON.parse(vi.mocked(writeFileSync).mock.calls[0][1] as string)
         expect(written.tokens.admin.token).toBe('admin-tok')
         expect(written.tokens.operator.token).toBe('tok-abc') // preserved
      })

      it('creates new store when deviceId differs', () => {
         vi.mocked(existsSync).mockReturnValue(true)
         vi.mocked(readFileSync).mockReturnValue(JSON.stringify(VALID_STORE))
         storeDeviceAuthToken({
            deviceId: 'different-device',
            role: 'operator',
            token: 'new-tok',
         })
         const written = JSON.parse(vi.mocked(writeFileSync).mock.calls[0][1] as string)
         expect(written.deviceId).toBe('different-device')
         expect(Object.keys(written.tokens)).toHaveLength(1)
      })

      it('defaults scopes to empty array', () => {
         vi.mocked(existsSync).mockReturnValue(false)
         storeDeviceAuthToken({ deviceId: 'dev-1', role: 'op', token: 't' })
         const written = JSON.parse(vi.mocked(writeFileSync).mock.calls[0][1] as string)
         expect(written.tokens.op.scopes).toEqual([])
      })
   })

   // ── clearDeviceAuthToken ──

   describe('clearDeviceAuthToken', () => {
      it('does nothing when store does not exist', () => {
         vi.mocked(existsSync).mockReturnValue(false)
         clearDeviceAuthToken({ deviceId: 'device-123', role: 'operator' })
         expect(writeFileSync).not.toHaveBeenCalled()
      })

      it('does nothing when deviceId does not match', () => {
         vi.mocked(existsSync).mockReturnValue(true)
         vi.mocked(readFileSync).mockReturnValue(JSON.stringify(VALID_STORE))
         clearDeviceAuthToken({ deviceId: 'other-device', role: 'operator' })
         expect(writeFileSync).not.toHaveBeenCalled()
      })

      it('removes token for matching role', () => {
         vi.mocked(existsSync).mockReturnValue(true)
         vi.mocked(readFileSync).mockReturnValue(JSON.stringify(VALID_STORE))
         clearDeviceAuthToken({ deviceId: 'device-123', role: 'operator' })
         const written = JSON.parse(vi.mocked(writeFileSync).mock.calls[0][1] as string)
         expect(written.tokens).not.toHaveProperty('operator')
      })

      it('does nothing when role not found', () => {
         vi.mocked(existsSync).mockReturnValue(true)
         vi.mocked(readFileSync).mockReturnValue(JSON.stringify(VALID_STORE))
         clearDeviceAuthToken({ deviceId: 'device-123', role: 'nonexistent' })
         expect(writeFileSync).not.toHaveBeenCalled()
      })
   })
})
