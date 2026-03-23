import { existsSync, unlinkSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { execFileSync } from 'child_process'
import { createLogger } from '../../shared/logger'

const log = createLogger('CleanupLaunchAgent')

const LAUNCH_AGENT_LABEL = 'ai.openclaw.gateway'
const LAUNCH_AGENT_PLIST = `${LAUNCH_AGENT_LABEL}.plist`

/**
 * 清理 OpenClaw 向导安装的 macOS LaunchAgent。
 *
 * OpenClaw 的引导向导在 finalizeSetupWizard 中会自动安装 LaunchAgent（开机自启动），
 * 但 ClawUI 内置模式下 Gateway 生命周期由 ProcessManager 管理，不需要 LaunchAgent。
 * 且 LaunchAgent 会在同端口启动独立 Gateway，与内置 Gateway 冲突。
 */
export function cleanupOpenClawLaunchAgent(): void {
   if (process.platform !== 'darwin') return

   const uid = process.getuid?.() ?? 501
   const domainTarget = `gui/${uid}/${LAUNCH_AGENT_LABEL}`

   // 始终尝试 bootout（用 label 形式），即使 plist 已被删除，launchd 可能仍有加载
   try {
      execFileSync('launchctl', ['bootout', domainTarget], { timeout: 5000 })
      log.log('Successfully booted out LaunchAgent: %s', domainTarget)
   } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      log.log('launchctl bootout returned error (may already be unloaded): %s', msg)
   }

   // bootout 完成后再删除 plist 文件
   const plistPath = join(homedir(), 'Library', 'LaunchAgents', LAUNCH_AGENT_PLIST)
   if (existsSync(plistPath)) {
      try {
         unlinkSync(plistPath)
         log.log('Removed LaunchAgent plist: %s', plistPath)
      } catch (err) {
         log.warn('Failed to remove LaunchAgent plist: %s', err)
      }
   }
}
