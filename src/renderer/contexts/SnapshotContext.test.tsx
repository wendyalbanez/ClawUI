import React from 'react'
import { renderHook } from '@testing-library/react'
import { GatewayProvider } from './GatewayContext'
import { SnapshotProvider, useSnapshot } from './SnapshotContext'

function wrapper({ children }: { children: React.ReactNode }) {
   return (
      <GatewayProvider>
         <SnapshotProvider>{children}</SnapshotProvider>
      </GatewayProvider>
   )
}

describe('SnapshotContext', () => {
   describe('useSnapshot', () => {
      it('throws when used outside provider', () => {
         expect(() => {
            renderHook(() => useSnapshot())
         }).toThrow('useSnapshot must be used within SnapshotProvider')
      })

      it('provides initial null state', () => {
         const { result } = renderHook(() => useSnapshot(), { wrapper })
         expect(result.current.snapshot).toBeNull()
         expect(result.current.helloOk).toBeNull()
         expect(result.current.presence).toEqual([])
         expect(result.current.sessionDefaults).toBeNull()
         expect(result.current.features).toBeNull()
         expect(result.current.serverVersion).toBeNull()
      })
   })
})
