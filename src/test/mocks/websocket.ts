type EventListener = (...args: unknown[]) => void

/**
 * Mock WebSocket class for testing GatewayClient.
 * Simulates the `ws` WebSocket behavior.
 */
export class MockWebSocket {
   static CONNECTING = 0
   static OPEN = 1
   static CLOSING = 2
   static CLOSED = 3

   // Instance constants (match ws WebSocket)
   readonly CONNECTING = 0
   readonly OPEN = 1
   readonly CLOSING = 2
   readonly CLOSED = 3

   readyState: number = MockWebSocket.CONNECTING
   url: string
   options: unknown

   private listeners = new Map<string, Set<EventListener>>()
   private _sentMessages: string[] = []

   static instances: MockWebSocket[] = []

   constructor(url: string, options?: unknown) {
      this.url = url
      this.options = options
      MockWebSocket.instances.push(this)
   }

   on(event: string, listener: EventListener): this {
      if (!this.listeners.has(event)) {
         this.listeners.set(event, new Set())
      }
      this.listeners.get(event)!.add(listener)
      return this
   }

   removeAllListeners(): this {
      this.listeners.clear()
      return this
   }

   send(data: string): void {
      this._sentMessages.push(data)
   }

   close(code?: number, reason?: string): void {
      this.readyState = MockWebSocket.CLOSED
      this._emit('close', code ?? 1000, Buffer.from(reason ?? ''))
   }

   // ---- Test helpers ----

   simulateOpen(): void {
      this.readyState = MockWebSocket.OPEN
      this._emit('open')
   }

   simulateMessage(data: unknown): void {
      const str = typeof data === 'string' ? data : JSON.stringify(data)
      this._emit('message', Buffer.from(str))
   }

   simulateClose(code = 1000, reason = ''): void {
      this.readyState = MockWebSocket.CLOSED
      this._emit('close', code, Buffer.from(reason))
   }

   simulateError(err: Error): void {
      this._emit('error', err)
   }

   getSentMessages(): string[] {
      return this._sentMessages
   }

   getSentFrames(): unknown[] {
      return this._sentMessages.map((m) => JSON.parse(m))
   }

   static reset(): void {
      MockWebSocket.instances = []
   }

   static getLatest(): MockWebSocket | undefined {
      return MockWebSocket.instances[MockWebSocket.instances.length - 1]
   }

   private _emit(event: string, ...args: unknown[]): void {
      const handlers = this.listeners.get(event)
      if (handlers) {
         for (const handler of handlers) {
            handler(...args)
         }
      }
   }
}
