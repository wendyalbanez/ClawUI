import { cloneConfigObject, setPathValue, removePathValue } from './formUtils'

describe('cloneConfigObject', () => {
   it('creates a deep clone', () => {
      const original = { a: { b: 1 }, c: [2, 3] }
      const clone = cloneConfigObject(original)
      expect(clone).toEqual(original)
      expect(clone).not.toBe(original)
      expect(clone.a).not.toBe(original.a)
      expect(clone.c).not.toBe(original.c)
   })

   it('modifying clone does not affect original', () => {
      const original = { nested: { value: 42 } }
      const clone = cloneConfigObject(original)
      ;(clone.nested as Record<string, unknown>).value = 99
      expect((original.nested as Record<string, unknown>).value).toBe(42)
   })
})

describe('setPathValue', () => {
   it('sets a shallow path', () => {
      const obj = { a: 1 }
      const result = setPathValue(obj, ['a'], 2)
      expect(result.a).toBe(2)
      expect(obj.a).toBe(1) // original unchanged
   })

   it('sets a deep path', () => {
      const obj = { a: { b: { c: 1 } } }
      const result = setPathValue(obj, ['a', 'b', 'c'], 99)
      expect((result.a as Record<string, unknown>).b).toEqual({ c: 99 })
   })

   it('creates intermediate objects when path does not exist', () => {
      const obj: Record<string, unknown> = {}
      const result = setPathValue(obj, ['a', 'b'], 'value')
      expect((result.a as Record<string, unknown>).b).toBe('value')
   })

   it('creates intermediate arrays when next key is number', () => {
      const obj: Record<string, unknown> = {}
      const result = setPathValue(obj, ['items', 0], 'first')
      expect(Array.isArray(result.items)).toBe(true)
      expect((result.items as unknown[])[0]).toBe('first')
   })

   it('deletes key when value is undefined', () => {
      const obj = { a: 1, b: 2 }
      const result = setPathValue(obj, ['a'], undefined)
      expect('a' in result).toBe(false)
      expect(result.b).toBe(2)
   })

   it('returns a new object (immutable)', () => {
      const obj = { a: 1 }
      const result = setPathValue(obj, ['a'], 2)
      expect(result).not.toBe(obj)
   })
})

describe('removePathValue', () => {
   it('returns original object for empty path', () => {
      const obj = { a: 1 }
      const result = removePathValue(obj, [])
      expect(result).toEqual({ a: 1 })
      expect(result).toBe(obj)
   })

   it('removes an object key', () => {
      const obj = { a: 1, b: 2 }
      const result = removePathValue(obj, ['a'])
      expect('a' in result).toBe(false)
      expect(result.b).toBe(2)
   })

   it('splices array element by index', () => {
      const obj = { items: ['a', 'b', 'c'] }
      const result = removePathValue(obj, ['items', 1])
      expect(result.items).toEqual(['a', 'c'])
   })

   it('returns clone unchanged when intermediate path does not exist', () => {
      const obj = { a: 1 }
      const result = removePathValue(obj, ['nonexistent', 'deep'])
      expect(result).toEqual({ a: 1 })
   })

   it('removes nested key', () => {
      const obj = { a: { b: 1, c: 2 } }
      const result = removePathValue(obj, ['a', 'b'])
      expect(result.a).toEqual({ c: 2 })
   })
})
