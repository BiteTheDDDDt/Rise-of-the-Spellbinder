import { reactive } from 'vue'

export type Element = 'fire' | 'water' | 'earth' | 'wind'

export interface TalentData {
  fire: number
  water: number
  earth: number
  wind: number
}

export class Talent {
  data: TalentData

  constructor(initialData: Partial<TalentData> = {}) {
    this.data = reactive({
      fire: 0,
      water: 0,
      earth: 0,
      wind: 0,
      ...initialData
    })
  }

  get(element: Element): number {
    return this.data[element]
  }

  set(element: Element, value: number) {
    this.data[element] = Math.max(0, Math.min(100, value))
  }

  add(element: Element, amount: number) {
    this.set(element, this.data[element] + amount)
  }

  getLearningSpeedMultiplier(element: Element): number {
    const talent = this.data[element]
    return 1 + talent / 100
  }

  getManaCapacityMultiplier(element: Element): number {
    const talent = this.data[element]
    return 1 + talent / 200
  }

  toJSON(): TalentData {
    return { ...this.data }
  }

  static fromJSON(data: TalentData): Talent {
    return new Talent(data)
  }

  static createPreset(preset: 'fire' | 'water' | 'earth' | 'wind'): Talent {
    const presets: Record<string, TalentData> = {
      fire: { fire: 70, water: 20, earth: 25, wind: 30 },
      water: { fire: 25, water: 70, earth: 30, wind: 20 },
      earth: { fire: 20, water: 30, earth: 70, wind: 25 },
      wind: { fire: 30, water: 25, earth: 20, wind: 70 }
    }
    return new Talent(presets[preset])
  }
}