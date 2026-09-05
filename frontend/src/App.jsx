import { useState, useEffect } from 'react'
import './App.css'
import CodeEditor from './components/CodeEditor'
import GameCanvas from './components/GameCanvas'
import GameToolbar from './components/GameToolbar'
import GameStatus from './components/GameStatus'
import FlightInfo from './components/FlightInfo'
import { GameEngine } from './engine/GameEngine'
import RuntimeManager from './runtime/RuntimeManager'
import apiClient from './api/client'

function App() {
  const [level, setLevel] = useState(null)
  const [gameEngine, setGameEngine] = useState(null)
  const [runtimeManager, setRuntimeManager] = useState(null)
  const [runtimeReady, setRuntimeReady] = useState(false)
  const [code, setCode] = useState('')
  const [gameState, setGameState] = useState(null)
  const [isRunning, setIsRunning] = useState(false)
  const [executionLog, setExecutionLog] = useState([])
  const [error, setError] = useState(null)
  const [showFlightInfo, setShowFlightInfo] = useState(false)
  const [language, setLanguage] = useState('uz')

  // Initialize runtime manager and load default level
  useEffect(() => {
    const init = async () => {
      try {
        // Load the level before the remote Pyodide runtime so the UI is usable
        // while the runtime is loading.
        const sampleLevel = {
          id: 1,
          title: 'Sample Level',
          grid_cells: [
            { x: 0, y: 0, type: 'grass' },
            { x: 1, y: 0, type: 'wheat' },
            { x: 2, y: 0, type: 'wheat' },
            { x: 0, y: 1, type: 'grass' },
            { x: 1, y: 1, type: 'grass' },
            { x: 2, y: 1, type: 'bomb' },
          ],
          drone_start: { x: 0, y: 0, facing: 'east' },
          available_functions: ['move', 'takeoff', 'land', 'turn_left', 'turn_right', 'hover', 'harvest', 'cut', 'shoot', 'plant'],
          starter_code: "def harvest_route(matrix):\n    # Function automatically receives the map; do not call it below.\n    takeoff()\n    for column in range(1, len(matrix[0])):\n        move(EAST)\n        land()\n        if matrix[0][column] == 'wheat':\n            harvest()\n        takeoff()\n    land()",
          win_condition: { type: 'all_wheat_harvested' },
          max_lives: 3,
          max_steps: 1000,
          stars_thresholds: { '10': 3, '20': 2, '50': 1 },
        }

        setLevel(sampleLevel)
        setCode(sampleLevel.starter_code)

        const engine = new GameEngine(sampleLevel)
        setGameEngine(engine)
        setGameState(engine.getState())

        const runtime = new RuntimeManager()
        await runtime.initialize()
        setRuntimeManager(runtime)
        setRuntimeReady(true)
      } catch (err) {
        setError(`Python runtime is not ready: ${err.message}`)
        console.error(err)
      }
    }

    init()

    return () => {
      runtimeManager?.terminate()
    }
  }, [])

  /**
   * Run the code
   */
  const handleRun = async () => {
    if (!runtimeReady || !runtimeManager || !gameEngine) {
      setError('Python runtime is still loading. Please wait a moment and try again.')
      return
    }

    setIsRunning(true)
    setError(null)
    setExecutionLog([])
    gameEngine.resetState()

    try {
      // Execute Python code
      const result = await runtimeManager.executeCode(
        code,
        level.max_steps,
        level.available_functions,
        gameEngine.getState()
      )

      const output = (result.output || []).map((line) => `› ${line}`)
      if (!result.success) {
        setError(result.error)
        gameEngine.addError(result.error)
        gameEngine.loseGame()
      } else {
        // Queue all commands
        result.commands.forEach((cmd) => {
          gameEngine.queueCommand(cmd)
        })

        // Execute commands one by one with animation
        while (gameEngine.commandQueue.length > 0 && gameEngine.gameStatus === 'running') {
          gameEngine.executeNextCommand()
          setGameState({ ...gameEngine.getState() })
          
          // Small delay for visualization
          await new Promise((resolve) => setTimeout(resolve, 100))
        }
      }

      // Final state update
      setGameState(gameEngine.getState())
      setExecutionLog([...output, ...gameEngine.log])
    } catch (err) {
      setError(`Execution error: ${err.message}`)
      console.error(err)
    } finally {
      setIsRunning(false)
    }
  }

  /**
   * Stop execution
   */
  const handleStop = () => {
    runtimeManager?.stop()
    if (gameEngine) {
      gameEngine.loseGame()
      setGameState(gameEngine.getState())
    }
    setIsRunning(false)
  }

  /**
   * Restart level
   */
  const handleRestart = () => {
    if (gameEngine) {
      gameEngine.resetState()
      setGameState(gameEngine.getState())
      setExecutionLog([])
      setError(null)
    }
    setIsRunning(false)
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="brand-lockup">
          <span className="brand-mark">DC</span>
          <div>
            <strong>DroneCode</strong>
            <span>Python flight school</span>
          </div>
        </div>
        <div className="level-heading">
          <span>MISSION 01</span>
          <strong>{level?.title || 'Loading mission...'}</strong>
        </div>
        <div className={`runtime-pill ${runtimeReady ? 'ready' : 'loading'}`}>
          <span className="runtime-dot" />
          {runtimeReady ? 'Python ready' : 'Loading Python'}
        </div>
      </header>

      <main className="app-main">
        <div className="left-panel">
          <div className="panel-heading">
            <button className="info-button" type="button" onClick={() => setShowFlightInfo(true)}>
              <span>i</span> Info
            </button>
          </div>
        <CodeEditor
          value={code}
          onChange={setCode}
          disabled={isRunning}
          toolbar={(
            <GameToolbar
              isRunning={isRunning}
              runtimeReady={runtimeReady}
              onRun={handleRun}
              onStop={handleStop}
              onRestart={handleRestart}
            />
          )}
        />
          <div className="editor-footer">
            <span>Python 3</span>
            <span>Max {level?.max_steps || 0} steps</span>
          </div>
      </div>

      <div className="right-panel">
        <GameCanvas
          gameState={gameState}
          levelData={level}
          width={800}
          height={500}
        />
        <GameStatus
          gameState={gameState}
          executionLog={executionLog}
          error={error}
        />
      </div>
      </main>
      {showFlightInfo && (
        <FlightInfo
          language={language}
          onLanguageChange={setLanguage}
          onClose={() => setShowFlightInfo(false)}
        />
      )}
    </div>
  )
}

export default App
