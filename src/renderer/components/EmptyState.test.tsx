import React from 'react'
import { render, screen } from '@testing-library/react'
import EmptyState from './EmptyState'

describe('EmptyState', () => {
   it('renders default description', () => {
      render(<EmptyState />)
      expect(screen.getByText('暂无数据')).toBeInTheDocument()
   })

   it('renders custom description', () => {
      render(<EmptyState description="没有找到结果" />)
      expect(screen.getByText('没有找到结果')).toBeInTheDocument()
   })

   it('renders children', () => {
      render(
         <EmptyState>
            <button>操作</button>
         </EmptyState>,
      )
      expect(screen.getByRole('button', { name: '操作' })).toBeInTheDocument()
   })

   it('applies centered layout', () => {
      const { container } = render(<EmptyState />)
      const wrapper = container.firstElementChild as HTMLElement
      expect(wrapper.style.display).toBe('flex')
      expect(wrapper.style.justifyContent).toBe('center')
      expect(wrapper.style.alignItems).toBe('center')
   })
})
