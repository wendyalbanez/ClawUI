import React from 'react'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../test/helpers/render-with-providers'
import ConnectionBanner from './ConnectionBanner'

describe('ConnectionBanner', () => {
   it('renders disconnected message by default', () => {
      renderWithProviders(<ConnectionBanner />)
      expect(screen.getByText('未连接到 Gateway')).toBeInTheDocument()
   })

   it('renders "连接设置" button', () => {
      renderWithProviders(<ConnectionBanner />)
      expect(screen.getByRole('button', { name: '连接设置' })).toBeInTheDocument()
   })

   it('renders description for disconnected state', () => {
      renderWithProviders(<ConnectionBanner />)
      expect(
         screen.getByText('请先配置并连接到 Gateway 以使用全部功能。'),
      ).toBeInTheDocument()
   })
})
