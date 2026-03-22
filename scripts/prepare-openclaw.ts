/**
 * prepare-openclaw.ts
 *
 * 将 OpenClaw 的构建产物复制到 resources/openclaw/ 目录，
 * 供 electron-builder 打包时包含到 app.asar 外的 Resources 目录中。
 *
 * 用法：
 *   npx tsx scripts/prepare-openclaw.ts [--openclaw-dir <path>]
 *
 * 默认 OpenClaw 目录为 ../openclaw（与 ClawUI 同级）。
 */

import { cpSync, existsSync, mkdirSync, rmSync, readFileSync, writeFileSync } from 'fs'
import { execSync } from 'child_process'
import { join, resolve } from 'path'

const ROOT = resolve(__dirname, '..')

function parseArgs(): { openclawDir: string } {
   const args = process.argv.slice(2)
   let openclawDir = resolve(ROOT, '..', 'openclaw')

   for (let i = 0; i < args.length; i++) {
      if (args[i] === '--openclaw-dir' && args[i + 1]) {
         openclawDir = resolve(args[i + 1])
         i++
      }
   }

   return { openclawDir }
}

function main() {
   const { openclawDir } = parseArgs()
   const targetDir = join(ROOT, 'resources', 'openclaw')

   console.log('[prepare-openclaw] OpenClaw source:', openclawDir)
   console.log('[prepare-openclaw] Target dir:', targetDir)

   // 验证源目录
   const entryFile = join(openclawDir, 'openclaw.mjs')
   const distDir = join(openclawDir, 'dist')

   if (!existsSync(entryFile)) {
      console.error('[prepare-openclaw] ERROR: openclaw.mjs not found at', entryFile)
      console.error('[prepare-openclaw] Make sure OpenClaw is built before running this script.')
      process.exit(1)
   }

   if (!existsSync(distDir)) {
      console.error('[prepare-openclaw] ERROR: dist/ directory not found at', distDir)
      process.exit(1)
   }

   // 清理目标目录
   if (existsSync(targetDir)) {
      console.log('[prepare-openclaw] Cleaning existing target dir...')
      rmSync(targetDir, { recursive: true })
   }
   mkdirSync(targetDir, { recursive: true })

   // 复制入口文件
   console.log('[prepare-openclaw] Copying openclaw.mjs...')
   cpSync(entryFile, join(targetDir, 'openclaw.mjs'))

   // 复制 dist 目录
   console.log('[prepare-openclaw] Copying dist/ directory...')
   cpSync(distDir, join(targetDir, 'dist'), { recursive: true })

   // 复制 assets 目录（如果存在）
   const assetsDir = join(openclawDir, 'assets')
   if (existsSync(assetsDir)) {
      console.log('[prepare-openclaw] Copying assets/ directory...')
      cpSync(assetsDir, join(targetDir, 'assets'), { recursive: true })
   }

   // 复制 package.json 并安装生产依赖
   const pkgPath = join(openclawDir, 'package.json')
   if (existsSync(pkgPath)) {
      console.log('[prepare-openclaw] Copying package.json...')
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
      // 只保留 dependencies，删除 devDependencies 和其他不需要的字段
      const minimalPkg = {
         name: pkg.name,
         version: pkg.version,
         dependencies: pkg.dependencies,
      }
      writeFileSync(join(targetDir, 'package.json'), JSON.stringify(minimalPkg, null, 2))

      // 复制 lockfile（如果存在）以确保一致安装
      const lockfile = join(openclawDir, 'pnpm-lock.yaml')
      if (existsSync(lockfile)) {
         cpSync(lockfile, join(targetDir, 'pnpm-lock.yaml'))
      }

      console.log('[prepare-openclaw] Installing production dependencies...')
      execSync('npm install --production --ignore-scripts', {
         cwd: targetDir,
         stdio: 'inherit',
      })

      // 清理安装后的不必要文件
      const lockGenerated = join(targetDir, 'package-lock.json')
      if (existsSync(lockGenerated)) {
         rmSync(lockGenerated)
      }
      const pnpmLock = join(targetDir, 'pnpm-lock.yaml')
      if (existsSync(pnpmLock)) {
         rmSync(pnpmLock)
      }
   }

   console.log('[prepare-openclaw] Done!')
}

main()
