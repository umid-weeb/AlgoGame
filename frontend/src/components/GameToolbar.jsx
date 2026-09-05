import React from 'react'
import './GameToolbar.css'

export default function GameToolbar({ isRunning, onRun, onStop, onRestart }) {
  return (
    <div className="game-toolbar">
      <button 
        className="btn btn-play" 
        onClick={onRun}
        disabled={isRunning}
      >
        ▶ Run
      </button>
      <button 
        className="btn btn-stop" 
        onClick={onStop}
        disabled={!isRunning}
      >
        ⏹ Stop
      </button>
      <button 
        className="btn btn-restart" 
        onClick={onRestart}
      >
        🔄 Restart
      </button>
    </div>
  )
}
