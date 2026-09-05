import { useState, useEffect } from 'react'
import './App.css'
import CodeEditor from './components/CodeEditor'
import GameCanvas from './components/GameCanvas'
import GameToolbar from './components/GameToolbar'
import GameStatus from './components/GameStatus'
import { GameEngine } from './engine/GameEngine'
import RuntimeManager from './runtime/RuntimeManager'
import apiClient from './api/client'

function App() {
  const [level, setLevel] = useState(null)
  const [gameEngine, setGameEngine] = useState(null)
  const [runtimeManager, setRuntimeManager] = useState(null)
  const [code, setCode] = useState('')
  const [gameState, setGameState] = useState(null)
  const [isRunning, setIsRunning] = useState(false)
  const [executionLog, setExecutionLog] = useState([])
  const [error, setError] = useState(null)

  // Initialize runtime manager and load default level
  useEffect(() => {
    const init = async () => {
      try {
        const runtime = new RuntimeManager()
        await runtime.initialize()
        setRuntimeManager(runtime)

        // Load a sample level for demonstration
        // In production, this would come from URL or props
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
          available_functions: ['move', 'harvest', 'shoot'],
          starter_code: 'move(EAST)\nharvest()',
          win_condition: { type: 'all_wheat_harvested' },
          max_lives: 3,
          max_steps: 50,
          stars_thresholds: { '10': 3, '20': 2, '50': 1 },
        }

        setLevel(sampleLevel)
        setCode(sampleLevel.starter_code)

        const engine = new GameEngine(sampleLevel)
        setGameEngine(engine)
        setGameState(engine.getState())
      } catch (err) {
        setError(`Initialization failed: ${err.message}`)
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
    if (!runtimeManager || !gameEngine) return

    setIsRunning(true)
    setError(null)
    setExecutionLog([])
    gameEngine.resetState()

    try {
      // Execute Python code
      const result = await runtimeManager.executeCode(
        code,
        level.max_steps,
        level.available_functions
      )

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
      setExecutionLog(gameEngine.log)
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
      <div className="left-panel">
        <GameToolbar
          isRunning={isRunning}
          onRun={handleRun}
          onStop={handleStop}
          onRestart={handleRestart}
        />
        <CodeEditor
          value={code}
          onChange={setCode}
          language="python"
          availableFunctions={level?.available_functions || []}
          disabled={isRunning}
        />
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
    </div>
  )
}

export default App
            Edit <code>src/App.jsx</code> and save to test <code>HMR</code>
          </p>
        </div>
        <button
          type="button"
          className="counter"
          onClick={() => setCount((count) => count + 1)}
        >
          Count is {count}
        </button>
      </section>

      <div className="ticks"></div>

      <section id="next-steps">
        <div id="docs">
          <svg className="icon" role="presentation" aria-hidden="true">
            <use href="/icons.svg#documentation-icon"></use>
          </svg>
          <h2>Documentation</h2>
          <p>Your questions, answered</p>
          <ul>
            <li>
              <a href="https://vite.dev/" target="_blank">
                <img className="logo" src={viteLogo} alt="" />
                Explore Vite
              </a>
            </li>
            <li>
              <a href="https://react.dev/" target="_blank">
                <img className="button-icon" src={reactLogo} alt="" />
                Learn more
              </a>
            </li>
          </ul>
        </div>
        <div id="social">
          <svg className="icon" role="presentation" aria-hidden="true">
            <use href="/icons.svg#social-icon"></use>
          </svg>
          <h2>Connect with us</h2>
          <p>Join the Vite community</p>
          <ul>
            <li>
              <a href="https://github.com/vitejs/vite" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#github-icon"></use>
                </svg>
                GitHub
              </a>
            </li>
            <li>
              <a href="https://chat.vite.dev/" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#discord-icon"></use>
                </svg>
                Discord
              </a>
            </li>
            <li>
              <a href="https://x.com/vite_js" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#x-icon"></use>
                </svg>
                X.com
              </a>
            </li>
            <li>
              <a href="https://bsky.app/profile/vite.dev" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#bluesky-icon"></use>
                </svg>
                Bluesky
              </a>
            </li>
          </ul>
        </div>
      </section>

      <div className="ticks"></div>
      <section id="spacer"></section>
    </>
  )
}

export default App
