import { reactive } from 'vue'

export type ResourceId = 'gold' | 'research' | 'mana_fire' | 'mana_water' | 'mana_earth' | 'mana_wind'

export interface ResourceData {
  id: ResourceId
  name: string
  value: number
  max: number
  ratePerSecond: number
}

export class Resource {
  data: ResourceData

  constructor(id: ResourceId, name: string, initialValue: number = 0, max: number = Infinity, ratePerSecond: number = 0) {
    this.data = reactive({
      id,
      name,
      value: initialValue,
      max,
      ratePerSecond
    })
  }

  get value(): number {
    return this.data.value
  }

  get max(): number {
    return this.data.max
  }

  get ratePerSecond(): number {
    return this.data.ratePerSecond
  }

  get percent(): number {
    return this.max === Infinity ? 100 : (this.value / this.max) * 100
  }

  add(amount: number): number {
    const newValue = Math.min(this.data.value + amount, this.data.max)
    const actualAdded = newValue - this.data.value
    this.data.value = newValue
    return actualAdded
  }

  consume(amount: number): boolean {
    if (this.data.value < amount) {
      return false
    }
    this.data.value -= amount
    return true
  }

  setMax(max: number) {
    this.data.max = max
    if (this.data.value > max) {
      this.data.value = max
    }
  }

  setRatePerSecond(rate: number) {
    this.data.ratePerSecond = rate
  }

  update(deltaSeconds: number) {
    if (this.data.ratePerSecond !== 0) {
      const gain = this.data.ratePerSecond * deltaSeconds
      this.add(gain)
    }
  }

  toJSON() {
    return {
      id: this.data.id,
      value: this.data.value,
      max: this.data.max,
      ratePerSecond: this.data.ratePerSecond
    }
  }

  static fromJSON(data: any): Resource {
    const resource = new Resource(data.id, data.name || data.id, data.value, data.max, data.ratePerSecond)
    return resource
  }
}

export class ResourceManager {
  resources: Map<ResourceId, Resource>

  constructor() {
    this.resources = new Map()
  }

  addResource(resource: Resource) {
    this.resources.set(resource.data.id, resource)
  }

  getResource(id: ResourceId): Resource | undefined {
    return this.resources.get(id)
  }

  update(deltaSeconds: number) {
    for (const resource of this.resources.values()) {
      resource.update(deltaSeconds)
    }
  }

  toJSON() {
    const json: Record<string, any> = {}
    for (const [id, resource] of this.resources.entries()) {
      json[id] = resource.toJSON()
    }
    return json
  }

  static fromJSON(data: Record<string, any>): ResourceManager {
    const manager = new ResourceManager()
    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        const resData = data[key]
        const resource = Resource.fromJSON({ ...resData, id: key })
        manager.addResource(resource)
      }
    }
    return manager
  }

  static createDefault(): ResourceManager {
    const manager = new ResourceManager()
    manager.addResource(new Resource('gold', 'Gold', 100, Infinity, 0))
    manager.addResource(new Resource('research', 'Research', 0, Infinity, 0))
    manager.addResource(new Resource('mana_fire', 'Fire Mana', 0, 100, 0))
    manager.addResource(new Resource('mana_water', 'Water Mana', 0, 100, 0))
    manager.addResource(new Resource('mana_earth', 'Earth Mana', 0, 100, 0))
    manager.addResource(new Resource('mana_wind', 'Wind Mana', 0, 100, 0))
    return manager
  }
}