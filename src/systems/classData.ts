import { ClassTree, ClassNode } from './class'

export function createDefaultClassTree(): ClassTree {
  console.log('[classData] Creating default class tree...')
  const classTree = new ClassTree()

  const classDefinitions: any[] = [
    {
      id: 'apprentice',
      name: '学徒',
      description: '你刚刚踏上魔法之路，是一名著名巫师的学徒。',
      tier: 0,
      requirements: [],
      costs: { gold: 0, experience: 0 },
      effects: [],
      prerequisites: [],
      icon: '📖',
      flavor: '一切伟大的法师都是从这里开始的。'
    },
    {
      id: 'fire_acolyte',
      name: '火焰信徒',
      description: '专精火焰魔法的初学者，学会了基础火焰操控。',
      tier: 1,
      element: 'fire',
      requirements: [
        { type: 'talent', target: 'fire', value: 20 },
        { type: 'previous_class', target: 'apprentice' }
      ],
      costs: { gold: 100, experience: 50 },
      effects: [
        { type: 'mana_capacity', value: 20 },
        { type: 'spell_power', value: 5 }
      ],
      prerequisites: ['apprentice'],
      icon: '🔥'
    },
    {
      id: 'water_acolyte',
      name: '水之信徒',
      description: '专精水系魔法的初学者，学会了基础水系操控。',
      tier: 1,
      element: 'water',
      requirements: [
        { type: 'talent', target: 'water', value: 20 },
        { type: 'previous_class', target: 'apprentice' }
      ],
      costs: { gold: 100, experience: 50 },
      effects: [
        { type: 'mana_capacity', value: 20 },
        { type: 'mana_regen', value: 0.5 }
      ],
      prerequisites: ['apprentice'],
      icon: '💧'
    },
    {
      id: 'earth_acolyte',
      name: '大地信徒',
      description: '专精土系魔法的初学者，学会了基础大地操控。',
      tier: 1,
      element: 'earth',
      requirements: [
        { type: 'talent', target: 'earth', value: 20 },
        { type: 'previous_class', target: 'apprentice' }
      ],
      costs: { gold: 100, experience: 50 },
      effects: [
        { type: 'mana_capacity', value: 20 },
        { type: 'custom', target: 'defense', value: 5 }
      ],
      prerequisites: ['apprentice'],
      icon: '🌍'
    },
    {
      id: 'wind_acolyte',
      name: '风之信徒',
      description: '专精风系魔法的初学者，学会了基础风系操控。',
      tier: 1,
      element: 'wind',
      requirements: [
        { type: 'talent', target: 'wind', value: 20 },
        { type: 'previous_class', target: 'apprentice' }
      ],
      costs: { gold: 100, experience: 50 },
      effects: [
        { type: 'mana_capacity', value: 20 },
        { type: 'custom', target: 'evasion', value: 5 }
      ],
      prerequisites: ['apprentice'],
      icon: '💨'
    },
    {
      id: 'fire_mage',
      name: '火焰法师',
      description: '精通火焰魔法的施法者，能够释放强大的火焰法术。',
      tier: 2,
      element: 'fire',
      requirements: [
        { type: 'talent', target: 'fire', value: 40 },
        { type: 'previous_class', target: 'fire_acolyte' }
      ],
      costs: { gold: 500, experience: 200 },
      effects: [
        { type: 'spell_power', value: 15 },
        { type: 'mana_capacity', value: 50 }
      ],
      prerequisites: ['fire_acolyte'],
      icon: '🔥'
    },
    {
      id: 'water_mage',
      name: '水系法师',
      description: '精通水系魔法的施法者，能够治疗和操控水流。',
      tier: 2,
      element: 'water',
      requirements: [
        { type: 'talent', target: 'water', value: 40 },
        { type: 'previous_class', target: 'water_acolyte' }
      ],
      costs: { gold: 500, experience: 200 },
      effects: [
        { type: 'mana_regen', value: 1.5 },
        { type: 'custom', target: 'healing', value: 10 }
      ],
      prerequisites: ['water_acolyte'],
      icon: '💧'
    },
    {
      id: 'earth_mage',
      name: '大地法师',
      description: '精通土系魔法的施法者，拥有强大的防御能力。',
      tier: 2,
      element: 'earth',
      requirements: [
        { type: 'talent', target: 'earth', value: 40 },
        { type: 'previous_class', target: 'earth_acolyte' }
      ],
      costs: { gold: 500, experience: 200 },
      effects: [
        { type: 'custom', target: 'defense', value: 15 },
        { type: 'mana_capacity', value: 50 }
      ],
      prerequisites: ['earth_acolyte'],
      icon: '🌍'
    },
    {
      id: 'wind_mage',
      name: '风系法师',
      description: '精通风系魔法的施法者，拥有极高的机动性。',
      tier: 2,
      element: 'wind',
      requirements: [
        { type: 'talent', target: 'wind', value: 40 },
        { type: 'previous_class', target: 'wind_acolyte' }
      ],
      costs: { gold: 500, experience: 200 },
      effects: [
        { type: 'custom', target: 'evasion', value: 15 },
        { type: 'mana_capacity', value: 50 }
      ],
      prerequisites: ['wind_acolyte'],
      icon: '💨'
    },
    {
      id: 'pyromancer',
      name: '火焰术士',
      description: '火焰的掌控者，能够召唤地狱般的烈焰。',
      tier: 3,
      element: 'fire',
      requirements: [
        { type: 'talent', target: 'fire', value: 60 },
        { type: 'previous_class', target: 'fire_mage' }
      ],
      costs: { gold: 1500, experience: 500 },
      effects: [
        { type: 'spell_power', value: 30 },
        { type: 'mana_capacity', value: 100 },
        { type: 'skill_max', target: 'fire_mastery', value: 10 }
      ],
      prerequisites: ['fire_mage'],
      icon: '🌋',
      flavor: '让你的敌人燃烧吧！'
    },
    {
      id: 'hydromancer',
      name: '水术士',
      description: '水流的主宰，能够驾驭水的治愈之力。',
      tier: 3,
      element: 'water',
      requirements: [
        { type: 'talent', target: 'water', value: 60 },
        { type: 'previous_class', target: 'water_mage' }
      ],
      costs: { gold: 1500, experience: 500 },
      effects: [
        { type: 'mana_regen', value: 3 },
        { type: 'custom', target: 'healing', value: 25 }
      ],
      prerequisites: ['water_mage'],
      icon: '🌊'
    },
    {
      id: 'geomancer',
      name: '地术师',
      description: '大地的守护者，坚不可摧的堡垒。',
      tier: 3,
      element: 'earth',
      requirements: [
        { type: 'talent', target: 'earth', value: 60 },
        { type: 'previous_class', target: 'earth_mage' }
      ],
      costs: { gold: 1500, experience: 500 },
      effects: [
        { type: 'custom', target: 'defense', value: 30 },
        { type: 'mana_capacity', value: 100 }
      ],
      prerequisites: ['earth_mage'],
      icon: '🏔️'
    },
    {
      id: 'aeromancer',
      name: '风术师',
      description: '风的使者，自由自在地穿梭于战场。',
      tier: 3,
      element: 'wind',
      requirements: [
        { type: 'talent', target: 'wind', value: 60 },
        { type: 'previous_class', target: 'wind_mage' }
      ],
      costs: { gold: 1500, experience: 500 },
      effects: [
        { type: 'custom', target: 'evasion', value: 30 },
        { type: 'mana_capacity', value: 100 }
      ],
      prerequisites: ['wind_mage'],
      icon: '🌪️'
    },
    {
      id: 'elementalist',
      name: '元素使',
      description: '掌控所有元素的神秘施法者。',
      tier: 3,
      requirements: [
        { type: 'talent', target: 'fire', value: 30 },
        { type: 'talent', target: 'water', value: 30 },
        { type: 'talent', target: 'earth', value: 30 },
        { type: 'talent', target: 'wind', value: 30 }
      ],
      costs: { gold: 2000, experience: 800 },
      effects: [
        { type: 'spell_power', value: 20 },
        { type: 'mana_regen', value: 2 },
        { type: 'mana_capacity', value: 80 }
      ],
      prerequisites: [],
      icon: '🔮'
    },
    {
      id: 'battle_mage',
      name: '战斗法师',
      description: '结合魔法与战斗技巧的强大战士。',
      tier: 2,
      requirements: [
        { type: 'previous_class', target: 'apprentice' },
        { type: 'skill', target: 'fire_affinity', value: 10 }
      ],
      costs: { gold: 800, experience: 300 },
      effects: [
        { type: 'spell_power', value: 10 },
        { type: 'custom', target: 'defense', value: 10 },
        { type: 'mana_capacity', value: 60 }
      ],
      prerequisites: ['apprentice'],
      icon: '⚔️',
      flavor: '魔法是我的利刃，意志是我的盾牌。'
    },
    {
      id: 'summoner',
      name: '召唤师',
      description: '能够召唤元素生物为你而战。',
      tier: 2,
      requirements: [
        { type: 'previous_class', target: 'apprentice' },
        { type: 'talent', target: 'wind', value: 25 }
      ],
      costs: { gold: 700, experience: 250 },
      effects: [
        { type: 'mana_capacity', value: 70 },
        { type: 'spell_power', value: 8 }
      ],
      prerequisites: ['apprentice'],
      icon: '👻'
    },
    {
      id: 'archmage',
      name: '大法师',
      description: '魔法的至高掌握者，传说中的人物。',
      tier: 4,
      secret: true,
      requirements: [
        { type: 'talent', target: 'fire', value: 70 },
        { type: 'talent', target: 'water', value: 70 },
        { type: 'talent', target: 'earth', value: 70 },
        { type: 'talent', target: 'wind', value: 70 },
        { type: 'level', value: 10 }
      ],
      costs: { gold: 5000, experience: 2000 },
      effects: [
        { type: 'spell_power', value: 50 },
        { type: 'mana_regen', value: 5 },
        { type: 'mana_capacity', value: 200 }
      ],
      prerequisites: [],
      icon: '👑',
      flavor: '真正的魔法大师不需要华丽的法袍。'
    },
    {
      id: 'void_walker',
      name: '虚空行者',
      description: '探索魔法未知领域的神秘存在。',
      tier: 4,
      secret: true,
      requirements: [
        { type: 'talent', target: 'wind', value: 65 },
        { type: 'talent', target: 'earth', value: 65 },
        { type: 'previous_class', target: 'summoner' }
      ],
      costs: { gold: 4000, experience: 1800 },
      effects: [
        { type: 'spell_power', value: 35 },
        { type: 'custom', target: 'evasion', value: 40 },
        { type: 'mana_capacity', value: 150 }
      ],
      prerequisites: ['summoner'],
      icon: '🌑',
      flavor: '在虚空中，一切皆有可能。'
    },
    {
      id: 'titan',
      name: '泰坦',
      description: '拥有巨人般力量和防御的传说职业。',
      tier: 4,
      secret: true,
      requirements: [
        { type: 'talent', target: 'fire', value: 65 },
        { type: 'talent', target: 'earth', value: 65 },
        { type: 'previous_class', target: 'earth_mage' },
        { type: 'previous_class', target: 'fire_mage' }
      ],
      costs: { gold: 4500, experience: 1900 },
      effects: [
        { type: 'spell_power', value: 25 },
        { type: 'custom', target: 'defense', value: 50 },
        { type: 'mana_capacity', value: 150 }
      ],
      prerequisites: ['earth_mage', 'fire_mage'],
      icon: '⚡',
      flavor: '大地会为你而颤抖。'
    },
    {
      id: 'shadow_mage',
      name: '暗影法师',
      description: '驾驭暗影之力的神秘法师。',
      tier: 3,
      secret: true,
      requirements: [
        { type: 'talent', target: 'wind', value: 50 },
        { type: 'talent', target: 'earth', value: 30 },
        { type: 'previous_class', target: 'wind_mage' },
        { type: 'level', value: 8 }
      ],
      costs: { gold: 2000, experience: 700 },
      effects: [
        { type: 'spell_power', value: 25 },
        { type: 'custom', target: 'evasion', value: 25 },
        { type: 'mana_regen', value: 2 }
      ],
      prerequisites: ['wind_mage'],
      icon: '🌑',
      flavor: '在阴影中，你的存在即是恐惧。'
    },
    {
      id: 'frost_mage',
      name: '冰霜法师',
      description: '将水之力量冻结成致命武器的大师。',
      tier: 3,
      element: 'water',
      requirements: [
        { type: 'talent', target: 'water', value: 55 },
        { type: 'previous_class', target: 'water_mage' }
      ],
      costs: { gold: 1600, experience: 600 },
      effects: [
        { type: 'spell_power', value: 28 },
        { type: 'mana_capacity', value: 120 },
        { type: 'skill_max', target: 'water_mastery', value: 10 }
      ],
      prerequisites: ['water_mage'],
      icon: '❄️',
      flavor: '寒冷是永生最好的朋友。'
    },
    {
      id: 'lightning_mage',
      name: '雷法师',
      description: '召唤雷电之力，速度与破坏力的化身。',
      tier: 3,
      element: 'wind',
      requirements: [
        { type: 'talent', target: 'wind', value: 55 },
        { type: 'talent', target: 'fire', value: 30 },
        { type: 'previous_class', target: 'wind_mage' }
      ],
      costs: { gold: 1700, experience: 650 },
      effects: [
        { type: 'spell_power', value: 32 },
        { type: 'custom', target: 'evasion', value: 20 },
        { type: 'mana_regen', value: 1.5 }
      ],
      prerequisites: ['wind_mage'],
      icon: '⚡',
      flavor: '快如闪电，势如破竹。'
    },
    {
      id: 'nature_druid',
      name: '自然德鲁伊',
      description: '与自然和谐共存的守护者，掌握生命的奥秘。',
      tier: 3,
      element: 'earth',
      requirements: [
        { type: 'talent', target: 'earth', value: 45 },
        { type: 'talent', target: 'water', value: 45 },
        { type: 'previous_class', target: 'earth_mage' },
        { type: 'previous_class', target: 'water_mage' }
      ],
      costs: { gold: 1800, experience: 700 },
      effects: [
        { type: 'custom', target: 'healing', value: 30 },
        { type: 'mana_capacity', value: 110 },
        { type: 'skill_max', target: 'earth_mastery', value: 5 },
        { type: 'skill_max', target: 'water_mastery', value: 5 }
      ],
      prerequisites: ['earth_mage', 'water_mage'],
      icon: '🌳',
      flavor: '森林是生命的摇篮，也是你最强大的盟友。'
    },
    {
      id: 'chaos_mage',
      name: '混沌法师',
      description: '在混乱中寻找力量的疯狂施法者。',
      tier: 4,
      secret: true,
      requirements: [
        { type: 'talent', target: 'fire', value: 60 },
        { type: 'talent', target: 'wind', value: 60 },
        { type: 'previous_class', target: 'battle_mage' },
        { type: 'level', value: 10 }
      ],
      costs: { gold: 3000, experience: 1200 },
      effects: [
        { type: 'spell_power', value: 45 },
        { type: 'mana_regen', value: 3 },
        { type: 'skill_max', target: 'fire_mastery', value: 10 },
        { type: 'skill_max', target: 'wind_mastery', value: 10 }
      ],
      prerequisites: ['battle_mage'],
      icon: '🌀',
      flavor: '混沌是唯一真实的力量。'
    },
    {
      id: 'paladin',
      name: '圣骑士',
      description: '结合魔法与正义，守护弱者的战士。',
      tier: 3,
      requirements: [
        { type: 'talent', target: 'earth', value: 40 },
        { type: 'talent', target: 'water', value: 40 },
        { type: 'previous_class', target: 'battle_mage' }
      ],
      costs: { gold: 2000, experience: 800 },
      effects: [
        { type: 'custom', target: 'defense', value: 35 },
        { type: 'custom', target: 'healing', value: 20 },
        { type: 'mana_capacity', value: 80 }
      ],
      prerequisites: ['battle_mage'],
      icon: '🛡️',
      flavor: '正义之剑，守护之光。'
    },
    {
      id: 'necromancer',
      name: '死灵法师',
      description: '驾驭死亡之力的禁忌法师。',
      tier: 4,
      secret: true,
      requirements: [
        { type: 'talent', target: 'earth', value: 55 },
        { type: 'talent', target: 'fire', value: 40 },
        { type: 'previous_class', target: 'earth_mage' },
        { type: 'previous_class', target: 'fire_mage' },
        { type: 'level', value: 12 }
      ],
      costs: { gold: 4000, experience: 1500 },
      effects: [
        { type: 'spell_power', value: 40 },
        { type: 'mana_capacity', value: 150 },
        { type: 'skill_max', target: 'earth_mastery', value: 15 }
      ],
      prerequisites: ['earth_mage', 'fire_mage'],
      icon: '💀',
      flavor: '死亡并非终结，而是新的开始。'
    },
    {
      id: 'celestial_mage',
      name: '天界法师',
      description: '来自星辰的神秘力量，掌握宇宙的奥秘。',
      tier: 5,
      secret: true,
      requirements: [
        { type: 'talent', target: 'fire', value: 80 },
        { type: 'talent', target: 'water', value: 80 },
        { type: 'talent', target: 'earth', value: 80 },
        { type: 'talent', target: 'wind', value: 80 },
        { type: 'previous_class', target: 'elementalist' },
        { type: 'level', value: 15 }
      ],
      costs: { gold: 8000, experience: 3000 },
      effects: [
        { type: 'spell_power', value: 60 },
        { type: 'mana_capacity', value: 300 },
        { type: 'mana_regen', value: 5 },
        { type: 'skill_max', target: 'fire_mastery', value: 20 },
        { type: 'skill_max', target: 'water_mastery', value: 20 },
        { type: 'skill_max', target: 'earth_mastery', value: 20 },
        { type: 'skill_max', target: 'wind_mastery', value: 20 }
      ],
      prerequisites: ['elementalist'],
      icon: '⭐',
      flavor: '星辰指引着你的道路。'
    },
    {
      id: 'demon_hunter',
      name: '恶魔猎手',
      description: '在黑暗中狩猎恶魔，以毒攻毒的战士。',
      tier: 5,
      secret: true,
      requirements: [
        { type: 'talent', target: 'wind', value: 70 },
        { type: 'talent', target: 'fire', value: 70 },
        { type: 'previous_class', target: 'shadow_mage' },
        { type: 'previous_class', target: 'battle_mage' },
        { type: 'level', value: 15 }
      ],
      costs: { gold: 7500, experience: 2800 },
      effects: [
        { type: 'spell_power', value: 55 },
        { type: 'custom', target: 'evasion', value: 40 },
        { type: 'custom', target: 'defense', value: 30 },
        { type: 'skill_max', target: 'wind_mastery', value: 15 },
        { type: 'skill_max', target: 'fire_mastery', value: 15 }
      ],
      prerequisites: ['shadow_mage', 'battle_mage'],
      icon: '🗡️',
      flavor: '只有魔鬼才能杀死魔鬼。'
    },
    {
      id: 'time_mage',
      name: '时间法师',
      description: '操控时间之流，窥见过去与未来的神秘存在。',
      tier: 5,
      secret: true,
      requirements: [
        { type: 'talent', target: 'water', value: 70 },
        { type: 'talent', target: 'wind', value: 70 },
        { type: 'previous_class', target: 'frost_mage' },
        { type: 'previous_class', target: 'lightning_mage' },
        { type: 'level', value: 15 }
      ],
      costs: { gold: 7000, experience: 2600 },
      effects: [
        { type: 'spell_power', value: 50 },
        { type: 'mana_capacity', value: 250 },
        { type: 'mana_regen', value: 4 },
        { type: 'skill_max', target: 'water_mastery', value: 15 },
        { type: 'skill_max', target: 'wind_mastery', value: 15 }
      ],
      prerequisites: ['frost_mage', 'lightning_mage'],
      icon: '⏰',
      flavor: '时间不等人，除非你是时间法师。'
    },
    {
      id: 'dragonborn',
      name: '龙裔',
      description: '拥有龙之血脉的传说战士，力量与魔法的完美结合。',
      tier: 5,
      secret: true,
      requirements: [
        { type: 'talent', target: 'fire', value: 85 },
        { type: 'talent', target: 'earth', value: 75 },
        { type: 'previous_class', target: 'pyromancer' },
        { type: 'previous_class', target: 'titan' },
        { type: 'level', value: 18 }
      ],
      costs: { gold: 10000, experience: 4000 },
      effects: [
        { type: 'spell_power', value: 70 },
        { type: 'custom', target: 'defense', value: 50 },
        { type: 'mana_capacity', value: 350 },
        { type: 'skill_max', target: 'fire_mastery', value: 30 },
        { type: 'skill_max', target: 'earth_mastery', value: 30 }
      ],
      prerequisites: ['pyromancer', 'titan'],
      icon: '🐉',
      flavor: '龙的血脉在你体内流淌。'
    },
    {
      id: 'elemental_lord',
      name: '元素领主',
      description: '掌控所有元素的至高存在，神一般的力量。',
      tier: 6,
      secret: true,
      requirements: [
        { type: 'talent', target: 'fire', value: 90 },
        { type: 'talent', target: 'water', value: 90 },
        { type: 'talent', target: 'earth', value: 90 },
        { type: 'talent', target: 'wind', value: 90 },
        { type: 'previous_class', target: 'celestial_mage' },
        { type: 'level', value: 20 }
      ],
      costs: { gold: 15000, experience: 6000 },
      effects: [
        { type: 'spell_power', value: 100 },
        { type: 'mana_capacity', value: 500 },
        { type: 'mana_regen', value: 10 },
        { type: 'skill_max', target: 'fire_mastery', value: 50 },
        { type: 'skill_max', target: 'water_mastery', value: 50 },
        { type: 'skill_max', target: 'earth_mastery', value: 50 },
        { type: 'skill_max', target: 'wind_mastery', value: 50 }
      ],
      prerequisites: ['celestial_mage'],
      icon: '👑',
      flavor: '元素在你的意志之下起舞。'
    }
  ]

  for (const def of classDefinitions) {
    const node = new ClassNode(def)
    classTree.addNode(node)
  }

  console.log('[classData] All nodes added, now adding prerequisites...')

  for (const def of classDefinitions) {
    if (def.prerequisites && def.prerequisites.length > 0) {
      for (const prereq of def.prerequisites) {
        classTree.addPrerequisite(def.id, prereq)
      }
    }
  }

  console.log('[classData] Class tree created with', classTree.nodes.size, 'nodes')
  return classTree
}
