import { computed } from 'vue'
import { gameState, gameLoop } from '.'

export function useGame() {
  const state = gameState.data
  const isPaused = computed(() => state.isPaused)
  const gameTime = computed(() => state.gameTime)
  const player = computed(() => state.player)
  const activityRunner = computed(() => state.activityRunner)
  const resourceManager = computed(() => state.player.resourceManager)

  const togglePause = () => gameLoop.togglePause()
  const save = () => gameLoop.emit('save')
  const load = () => gameLoop.emit('load')

  return {
    // State
    state,
    isPaused,
    gameTime,
    player,
    activityRunner,
    resourceManager,

    // Actions
    togglePause,
    pause: () => gameLoop.pause(),
    resume: () => gameLoop.resume(),
    save,
    load,

    // Loop
    gameLoop,
    onTick: (callback: (delta: number) => void) => {
      gameLoop.on('tick', callback)
      return () => gameLoop.off('tick', callback)
    },
    onUpdate: (callback: () => void) => {
      gameLoop.on('update', callback)
      return () => gameLoop.off('update', callback)
    }
  }
}