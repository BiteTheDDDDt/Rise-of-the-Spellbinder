import { reactive } from 'vue'
import { Item, type ItemType } from '../entities/item'
import { itemManager } from './item'

export interface ShopItem {
  itemId: string
  price: number
  stock: number
  maxStock: number
}

export interface ShopData {
  id: string
  name: string
  description: string
  itemTypes: ItemType[]
  priceMultiplier: number
  sellMultiplier: number
  refreshInterval: number
  lastRefresh: number
  items: ShopItem[]
}

export class Shop {
  data: ShopData

  constructor(data: Omit<ShopData, 'lastRefresh'>) {
    this.data = reactive({
      ...data,
      lastRefresh: Date.now()
    })
  }

  get id(): string {
    return this.data.id
  }

  get name(): string {
    return this.data.name
  }

  get description(): string {
    return this.data.description
  }

  get items(): ShopItem[] {
    return this.data.items
  }

  get priceMultiplier(): number {
    return this.data.priceMultiplier
  }

  get sellMultiplier(): number {
    return this.data.sellMultiplier
  }

  get refreshInterval(): number {
    return this.data.refreshInterval
  }

  get lastRefresh(): number {
    return this.data.lastRefresh
  }

  getItemPrice(itemId: string): number {
    const shopItem = this.data.items.find(item => item.itemId === itemId)
    if (!shopItem) return 0
    return shopItem.price
  }

  getItemStock(itemId: string): number {
    const shopItem = this.data.items.find(item => item.itemId === itemId)
    if (!shopItem) return 0
    return shopItem.stock
  }

  canBuy(itemId: string, quantity: number = 1): boolean {
    const shopItem = this.data.items.find(item => item.itemId === itemId)
    if (!shopItem) return false
    return shopItem.stock >= quantity
  }

  buy(itemId: string, quantity: number = 1): { success: boolean; item?: Item; price?: number } {
    const shopItem = this.data.items.find(item => item.itemId === itemId)
    if (!shopItem) {
      return { success: false }
    }

    if (shopItem.stock < quantity) {
      return { success: false }
    }

    const item = itemManager.createItem(itemId)
    if (!item) {
      return { success: false }
    }

    const totalPrice = shopItem.price * quantity
    shopItem.stock -= quantity

    return {
      success: true,
      item,
      price: totalPrice
    }
  }

  sell(item: Item, quantity: number = 1): number {
    const shopItem = this.data.items.find(si => si.itemId === item.id)
    const sellPrice = Math.floor(item.value * this.sellMultiplier * quantity)

    if (shopItem && shopItem.maxStock > 0) {
      shopItem.stock = Math.min(shopItem.stock + quantity, shopItem.maxStock)
    }

    return sellPrice
  }

  restock() {
    for (const shopItem of this.data.items) {
      shopItem.stock = shopItem.maxStock
    }
    this.data.lastRefresh = Date.now()
  }

  shouldRefresh(): boolean {
    const now = Date.now()
    const elapsed = now - this.data.lastRefresh
    return elapsed >= this.data.refreshInterval * 60000
  }

  refresh() {
    if (this.shouldRefresh()) {
      this.restock()
    }
  }

  update() {
    this.refresh()
  }

  toJSON() {
    return {
      id: this.data.id,
      lastRefresh: this.data.lastRefresh,
      items: this.data.items.map(item => ({
        itemId: item.itemId,
        stock: item.stock,
        maxStock: item.maxStock,
        price: item.price
      }))
    }
  }

  static fromJSON(data: any, shopDefinition: ShopData): Shop {
    const shop = new Shop(shopDefinition)
    shop.data.lastRefresh = data.lastRefresh || Date.now()
    
    // Update stock from saved data
    if (data.items && Array.isArray(data.items)) {
      for (const savedItem of data.items) {
        const shopItem = shop.data.items.find(item => item.itemId === savedItem.itemId)
        if (shopItem) {
          shopItem.stock = savedItem.stock
          shopItem.price = savedItem.price || shopItem.price
        }
      }
    }
    
    return shop
  }
}

export class ShopManager {
  private shops: Map<string, Shop>

  constructor() {
    this.shops = new Map()
  }

  registerShop(shop: Shop) {
    this.shops.set(shop.id, shop)
  }

  getShop(id: string): Shop | undefined {
    return this.shops.get(id)
  }

  getAllShops(): Shop[] {
    return Array.from(this.shops.values())
  }

  update() {
    for (const shop of this.shops.values()) {
      shop.update()
    }
  }

  toJSON() {
    const json: Record<string, any> = {}
    for (const [id, shop] of this.shops.entries()) {
      json[id] = shop.toJSON()
    }
    return json
  }

  static fromJSON(data: Record<string, any>, shopDefinitions: ShopData[]): ShopManager {
    const manager = new ShopManager()
    for (const def of shopDefinitions) {
      const savedData = data[def.id]
      const shop = savedData ? Shop.fromJSON(savedData, def) : new Shop(def)
      manager.registerShop(shop)
    }
    return manager
  }
}