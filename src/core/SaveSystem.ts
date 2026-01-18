import { gameState } from '.'
import { Player } from '../entities/player'
import { ActivityRunner } from '../systems/activity'
import { logSystem } from '../systems/log'
import { definitionsManager } from './Definitions'
import { itemManager } from '../systems/item'

export interface SaveData {
  version: string
  gameTime: number
  isPaused: boolean
  lastUpdate: number
  player: any
  activityRunner: any
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
  // @ts-ignore
  private _lastSaveTime: number = 0
  skipAutoLoad: boolean = false
  private autoSaveSetup = false  // 标记是否已设置自动保存

  constructor() {
    // 不在构造函数中设置自动保存，延迟到游戏完全初始化后
  }

  public setupAutoSave() {
    if (this.autoSaveSetup) return  // 防止重复设置

    // Auto-save every 30 seconds
    this.autoSaveTimer = window.setInterval(() => {
      this.saveToLocalStorage()
    }, AUTO_SAVE_INTERVAL)

    // Also save when page is about to unload
    window.addEventListener('beforeunload', () => this.saveToLocalStorage())

    this.autoSaveSetup = true
  }

  getSaveData(): SaveData {
    const state = gameState.data
    return {
      version: VERSION,
      gameTime: state.gameTime,
      isPaused: state.isPaused,
      lastUpdate: state.lastUpdate,
      player: state.player.toJSON(),
      activityRunner: state.activityRunner.toJSON(),
      meta: {
        savedAt: Date.now(),
        playTime: state.gameTime
      }
    }
  }

  loadSaveData(data: SaveData): boolean {
    try {
      if (data.version !== VERSION) {
        logSystem.warning(`存档版本不匹配: ${data.version} != ${VERSION}`)
        console.warn(`Save version mismatch: ${data.version} != ${VERSION}`)
        // TODO: implement migration logic
      }

      const state = gameState.data
      state.gameTime = data.gameTime
      state.isPaused = data.isPaused
      state.lastUpdate = Date.now() // Reset lastUpdate to now

      if (data.player) {
        // Get definitions for player loading
        const skillDefinitions = definitionsManager.getSkillDefinitions()
        const spellDefinitions = definitionsManager.getSpellDefinitions()
        const achievementDefinitions = definitionsManager.getAchievementDefinitions()
        
        state.player = Player.fromJSON(
          data.player,
          skillDefinitions,
          spellDefinitions,
          achievementDefinitions,
          itemManager
        )
      }
      if (data.activityRunner) {
        state.activityRunner = ActivityRunner.fromJSON(data.activityRunner)
        // 重新设置 achievementManager 和 resourceManager 引用
        state.activityRunner.achievementManager = state.player.achievementManager
        state.activityRunner.resourceManager = state.player.resourceManager
      }
      // 重新连接活动回调
      gameState.reconnectActivityCallbacks()

      logSystem.info('游戏数据加载成功')
      return true
    } catch (error) {
      logSystem.error('加载游戏数据失败', { error: String(error) })
      console.error('Failed to load save data:', error)
      return false
    }
  }

  saveToLocalStorage(): boolean {
    try {
      const data = this.getSaveData()
      localStorage.setItem(SAVE_KEY, JSON.stringify(data))
      this._lastSaveTime = Date.now()
      logSystem.success('游戏已保存到本地存储', { savedAt: Date.now() })
      if (import.meta.env.DEV) console.debug('Game saved to localStorage')
      return true
    } catch (error) {
      logSystem.error('保存游戏失败', { error: String(error) })
      console.error('Failed to save to localStorage:', error)
      return false
    }
  }

  loadFromLocalStorage(): boolean {
    try {
      const json = localStorage.getItem(SAVE_KEY)
      if (!json) return false

      const data = JSON.parse(json) as SaveData
      const success = this.loadSaveData(data)
      if (success) {
        logSystem.success('游戏已从本地存储加载', { savedAt: data.meta?.savedAt })
      }
      return success
    } catch (error) {
      logSystem.error('加载游戏失败', { error: String(error) })
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
      logSystem.info('正在导入存档', { version: data.version })
      return this.loadSaveData(data)
    } catch (error) {
      logSystem.error('导入存档失败', { error: String(error) })
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

  disableAutoLoad() {
    this.skipAutoLoad = true
  }

  enableAutoLoad() {
    this.skipAutoLoad = false
  }

  loadIfSaveExists(): boolean {
    if (this.hasSave()) {
      return this.loadFromLocalStorage()
    }
    return false
  }
}

// Create singleton instance
export const saveSystem = new SaveSystem()