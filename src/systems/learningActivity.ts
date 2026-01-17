import type { ActivityData } from './activity'
import type { Spell } from './spell'
import type { Skill } from './skill'
import type { Element } from './talent'

export interface LearningActivityData extends ActivityData {
  spellId?: string
  skillId?: string
  element?: Element
  cost: {
    resource: string
    amount: number
  }[]
}

export class LearningActivityFactory {
  static createSpellLearningActivity(spell: Spell, talentLevel: number): LearningActivityData {
    const baseDuration = 30
    const talentMultiplier = 1 - (talentLevel / 200)
    const duration = Math.max(5, Math.floor(baseDuration * talentMultiplier))

    return {
      id: `learn_${spell.id}`,
      name: `学习${spell.name}`,
      description: `学习${spell.name}法术：${spell.description}`,
      duration,
      cost: [
        { resource: 'research', amount: spell.level * 10 },
        { resource: 'gold', amount: spell.level * 5 }
      ],
      rewards: [
        { resource: 'experience', amount: spell.level * 5 }
      ],
      category: 'learning',
      spellId: spell.id
    }
  }

  static createSkillPracticeActivity(skill: Skill, talentLevel: number): LearningActivityData {
    const baseDuration = 20
    const talentMultiplier = 1 - (talentLevel / 200)
    const duration = Math.max(3, Math.floor(baseDuration * talentMultiplier))

    const element = skill.element !== 'neutral' ? skill.element : undefined
    const manaCost = element ? 10 : 0

    const cost: { resource: string, amount: number }[] = []
    if (manaCost > 0 && element) {
      cost.push({ resource: `mana_${element}`, amount: manaCost })
    }
    cost.push({ resource: 'gold', amount: skill.currentLevel })

    return {
      id: `practice_${skill.id}`,
      name: `练习${skill.name}`,
      description: `通过练习提高${skill.name}技能：${skill.description}`,
      duration,
      cost,
      rewards: [
        { resource: 'skill_exp', amount: 50 },
        { resource: 'experience', amount: 5 }
      ],
      category: 'training',
      skillId: skill.id,
      element: element as Element | undefined
    }
  }

  static createSkillTrainingActivity(skillId: string, skillName: string, element: Element | 'neutral', talentLevel: number): LearningActivityData {
    const baseDuration = 25
    const talentMultiplier = 1 - (talentLevel / 200)
    const duration = Math.max(5, Math.floor(baseDuration * talentMultiplier))

    const manaCost = element !== 'neutral' ? 15 : 0

    const cost: { resource: string, amount: number }[] = []
    if (manaCost > 0 && element !== 'neutral') {
      cost.push({ resource: `mana_${element}`, amount: manaCost })
    }
    cost.push({ resource: 'research', amount: 20 })
    cost.push({ resource: 'gold', amount: 10 })

    return {
      id: `train_${skillId}`,
      name: `训练${skillName}`,
      description: `通过系统训练提高${skillName}技能`,
      duration,
      cost,
      rewards: [
        { resource: 'skill_exp', amount: 100 },
        { resource: 'experience', amount: 10 }
      ],
      category: 'training',
      skillId,
      element: element !== 'neutral' ? element as Element : undefined
    }
  }
}

export class LearningActivityManager {
  static completeSpellLearning(activity: LearningActivityData, spellManager: any, playerTalent: any, playerSkills: any): boolean {
    if (!activity.spellId) return false

    const success = spellManager.learnSpell(activity.spellId, playerTalent, playerSkills)
    return success
  }

  static completeSkillPractice(activity: LearningActivityData, skillManager: any): boolean {
    if (!activity.skillId) return false

    const skill = skillManager.getSkill(activity.skillId)
    if (!skill) return false

    const expGain = 50 + Math.floor(skill.currentLevel * 2)
    skillManager.addExpToSkill(activity.skillId, expGain)
    return true
  }

  static completeSkillTraining(activity: LearningActivityData, skillManager: any, playerTalent: any): boolean {
    if (!activity.skillId) return false

    const success = skillManager.unlockSkill(activity.skillId, playerTalent)
    if (success) {
      const skill = skillManager.getSkill(activity.skillId)
      if (skill) {
        skillManager.addExpToSkill(activity.skillId, 100)
      }
    }
    return success
  }

  static canAffordActivity(activity: LearningActivityData, resourceManager: any): boolean {
    for (const cost of activity.cost) {
      const resource = resourceManager.getResource(cost.resource)
      if (!resource || resource.value < cost.amount) {
        return false
      }
    }
    return true
  }

  static payActivityCost(activity: LearningActivityData, resourceManager: any): boolean {
    if (!this.canAffordActivity(activity, resourceManager)) {
      return false
    }

    for (const cost of activity.cost) {
      const resource = resourceManager.getResource(cost.resource)
      if (resource) {
        resource.consume(cost.amount)
      }
    }
    return true
  }
}