import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react'
import { Spin } from 'antd'
import { ConfigProvider, carbonDarkTheme } from '@agentscope-ai/design'
import { GatewayProvider } from './contexts/GatewayContext'
import { SnapshotProvider } from './contexts/SnapshotContext'
import { NavigationProvider } from './contexts/NavigationContext'
import AppShell from './layouts/AppShell'
import { createLogger } from '../shared/logger'

const log = createLogger('App')

const OnboardingWizard = lazy(() => import('./pages/onboarding/OnboardingWizard'))

function AppRoot() {
   const [loading, setLoading] = useState(true)
   const [showOnboarding, setShowOnboarding] = useState(false)

   useEffect(() => {
      window.clawAPI.gateway
         .loadConfig()
         .then((config) => {
            const needsOnboarding = !config || config.onboardingCompleted !== true
            log.log(
               'AppRoot init: hasConfig=%s, onboardingCompleted=%s, needsOnboarding=%s',
               !!config,
               config?.onboardingCompleted,
               needsOnboarding,
            )
            setShowOnboarding(needsOnboarding)
         })
         .catch((err) => {
            log.error('AppRoot: loadConfig failed:', err)
            setShowOnboarding(true)
         })
         .finally(() => setLoading(false))
   }, [])

   // 监听来自设置页的重新触发事件
   useEffect(() => {
      const handler = () => {
         log.log('AppRoot: show-onboarding event received')
         setShowOnboarding(true)
      }
      window.addEventListener('clawui:show-onboarding', handler)
      return () => window.removeEventListener('clawui:show-onboarding', handler)
   }, [])

   const handleOnboardingComplete = useCallback(() => {
      log.log('AppRoot: onboarding completed')
      setShowOnboarding(false)
   }, [])

   if (loading) {
      return (
         <div
            style={{
               height: '100vh',
               display: 'flex',
               alignItems: 'center',
               justifyContent: 'center',
            }}
         >
            <Spin size="large" />
         </div>
      )
   }

   if (showOnboarding) {
      return (
         <Suspense
            fallback={
               <div
                  style={{
                     height: '100vh',
                     display: 'flex',
                     alignItems: 'center',
                     justifyContent: 'center',
                  }}
               >
                  <Spin size="large" />
               </div>
            }
         >
            <OnboardingWizard onComplete={handleOnboardingComplete} />
         </Suspense>
      )
   }

   return <AppShell />
}

export default function App() {
   return (
      <NavigationProvider>
         <GatewayProvider>
            <SnapshotProvider>
               <ConfigProvider {...carbonDarkTheme}>
                  <AppRoot />
               </ConfigProvider>
            </SnapshotProvider>
         </GatewayProvider>
      </NavigationProvider>
   )
}
