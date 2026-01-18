import { reactive } from 'vue'
import { Player } from '../entities/player'
import { ActivityRunner, type ActivityInstance } from '../systems/activity'
import type { ResourceId } from '../systems/resource'
import { LearningActivityManager } from '../systems/learningActivity'

export interface GameStateData {
  gameTime: number
  isPaused: boolean
  lastUpdate: number
  player: Player
  activityRunner: ActivityRunner
  hasStarted: boolean
}

export class GameState {
  data: GameStateData

  constructor(initialData?: Partial<GameStateData>) {
    const defaultPlayer = new Player('Apprentice')
    const defaultActivityRunner = new ActivityRunner(defaultPlayer.achievementManager, defaultPlayer.resourceManager)
    
    this.data = reactive({
      gameTime: 0,
      isPaused: false,
      lastUpdate: Date.now(),
      player: defaultPlayer,
      activityRunner: defaultActivityRunner,
      hasStarted: false,
      ...initialData
    })

    this.setupActivityCallbacks()
  }

  private setupActivityCallbacks() {
    this.data.activityRunner.addCompleteCallback(this.handleActivityComplete.bind(this))
  }

  private handleActivityComplete(instance: ActivityInstance) {
    const player = this.data.player
    const activity = instance.activity
    
    // 扣除活动成本
    if (activity.costs && activity.costs.length > 0) {
      for (const cost of activity.costs) {
        const resource = player.resourceManager.getResource(cost.resource as ResourceId)
        if (!resource || !resource.consume(cost.amount)) {
          console.warn(`活动成本扣除失败: ${cost.resource} ${cost.amount}`)
        }
      }
    }
    
    // 处理学习类活动
    let learningSuccess = true
    if (activity.type === 'learning' && activity.metadata?.spellId) {
      learningSuccess = LearningActivityManager.completeSpellLearning(
        activity as any,
        player.spellManager,
        player.talent.data,
        player.skillManager.getAllSkills()
      )
    } else if (activity.type === 'practice' && activity.metadata?.skillId) {
      learningSuccess = LearningActivityManager.completeSkillPractice(
        activity as any,
        player.skillManager
      )
    } else if (activity.type === 'training' && activity.metadata?.skillId) {
      learningSuccess = LearningActivityManager.completeSkillTraining(
        activity as any,
        player.skillManager,
        player.talent.data
      )
    }
    
    // 如果学习活动失败，不发放奖励
    if (!learningSuccess) {
      console.warn('学习活动处理失败，不发放奖励', { activityId: activity.id })
      return
    }
    
    // 发放活动奖励
    const rewards = activity.rewards
    for (const reward of rewards) {
      let amount = reward.amount
      if (reward.randomRange) {
        const [min, max] = reward.randomRange
        amount = min + Math.floor(Math.random() * (max - min + 1))
      }
      
      if (reward.resource === 'experience') {
        player.addExperience(amount)
      } else if (reward.resource === 'skill_exp') {
        // 处理技能经验 - 如果有指定技能ID则添加到该技能，否则添加到所有解锁技能
        if (activity.metadata?.skillId) {
          player.skillManager.addExpToSkill(activity.metadata.skillId, amount)
        } else {
          // 如果没有指定技能，添加到所有解锁技能
          const unlockedSkills = player.skillManager.getUnlockedSkills()
          const expPerSkill = amount / Math.max(1, unlockedSkills.length)
          for (const skill of unlockedSkills) {
            player.skillManager.addExpToSkill(skill.id, expPerSkill)
          }
        }
      } else {
        const resource = player.resourceManager.getResource(reward.resource as ResourceId)
        if (resource) {
          resource.add(amount)
        }
      }
    }
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
}