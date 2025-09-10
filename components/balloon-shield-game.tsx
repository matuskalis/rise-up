
'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { GameEngine } from '@/lib/game-engine'
import { GameState } from '@/lib/types'

const BalloonShieldGame = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameEngineRef = useRef<GameEngine | null>(null)
  const [gameState, setGameState] = useState<GameState>('menu')
  const [score, setScore] = useState(0)
  const [bestScore, setBestScore] = useState(0)
  const [showSettings, setShowSettings] = useState(false)

  // Load best score from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('balloon-shield-best')
    if (saved) {
      setBestScore(parseInt(saved, 10))
    }
  }, [])

  // Initialize game engine
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const engine = new GameEngine(canvas)
    gameEngineRef.current = engine

    // Set up game callbacks
    engine.onScoreChange = setScore
    engine.onGameStateChange = (state: GameState) => {
      setGameState(state)
      if (state === 'gameOver') {
        const currentScore = engine.getScore()
        if (currentScore > bestScore) {
          setBestScore(currentScore)
          localStorage.setItem('balloon-shield-best', currentScore.toString())
        }
      }
    }

    // Start the game loop
    engine.start()

    return () => {
      engine.stop()
    }
  }, [bestScore])

  const handleStart = useCallback(() => {
    gameEngineRef.current?.startGame()
  }, [])

  const handleRestart = useCallback(() => {
    gameEngineRef.current?.restartGame()
  }, [])

  const handlePause = useCallback(() => {
    gameEngineRef.current?.pauseGame()
  }, [])

  const handleResume = useCallback(() => {
    gameEngineRef.current?.resumeGame()
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'Space':
        case 'Enter':
          e.preventDefault()
          if (gameState === 'menu') {
            handleStart()
          } else if (gameState === 'gameOver') {
            handleRestart()
          }
          break
        case 'Escape':
          e.preventDefault()
          if (gameState === 'playing') {
            handlePause()
          } else if (gameState === 'paused') {
            handleResume()
          }
          break
        case 'KeyH':
          e.preventDefault()
          gameEngineRef.current?.toggleDebug()
          break
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [gameState, handleStart, handleRestart, handlePause, handleResume])

  return (
    <div className="relative h-screen w-screen bg-gray-900 overflow-hidden">
      {/* Game Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 cursor-none"
        width={1920}
        height={1080}
        style={{ 
          width: '100vw', 
          height: '100vh',
          imageRendering: 'pixelated'
        }}
      />

      {/* HUD */}
      {gameState === 'playing' && (
        <div className="absolute inset-0 pointer-events-none">
          {/* Score Display */}
          <div className="absolute top-4 left-4 text-white font-mono">
            <div className="text-lg">Altitude: {Math.floor(score)}m</div>
          </div>
          <div className="absolute top-4 right-4 text-white font-mono">
            <div className="text-lg">Best: {Math.floor(bestScore)}m</div>
          </div>
          
          {/* Settings Button */}
          <button
            className="absolute top-4 right-4 mt-8 bg-black/50 text-white px-3 py-1 rounded text-sm pointer-events-auto"
            onClick={() => setShowSettings(!showSettings)}
          >
            Settings
          </button>
        </div>
      )}

      {/* Menu Screen */}
      {gameState === 'menu' && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
          <div className="text-center text-white">
            <h1 className="text-6xl font-bold mb-2 text-blue-400">BALLOON SHIELD</h1>
            <p className="text-xl mb-8 text-gray-300">Protect the balloon with precise movements</p>
            <div className="space-y-4">
              <button
                onClick={handleStart}
                className="block mx-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded text-lg font-semibold transition-colors"
              >
                START GAME
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="block mx-auto bg-gray-600 hover:bg-gray-700 text-white px-8 py-3 rounded text-lg font-semibold transition-colors"
              >
                SETTINGS
              </button>
            </div>
            <div className="mt-8 text-gray-400">
              <div>Best Score: {Math.floor(bestScore)}m</div>
              <div className="text-sm mt-4">
                <div>Mouse: Move Shield</div>
                <div>WASD: Alternative Control</div>
                <div>H: Toggle Debug</div>
                <div>ESC: Pause</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Game Over Screen */}
      {gameState === 'gameOver' && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
          <div className="text-center text-white">
            <h2 className="text-4xl font-bold mb-4 text-red-400">GAME OVER</h2>
            <div className="text-2xl mb-2">Altitude Reached</div>
            <div className="text-6xl font-bold mb-4 text-blue-400">{Math.floor(score)}m</div>
            {score > bestScore && (
              <div className="text-xl text-green-400 mb-4">NEW BEST!</div>
            )}
            <div className="text-lg text-gray-400 mb-8">Best: {Math.floor(bestScore)}m</div>
            <button
              onClick={handleRestart}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded text-lg font-semibold transition-colors"
            >
              RETRY (Space/Enter)
            </button>
          </div>
        </div>
      )}

      {/* Pause Screen */}
      {gameState === 'paused' && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <div className="text-center text-white">
            <h2 className="text-4xl font-bold mb-8">PAUSED</h2>
            <button
              onClick={handleResume}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded text-lg font-semibold transition-colors"
            >
              RESUME (ESC)
            </button>
          </div>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
          <div className="bg-gray-800 p-8 rounded-lg text-white max-w-md">
            <h3 className="text-2xl font-bold mb-6">Settings</h3>
            
            {/* Sensitivity Setting */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">
                Mouse Sensitivity
              </label>
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.1"
                defaultValue="1.0"
                className="w-full"
                onChange={(e) => {
                  gameEngineRef.current?.setSensitivity(parseFloat(e.target.value))
                }}
              />
              <div className="text-xs text-gray-400 mt-1">0.5x - 1.5x</div>
            </div>

            {/* Shield Size (Accessibility) */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">
                Shield Size (Accessibility)
              </label>
              <select
                className="w-full bg-gray-700 p-2 rounded"
                onChange={(e) => {
                  gameEngineRef.current?.setShieldSize(e.target.value as 'small' | 'normal' | 'large')
                }}
              >
                <option value="normal">Normal</option>
                <option value="large">Large (Assist)</option>
                <option value="small">Small (Hard)</option>
              </select>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setShowSettings(false)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default BalloonShieldGame
