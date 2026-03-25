import { renderHook, act } from '@testing-library/react'
import { useLocalStorage } from './useLocalStorage'

function clearStorage() {
   // jsdom may not support localStorage.clear()
   const keys: string[] = []
   for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key) keys.push(key)
   }
   for (const key of keys) {
      localStorage.removeItem(key)
   }
}

describe('useLocalStorage', () => {
   beforeEach(() => {
      clearStorage()
   })

   it('returns defaultValue when key does not exist', () => {
      const { result } = renderHook(() => useLocalStorage('missing', 'default'))
      expect(result.current[0]).toBe('default')
   })

   it('returns stored value when key exists', () => {
      localStorage.setItem('existing', JSON.stringify('stored'))
      const { result } = renderHook(() => useLocalStorage('existing', 'default'))
      expect(result.current[0]).toBe('stored')
   })

   it('persists value to localStorage on set', () => {
      const { result } = renderHook(() => useLocalStorage('key', 'initial'))

      act(() => {
         result.current[1]('updated')
      })

      expect(result.current[0]).toBe('updated')
      expect(JSON.parse(localStorage.getItem('key')!)).toBe('updated')
   })

   it('supports functional updater', () => {
      const { result } = renderHook(() => useLocalStorage<number>('counter', 0))

      act(() => {
         result.current[1]((prev) => prev + 1)
      })
      expect(result.current[0]).toBe(1)

      act(() => {
         result.current[1]((prev) => prev + 10)
      })
      expect(result.current[0]).toBe(11)
   })

   it('falls back to defaultValue on JSON parse failure', () => {
      localStorage.setItem('broken', 'not-valid-json')
      const { result } = renderHook(() => useLocalStorage('broken', 'fallback'))
      expect(result.current[0]).toBe('fallback')
   })

   it('handles object values', () => {
      const { result } = renderHook(() =>
         useLocalStorage<{ name: string }>('obj', { name: 'default' }),
      )

      act(() => {
         result.current[1]({ name: 'updated' })
      })

      expect(result.current[0]).toEqual({ name: 'updated' })
      expect(JSON.parse(localStorage.getItem('obj')!)).toEqual({ name: 'updated' })
   })
})
