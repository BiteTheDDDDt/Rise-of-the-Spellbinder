import { reactive } from 'vue'
import type { ResourceId } from './resource'
import { logSystem } from './log'
import type { AchievementManager } from './achievement'

export interface ActivityReward {
  resource: ResourceId | 'experience' | 'skill_exp'
  amount: number
  randomRange?: [number, number]
}

export interface ActivityCost {
  resource: string
  amount: number
}

export interface ActivityData {
  id: string
  name: string
  description: string
  duration: number
  rewards: ActivityReward[]
  costs?: ActivityCost[]
  category?: string
  type?: 'standard' | 'learning' | 'practice' | 'training'
  metadata?: {
    spellId?: string
    skillId?: string
    element?: string
  }
}

export interface ActivityInstance {
  id: string
  activity: ActivityData
  startTime: number
  progress: number
  isCompleted: boolean
}

export type ActivityCompleteCallback = (instance: ActivityInstance) => void

export class ActivityRunner {
  currentActivity: ActivityInstance | null = null
  queue: ActivityInstance[] = reactive([])
  onCompleteCallbacks: ActivityCompleteCallback[] = []
  achievementManager?: AchievementManager

  constructor(achievementManager?: AchievementManager) {
    this.onCompleteCallbacks = []
    this.achievementManager = achievementManager
  }

  startActivity(activity: ActivityData) {
    if (this.currentActivity) {
      this.queue.push({
        id: Date.now().toString(),
        activity,
        startTime: Date.now(),
        progress: 0,
        isCompleted: false
      })
      logSystem.info(`活动已加入队列: ${activity.name}`, { activityId: activity.id, duration: activity.duration })
    } else {
      this.currentActivity = reactive({
        id: Date.now().toString(),
        activity,
        startTime: Date.now(),
        progress: 0,
        isCompleted: false
      })
      logSystem.info(`活动开始: ${activity.name}`, { activityId: activity.id, duration: activity.duration })
    }
  }

  update(currentTime: number) {
    if (!this.currentActivity) {
      if (this.queue.length > 0) {
        this.currentActivity = this.queue.shift()!
      } else {
        return
      }
    }

    const instance = this.currentActivity
    const elapsed = (currentTime - instance.startTime) / 1000
    instance.progress = Math.min(elapsed / instance.activity.duration, 1)

    if (instance.progress >= 1 && !instance.isCompleted) {
      instance.isCompleted = true
      this.completeActivity(instance)
    }
  }

  completeActivity(instance: ActivityInstance) {
    logSystem.success(`活动完成: ${instance.activity.name}`, { 
      activityId: instance.activity.id,
      duration: instance.activity.duration,
      rewards: instance.activity.rewards
    })
    
    // Track achievement progress
    if (this.achievementManager) {
      this.achievementManager.incrementAchievementProgress('activity_enthusiast')
    }
    
    for (const callback of this.onCompleteCallbacks) {
      callback(instance)
    }
    
    this.currentActivity = null
    if (this.queue.length > 0) {
      this.currentActivity = this.queue.shift()!
    }
  }

  cancelCurrentActivity() {
    if (this.currentActivity) {
      this.currentActivity = null
    }
  }

  clearQueue() {
    this.queue = []
  }

  addCompleteCallback(callback: ActivityCompleteCallback) {
    this.onCompleteCallbacks.push(callback)
  }

  removeCompleteCallback(callback: ActivityCompleteCallback) {
    const index = this.onCompleteCallbacks.indexOf(callback)
    if (index > -1) {
      this.onCompleteCallbacks.splice(index, 1)
    }
  }

  getProgress(): number {
    return this.currentActivity ? this.currentActivity.progress : 0
  }

  getRemainingTime(): number {
    if (!this.currentActivity) return 0
    const elapsed = (Date.now() - this.currentActivity.startTime) / 1000
    return Math.max(0, this.currentActivity.activity.duration - elapsed)
  }

  getCurrentActivity(): ActivityInstance | null {
    return this.currentActivity
  }

  getQueue(): ActivityInstance[] {
    return this.queue
  }

  toJSON() {
    return {
      currentActivity: this.currentActivity,
      queue: this.queue
    }
  }

  static fromJSON(data: any): ActivityRunner {
    const runner = new ActivityRunner()
    if (data.currentActivity) {
      runner.currentActivity = reactive(data.currentActivity)
    }
    if (data.queue) {
      runner.queue = reactive(data.queue)
    }
    return runner
  }
}