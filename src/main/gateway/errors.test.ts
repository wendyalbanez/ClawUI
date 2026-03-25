import {
   ConnectErrorDetailCodes,
   GatewayRequestError,
   resolveGatewayErrorDetailCode,
   readConnectErrorRecoveryAdvice,
   isNonRecoverableAuthError,
} from './errors'

// ── GatewayRequestError ──

describe('GatewayRequestError', () => {
   it('sets name, message, gatewayCode, and details', () => {
      const err = new GatewayRequestError({
         code: 'SOME_CODE',
         message: 'Something went wrong',
         details: { foo: 'bar' },
      })
      expect(err).toBeInstanceOf(Error)
      expect(err.name).toBe('GatewayRequestError')
      expect(err.message).toBe('Something went wrong')
      expect(err.gatewayCode).toBe('SOME_CODE')
      expect(err.details).toEqual({ foo: 'bar' })
   })

   it('works without details', () => {
      const err = new GatewayRequestError({ code: 'CODE', message: 'msg' })
      expect(err.details).toBeUndefined()
   })
})

// ── ConnectErrorDetailCodes ──

describe('ConnectErrorDetailCodes', () => {
   it('has expected auth-related codes', () => {
      expect(ConnectErrorDetailCodes.AUTH_REQUIRED).toBe('AUTH_REQUIRED')
      expect(ConnectErrorDetailCodes.AUTH_TOKEN_MISMATCH).toBe('AUTH_TOKEN_MISMATCH')
      expect(ConnectErrorDetailCodes.PAIRING_REQUIRED).toBe('PAIRING_REQUIRED')
   })

   it('key equals value for all entries', () => {
      for (const [key, value] of Object.entries(ConnectErrorDetailCodes)) {
         expect(key).toBe(value)
      }
   })
})

// ── resolveGatewayErrorDetailCode ──

describe('resolveGatewayErrorDetailCode', () => {
   it('returns code string from details object', () => {
      expect(resolveGatewayErrorDetailCode({ details: { code: 'AUTH_REQUIRED' } })).toBe(
         'AUTH_REQUIRED',
      )
   })

   it('returns null for null/undefined error', () => {
      expect(resolveGatewayErrorDetailCode(null)).toBeNull()
      expect(resolveGatewayErrorDetailCode(undefined)).toBeNull()
   })

   it('returns null when details is not an object', () => {
      expect(resolveGatewayErrorDetailCode({ details: 'string' })).toBeNull()
      expect(resolveGatewayErrorDetailCode({ details: 42 })).toBeNull()
      expect(resolveGatewayErrorDetailCode({})).toBeNull()
   })

   it('returns null when details is an array', () => {
      expect(resolveGatewayErrorDetailCode({ details: ['a'] })).toBeNull()
   })

   it('returns null when code is not a string', () => {
      expect(resolveGatewayErrorDetailCode({ details: { code: 123 } })).toBeNull()
      expect(resolveGatewayErrorDetailCode({ details: {} })).toBeNull()
   })

   it('returns null for empty/whitespace code', () => {
      expect(resolveGatewayErrorDetailCode({ details: { code: '' } })).toBeNull()
      expect(resolveGatewayErrorDetailCode({ details: { code: '   ' } })).toBeNull()
   })
})

// ── readConnectErrorRecoveryAdvice ──

describe('readConnectErrorRecoveryAdvice', () => {
   it('returns empty object for null/undefined/primitive', () => {
      expect(readConnectErrorRecoveryAdvice(null)).toEqual({})
      expect(readConnectErrorRecoveryAdvice(undefined)).toEqual({})
      expect(readConnectErrorRecoveryAdvice('string')).toEqual({})
   })

   it('returns empty object for array', () => {
      expect(readConnectErrorRecoveryAdvice([1, 2])).toEqual({})
   })

   it('extracts canRetryWithDeviceToken boolean', () => {
      expect(readConnectErrorRecoveryAdvice({ canRetryWithDeviceToken: true })).toEqual({
         canRetryWithDeviceToken: true,
      })
      expect(readConnectErrorRecoveryAdvice({ canRetryWithDeviceToken: false })).toEqual({
         canRetryWithDeviceToken: false,
      })
   })

   it('ignores non-boolean canRetryWithDeviceToken', () => {
      expect(readConnectErrorRecoveryAdvice({ canRetryWithDeviceToken: 'yes' })).toEqual({})
   })

   it('extracts valid recommendedNextStep', () => {
      expect(
         readConnectErrorRecoveryAdvice({ recommendedNextStep: 'retry_with_device_token' }),
      ).toEqual({ recommendedNextStep: 'retry_with_device_token' })

      expect(
         readConnectErrorRecoveryAdvice({ recommendedNextStep: 'update_auth_configuration' }),
      ).toEqual({ recommendedNextStep: 'update_auth_configuration' })

      expect(
         readConnectErrorRecoveryAdvice({ recommendedNextStep: 'wait_then_retry' }),
      ).toEqual({ recommendedNextStep: 'wait_then_retry' })
   })

   it('ignores invalid recommendedNextStep', () => {
      expect(readConnectErrorRecoveryAdvice({ recommendedNextStep: 'invalid_step' })).toEqual({})
      expect(readConnectErrorRecoveryAdvice({ recommendedNextStep: 42 })).toEqual({})
   })

   it('extracts both fields together', () => {
      const result = readConnectErrorRecoveryAdvice({
         canRetryWithDeviceToken: true,
         recommendedNextStep: 'update_auth_credentials',
      })
      expect(result).toEqual({
         canRetryWithDeviceToken: true,
         recommendedNextStep: 'update_auth_credentials',
      })
   })
})

// ── isNonRecoverableAuthError ──

describe('isNonRecoverableAuthError', () => {
   it('returns false for undefined error', () => {
      expect(isNonRecoverableAuthError(undefined)).toBe(false)
   })

   it('returns true for AUTH_TOKEN_MISSING', () => {
      expect(
         isNonRecoverableAuthError({
            code: 'auth_error',
            message: 'auth failed',
            details: { code: ConnectErrorDetailCodes.AUTH_TOKEN_MISSING },
         }),
      ).toBe(true)
   })

   it('returns true for PAIRING_REQUIRED', () => {
      expect(
         isNonRecoverableAuthError({
            code: 'auth_error',
            message: 'pairing needed',
            details: { code: ConnectErrorDetailCodes.PAIRING_REQUIRED },
         }),
      ).toBe(true)
   })

   it('returns true for AUTH_RATE_LIMITED', () => {
      expect(
         isNonRecoverableAuthError({
            code: 'auth_error',
            message: 'rate limited',
            details: { code: ConnectErrorDetailCodes.AUTH_RATE_LIMITED },
         }),
      ).toBe(true)
   })

   it('returns true for DEVICE_IDENTITY_REQUIRED', () => {
      expect(
         isNonRecoverableAuthError({
            code: 'auth_error',
            message: 'device identity',
            details: { code: ConnectErrorDetailCodes.DEVICE_IDENTITY_REQUIRED },
         }),
      ).toBe(true)
   })

   it('returns false for AUTH_TOKEN_MISMATCH (recoverable via device token retry)', () => {
      expect(
         isNonRecoverableAuthError({
            code: 'auth_error',
            message: 'mismatch',
            details: { code: ConnectErrorDetailCodes.AUTH_TOKEN_MISMATCH },
         }),
      ).toBe(false)
   })

   it('returns false for unknown detail codes', () => {
      expect(
         isNonRecoverableAuthError({
            code: 'auth_error',
            message: 'unknown',
            details: { code: 'UNKNOWN_CODE' },
         }),
      ).toBe(false)
   })

   it('returns false when error has no details', () => {
      expect(
         isNonRecoverableAuthError({ code: 'err', message: 'msg' }),
      ).toBe(false)
   })
})
