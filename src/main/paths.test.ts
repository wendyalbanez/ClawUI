import { join } from 'path'

vi.mock('os', () => ({
   homedir: vi.fn().mockReturnValue('/tmp/test-home'),
}))

vi.mock('fs', () => ({
   existsSync: vi.fn().mockReturnValue(false),
   mkdirSync: vi.fn(),
}))

import { existsSync, mkdirSync } from 'fs'

describe('getDataDir', () => {
   beforeEach(() => {
      vi.resetModules()
      vi.clearAllMocks()
   })

   it('returns ~/.clawui path', async () => {
      const { getDataDir } = await import('./paths')
      const result = getDataDir()
      expect(result).toBe(join('/tmp/test-home', '.clawui'))
   })

   it('creates directory if it does not exist', async () => {
      vi.mocked(existsSync).mockReturnValue(false)
      const { getDataDir } = await import('./paths')
      getDataDir()
      expect(mkdirSync).toHaveBeenCalledWith(
         join('/tmp/test-home', '.clawui'),
         { recursive: true },
      )
   })

   it('does not create directory if it already exists', async () => {
      vi.mocked(existsSync).mockReturnValue(true)
      const { getDataDir } = await import('./paths')
      getDataDir()
      expect(mkdirSync).not.toHaveBeenCalled()
   })

   it('caches result on subsequent calls', async () => {
      vi.mocked(existsSync).mockReturnValue(false)
      const { getDataDir } = await import('./paths')
      const first = getDataDir()
      const second = getDataDir()
      expect(first).toBe(second)
      // mkdirSync only called once due to caching
      expect(mkdirSync).toHaveBeenCalledTimes(1)
   })
})
