import { useEffect, useRef } from 'react'
import { useGateway } from '../contexts/GatewayContext'
import { createLogger } from '../../shared/logger'

const log = createLogger('useGatewayEvent')

/**
 * 订阅 Gateway 事件的 hook
 * 自动在组件 unmount 时取消订阅
 *
 * @param eventName 事件名称
 * @param handler 事件处理函数
 * @param deps 依赖数组，当依赖变化时会重新订阅（用于访问最新的 ref 值）
 */
export function useGatewayEvent(
   eventName: string,
   handler: (payload: unknown) => void,
   deps?: React.DependencyList,
): void {
   const { subscribe } = useGateway()
   const handlerRef = useRef(handler)
   handlerRef.current = handler

   useEffect(() => {
      log.debug('Subscribing to event: %s', eventName)
      const unsub = subscribe(eventName, (payload) => {
         handlerRef.current(payload)
      })
      return () => {
         log.debug('Unsubscribing from event: %s', eventName)
         unsub()
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [eventName, subscribe, ...(deps ?? [])])
}
