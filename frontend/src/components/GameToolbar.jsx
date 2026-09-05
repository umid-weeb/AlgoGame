import React from 'react'
import './GameToolbar.css'

export default function GameToolbar({ isRunning, runtimeReady, onRun, onStop, onRestart }) {
  return (
    <div className="game-toolbar">
      <button 
        className="btn btn-play" 
        onClick={onRun}
        disabled={isRunning || !runtimeReady}
      >
        <span>▶</span> Run code
      </button>
      <button 
        className="btn btn-stop" 
        onClick={onStop}
        disabled={!isRunning}
      >
        <span>■</span> Stop
      </button>
      <button 
        className="btn btn-restart" 
        onClick={onRestart}
      >
        <span>↻</span> Restart
      </button>
    </div>
  )
}
