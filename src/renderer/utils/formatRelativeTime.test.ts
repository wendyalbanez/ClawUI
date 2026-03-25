import { formatRelativeTime } from './formatRelativeTime'

describe('formatRelativeTime', () => {
   beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-03-25T12:00:00.000Z'))
   })

   afterEach(() => {
      vi.useRealTimers()
   })

   it('returns "未知" for null', () => {
      expect(formatRelativeTime(null)).toBe('未知')
   })

   it('returns "未知" for undefined', () => {
      expect(formatRelativeTime(undefined)).toBe('未知')
   })

   it('returns "未知" for NaN', () => {
      expect(formatRelativeTime(NaN)).toBe('未知')
   })

   it('returns "未知" for Infinity', () => {
      expect(formatRelativeTime(Infinity)).toBe('未知')
   })

   it('returns "刚刚" for less than 60 seconds ago', () => {
      const now = Date.now()
      expect(formatRelativeTime(now - 30_000)).toBe('刚刚')
      expect(formatRelativeTime(now)).toBe('刚刚')
   })

   it('returns minutes format', () => {
      const now = Date.now()
      expect(formatRelativeTime(now - 5 * 60_000)).toBe('5m 前')
      expect(formatRelativeTime(now - 59 * 60_000)).toBe('59m 前')
   })

   it('returns hours format', () => {
      const now = Date.now()
      expect(formatRelativeTime(now - 3 * 3600_000)).toBe('3h 前')
      expect(formatRelativeTime(now - 47 * 3600_000)).toBe('47h 前')
   })

   it('returns days format for 48+ hours', () => {
      const now = Date.now()
      expect(formatRelativeTime(now - 48 * 3600_000)).toBe('2d 前')
      expect(formatRelativeTime(now - 72 * 3600_000)).toBe('3d 前')
   })

   it('returns "后" suffix for future timestamps', () => {
      const now = Date.now()
      expect(formatRelativeTime(now + 5 * 60_000)).toBe('5m 后')
   })
})
