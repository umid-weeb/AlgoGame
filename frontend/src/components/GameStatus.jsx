import React from 'react'
import './GameStatus.css'

export default function GameStatus({ gameState, executionLog, error }) {
  return (
    <div className="game-status-container">
      <div className="status-section">
        <h4>Execution Log</h4>
        <div className="log-output">
          {error && (
            <div className="log-entry error">
              ⚠️ {error}
            </div>
          )}
          {executionLog && executionLog.length > 0 ? (
            executionLog.map((entry, idx) => (
              <div
                key={idx}
                className={`log-entry ${
                  entry.includes('✅') ? 'success' :
                  entry.includes('❌') ? 'failed' :
                  entry.includes('⚠️') ? 'warning' : 'info'
                }`}
              >
                {entry}
              </div>
            ))
          ) : (
            <div className="log-entry empty">Ready to run...</div>
          )}
        </div>
      </div>

      {gameState && (
        <div className="status-details">
          <div className="status-row">
            <span className="label">Status:</span>
            <span className={`value ${gameState.status}`}>
              {gameState.status.toUpperCase()}
            </span>
          </div>
          <div className="status-row">
            <span className="label">Stars:</span>
            <span className="value">{'⭐'.repeat(gameState.stars)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
