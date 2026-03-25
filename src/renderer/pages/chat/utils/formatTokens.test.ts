import {
   formatTokenCount,
   formatInputTokens,
   formatOutputTokens,
   formatCacheReadTokens,
   formatContextPercent,
   formatMessageTime,
} from './formatTokens'

describe('formatTokenCount', () => {
   it('returns "0" for undefined', () => {
      expect(formatTokenCount(undefined)).toBe('0')
   })

   it('returns "0" for NaN', () => {
      expect(formatTokenCount(NaN)).toBe('0')
   })

   it('returns string for small numbers', () => {
      expect(formatTokenCount(42)).toBe('42')
      expect(formatTokenCount(999)).toBe('999')
   })

   it('formats thousands with k suffix', () => {
      expect(formatTokenCount(1000)).toBe('1.0k')
      expect(formatTokenCount(1500)).toBe('1.5k')
      expect(formatTokenCount(9999)).toBe('10.0k')
   })

   it('formats large thousands without decimal', () => {
      expect(formatTokenCount(10000)).toBe('10k')
      expect(formatTokenCount(50000)).toBe('50k')
   })

   it('formats millions with m suffix', () => {
      expect(formatTokenCount(1000000)).toBe('1.0m')
      expect(formatTokenCount(2500000)).toBe('2.5m')
   })

   it('clamps negative values to 0', () => {
      expect(formatTokenCount(-100)).toBe('0')
   })
})

describe('formatInputTokens', () => {
   it('returns null for undefined', () => {
      expect(formatInputTokens(undefined)).toBeNull()
   })

   it('returns null for 0', () => {
      expect(formatInputTokens(0)).toBeNull()
   })

   it('returns formatted with up arrow', () => {
      expect(formatInputTokens(1500)).toBe('↑1.5k')
   })
})

describe('formatOutputTokens', () => {
   it('returns null for undefined', () => {
      expect(formatOutputTokens(undefined)).toBeNull()
   })

   it('returns null for 0', () => {
      expect(formatOutputTokens(0)).toBeNull()
   })

   it('returns formatted with down arrow', () => {
      expect(formatOutputTokens(500)).toBe('↓500')
   })
})

describe('formatCacheReadTokens', () => {
   it('returns null for undefined', () => {
      expect(formatCacheReadTokens(undefined)).toBeNull()
   })

   it('returns null for 0', () => {
      expect(formatCacheReadTokens(0)).toBeNull()
   })

   it('returns formatted with R prefix', () => {
      expect(formatCacheReadTokens(2000)).toBe('R2.0k')
   })
})

describe('formatContextPercent', () => {
   it('returns null when sessionTotalTokens is undefined', () => {
      expect(formatContextPercent(undefined, 100000)).toBeNull()
   })

   it('returns null when contextTokens is undefined', () => {
      expect(formatContextPercent(50000, undefined)).toBeNull()
   })

   it('returns null when contextTokens is 0', () => {
      expect(formatContextPercent(50000, 0)).toBeNull()
   })

   it('returns percentage string', () => {
      expect(formatContextPercent(50000, 100000)).toBe('50% ctx')
   })

   it('caps at 999%', () => {
      expect(formatContextPercent(100000, 1)).toBe('999% ctx')
   })
})

describe('formatMessageTime', () => {
   it('formats timestamp as HH:MM', () => {
      // 2026-03-25T08:30:00Z
      const ts = new Date('2026-03-25T08:30:00Z').getTime()
      const result = formatMessageTime(ts)
      // Exact value depends on timezone, just verify format
      expect(result).toMatch(/^\d{2}:\d{2}$/)
   })
})
