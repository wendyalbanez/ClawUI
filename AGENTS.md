# ClawUI 开发基本指南
本文档为 ClawUI 项目开发提供基本的规范指南。

## 项目概述
ClawUI 是一个为 OpenClaw 开发的跨平台桌面应用，基于 Electron、React、TypeScript、Antd、AgentScope Spark Design 和 Vite 构建。

## 技术栈

| 分类 | 技术 | 版本 |
|------|------|------|
| 桌面运行时 | Electron | 40.x |
| 前端框架 | React | 19.x |
| 开发语言 | TypeScript | 5.9.x |
| 构建工具 | Vite | 7.x |
| 包管理器 | pnpm | 10.30.x |
| UI 组件 | @agentscope-ai/chat, @agentscope-ai/design, antd | - |
| WebSocket | ws | 8.x |

## 编码规范

### 代码格式化 (Prettier)

```yaml
printWidth: 100         # 行宽 100
tabWidth: 3             # 缩进宽度 3 空格
```

### TypeScript 配置

- 目标：ESNext
- 模块：ESNext (bundler 解析)
- 严格模式：启用
- JSX：react-jsx (自动转换)

### 资产放置
- 所需要的资产都放到：src/renderer/assets/目录下

## 注意事项

1. **错误处理**：所有异步操作需要 try-catch 包裹
2. **日志格式**：使用 `[ModuleName]` 前缀，如 `[GatewayClient]`
3. **中文支持**：用户界面文本使用中文
4. **类型安全**：避免使用 `any`，优先使用 `unknown` + 类型守卫
5. **清理监听器**：组件卸载时清理事件监听器，避免内存泄漏

## 最佳实践

### 替换第三方包中的远程图标

`@agentscope-ai/chat` 的 `Attachments` 组件内部使用 alicdn 远程 URL 作为文件类型图标。Electron 离线环境下这些 URL 不可用，需要替换为本地 SVG。

**实现方式：** 通过 Vite 插件 `src/renderer/plugins/replace-file-icons.ts` 在构建时完成替换：

- **本地图标位置**：`src/renderer/assets/icons/` 目录下的 SVG 文件
- **dev 模式**：通过 `optimizeDeps.esbuildOptions.plugins` 注入 esbuild 插件，在依赖预打包阶段将 alicdn URL 替换为内联 `data:image/svg+xml` data URL
- **production 构建**：通过 Rollup `transform` 钩子做同样替换

**注意事项：**
- 不要使用 `optimizeDeps.exclude` 排除 `@agentscope-ai/chat`，其内部依赖（如 `rc-util`）有 CJS/ESM 兼容问题，会导致白屏
- 新增文件类型图标时，需同时在 `ICON_MAP` 中添加 alicdn URL 映射和对应的本地 SVG 文件
- 如果上游包更新了图标 URL，插件会在控制台输出警告，需同步更新 `ICON_MAP`

## 参考文档

- 如果想知道 OpenClaw Gateway 协议怎么定义的，参考：/Users/lzmcoding/Code/openclaw/src/gateway/protocol
- 如果想知道怎么连接到 OpenClaw gateway 的，参考 OpenClaw UI 的实现：/Users/lzmcoding/Code/openclaw/ui
- 如果要了解 agentscope-ai 的使用，先参考内容大纲：docs/agentscope-ai/index，然后再参考详细内容：docs/agentscope-ai/all
- 如果想参考 agentscope-ai 怎么实现的，参考源码：/Users/lzmcoding/Code/agentscope-spark-design
- OpenClaw 项目 github ：https://github.com/openclaw/openclaw

## 内置 OpenClaw Gateway 打包指南

ClawUI 内置了 OpenClaw Gateway 子进程，打包时需要将 OpenClaw 的构建产物嵌入 Electron 应用。本节记录完整的打包方案和已知问题的解决方式。

### 架构概览

```
OpenClaw 源码 (../openclaw)
  ├── openclaw.mjs          # CLI 入口
  ├── dist/                  # tsdown 构建产物（~500 个 ESM chunk）
  ├── assets/                # 静态资源
  └── package.json           # 含 ~50+ npm 依赖

    ↓  scripts/prepare-openclaw.ts

resources/openclaw/          # 打包后的产物（无 node_modules）
  ├── openclaw.mjs
  ├── dist/                  # esbuild 二次打包后的 chunk（依赖已内联）
  ├── assets/
  └── package.json           # 仅含 {"type":"module"}

    ↓  electron-builder extraResources

<App>/Contents/Resources/openclaw/   # 最终在 .app 内的位置
```

### 核心问题：为什么需要 esbuild 二次打包

electron-builder 的 `extraResources` 功能**硬编码排除 `node_modules/` 目录**，无法通过配置绕过。而 OpenClaw 的 dist/ 文件中包含大量裸模块导入（tslog, ws, zod, express, chalk 等 50+ 个包），运行时如果找不到 node_modules 就会报 `ERR_MODULE_NOT_FOUND`。

**解决方案**：在 `scripts/prepare-openclaw.ts` 中用 esbuild 对 OpenClaw 的 dist/ 做二次打包，将所有 npm 依赖内联到 bundle 中，然后删除 node_modules。

**已尝试但失败的方案（不要重试）：**
- `.npmignore` 空文件方案：无法阻止 electron-builder 的硬编码排除
- `node_vendor` 重命名方案：electron-builder 的排除逻辑不仅针对目录名

### 打包流程 (`scripts/prepare-openclaw.ts`)

1. **复制产物**：从 OpenClaw 源码目录复制 `openclaw.mjs`、`dist/`、`assets/` 到 `resources/openclaw/`
2. **安装依赖**：复制精简版 `package.json`（仅 dependencies），运行 `npm install --production` 安装到临时 `node_modules`（供 esbuild 解析用）
3. **esbuild 二次打包**：
   - 入口：`dist/entry.js`
   - 配置：`bundle: true`, `platform: 'node'`, `format: 'esm'`, `splitting: true`
   - 产出写入 `dist-bundled/`，然后替换原 `dist/`
4. **清理**：删除 `node_modules`，将 `package.json` 替换为 `{"type":"module"}`

### esbuild 配置中的关键设计决策

#### 1. EXTERNAL_PACKAGES（外部化列表）

以下包不会被内联，因为是原生模块或 Gateway 不需要的超大包（OpenClaw 内部会优雅降级）：

```
sharp, @img/*, koffi, @lydell/node-pty*, @napi-rs/canvas*,
node-llama-cpp, @node-llama-cpp/*, sqlite-vec,
@matrix-org/matrix-sdk-crypto-nodejs, playwright-core, pdfjs-dist
```

**维护规则**：如果 OpenClaw 新增了原生模块依赖，需要添加到此列表。判断标准：包含 `.node` 二进制文件的包必须外部化。

#### 2. createRequire Banner 注入

```javascript
banner: {
   js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);",
}
```

**原因**：esbuild 将 CJS 模块转换为 ESM 输出时，CJS 中的 `require()` 调用会变成 esbuild 的 `__require` shim，无法处理 `require("node:assert")` 等 Node.js 内置模块。注入 `createRequire` 后提供真正的 `require` 函数。

**症状**：如果缺少此 banner，运行时会报 `Dynamic require of "node:assert" is not supported`。

#### 3. exports map 修复插件 (`createExportsFixPlugin`)

OpenClaw dist 中存在 `import fileType from "file-type/core.js"` 这样的导入，但 `file-type` 包的 exports map 只定义了 `./core`（不带 `.js`），且 `core.js` 没有 default export（只有 named exports）。

插件通过两步解决：
1. **`onResolve`**：拦截 `file-type/core.js` 导入，重定向到虚拟命名空间 `fix-default-export`
2. **`onLoad`**：返回包装模块代码，re-export 所有 named exports 并将 namespace 作为 default export

```javascript
// 虚拟模块输出：
export * from '/abs/path/to/node_modules/file-type/core.js';
import * as _ns from '/abs/path/to/node_modules/file-type/core.js';
export default _ns;
```

**维护规则**：如果 OpenClaw 更新后出现类似的 `No matching export for import "default"` 或 exports map 解析失败错误，需要在 `RESOLVE_OVERRIDES` 中添加对应映射。

### Gateway 子进程管理 (`src/main/gateway/process-manager.ts`)

#### 进程启动方式

使用 Electron 自身可执行文件 + `ELECTRON_RUN_AS_NODE=1` 运行 OpenClaw：

```typescript
spawn(process.execPath, [openclawPath, 'gateway', 'run', '--allow-unconfigured'], {
   argv0: 'clawui-builtin-openclaw',   // 进程名，方便 ps 查看
   env: { ELECTRON_RUN_AS_NODE: '1', ... },
   cwd: dirname(openclawPath),
})
```

#### 端口和认证

- 端口范围：`18788-18799`，自动选择可用端口
- 认证模式：`token`，随机生成 48 字符 hex token
- 配置文件自动写入 `~/.openclaw/openclaw.json`（与 CLI 共享配置）

#### 启动成功判断

监听 stdout，检测 `listening on` 字符串出现即认为启动成功，超时 30 秒。

#### 崩溃恢复

非预期退出时自动重试，指数退避（800ms → 1.6s → 3.2s → ... → 最大 15s）。

### 目录结构

```
~/.clawui/                          # ClawUI 数据目录（src/main/paths.ts）
  └── process-manager.log            # Gateway 进程诊断日志

~/.openclaw/                        # OpenClaw 配置与状态目录（内置 Gateway 与 CLI 共享）
  ├── openclaw.json                  # Gateway 配置（含 token、model provider 等）
  └── canvas/                        # Gateway 运行时数据
```

### 构建命令

| 命令 | 说明 |
|------|------|
| `pnpm prepare:openclaw` | 准备 OpenClaw 产物（复制 + esbuild 打包） |
| `pnpm build:mac:bundled` | 完整构建：prepare + vite build + electron-builder |

`prepare:openclaw` 默认从 `../openclaw` 读取源码，可通过 `--openclaw-dir` 指定路径。

### 排错指南

| 症状 | 原因 | 解决 |
|------|------|------|
| `ERR_MODULE_NOT_FOUND: Cannot find package 'xxx'` | 某个包未被 esbuild 内联，或被错误地加入了 EXTERNAL_PACKAGES | 检查 EXTERNAL_PACKAGES 列表，确认该包是否应该外部化 |
| `Dynamic require of "node:xxx" is not supported` | createRequire banner 缺失或被覆盖 | 检查 esbuild 配置中的 `banner.js` |
| `No matching export for import "default"` | 某个 ESM 包没有 default export，但被以 default import 方式引用 | 在 `createExportsFixPlugin` 的 RESOLVE_OVERRIDES 中添加映射 |
| `MODULE_TYPELESS_PACKAGE_JSON` 警告 | resources/openclaw/package.json 缺少 `"type":"module"` | 确认 bundleOpenClaw 末尾写入了 `{"type":"module"}` |
| Gateway 启动超时（30s） | 子进程崩溃或端口被占用 | 查看 `~/.clawui/process-manager.log` 中的 stderr 输出 |
| esbuild 打包时 `Could not resolve "xxx/yyy.js"` | 第三方包的 exports map 不兼容深层导入 | 在 createExportsFixPlugin 中处理，或将该包加入 EXTERNAL_PACKAGES |

### 关键文件索引

| 文件 | 职责 |
|------|------|
| `scripts/prepare-openclaw.ts` | OpenClaw 产物准备和 esbuild 二次打包 |
| `src/main/gateway/process-manager.ts` | Gateway 子进程生命周期管理 |
| `src/main/paths.ts` | 数据目录管理（~/.clawui） |
| `src/main/gateway/config.ts` | Gateway 内置配置读写 |
| `electron-builder.config.ts` | electron-builder 打包配置（extraResources） |