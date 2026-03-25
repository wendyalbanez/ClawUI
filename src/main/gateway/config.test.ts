vi.mock('../paths', () => ({
   getDataDir: vi.fn().mockReturnValue('/tmp/clawui-test-cfg'),
}))

vi.mock('fs', () => ({
   existsSync: vi.fn(),
   readFileSync: vi.fn(),
   writeFileSync: vi.fn(),
}))

vi.mock('crypto', () => ({
   generateKeyPairSync: vi.fn().mockReturnValue({
      publicKey: {
         export: vi
            .fn()
            .mockReturnValue(
               '-----BEGIN PUBLIC KEY-----\nMOCK\n-----END PUBLIC KEY-----\n',
            ),
      },
      privateKey: {
         export: vi
            .fn()
            .mockReturnValue(
               '-----BEGIN PRIVATE KEY-----\nMOCK\n-----END PRIVATE KEY-----\n',
            ),
      },
   }),
   createHash: vi.fn().mockReturnValue({
      update: vi.fn().mockReturnThis(),
      digest: vi.fn().mockReturnValue('mock-device-id-hash'),
   }),
   createPublicKey: vi.fn().mockReturnValue({
      export: vi.fn().mockReturnValue(Buffer.alloc(44)),
   }),
   createPrivateKey: vi.fn(),
   sign: vi.fn().mockReturnValue(Buffer.from('mock-signature')),
}))

import { existsSync, readFileSync, writeFileSync } from 'fs'
import {
   loadConfig,
   saveConfig,
   saveGatewayMode,
   saveBuiltinConfig,
   getGatewayMode,
   markOnboardingCompleted,
   loadOrCreateKeyPair,
} from './config'

const VALID_CONFIG = {
   gatewayUrl: 'ws://localhost:18789',
   token: 'test-token',
   deviceId: 'test-device-id',
   mode: 'builtin' as const,
   builtinToken: 'builtin-tok',
   builtinPort: 18789,
   onboardingCompleted: true,
}

describe('config', () => {
   beforeEach(() => {
      vi.clearAllMocks()
   })

   // ── loadConfig ──

   describe('loadConfig', () => {
      it('returns null when config file does not exist', () => {
         vi.mocked(existsSync).mockReturnValue(false)
         expect(loadConfig()).toBeNull()
      })

      it('returns parsed config when file exists', () => {
         vi.mocked(existsSync).mockReturnValue(true)
         vi.mocked(readFileSync).mockReturnValue(JSON.stringify(VALID_CONFIG))
         const config = loadConfig()
         expect(config).toEqual(VALID_CONFIG)
      })

      it('returns null on parse error', () => {
         vi.mocked(existsSync).mockReturnValue(true)
         vi.mocked(readFileSync).mockReturnValue('invalid json')
         expect(loadConfig()).toBeNull()
      })
   })

   // ── saveConfig ──

   describe('saveConfig', () => {
      it('writes config preserving existing fields', () => {
         vi.mocked(existsSync).mockReturnValue(true)
         vi.mocked(readFileSync).mockReturnValue(JSON.stringify(VALID_CONFIG))

         saveConfig({ gatewayUrl: 'ws://new-url:8080', token: 'new-token' })

         expect(writeFileSync).toHaveBeenCalled()
         const written = JSON.parse(vi.mocked(writeFileSync).mock.calls[0][1] as string)
         expect(written.gatewayUrl).toBe('ws://new-url:8080')
         expect(written.token).toBe('new-token')
         expect(written.onboardingCompleted).toBe(true)
      })
   })

   // ── saveGatewayMode ──

   describe('saveGatewayMode', () => {
      it('writes mode while preserving other config', () => {
         vi.mocked(existsSync).mockReturnValue(true)
         vi.mocked(readFileSync).mockReturnValue(JSON.stringify(VALID_CONFIG))

         saveGatewayMode('external')

         const written = JSON.parse(vi.mocked(writeFileSync).mock.calls[0][1] as string)
         expect(written.mode).toBe('external')
         expect(written.gatewayUrl).toBe('ws://localhost:18789')
         expect(written.onboardingCompleted).toBe(true)
      })
   })

   // ── saveBuiltinConfig ──

   describe('saveBuiltinConfig', () => {
      it('writes builtin port and token', () => {
         vi.mocked(existsSync).mockReturnValue(true)
         vi.mocked(readFileSync).mockReturnValue(JSON.stringify(VALID_CONFIG))

         saveBuiltinConfig(18790, 'new-builtin-tok')

         const written = JSON.parse(vi.mocked(writeFileSync).mock.calls[0][1] as string)
         expect(written.builtinPort).toBe(18790)
         expect(written.builtinToken).toBe('new-builtin-tok')
         expect(written.onboardingCompleted).toBe(true)
      })
   })

   // ── getGatewayMode ──

   describe('getGatewayMode', () => {
      it('returns mode from config', () => {
         vi.mocked(existsSync).mockReturnValue(true)
         vi.mocked(readFileSync).mockReturnValue(JSON.stringify(VALID_CONFIG))
         expect(getGatewayMode()).toBe('builtin')
      })

      it('defaults to builtin when no config', () => {
         vi.mocked(existsSync).mockReturnValue(false)
         expect(getGatewayMode()).toBe('builtin')
      })
   })

   // ── markOnboardingCompleted ──

   describe('markOnboardingCompleted', () => {
      it('sets onboardingCompleted to true', () => {
         vi.mocked(existsSync).mockReturnValue(true)
         vi.mocked(readFileSync).mockReturnValue(
            JSON.stringify({ ...VALID_CONFIG, onboardingCompleted: false }),
         )

         markOnboardingCompleted()

         const written = JSON.parse(vi.mocked(writeFileSync).mock.calls[0][1] as string)
         expect(written.onboardingCompleted).toBe(true)
      })
   })

   // ── loadOrCreateKeyPair ──

   describe('loadOrCreateKeyPair', () => {
      it('loads existing key pair from file', () => {
         const stored = {
            publicKeyPem: '-----BEGIN PUBLIC KEY-----\nABC\n-----END PUBLIC KEY-----\n',
            privateKeyPem: '-----BEGIN PRIVATE KEY-----\nXYZ\n-----END PRIVATE KEY-----\n',
         }
         vi.mocked(existsSync).mockReturnValue(true)
         vi.mocked(readFileSync).mockReturnValue(JSON.stringify(stored))

         const result = loadOrCreateKeyPair()
         expect(result).toEqual(stored)
      })

      it('generates new key pair when file does not exist', () => {
         vi.mocked(existsSync).mockReturnValue(false)

         const result = loadOrCreateKeyPair()
         expect(result.publicKeyPem).toContain('BEGIN PUBLIC KEY')
         expect(result.privateKeyPem).toContain('BEGIN PRIVATE KEY')
         expect(writeFileSync).toHaveBeenCalled()
      })

      it('regenerates when file has invalid data', () => {
         vi.mocked(existsSync).mockReturnValue(true)
         vi.mocked(readFileSync).mockReturnValue(
            JSON.stringify({ publicKeyPem: '', privateKeyPem: '' }),
         )

         const result = loadOrCreateKeyPair()
         expect(result.publicKeyPem).toContain('BEGIN PUBLIC KEY')
         expect(writeFileSync).toHaveBeenCalled()
      })
   })
})
