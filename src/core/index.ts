import { GameState } from './GameState'
import { GameLoop } from './GameLoop'
import { saveSystem, SaveSystem } from './SaveSystem'
import { definitionsManager } from './Definitions'
import { logSystem } from '../systems/log'

// Create game state instance
export const gameState = new GameState()

// Create game loop instance
export const gameLoop = new GameLoop(gameState)

// Setup auto-save after gameState is fully initialized
saveSystem.setupAutoSave()

// Export for convenience
export { GameState, GameLoop, SaveSystem }
export { saveSystem, definitionsManager }

// Start the game loop automatically (can be controlled via UI)
gameLoop.start()

// Connect save/load events
gameLoop.on('save', () => {
  saveSystem.saveToLocalStorage()
})

gameLoop.on('load', () => {
  saveSystem.loadFromLocalStorage()
})

// Log game events
gameLoop.on('pause', () => {
  logSystem.info('游戏已暂停')
  if (import.meta.env.DEV) console.debug('Game paused')
})

gameLoop.on('resume', () => {
  logSystem.info('游戏已恢复')
  if (import.meta.env.DEV) console.debug('Game resumed')
})

gameLoop.on('save', () => {
  logSystem.success('游戏已保存')
  if (import.meta.env.DEV) console.debug('Save requested')
})

gameLoop.on('load', () => {
  logSystem.info('游戏已加载')
  if (import.meta.env.DEV) console.debug('Load requested')
})