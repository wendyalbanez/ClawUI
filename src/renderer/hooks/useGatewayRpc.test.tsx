import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useGatewayRpc } from './useGatewayRpc'
import { GatewayProvider } from '../contexts/GatewayContext'

function createWrapper() {
   return function Wrapper({ children }: { children: React.ReactNode }) {
      return <GatewayProvider>{children}</GatewayProvider>
   }
}

describe('useGatewayRpc', () => {
   it('does not auto-fetch when not connected', () => {
      // Default mock: getStatus returns connected: false
      const { result } = renderHook(() => useGatewayRpc('test.method'), {
         wrapper: createWrapper(),
      })

      expect(result.current.data).toBeNull()
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
   })

   it('returns refetch function', () => {
      const { result } = renderHook(() => useGatewayRpc('test.method'), {
         wrapper: createWrapper(),
      })

      expect(typeof result.current.refetch).toBe('function')
   })

   it('does not auto-fetch when autoFetch is false', () => {
      // Even if connected, should not auto-fetch
      window.clawAPI.gateway.getStatus = vi.fn().mockResolvedValue({
         state: 'connected',
         connected: true,
      })

      const { result } = renderHook(
         () => useGatewayRpc('test.method', undefined, { autoFetch: false }),
         { wrapper: createWrapper() },
      )

      expect(result.current.data).toBeNull()
   })

   it('has correct initial state', () => {
      const { result } = renderHook(() => useGatewayRpc('test.method'), {
         wrapper: createWrapper(),
      })

      expect(result.current.data).toBeNull()
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
      expect(typeof result.current.refetch).toBe('function')
   })
})
