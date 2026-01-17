import { GameState } from './GameState'
import { GameLoop } from './GameLoop'
import { saveSystem, SaveSystem } from './SaveSystem'

// Create game state instance
export const gameState = new GameState()

// Create game loop instance
export const gameLoop = new GameLoop(gameState)

// Export for convenience
export { GameState, GameLoop, SaveSystem }
export { saveSystem }

// Start the game loop automatically (can be controlled via UI)
gameLoop.start()

// Connect save/load events
gameLoop.on('save', () => {
  saveSystem.saveToLocalStorage()
})

gameLoop.on('load', () => {
  saveSystem.loadFromLocalStorage()
})

// Debug: log tick events in development
if (import.meta.env.DEV) {
  gameLoop.on('tick', (delta) => {
    console.debug(`Tick: ${delta.toFixed(3)}s`)
  })
  gameLoop.on('pause', () => console.debug('Game paused'))
  gameLoop.on('resume', () => console.debug('Game resumed'))
  gameLoop.on('save', () => console.debug('Save requested'))
  gameLoop.on('load', () => console.debug('Load requested'))
}