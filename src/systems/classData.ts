import { ClassTree, ClassNode } from './class'

export function createDefaultClassTree(): ClassTree {
  const classTree = new ClassTree()

  const classDefinitions: any[] = [
    {
      id: 'apprentice',
      name: '学徒',
      description: '你刚刚踏上魔法之路，是一名著名巫师的学徒。',
      tier: 0,
      requirements: [],
      costs: { experience: 0 },
      effects: [],
      prerequisites: [],
      icon: '📖'
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
        { type: 'mana_capacity', value: 100 }
      ],
      prerequisites: ['fire_mage'],
      icon: '🌋'
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
        { type: 'skill', target: 'fire_ball', value: 5 }
      ],
      costs: { gold: 800, experience: 300 },
      effects: [
        { type: 'spell_power', value: 10 },
        { type: 'custom', target: 'defense', value: 10 },
        { type: 'mana_capacity', value: 60 }
      ],
      prerequisites: ['apprentice'],
      icon: '⚔️'
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
    }
  ]

  for (const def of classDefinitions) {
    const node = new ClassNode(def)
    classTree.addNode(node)
  }

  for (const def of classDefinitions) {
    if (def.prerequisites && def.prerequisites.length > 0) {
      for (const prereq of def.prerequisites) {
        classTree.addPrerequisite(def.id, prereq)
      }
    }
  }

  return classTree
}
