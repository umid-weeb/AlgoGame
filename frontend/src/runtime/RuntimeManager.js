/** Runs student Python in a dedicated worker; GameEngine receives only commands. */
class RuntimeManager {
  constructor() {
    this.worker = null
    this.readyPromise = null
    this.readyResolve = null
    this.callbacks = new Map()
    this.executionCounter = 0
  }

  async initialize() {
    if (this.readyPromise) return this.readyPromise
    this.readyPromise = new Promise((resolve, reject) => {
      this.readyResolve = resolve
      this.createWorker(reject)
    })
    return this.readyPromise
  }

  createWorker(onInitialError) {
    this.worker = new Worker(new URL('./pythonWorker.js', import.meta.url))
    this.worker.onmessage = ({ data }) => this.handleMessage(data)
    this.worker.onerror = (event) => {
      const error = new Error(event.message || 'Python worker failed to start.')
      if (this.readyResolve) onInitialError?.(error)
      this.rejectPending(error)
    }
    this.worker.postMessage({ type: 'init' })
  }

  handleMessage({ type, executionId, result, error }) {
    if (type === 'ready') {
      this.readyResolve?.()
      this.readyResolve = null
      return
    }
    if (type !== 'execution_complete' || !executionId) return
    const pending = this.callbacks.get(executionId)
    if (!pending) return
    window.clearTimeout(pending.timeout)
    this.callbacks.delete(executionId)
    pending.resolve(result || { success: false, commands: [], error: error || 'Unknown Python error.' })
  }

  async executeCode(code, maxSteps, availableFunctions, gameState) {
    await this.initialize()
    const executionId = ++this.executionCounter
    return new Promise((resolve) => {
      const timeout = window.setTimeout(() => {
        if (!this.callbacks.has(executionId)) return
        this.callbacks.delete(executionId)
        resolve({ success: false, commands: [], error: 'Execution timed out. Check for an infinite loop.' })
        this.restartWorker()
      }, 10_000)
      this.callbacks.set(executionId, { resolve, timeout })
      this.worker.postMessage({
        type: 'execute',
        payload: { code, maxSteps, availableFunctions, gameState, executionId },
      })
    })
  }

  stop() {
    this.rejectPending(new Error('Execution stopped.'))
    this.restartWorker()
  }

  restartWorker() {
    this.worker?.terminate()
    this.worker = null
    this.readyPromise = null
    this.readyResolve = null
  }

  rejectPending(error) {
    for (const pending of this.callbacks.values()) {
      window.clearTimeout(pending.timeout)
      pending.resolve({ success: false, commands: [], error: error.message })
    }
    this.callbacks.clear()
  }

  terminate() {
    this.rejectPending(new Error('Python runtime closed.'))
    this.restartWorker()
  }
}

export default RuntimeManager
