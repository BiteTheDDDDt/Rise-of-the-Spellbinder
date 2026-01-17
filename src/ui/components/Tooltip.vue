<script setup lang="ts">
import { ref, reactive } from 'vue'

interface TooltipProps {
  content?: string
  html?: boolean
  position?: 'top' | 'bottom' | 'left' | 'right'
  delay?: number
  maxWidth?: number
}

const props = withDefaults(defineProps<TooltipProps>(), {
  content: '',
  html: false,
  position: 'top',
  delay: 300,
  maxWidth: 300
})

const show = ref(false)
const positionStyle = reactive({ top: '0px', left: '0px' })
const targetElement = ref<HTMLElement>()
let timeoutId: number | null = null

function updatePosition(event: MouseEvent) {
  if (!targetElement.value) return

  const tooltip = targetElement.value
  const rect = tooltip.getBoundingClientRect()
  const x = event.clientX
  const y = event.clientY
  const offset = 10

  let top = y + offset
  let left = x + offset

  // 根据位置调整
  switch (props.position) {
    case 'top':
      top = y - rect.height - offset
      left = x - rect.width / 2
      break
    case 'bottom':
      top = y + offset
      left = x - rect.width / 2
      break
    case 'left':
      top = y - rect.height / 2
      left = x - rect.width - offset
      break
    case 'right':
      top = y - rect.height / 2
      left = x + offset
      break
  }

  // 确保工具提示在窗口内
  const windowWidth = window.innerWidth
  const windowHeight = window.innerHeight

  if (left < 0) left = 0
  if (left + rect.width > windowWidth) left = windowWidth - rect.width - 5
  if (top < 0) top = 0
  if (top + rect.height > windowHeight) top = windowHeight - rect.height - 5

  positionStyle.top = `${top}px`
  positionStyle.left = `${left}px`
}

function handleMouseEnter(event: MouseEvent) {
  if (timeoutId) clearTimeout(timeoutId)
  timeoutId = window.setTimeout(() => {
    show.value = true
    updatePosition(event)
  }, props.delay)
}

function handleMouseMove(event: MouseEvent) {
  if (show.value) {
    updatePosition(event)
  }
}

function handleMouseLeave() {
  if (timeoutId) {
    clearTimeout(timeoutId)
    timeoutId = null
  }
  show.value = false
}
</script>

<template>
  <div 
    class="tooltip-wrapper"
    @mouseenter="handleMouseEnter"
    @mousemove="handleMouseMove"
    @mouseleave="handleMouseLeave"
  >
    <!-- 默认插槽，触发工具提示的内容 -->
    <slot />

    <!-- 工具提示内容 -->
    <teleport to="body">
      <div
        v-if="show && content"
        ref="targetElement"
        class="tooltip"
        :class="position"
        :style="{
          ...positionStyle,
          maxWidth: `${maxWidth}px`
        }"
        @mouseenter="show = true"
        @mouseleave="show = false"
      >
        <div v-if="html" v-html="content" class="tooltip-content"></div>
        <div v-else class="tooltip-content">{{ content }}</div>
        <div class="tooltip-arrow"></div>
      </div>
    </teleport>
  </div>
</template>

<style scoped>
.tooltip-wrapper {
  display: inline-block;
  position: relative;
}

.tooltip {
  position: fixed;
  z-index: 9999;
  background: rgba(30, 30, 30, 0.95);
  color: #e0e0e0;
  border: 1px solid #444;
  border-radius: 6px;
  padding: 10px 14px;
  font-size: 13px;
  line-height: 1.4;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  animation: fadeIn 0.2s ease;
  pointer-events: none;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
}

.tooltip-content {
  word-break: break-word;
}

.tooltip-arrow {
  position: absolute;
  width: 0;
  height: 0;
  border-style: solid;
}

.tooltip.top .tooltip-arrow {
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%);
  border-width: 6px 6px 0 6px;
  border-color: rgba(30, 30, 30, 0.95) transparent transparent transparent;
}

.tooltip.bottom .tooltip-arrow {
  top: -6px;
  left: 50%;
  transform: translateX(-50%);
  border-width: 0 6px 6px 6px;
  border-color: transparent transparent rgba(30, 30, 30, 0.95) transparent;
}

.tooltip.left .tooltip-arrow {
  right: -6px;
  top: 50%;
  transform: translateY(-50%);
  border-width: 6px 0 6px 6px;
  border-color: transparent transparent transparent rgba(30, 30, 30, 0.95);
}

.tooltip.right .tooltip-arrow {
  left: -6px;
  top: 50%;
  transform: translateY(-50%);
  border-width: 6px 6px 6px 0;
  border-color: transparent rgba(30, 30, 30, 0.95) transparent transparent;
}
</style>