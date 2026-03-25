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
      environment: 'jsdom',
      setupFiles: ['src/test/setup.ts'],
      include: [
         'src/renderer/**/*.test.ts',
         'src/renderer/**/*.test.tsx',
         'src/shared/**/*.test.ts',
      ],
      exclude: ['**/node_modules/**', 'dist/**'],
      testTimeout: 30_000,
      unstubEnvs: true,
      unstubGlobals: true,
      pool: 'forks',
      poolOptions: {
         forks: { singleFork: true },
      },
      coverage: {
         provider: 'v8',
         reporter: ['text', 'lcov', 'html'],
         // 注意：vitest 4.x v8 provider 中，设置 include 会触发全量文件扫描
         // （getCoverageMapForUncoveredFiles），不设 include 则只报告实际执行的文件
         exclude: [
            'src/**/*.test.ts',
            'src/**/*.test.tsx',
            'src/test/**',
            'src/main/**',
            'src/preload/**',
            'src/renderer/main.tsx',
            'src/renderer/plugins/**',
            'src/renderer/polyfills/**',
            'src/renderer/types/**',
            'src/renderer/styles/**',
            'src/renderer/assets/**',
         ],
      },
   },
})
