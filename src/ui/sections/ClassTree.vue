<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useGame } from '../../core/useGame'
import type { ClassNode, ClassId, ClassRequirement, ClassEffect } from '../../systems/class'
import { logSystem } from '../../systems/log'

const game = useGame()
const selectedClass = ref<ClassNode | null>(null)
const zoom = ref(1)
const pan = ref({ x: 0, y: 0 })
const isDragging = ref(false)
const lastMousePos = ref({ x: 0, y: 0 })

interface NodePosition {
  x: number
  y: number
}

const nodePositions = ref<Map<ClassId, NodePosition>>(new Map())

const playerState = computed(() => {
  const skillMap = new Map<string, number>()
  if (game.player.value?.skillManager?.skills) {
    for (const [skillId, skill] of game.player.value.skillManager.skills.entries()) {
      skillMap.set(skillId, skill.currentLevel)
    }
  }

  return {
    talents: game.player.value?.talent?.data || { fire: 0, water: 0, earth: 0, wind: 0 },
    skills: skillMap,
    level: game.player.value?.level || 1,
    gold: game.player.value?.resourceManager.getResource('gold')?.value || 0,
    unlockedClasses: game.player.value?.classManager?.unlockedClasses || []
  }
})

const classTree = computed(() => game.player.value?.classManager?.classTree)

const allNodes = computed(() => {
  if (!classTree.value) return []
  return Array.from(classTree.value.nodes.values())
})

const tieredNodes = computed(() => {
  if (!classTree.value) return {}
  const tiers: Record<number, ClassNode[]> = {}
  for (const node of allNodes.value) {
    const tier = node.tier
    if (!tiers[tier]) {
      tiers[tier] = []
    }
    tiers[tier].push(node)
  }
  return tiers
})

const unlockedClassIds = computed(() => playerState.value.unlockedClasses)

const availableClasses = computed(() => {
  if (!classTree.value) return []
  return classTree.value.getAvailableClasses(
    playerState.value.talents,
    playerState.value.skills,
    playerState.value.level,
    unlockedClassIds.value
  )
})

function initializeNodePositions() {
  const tiers = tieredNodes.value
  const canvas = document.querySelector('.class-tree-canvas') as HTMLElement
  if (!canvas) return

  const canvasRect = canvas.getBoundingClientRect()
  const nodeWidth = 160
  const nodeHeight = 80
  const horizontalGap = 40
  const verticalGap = 60
  const startX = 50
  const startY = 50

  nodePositions.value.clear()

  for (const [tier, nodes] of Object.entries(tiers)) {
    const tierNum = parseInt(tier)
    const totalWidth = nodes.length * nodeWidth + (nodes.length - 1) * horizontalGap
    let x = startX + (canvasRect.width - totalWidth) / 2

    for (const node of nodes) {
      const y = startY + tierNum * (nodeHeight + verticalGap)
      nodePositions.value.set(node.id, { x, y })
      x += nodeWidth + horizontalGap
    }
  }
}

function getNodePosition(nodeId: ClassId): NodePosition | undefined {
  if (!classTree.value) return undefined
  return nodePositions.value.get(nodeId)
}

function getClassStatus(node: ClassNode): 'locked' | 'available' | 'unlocked' | 'secret' {
  if (unlockedClassIds.value.includes(node.id)) {
    return 'unlocked'
  }
  if (node.isSecret) {
    return 'secret'
  }
  if (availableClasses.value.includes(node)) {
    return 'available'
  }
  return 'locked'
}

function selectClass(node: ClassNode) {
  selectedClass.value = node
}

function unlockClass(classId: ClassId) {
  const node = classTree.value?.getNode(classId)
  if (!node) return

  const success = game.player.value?.classManager?.unlockClass(
    classId,
    playerState.value.talents,
    playerState.value.skills,
    playerState.value.level,
    playerState.value.gold
  )

  if (success && node.costs.gold) {
    game.player.value?.resourceManager.getResource('gold')?.add(-node.costs.gold)
    logSystem.success(`解锁职业: ${node.name}`, { classId, tier: node.tier })
  }
}

function canUnlock(node: ClassNode): boolean {
  const unlocked = unlockedClassIds.value.includes(node.id)
  if (unlocked) return false

  const prerequisitesMet = node.prerequisites.every(prereq => 
    unlockedClassIds.value.includes(prereq)
  )

  const requirementsMet = node.checkRequirements(
    playerState.value.talents,
    playerState.value.skills,
    playerState.value.level,
    unlockedClassIds.value
  )

  const hasGold = !node.costs.gold || playerState.value.gold >= node.costs.gold

  return prerequisitesMet && requirementsMet && hasGold
}

function formatRequirement(req: ClassRequirement): string {
  switch (req.type) {
    case 'talent':
      return `${req.target} 天赋 ≥ ${req.value}`
    case 'skill':
      const skillLevel = playerState.value.skills.get(req.target || '') || 0
      return `${req.target} 技能 ≥ ${req.value} (当前: ${skillLevel})`
    case 'level':
      return `等级 ≥ ${req.value} (当前: ${playerState.value.level})`
    case 'previous_class':
      const prereqNode = classTree.value?.getNode(req.target || '')
      return `前置职业: ${prereqNode?.name || req.target}`
    case 'custom':
      return req.condition || '特殊条件'
    default:
      return '未知条件'
  }
}

function formatEffect(effect: ClassEffect): string {
  switch (effect.type) {
    case 'skill_unlock':
      return `解锁技能: ${effect.target}`
    case 'skill_max':
      return `${effect.target} 技能上限 +${effect.value}`
    case 'talent_bonus':
      return `${effect.target} 天赋 +${effect.value}`
    case 'mana_capacity':
      return `法力上限 +${effect.value}`
    case 'mana_regen':
      return `法力恢复 +${effect.value}/秒`
    case 'spell_power':
      return `法术强度 +${effect.value}`
    case 'custom':
      return `${effect.target}: ${effect.value}`
    default:
      return `${effect.type}: ${effect.value}`
  }
}

function handleMouseDown(e: MouseEvent) {
  isDragging.value = true
  lastMousePos.value = { x: e.clientX, y: e.clientY }
}

function handleMouseMove(e: MouseEvent) {
  if (!isDragging.value) return
  const dx = e.clientX - lastMousePos.value.x
  const dy = e.clientY - lastMousePos.value.y
  pan.value.x += dx
  pan.value.y += dy
  lastMousePos.value = { x: e.clientX, y: e.clientY }
}

function handleMouseUp() {
  isDragging.value = false
}

function handleWheel(e: WheelEvent) {
  e.preventDefault()
  const delta = e.deltaY > 0 ? -0.1 : 0.1
  const newZoom = Math.max(0.5, Math.min(2, zoom.value + delta))
  zoom.value = newZoom
}

function resetView() {
  zoom.value = 1
  pan.value = { x: 0, y: 0 }
}

const classEffects = computed(() => {
  return game.player.value?.classManager?.getClassEffects() || []
})

onMounted(() => {
  console.log('[ClassTree] Component mounted')
  console.log('[ClassTree] Tree:', classTree.value)
  console.log('[ClassTree] Tree nodes:', classTree.value?.nodes.size || 0)
  if (classTree.value) {
    console.log('[ClassTree] All nodes:', Array.from(classTree.value.nodes.keys()))
  }
  console.log('[ClassTree] Player state:', playerState.value)

  setTimeout(() => {
    initializeNodePositions()
  }, 100)
})

watch(() => [tieredNodes.value, selectedClass.value], () => {
  setTimeout(() => {
    initializeNodePositions()
  }, 100)
}, { deep: true })
</script>

<template>
  <div class="class-tree-view">
    <div class="header">
      <h2>职业树</h2>
      <div class="controls">
        <button @click="resetView" class="control-btn">重置视图</button>
        <button @click="initializeNodePositions" class="control-btn">刷新布局</button>
      </div>
    </div>

    <div class="content">
      <div 
        class="tree-container"
        @mousedown="handleMouseDown"
        @mousemove="handleMouseMove"
        @mouseup="handleMouseUp"
        @mouseleave="handleMouseUp"
        @wheel="handleWheel"
      >
        <div 
          class="class-tree-canvas"
          :style="{ 
            transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
            transformOrigin: '0 0'
          }"
        >
          <svg class="connections" :width="10000" :height="10000">
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#666" />
              </marker>
            </defs>
            <g
              v-for="node in allNodes"
              :key="`${node.id}-connections`"
            >
              <line
                v-for="prereq in node.prerequisites"
                :key="`${prereq}-${node.id}`"
                :x1="getNodePosition(prereq)?.x || 0 + 80"
                :y1="getNodePosition(prereq)?.y || 0 + 40"
                :x2="getNodePosition(node.id)?.x || 0 + 80"
                :y2="getNodePosition(node.id)?.y || 0 + 40"
                stroke="#666"
                stroke-width="2"
                marker-end="url(#arrowhead)"
              />
            </g>
          </svg>

          <div
            v-for="node in allNodes"
            :key="node.id"
            :class="['class-node', getClassStatus(node), { 
              selected: selectedClass?.id === node.id 
            }]"
            :style="{ 
              left: getNodePosition(node.id)?.x + 'px',
              top: getNodePosition(node.id)?.y + 'px'
            }"
            @click="selectClass(node)"
          >
            <div class="node-icon">{{ node.icon }}</div>
            <div class="node-content">
              <div class="node-name">{{ node.name }}</div>
              <div class="node-tier">T{{ node.tier }}</div>
              <div v-if="node.element" class="node-element" :class="`element-${node.element}`">
                {{ node.element }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="sidebar">
        <div v-if="selectedClass" class="class-details">
          <div class="details-header">
            <span class="details-icon">{{ selectedClass.icon }}</span>
            <div>
              <h3>{{ selectedClass.name }}</h3>
              <span class="details-tier">Tier {{ selectedClass.tier }}</span>
            </div>
            <div v-if="selectedClass.isSecret" class="secret-badge">🔒 隐藏职业</div>
          </div>

          <p class="description">{{ selectedClass.description }}</p>
          <p v-if="selectedClass.flavor" class="flavor">"{{ selectedClass.flavor }}"</p>

          <div class="section">
            <h4>📋 解锁条件</h4>
            <div class="requirements">
              <div 
                v-for="(req, index) in selectedClass.requirements" 
                :key="index"
                :class="['requirement-item', { met: true }]"
              >
                ✓ {{ formatRequirement(req) }}
              </div>
              <div v-if="selectedClass.prerequisites.length > 0" class="requirement-item">
                前置职业: {{ selectedClass.prerequisites.map(id => classTree.getNode(id)?.name).join(', ') }}
              </div>
            </div>
          </div>

          <div class="section">
            <h4>💰 消耗</h4>
            <div class="costs">
              <div v-if="selectedClass.costs.gold" class="cost-item">
                <span>金币:</span>
                <span :class="{ 
                  'not-enough': playerState.gold < selectedClass.costs.gold 
                }">
                  {{ selectedClass.costs.gold }} / {{ playerState.gold }}
                </span>
              </div>
              <div v-if="selectedClass.costs.experience" class="cost-item">
                <span>经验:</span>
                <span>{{ selectedClass.costs.experience }}</span>
              </div>
              <div v-if="selectedClass.costs.research" class="cost-item">
                <span>研究:</span>
                <span>{{ selectedClass.costs.research }}</span>
              </div>
            </div>
          </div>

          <div class="section">
            <h4>✨ 职业效果</h4>
            <div class="effects">
              <div 
                v-for="(effect, index) in selectedClass.effects" 
                :key="index"
                class="effect-item"
              >
                {{ formatEffect(effect) }}
              </div>
            </div>
          </div>

          <button 
            v-if="!unlockedClassIds.includes(selectedClass.id)"
            :disabled="!canUnlock(selectedClass)"
            @click="unlockClass(selectedClass.id)"
            class="unlock-btn"
          >
            {{ canUnlock(selectedClass) ? '✓ 解锁职业' : '条件未满足' }}
          </button>
          <div v-else class="unlocked-badge">
            ✓ 已解锁
          </div>
        </div>

        <div v-else class="empty-state">
          <div class="empty-icon">🎭</div>
          <h3>选择一个职业</h3>
          <p>点击左侧职业树中的节点查看详情</p>
        </div>

        <div v-if="classEffects.length > 0" class="active-effects">
          <h4>当前职业效果</h4>
          <div class="effects-list">
            <div v-for="(effect, index) in classEffects" :key="index" class="active-effect">
              {{ formatEffect(effect) }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.class-tree-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #121212;
  color: #e0e0e0;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: #1e1e1e;
  border-bottom: 1px solid #333;
}

.header h2 {
  margin: 0;
  color: #bb86fc;
}

.controls {
  display: flex;
  gap: 10px;
}

.control-btn {
  padding: 8px 16px;
  background: #3700b3;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}

.control-btn:hover {
  background: #6200ee;
}

.content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.tree-container {
  flex: 1;
  position: relative;
  overflow: hidden;
  cursor: grab;
  background: #0a0a0a;
  background-image: 
    radial-gradient(circle at 1px 1px, #333 1px, transparent 0);
  background-size: 20px 20px;
}

.tree-container:active {
  cursor: grabbing;
}

.class-tree-canvas {
  position: absolute;
  width: 10000px;
  height: 10000px;
  transform-origin: 0 0;
}

.connections {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.class-node {
  position: absolute;
  width: 160px;
  height: 80px;
  background: #1e1e1e;
  border: 2px solid #444;
  border-radius: 8px;
  padding: 10px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 10px;
}

.class-node:hover {
  border-color: #bb86fc;
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(187, 134, 252, 0.3);
}

.class-node.selected {
  border-color: #bb86fc;
  border-width: 3px;
  box-shadow: 0 0 15px rgba(187, 134, 252, 0.5);
}

.class-node.locked {
  opacity: 0.6;
  border-color: #666;
}

.class-node.available {
  border-color: #4caf50;
  box-shadow: 0 0 10px rgba(76, 175, 80, 0.3);
}

.class-node.unlocked {
  background: linear-gradient(135deg, #1b5e20, #1e1e1e);
  border-color: #4caf50;
}

.class-node.secret {
  border-color: #ff9800;
  opacity: 0.8;
}

.node-icon {
  font-size: 2rem;
}

.node-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.node-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: #e0e0e0;
}

.node-tier {
  font-size: 0.75rem;
  color: #888;
}

.node-element {
  font-size: 0.7rem;
  padding: 2px 6px;
  border-radius: 4px;
  background: #333;
}

.element-fire { color: #ff5722; background: rgba(255, 87, 34, 0.2); }
.element-water { color: #2196f3; background: rgba(33, 150, 243, 0.2); }
.element-earth { color: #8d6e63; background: rgba(141, 110, 99, 0.2); }
.element-wind { color: #4caf50; background: rgba(76, 175, 80, 0.2); }

.sidebar {
  width: 400px;
  background: #1e1e1e;
  border-left: 1px solid #333;
  padding: 20px;
  overflow-y: auto;
}

.class-details {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.details-header {
  display: flex;
  align-items: center;
  gap: 15px;
  padding-bottom: 15px;
  border-bottom: 1px solid #333;
}

.details-icon {
  font-size: 3rem;
}

.details-header h3 {
  margin: 0;
  color: #bb86fc;
  font-size: 1.4rem;
}

.details-tier {
  font-size: 0.9rem;
  color: #888;
}

.secret-badge {
  margin-left: auto;
  padding: 4px 12px;
  background: #ff9800;
  color: white;
  border-radius: 4px;
  font-size: 0.8rem;
}

.description {
  color: #b0bec5;
  line-height: 1.6;
  margin: 0;
}

.flavor {
  color: #bb86fc;
  font-style: italic;
  text-align: center;
  margin: 0;
  padding: 10px;
  background: rgba(187, 134, 252, 0.1);
  border-radius: 8px;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.section h4 {
  margin: 0;
  color: #bb86fc;
  font-size: 1.1rem;
}

.requirements {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.requirement-item {
  padding: 8px 12px;
  background: #252525;
  border-radius: 4px;
  font-size: 0.9rem;
}

.requirement-item.met {
  border-left: 3px solid #4caf50;
}

.costs {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cost-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 12px;
  background: #252525;
  border-radius: 4px;
}

.cost-item span.not-enough {
  color: #f44336;
}

.effects {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.effect-item {
  padding: 8px 12px;
  background: rgba(187, 134, 252, 0.1);
  border-left: 3px solid #bb86fc;
  border-radius: 4px;
  font-size: 0.9rem;
}

.unlock-btn {
  width: 100%;
  padding: 14px;
  background: #4caf50;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

.unlock-btn:hover:not(:disabled) {
  background: #66bb6a;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
}

.unlock-btn:disabled {
  background: #424242;
  color: #9e9e9e;
  cursor: not-allowed;
}

.unlocked-badge {
  padding: 14px;
  background: #2e7d32;
  color: #81c784;
  text-align: center;
  border-radius: 6px;
  font-weight: bold;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  gap: 15px;
}

.empty-icon {
  font-size: 4rem;
  opacity: 0.5;
}

.empty-state h3 {
  margin: 0;
  color: #888;
}

.empty-state p {
  color: #666;
  margin: 0;
}

.active-effects {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #333;
}

.active-effects h4 {
  margin: 0 0 15px 0;
  color: #bb86fc;
}

.effects-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.active-effect {
  padding: 8px 12px;
  background: rgba(76, 175, 80, 0.1);
  border-left: 3px solid #4caf50;
  border-radius: 4px;
  font-size: 0.85rem;
  color: #b0bec5;
}
</style>
