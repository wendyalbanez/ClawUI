import { truncateStr, summarizeValue, createLogger } from './logger'

describe('truncateStr', () => {
   it('returns string as-is when under limit', () => {
      expect(truncateStr('hello', 10)).toBe('hello')
   })

   it('returns string as-is when exactly at limit', () => {
      expect(truncateStr('abcde', 5)).toBe('abcde')
   })

   it('truncates and adds ellipsis when over limit', () => {
      expect(truncateStr('abcdef', 5)).toBe('abcde…')
   })

   it('handles empty string', () => {
      expect(truncateStr('')).toBe('')
   })

   it('uses default limit of 15', () => {
      const long = 'a'.repeat(20)
      expect(truncateStr(long)).toBe('a'.repeat(15) + '…')
   })
})

describe('summarizeValue', () => {
   it('returns "undefined" for undefined', () => {
      expect(summarizeValue(undefined)).toBe('undefined')
   })

   it('serializes primitives', () => {
      expect(summarizeValue(42)).toBe('42')
      expect(summarizeValue(true)).toBe('true')
      expect(summarizeValue(null)).toBe('null')
      expect(summarizeValue('hello')).toBe('"hello"')
   })

   it('truncates long string fields in objects', () => {
      const obj = { name: 'a'.repeat(20) }
      const result = JSON.parse(summarizeValue(obj))
      expect(result.name).toBe('a'.repeat(15) + '…')
   })

   it('handles nested objects and arrays', () => {
      const obj = { a: { b: [1, 'short', 'a'.repeat(20)] } }
      const result = JSON.parse(summarizeValue(obj))
      expect(result.a.b[0]).toBe(1)
      expect(result.a.b[1]).toBe('short')
      expect(result.a.b[2]).toBe('a'.repeat(15) + '…')
   })

   it('falls back to String() on circular reference', () => {
      const obj: Record<string, unknown> = {}
      obj.self = obj
      const result = summarizeValue(obj)
      expect(typeof result).toBe('string')
   })

   it('accepts custom limit', () => {
      expect(summarizeValue('abcde', 3)).toBe('"abc…"')
   })
})

describe('createLogger', () => {
   it('returns an object with log, warn, error, debug', () => {
      const logger = createLogger('TestModule')
      expect(typeof logger.log).toBe('function')
      expect(typeof logger.warn).toBe('function')
      expect(typeof logger.error).toBe('function')
      expect(typeof logger.debug).toBe('function')
   })

   it('calls console.log with module prefix', () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const logger = createLogger('MyModule')
      logger.log('test message')
      expect(spy).toHaveBeenCalledTimes(1)
      const call = spy.mock.calls[0]
      expect(call[0]).toMatch(/^\[\d{2}:\d{2}:\d{2}\.\d{3}\] \[MyModule\] test message$/)
   })

   it('calls console.warn for warn()', () => {
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const logger = createLogger('Mod')
      logger.warn('warning')
      expect(spy).toHaveBeenCalledTimes(1)
      expect(spy.mock.calls[0][0]).toContain('[Mod]')
   })

   it('calls console.error for error()', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const logger = createLogger('Mod')
      logger.error('err')
      expect(spy).toHaveBeenCalledTimes(1)
   })

   it('passes additional args', () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const logger = createLogger('Mod')
      logger.log('msg', 'extra1', 42)
      expect(spy).toHaveBeenCalledWith(expect.any(String), 'extra1', 42)
   })
})
