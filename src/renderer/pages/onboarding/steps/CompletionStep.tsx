import React from 'react'
import { Typography, Button, Result } from 'antd'
import type { GatewayMode } from '../../../types/global'

interface Props {
   mode: GatewayMode | null
   onFinish: () => void
}

export default function CompletionStep({ mode, onFinish }: Props) {
   const subTitle =
      mode === 'builtin'
         ? '内置 Gateway 已启动，配置已完成。你可以开始使用 ClawUI 了。'
         : '已成功连接到外部 Gateway。你可以开始使用 ClawUI 了。'

   return (
      <Result
         status="success"
         title="设置完成！"
         subTitle={subTitle}
         extra={
            <Button type="primary" size="large" onClick={onFinish}>
               开始使用
            </Button>
         }
      />
   )
}
