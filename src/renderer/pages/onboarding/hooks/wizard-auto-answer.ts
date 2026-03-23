import type { WizardStep } from './useWizardRpc'

// ── 阶段状态机 ──

export type WizardPhase = 'pre-auth' | 'auth' | 'post-auth'

// ── 已知 provider 关键字（用于检测 auth provider 选择步骤） ──

const KNOWN_PROVIDER_VALUES = new Set([
   'anthropic',
   'openai',
   'google',
   'copilot',
   'openrouter',
   'moonshot',
   'ollama',
   'minimax',
   'custom',
   'xai',
   'mistral',
   'skip',
   'qwen',
   'together',
   'huggingface',
   'venice',
   'deepseek',
   'groq',
   'litellm',
   'ai-gateway',
   'cloudflare-ai-gateway',
   'volcengine',
   'byteplus',
   'qianfan',
   'modelstudio',
])

// ── 退出 AUTH_PHASE 的信号值（select options 中出现这些值说明已进入后续配置） ──

const POST_AUTH_SIGNAL_VALUES = new Set([
   // Gateway 配置
   'loopback',
   'lan',
   'tailnet',
   'auto',
   'token',
   'password',
   'later',
   'tui',
   'web',
   'restart',
   'reinstall',
   'configure',
   'remove',
   'npm',
   'pnpm',
   'node',
   'bun',
   'serve',
   'funnel',
   'off',
])

// ── 频道和搜索相关关键字（option value 包含这些子串则为 POST_AUTH 信号） ──
// 使用 contains 匹配以应对 value 格式变化（如 "telegram-bot-api", "brave-search" 等）

const POST_AUTH_CONTAINS_KEYWORDS = [
   // 消息频道
   'telegram',
   'whatsapp',
   'discord',
   'slack',
   'signal',
   'imessage',
   'imsg',
   'irc',
   'line',
   'google-chat',
   // 搜索引擎
   'brave',
   'perplexity',
   'firecrawl',
   'tavily',
]

// ── 检测 secret input mode 选择步骤（plaintext vs ref） ──
// 该步骤询问 API key 存储方式，始终选择 plaintext 以直接保存到 openclaw.json

function isSecretInputModeStep(step: WizardStep): boolean {
   if (step.type !== 'select' || !step.options || step.options.length !== 2) return false
   const values = new Set(step.options.map((o) => String(o.value).toLowerCase()))
   return values.has('plaintext') && values.has('ref')
}

// ── 检测凭据输入步骤（API key、token 等） ──
// 通过 message 内容检测，作为安全网防止凭据步骤被错误地自动回答
// （即使阶段检测失败也能正确展示给用户）

const CREDENTIAL_MESSAGE_PATTERNS = [
   /api[\s_-]?key/i,
   /enter.*key/i,
   /paste.*key/i,
   /use existing.*key/i,
   /existing.*api/i,
   /\btoken\b.*enter/i,
   /enter.*\btoken\b/i,
   /\bsecret\b/i,
   /\bpassword\b/i,
   /\bcredential/i,
]

function isCredentialStep(step: WizardStep): boolean {
   if (step.type !== 'text' && step.type !== 'confirm') return false
   const msg = step.message ?? ''
   return CREDENTIAL_MESSAGE_PATTERNS.some((re) => re.test(msg))
}

// ── select 自动回答的优先级值列表 ──
// 按优先级从高到低排列，匹配到第一个即使用

const SELECT_PREFERRED_VALUES: string[] = [
   'quickstart',
   'keep',
   'later',
   'skip',
   'restart',
   'plaintext',
]

/**
 * 检测步骤是否为 auth provider 选择步骤（进入 AUTH_PHASE 的入口）。
 *
 * 判断条件：type='select'，且 options 中至少 2 个 value 匹配已知 provider 关键字。
 */
export function isAuthProviderStep(step: WizardStep): boolean {
   if (step.type !== 'select' || !step.options || step.options.length < 3) return false

   let matchCount = 0
   for (const opt of step.options) {
      const val = String(opt.value).toLowerCase()
      if (KNOWN_PROVIDER_VALUES.has(val)) {
         matchCount++
         if (matchCount >= 2) return true
      }
   }
   return false
}

/**
 * 检测步骤是否为退出 AUTH_PHASE 的信号。
 *
 * 以下情况表示已离开模型配置阶段：
 * - progress / action 类型步骤
 * - select 步骤的 options 含有 gateway/daemon/channel/search 相关值
 */
export function isPostAuthSignal(step: WizardStep): boolean {
   if (step.type === 'progress' || step.type === 'action') return true

   if (step.type === 'select' && step.options) {
      for (const opt of step.options) {
         const val = String(opt.value).toLowerCase()
         // 精确匹配 gateway/daemon 相关值
         if (POST_AUTH_SIGNAL_VALUES.has(val)) return true
         // 包含匹配频道/搜索相关关键字
         for (const kw of POST_AUTH_CONTAINS_KEYWORDS) {
            if (val.includes(kw)) return true
         }
      }
   }

   return false
}

/**
 * 计算步骤的自动回答值。
 *
 * 返回 `undefined` 表示无法确定默认答案，应回退为展示给用户。
 */
export function resolveAutoAnswer(step: WizardStep, phase: WizardPhase): unknown | undefined {
   // 凭据输入步骤永远不自动回答（双重保险，与 shouldShowToUser 配合）
   if (isCredentialStep(step)) return undefined

   switch (step.type) {
      case 'note':
         return null

      case 'confirm':
         // PRE_AUTH：风险确认 → 同意；POST_AUTH：daemon/skills → 拒绝
         return phase === 'pre-auth'

      case 'progress':
         return null

      case 'action':
         return null

      case 'text':
         // 敏感输入（API Key 等）不应自动回答
         if (step.sensitive) return undefined
         return step.initialValue ?? ''

      case 'multiselect':
         return step.initialValue ?? []

      case 'select': {
         if (!step.options || step.options.length === 0) return undefined

         // 按优先级匹配已知的默认值（使用 contains 匹配以覆盖 "skip-for-now" 等变体）
         for (const preferred of SELECT_PREFERRED_VALUES) {
            const match = step.options.find((o) =>
               String(o.value).toLowerCase().includes(preferred),
            )
            if (match) return match.value
         }

         // 使用 initialValue（如果在 options 中存在）
         if (step.initialValue !== undefined && step.initialValue !== null) {
            const exists = step.options.some((o) => o.value === step.initialValue)
            if (exists) return step.initialValue
         }

         // 回退：选第一个非 __back 的选项
         const first = step.options.find((o) => !String(o.value).startsWith('__'))
         return first?.value
      }

      default:
         return undefined
   }
}

/**
 * 判断在当前阶段下，步骤是否需要展示给用户。
 *
 * - PRE_AUTH / POST_AUTH：全部自动回答
 * - AUTH_PHASE：select/text/confirm 展示给用户，note/progress/action 自动跳过
 */
export function shouldShowToUser(step: WizardStep, phase: WizardPhase): boolean {
   // Secret input mode 步骤始终自动回答（选择 plaintext，API key 直接保存到 openclaw.json）
   if (isSecretInputModeStep(step)) return false

   // 凭据输入步骤（API key / token 等）无论在哪个阶段都展示给用户
   // 这是安全网：即使阶段检测出错，也不会跳过凭据输入
   if (isCredentialStep(step)) return true

   // Auth provider 选择步骤也始终展示（双重保险，防止阶段未正确转换到 auth）
   if (isAuthProviderStep(step)) return true

   if (phase === 'pre-auth' || phase === 'post-auth') return false

   // AUTH_PHASE 内部：交互类步骤展示给用户
   if (
      step.type === 'select' ||
      step.type === 'text' ||
      step.type === 'confirm' ||
      step.type === 'multiselect'
   ) {
      return true
   }

   // note / progress / action 在 AUTH_PHASE 中也自动跳过
   return false
}
