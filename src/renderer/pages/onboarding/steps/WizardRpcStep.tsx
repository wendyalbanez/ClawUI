import React, { useEffect, useCallback } from 'react'
import { Typography, Alert, Button, Spin, Space, Popconfirm } from 'antd'
import { useWizardRpc } from '../hooks/useWizardRpc'
import WizardStepRenderer from '../components/WizardStepRenderer'
import { createLogger } from '../../../../shared/logger'

const log = createLogger('WizardRpcStep')

const { Title, Paragraph } = Typography

interface Props {
   onDone: () => void
   onSkip: () => void
}

export default function WizardRpcStep({ onDone, onSkip }: Props) {
   const {
      currentStep,
      done,
      endStatus,
      endError,
      loading,
      error,
      autoAnswering,
      startWizard,
      answerStep,
      cancelWizard,
   } = useWizardRpc()

   useEffect(() => {
      startWizard()
   }, []) // eslint-disable-line react-hooks/exhaustive-deps

   useEffect(() => {
      if (done && endStatus === 'done') {
         log.log('Wizard completed successfully')
         onDone()
      }
   }, [done, endStatus, onDone])

   const handleAnswer = useCallback(
      (stepId: string, value: unknown) => {
         answerStep(stepId, value)
      },
      [answerStep],
   )

   const handleSkip = useCallback(async () => {
      log.log('Skipping wizard')
      await cancelWizard()
      onSkip()
   }, [cancelWizard, onSkip])

   const handleRetry = useCallback(() => {
      startWizard()
   }, [startWizard])

   // 初始加载或自动配置中
   if (!currentStep && !error && !done) {
      return (
         <div style={{ textAlign: 'center', paddingTop: 48 }}>
            <Spin size="large" />
            <Paragraph type="secondary" style={{ marginTop: 16 }}>
               {autoAnswering ? '正在自动配置...' : '正在初始化配置向导...'}
            </Paragraph>
         </div>
      )
   }

   // wizard 异常终止（error 或 cancelled）
   if (done && endStatus && endStatus !== 'done') {
      return (
         <div>
            <Title level={3} style={{ marginBottom: 8 }}>
               配置向导
            </Title>
            <Alert
               type={endStatus === 'cancelled' ? 'warning' : 'error'}
               message={endStatus === 'cancelled' ? '配置向导已取消' : '配置向导异常终止'}
               description={endError ?? '向导未能正常完成，配置可能未保存。'}
               style={{ marginBottom: 24 }}
            />
            <Space>
               <Button type="primary" onClick={handleRetry}>
                  重新配置
               </Button>
               <Popconfirm
                  title="跳过配置向导？"
                  description="你可以稍后在设置页面中手动配置。"
                  onConfirm={onSkip}
                  okText="跳过"
                  cancelText="取消"
               >
                  <Button>跳过配置</Button>
               </Popconfirm>
            </Space>
         </div>
      )
   }

   // wizard.start 失败
   if (error && !currentStep) {
      return (
         <div>
            <Title level={3} style={{ marginBottom: 8 }}>
               配置向导
            </Title>
            <Alert
               type="error"
               message="初始化失败"
               description={error}
               style={{ marginBottom: 24 }}
            />
            <Space>
               <Button type="primary" onClick={handleRetry}>
                  重试
               </Button>
               <Popconfirm
                  title="跳过配置向导？"
                  description="你可以稍后在设置页面中手动配置。"
                  onConfirm={handleSkip}
                  okText="跳过"
                  cancelText="取消"
               >
                  <Button>跳过配置</Button>
               </Popconfirm>
            </Space>
         </div>
      )
   }

   return (
      <div>
         {/* 步骤错误提示 */}
         {error && (
            <Alert
               type="error"
               message="操作失败"
               description={error}
               style={{ marginBottom: 16 }}
               closable
            />
         )}

         {/* 当前步骤 */}
         {currentStep && (
            <WizardStepRenderer step={currentStep} loading={loading} onAnswer={handleAnswer} />
         )}

         {/* 底部跳过按钮 */}
         <div style={{ marginTop: 32, textAlign: 'right' }}>
            <Popconfirm
               title="跳过配置向导？"
               description="你可以稍后在设置页面中手动配置。"
               onConfirm={handleSkip}
               okText="跳过"
               cancelText="取消"
            >
               <Button type="link" size="small">
                  跳过
               </Button>
            </Popconfirm>
         </div>
      </div>
   )
}
