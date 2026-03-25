import { renderHook, act } from '@testing-library/react'
import {
   pushEventLogEntry,
   clearEventLog,
   useEventLog,
   type EventLogEntry,
} from './eventLogStore'

// eventLogStore uses module-level state, so we need to clear it between tests
beforeEach(() => {
   clearEventLog()
})

describe('pushEventLogEntry', () => {
   it('adds entry to the log', () => {
      const { result } = renderHook(() => useEventLog())
      expect(result.current).toHaveLength(0)

      act(() => {
         pushEventLogEntry({ ts: 1000, event: 'test', payload: 'data' })
      })
      expect(result.current).toHaveLength(1)
      expect(result.current[0].event).toBe('test')
   })

   it('adds entries at the front (newest first)', () => {
      const { result } = renderHook(() => useEventLog())

      act(() => {
         pushEventLogEntry({ ts: 1, event: 'first' })
         pushEventLogEntry({ ts: 2, event: 'second' })
      })
      expect(result.current[0].event).toBe('second')
      expect(result.current[1].event).toBe('first')
   })

   it('caps at 250 entries', () => {
      const { result } = renderHook(() => useEventLog())

      act(() => {
         for (let i = 0; i < 260; i++) {
            pushEventLogEntry({ ts: i, event: `e-${i}` })
         }
      })
      expect(result.current).toHaveLength(250)
      // newest entry should be the last one pushed
      expect(result.current[0].event).toBe('e-259')
   })
})

describe('clearEventLog', () => {
   it('empties the log', () => {
      const { result } = renderHook(() => useEventLog())

      act(() => {
         pushEventLogEntry({ ts: 1, event: 'test' })
      })
      expect(result.current).toHaveLength(1)

      act(() => {
         clearEventLog()
      })
      expect(result.current).toHaveLength(0)
   })

   it('is a noop when already empty', () => {
      const { result } = renderHook(() => useEventLog())
      act(() => {
         clearEventLog()
      })
      expect(result.current).toHaveLength(0)
   })
})

describe('useEventLog', () => {
   it('returns current entries', () => {
      act(() => {
         pushEventLogEntry({ ts: 1, event: 'a' })
      })
      const { result } = renderHook(() => useEventLog())
      expect(result.current).toHaveLength(1)
   })
})
