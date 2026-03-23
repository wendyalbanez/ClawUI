import { useState, useCallback } from 'react'
import { useGateway } from '../../../contexts/GatewayContext'
import { RPC } from '../../../../shared/types/gateway-rpc'
import { createLogger } from '../../../../shared/logger'

const log = createLogger('useWizardRpc')

// ── WizardStep 类型（镜像 Gateway 协议） ──

export interface WizardStepOption {
   value: unknown
   label: string
   hint?: string
}

export interface WizardStep {
   id: string
   type: 'note' | 'select' | 'text' | 'confirm' | 'multiselect' | 'progress' | 'action'
   title?: string
   message?: string
   options?: WizardStepOption[]
   initialValue?: unknown
   placeholder?: string
   sensitive?: boolean
   executor?: 'gateway' | 'client'
}

interface WizardStartResult {
   sessionId: string
   done: boolean
   step?: WizardStep
   status?: string
   error?: string
}

interface WizardNextResult {
   done: boolean
   step?: WizardStep
   status?: string
   error?: string
}

export interface UseWizardRpcReturn {
   sessionId: string | null
   currentStep: WizardStep | null
   done: boolean
   loading: boolean
   error: string | null
   startWizard: () => Promise<void>
   answerStep: (stepId: string, value: unknown) => Promise<void>
   cancelWizard: () => Promise<void>
}

export function useWizardRpc(): UseWizardRpcReturn {
   const { rpc } = useGateway()
   const [sessionId, setSessionId] = useState<string | null>(null)
   const [currentStep, setCurrentStep] = useState<WizardStep | null>(null)
   const [done, setDone] = useState(false)
   const [loading, setLoading] = useState(false)
   const [error, setError] = useState<string | null>(null)

   const startWizard = useCallback(async () => {
      log.log('Starting wizard')
      setLoading(true)
      setError(null)
      setDone(false)
      try {
         const result = await rpc<WizardStartResult>(RPC.WIZARD_START, { mode: 'local' })
         log.log('wizard.start result: sessionId=%s, done=%s', result.sessionId, result.done)
         setSessionId(result.sessionId)
         if (result.done) {
            setDone(true)
            setCurrentStep(null)
         } else if (result.step) {
            setCurrentStep(result.step)
         }
      } catch (err) {
         const msg = err instanceof Error ? err.message : String(err)
         log.error('wizard.start error: %s', msg)
         setError(msg)
      } finally {
         setLoading(false)
      }
   }, [rpc])

   const answerStep = useCallback(
      async (stepId: string, value: unknown) => {
         if (!sessionId) return
         log.log('Answering step: stepId=%s', stepId)
         setLoading(true)
         setError(null)
         try {
            const result = await rpc<WizardNextResult>(RPC.WIZARD_NEXT, {
               sessionId,
               answer: { stepId, value },
            })
            log.log('wizard.next result: done=%s', result.done)
            if (result.done) {
               setDone(true)
               setCurrentStep(null)
            } else if (result.step) {
               setCurrentStep(result.step)
            }
         } catch (err) {
            const msg = err instanceof Error ? err.message : String(err)
            log.error('wizard.next error: %s', msg)
            setError(msg)
         } finally {
            setLoading(false)
         }
      },
      [rpc, sessionId],
   )

   const cancelWizard = useCallback(async () => {
      if (!sessionId) return
      log.log('Cancelling wizard: sessionId=%s', sessionId)
      try {
         await rpc(RPC.WIZARD_CANCEL, { sessionId })
      } catch (err) {
         log.error('wizard.cancel error:', err)
      }
      setDone(true)
      setCurrentStep(null)
   }, [rpc, sessionId])

   return {
      sessionId,
      currentStep,
      done,
      loading,
      error,
      startWizard,
      answerStep,
      cancelWizard,
   }
}
