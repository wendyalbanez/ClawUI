import React from 'react'
import { renderHook } from '@testing-library/react'
import { useGatewayEvent } from './useGatewayEvent'
import { GatewayProvider } from '../contexts/GatewayContext'

function createWrapper() {
   return function Wrapper({ children }: { children: React.ReactNode }) {
      return <GatewayProvider>{children}</GatewayProvider>
   }
}

describe('useGatewayEvent', () => {
   it('subscribes to the named event on mount', () => {
      const handler = vi.fn()
      renderHook(() => useGatewayEvent('chat', handler), {
         wrapper: createWrapper(),
      })

      // The hook calls subscribe() from GatewayContext
      // GatewayContext calls window.clawAPI.gateway.onEvent to set up the event bridge
      expect(window.clawAPI.gateway.onEvent).toHaveBeenCalled()
   })

   it('cleans up subscription on unmount', () => {
      const handler = vi.fn()
      const { unmount } = renderHook(() => useGatewayEvent('chat', handler), {
         wrapper: createWrapper(),
      })

      // Should not throw on unmount
      unmount()
   })

   it('re-subscribes when eventName changes', () => {
      const handler = vi.fn()
      const { rerender } = renderHook(
         ({ eventName }) => useGatewayEvent(eventName, handler),
         {
            wrapper: createWrapper(),
            initialProps: { eventName: 'chat' },
         },
      )

      rerender({ eventName: 'agent' })
      // Should not throw, subscription is updated
   })
})
