import { reactive } from 'vue'
import { Player } from '../entities/player'
import { ActivityRunner } from '../systems/activity'

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
    const defaultActivityRunner = new ActivityRunner(defaultPlayer.achievementManager)
    
    this.data = reactive({
      gameTime: 0,
      isPaused: false,
      lastUpdate: Date.now(),
      player: defaultPlayer,
      activityRunner: defaultActivityRunner,
      hasStarted: false,
      ...initialData
    })
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
    this.data.activityRunner = new ActivityRunner(this.data.player.achievementManager)
    this.data.hasStarted = false
  }
}