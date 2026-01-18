<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useGame } from '../../core/useGame'
import type { ClassNode, ClassId, ClassRequirement, ClassEffect } from '../../systems/class'
import { logSystem } from '../../systems/log'

const game = useGame()
const selectedClass = ref<ClassNode | null>(null)
const showDebugInfo = ref(false)

// 搜索和筛选
const searchQuery = ref('')
const selectedElement = ref<string>('all')
const selectedTier = ref<number | 'all'>('all')
const showSecretClasses = ref(false)

interface NodePosition {
  x: number
  y: number
}

const nodePositions = ref<Map<ClassId, NodePosition>>(new Map())

// 自动缩放相关
const containerRef = ref<HTMLElement | null>(null)
const containerSize = ref({ width: 0, height: 0 })
const zoomScale = ref(1)
const translateOffset = ref({ x: 0, y: 0 })
const isAutoZoomEnabled = ref(true)
let resizeObserver: ResizeObserver | null = null

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
    unlockedClasses: game.player.value?.getUnlockedClasses() || []
  }
})

const classTree = computed(() => {
  const tree = game.player.value?.classManager?.classTree
  console.log('[ClassTree] Computed classTree:', {
    exists: !!tree,
    nodesCount: tree?.nodes?.size || 0,
    edgesCount: tree?.edges?.size || 0
  })
  return tree
})

const allNodes = computed(() => {
  if (!classTree.value) {
    console.log('[ClassTree] allNodes: classTree.value is null/undefined')
    return []
  }
  const nodes = Array.from(classTree.value.nodes.values())
  console.log('[ClassTree] allNodes: computed', nodes.length, 'nodes')
  return nodes
})

const filteredNodes = computed(() => {
  let filtered = allNodes.value
  
  // 搜索筛选
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim()
    filtered = filtered.filter(node => 
      node.name.toLowerCase().includes(query) || 
      node.description.toLowerCase().includes(query) ||
      (node.element && node.element.toLowerCase().includes(query))
    )
  }
  
  // 元素筛选
  if (selectedElement.value !== 'all') {
    filtered = filtered.filter(node => node.element === selectedElement.value)
  }
  
  // 层级筛选
  if (selectedTier.value !== 'all') {
    filtered = filtered.filter(node => node.tier === selectedTier.value)
  }
  
  // 隐藏职业筛选
  if (!showSecretClasses.value) {
    filtered = filtered.filter(node => !node.isSecret)
  }
  
  return filtered
})

const availableElements = computed(() => {
  const elements = new Set<string>()
  elements.add('all')
  for (const node of allNodes.value) {
    if (node.element) {
      elements.add(node.element)
    }
  }
  return Array.from(elements)
})

const availableTiers = computed(() => {
  const tiers = new Set<number>()
  for (const node of allNodes.value) {
    tiers.add(node.tier)
  }
  return Array.from(tiers).sort((a, b) => a - b)
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

const unlockedClassIds = computed(() => {
  const ids = playerState.value.unlockedClasses
  console.log('[ClassTree] unlockedClassIds computed:', ids)
  return ids
})

const availableClasses = computed(() => {
  if (!classTree.value) return []
  return classTree.value.getAvailableClasses(
    playerState.value.talents,
    playerState.value.skills,
    playerState.value.level,
    unlockedClassIds.value
  )
})

const hasNodePositions = computed(() => {
  return nodePositions.value.size > 0 && allNodes.value.length > 0 && nodePositions.value.size >= allNodes.value.length
})

const hasClassTree = computed(() => {
  return !!classTree.value && classTree.value.nodes.size > 0
})

const canvasSize = computed(() => {
  let maxX = 0
  let maxY = 0
  const nodeWidth = 160
  const nodeHeight = 80
  
  for (const position of nodePositions.value.values()) {
    maxX = Math.max(maxX, position.x + nodeWidth)
    maxY = Math.max(maxY, position.y + nodeHeight)
  }
  
  // 添加边距
  return {
    width: Math.max(maxX + 50, 800), // 最小宽度
    height: Math.max(maxY + 50, 600) // 最小高度
  }
})

const zoomTransform = computed(() => {
  if (!isAutoZoomEnabled.value) {
    return {
      scale: 1,
      translateX: 0,
      translateY: 0,
      transform: 'none'
    }
  }

  const canvas = canvasSize.value
  const container = containerSize.value
  
  // 如果容器或画布尺寸为0，返回默认值
  if (container.width === 0 || container.height === 0 || canvas.width === 0 || canvas.height === 0) {
    return {
      scale: 1,
      translateX: 0,
      translateY: 0,
      transform: 'none'
    }
  }

  // 计算缩放比例，留出一些边距（20px）
  const scaleX = (container.width - 40) / canvas.width
  const scaleY = (container.height - 40) / canvas.height
  const scale = Math.min(scaleX, scaleY, 1) // 最大缩放为1（不放大）

  // 计算居中偏移
  const translateX = (container.width - canvas.width * scale) / 2
  const translateY = (container.height - canvas.height * scale) / 2

  return {
    scale,
    translateX,
    translateY,
    transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`
  }
})

function updateContainerSize() {
  if (!containerRef.value) return
  
  const rect = containerRef.value.getBoundingClientRect()
  containerSize.value = {
    width: rect.width,
    height: rect.height
  }
  console.log('[ClassTree] Container size updated:', containerSize.value)
}

function toggleAutoZoom() {
  isAutoZoomEnabled.value = !isAutoZoomEnabled.value
  console.log('[ClassTree] Auto zoom:', isAutoZoomEnabled.value ? 'enabled' : 'disabled')
}

function initializeNodePositions() {
  console.log('[ClassTree] initializeNodePositions called')
  
  // 使用分层布局算法
  initializeNodePositionsWithHierarchy()
}

function initializePositionsWithDimensions(tiers: Record<number, ClassNode[]>, width: number, height: number) {
  const nodeWidth = 160
  const nodeHeight = 80
  const horizontalGap = 40
  const verticalGap = 60
  const startX = 50
  const startY = 50

  nodePositions.value.clear()
  console.log('[ClassTree] Clearing node positions')

  for (const [tier, nodes] of Object.entries(tiers)) {
    const tierNum = parseInt(tier)
    const totalWidth = nodes.length * nodeWidth + (nodes.length - 1) * horizontalGap
    let x = startX + (width - totalWidth) / 2

    for (const node of nodes) {
      const y = startY + tierNum * (nodeHeight + verticalGap)
      nodePositions.value.set(node.id, { x, y })
      console.log(`[ClassTree] Set position for ${node.id}: (${x}, ${y})`)
      x += nodeWidth + horizontalGap
    }
  }
  console.log('[ClassTree] Node positions initialized, total:', nodePositions.value.size, 'expected:', allNodes.value.length)
}

function initializeNodePositionsWithHierarchy() {
  console.log('[ClassTree] initializeNodePositionsWithHierarchy called')
  if (!classTree.value) {
    console.warn('[ClassTree] No class tree, cannot initialize positions')
    return
  }

  // 构建子节点映射
  const childrenMap = new Map<ClassId, ClassId[]>()
  for (const node of allNodes.value) {
    for (const prereq of node.prerequisites) {
      if (!childrenMap.has(prereq)) {
        childrenMap.set(prereq, [])
      }
      childrenMap.get(prereq)!.push(node.id)
    }
  }

  // 按层级分组
  const tiers = tieredNodes.value
  if (Object.keys(tiers).length === 0) {
    console.warn('[ClassTree] No tiers found, using simple layout')
    initializePositionsWithDimensions(tiers, 1200, 900)
    return
  }

  // 计算每个层级内的节点顺序，减少连接线交叉
  const sortedTiers: Record<number, ClassNode[]> = {}
  for (const [tierStr, nodes] of Object.entries(tiers)) {
    const tier = parseInt(tierStr)
    if (tier === 0) {
      // Tier 0 节点（学徒）放在中心
      sortedTiers[tier] = nodes
      continue
    }

    // 根据父节点的平均位置排序
    const nodesWithAvgParentPos = nodes.map(node => {
      const parents = node.prerequisites
      let avgParentX = 0
      if (parents.length > 0) {
        // 计算父节点在当前布局中的平均x位置
        const parentPositions = parents
          .map(parentId => nodePositions.value.get(parentId))
          .filter((p): p is NodePosition => p !== undefined)
        
        if (parentPositions.length > 0) {
          avgParentX = parentPositions.reduce((sum, pos) => sum + pos.x, 0) / parentPositions.length
        }
      }
      return { node, avgParentX }
    })

    // 按父节点平均x位置排序
    nodesWithAvgParentPos.sort((a, b) => a.avgParentX - b.avgParentX)
    sortedTiers[tier] = nodesWithAvgParentPos.map(item => item.node)
  }

  // 使用排序后的层级进行布局
  const nodeWidth = 160
  const nodeHeight = 80
  const horizontalGap = 40
  const verticalGap = 80
  const startX = 50
  const startY = 50
  const maxWidth = 2000

  nodePositions.value.clear()

  // 先计算每个层级的位置
  const tierPositions = new Map<number, { nodes: ClassNode[], positions: number[] }>()
  const maxTier = Math.max(...Object.keys(sortedTiers).map(t => parseInt(t)))

  for (let tier = 0; tier <= maxTier; tier++) {
    const nodes = sortedTiers[tier]
    if (!nodes || nodes.length === 0) continue

    const totalWidth = nodes.length * nodeWidth + (nodes.length - 1) * horizontalGap
    const xOffset = Math.max(startX, (maxWidth - totalWidth) / 2)
    const positions: number[] = []
    
    let x = xOffset
    for (const node of nodes) {
      positions.push(x)
      x += nodeWidth + horizontalGap
    }
    
    tierPositions.set(tier, { nodes, positions })
  }

  // 调整位置以减少连接线交叉（简单版本）
  // 我们可以进行几次迭代调整
  for (let iteration = 0; iteration < 3; iteration++) {
    for (let tier = 1; tier <= maxTier; tier++) {
      const tierData = tierPositions.get(tier)
      if (!tierData) continue

      const { nodes, positions } = tierData
      const newPositions = [...positions]

      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i]
        const parents = node.prerequisites
        if (parents.length === 0) continue

        // 计算父节点的平均x位置
        const parentPositions = parents
          .map(parentId => {
            const pos = nodePositions.value.get(parentId)
            return pos ? pos.x : undefined
          })
          .filter((p): p is number => p !== undefined)
        
        if (parentPositions.length > 0) {
          const avgParentX = parentPositions.reduce((sum, x) => sum + x, 0) / parentPositions.length
          // 稍微向父节点位置移动
          newPositions[i] = newPositions[i] * 0.7 + avgParentX * 0.3
        }
      }

      // 确保节点不重叠
      newPositions.sort((a, b) => a - b)
      for (let i = 1; i < newPositions.length; i++) {
        const minDistance = nodeWidth + horizontalGap
        if (newPositions[i] - newPositions[i-1] < minDistance) {
          newPositions[i] = newPositions[i-1] + minDistance
        }
      }

      // 更新层级位置
      tierData.positions = newPositions
    }
  }

  // 最终设置节点位置
  for (let tier = 0; tier <= maxTier; tier++) {
    const tierData = tierPositions.get(tier)
    if (!tierData) continue

    const { nodes, positions } = tierData
    const y = startY + tier * (nodeHeight + verticalGap)

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]
      const x = positions[i]
      nodePositions.value.set(node.id, { x, y })
      console.log(`[ClassTree] Hierarchical position for ${node.id}: (${x}, ${y})`)
    }
  }

  console.log('[ClassTree] Hierarchical layout complete, positions:', nodePositions.value.size)
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

  const success = game.player.value?.unlockPlayerClass(
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

function resetView() {
  // 重置节点布局
  nodePositions.value.clear()
  initializeNodePositions()
}

function showDebugData() {
  console.log('=== ClassTree Debug Info ===')
  console.log('hasClassTree:', hasClassTree.value)
  console.log('classTree.value:', classTree.value)
  console.log('classTree nodes count:', classTree.value?.nodes?.size || 0)
  console.log('classTree edges count:', classTree.value?.edges?.size || 0)
  console.log('allNodes count:', allNodes.value.length)
  console.log('tieredNodes keys:', Object.keys(tieredNodes.value).length)
  console.log('nodePositions count:', nodePositions.value.size)
  console.log('unlockedClassIds:', unlockedClassIds.value)
  console.log('availableClasses count:', availableClasses.value.length)
  console.log('playerState:', playerState.value)
  console.log('=== End Debug Info ===')
  
  showDebugInfo.value = !showDebugInfo.value
}

function forceRefresh() {
  console.log('[ClassTree] Force refreshing...')
  nodePositions.value.clear()
  setTimeout(() => {
    initializeNodePositions()
  }, 50)
}

const classEffects = computed(() => {
  return game.player.value?.classManager?.getClassEffects() || []
})

onMounted(() => {
  console.log('[ClassTree] Component mounted')
  console.log('[ClassTree] Player:', game.player.value)
  console.log('[ClassTree] ClassManager:', game.player.value?.classManager)
  console.log('[ClassTree] ClassTree:', classTree.value)
  console.log('[ClassTree] Tree nodes count:', classTree.value?.nodes?.size || 0)
  
  if (classTree.value && classTree.value.nodes) {
    const nodeIds = Array.from(classTree.value.nodes.keys())
    console.log('[ClassTree] All nodes IDs:', nodeIds)
    console.log('[ClassTree] First few nodes:', nodeIds.slice(0, 5))
  }
  
  console.log('[ClassTree] Player talents:', playerState.value.talents)
  console.log('[ClassTree] Player level:', playerState.value.level)
  console.log('[ClassTree] Player gold:', playerState.value.gold)
  console.log('[ClassTree] Unlocked classes:', unlockedClassIds.value)

  // 设置ResizeObserver监听容器尺寸变化
  if (containerRef.value) {
    resizeObserver = new ResizeObserver(() => {
      updateContainerSize()
    })
    resizeObserver.observe(containerRef.value)
    updateContainerSize() // 初始更新
  }

  // 立即尝试初始化位置，然后设置一个延迟重试
  setTimeout(() => {
    console.log('[ClassTree] Initializing node positions...')
    initializeNodePositions()
    
    // 如果还是没有位置，再试一次
    setTimeout(() => {
      if (nodePositions.value.size === 0 && classTree.value?.nodes.size > 0) {
        console.log('[ClassTree] Retrying node position initialization...')
        initializeNodePositions()
      }
    }, 500)
  }, 100)
})

onUnmounted(() => {
  if (resizeObserver && containerRef.value) {
    resizeObserver.unobserve(containerRef.value)
  }
  resizeObserver = null
})

watch(() => classTree.value?.nodes.size, () => {
  setTimeout(() => {
    initializeNodePositions()
  }, 100)
})

</script>

<template>
  <div class="class-tree-view">
    <div class="header">
      <h2>职业树</h2>
      <div class="controls">
        <button @click="resetView" class="control-btn">重置视图</button>
        <button @click="initializeNodePositions" class="control-btn">刷新布局</button>
        <button @click="toggleAutoZoom" class="control-btn" :class="{ active: isAutoZoomEnabled }">
          {{ isAutoZoomEnabled ? '🔍 自动缩放' : '🔍 手动查看' }}
        </button>
        <button @click="forceRefresh" class="control-btn">强制刷新</button>
        <button @click="showDebugData" class="control-btn">调试信息</button>
      </div>
    </div>

    <div class="content">
       <div v-if="!hasClassTree" class="no-tree-message">
          <div class="no-tree-icon">🎭</div>
          <h3>职业树加载中...</h3>
          <p>如果此消息持续显示，请检查控制台错误。</p>
          <button @click="initializeNodePositions" class="retry-btn">重试加载</button>
       </div>
        <div 
          v-else
          ref="containerRef"
          class="tree-container"
          :style="{ overflow: isAutoZoomEnabled ? 'hidden' : 'auto' }"
        >
          <div 
            class="class-tree-canvas"
            :style="{ 
              width: canvasSize.width + 'px',
              height: canvasSize.height + 'px',
              transform: zoomTransform.transform,
              transformOrigin: '0 0'
            }"
          >
            <svg v-if="hasNodePositions" class="connections" :width="canvasSize.width" :height="canvasSize.height">
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
                 :x1="(getNodePosition(prereq)?.x || 0) + 80"
                 :y1="(getNodePosition(prereq)?.y || 0) + 40"
                 :x2="(getNodePosition(node.id)?.x || 0) + 80"
                 :y2="(getNodePosition(node.id)?.y || 0) + 40"
                 stroke="#666"
                 stroke-width="2"
                 marker-end="url(#arrowhead)"
               />
             </g>
           </svg>
           <div v-else class="loading-connections">
             正在计算职业树布局...
           </div>

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
                前置职业: {{ selectedClass.prerequisites.map(id => classTree?.getNode(id)?.name).join(', ') }}
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
      
       <div v-if="showDebugInfo" class="debug-panel">
         <h4>调试信息</h4>
         <div class="debug-info">
           <div><strong>职业树状态:</strong> {{ hasClassTree ? '已加载' : '未加载' }}</div>
           <div><strong>节点数量:</strong> {{ allNodes.length }}</div>
           <div><strong>已计算位置:</strong> {{ nodePositions.size }}</div>
           <div><strong>已解锁职业:</strong> {{ unlockedClassIds.length }}</div>
           <div><strong>可解锁职业:</strong> {{ availableClasses.length }}</div>
           <div><strong>Tier分布:</strong> {{ Object.keys(tieredNodes).join(', ') }}</div>
           <div><strong>容器尺寸:</strong> {{ containerSize.width }}×{{ containerSize.height }}</div>
           <div><strong>画布尺寸:</strong> {{ canvasSize.width }}×{{ canvasSize.height }}</div>
           <div><strong>缩放比例:</strong> {{ zoomTransform.scale.toFixed(3) }}</div>
           <div><strong>自动缩放:</strong> {{ isAutoZoomEnabled ? '启用' : '禁用' }}</div>
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

.control-btn.active {
  background: #4caf50;
  box-shadow: 0 0 8px rgba(76, 175, 80, 0.5);
}

.control-btn.active:hover {
  background: #66bb6a;
}

.content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.tree-container {
  flex: 1;
  position: relative;
  overflow: auto;
  background: #0a0a0a;
  background-image: 
    radial-gradient(circle at 1px 1px, #333 1px, transparent 0);
  background-size: 20px 20px;
}

.class-tree-canvas {
  position: relative;
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

.loading-connections {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #888;
  font-size: 1.2rem;
  padding: 20px;
  background: rgba(30, 30, 30, 0.8);
  border-radius: 8px;
  border: 1px solid #444;
}

.no-tree-message {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 20px;
  background: #1e1e1e;
  border-radius: 12px;
  padding: 40px;
}

.no-tree-icon {
  font-size: 4rem;
  opacity: 0.5;
}

.no-tree-message h3 {
  margin: 0;
  color: #bb86fc;
}

.no-tree-message p {
  color: #888;
  margin: 0;
}

.retry-btn {
  padding: 12px 24px;
  background: #3700b3;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  margin-top: 20px;
}

.retry-btn:hover {
  background: #6200ee;
}

.debug-panel {
  margin-top: 20px;
  padding: 15px;
  background: #252525;
  border-radius: 8px;
  border: 1px solid #444;
}

.debug-panel h4 {
  margin: 0 0 10px 0;
  color: #ff9800;
}

.debug-info {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 8px;
  font-size: 0.85rem;
}

.debug-info div {
  padding: 4px 8px;
  background: #1e1e1e;
  border-radius: 4px;
}

</style>
