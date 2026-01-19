import { reactive } from 'vue'
import { Player } from '../entities/player'
import { ActivityRunner, type ActivityInstance } from '../systems/activity'
import type { ResourceId } from '../systems/resource'
import { LearningActivityManager } from '../systems/learningActivity'
import { logSystem } from '../systems/log'
import type { MonsterData } from '../entities/monster'
import { definitionsManager } from './Definitions'

export interface GameStateData {
  gameTime: number
  isPaused: boolean
  lastUpdate: number
  player: any  // 使用 any 类型，因为 reactive() 会改变类型
  activityRunner: ActivityRunner
  hasStarted: boolean
  monsters: MonsterData[]
}

export class GameState {
  data: GameStateData

  constructor(initialData?: Partial<GameStateData>) {
    try {
      console.log('[GameState] Creating default player...')
      const defaultPlayer = new Player('Apprentice')
      console.log('[GameState] Player created successfully')
      
      const defaultActivityRunner = new ActivityRunner(defaultPlayer.achievementManager, defaultPlayer.resourceManager)
      console.log('[GameState] ActivityRunner created successfully')
      
      this.data = reactive({
        gameTime: 0,
        isPaused: false,
        lastUpdate: Date.now(),
        player: defaultPlayer,
        activityRunner: defaultActivityRunner,
        hasStarted: false,
        monsters: initialData?.monsters || [],
        ...initialData
      }) as GameStateData

      this.setupActivityCallbacks()
      console.log('[GameState] Initialization complete')
    } catch (error) {
      console.error('[GameState] Critical error during initialization:', error)
      throw error
    }
  }

  ensureMonsterData(monsterData: any[]) {
    if (!monsterData || monsterData.length === 0) {
      console.warn('[GameState] Monster data is empty, cannot initialize')
      return
    }

    if (!this.data.monsters || this.data.monsters.length === 0) {
      // 直接赋值响应式数组
      this.data.monsters.length = 0
      this.data.monsters.push(...monsterData)
      console.log('[GameState] Monster data initialized:', {
        count: this.data.monsters.length,
        sample: this.data.monsters.slice(0, 3).map(m => ({ id: m.id, name: m.name })),
        ids: this.data.monsters.map(m => m.id)
      })
    } else {
      console.log('[GameState] Monster data already exists:', {
        count: this.data.monsters.length,
        sample: this.data.monsters.slice(0, 3).map(m => ({ id: m.id, name: m.name }))
      })
    }
  }

  private setupActivityCallbacks() {
    logSystem.info('设置活动完成回调')
    this.data.activityRunner.addCompleteCallback(this.handleActivityComplete.bind(this))
    logSystem.info('活动完成回调已设置', { callbackCount: this.data.activityRunner.onCompleteCallbacks.length })
  }

  private handleActivityComplete(instance: ActivityInstance) {
    const player = this.data.player
    const activity = instance.activity
    
    logSystem.info(`处理活动完成: ${activity.name}`, { 
      activityId: activity.id, 
      type: activity.type,
      category: (activity as any).category,
      rewards: activity.rewards,
      metadata: activity.metadata,
      hasSkillId: !!activity.metadata?.skillId,
      hasSpellId: !!activity.metadata?.spellId
    })
    
    // 注意：活动成本已经在活动开始时扣除（ActivityRunner.startActivity）
    // 这里不再重复扣除成本
    
    // 处理探索活动
    if ((activity as any).category === 'exploration') {
      this.handleExploreActivityComplete(activity as any, player)
      return
    }
    
    // 处理学习类活动
    let learningSuccess = true
    if (activity.type === 'learning' && activity.metadata?.spellId) {
      logSystem.info(`处理学习活动: ${activity.name}`, { activityId: activity.id, spellId: activity.metadata.spellId })
      learningSuccess = LearningActivityManager.completeSpellLearning(
        activity as any,
        player.spellManager,
        player.talent.data,
        player.skillManager.getAllSkills()
      )
    } else if (activity.type === 'practice' && activity.metadata?.skillId) {
      logSystem.info(`处理练习活动: ${activity.name}`, { 
        activityId: activity.id, 
        skillId: activity.metadata.skillId,
        skillManager: !!player.skillManager
      })
      learningSuccess = LearningActivityManager.completeSkillPractice(
        activity as any,
        player.skillManager
      )
      logSystem.info(`completeSkillPractice执行结果: ${learningSuccess}`, { activityId: activity.id, skillId: activity.metadata.skillId })
    } else if (activity.type === 'training' && activity.metadata?.skillId) {
      logSystem.info(`处理训练活动: ${activity.name}`, { activityId: activity.id, skillId: activity.metadata.skillId })
      learningSuccess = LearningActivityManager.completeSkillTraining(
        activity as any,
        player.skillManager,
        player.talent.data
      )
    } else {
      logSystem.info(`处理普通活动: ${activity.name}`, { activityId: activity.id })
    }
    
    // 如果学习活动失败，不发放奖励
    if (!learningSuccess) {
      logSystem.warning('学习活动处理失败，不发放奖励', { activityId: activity.id })
      return
    }
    
    // 发放活动奖励
    const rewards = activity.rewards
    logSystem.info(`开始发放活动奖励，共${rewards.length}项`, { activityId: activity.id })
    
    for (const reward of rewards) {
      let amount = reward.amount
      if (reward.randomRange) {
        const [min, max] = reward.randomRange
        amount = min + Math.floor(Math.random() * (max - min + 1))
        logSystem.info(`随机奖励范围: ${min}-${max}, 结果: ${amount}`, { resource: reward.resource })
      }
      
      if (reward.resource === 'experience') {
        logSystem.info(`发放经验值: ${amount}`, { activityId: activity.id })
        player.addExperience(amount)
      } else if (reward.resource === 'skill_exp') {
        // 跳过练习和训练活动的技能经验奖励，因为已经在complete函数中添加了
        if (activity.type === 'practice' || activity.type === 'training') {
          logSystem.info(`跳过技能经验奖励，因为活动类型为 ${activity.type}，经验值已在complete函数中添加`, { activityId: activity.id })
          continue
        }
        // 处理技能经验 - 如果有指定技能ID则添加到该技能
        if (activity.metadata?.skillId) {
          logSystem.info(`发放技能经验到指定技能: ${activity.metadata.skillId}, 数量: ${amount}`, { activityId: activity.id })
          player.skillManager.addExpToSkill(activity.metadata.skillId, amount)
        } else {
          // 如果没有指定技能，记录警告并跳过
          logSystem.warning(`技能经验奖励没有指定技能ID，已跳过: ${amount}`, { activityId: activity.id })
          console.warn('Skill exp reward without skillId skipped:', amount)
        }
      } else {
        const resourceId = reward.resource as ResourceId
        const resource = player.resourceManager.getResource(resourceId)
        if (resource) {
          logSystem.info(`发放资源: ${reward.resource}, 数量: ${amount}`, { activityId: activity.id, before: resource.value })
          const added = resource.add(amount)
          logSystem.info(`资源发放后: ${reward.resource} = ${resource.value}, 实际添加: ${added}`, { activityId: activity.id })
        } else {
          const resourceKeys = Array.from(player.resourceManager.resources.keys())
          logSystem.warning(`资源不存在: ${reward.resource}`, { 
            activityId: activity.id, 
            requestedResource: reward.resource,
            availableResources: resourceKeys,
            resourceIdType: typeof resourceId,
            resourceIdValue: resourceId
          })
        }
      }
    }
    
    logSystem.info(`活动奖励发放完成`, { activityId: activity.id })
  }

  private async handleExploreActivityComplete(activity: any, player: any) {
    console.log('[GameState] handleExploreActivityComplete called', {
      'this.data': this.data,
      'this.data.monsters': this.data.monsters,
      'this.data.monsters type': typeof this.data.monsters,
      'this.data.monsters length': this.data.monsters?.length,
      'Array.isArray(this.data.monsters)': Array.isArray(this.data.monsters),
      'Object.keys(this.data.monsters)': Object.keys(this.data.monsters)
    })

    // Ensure monster data is loaded
    if (!this.data.monsters || this.data.monsters.length === 0) {
      const monsters = definitionsManager.getMonsterDefinitions()
      this.ensureMonsterData(monsters)
      logSystem.info('从定义中加载了怪物数据', { count: this.data.monsters.length })
    }

    logSystem.info(`开始处理探索活动: ${activity.name}`, {
      localeId: activity.localeId,
      eventCount: activity.events?.length || 0,
      availableMonsters: this.data.monsters?.length || 0,
      monsterIds: this.data.monsters?.map?.(m => m.id) || []
    })

    if (!this.data.monsters || this.data.monsters.length === 0) {
      logSystem.warning('怪物数据仍未加载！跳过战斗事件处理，但继续处理其他事件', {
        monsters: this.data.monsters,
        'monsters length': this.data.monsters?.length,
        'Array.isArray': Array.isArray(this.data.monsters)
      })
      // 继续处理，但跳过需要怪物数据的战斗事件
    }

    const events = activity.events || []
    let totalGold = 0
    let totalExp = 0
    let totalMana: Record<string, number> = {}
    let shouldEndEarly = false

    for (const event of events) {
      if (shouldEndEarly) {
        logSystem.info('战斗失败，跳过剩余事件')
        break
      }

      logSystem.info(`处理探索事件: ${event.type}`, { description: event.description })
      
      switch (event.type) {
        case 'combat': {
          const monsterId = event.data?.monsterId
          if (!monsterId) {
            logSystem.warning('战斗事件缺少怪物ID', { event })
            continue
          }

          const monsterData = this.data.monsters.find(m => m.id === monsterId)
          if (!monsterData) {
            logSystem.warning(`怪物数据不存在: ${monsterId}`, { 
              event, 
              availableMonsters: this.data.monsters.map(m => m.id) 
            })
            continue
          }

          const { Monster } = await import('../entities/monster')
          const { CombatSystem } = await import('../systems/combat')
          
          const monster = new Monster(monsterData)
          const combat = new CombatSystem(player, [monster], player.achievementManager)
          
          const combatResult = combat.autoExecute(100)
          
          if (combatResult === 'player_won') {
            logSystem.success(`战斗胜利！击败了 ${monster.name}`)
            
            const drops = monster.generateDrops()
            if (drops.gold) {
              totalGold += drops.gold
              logSystem.info(`获得 ${drops.gold} 金币`)
            }
            if (drops.experience) {
              totalExp += drops.experience
              logSystem.info(`获得 ${drops.experience} 经验值`)
            }
            for (const [key, value] of Object.entries(drops)) {
              if (key.startsWith('mana_')) {
                totalMana[key] = (totalMana[key] || 0) + (value as number)
                logSystem.info(`获得 ${value} ${key}`)
              }
            }
          } else if (combatResult === 'enemy_won') {
            logSystem.warning(`战斗失败！被 ${monster.name} 击败`)
            shouldEndEarly = true
          } else {
            logSystem.warning('战斗超时，强制结束')
          }
          break
        }
        
        case 'treasure': {
          const gold = Math.floor(Math.random() * 10) + 5
          const exp = Math.floor(Math.random() * 10) + 5
          totalGold += gold
          totalExp += exp
          logSystem.success(`发现宝箱！获得 ${gold} 金币和 ${exp} 经验值`)
          break
        }
        
        case 'resource': {
          const manaTypes = ['mana_fire', 'mana_water', 'mana_earth', 'mana_wind']
          const randomMana = manaTypes[Math.floor(Math.random() * manaTypes.length)]!
          const amount = Math.floor(Math.random() * 3) + 1
          totalMana[randomMana] = (totalMana[randomMana] || 0) + amount
          logSystem.success(`发现资源！获得 ${amount} ${randomMana}`)
          break
        }
        
        case 'empty':
          logSystem.info(event.description)
          break
          
        default:
          logSystem.warning(`未知事件类型: ${event.type}`, { event })
      }
    }

    // 发放探索奖励
    if (totalGold > 0) {
      const goldRes = player.resourceManager.getResource('gold')
      if (goldRes) {
        goldRes.add(totalGold)
        logSystem.success(`探索完成！总共获得 ${totalGold} 金币`)
      }
    }
    
    if (totalExp > 0) {
      player.addExperience(totalExp)
      logSystem.success(`探索完成！总共获得 ${totalExp} 经验值`)
    }
    
    for (const [manaType, amount] of Object.entries(totalMana)) {
      const manaRes = player.resourceManager.getResource(manaType as ResourceId)
      if (manaRes) {
        manaRes.add(amount)
        logSystem.success(`探索完成！总共获得 ${amount} ${manaType}`)
      }
    }
    
    logSystem.success(`探索活动完成: ${activity.name}`)
  }

  get gameTime() {
    return this.data.gameTime
  }

  get isPaused() {
    return this.data.isPaused
  }

  set isPaused(value: boolean) {
    this.data.isPaused = value
  }

  update(currentTime: number) {
    if (!this.data.isPaused) {
      const delta = (currentTime - this.data.lastUpdate) / 1000
      this.data.gameTime += delta
      this.data.player.update(delta)
      this.data.activityRunner.update(currentTime)
      this.data.lastUpdate = currentTime
    } else {
      this.data.lastUpdate = currentTime
    }
  }

  togglePause() {
    this.data.isPaused = !this.data.isPaused
    this.data.lastUpdate = Date.now()
  }

  get player() {
    return this.data.player
  }

  get activityRunner() {
    return this.data.activityRunner
  }

  reset() {
    this.data.gameTime = 0
    this.data.isPaused = false
    this.data.lastUpdate = Date.now()
    this.data.player = new Player('Apprentice')
    this.data.activityRunner = new ActivityRunner(this.data.player.achievementManager, this.data.player.resourceManager)
    this.data.hasStarted = false
    this.data.monsters = []
    this.setupActivityCallbacks()
  }

  reconnectActivityCallbacks() {
    this.setupActivityCallbacks()
  }
}