import { reactive } from 'vue'

export interface GameStateData {
  gameTime: number
  isPaused: boolean
  lastUpdate: number
}

export class GameState {
  data: GameStateData

  constructor(initialData?: Partial<GameStateData>) {
    this.data = reactive({
      gameTime: 0,
      isPaused: false,
      lastUpdate: Date.now(),
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
      this.data.lastUpdate = currentTime
    } else {
      this.data.lastUpdate = currentTime
    }
  }

  togglePause() {
    this.data.isPaused = !this.data.isPaused
    this.data.lastUpdate = Date.now()
  }

  reset() {
    this.data.gameTime = 0
    this.data.isPaused = false
    this.data.lastUpdate = Date.now()
  }
}