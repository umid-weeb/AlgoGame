/**
 * Runtime Manager - Manages Python execution via Web Worker
 */

class RuntimeManager {
  constructor() {
    this.worker = null;
    this.readyPromise = null;
    this.executionCallbacks = new Map();
    this.executionCounter = 0;
  }

  /**
   * Initialize the worker
   */
  async initialize() {
    return new Promise((resolve, reject) => {
      try {
        // Create worker with inline code or from file
        const workerCode = `
let pyodideReady = false;

async function initializePyodide() {
  if (pyodideReady) return;
  try {
    importScripts('https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js');
    const pyodide = await loadPyodide({
      indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.23.4/full/',
    });
    pyodideReady = true;
    self.pyodide = pyodide;
    return pyodide;
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: 'Pyodide initialization failed: ' + error.message,
    });
  }
}

function setupGameAPI() {
  const gameAPI = \`
# Game API for DroneCode
NORTH = 'north'
SOUTH = 'south'
EAST = 'east'
WEST = 'west'

_command_queue = []

def move(direction):
    _command_queue.append({'type': 'move', 'direction': direction})

def harvest():
    _command_queue.append({'type': 'harvest'})

def cut():
    _command_queue.append({'type': 'cut'})

def shoot():
    _command_queue.append({'type': 'shoot'})

def plant(entity='wheat'):
    _command_queue.append({'type': 'plant', 'entity': entity})

def get_commands():
    return _command_queue

def clear_commands():
    global _command_queue
    _command_queue = []
\`;
  self.pyodide.runPython(gameAPI);
}

async function executeUserCode(code, maxSteps, availableFuncs) {
  if (!pyodideReady) {
    await initializePyodide();
  }

  const pyodide = self.pyodide;
  
  try {
    setupGameAPI();
    
    const userCode = code.replace(/\\\\/g, '\\\\\\\\').replace(/\\'/g, \"\\\\\\\\\\\'\");
    
    const executionCode = \`
_command_queue = []
try:
    exec('''\${userCode}''', {
        'move': move,
        'harvest': harvest,
        'cut': cut,
        'shoot': shoot,
        'plant': plant,
        'get_commands': get_commands,
        'NORTH': NORTH,
        'SOUTH': SOUTH,
        'EAST': EAST,
        'WEST': WEST,
    })
    result_commands = list(_command_queue)
    result_error = None
except Exception as e:
    result_commands = list(_command_queue)
    result_error = str(type(e).__name__) + ': ' + str(e)
\`;

    pyodide.runPython(executionCode);
    
    const resultCommands = pyodide.globals.get('result_commands').toJs();
    const resultError = pyodide.globals.get('result_error');

    return {
      success: !resultError,
      commands: resultCommands || [],
      error: resultError || null,
    };
  } catch (error) {
    return {
      success: false,
      commands: [],
      error: 'Execution error: ' + (error.message || String(error)),
    };
  }
}

self.onmessage = async (event) => {
  const { type, payload } = event.data;

  try {
    switch (type) {
      case 'init':
        await initializePyodide();
        self.postMessage({ type: 'ready' });
        break;

      case 'execute':
        const result = await executeUserCode(
          payload.code,
          payload.maxSteps || 1000,
          payload.availableFunctions || []
        );
        self.postMessage({
          type: 'execution_complete',
          result,
          executionId: payload.executionId,
        });
        break;

      default:
        self.postMessage({ type: 'error', error: 'Unknown message type: ' + type });
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error.message || String(error),
      executionId: event.data.payload?.executionId,
    });
  }
};

initializePyodide();
`;

        const blob = new Blob([workerCode], { type: 'application/javascript' });
        this.worker = new Worker(URL.createObjectURL(blob));

        this.worker.onmessage = (e) => this.handleWorkerMessage(e);
        this.worker.onerror = (e) => {
          console.error('Worker error:', e);
          reject(e);
        };

        this.readyPromise = new Promise((resolveReady) => {
          this.readyCallback = resolveReady;
        });

        this.worker.postMessage({ type: 'init' });

        this.readyPromise.then(() => resolve());
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Handle messages from worker
   */
  handleWorkerMessage(event) {
    const { type, result, error, executionId } = event.data;

    if (type === 'ready') {
      if (this.readyCallback) {
        this.readyCallback();
      }
    } else if (type === 'execution_complete' && executionId) {
      const callback = this.executionCallbacks.get(executionId);
      if (callback) {
        callback(result);
        this.executionCallbacks.delete(executionId);
      }
    } else if (type === 'error') {
      console.error('Worker error:', error);
    }
  }

  /**
   * Execute user code
   */
  async executeCode(code, maxSteps, availableFunctions) {
    if (!this.readyPromise) {
      await this.initialize();
    }

    return new Promise((resolve) => {
      const executionId = ++this.executionCounter;

      this.executionCallbacks.set(executionId, (result) => {
        resolve(result);
      });

      this.worker.postMessage({
        type: 'execute',
        payload: {
          code,
          maxSteps,
          availableFunctions,
          executionId,
        },
      });
    });
  }

  /**
   * Terminate worker
   */
  terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}

export default RuntimeManager;
