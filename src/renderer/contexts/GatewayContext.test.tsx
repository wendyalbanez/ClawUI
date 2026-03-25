import React from 'react'
import { renderHook, act } from '@testing-library/react'
import { GatewayProvider, useGateway } from './GatewayContext'

function wrapper({ children }: { children: React.ReactNode }) {
   return <GatewayProvider>{children}</GatewayProvider>
}

describe('GatewayContext', () => {
   describe('useGateway', () => {
      it('throws when used outside provider', () => {
         expect(() => {
            renderHook(() => useGateway())
         }).toThrow('useGateway must be used within GatewayProvider')
      })

      it('provides initial state', () => {
         const { result } = renderHook(() => useGateway(), { wrapper })
         expect(result.current.connectionState).toBe('disconnected')
         expect(result.current.connected).toBe(false)
         expect(result.current.connecting).toBe(false)
         expect(result.current.lastError).toBeNull()
         expect(result.current.lastErrorCode).toBeNull()
      })

      it('provides connect function', () => {
         const { result } = renderHook(() => useGateway(), { wrapper })
         expect(typeof result.current.connect).toBe('function')
      })

      it('provides disconnect function', () => {
         const { result } = renderHook(() => useGateway(), { wrapper })
         expect(typeof result.current.disconnect).toBe('function')
      })

      it('provides rpc function', () => {
         const { result } = renderHook(() => useGateway(), { wrapper })
         expect(typeof result.current.rpc).toBe('function')
      })

      it('provides subscribe function', () => {
         const { result } = renderHook(() => useGateway(), { wrapper })
         expect(typeof result.current.subscribe).toBe('function')
      })
   })

   describe('subscribe', () => {
      it('returns unsubscribe function', () => {
         const { result } = renderHook(() => useGateway(), { wrapper })
         const handler = vi.fn()
         let unsub: (() => void) | undefined
         act(() => {
            unsub = result.current.subscribe('test-event', handler)
         })
         expect(typeof unsub).toBe('function')
      })
   })

   describe('rpc', () => {
      it('throws on rpc failure', async () => {
         window.clawAPI.gateway.rpc = vi.fn().mockResolvedValue({
            ok: false,
            error: { message: 'Method not found' },
         })

         const { result } = renderHook(() => useGateway(), { wrapper })

         await expect(result.current.rpc('unknown.method')).rejects.toThrow('Method not found')
      })

      it('returns payload on rpc success', async () => {
         window.clawAPI.gateway.rpc = vi.fn().mockResolvedValue({
            ok: true,
            payload: { data: 'test' },
         })

         const { result } = renderHook(() => useGateway(), { wrapper })

         const payload = await result.current.rpc('some.method')
         expect(payload).toEqual({ data: 'test' })
      })
   })
})
