import { join } from 'path'
import { homedir } from 'os'
import { mkdirSync, existsSync } from 'fs'

const CLAWUI_DIR = '.clawui'

let _dataDir: string | null = null

/**
 * 获取 ClawUI 数据目录，所有平台统一使用 ~/.clawui
 */
export function getDataDir(): string {
   if (!_dataDir) {
      _dataDir = join(homedir(), CLAWUI_DIR)
      if (!existsSync(_dataDir)) {
         mkdirSync(_dataDir, { recursive: true })
      }
   }
   return _dataDir
}
