import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
   resolve: {
      alias: {
         '@': resolve(__dirname, 'src/renderer'),
      },
   },
   test: {
      globals: true,
      environment: 'node',
      setupFiles: ['src/test/setup-main.ts'],
      include: ['src/main/**/*.test.ts', 'src/preload/**/*.test.ts'],
      exclude: ['**/node_modules/**', 'dist/**'],
      testTimeout: 30_000,
      unstubEnvs: true,
      unstubGlobals: true,
      coverage: {
         provider: 'v8',
         reporter: ['text', 'lcov', 'html'],
         exclude: [
            'src/**/*.test.ts',
            'src/test/**',
            'src/renderer/**',
            'src/shared/**',
            'src/main/index.ts',
         ],
      },
   },
})
