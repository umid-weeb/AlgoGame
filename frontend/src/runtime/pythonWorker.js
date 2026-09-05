/* global loadPyodide */
let pyodide = null
let initializing = null

const DIRECTIONS = { NORTH: 'north', SOUTH: 'south', EAST: 'east', WEST: 'west' }

async function initializePyodide() {
  if (pyodide) return pyodide
  if (!initializing) {
    initializing = (async () => {
      importScripts('https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js')
      pyodide = await loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/' })
      return pyodide
    })()
  }
  return initializing
}

// matrix[row][column] contains a tile type, while null represents a missing
// tile. This makes irregular maps directly usable with Python loops and ifs.
function matrixFromState(gameState) {
  const cells = gameState?.cells || []
  const maxX = Math.max(0, ...cells.map((cell) => cell.x))
  const maxY = Math.max(0, ...cells.map((cell) => cell.y))
  const matrix = Array.from({ length: maxY + 1 }, () => Array(maxX + 1).fill(null))
  cells.forEach((cell) => { matrix[cell.y][cell.x] = cell.type })
  return matrix
}

async function executeUserCode({ code, maxSteps, availableFunctions, gameState }) {
  const runtime = await initializePyodide()
  const allowed = new Set(availableFunctions || [])
  const commandQueue = []
  const output = []
  let commandLimitReached = false
  runtime.setStdout({ batched: (text) => output.push(text) })
  const enqueue = (type, extra = {}) => {
    if (commandQueue.length >= maxSteps) {
      commandLimitReached = true
      return
    }
    commandQueue.push({ type, ...extra })
  }

  const api = {
    matrix: runtime.toPy(matrixFromState(gameState)),
    NORTH: DIRECTIONS.NORTH, SOUTH: DIRECTIONS.SOUTH, EAST: DIRECTIONS.EAST, WEST: DIRECTIONS.WEST,
    move: (direction) => enqueue('move', { direction: String(direction).toLowerCase() }),
    harvest: () => enqueue('harvest'),
    cut: () => enqueue('cut'),
    shoot: () => enqueue('shoot'),
    plant: (entity = 'wheat') => enqueue('plant', { entity: String(entity) }),
    takeoff: () => enqueue('takeoff'),
    land: () => enqueue('land'),
    turn_left: () => enqueue('turn', { direction: 'left' }),
    turn_right: () => enqueue('turn', { direction: 'right' }),
    hover: () => enqueue('hover'),
  }
  runtime.runPython(`
import builtins
_dronecode_safe_builtins = {
    name: getattr(builtins, name) for name in (
        'abs', 'all', 'any', 'bool', 'dict', 'enumerate', 'float', 'int',
        'len', 'list', 'max', 'min', 'range', 'reversed', 'round', 'set',
        'print', 'sorted', 'str', 'sum', 'tuple', 'zip'
    )
}
`)
  const safeBuiltins = runtime.globals.get('_dronecode_safe_builtins')
  const userGlobals = {
    __builtins__: safeBuiltins,
    matrix: api.matrix,
    NORTH: api.NORTH, SOUTH: api.SOUTH, EAST: api.EAST, WEST: api.WEST,
  }
  ;['move', 'harvest', 'cut', 'shoot', 'plant', 'takeoff', 'land', 'turn_left', 'turn_right', 'hover']
    .filter((name) => allowed.has(name))
    .forEach((name) => { userGlobals[name] = api[name] })

  try {
    runtime.globals.set('_student_code', code)
    runtime.globals.set('_student_globals', runtime.toPy(userGlobals))
    await runtime.runPythonAsync('exec(_student_code, _student_globals, _student_globals)')
    // A lesson is a function-based exercise. The last user-defined function
    // that accepts one argument is the entry point and receives `matrix`.
    // Students therefore write `def any_name(matrix): ...` without a manual
    // function call at the end of their code.
    await runtime.runPythonAsync(`
from types import FunctionType
_student_entry = next(
    (item for item in reversed(list(_student_globals.values()))
     if isinstance(item, FunctionType) and item.__code__.co_argcount == 1),
    None,
)
if _student_entry is not None:
    _student_entry(_student_globals['matrix'])
`)
    if (commandLimitReached) {
      return {
        success: false,
        commands: commandQueue,
        output,
        error: `Command limit reached: this level allows at most ${maxSteps} actions. Use a smaller loop or add a stopping condition.`,
      }
    }
    return { success: true, commands: commandQueue, output, error: null }
  } catch (error) {
    return { success: false, commands: commandQueue, output, error: String(error.message || error) }
  } finally {
    runtime.globals.delete('_student_code')
    runtime.globals.delete('_student_globals')
    runtime.globals.delete('_student_entry')
    runtime.globals.delete('_dronecode_safe_builtins')
    safeBuiltins.destroy?.()
    api.matrix.destroy?.()
  }
}

self.onmessage = async ({ data }) => {
  try {
    if (data.type === 'init') {
      await initializePyodide()
      self.postMessage({ type: 'ready' })
      return
    }
    if (data.type === 'execute') {
      const result = await executeUserCode(data.payload)
      self.postMessage({ type: 'execution_complete', executionId: data.payload.executionId, result })
    }
  } catch (error) {
    self.postMessage({
      type: 'execution_complete',
      executionId: data.payload?.executionId,
      result: { success: false, commands: [], error: String(error.message || error) },
    })
  }
}
