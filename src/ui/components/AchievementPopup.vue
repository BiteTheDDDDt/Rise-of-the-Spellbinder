<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import type { Achievement } from '../../systems/achievement'

interface AchievementPopupProps {
  achievement: Achievement
  duration?: number
}

const props = withDefaults(defineProps<AchievementPopupProps>(), {
  duration: 5000
})

const show = ref(false)
const progress = ref(0)
const animationDuration = 300 // ms

onMounted(() => {
  // Show popup with animation
  setTimeout(() => {
    show.value = true
    // Animate progress bar
    const startTime = Date.now()
    const animate = () => {
      const elapsed = Date.now() - startTime
      progress.value = Math.min(elapsed / props.duration * 100, 100)
      if (elapsed < props.duration) {
        requestAnimationFrame(animate)
      } else {
        // Start hiding after duration
        setTimeout(() => {
          show.value = false
        }, animationDuration)
      }
    }
    requestAnimationFrame(animate)
  }, 100)
})

onUnmounted(() => {
  // Cleanup
})

function hide() {
  show.value = false
}

function getRewardDescription(reward: any): string {
  switch (reward.type) {
    case 'resource':
      return `${reward.resourceId} x${reward.amount}`
    case 'unlock':
      return `解锁: ${reward.unlockId}`
    case 'bonus':
      return `${reward.bonusType} +${reward.bonusValue}%`
    default:
      return '未知奖励'
  }
}
</script>

<template>
  <teleport to="body">
    <div 
      v-if="show" 
      class="achievement-popup"
      :class="{ hidden: !show }"
      @click="hide"
    >
      <div class="popup-content" @click.stop>
        <div class="achievement-header">
          <div class="achievement-icon">
            {{ achievement.icon }}
          </div>
          <div class="achievement-title">
            <h3 class="title">成就解锁!</h3>
            <h4 class="name">{{ achievement.name }}</h4>
          </div>
          <button class="close-btn" @click="hide">×</button>
        </div>
        
        <div class="achievement-body">
          <p class="description">{{ achievement.description }}</p>
          
          <div v-if="achievement.rewards.length > 0" class="rewards-section">
            <div class="rewards-title">奖励:</div>
            <div class="rewards-list">
              <div 
                v-for="(reward, index) in achievement.rewards" 
                :key="index" 
                class="reward-item"
              >
                <span class="reward-icon">
                  {{ 
                    reward.type === 'resource' ? '💰' :
                    reward.type === 'unlock' ? '🔓' : '⭐'
                  }}
                </span>
                <span class="reward-text">{{ getRewardDescription(reward) }}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: `${progress}%` }"></div>
        </div>
      </div>
    </div>
  </teleport>
</template>

<style scoped>
.achievement-popup {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  animation: slideIn 0.3s ease-out;
}

.achievement-popup.hidden {
  animation: slideOut 0.3s ease-in forwards;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes slideOut {
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0;
  }
}

.popup-content {
  width: 350px;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 12px;
  border: 2px solid #0f3460;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  overflow: hidden;
  position: relative;
}

.achievement-header {
  display: flex;
  align-items: center;
  padding: 20px;
  background: rgba(15, 52, 96, 0.3);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.achievement-icon {
  font-size: 36px;
  margin-right: 15px;
  flex-shrink: 0;
}

.achievement-title {
  flex-grow: 1;
}

.title {
  margin: 0 0 5px 0;
  color: #bb86fc;
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.name {
  margin: 0;
  color: white;
  font-size: 20px;
  font-weight: bold;
}

.close-btn {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.achievement-body {
  padding: 20px;
}

.description {
  color: #e0e0e0;
  font-size: 15px;
  line-height: 1.5;
  margin: 0 0 20px 0;
}

.rewards-section {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 15px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.rewards-title {
  color: #03dac6;
  font-weight: bold;
  font-size: 14px;
  margin-bottom: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.rewards-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.reward-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.reward-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.reward-text {
  color: #e0e0e0;
  font-size: 14px;
}

.progress-bar {
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #bb86fc, #03dac6);
  transition: width 0.1s linear;
}
</style>