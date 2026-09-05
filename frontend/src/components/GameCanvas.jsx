import React, { useEffect, useRef } from 'react'
import * as PIXI from 'pixi.js'
import './GameCanvas.css'

export default function GameCanvas({ gameState, levelData, width = 800, height = 500 }) {
  const canvasRef = useRef(null)
  const appRef = useRef(null)
  const graphicsRef = useRef(null)

  // Tile size in pixels
  const TILE_SIZE = 40
  const COLORS = {
    grass: 0x90ee90,
    wheat: 0xffd700,
    tree: 0x228b22,
    bush: 0x32cd32,
    rock: 0x808080,
    water: 0x4169e1,
    wall: 0x696969,
    bomb: 0xff4500,
  }

  useEffect(() => {
    if (!canvasRef.current || !gameState || !levelData) return

    // Initialize PixiJS app
    const app = new PIXI.Application({
      view: canvasRef.current,
      width,
      height,
      backgroundColor: 0x1a1a1a,
      antialias: true,
    })

    appRef.current = app
    const graphics = new PIXI.Graphics()
    app.stage.addChild(graphics)
    graphicsRef.current = graphics

    // Render game state
    renderGame(app, graphics, gameState, levelData)

    return () => {
      // Cleanup handled by PixiJS
    }
  }, [gameState, levelData, width, height])

  const renderGame = (app, graphics, state, levelData) => {
    if (!state) return

    graphics.clear()

    // Draw grid cells
    if (state.cells) {
      state.cells.forEach((cell) => {
        const color = COLORS[cell.type] || 0xcccccc
        const x = cell.x * TILE_SIZE
        const y = cell.y * TILE_SIZE

        // Draw cell
        graphics.beginFill(color)
        graphics.drawRect(x, y, TILE_SIZE, TILE_SIZE)
        graphics.endFill()

        // Draw border
        graphics.lineStyle(1, 0x444444)
        graphics.drawRect(x, y, TILE_SIZE, TILE_SIZE)
      })
    }

    // Draw drone
    if (state.drone) {
      const droneX = state.drone.x * TILE_SIZE + TILE_SIZE / 2
      const droneY = state.drone.y * TILE_SIZE + TILE_SIZE / 2

      // Draw drone circle
      graphics.beginFill(0xff6b6b)
      graphics.drawCircle(droneX, droneY, TILE_SIZE / 3)
      graphics.endFill()

      // Draw direction indicator
      const dirOffsets = {
        north: [0, -1],
        south: [0, 1],
        east: [1, 0],
        west: [-1, 0],
      }
      const [dx, dy] = dirOffsets[state.drone.facing] || [1, 0]
      const indicatorX = droneX + dx * 10
      const indicatorY = droneY + dy * 10

      graphics.lineStyle(2, 0xffff00)
      graphics.beginFill(0xffff00)
      graphics.drawCircle(indicatorX, indicatorY, 4)
      graphics.endFill()
    }

    // Draw game status overlay
    renderStatusOverlay(app, state, levelData)
  }

  const renderStatusOverlay = (app, state, levelData) => {
    // Remove old status text
    app.stage.children = app.stage.children.filter(
      (child) => !(child instanceof PIXI.Text)
    )

    const style = new PIXI.TextStyle({
      fontFamily: 'monospace',
      fontSize: 16,
      fill: 0xffffff,
    })

    // Draw lives
    const livesText = new PIXI.Text(`❤️ ${state.lives}/${levelData.max_lives}`, style)
    livesText.position.set(10, 10)
    app.stage.addChild(livesText)

    // Draw steps
    const stepsText = new PIXI.Text(`Steps: ${state.steps}/${levelData.max_steps}`, style)
    stepsText.position.set(10, 40)
    app.stage.addChild(stepsText)

    // Draw status
    if (state.status === 'won') {
      const winText = new PIXI.Text('✅ WIN!', new PIXI.TextStyle({
        fontFamily: 'monospace',
        fontSize: 32,
        fill: 0x00ff00,
        fontWeight: 'bold',
      }))
      winText.position.set(width / 2 - 40, height / 2 - 20)
      app.stage.addChild(winText)
    } else if (state.status === 'lost') {
      const loseText = new PIXI.Text('❌ LOST!', new PIXI.TextStyle({
        fontFamily: 'monospace',
        fontSize: 32,
        fill: 0xff0000,
        fontWeight: 'bold',
      }))
      loseText.position.set(width / 2 - 50, height / 2 - 20)
      app.stage.addChild(loseText)
    }
  }

  return (
    <div className="game-canvas-container">
      <h3>Game Canvas</h3>
      <canvas ref={canvasRef} className="game-canvas" />
    </div>
  )
}
