import { contextBridge, ipcRenderer } from 'electron'

describe('preload/index', () => {
   beforeEach(() => {
      vi.resetModules()
      vi.clearAllMocks()
   })

   it('exposes clawAPI to main world via contextBridge', async () => {
      await import('./index')

      expect(contextBridge.exposeInMainWorld).toHaveBeenCalledOnce()
      expect(contextBridge.exposeInMainWorld).toHaveBeenCalledWith(
         'clawAPI',
         expect.objectContaining({
            app: expect.any(Object),
            gateway: expect.any(Object),
            speech: expect.any(Object),
         }),
      )
   })

   it('exposes correct app API shape', async () => {
      await import('./index')

      const api = vi.mocked(contextBridge.exposeInMainWorld).mock.calls[0][1] as {
         app: Record<string, unknown>
      }
      expect(typeof api.app.getInfo).toBe('function')
   })

   it('exposes correct gateway API shape', async () => {
      await import('./index')

      const api = vi.mocked(contextBridge.exposeInMainWorld).mock.calls[0][1] as {
         gateway: Record<string, unknown>
      }
      const gw = api.gateway
      const expectedMethods = [
         'loadConfig',
         'saveConfig',
         'connect',
         'disconnect',
         'getStatus',
         'rpc',
         'onEvent',
         'onStateChanged',
         'removeAllListeners',
         'checkBundled',
         'getMode',
         'setMode',
         'getBuiltinStatus',
         'startBuiltin',
         'stopBuiltin',
         'restartBuiltin',
         'onBuiltinStatusChanged',
         'markOnboardingCompleted',
      ]
      for (const method of expectedMethods) {
         expect(typeof gw[method]).toBe('function')
      }
   })

   it('exposes correct speech API shape', async () => {
      await import('./index')

      const api = vi.mocked(contextBridge.exposeInMainWorld).mock.calls[0][1] as {
         speech: Record<string, unknown>
      }
      expect(typeof api.speech.transcribe).toBe('function')
   })

   // ── IPC delegation tests ──

   describe('IPC delegation', () => {
      let api: Record<string, Record<string, (...args: unknown[]) => unknown>>

      beforeEach(async () => {
         await import('./index')
         api = vi.mocked(contextBridge.exposeInMainWorld).mock.calls[0][1] as typeof api
      })

      it('app.getInfo invokes app:get-info', async () => {
         vi.mocked(ipcRenderer.invoke).mockResolvedValue({ platform: 'darwin' })
         const result = await api.app.getInfo()
         expect(ipcRenderer.invoke).toHaveBeenCalledWith('app:get-info')
         expect(result).toEqual({ platform: 'darwin' })
      })

      it('gateway.connect invokes gateway:connect', async () => {
         vi.mocked(ipcRenderer.invoke).mockResolvedValue({ success: true })
         const result = await api.gateway.connect()
         expect(ipcRenderer.invoke).toHaveBeenCalledWith('gateway:connect')
         expect(result).toEqual({ success: true })
      })

      it('gateway.rpc invokes gateway:rpc with method and params', async () => {
         vi.mocked(ipcRenderer.invoke).mockResolvedValue({ ok: true, payload: 'data' })
         const result = await api.gateway.rpc('chat.send', { text: 'hi' })
         expect(ipcRenderer.invoke).toHaveBeenCalledWith('gateway:rpc', {
            method: 'chat.send',
            params: { text: 'hi' },
         })
         expect(result).toEqual({ ok: true, payload: 'data' })
      })

      it('gateway.getStatus invokes gateway:get-status', async () => {
         vi.mocked(ipcRenderer.invoke).mockResolvedValue({
            state: 'connected',
            connected: true,
         })
         await api.gateway.getStatus()
         expect(ipcRenderer.invoke).toHaveBeenCalledWith('gateway:get-status')
      })

      it('gateway.loadConfig invokes gateway:load-config', async () => {
         vi.mocked(ipcRenderer.invoke).mockResolvedValue(null)
         await api.gateway.loadConfig()
         expect(ipcRenderer.invoke).toHaveBeenCalledWith('gateway:load-config')
      })

      it('gateway.saveConfig invokes gateway:save-config with config', async () => {
         vi.mocked(ipcRenderer.invoke).mockResolvedValue({ success: true })
         const cfg = { gatewayUrl: 'ws://localhost:8080', token: 'tok' }
         await api.gateway.saveConfig(cfg)
         expect(ipcRenderer.invoke).toHaveBeenCalledWith('gateway:save-config', cfg)
      })

      it('gateway.removeAllListeners clears all event channels', () => {
         api.gateway.removeAllListeners()
         expect(ipcRenderer.removeAllListeners).toHaveBeenCalledWith('gateway:event')
         expect(ipcRenderer.removeAllListeners).toHaveBeenCalledWith('gateway:state-changed')
         expect(ipcRenderer.removeAllListeners).toHaveBeenCalledWith(
            'gateway:builtin-status-changed',
         )
      })

      it('gateway.onEvent registers listener on gateway:event channel', () => {
         const cb = vi.fn()
         api.gateway.onEvent(cb)
         expect(ipcRenderer.on).toHaveBeenCalledWith('gateway:event', expect.any(Function))
      })

      it('gateway.onStateChanged registers listener on gateway:state-changed', () => {
         const cb = vi.fn()
         api.gateway.onStateChanged(cb)
         expect(ipcRenderer.on).toHaveBeenCalledWith(
            'gateway:state-changed',
            expect.any(Function),
         )
      })

      it('gateway.setMode invokes gateway:set-mode with mode', async () => {
         vi.mocked(ipcRenderer.invoke).mockResolvedValue(undefined)
         await api.gateway.setMode('external')
         expect(ipcRenderer.invoke).toHaveBeenCalledWith('gateway:set-mode', 'external')
      })

      it('gateway.markOnboardingCompleted invokes correct channel', async () => {
         vi.mocked(ipcRenderer.invoke).mockResolvedValue({ success: true })
         await api.gateway.markOnboardingCompleted()
         expect(ipcRenderer.invoke).toHaveBeenCalledWith('gateway:mark-onboarding-complete')
      })

      it('speech.transcribe invokes speech:transcribe with data', async () => {
         vi.mocked(ipcRenderer.invoke).mockResolvedValue({ ok: true, text: 'hello' })
         const buf = new ArrayBuffer(100)
         await api.speech.transcribe(buf, 'audio/webm')
         expect(ipcRenderer.invoke).toHaveBeenCalledWith('speech:transcribe', {
            audioData: buf,
            mimeType: 'audio/webm',
         })
      })
   })
})
