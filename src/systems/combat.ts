import { reactive } from 'vue'
import type { Player } from '../entities/player'
import { Monster, type CombatBuff, type CombatDebuff } from '../entities/monster'
import type { SpellData, SpellEffect } from './spell'
import type { AchievementManager } from './achievement'
import type { ResourceId } from './resource'
import { logSystem } from './log'

export type CombatLogEntry = {
  timestamp: number
  message: string
  type: 'info' | 'damage' | 'heal' | 'buff' | 'debuff' | 'victory' | 'defeat'
  actor?: string
  target?: string
  value?: number
}

export type CombatResult = 'victory' | 'defeat' | 'fled' | 'ongoing'

export interface CombatReward {
  gold: number
  experience: number
  items: string[]
  mana: Record<string, number>
}

export class CombatSystem {
  player: Player
  monsters: Monster[]
  currentTurn: 'player' | 'monster'
  combatLog: CombatLogEntry[]
  isActive: boolean
  result: CombatResult
  achievementManager?: AchievementManager
  turnCount: number
  playerActionPriority: string[] // 法术优先级列表
  isSimulated: boolean = false

  constructor(player: Player, monsters: Monster[], achievementManager?: AchievementManager) {
    this.player = player
    this.monsters = reactive([...monsters])
    this.currentTurn = 'player'
    this.combatLog = reactive([])
    this.isActive = true
    this.result = 'ongoing'
    this.achievementManager = achievementManager
    this.turnCount = 0
    this.playerActionPriority = ['damage', 'heal', 'buff'] // 默认优先级

    this.logCombatStart()
  }

  logCombatStart() {
    this.addLog('战斗开始！', 'info')
    this.addLog(`遭遇 ${this.monsters.length} 只怪物`, 'info')
  }

  addLog(message: string, type: CombatLogEntry['type'], actor?: string, target?: string, value?: number) {
    this.combatLog.push({
      timestamp: Date.now(),
      message,
      type,
      actor,
      target,
      value
    })
    
    // 同时发送到全局日志系统（仅限关键信息）
    if (type === 'victory') {
      logSystem.success(`战斗胜利：${message}`)
    } else if (type === 'defeat') {
      logSystem.error(`战斗失败：${message}`)
    } else if (type === 'damage' && value && value > 20) {
      // 暴击或高伤害提醒？暂时不加，避免日志太乱
    }
  }

  getElementMultiplier(attackerElement: string, defenderElement: string): number {
    const elementChain: Record<string, string> = {
      fire: 'wind',
      wind: 'earth',
      earth: 'water',
      water: 'fire'
    }

    if (elementChain[attackerElement] === defenderElement) {
      return 1.5 // 克制
    }
    if (elementChain[defenderElement] === attackerElement) {
      return 0.75 // 被克制
    }
    return 1.0 // 无克制
  }

  calculateDamage(baseDamage: number, attackerElement: string, defenderElement: string, defenderDefense: number): number {
    const elementMultiplier = this.getElementMultiplier(attackerElement, defenderElement)
    // 基础伤害计算不再这里减去防御，防御应该在 target.takeDamage 中计算
    // 否则防御被计算了两次（这里一次，takeDamage里一次）
    const damage = Math.max(1, Math.floor(baseDamage * elementMultiplier))
    return damage
  }

  getPlayerHealth(): { current: number, max: number } {
    const healthRes = this.player.resourceManager.getResource('health')
    return {
      current: healthRes ? healthRes.value : 100,
      max: healthRes ? healthRes.max : 100
    }
  }

  getPlayerMana(): Record<string, number> {
    const manaTypes: ResourceId[] = ['mana_fire', 'mana_water', 'mana_earth', 'mana_wind']
    const mana: Record<string, number> = {}
    for (const type of manaTypes) {
      const res = this.player.resourceManager.getResource(type)
      mana[type] = res ? res.value : 0
    }
    return mana
  }

  playerHasAttackSpell(): boolean {
    const learnedSpells = this.player.spellManager.getLearnedSpells()
    return learnedSpells.some(spell => 
      spell.data.effects.some(effect => effect.type === 'damage')
    )
  }

  selectPlayerAction(): SpellData | null {
    const learnedSpells = this.player.spellManager.getLearnedSpells()
    
    // 调试日志：检查所有已学习法术
    if (!this.isSimulated && learnedSpells.length > 0) {
      console.log(`[Combat] ${this.player.name} knows spells:`, learnedSpells.map(s => s.name))
    }

    const availableSpells = learnedSpells.filter(spell => {
      const manaCost = spell.data.manaCost
      const element = spell.data.element
      const manaKey = `mana_${element}`
      const manaRes = this.player.resourceManager.getResource(manaKey as ResourceId)
      
      const hasMana = manaRes && manaRes.value >= manaCost
      const notOnCooldown = spell.currentCooldown <= 0
      
      return hasMana && notOnCooldown
    })

    if (availableSpells.length === 0) {
      if (!this.isSimulated && learnedSpells.length > 0) {
        const firstSpell = learnedSpells[0]
        const res = this.player.resourceManager.getResource(`mana_${firstSpell.data.element}` as ResourceId)
        console.log(`[Combat] No spells available. Example: ${firstSpell.name} (Cost: ${firstSpell.data.manaCost}, Mana: ${res?.value}, CD: ${firstSpell.currentCooldown})`)
      }
      return null
    }

    for (const priority of this.playerActionPriority) {
      const matchingSpell = availableSpells.find(spell => 
        spell.data.effects.some(effect => effect.type === priority)
      )
      if (matchingSpell) {
        return matchingSpell.data
      }
    }

    return availableSpells[0]?.data || null
  }

  executePlayerTurn() {
    if (!this.isActive || this.currentTurn !== 'player') return

    const action = this.selectPlayerAction()
    if (!action) {
      if (!this.isSimulated) {
        this.addLog(`${this.player.name} 没有可用法术，跳过回合`, 'info', this.player.name)
      } else {
        // 模拟模式下也记录，但标记为调试
        // console.log(`[Combat] ${this.player.name} skipped turn: no spells available.`)
      }
      this.endPlayerTurn()
      return
    }

    const targetMonster = this.monsters.find(m => m.isAlive)
    if (!targetMonster) {
      this.endPlayerTurn()
      return
    }

    // 消耗法力
    const element = action.element
    const manaKey = `mana_${element}`
    const manaRes = this.player.resourceManager.getResource(manaKey as ResourceId)
    
    // 如果法力不足（在 selectPlayerAction 之后由于某种原因减少了），再次检查
    if (!manaRes || manaRes.value < action.manaCost) {
      if (!this.isSimulated) {
        this.addLog(`${this.player.name} 法力不足，无法施放 ${action.name}`, 'info', this.player.name)
      }
      this.endPlayerTurn()
      return
    }

    if (manaRes) {
      manaRes.consume(action.manaCost)
    }

    this.addLog(`${this.player.name} 施放 ${action.name}`, 'info', this.player.name)

    // 更新法术在 spellManager 中的状态（进入冷却）
    const spell = this.player.spellManager.getSpell(action.id)
    if (spell) {
      spell.cast()
    }

    for (const effect of action.effects) {
      this.applyEffect(effect, this.player, targetMonster, action.element)
    }

    this.endPlayerTurn()
  }

  applyEffect(effect: SpellEffect, source: any, target: Monster, element: string) {
    switch (effect.type) {
      case 'damage':
        const damage = this.calculateDamage(effect.value, element, target.element, target.defense)
        const actualDamage = target.takeDamage(damage)
        this.addLog(
          `${target.name} 受到 ${actualDamage} 点伤害`,
          'damage',
          source.name || source.data?.name,
          target.name,
          actualDamage
        )
        if (!target.isAlive) {
          this.addLog(`${target.name} 被击败了！`, 'info', undefined, target.name)
          this.checkCombatEnd()
        }
        break

      case 'heal':
        if (source === this.player) {
          const healthRes = this.player.resourceManager.getResource('health')
          if (healthRes) {
            const healAmount = Math.min(effect.value, healthRes.max - healthRes.value)
            healthRes.add(healAmount)
            this.addLog(
              `${this.player.name} 恢复了 ${healAmount} 点生命值`,
              'heal',
              this.player.name,
              this.player.name,
              healAmount
            )
          }
        }
        break

      case 'buff':
        const buff: CombatBuff = {
          type: effect.target === 'self' ? 'attack' : effect.target,
          value: effect.value,
          duration: effect.duration || 3,
          source: source.name || source.data?.name
        }
        if (source === this.player) {
          // 玩家增益暂时不实现，可以加到玩家状态中
        } else {
          target.addBuff(buff)
        }
        break

      case 'debuff':
        const debuff: CombatDebuff = {
          type: effect.target === 'enemy' ? 'defense' : effect.target,
          value: effect.value,
          duration: effect.duration || 3,
          source: source.name || source.data?.name
        }
        target.addDebuff(debuff)
        this.addLog(
          `${target.name} 受到 ${debuff.type} 减益`,
          'debuff',
          source.name || source.data?.name,
          target.name
        )
        break
    }
  }

  executeMonsterTurn() {
    if (!this.isActive || this.currentTurn !== 'monster') return

    const aliveMonsters = this.monsters.filter(m => m.isAlive)
    for (const monster of aliveMonsters) {
      if (!monster.isAlive) continue

      // 简化：假设所有怪物法术都是伤害类型
      const baseDamage = monster.attack
      
      const damage = this.calculateDamage(baseDamage, monster.element, 'neutral', 0)
      const healthRes = this.player.resourceManager.getResource('health')
      if (healthRes) {
        // 玩家暂时没有防御力属性在 Player 类中直接体现，这里假设防御为 0 或未来从 getTotalStats 获取
        const playerStats = this.player.getTotalStats ? this.player.getTotalStats() : { damageReduction: 0 }
        const defense = playerStats.damageReduction || 0
        const actualDamage = Math.max(1, Math.floor(damage - defense))
        
        healthRes.data.value = Math.max(0, healthRes.value - actualDamage)
        
        this.addLog(
          `${monster.name} 攻击 ${this.player.name}，造成 ${actualDamage} 点伤害`,
          'damage',
          monster.name,
          this.player.name,
          actualDamage
        )


        if (healthRes.value <= 0) {
          this.addLog(`${this.player.name} 被击败了！`, 'info', monster.name, this.player.name)
          this.result = 'defeat'
          this.isActive = false
          this.addLog('战斗失败', 'defeat')
          return
        }
      }
    }

    this.endMonsterTurn()
  }

  endPlayerTurn() {
    this.currentTurn = 'monster'
    this.turnCount++
    this.updateMonsterBuffsDebuffs()
    if (this.isSimulated) {
      this.executeMonsterTurn()
    } else {
      setTimeout(() => this.executeMonsterTurn(), 500)
    }
  }

  endMonsterTurn() {
    const aliveMonsters = this.monsters.filter(m => m.isAlive)
    if (aliveMonsters.length === 0) {
      this.result = 'victory'
      this.isActive = false
      this.addLog('战斗胜利！', 'victory')
      this.giveRewards()
      return
    }

    this.currentTurn = 'player'
    if (this.isSimulated) {
      this.executePlayerTurn()
    } else {
      setTimeout(() => this.executePlayerTurn(), 500)
    }
  }

  updateMonsterBuffsDebuffs() {
    for (const monster of this.monsters) {
      monster.updateBuffsAndDebuffs()
    }
  }

  checkCombatEnd() {
    const aliveMonsters = this.monsters.filter(m => m.isAlive)
    if (aliveMonsters.length === 0) {
      this.result = 'victory'
      this.isActive = false
      this.addLog('战斗胜利！', 'victory')
      this.giveRewards()
      return true
    }

    const playerHealth = this.getPlayerHealth()
    if (playerHealth.current <= 0) {
      this.result = 'defeat'
      this.isActive = false
      this.addLog('战斗失败', 'defeat')
      return true
    }

    return false
  }

  giveRewards() {
    if (this.result !== 'victory') return

    const rewards: CombatReward = {
      gold: 0,
      experience: 0,
      items: [],
      mana: {}
    }

    for (const monster of this.monsters) {
      if (monster.isAlive) continue

      const drops = monster.generateDrops()
      if (drops.gold) rewards.gold += drops.gold
      if (drops.experience) rewards.experience += drops.experience
      if (drops.items) rewards.items.push(...drops.items)

      for (const [key, value] of Object.entries(drops)) {
        if (key.startsWith('mana_')) {
          rewards.mana[key] = (rewards.mana[key] || 0) + (value as number)
        }
      }
    }

    this.addLog(`获得 ${rewards.gold} 金币，${rewards.experience} 经验`, 'info', undefined, undefined, rewards.gold)

    // 给予玩家奖励
    const goldRes = this.player.resourceManager.getResource('gold')
    if (goldRes) {
      goldRes.add(rewards.gold)
    }

    this.player.addExperience(rewards.experience)

    for (const [manaType, amount] of Object.entries(rewards.mana)) {
      const manaRes = this.player.resourceManager.getResource(manaType as ResourceId)
      if (manaRes) {
        manaRes.add(amount as number)
      }
    }

    if (this.achievementManager) {
      this.achievementManager.incrementAchievementProgress('monster_slayer')
      if (rewards.gold >= 100) {
        this.achievementManager.incrementAchievementProgress('wealthy_adventurer')
      }
    }
  }

  flee() {
    if (!this.isActive) return false

    this.result = 'fled'
    this.isActive = false
    this.addLog(`${this.player.name} 逃离了战斗`, 'info', this.player.name)
    return true
  }

  start() {
    if (!this.isActive) return
    this.executePlayerTurn()
  }

  autoExecute(maxRounds: number = 100): 'player_won' | 'enemy_won' | 'draw' {
    this.isSimulated = true
    let round = 0

    // 检查玩家是否由于某些原因以 0 HP 进入战斗
    const healthRes = this.player.resourceManager.getResource('health')
    if (healthRes && healthRes.value <= 0) {
      this.addLog(`${this.player.name} 以 0 生命值进入战斗并立即溃败！`, 'defeat')
      this.result = 'defeat'
      this.isActive = false
      return 'enemy_won'
    }

    // 在模拟开始前，检查法力值。如果太低，尝试恢复一点（仅用于调试探索时的法力困境）
    // 基础火花法术通常只需要 5 点法力
    const manaTypes: ResourceId[] = ['mana_fire', 'mana_water', 'mana_earth', 'mana_wind']
    const hasAnyMana = manaTypes.some(t => (this.player.resourceManager.getResource(t)?.value || 0) >= 5)
    
    if (!hasAnyMana) {
      // 记录一个提示，法力不足可能是跳过回合的主要原因
      this.addLog(`${this.player.name} 法力匮乏，可能无法施展法术。`, 'info')
    }

    while (this.isActive && round < maxRounds) {
      round++
      
      if (this.currentTurn === 'player') {
        this.executePlayerTurn()
      } else {
        this.executeMonsterTurn()
      }
      
      // 在模拟执行中更新法术冷却
      this.player.spellManager.update(1) // 假设每回合1秒
      
      if (!this.isActive) {
        break
      }
    }
    
    if (this.result === 'victory') {
      return 'player_won'
    } else if (this.result === 'defeat') {
      return 'enemy_won'
    } else {
      return 'draw'
    }
  }

  getCombatState() {
    return {
      playerHealth: this.getPlayerHealth(),
      playerMana: this.getPlayerMana(),
      monsters: this.monsters.map(m => ({
        id: m.id,
        name: m.name,
        health: m.currentHealth,
        maxHealth: m.maxHealth,
        element: m.element,
        isAlive: m.isAlive
      })),
      currentTurn: this.currentTurn,
      isActive: this.isActive,
      result: this.result,
      turnCount: this.turnCount
    }
  }

  getLogs(): CombatLogEntry[] {
    return this.combatLog
  }

  clearLogs() {
    this.combatLog = []
  }

  setActionPriority(priority: string[]) {
    this.playerActionPriority = priority
  }

  toJSON() {
    return {
      monsters: this.monsters.map(m => m.toJSON()),
      currentTurn: this.currentTurn,
      isActive: this.isActive,
      result: this.result,
      turnCount: this.turnCount,
      combatLog: this.combatLog
    }
  }

  static fromJSON(data: any, player: Player, achievementManager?: AchievementManager): CombatSystem {
    const monsters = data.monsters.map((m: any) => Monster.fromJSON(m))
    const combat = new CombatSystem(player, monsters, achievementManager)
    combat.currentTurn = data.currentTurn || 'player'
    combat.isActive = data.isActive || false
    combat.result = data.result || 'ongoing'
    combat.turnCount = data.turnCount || 0
    combat.combatLog = reactive(data.combatLog || [])
    return combat
  }
}