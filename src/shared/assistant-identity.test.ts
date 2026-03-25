import {
   normalizeAssistantIdentity,
   loadAssistantIdentity,
   DEFAULT_ASSISTANT_NAME,
   DEFAULT_ASSISTANT_AVATAR,
} from './assistant-identity'

describe('normalizeAssistantIdentity', () => {
   it('returns defaults for null input', () => {
      const result = normalizeAssistantIdentity(null)
      expect(result.name).toBe(DEFAULT_ASSISTANT_NAME)
      expect(result.avatar).toBeNull()
      expect(result.agentId).toBeNull()
   })

   it('returns defaults for undefined input', () => {
      const result = normalizeAssistantIdentity(undefined)
      expect(result.name).toBe(DEFAULT_ASSISTANT_NAME)
      expect(result.avatar).toBeNull()
   })

   it('returns defaults for empty strings', () => {
      const result = normalizeAssistantIdentity({ name: '', avatar: '', agentId: '' })
      expect(result.name).toBe(DEFAULT_ASSISTANT_NAME)
      expect(result.avatar).toBeNull()
      expect(result.agentId).toBeNull()
   })

   it('returns defaults for whitespace-only strings', () => {
      const result = normalizeAssistantIdentity({ name: '   ', avatar: '   ', agentId: '   ' })
      expect(result.name).toBe(DEFAULT_ASSISTANT_NAME)
      expect(result.avatar).toBeNull()
      expect(result.agentId).toBeNull()
   })

   it('passes through valid values', () => {
      const result = normalizeAssistantIdentity({
         name: 'Bot',
         avatar: 'B',
         agentId: 'agent-1',
      })
      expect(result.name).toBe('Bot')
      expect(result.avatar).toBe('B')
      expect(result.agentId).toBe('agent-1')
   })

   it('truncates name exceeding 50 characters', () => {
      const longName = 'a'.repeat(60)
      const result = normalizeAssistantIdentity({ name: longName })
      expect(result.name).toBe('a'.repeat(50))
   })

   it('truncates avatar exceeding 200 characters', () => {
      const longAvatar = 'x'.repeat(210)
      const result = normalizeAssistantIdentity({ avatar: longAvatar })
      expect(result.avatar).toBe('x'.repeat(200))
   })

   it('trims agentId', () => {
      const result = normalizeAssistantIdentity({ agentId: '  agent-1  ' })
      expect(result.agentId).toBe('agent-1')
   })
})

describe('loadAssistantIdentity', () => {
   it('returns null when not connected', async () => {
      const result = await loadAssistantIdentity({
         connected: false,
         sessionKey: 'main',
         rpc: vi.fn(),
      })
      expect(result).toBeNull()
   })

   it('returns normalized identity on rpc success', async () => {
      const mockRpc = vi.fn().mockResolvedValue({ name: 'TestBot', avatar: 'T' })
      const result = await loadAssistantIdentity({
         connected: true,
         sessionKey: 'main',
         rpc: mockRpc,
      })
      expect(result).toEqual({ agentId: null, name: 'TestBot', avatar: 'T' })
      expect(mockRpc).toHaveBeenCalledWith('agent.identity.get', { sessionKey: 'main' })
   })

   it('returns null when rpc returns null', async () => {
      const mockRpc = vi.fn().mockResolvedValue(null)
      const result = await loadAssistantIdentity({
         connected: true,
         sessionKey: 'main',
         rpc: mockRpc,
      })
      expect(result).toBeNull()
   })

   it('returns null when rpc throws', async () => {
      const mockRpc = vi.fn().mockRejectedValue(new Error('network error'))
      const result = await loadAssistantIdentity({
         connected: true,
         sessionKey: 'main',
         rpc: mockRpc,
      })
      expect(result).toBeNull()
   })

   it('passes empty params when sessionKey is empty', async () => {
      const mockRpc = vi.fn().mockResolvedValue({ name: 'Bot' })
      await loadAssistantIdentity({
         connected: true,
         sessionKey: '',
         rpc: mockRpc,
      })
      expect(mockRpc).toHaveBeenCalledWith('agent.identity.get', {})
   })
})
