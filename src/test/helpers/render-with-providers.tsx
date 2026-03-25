import React from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import { GatewayProvider } from '../../renderer/contexts/GatewayContext'
import { NavigationProvider } from '../../renderer/contexts/NavigationContext'
import { SnapshotProvider } from '../../renderer/contexts/SnapshotContext'

function AllProviders({ children }: { children: React.ReactNode }) {
   return (
      <NavigationProvider>
         <GatewayProvider>
            <SnapshotProvider>{children}</SnapshotProvider>
         </GatewayProvider>
      </NavigationProvider>
   )
}

export function renderWithProviders(
   ui: React.ReactElement,
   options?: Omit<RenderOptions, 'wrapper'>,
) {
   return render(ui, { wrapper: AllProviders, ...options })
}

export { render }
