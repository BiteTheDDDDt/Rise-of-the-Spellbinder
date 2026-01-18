<script setup lang="ts">
import { computed, ref } from 'vue'
import { useGame } from '../../core/useGame'
import type { ClassNode } from '../../systems/class'
import type { Element } from '../../systems/talent'

const game = useGame()

const selectedClass = ref<ClassNode | null>(null)
const showOnlyAvailable = ref(true)

const playerTalent = computed(() => ({
  fire: game.player.value?.talent.get('fire') || 0,
  water: game.player.value?.talent.get('water') || 0,
  earth: game.player.value?.talent.get('earth') || 0,
  wind: game.player.value?.talent.get('wind') || 0
}))

const playerSkills = computed(() => {
  const skills = new Map<string, number>()
  const skillManager = game.player.value?.skillManager
  if (skillManager) {
    for (const skill of skillManager.getAllSkills()) {
      skills.set(skill.id, skill.currentLevel)
    }
  }
  return skills
})

const playerLevel = computed(() => game.player.value?.level || 0)

const playerGold = computed(() => game.player.value?.resourceManager.getResource('gold')?.value || 0)

const unlockedClasses = computed(() => {
  return game.player.value?.classManager?.unlockedClasses || []
})

const classTree = computed(() => {
  return game.player.value?.classManager?.classTree
})

const treeStructure = computed(() => {
  if (!classTree.value) return {}
  return classTree.value.getTreeStructure()
})

const availableClasses = computed(() => {
  if (!game.player.value?.classManager) return []
  return game.player.value.classManager.getAvailableClasses(
    playerTalent.value,
    playerSkills.value,
    playerLevel.value,
    playerGold.value
  )
})

function getClassStatus(node: ClassNode): 'unlocked' | 'available' | 'locked' | 'secret' {
  if (node.isSecret && !unlockedClasses.value.includes(node.id) && !availableClasses.value.find(c => c.id === node.id)) {
    return 'secret'
  }
  if (unlockedClasses.value.includes(node.id)) {
    return 'unlocked'
  }
  if (availableClasses.value.find(c => c.id === node.id)) {
    return 'available'
  }
  return 'locked'
}

function selectClass(node: ClassNode) {
  selectedClass.value = node
}

function getClassNodeColor(element: Element | undefined): string {
  const colors: Record<Element, string> = {
    fire: '#ff5252',
    water: '#448aff',
    earth: '#66bb6a',
    wind: '#42a5f5'
  }
  return element ? colors[element] : '#757575'
}

function unlockClass() {
  if (!selectedClass.value || !game.player.value?.classManager) return

  const success = game.player.value.classManager.unlockClass(
    selectedClass.value.id,
    playerTalent.value,
    playerSkills.value,
    playerLevel.value,
    playerGold.value
  )

  if (success) {
    const cost = selectedClass.value.costs.gold || 0
    if (cost > 0) {
      game.player.value.resourceManager.getResource('gold')?.add(-cost)
    }
  }
}

function getMissingRequirements(node: ClassNode): string[] {
  const missing: string[] = []

  for (const req of node.requirements) {
    let met = false

    switch (req.type) {
      case 'talent':
        if (req.target && req.value !== undefined) {
          met = playerTalent.value[req.target as Element] >= req.value
          if (!met) {
            missing.push(`天赋 ${req.target} 需要达到 ${req.value}`)
          }
        }
        break

      case 'skill':
        if (req.target && req.value !== undefined) {
          const skillLevel = playerSkills.value.get(req.target) || 0
          met = skillLevel >= req.value
          if (!met) {
            missing.push(`技能 ${req.target} 需要达到等级 ${req.value}`)
          }
        }
        break

      case 'level':
        if (req.value !== undefined) {
          met = playerLevel.value >= req.value
          if (!met) {
            missing.push(`角色等级需要达到 ${req.value}`)
          }
        }
        break

      case 'previous_class':
        if (req.target) {
          met = unlockedClasses.value.includes(req.target)
          if (!met) {
            const prereqNode = classTree.value?.getNode(req.target)
            missing.push(`需要先解锁职业: ${prereqNode?.name || req.target}`)
          }
        }
        break
    }
  }

  if (node.costs.gold && playerGold.value < node.costs.gold) {
    missing.push(`金币不足，需要 ${node.costs.gold}`)
  }

  return missing
}
</script>

<template>
  <div class="classes-container">
    <div class="classes-header">
      <h2>职业系统</h2>
      <div class="filters">
        <label class="filter-label">
          <input type="checkbox" v-model="showOnlyAvailable" />
          只显示可解锁
        </label>
      </div>
    </div>

    <div class="classes-content">
      <div class="classes-tree">
        <div v-for="(tierClasses, tier) in treeStructure" :key="tier" class="tier-row">
          <div class="tier-label">Tier {{ tier }}</div>
          <div class="tier-classes">
            <div
              v-for="node in tierClasses"
              :key="node.id"
              :class="[
                'class-node',
                getClassStatus(node),
                { selected: selectedClass?.id === node.id }
              ]"
              @click="selectClass(node)"
              :style="{
                borderColor: getClassNodeColor(node.element)
              }"
            >
              <div class="class-icon">{{ node.icon }}</div>
              <div class="class-name">{{ node.name }}</div>
              <div class="class-status">
                <span v-if="getClassStatus(node) === 'unlocked'" class="status-unlocked">已解锁</span>
                <span v-else-if="getClassStatus(node) === 'available'" class="status-available">可解锁</span>
                <span v-else-if="getClassStatus(node) === 'secret'" class="status-secret">???</span>
                <span v-else class="status-locked">锁定</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="class-details" v-if="selectedClass">
        <div class="detail-header">
          <h3>
            {{ selectedClass.icon }} {{ selectedClass.name }}
          </h3>
          <span class="tier-badge">Tier {{ selectedClass.tier }}</span>
        </div>

        <div class="detail-description">
          {{ selectedClass.description }}
        </div>

        <div v-if="selectedClass.flavor" class="detail-flavor">
          "{{ selectedClass.flavor }}"
        </div>

        <div class="detail-section">
          <h4>需求</h4>
          <div class="requirements-list">
            <div
              v-for="(req, index) in selectedClass.requirements"
              :key="index"
              :class="['requirement-item', { met: true }]"
            >
              <span v-if="req.type === 'talent' && req.target">
                天赋 {{ req.target }}: {{ playerTalent[req.target as Element] }} / {{ req.value }}
              </span>
              <span v-else-if="req.type === 'skill' && req.target">
                技能 {{ req.target }}: {{ playerSkills.get(req.target) || 0 }} / {{ req.value }}
              </span>
              <span v-else-if="req.type === 'level'">
                角色等级: {{ playerLevel }} / {{ req.value }}
              </span>
              <span v-else-if="req.type === 'previous_class' && req.target">
                前置职业: {{ classTree?.getNode(req.target)?.name || req.target }}
              </span>
            </div>
            <div v-if="selectedClass.costs.gold" :class="['requirement-item', { met: playerGold >= selectedClass.costs.gold }]">
              金币: {{ playerGold }} / {{ selectedClass.costs.gold }}
            </div>
          </div>
        </div>

        <div class="detail-section">
          <h4>效果</h4>
          <div class="effects-list">
            <div v-for="(effect, index) in selectedClass.effects" :key="index" class="effect-item">
              <span v-if="effect.type === 'mana_capacity'">
                魔力容量: +{{ effect.value }}
              </span>
              <span v-else-if="effect.type === 'mana_regen'">
                魔力恢复: +{{ effect.value }}/秒
              </span>
              <span v-else-if="effect.type === 'spell_power'">
                法术强度: +{{ effect.value }}
              </span>
              <span v-else>
                {{ effect.type }}: +{{ effect.value }}
              </span>
            </div>
          </div>
        </div>

        <div class="detail-section" v-if="getClassStatus(selectedClass) !== 'unlocked'">
          <h4>解锁条件</h4>
          <ul class="missing-requirements" v-if="getMissingRequirements(selectedClass).length > 0">
            <li v-for="(req, index) in getMissingRequirements(selectedClass)" :key="index">
              {{ req }}
            </li>
          </ul>
          <div v-else class="all-requirements-met">所有条件已满足</div>
        </div>

        <div class="detail-actions">
          <button
            v-if="getClassStatus(selectedClass) === 'available'"
            class="unlock-btn"
            @click="unlockClass"
          >
            解锁职业
            <span v-if="selectedClass.costs.gold">(-{{ selectedClass.costs.gold }} 金币)</span>
          </button>
          <button v-else-if="getClassStatus(selectedClass) === 'unlocked'" class="unlock-btn unlocked" disabled>
            已解锁
          </button>
          <button v-else class="unlock-btn" disabled>
            条件未满足
          </button>
        </div>
      </div>

      <div class="class-details empty" v-else>
        <div class="empty-state">
          <div class="empty-icon">🎭</div>
          <h3>选择一个职业</h3>
          <p>点击职业节点查看详情</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.classes-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #121212;
  color: #e0e0e0;
}

.classes-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: #1e1e1e;
  border-bottom: 2px solid #333;
}

.classes-header h2 {
  margin: 0;
  color: #bb86fc;
}

.filters {
  display: flex;
  gap: 15px;
}

.filter-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  cursor: pointer;
}

.classes-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.classes-tree {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  border-right: 1px solid #333;
}

.tier-row {
  margin-bottom: 30px;
}

.tier-label {
  font-size: 1.1rem;
  font-weight: bold;
  color: #bb86fc;
  margin-bottom: 15px;
  padding-bottom: 8px;
  border-bottom: 2px solid #333;
}

.tier-classes {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
}

.class-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px;
  background: #1e1e1e;
  border: 2px solid #444;
  border-radius: 12px;
  min-width: 120px;
  cursor: pointer;
  transition: all 0.3s;
}

.class-node:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.4);
}

.class-node.selected {
  border-width: 3px;
  box-shadow: 0 0 20px rgba(187, 134, 252, 0.4);
}

.class-node.unlocked {
  background: linear-gradient(135deg, #1e3a1e, #1e1e1e);
  border-color: #4caf50;
}

.class-node.available {
  background: linear-gradient(135deg, #2a1e3e, #1e1e1e);
  border-color: #9c27b0;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(156, 39, 176, 0.4); }
  50% { box-shadow: 0 0 0 8px rgba(156, 39, 176, 0); }
}

.class-node.locked {
  opacity: 0.5;
}

.class-node.secret {
  background: #2a2a2a;
  border-color: #757575;
}

.class-icon {
  font-size: 2.5rem;
}

.class-name {
  font-size: 1rem;
  font-weight: 600;
  text-align: center;
}

.class-status {
  font-size: 0.8rem;
  padding: 4px 12px;
  border-radius: 12px;
}

.status-unlocked {
  background: #2e7d32;
  color: white;
}

.status-available {
  background: #7b1fa2;
  color: white;
}

.status-locked {
  background: #424242;
  color: #9e9e9e;
}

.status-secret {
  background: #424242;
  color: #bdbdbd;
}

.class-details {
  width: 400px;
  padding: 20px;
  background: #1e1e1e;
  border-left: 1px solid #333;
  overflow-y: auto;
}

.class-details.empty {
  display: flex;
  align-items: center;
  justify-content: center;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 15px;
  border-bottom: 2px solid #333;
}

.detail-header h3 {
  margin: 0;
  color: #bb86fc;
  font-size: 1.5rem;
}

.tier-badge {
  background: #3700b3;
  color: white;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.9rem;
}

.detail-description {
  margin-bottom: 20px;
  line-height: 1.6;
  color: #b0bec5;
}

.detail-flavor {
  margin-bottom: 20px;
  padding: 15px;
  background: #252525;
  border-left: 4px solid #bb86fc;
  font-style: italic;
  color: #90a4ae;
}

.detail-section {
  margin-bottom: 25px;
}

.detail-section h4 {
  margin: 0 0 12px 0;
  color: #bb86fc;
  font-size: 1.1rem;
}

.requirements-list,
.effects-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.requirement-item,
.effect-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: #252525;
  border-radius: 6px;
  border-left: 3px solid #f44336;
  font-size: 0.9rem;
}

.requirement-item.met {
  border-left-color: #4caf50;
}

.missing-requirements {
  list-style: none;
  padding: 0;
  margin: 0;
}

.missing-requirements li {
  padding: 8px 12px;
  background: #252525;
  border-radius: 6px;
  margin-bottom: 8px;
  color: #ef9a9a;
  font-size: 0.9rem;
  border-left: 3px solid #f44336;
}

.all-requirements-met {
  padding: 12px;
  background: rgba(76, 175, 80, 0.1);
  border-radius: 6px;
  color: #81c784;
  text-align: center;
  font-weight: bold;
}

.detail-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.unlock-btn {
  flex: 1;
  padding: 12px;
  background: #3700b3;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

.unlock-btn:hover:not(:disabled) {
  background: #6200ee;
  transform: translateY(-2px);
}

.unlock-btn:disabled {
  background: #424242;
  color: #9e9e9e;
  cursor: not-allowed;
}

.unlock-btn.unlocked {
  background: #2e7d32;
}

.empty-state {
  text-align: center;
  color: #757575;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 20px;
}

.empty-state h3 {
  margin: 0 0 10px 0;
  font-size: 1.5rem;
}

.empty-state p {
  margin: 0;
  font-size: 1rem;
}
</style>
