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
  hasStarted: boolean
  monsters?: any[] // 可选的怪物数据，如果没有则使用定义中的数据
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
    console.log('[SaveSystem] Initialized with key:', SAVE_KEY)
    this.debugLocalStorage()
  }

  private debugLocalStorage() {
    console.log('[SaveSystem] All localStorage keys:', Object.keys(localStorage))
    console.log('[SaveSystem] Save exists:', localStorage.getItem(SAVE_KEY) !== null)
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
      hasStarted: state.hasStarted,
      monsters: state.monsters,
      meta: {
        savedAt: Date.now(),
        playTime: state.gameTime
      }
    }
  }

  loadSaveData(data: SaveData): boolean {
    try {
      console.log('[SaveSystem] Loading save data...', { 
        version: data.version, 
        hasStarted: data.hasStarted,
        gameTime: data.gameTime,
        hasPlayer: !!data.player,
        hasActivityRunner: !!data.activityRunner,
        hasMonsters: !!data.monsters,
        monstersCount: data.monsters?.length || 0
      })
      
      if (data.version !== VERSION) {
        logSystem.warning(`存档版本版本不匹配: ${data.version} != ${VERSION}`)
        console.warn(`Save version mismatch: ${data.version} != ${VERSION}`)
        // TODO: implement migration logic
      }

      // 检查定义是否已加载
      const skillDefs = definitionsManager.getSkillDefinitions()
      const spellDefs = definitionsManager.getSpellDefinitions()
      const achievementDefs = definitionsManager.getAchievementDefinitions()
      const monsterDefs = definitionsManager.getMonsterDefinitions()
      
      console.log('[SaveSystem] Definitions check:', {
        skillDefs: skillDefs?.length,
        spellDefs: spellDefs?.length,
        achievementDefs: achievementDefs?.length,
        monsterDefs: monsterDefs?.length
      })
      
      if (!skillDefs || !spellDefs || !achievementDefs) {
        console.error('[SaveSystem] Definitions not loaded yet!')
        throw new Error('Game definitions not loaded. Cannot load save.')
      }

      const state = gameState.data
      state.gameTime = data.gameTime
      state.isPaused = data.isPaused
      state.lastUpdate = Date.now() // Reset lastUpdate to now
      state.hasStarted = data.hasStarted ?? true // 向后兼容，默认为 true

      if (data.player) {
        console.log('[SaveSystem] Loading player data...', data.player)
        
        try {
          const newPlayer = Player.fromJSON(
            data.player,
            skillDefs,
            spellDefs,
            achievementDefs,
            itemManager
          )
          console.log('[SaveSystem] Player loaded successfully')
          state.player = newPlayer
        } catch (playerError) {
          console.error('[SaveSystem] Error creating player from JSON:', playerError)
          throw playerError
        }
      }
      
      if (data.activityRunner) {
        console.log('[SaveSystem] Loading activityRunner data...', data.activityRunner)
        try {
          const newActivityRunner = ActivityRunner.fromJSON(data.activityRunner)
          // 重新设置 achievementManager 和 resourceManager 引用
          newActivityRunner.achievementManager = state.player.achievementManager
          newActivityRunner.resourceManager = state.player.resourceManager
          state.activityRunner = newActivityRunner
          console.log('[SaveSystem] ActivityRunner loaded successfully')
        } catch (activityError) {
          console.error('[SaveSystem] Error creating activityRunner from JSON:', activityError)
          throw activityError
        }
      }
      
      // 加载怪物数据（如果存档中没有则使用定义中的数据）
      const monstersToLoad = (data.monsters && data.monsters.length > 0) ? data.monsters : monsterDefs || []
      
      // 使用 splice 正确替换响应式数组的内容
      state.monsters.splice(0, state.monsters.length, ...monstersToLoad)
      
      console.log('[SaveSystem] Loaded monsters to state:', {
        source: data.monsters && data.monsters.length > 0 ? 'save' : 'definitions',
        count: state.monsters.length,
        ids: state.monsters.map(m => m.id)
      })
      
      if (data.monsters && data.monsters.length > 0) {
        console.log('[SaveSystem] Loaded monsters from save:', data.monsters.length)
      } else {
        console.log('[SaveSystem] Using monster definitions (save had no monsters):', monstersToLoad.length)
      }
      
      // 验证怪物数据是否正确加载
      if (!state.monsters || state.monsters.length === 0) {
        console.error('[SaveSystem] Monster data is still empty after loading!')
        console.error('[SaveSystem] state.monsters:', state.monsters)
        console.error('[SaveSystem] monstersToLoad:', monstersToLoad)
        console.error('[SaveSystem] state.monsters.length:', state.monsters.length)
      } else {
        console.log('[SaveSystem] Monster data loaded successfully:', {
          count: state.monsters.length,
          sample: state.monsters.slice(0, 3).map(m => ({ id: m.id, name: m.name }))
        })
      }
      
      // 重新连接活动回调
      console.log('[SaveSystem] Reconnecting activity callbacks...')
      gameState.reconnectActivityCallbacks()

      logSystem.info('游戏数据加载成功')
      return true
    } catch (error) {
      console.error('[SaveSystem] Error loading save data:', error)
      console.error('[SaveSystem] Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        error
      })
      logSystem.error('加载游戏数据失败', { 
        error: String(error),
        stack: error instanceof Error ? error.stack : undefined 
      })
      return false
    }
  }

  saveToLocalStorage(): boolean {
    try {
      const data = this.getSaveData()
      console.log('[SaveSystem] Saving to localStorage...', { gameTime: data.gameTime, hasStarted: data.hasStarted, key: SAVE_KEY })
      const jsonStr = JSON.stringify(data)
      localStorage.setItem(SAVE_KEY, jsonStr)
      this._lastSaveTime = Date.now()
      // 验证保存是否成功
      const saved = localStorage.getItem(SAVE_KEY)
      console.log('[SaveSystem] Save verification:', { saved: !!saved, key: SAVE_KEY })
      logSystem.success('游戏已保存到本地存储', { savedAt: Date.now() })
      if (import.meta.env.DEV) console.debug('Game saved to localStorage')
      return true
    } catch (error) {
      console.error('[SaveSystem] Error saving:', error)
      logSystem.error('保存游戏失败', { error: String(error), stack: error instanceof Error ? error.stack : undefined })
      return false
    }
  }

  loadFromLocalStorage(): boolean {
    try {
      console.log('[SaveSystem] Loading from localStorage...', { key: SAVE_KEY })
      const json = localStorage.getItem(SAVE_KEY)
      console.log('[SaveSystem] Save data in localStorage:', { exists: !!json })
      if (!json) {
        console.warn('[SaveSystem] No save data found in localStorage')
        return false
      }

      const data = JSON.parse(json) as SaveData
      console.log('[SaveSystem] Parsed save data:', { version: data.version, hasStarted: data.hasStarted })
      const success = this.loadSaveData(data)
      if (success) {
        logSystem.success('游戏已从本地存储加载', { savedAt: data.meta?.savedAt })
      }
      return success
    } catch (error) {
      console.error('[SaveSystem] Failed to load from localStorage:', error)
      logSystem.error('加载游戏失败', { error: String(error) })
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
    const result = localStorage.getItem(SAVE_KEY) !== null
    console.log('[SaveSystem] hasSave() called:', result)
    return result
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