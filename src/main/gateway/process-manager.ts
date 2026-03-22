import { spawn, type ChildProcess } from 'child_process'
import { join } from 'path'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { randomBytes } from 'crypto'
import * as net from 'net'
import { app } from 'electron'
import type { GatewayProcessStatus } from './types'
import { saveBuiltinConfig } from './config'
import { createLogger } from '../../shared/logger'

const log = createLogger('ProcessManager')

// ── 常量 ──

const STARTUP_TIMEOUT_MS = 30_000
const SHUTDOWN_TIMEOUT_MS = 5_000
const INITIAL_RETRY_DELAY_MS = 800
const MAX_RETRY_DELAY_MS = 15_000
const PORT_RANGE_START = 19000
const PORT_RANGE_END = 19999

// ── 辅助函数 ──

function findAvailablePort(start: number, end: number): Promise<number> {
   return new Promise((resolve, reject) => {
      const server = net.createServer()
      server.unref()
      const tryPort = (port: number) => {
         if (port > end) {
            reject(new Error(`No available port in range ${start}-${end}`))
            return
         }
         server.once('error', () => tryPort(port + 1))
         server.once('listening', () => {
            server.close(() => resolve(port))
         })
         server.listen(port, '127.0.0.1')
      }
      tryPort(start)
   })
}

function generateToken(): string {
   return randomBytes(24).toString('hex')
}

// ── 主类 ──

export class GatewayProcessManager {
   private _status: GatewayProcessStatus = 'idle'
   private _process: ChildProcess | null = null
   private _port = 0
   private _token = ''
   private _retryDelay = INITIAL_RETRY_DELAY_MS
   private _retryTimer: ReturnType<typeof setTimeout> | null = null
   private _onStatusChanged: ((status: GatewayProcessStatus) => void) | null = null
   private _openclawPath: string
   private _stopping = false

   constructor() {
      this._openclawPath = this._resolveOpenClawPath()
      log.log('OpenClaw path: %s, available: %s', this._openclawPath, this.isAvailable())
   }

   // ── 公共属性 ──

   get status(): GatewayProcessStatus {
      return this._status
   }

   get port(): number {
      return this._port
   }

   get token(): string {
      return this._token
   }

   isAvailable(): boolean {
      return existsSync(this._openclawPath)
   }

   getStatus(): GatewayProcessStatus {
      return this._status
   }

   onStatusChanged(callback: (status: GatewayProcessStatus) => void): void {
      this._onStatusChanged = callback
   }

   // ── 生命周期 ──

   async start(): Promise<{ port: number; token: string }> {
      if (this._status === 'running' || this._status === 'starting') {
         return { port: this._port, token: this._token }
      }

      if (!this.isAvailable()) {
         throw new Error('OpenClaw is not bundled')
      }

      this._stopping = false
      this._setStatus('starting')

      try {
         this._port = await findAvailablePort(PORT_RANGE_START, PORT_RANGE_END)
         this._token = this._token || generateToken()
         log.log('Starting on port %d', this._port)

         await this._spawn()
         this._retryDelay = INITIAL_RETRY_DELAY_MS
         saveBuiltinConfig(this._port, this._token)
         return { port: this._port, token: this._token }
      } catch (err) {
         log.error('Start failed:', err)
         this._setStatus('crashed')
         this._scheduleRetry()
         throw err
      }
   }

   async stop(): Promise<void> {
      this._stopping = true
      this._clearRetryTimer()

      if (!this._process) {
         this._setStatus('idle')
         return
      }

      this._setStatus('stopping')
      const proc = this._process

      return new Promise<void>((resolve) => {
         const forceKill = setTimeout(() => {
            log.warn('Graceful shutdown timeout, sending SIGKILL')
            proc.kill('SIGKILL')
         }, SHUTDOWN_TIMEOUT_MS)

         proc.once('exit', () => {
            clearTimeout(forceKill)
            this._process = null
            this._setStatus('idle')
            resolve()
         })

         log.log('Sending SIGTERM to PID %d', proc.pid)
         proc.kill('SIGTERM')
      })
   }

   async restart(): Promise<{ port: number; token: string }> {
      await this.stop()
      this._stopping = false
      return this.start()
   }

   // ── 内部 ──

   private _resolveOpenClawPath(): string {
      // production: <app>/Contents/Resources/openclaw/openclaw.mjs
      // dev 环境: 不存在
      if (app.isPackaged) {
         return join(process.resourcesPath, 'openclaw', 'openclaw.mjs')
      }
      // dev 模式下尝试查找 resources 目录（方便调试）
      return join(app.getAppPath(), 'resources', 'openclaw', 'openclaw.mjs')
   }

   private _spawn(): Promise<void> {
      return new Promise<void>((resolve, reject) => {
         const electronExe = process.execPath
         // 使用独立的 state/config 目录，避免和用户本地 OpenClaw 配置冲突
         const builtinStateDir = join(app.getPath('userData'), 'openclaw-builtin')
         const builtinConfigPath = join(builtinStateDir, 'openclaw.json')
         const env: Record<string, string> = {
            ...(process.env as Record<string, string>),
            ELECTRON_RUN_AS_NODE: '1',
            OPENCLAW_GATEWAY_PORT: String(this._port),
            OPENCLAW_GATEWAY_AUTH_MODE: 'token',
            OPENCLAW_GATEWAY_AUTH_TOKEN: this._token,
            OPENCLAW_NO_RESPAWN: '1',
            OPENCLAW_STATE_DIR: builtinStateDir,
            OPENCLAW_CONFIG_PATH: builtinConfigPath,
         }

         // 确保内置实例的 state 目录和配置文件存在（预写 token 避免 Gateway 自动生成）
         if (!existsSync(builtinStateDir)) {
            mkdirSync(builtinStateDir, { recursive: true })
         }
         const builtinConfig = {
            gateway: {
               auth: {
                  mode: 'token',
                  token: this._token,
               },
            },
         }
         writeFileSync(builtinConfigPath, JSON.stringify(builtinConfig, null, 2))

         log.log('Spawning: %s %s (port=%d)', electronExe, this._openclawPath, this._port)

         const child = spawn(
            electronExe,
            [this._openclawPath, 'gateway', 'run', '--allow-unconfigured'],
            {
               env,
               stdio: ['ignore', 'pipe', 'pipe'],
               detached: false,
            },
         )

         this._process = child

         let startupDone = false
         const startupTimeout = setTimeout(() => {
            if (!startupDone) {
               startupDone = true
               reject(new Error(`Gateway startup timeout after ${STARTUP_TIMEOUT_MS}ms`))
            }
         }, STARTUP_TIMEOUT_MS)

         // 监控 stdout 检测启动完成
         let stdoutBuffer = ''
         child.stdout?.on('data', (chunk: Buffer) => {
            const text = chunk.toString()
            stdoutBuffer += text
            log.debug('[gateway stdout] %s', text.trimEnd())

            // Gateway 启动成功后会输出 "listening on ws://..."
            if (!startupDone && stdoutBuffer.includes('listening on')) {
               startupDone = true
               clearTimeout(startupTimeout)
               this._setStatus('running')
               log.log('Gateway started successfully on port %d', this._port)
               resolve()
            }
         })

         child.stderr?.on('data', (chunk: Buffer) => {
            log.debug('[gateway stderr] %s', chunk.toString().trimEnd())
         })

         child.on('error', (err) => {
            log.error('Process error:', err)
            if (!startupDone) {
               startupDone = true
               clearTimeout(startupTimeout)
               reject(err)
            }
         })

         child.on('exit', (code, signal) => {
            log.log('Process exited: code=%s, signal=%s', code, signal)
            this._process = null

            if (!startupDone) {
               startupDone = true
               clearTimeout(startupTimeout)
               reject(new Error(`Gateway exited during startup (code=${code}, signal=${signal})`))
               return
            }

            // 非预期退出 → 崩溃恢复
            if (!this._stopping) {
               this._setStatus('crashed')
               this._scheduleRetry()
            }
         })
      })
   }

   private _scheduleRetry(): void {
      if (this._stopping) return
      this._clearRetryTimer()

      log.log('Scheduling retry in %dms', this._retryDelay)
      this._retryTimer = setTimeout(async () => {
         try {
            await this.start()
         } catch (err) {
            log.error('Retry failed:', err)
            // start() 内部已经设置了 crashed 状态和下一次 retry
         }
      }, this._retryDelay)

      // 指数退避
      this._retryDelay = Math.min(this._retryDelay * 2, MAX_RETRY_DELAY_MS)
   }

   private _clearRetryTimer(): void {
      if (this._retryTimer) {
         clearTimeout(this._retryTimer)
         this._retryTimer = null
      }
   }

   private _setStatus(status: GatewayProcessStatus): void {
      if (this._status === status) return
      log.log('Status: %s → %s', this._status, status)
      this._status = status
      this._onStatusChanged?.(status)
   }
}
