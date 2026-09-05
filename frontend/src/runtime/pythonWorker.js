/**
 * Python Runtime - Web Worker for executing user Python code with Pyodide
 * Runs in isolated Web Worker to prevent blocking UI and for security
 */

let pyodideReady = false;
let availableFunctions = [];

/**
 * Initialize Pyodide
 */
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
    console.error('Failed to initialize Pyodide:', error);
    self.postMessage({
      type: 'error',
      error: `Pyodide initialization failed: ${error.message}`,
    });
  }
}

/**
 * Set up game API in Python
 */
function setupGameAPI(pyodide, commandQueue) {
  const pyCommandQueue = pyodide.toPy(commandQueue);

  const gameAPI = `
# Game API for DroneCode
import json

# Direction constants
NORTH = 'north'
SOUTH = 'south'
EAST = 'east'
WEST = 'west'

# Command queue for game commands
_command_queue = []
_execution_state = {'steps': 0, 'max_steps': 1000}

def move(direction):
    """Move drone in specified direction"""
    _command_queue.append({'type': 'move', 'direction': direction})

def harvest():
    """Harvest wheat at current position"""
    _command_queue.append({'type': 'harvest'})

def cut():
    """Cut tree/bush at current position"""
    _command_queue.append({'type': 'cut'})

def shoot():
    """Shoot in facing direction"""
    _command_queue.append({'type': 'shoot'})

def plant(entity='wheat'):
    """Plant entity at current position"""
    _command_queue.append({'type': 'plant', 'entity': entity})

def get_position():
    """Get current drone position (returns dict)"""
    return {'x': 0, 'y': 0}  # Will be updated by JS

def get_facing():
    """Get current drone facing direction"""
    return 'east'  # Will be updated by JS

def get_health():
    """Get current health/lives"""
    return 3  # Will be updated by JS

def get_commands():
    """Get command queue for execution"""
    return _command_queue

def clear_commands():
    """Clear command queue"""
    global _command_queue
    _command_queue = []
`;

  pyodide.runPython(gameAPI);
}

/**
 * Execute user code
 */
async function executeUserCode(code, maxSteps, availableFuncs) {
  if (!pyodideReady) {
    await initializePyodide();
  }

  const pyodide = self.pyodide;
  const commandQueue = [];

  try {
    // Setup game API
    setupGameAPI(pyodide, commandQueue);

    // Filter available functions and make them callable
    const restrictedAPI = availableFuncs.join(',');
    const validationCode = `
allowed_functions = set('${restrictedAPI}'.split(','))

import sys

class RestrictedExecution:
    def __init__(self):
        self.command_queue = []
        self.step_count = 0
        self.max_steps = ${maxSteps}
    
    def check_allowed(self, func_name):
        if func_name not in allowed_functions:
            raise NameError(f"Function '{func_name}' is not available in this level")

execution_context = RestrictedExecution()
`;
    pyodide.runPython(validationCode);

    // Execute user code with timeout and step limit
    const executionCode = `
execution_context.command_queue = []
try:
    exec('''${code.replace(/'/g, "\\'")}''', {
        'move': move,
        'harvest': harvest,
        'cut': cut,
        'shoot': shoot,
        'plant': plant,
        'get_position': get_position,
        'get_facing': get_facing,
        'get_health': get_health,
        'NORTH': NORTH,
        'SOUTH': SOUTH,
        'EAST': EAST,
        'WEST': WEST,
    })
    result_commands = _command_queue
    result_error = None
except Exception as e:
    result_commands = _command_queue
    result_error = str(type(e).__name__) + ': ' + str(e)
`;

    pyodide.runPython(executionCode);

    const resultCommands = pyodide.globals.get('result_commands').toJs();
    const resultError = pyodide.globals.get('result_error');

    // Clean up
    pyodide.globals.delete('result_commands');
    pyodide.globals.delete('result_error');

    return {
      success: !resultError,
      commands: resultCommands || [],
      error: resultError || null,
    };
  } catch (error) {
    return {
      success: false,
      commands: [],
      error: error.message || String(error),
    };
  }
}

/**
 * Message handler for web worker
 */
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
        self.postMessage({ type: 'error', error: `Unknown message type: ${type}` });
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error.message || String(error),
      executionId: event.data.payload?.executionId,
    });
  }
};

// Initialize on worker start
initializePyodide();
