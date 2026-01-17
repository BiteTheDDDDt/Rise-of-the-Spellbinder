import { gameState, gameLoop } from '.'

export interface SaveData {
  version: string
  gameTime: number
  isPaused: boolean
  lastUpdate: number
  // Additional game data will be added later
  meta: {
    savedAt: number
    playTime: number
  }
}

const SAVE_KEY = 'rise_of_the_spellbinder_save'
const AUTO_SAVE_INTERVAL = 30 * 1000 // 30 seconds
const VERSION = '1.0.0'

export class SaveSystem {
  private autoSaveTimer: number | null = null
  private lastSaveTime: number = 0

  constructor() {
    this.setupAutoSave()
  }

  private setupAutoSave() {
    // Auto-save every 30 seconds
    this.autoSaveTimer = window.setInterval(() => {
      this.saveToLocalStorage()
    }, AUTO_SAVE_INTERVAL)

    // Also save when page is about to unload
    window.addEventListener('beforeunload', () => this.saveToLocalStorage())
  }

  getSaveData(): SaveData {
    const state = gameState.data
    return {
      version: VERSION,
      gameTime: state.gameTime,
      isPaused: state.isPaused,
      lastUpdate: state.lastUpdate,
      meta: {
        savedAt: Date.now(),
        playTime: state.gameTime
      }
    }
  }

  loadSaveData(data: SaveData): boolean {
    try {
      if (data.version !== VERSION) {
        console.warn(`Save version mismatch: ${data.version} != ${VERSION}`)
        // TODO: implement migration logic
      }

      const state = gameState.data
      state.gameTime = data.gameTime
      state.isPaused = data.isPaused
      state.lastUpdate = Date.now() // Reset lastUpdate to now

      console.log('Game loaded successfully')
      return true
    } catch (error) {
      console.error('Failed to load save data:', error)
      return false
    }
  }

  saveToLocalStorage(): boolean {
    try {
      const data = this.getSaveData()
      localStorage.setItem(SAVE_KEY, JSON.stringify(data))
      this.lastSaveTime = Date.now()
      console.debug('Game saved to localStorage')
      return true
    } catch (error) {
      console.error('Failed to save to localStorage:', error)
      return false
    }
  }

  loadFromLocalStorage(): boolean {
    try {
      const json = localStorage.getItem(SAVE_KEY)
      if (!json) return false

      const data = JSON.parse(json) as SaveData
      return this.loadSaveData(data)
    } catch (error) {
      console.error('Failed to load from localStorage:', error)
      return false
    }
  }

  exportSave(): string {
    const data = this.getSaveData()
    return JSON.stringify(data, null, 2)
  }

  importSave(json: string): boolean {
    try {
      const data = JSON.parse(json) as SaveData
      return this.loadSaveData(data)
    } catch (error) {
      console.error('Failed to import save:', error)
      return false
    }
  }

  deleteSave(): void {
    localStorage.removeItem(SAVE_KEY)
  }

  hasSave(): boolean {
    return localStorage.getItem(SAVE_KEY) !== null
  }

  cleanup() {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer)
      this.autoSaveTimer = null
    }
  }
}

// Create singleton instance
export const saveSystem = new SaveSystem()

// Auto-load on startup if save exists
if (saveSystem.hasSave()) {
  saveSystem.loadFromLocalStorage()
}