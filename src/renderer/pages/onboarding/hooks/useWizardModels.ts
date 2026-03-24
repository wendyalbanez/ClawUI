import { useState, useEffect, useCallback, useMemo } from 'react'
import { useGateway } from '../../../contexts/GatewayContext'
import { RPC } from '../../../../shared/types/gateway-rpc'
import { createLogger } from '../../../../shared/logger'

const log = createLogger('useWizardModels')

interface ModelEntry {
   id: string
   name: string
   provider: string
}

/**
 * 获取向导中用于格式化模型显示的模型映射。
 * 构建 provider/modelId -> name 的映射表。
 */
export function useWizardModels() {
   const { connected, rpc } = useGateway()
   const [models, setModels] = useState<ModelEntry[]>([])
   const [loading, setLoading] = useState(false)

   const fetchModels = useCallback(async () => {
      if (!connected) return
      setLoading(true)
      try {
         log.log('Fetching models list for wizard...')
         const result = await rpc<{ models: ModelEntry[] }>(RPC.MODELS_LIST, {})
         const list = result?.models ?? []
         log.log('Wizard models loaded: count=%d', list.length)
         setModels(list)
      } catch (err) {
         log.error('Failed to fetch wizard models:', err)
      } finally {
         setLoading(false)
      }
   }, [connected, rpc])

   useEffect(() => {
      if (connected) {
         fetchModels()
      }
   }, [connected, fetchModels])

   // 构建 provider/modelId -> name 的映射
   const modelNameMap = useMemo(() => {
      const map = new Map<string, string>()
      for (const m of models) {
         const key = `${m.provider}/${m.id}`
         if (!map.has(key)) {
            map.set(key, m.name)
         }
      }
      return map
   }, [models])

   // 根据 provider/modelId 获取友好名称
   const getModelDisplayName = useCallback(
      (provider: string, modelId: string): string => {
         const key = `${provider}/${modelId}`
         return modelNameMap.get(key) ?? modelId
      },
      [modelNameMap],
   )

   return { models, loading, refetch: fetchModels, getModelDisplayName }
}
