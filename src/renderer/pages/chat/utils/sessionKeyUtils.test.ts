import {
   parseAgentSessionKey,
   isSameSessionKey,
   buildAgentSessionKey,
} from './sessionKeyUtils'

describe('parseAgentSessionKey', () => {
   it('returns null for empty string', () => {
      expect(parseAgentSessionKey('')).toBeNull()
   })

   it('returns null for undefined', () => {
      expect(parseAgentSessionKey(undefined)).toBeNull()
   })

   it('returns null for non-agent prefix', () => {
      expect(parseAgentSessionKey('main')).toBeNull()
      expect(parseAgentSessionKey('user:default:main')).toBeNull()
   })

   it('returns null for fewer than 3 parts', () => {
      expect(parseAgentSessionKey('agent:default')).toBeNull()
   })

   it('parses valid agent session key', () => {
      const result = parseAgentSessionKey('agent:default:main')
      expect(result).toEqual({ agentId: 'default', rest: 'main' })
   })

   it('handles uppercase input (case insensitive)', () => {
      const result = parseAgentSessionKey('AGENT:Default:Main')
      expect(result).toEqual({ agentId: 'default', rest: 'main' })
   })

   it('handles multi-part rest', () => {
      const result = parseAgentSessionKey('agent:myagent:sub:session')
      expect(result).toEqual({ agentId: 'myagent', rest: 'sub:session' })
   })
})

describe('isSameSessionKey', () => {
   it('returns true for exact match', () => {
      expect(isSameSessionKey('main', 'main')).toBe(true)
   })

   it('returns true for shorthand vs full key', () => {
      expect(isSameSessionKey('main', 'agent:default:main')).toBe(true)
      expect(isSameSessionKey('agent:default:main', 'main')).toBe(true)
   })

   it('returns true for two identical full keys', () => {
      expect(isSameSessionKey('agent:default:main', 'agent:default:main')).toBe(true)
   })

   it('returns false for different sessions', () => {
      expect(isSameSessionKey('main', 'other')).toBe(false)
      expect(isSameSessionKey('agent:a:main', 'agent:b:main')).toBe(false)
   })

   it('returns false for empty strings', () => {
      expect(isSameSessionKey('', '')).toBe(false)
      expect(isSameSessionKey('main', '')).toBe(false)
      expect(isSameSessionKey('', 'main')).toBe(false)
   })

   it('returns false for undefined', () => {
      expect(isSameSessionKey(undefined, undefined)).toBe(false)
      expect(isSameSessionKey('main', undefined)).toBe(false)
   })

   it('is case insensitive', () => {
      expect(isSameSessionKey('MAIN', 'main')).toBe(true)
   })
})

describe('buildAgentSessionKey', () => {
   it('builds correct key', () => {
      expect(buildAgentSessionKey('default', 'main')).toBe('agent:default:main')
   })

   it('builds with custom agent id', () => {
      expect(buildAgentSessionKey('myagent', 'session1')).toBe('agent:myagent:session1')
   })
})
