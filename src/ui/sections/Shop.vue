<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useGame } from '../../core/useGame'
import { Shop } from '../../systems/shop'
import { itemManager } from '../../systems/item'

const game = useGame()
const shops = ref<Shop[]>([])
const selectedShop = ref<Shop | null>(null)
const shopDefinitions = ref<any[]>([])
const itemDefinitions = ref<any[]>([])
const mode = ref<'buy' | 'sell'>('buy')
const selectedShopItemIndex = ref<number | null>(null)
const selectedInventorySlot = ref<number | null>(null)
const quantity = ref(1)

// Load shop definitions and item definitions
onMounted(async () => {
  try {
    const basePath = import.meta.env.BASE_URL || '/'
    const itemResponse = await fetch(`${basePath}data/items.json`)
    const itemData = await itemResponse.json()
    itemDefinitions.value = itemData.items || []

    const shopResponse = await fetch(`${basePath}data/shops.json`)
    const shopData = await shopResponse.json()
    shopDefinitions.value = shopData.shops || []
  } catch (error) {
    console.error('加载商店数据失败:', error)
  }
})

const playerGold = computed(() => {
  const resource = game.player.value.resourceManager.getResource('gold')
  return resource ? resource.value : 0
})

const inventory = computed(() => game.player.value.inventory)
const inventorySlots = computed(() => inventory.value.slots)

const shopItems = computed(() => {
  if (!selectedShop.value) return []
  return selectedShop.value.items
})

const selectedShopItem = computed(() => {
  if (selectedShopItemIndex.value === null) return null
  return shopItems.value[selectedShopItemIndex.value] || null
})

const selectedInventoryItem = computed(() => {
  if (selectedInventorySlot.value === null) return null
  const slot = inventorySlots.value[selectedInventorySlot.value]
  return slot ? slot.item : null
})

function selectShop(shop: Shop) {
  selectedShop.value = shop
  selectedShopItemIndex.value = null
}

function selectShopItem(index: number) {
  selectedShopItemIndex.value = index
}

function selectInventorySlot(index: number) {
  selectedInventorySlot.value = index
}

async function buyItem() {
  console.log('[Shop] buyItem called', selectedShop.value?.id, selectedShopItemIndex.value, quantity.value)
  if (!selectedShop.value || selectedShopItemIndex.value === null) return
  
  const shopItem = selectedShopItem.value
  if (!shopItem) return
  
  const totalPrice = shopItem.price * quantity.value
  
  // Check if player has enough gold
  if (playerGold.value < totalPrice) {
    alert('金币不足！')
    return
  }
  
  // Check if shop has enough stock
  if (!selectedShop.value.canBuy(shopItem.itemId, quantity.value)) {
    alert('库存不足！')
    return
  }
  
  // Perform purchase
  console.log('[Shop] Purchase attempt:', shopItem.itemId, quantity.value, 'totalPrice:', totalPrice, 'playerGold:', playerGold.value)
  const result = selectedShop.value.buy(shopItem.itemId, quantity.value)
  console.log('[Shop] Purchase result:', result)
  if (result.success && result.item) {
    // Deduct gold
    const goldResource = game.player.value.resourceManager.getResource('gold')
    if (goldResource) {
      goldResource.consume(totalPrice)
    }
    
    // Add item to inventory
    console.log('[Shop] Adding item to inventory:', result.item, quantity.value)
    const added = inventory.value.addItem(result.item, quantity.value)
    console.log('[Shop] Inventory add result:', added)
    if (!added) {
      alert('背包空间不足！')
      // Refund gold
      if (goldResource) {
        goldResource.add(totalPrice)
      }
      // Restore shop stock: increase stock back by quantity
      shopItem.stock += quantity.value
    } else {
      // Success feedback
      console.log('[Shop] Purchase successful, inventory slots:', inventory.value.slots.length)
      alert(`购买成功！花费 ${totalPrice} 金币`)
    }
  } else {
    console.log('[Shop] Purchase failed:', result)
    alert('购买失败：物品不存在或库存不足。')
  }
}

async function sellItem() {
  if (selectedInventorySlot.value === null) return
  
  const slot = inventorySlots.value[selectedInventorySlot.value]
  if (!slot) return
  
  const item = slot.item
  const sellQuantity = quantity.value
  
  if (sellQuantity > slot.quantity) {
    alert('数量不足！')
    return
  }
  
  if (!selectedShop.value) {
    alert('请选择商店')
    return
  }
  
  const sellPrice = selectedShop.value.sell(item, sellQuantity)
  
  // Remove item from inventory
  inventory.value.removeItemFromSlot(selectedInventorySlot.value, sellQuantity)
  
  // Add gold
  const goldResource = game.player.value.resourceManager.getResource('gold')
  if (goldResource) {
    goldResource.add(sellPrice)
  }
  
  alert(`出售成功！获得 ${sellPrice} 金币`)
}

function maxBuyableQuantity(): number {
  if (!selectedShopItem.value) return 0
  if (!selectedShop.value) return 0
  
  const shopItem = selectedShopItem.value
  const maxByStock = shopItem.stock
  const maxByGold = playerGold.value / shopItem.price
  return Math.min(maxByStock, Math.floor(maxByGold))
}

function maxSellableQuantity(): number {
  if (selectedInventorySlot.value === null) return 0
  const slot = inventorySlots.value[selectedInventorySlot.value]
  return slot ? slot.quantity : 0
}
</script>

<template>
  <div class="shop-container">
    <div class="shop-header">
      <h2>商店</h2>
      <div class="player-gold">
        金币: {{ playerGold }}
      </div>
    </div>

    <div class="shop-content">
      <div class="shop-selector">
        <h3>商店列表</h3>
        <div class="shop-list">
          <button
            v-for="shop in shops"
            :key="shop.id"
            class="shop-btn"
            :class="{ active: selectedShop?.id === shop.id }"
            @click="selectShop(shop)"
          >
            {{ shop.name }}
          </button>
        </div>
        <div class="shop-info" v-if="selectedShop">
          <h4>{{ selectedShop.name }}</h4>
          <p>{{ selectedShop.description }}</p>
          <div class="shop-stats">
            <span>价格倍数: {{ selectedShop.priceMultiplier }}x</span>
            <span>收购价: {{ selectedShop.sellMultiplier * 100 }}%</span>
            <span>刷新间隔: {{ selectedShop.refreshInterval }} 分钟</span>
          </div>
        </div>
      </div>

      <div class="shop-main">
        <div class="mode-selector">
          <button
            class="mode-btn"
            :class="{ active: mode === 'buy' }"
            @click="mode = 'buy'"
          >
            购买
          </button>
          <button
            class="mode-btn"
            :class="{ active: mode === 'sell' }"
            @click="mode = 'sell'"
          >
            出售
          </button>
        </div>

        <div class="transaction-area">
          <div class="shop-items" v-if="mode === 'buy'">
            <h3>商品列表</h3>
            <div class="item-list">
              <div
                v-for="(shopItem, index) in shopItems"
                :key="index"
                class="shop-item"
                :class="{ selected: selectedShopItemIndex === index }"
                @click="selectShopItem(index)"
              >
                <div class="item-name">{{ itemManager.getDefinition(shopItem.itemId)?.name || shopItem.itemId }}</div>
                <div class="item-price">{{ shopItem.price }} 金币</div>
                <div class="item-stock">库存: {{ shopItem.stock }} / {{ shopItem.maxStock }}</div>
              </div>
            </div>
          </div>

          <div class="inventory-items" v-if="mode === 'sell'">
            <h3>背包物品</h3>
            <div class="item-list">
              <div
                v-for="(slot, index) in inventorySlots"
                :key="index"
                class="inventory-item"
                :class="{ selected: selectedInventorySlot === index }"
                @click="selectInventorySlot(index)"
              >
                <div class="item-name">{{ slot.item.name }}</div>
                <div class="item-quantity">x{{ slot.quantity }}</div>
                <div class="item-value">价值: {{ slot.item.value }} 金币</div>
                <div class="item-sell-price">
                  出售价: {{ Math.floor(slot.item.value * (selectedShop?.sellMultiplier || 0.5)) }} 金币
                </div>
              </div>
            </div>
          </div>

          <div class="transaction-controls">
            <div class="quantity-control">
              <label>数量:</label>
              <input type="number" v-model.number="quantity" :min="1" :max="mode === 'buy' ? maxBuyableQuantity() : maxSellableQuantity()" />
              <span>最大: {{ mode === 'buy' ? maxBuyableQuantity() : maxSellableQuantity() }}</span>
            </div>
            <div class="transaction-info">
              <div v-if="mode === 'buy' && selectedShopItem">
                <div>总价: {{ selectedShopItem.price * quantity }} 金币</div>
                <button @click="buyItem" class="transaction-btn buy-btn">购买</button>
              </div>
              <div v-if="mode === 'sell' && selectedInventoryItem">
                <div>总价: {{ Math.floor(selectedInventoryItem.value * (selectedShop?.sellMultiplier || 0.5) * quantity) }} 金币</div>
                <button @click="sellItem" class="transaction-btn sell-btn">出售</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.shop-container {
  padding: 1rem;
  max-width: 1200px;
  margin: 0 auto;
}

.shop-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.player-gold {
  font-size: 1.2rem;
  font-weight: bold;
  color: #ffd700;
  background-color: #333;
  padding: 0.5rem 1rem;
  border-radius: 4px;
}

.shop-content {
  display: grid;
  grid-template-columns: 1fr 3fr;
  gap: 2rem;
}

.shop-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 1rem;
}

.shop-btn {
  padding: 0.5rem;
  border: 2px solid #ccc;
  border-radius: 4px;
  background-color: white;
  cursor: pointer;
  text-align: left;
}

.shop-btn.active {
  border-color: #007bff;
  background-color: #e7f1ff;
}

.shop-info {
  margin-top: 1rem;
  padding: 1rem;
  background-color: #f5f5f5;
  border-radius: 4px;
}

.shop-stats {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-top: 0.5rem;
  font-size: 0.9rem;
  color: #666;
}

.mode-selector {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.mode-btn {
  padding: 0.5rem 1rem;
  border: 2px solid #ccc;
  border-radius: 4px;
  background-color: white;
  cursor: pointer;
}

.mode-btn.active {
  border-color: #007bff;
  background-color: #007bff;
  color: white;
}

.transaction-area {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.item-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.5rem;
  max-height: 400px;
  overflow-y: auto;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.shop-item, .inventory-item {
  border: 2px solid #ccc;
  border-radius: 4px;
  padding: 0.5rem;
  cursor: pointer;
  background-color: white;
}

.shop-item.selected, .inventory-item.selected {
  border-color: #007bff;
  background-color: #e7f1ff;
}

.item-name {
  font-weight: bold;
  margin-bottom: 0.25rem;
}

.item-price, .item-value, .item-sell-price {
  font-size: 0.9rem;
  color: #666;
}

.item-stock, .item-quantity {
  font-size: 0.8rem;
  color: #888;
}

.transaction-controls {
  margin-top: 1rem;
  padding: 1rem;
  background-color: #f5f5f5;
  border-radius: 4px;
}

.quantity-control {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.quantity-control input {
  width: 80px;
  padding: 0.25rem;
  border: 1px solid #ccc;
  border-radius: 2px;
}

.transaction-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.transaction-btn {
  padding: 0.5rem 2rem;
  border: none;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
}

.buy-btn {
  background-color: #28a745;
  color: white;
}

.sell-btn {
  background-color: #dc3545;
  color: white;
}
</style>