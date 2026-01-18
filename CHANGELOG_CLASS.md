# 职业系统更新日志

## 版本 1.0.0 - 初始发布

### 新增功能

#### 1. 完整的职业树系统
- 创建了基于tier分层（0-6层）的职业树结构
- 实现了多分支进阶路线：
  - 元素路线：火、水、土、风四大元素
  - 战斗路线：战斗法师 → 混沌法师/圣骑士
  - 召唤路线：召唤师 → 元素使
  - 传说路线：多种隐藏职业

#### 2. 职业节点系统
- 每个职业包含：
  - 基础信息：名称、描述、图标
  - 元素属性：关联特定元素（火、水、土、风）
  - 解锁要求：天赋、技能、等级、前置职业
  - 消耗资源：金币、经验、研究
  - 职业效果：法术强度、法力容量、技能解锁等
  - 风味文本：增加角色扮演体验

#### 3. 职业效果系统
实现了多种职业效果类型：
- `spell_power`: 法术强度加成
- `mana_capacity`: 法力容量提升
- `mana_regen`: 法力恢复加成
- `skill_unlock`: 解锁特定技能
- `skill_max`: 提升技能上限
- `custom`: 自定义属性加成（防御、闪避、治疗等）

#### 4. 可视化职业树界面
- **Canvas/SVG渲染**: 使用SVG绘制连接线，HTML渲染节点
- **交互功能**:
  - 拖拽平移
  - 滚轮缩放（0.5x - 2x）
  - 点击选择查看详情
- **状态可视化**:
  - 锁定（灰色）
  - 可解锁（绿色边框）
  - 已解锁（绿色背景）
  - 隐藏职业（橙色，满足前置才显示）
- **自动布局**: 按tier自动排列职业节点

#### 5. 职业详情面板
显示职业的完整信息：
- 职业名称和描述
- 解锁条件列表
- 消耗资源（带不足提示）
- 职业效果详情
- 解锁按钮
- 当前职业效果汇总

#### 6. 玩家集成
- 在Player类中集成ClassManager
- 自动应用职业效果（每次update）
- 自动解锁技能
- 自动应用技能上限加成
- 存档支持：保存/加载职业进度

### 职业列表

#### Tier 0
- 学徒 (Apprentice)

#### Tier 1
- 火焰信徒 (Fire Acolyte)
- 水之信徒 (Water Acolyte)
- 大地信徒 (Earth Acolyte)
- 风之信徒 (Wind Acolyte)
- 召唤师 (Summoner)
- 元素使 (Elementalist)

#### Tier 2
- 火焰法师 (Fire Mage)
- 水系法师 (Water Mage)
- 大地法师 (Earth Mage)
- 风系法师 (Wind Mage)
- 战斗法师 (Battle Mage)
- 魔术师 (Magician)
- 奥术骗子 (Trickster)
- 守护者 (Warden)
- 神谕者 (Oracle)
- 预言者 (Seer)
- 法师 (Mage)
- 召唤师 (Conjurer)

#### Tier 3
- 火焰术士 (Pyromancer)
- 水术士 (Hydromancer)
- 地术师 (Geomancer)
- 风术师 (Aeromancer)
- 冰霜法师 (Frost Mage)
- 雷法师 (Lightning Mage)
- 自然德鲁伊 (Nature Druid)
- 圣骑士 (Paladin)
- 血法师 (Blood Mage)
- 高级元素使 (High Elemental)
- 术士 (Sorcerer)
- 德鲁伊 (Druid)

#### Tier 4
- 大法师 (Archmage) - 隐藏
- 虚空行者 (Void Walker) - 隐藏
- 泰坦 (Titan) - 隐藏
- 暗影法师 (Shadow Mage) - 隐藏
- 混沌法师 (Chaos Mage) - 隐藏
- 死灵法师 (Necromancer) - 隐藏
- 小丑 (Jester) - 隐藏
- 震地者 (Earth Shaker)
- 巫师 (Wizard)
- 高级法师 (High Mage)

#### Tier 5
- 天界法师 (Celestial Mage) - 隐藏
- 恶魔猎手 (Demon Hunter) - 隐藏
- 时间法师 (Time Mage) - 隐藏
- 龙裔 (Dragonborn) - 隐藏
- 凯尔 (Kell)
- 异端领袖 (Heresiarch)
- 德鲁尼克法师 (Wizard2)

#### Tier 6
- 元素领主 (Elemental Lord) - 隐藏
- 神话法师 (Mythical Wizard)
- 星界预言者 (Astral Seer)
- 化身 (C Avatar)

### 技术实现

#### 新增文件
1. `src/systems/class.ts` - 职业系统核心逻辑
   - ClassNode: 职业节点
   - ClassTree: 职业树结构
   - ClassManager: 职业管理器
   - 相关类型定义

2. `src/systems/classData.ts` - 职业数据定义
   - createDefaultClassTree(): 创建默认职业树
   - 包含所有职业定义

3. `src/ui/sections/ClassTree.vue` - 职业树可视化界面
   - 节点渲染
   - 连接线绘制
   - 交互处理
   - 详情显示

4. `CLASS_SYSTEM.md` - 职业系统文档

#### 修改文件
1. `src/entities/player.ts`
   - 添加ClassManager
   - 实现applyClassEffects方法
   - 集成职业效果应用

2. `src/App.vue`
   - 引入ClassTree组件
   - 更新职业菜单使用新组件

### 设计参考

参考arcanum项目的职业系统设计：
- 职业tier分层结构
- 多样化的职业分支
- 隐藏职业机制
- 技能和天赋要求
- 职业效果mod系统

### 使用方法

#### 玩家操作
1. 点击游戏主菜单的"职业"按钮
2. 浏览职业树，查看可解锁的职业
3. 点击职业节点查看详细要求
4. 满足条件后点击"解锁职业"
5. 解锁后立即获得职业效果

#### 开发者使用
```typescript
// 职业管理器
const classManager = player.classManager

// 检查能否解锁
const canUnlock = classManager.canUnlockClass(
  'fire_mage',
  player.talent.talents,
  player.skillManager.skills,
  player.level,
  player.gold
)

// 解锁职业
classManager.unlockClass(
  'fire_mage',
  player.talent.talents,
  player.skillManager.skills,
  player.level,
  player.gold
)

// 获取职业效果
const effects = classManager.getClassEffects()

// 获取技能上限加成
const bonuses = classManager.getSkillMaxBonuses()

// 获取解锁的技能
const skills = classManager.getUnlockedSkills()
```

### 未来计划

#### 短期
- [ ] 添加更多职业
- [ ] 实现职业专精系统
- [ ] 添加职业成就
- [ ] 优化职业树布局算法

#### 中期
- [ ] 职业任务系统
- [ ] 职业特有技能
- [ ] 职业切换机制
- [ ] 职业加成预览

#### 长期
- [ ] 多职业系统（同时激活多个职业）
- [ ] 职业进化系统
- [ ] 职业天赋树
- [ ] 动态职业平衡调整

### 已知问题
- 无

### 测试
- ✅ 职业树渲染
- ✅ 节点连接线
- ✅ 拖拽和缩放
- ✅ 职业解锁
- ✅ 效果应用
- ✅ 存档和加载
- ✅ 隐藏职业显示逻辑
