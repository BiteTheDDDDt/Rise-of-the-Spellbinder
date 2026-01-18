// 不再需要 reactive，使用普通数组避免内存溢出
import type { Element } from './talent'
import { logSystem } from './log'

export type ClassId = string

export interface ClassRequirement {
  type: 'talent' | 'skill' | 'level' | 'previous_class' | 'custom'
  target?: string
  value?: any
  condition?: string
}

export interface ClassEffect {
  type: 'skill_unlock' | 'skill_max' | 'talent_bonus' | 'mana_capacity' | 'mana_regen' | 'spell_power' | 'custom'
  target?: string
  value: number
}

export interface ClassNodeData {
  id: ClassId
  name: string
  description: string
  tier: number
  element?: Element
  requirements: ClassRequirement[]
  costs: {
    gold?: number
    experience?: number
    research?: number
  }
  effects: ClassEffect[]
  prerequisites?: ClassId[]
  icon?: string
  secret?: boolean
  flavor?: string
}

export class ClassNode {
  data: ClassNodeData

  constructor(data: ClassNodeData) {
    this.data = { ...data }
  }

  get id(): ClassId {
    return this.data.id
  }

  get name(): string {
    return this.data.name
  }

  get description(): string {
    return this.data.description
  }

  get tier(): number {
    return this.data.tier
  }

  get element(): Element | undefined {
    return this.data.element
  }

  get requirements(): ClassRequirement[] {
    return this.data.requirements
  }

  get costs(): typeof this.data.costs {
    return this.data.costs
  }

  get effects(): ClassEffect[] {
    return this.data.effects
  }

  get prerequisites(): ClassId[] {
    return this.data.prerequisites || []
  }

  get icon(): string | undefined {
    return this.data.icon
  }

  get isSecret(): boolean {
    return this.data.secret || false
  }

  get flavor(): string | undefined {
    return this.data.flavor
  }

  checkRequirements(
    playerTalent: Record<Element, number>,
    playerSkills: Map<string, number>,
    playerLevel: number,
    unlockedClasses: ClassId[],
    customVars: Record<string, any> = {}
  ): boolean {
    for (const req of this.data.requirements) {
      let satisfied = false

      switch (req.type) {
        case 'talent':
          if (req.target && req.value !== undefined) {
            satisfied = playerTalent[req.target as Element] >= req.value
          }
          break

        case 'skill':
          if (req.target && req.value !== undefined) {
            const skillLevel = playerSkills.get(req.target) || 0
            satisfied = skillLevel >= req.value
          }
          break

        case 'level':
          if (req.value !== undefined) {
            satisfied = playerLevel >= req.value
          }
          break

        case 'previous_class':
          if (req.target) {
            satisfied = unlockedClasses.includes(req.target)
          }
          break

        case 'custom':
          if (req.condition) {
            try {
              const evalFunc = new Function(...Object.keys(customVars), `return ${req.condition}`)
              satisfied = evalFunc(...Object.values(customVars))
            } catch {
              satisfied = false
            }
          }
          break
      }

      if (!satisfied) {
        return false
      }
    }

    return true
  }
}

export class ClassTree {
  nodes: Map<ClassId, ClassNode>
  edges: Map<ClassId, ClassId[]>
  achievements: ClassId[]

  constructor() {
    this.nodes = new Map()
    this.edges = new Map()
    this.achievements = []  // 移除 reactive，使用普通数组
    console.log('[ClassTree] Constructor called, nodes initialized')
  }

  addNode(node: ClassNode) {
    this.nodes.set(node.id, node)
    this.edges.set(node.id, [])
    console.log(`[ClassTree] Added node: ${node.id} (${node.name})`)
  }

  addEdge(from: ClassId, to: ClassId) {
    if (!this.edges.has(from)) {
      this.edges.set(from, [])
    }
    this.edges.get(from)!.push(to)
  }

  addPrerequisite(classId: ClassId, prerequisiteId: ClassId) {
    const node = this.nodes.get(classId)
    if (node) {
      if (!node.data.prerequisites) {
        node.data.prerequisites = []
      }
      node.data.prerequisites.push(prerequisiteId)
      this.addEdge(prerequisiteId, classId)
    }
  }

  getNode(classId: ClassId): ClassNode | undefined {
    return this.nodes.get(classId)
  }

  getUnlockedClasses(): ClassNode[] {
    return this.achievements.map(id => this.nodes.get(id)).filter((n): n is ClassNode => n !== undefined)
  }

  getAvailableClasses(
    playerTalent: Record<Element, number>,
    playerSkills: Map<string, number>,
    playerLevel: number,
    unlockedClasses: ClassId[],
    customVars: Record<string, any> = {}
  ): ClassNode[] {
    try {
      const available: ClassNode[] = []

      for (const node of this.nodes.values()) {
        if (this.achievements.includes(node.id)) {
          continue
        }

        if (node.isSecret && !this.isSecretNodeRevealed(node.id, unlockedClasses)) {
          continue
        }

        const prerequisitesMet = node.prerequisites.every(prereq => unlockedClasses.includes(prereq))

        try {
          const requirementsMet = node.checkRequirements(
            playerTalent,
            playerSkills,
            playerLevel,
            unlockedClasses,
            customVars
          )

          if (prerequisitesMet && requirementsMet) {
            available.push(node)
          }
        } catch (error) {
          console.warn('[ClassTree] Error checking requirements for class:', node.id, error)
          continue
        }
      }

      return available.sort((a, b) => a.tier - b.tier)
    } catch (error) {
      console.error('[ClassTree] Error in getAvailableClasses:', error)
      return []
    }
  }

  private isSecretNodeRevealed(
    classId: ClassId,
    unlockedClasses: ClassId[]
  ): boolean {
    const node = this.nodes.get(classId)
    if (!node || !node.isSecret) return false

    const prereqsMet = node.prerequisites.every(prereq => unlockedClasses.includes(prereq))
    return prereqsMet
  }

  getTreeStructure(): Record<number, ClassNode[]> {
    const tiers: Record<number, ClassNode[]> = {}

    try {
      for (const node of this.nodes.values()) {
        const tier = node.tier
        if (!tiers[tier]) {
          tiers[tier] = []
        }
        tiers[tier].push(node)
      }
    } catch (error) {
      console.error('[ClassTree] Error in getTreeStructure:', error)
      return {}
    }

    return tiers
  }

  getPathToClass(targetClassId: ClassId): ClassNode[] {
    const path: ClassNode[] = []
    const visited = new Set<ClassId>()
    const queue: { classId: ClassId; path: ClassNode[] }[] = []

    queue.push({ classId: targetClassId, path: [] })

    while (queue.length > 0) {
      const { classId, path: currentPath } = queue.shift()!

      if (visited.has(classId)) continue
      visited.add(classId)

      const node = this.nodes.get(classId)
      if (!node) continue

      const newPath = [...currentPath, node]

      if (node.prerequisites.length === 0) {
        return newPath.reverse()
      }

      for (const prereq of node.prerequisites) {
        queue.push({ classId: prereq, path: newPath })
      }
    }

    return path
  }

  toJSON() {
    return {
      achievements: this.achievements
    }
  }

  static fromJSON(data: any, classTree: ClassTree): ClassTree {
    classTree.achievements = data.achievements || []
    return classTree
  }
}

export class ClassManager {
  classTree: ClassTree
  unlockedClasses: ClassId[]
  private cachedAvailableClasses: ClassNode[] = []
  private lastCheckTime = 0
  // 添加版本号，用于触发 UI 更新
  version = 0

  constructor() {
    this.classTree = new ClassTree()
    this.unlockedClasses = []  // 使用普通数组
  }

  setClassTree(classTree: ClassTree) {
    this.classTree = classTree
    this.cachedAvailableClasses = []
    this.lastCheckTime = 0
  }

  unlockClass(
    classId: ClassId,
    playerTalent: Record<Element, number>,
    playerSkills: Map<string, number>,
    playerLevel: number,
    playerGold: number,
    customVars: Record<string, any> = {}
  ): boolean {
    try {
      const node = this.classTree.getNode(classId)
      if (!node) {
        console.warn('[ClassManager] Class not found:', classId)
        return false
      }

      if (this.unlockedClasses.includes(classId)) {
        console.warn('[ClassManager] Class already unlocked:', classId)
        return true
      }

      const prerequisitesMet = node.prerequisites.every(prereq => this.unlockedClasses.includes(prereq))
      const requirementsMet = node.checkRequirements(
        playerTalent,
        playerSkills,
        playerLevel,
        this.unlockedClasses,
        customVars
      )

      if (!prerequisitesMet || !requirementsMet) {
        console.warn('[ClassManager] Requirements not met for class:', classId)
        return false
      }

      if (node.costs.gold && playerGold < node.costs.gold) {
        console.warn('[ClassManager] Not enough gold for class:', classId)
        return false
      }

      this.unlockedClasses.push(classId)
      this.classTree.achievements.push(classId)
      this.version++  // 触发响应式更新

      logSystem.success(`职业进阶: ${node.name}`, { classId, tier: node.tier })

      return true
    } catch (error) {
      console.error('[ClassManager] Error in unlockClass:', error)
      return false
    }
  }

  canUnlockClass(
    classId: ClassId,
    playerTalent: Record<Element, number>,
    playerSkills: Map<string, number>,
    playerLevel: number,
    playerGold: number,
    customVars: Record<string, any> = {}
  ): boolean {
    const node = this.classTree.getNode(classId)
    if (!node) return false

    if (this.unlockedClasses.includes(classId)) return true

    const prerequisitesMet = node.prerequisites.every(prereq => this.unlockedClasses.includes(prereq))
    const requirementsMet = node.checkRequirements(
      playerTalent,
      playerSkills,
      playerLevel,
      this.unlockedClasses,
      customVars
    )
    const hasGold = !node.costs.gold || playerGold >= node.costs.gold

    return prerequisitesMet && requirementsMet && hasGold
  }

  getUnlockedClasses(): ClassNode[] {
    return this.unlockedClasses.map(id => this.classTree.getNode(id)).filter((n): n is ClassNode => n !== undefined)
  }

  getAvailableClasses(
    playerTalent: Record<Element, number>,
    playerSkills: Map<string, number>,
    playerLevel: number,
    playerGold: number,
    customVars: Record<string, any> = {}
  ): ClassNode[] {
    const now = Date.now()
    const cacheDuration = 500 // Cache for 500ms to prevent excessive recalculation

    if (now - this.lastCheckTime < cacheDuration && this.cachedAvailableClasses.length > 0) {
      return this.cachedAvailableClasses
    }

    const allAvailable = this.classTree.getAvailableClasses(
      playerTalent,
      playerSkills,
      playerLevel,
      this.unlockedClasses,
      customVars
    )

    this.cachedAvailableClasses = allAvailable.filter(node => {
      return !node.costs.gold || playerGold >= node.costs.gold
    })
    this.lastCheckTime = now

    return this.cachedAvailableClasses
  }

  getClassEffects(): ClassEffect[] {
    const effects: ClassEffect[] = []
    const unlockedNodes = this.getUnlockedClasses()

    for (const node of unlockedNodes) {
      effects.push(...node.effects)
    }

    return effects
  }

  getSkillMaxBonuses(): Map<string, number> {
    const bonuses = new Map<string, number>()
    const effects = this.getClassEffects()

    for (const effect of effects) {
      if (effect.type === 'skill_max' && effect.target) {
        const current = bonuses.get(effect.target) || 0
        bonuses.set(effect.target, current + effect.value)
      }
    }

    return bonuses
  }

  getUnlockedSkills(): string[] {
    const skills: string[] = []
    const effects = this.getClassEffects()

    for (const effect of effects) {
      if (effect.type === 'skill_unlock' && effect.target && !skills.includes(effect.target)) {
        skills.push(effect.target)
      }
    }

    return skills
  }

  toJSON() {
    return {
      unlockedClasses: this.unlockedClasses,
      classTree: this.classTree.toJSON()
    }
  }

  static fromJSON(data: any): ClassManager {
    const manager = new ClassManager()
    // 清空并重新填充响应式数组
    manager.unlockedClasses.length = 0
    if (data.unlockedClasses && Array.isArray(data.unlockedClasses)) {
      manager.unlockedClasses.push(...data.unlockedClasses)
    }
    return manager
  }
}
