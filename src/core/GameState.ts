import { reactive } from 'vue'
import { Player } from '../entities/player'
import { ActivityRunner, type ActivityInstance } from '../systems/activity'
import type { ResourceId } from '../systems/resource'
import { LearningActivityManager } from '../systems/learningActivity'
import { logSystem } from '../systems/log'

export interface GameStateData {
  gameTime: number
  isPaused: boolean
  lastUpdate: number
  player: any  // 使用 any 类型，因为 reactive() 会改变类型
  activityRunner: ActivityRunner
  hasStarted: boolean
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
        ...initialData
      }) as GameStateData

      this.setupActivityCallbacks()
      console.log('[GameState] Initialization complete')
    } catch (error) {
      console.error('[GameState] Critical error during initialization:', error)
      throw error
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
      rewards: activity.rewards,
      metadata: activity.metadata,
      hasSkillId: !!activity.metadata?.skillId,
      hasSpellId: !!activity.metadata?.spellId
    })
    
    // 注意：活动成本已经在活动开始时扣除（ActivityRunner.startActivity）
    // 这里不再重复扣除成本
    
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
    this.setupActivityCallbacks()
  }

  reconnectActivityCallbacks() {
    this.setupActivityCallbacks()
  }
}