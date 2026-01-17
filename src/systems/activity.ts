import { reactive } from 'vue'
import type { ResourceId } from './resource'

export interface ActivityReward {
  resource: ResourceId
  amount: number
  randomRange?: [number, number]
}

export interface ActivityData {
  id: string
  name: string
  description: string
  duration: number
  rewards: ActivityReward[]
  category?: string
}

export interface ActivityInstance {
  id: string
  activity: ActivityData
  startTime: number
  progress: number
  isCompleted: boolean
}

export class ActivityRunner {
  currentActivity: ActivityInstance | null = null
  queue: ActivityInstance[] = reactive([])

  startActivity(activity: ActivityData) {
    if (this.currentActivity) {
      this.queue.push({
        id: Date.now().toString(),
        activity,
        startTime: Date.now(),
        progress: 0,
        isCompleted: false
      })
    } else {
      this.currentActivity = reactive({
        id: Date.now().toString(),
        activity,
        startTime: Date.now(),
        progress: 0,
        isCompleted: false
      })
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
    console.log(`Activity ${instance.activity.name} completed`)
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