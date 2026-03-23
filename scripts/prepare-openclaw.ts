/**
 * prepare-openclaw.ts
 *
 * 将 OpenClaw 的构建产物复制到 resources/openclaw/ 目录，
 * 用 esbuild 二次打包将所有 npm 依赖内联，
 * 供 electron-builder 打包时包含到 app.asar 外的 Resources 目录中。
 *
 * 用法：
 *   npx tsx scripts/prepare-openclaw.ts [--openclaw-dir <path>]
 *
 * 默认 OpenClaw 目录为 ../openclaw（与 ClawUI 同级）。
 */

import { cpSync, existsSync, mkdirSync, rmSync, readFileSync, writeFileSync, renameSync } from 'fs'
import { execSync } from 'child_process'
import { join, resolve } from 'path'
import { build, type Plugin } from 'esbuild'

const ROOT = resolve(__dirname, '..')

// 不可打包的原生模块 / 超大包（Gateway 运行时不需要，OpenClaw 内部会优雅降级）
const EXTERNAL_PACKAGES = [
   // 原生模块
   'sharp',
   '@img/*',
   'koffi',
   '@lydell/node-pty',
   '@lydell/node-pty-*',
   '@napi-rs/canvas',
   '@napi-rs/canvas-*',
   'node-llama-cpp',
   '@node-llama-cpp/*',
   'sqlite-vec',
   '@matrix-org/matrix-sdk-crypto-nodejs',
   // 超大包 / Gateway 不需要
   'playwright-core',
   'pdfjs-dist',
]

/**
 * 修正 exports map 不兼容的深层导入。
 * OpenClaw dist 中有 `import fileType from "file-type/core.js"` 这样的导入，
 * 但 file-type 的 exports map 只定义了 `./core`（不带 .js），
 * 且 core.js 没有 default export（只有 named exports）。
 * 此插件通过虚拟模块包装，同时解决路径解析和 default export 两个问题。
 */
function createExportsFixPlugin(nodeModulesDir: string): Plugin {
   // 需要修正的导入：映射到实际文件路径
   const RESOLVE_OVERRIDES: Record<string, string> = {
      'file-type/core.js': join(nodeModulesDir, 'file-type', 'core.js'),
   }

   const escapedKeys = Object.keys(RESOLVE_OVERRIDES).map((k) =>
      k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
   )
   const filter = new RegExp(`^(${escapedKeys.join('|')})$`)

   return {
      name: 'fix-exports-map',
      setup(b) {
         // 拦截导入并重定向到虚拟命名空间
         b.onResolve({ filter }, (args) => {
            const target = RESOLVE_OVERRIDES[args.path]
            if (target && existsSync(target)) {
               return { path: args.path, namespace: 'fix-default-export' }
            }
            return null
         })

         // 虚拟模块：re-export 所有 named exports，并将 namespace 作为 default export
         b.onLoad({ filter: /.*/, namespace: 'fix-default-export' }, (args) => {
            const realPath = RESOLVE_OVERRIDES[args.path]
            if (!realPath) return null
            // 使用绝对路径避免解析歧义
            const escaped = realPath.replace(/\\/g, '/')
            return {
               contents: `export * from '${escaped}';\nimport * as _ns from '${escaped}';\nexport default _ns;`,
               resolveDir: nodeModulesDir,
               loader: 'js',
            }
         })
      },
   }
}

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

/**
 * 用 esbuild 将 dist/ 中的所有 npm 依赖内联到 bundle 中。
 * 打包后 node_modules 不再需要，可以安全删除。
 */
async function bundleOpenClaw(targetDir: string): Promise<void> {
   const distDir = join(targetDir, 'dist')
   const bundledDir = join(targetDir, 'dist-bundled')

   const entryJs = join(distDir, 'entry.js')
   if (!existsSync(entryJs)) {
      console.error('[prepare-openclaw] ERROR: dist/entry.js not found, skipping bundle step')
      return
   }

   console.log('[prepare-openclaw] Bundling OpenClaw dist with esbuild...')

   await build({
      entryPoints: [entryJs],
      bundle: true,
      platform: 'node',
      format: 'esm',
      splitting: true,
      outdir: bundledDir,
      external: EXTERNAL_PACKAGES,
      plugins: [createExportsFixPlugin(join(targetDir, 'node_modules'))],
      // 注入 createRequire，让 esbuild 打包的 CJS 模块能正常 require Node.js 内置模块
      banner: {
         js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);",
      },
      logLevel: 'warning',
   })

   // 用打包结果替换原始 dist
   rmSync(distDir, { recursive: true })
   renameSync(bundledDir, distDir)

   // node_modules 不再需要
   const nodeModulesDir = join(targetDir, 'node_modules')
   if (existsSync(nodeModulesDir)) {
      console.log('[prepare-openclaw] Removing node_modules (deps inlined)...')
      rmSync(nodeModulesDir, { recursive: true })
   }

   // package.json 替换为最小版本（只保留 type: module 声明，消除 MODULE_TYPELESS_PACKAGE_JSON 警告）
   const pkgJson = join(targetDir, 'package.json')
   if (existsSync(pkgJson)) {
      rmSync(pkgJson)
   }
   writeFileSync(pkgJson, '{"type":"module"}\n')

   console.log('[prepare-openclaw] Bundle complete')
}

async function main() {
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

   // 复制 docs/reference/templates 目录（Gateway 运行时需要 workspace 模板文件）
   const templatesDir = join(openclawDir, 'docs', 'reference', 'templates')
   if (existsSync(templatesDir)) {
      console.log('[prepare-openclaw] Copying docs/reference/templates/ directory...')
      const targetTemplates = join(targetDir, 'docs', 'reference', 'templates')
      mkdirSync(targetTemplates, { recursive: true })
      cpSync(templatesDir, targetTemplates, { recursive: true })
   }

   // 复制 package.json 并安装生产依赖（供 esbuild 打包解析用）
   const pkgPath = join(openclawDir, 'package.json')
   if (existsSync(pkgPath)) {
      console.log('[prepare-openclaw] Copying package.json...')
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
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

   // esbuild 二次打包：内联所有 npm 依赖，删除 node_modules
   await bundleOpenClaw(targetDir)

   console.log('[prepare-openclaw] Done!')
}

main()
