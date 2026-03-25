import { extractToolCalls, formatToolResultContent } from './extractToolCalls'

describe('formatToolResultContent', () => {
   it('returns string content directly', () => {
      expect(formatToolResultContent('hello')).toBe('hello')
   })

   it('joins text blocks from array', () => {
      const blocks = [
         { type: 'text', text: 'line 1' },
         { type: 'text', text: 'line 2' },
      ]
      expect(formatToolResultContent(blocks)).toBe('line 1\nline 2')
   })

   it('formats image blocks', () => {
      const blocks = [{ type: 'image', mimeType: 'image/png', bytes: 2048 }]
      expect(formatToolResultContent(blocks)).toBe('[image/png 2kb]')
   })

   it('formats image blocks with omitted flag', () => {
      const blocks = [{ type: 'image', mimeType: 'image/jpeg', bytes: 1024, omitted: true }]
      expect(formatToolResultContent(blocks)).toBe('[image/jpeg 1kb (omitted)]')
   })

   it('returns empty string for null/undefined', () => {
      expect(formatToolResultContent(null)).toBe('')
      expect(formatToolResultContent(undefined)).toBe('')
   })

   it('JSON stringifies non-string non-array values', () => {
      expect(formatToolResultContent({ key: 'value' })).toBe(
         JSON.stringify({ key: 'value' }, null, 2),
      )
   })

   it('handles mixed text and image blocks', () => {
      const blocks = [
         { type: 'text', text: 'Result:' },
         { type: 'image', mimeType: 'image/png' },
      ]
      const result = formatToolResultContent(blocks)
      expect(result).toContain('Result:')
      expect(result).toContain('[image/png]')
   })
})

describe('extractToolCalls', () => {
   it('returns empty array for undefined', () => {
      expect(extractToolCalls(undefined)).toEqual([])
   })

   it('returns empty array for string', () => {
      expect(extractToolCalls('text content' as unknown as undefined)).toEqual([])
   })

   it('returns empty array for empty array', () => {
      expect(extractToolCalls([])).toEqual([])
   })

   it('extracts Anthropic format (tool_use / tool_result)', () => {
      const blocks = [
         { type: 'tool_use', id: 'call-1', name: 'search', input: { query: 'test' } },
         { type: 'tool_result', tool_use_id: 'call-1', content: 'found results' },
      ]
      const result = extractToolCalls(blocks)
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('call-1')
      expect(result[0].name).toBe('search')
      expect(result[0].input).toEqual({ query: 'test' })
      expect(result[0].resultText).toBe('found results')
      expect(result[0].status).toBe('completed')
   })

   it('extracts OpenAI format (toolCall / toolResult)', () => {
      const blocks = [
         { type: 'toolCall', id: 'tc-1', name: 'calculator', arguments: '{"x":1}' },
         { type: 'toolResult', toolCallId: 'tc-1', content: '42' },
      ]
      const result = extractToolCalls(blocks)
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('tc-1')
      expect(result[0].name).toBe('calculator')
      expect(result[0].status).toBe('completed')
   })

   it('marks tool call as pending when no matching result', () => {
      const blocks = [{ type: 'tool_use', id: 'call-2', name: 'run', input: {} }]
      const result = extractToolCalls(blocks)
      expect(result).toHaveLength(1)
      expect(result[0].status).toBe('pending')
      expect(result[0].resultText).toBeUndefined()
   })

   it('handles multiple tool calls', () => {
      const blocks = [
         { type: 'tool_use', id: 'c1', name: 'search', input: {} },
         { type: 'tool_use', id: 'c2', name: 'read', input: {} },
         { type: 'tool_result', tool_use_id: 'c1', content: 'r1' },
      ]
      const result = extractToolCalls(blocks)
      expect(result).toHaveLength(2)
      expect(result[0].status).toBe('completed')
      expect(result[1].status).toBe('pending')
   })

   it('skips non-object blocks', () => {
      const blocks = [null, undefined, 'text', 42, { type: 'tool_use', id: 'c1', name: 'x', input: {} }]
      const result = extractToolCalls(blocks as unknown[])
      expect(result).toHaveLength(1)
   })

   it('handles function_call type', () => {
      const blocks = [
         { type: 'function_call', id: 'fc-1', name: 'func', arguments: '{}' },
      ]
      const result = extractToolCalls(blocks)
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('func')
   })

   it('detects tool call by name + arguments heuristic', () => {
      const blocks = [{ id: 'h1', name: 'myTool', arguments: { key: 'val' } }]
      const result = extractToolCalls(blocks)
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('myTool')
   })
})
