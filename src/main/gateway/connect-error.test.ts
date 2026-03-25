import { formatConnectError } from './connect-error'

describe('formatConnectError', () => {
   // ── Detail code → localized message ──

   it('returns localized message for AUTH_TOKEN_MISMATCH', () => {
      expect(
         formatConnectError({
            message: 'original msg',
            details: { code: 'AUTH_TOKEN_MISMATCH' },
         }),
      ).toBe('Gateway 令牌不匹配')
   })

   it('returns localized message for AUTH_UNAUTHORIZED', () => {
      expect(
         formatConnectError({
            message: 'orig',
            details: { code: 'AUTH_UNAUTHORIZED' },
         }),
      ).toBe('Gateway 认证失败')
   })

   it('returns localized message for AUTH_RATE_LIMITED', () => {
      expect(
         formatConnectError({
            message: 'orig',
            details: { code: 'AUTH_RATE_LIMITED' },
         }),
      ).toBe('认证尝试过于频繁，请稍后重试')
   })

   it('returns localized message for PAIRING_REQUIRED', () => {
      expect(
         formatConnectError({
            message: 'orig',
            details: { code: 'PAIRING_REQUIRED' },
         }),
      ).toBe('需要 Gateway 配对')
   })

   it('returns localized message for CONTROL_UI_DEVICE_IDENTITY_REQUIRED', () => {
      expect(
         formatConnectError({
            message: 'orig',
            details: { code: 'CONTROL_UI_DEVICE_IDENTITY_REQUIRED' },
         }),
      ).toBe('需要设备身份验证')
   })

   it('returns localized message for CONTROL_UI_ORIGIN_NOT_ALLOWED', () => {
      expect(
         formatConnectError({
            message: 'orig',
            details: { code: 'CONTROL_UI_ORIGIN_NOT_ALLOWED' },
         }),
      ).toBe('来源不被允许')
   })

   it('returns localized message for AUTH_TOKEN_MISSING', () => {
      expect(
         formatConnectError({
            message: 'orig',
            details: { code: 'AUTH_TOKEN_MISSING' },
         }),
      ).toBe('Gateway 令牌缺失')
   })

   it('returns localized message for AUTH_PASSWORD_MISSING', () => {
      expect(
         formatConnectError({
            message: 'orig',
            details: { code: 'AUTH_PASSWORD_MISSING' },
         }),
      ).toBe('密码缺失')
   })

   it('returns localized message for AUTH_PASSWORD_MISMATCH', () => {
      expect(
         formatConnectError({
            message: 'orig',
            details: { code: 'AUTH_PASSWORD_MISMATCH' },
         }),
      ).toBe('密码不匹配')
   })

   // ── Fetch-failed messages ──

   it('returns "Gateway 连接失败" for "fetch failed" variants', () => {
      expect(formatConnectError({ message: 'fetch failed' })).toBe('Gateway 连接失败')
      expect(formatConnectError({ message: 'Failed to fetch' })).toBe('Gateway 连接失败')
      expect(formatConnectError({ message: 'CONNECT FAILED' })).toBe('Gateway 连接失败')
      expect(formatConnectError({ message: '  Fetch Failed  ' })).toBe('Gateway 连接失败')
   })

   // ── Passthrough / fallback ──

   it('passes through generic message when no detail code matches', () => {
      expect(formatConnectError({ message: 'Some generic error' })).toBe('Some generic error')
   })

   it('returns "未知错误" for non-string message', () => {
      expect(formatConnectError({ message: 42 })).toBe('未知错误')
      expect(formatConnectError({})).toBe('未知错误')
   })

   it('returns "未知错误" for non-object error', () => {
      expect(formatConnectError(null)).toBe('未知错误')
      expect(formatConnectError(undefined)).toBe('未知错误')
      expect(formatConnectError(42)).toBe('未知错误')
   })

   it('extracts Error.message from Error instance in message field', () => {
      const inner = new Error('inner error')
      expect(formatConnectError({ message: inner })).toBe('inner error')
   })

   it('returns original message for unrecognized string', () => {
      expect(formatConnectError({ message: 'timeout' })).toBe('timeout')
   })
})
