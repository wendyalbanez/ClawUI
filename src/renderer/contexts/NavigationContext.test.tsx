import React from 'react'
import { renderHook, act } from '@testing-library/react'
import { NavigationProvider, useNavigation, NAV_GROUPS, PAGE_LABELS } from './NavigationContext'
import type { NavPage } from './NavigationContext'

function wrapper({ children }: { children: React.ReactNode }) {
   return <NavigationProvider>{children}</NavigationProvider>
}

describe('NavigationContext', () => {
   describe('useNavigation', () => {
      it('throws when used outside provider', () => {
         expect(() => {
            renderHook(() => useNavigation())
         }).toThrow('useNavigation must be used within NavigationProvider')
      })

      it('defaults to overview page', () => {
         const { result } = renderHook(() => useNavigation(), { wrapper })
         expect(result.current.currentPage).toBe('overview')
         expect(result.current.pageParams).toEqual({})
      })

      it('navigates to a different page', () => {
         const { result } = renderHook(() => useNavigation(), { wrapper })

         act(() => {
            result.current.navigate('chat')
         })

         expect(result.current.currentPage).toBe('chat')
      })

      it('passes page params on navigate', () => {
         const { result } = renderHook(() => useNavigation(), { wrapper })

         act(() => {
            result.current.navigate('sessions', { sessionId: 'abc' })
         })

         expect(result.current.currentPage).toBe('sessions')
         expect(result.current.pageParams).toEqual({ sessionId: 'abc' })
      })

      it('clears params when navigating without params', () => {
         const { result } = renderHook(() => useNavigation(), { wrapper })

         act(() => {
            result.current.navigate('sessions', { id: '1' })
         })
         act(() => {
            result.current.navigate('overview')
         })

         expect(result.current.pageParams).toEqual({})
      })
   })

   describe('NAV_GROUPS', () => {
      it('has expected group keys', () => {
         const keys = NAV_GROUPS.map((g) => g.key)
         expect(keys).toEqual(['chat', 'control', 'agent', 'settings'])
      })

      it('every page in NAV_GROUPS has a label in PAGE_LABELS', () => {
         const allPages = NAV_GROUPS.flatMap((g) => g.pages)
         for (const page of allPages) {
            expect(PAGE_LABELS[page]).toBeDefined()
         }
      })
   })

   describe('PAGE_LABELS', () => {
      it('contains labels for all NavPage values', () => {
         const expectedPages: NavPage[] = [
            'chat',
            'overview',
            'infrastructure',
            'communication',
            'channels',
            'instances',
            'sessions',
            'usage',
            'cron',
            'automation',
            'agents',
            'skills',
            'nodes',
            'config',
            'ai-agents',
            'exec-approvals',
            'debug',
            'logs',
         ]
         for (const page of expectedPages) {
            expect(typeof PAGE_LABELS[page]).toBe('string')
            expect(PAGE_LABELS[page].length).toBeGreaterThan(0)
         }
      })
   })
})
