import EventEmitter from 'eventemitter3'
import { GameState } from './GameState'

export const TICK_TIME = 100 // milliseconds

export interface GameLoopEvents {
  tick: (delta: number) => void
  pause: () => void
  resume: () => void
  update: () => void
  save: () => void
  load: () => void
}

export class GameLoop extends EventEmitter<GameLoopEvents> {
  private state: GameState
  private lastTickTime: number = 0
  private animationFrameId: number | null = null
  private isRunning: boolean = false

  constructor(state: GameState) {
    super()
    this.state = state
  }

  start() {
    if (this.isRunning) return
    this.isRunning = true
    this.lastTickTime = Date.now()
    this.tick()
  }

  stop() {
    this.isRunning = false
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
  }

  private tick() {
    if (!this.isRunning) return

    const now = Date.now()
    const delta = now - this.lastTickTime

    // Update game state
    this.state.update(now)

    // Emit tick event every TICK_TIME
    if (delta >= TICK_TIME) {
      const tickDelta = delta / 1000 // convert to seconds
      this.emit('tick', tickDelta)
      this.emit('update')
      this.lastTickTime = now
    }

    // Schedule next frame
    this.animationFrameId = requestAnimationFrame(() => this.tick())
  }

  pause() {
    this.state.isPaused = true
    this.emit('pause')
  }

  resume() {
    this.state.isPaused = false
    this.state.data.lastUpdate = Date.now()
    this.emit('resume')
  }

  togglePause() {
    if (this.state.isPaused) {
      this.resume()
    } else {
      this.pause()
    }
  }

  get gameState() {
    return this.state
  }
}