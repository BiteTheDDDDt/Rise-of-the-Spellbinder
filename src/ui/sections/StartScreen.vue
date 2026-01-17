<script setup lang="ts">
import { computed } from 'vue'
import { saveSystem } from '../../core'

const emit = defineEmits<{
  startNewGame: []
  continueGame: []
}>()

const hasSave = computed(() => saveSystem.hasSave())

function handleNewGame() {
  emit('startNewGame')
}

function handleContinue() {
  if (hasSave.value) {
    if (saveSystem.loadFromLocalStorage()) {
      emit('continueGame')
    }
  }
}

function handleImport(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return

  const file = input.files[0] as File
  const reader = new FileReader()
  reader.onload = (e) => {
    const result = e.target?.result as string
    if (saveSystem.importSave(result)) {
      alert('存档导入成功！')
      emit('continueGame')
    } else {
      alert('导入存档失败')
    }
  }
  reader.readAsText(file)
  input.value = ''
}
</script>

<template>
  <div class="start-screen">
    <!-- 背景装饰 -->
    <div class="background">
      <div class="magic-circle"></div>
      <div class="particles">
        <div class="particle" v-for="i in 20" :key="i"></div>
      </div>
    </div>

    <!-- 主内容 -->
    <div class="main-content">
      <!-- 标题区 -->
      <div class="title-section">
        <h1 class="game-title">
          <span class="title-icon">🧙</span>
          Rise of the Spellbinder
        </h1>
        <p class="game-subtitle">成为终极法术大师的旅程</p>
        <div class="title-decoration">
          <span class="decoration-icon">✨</span>
          <span class="decoration-icon">🔥</span>
          <span class="decoration-icon">💧</span>
          <span class="decoration-icon">⛰️</span>
          <span class="decoration-icon">🌪️</span>
        </div>
      </div>

      <!-- 游戏简介 -->
      <div class="description-section">
        <div class="description-card">
          <h2>游戏简介</h2>
          <p>
            在这个魔法世界中，你将扮演一位初出茅庐的法师，通过学习和掌握四大元素（火、水、土、风）的法术，不断提升自己的技能，最终成为传奇的法术大师。
          </p>
          <div class="features">
            <div class="feature">
              <span class="feature-icon">🎮</span>
              <div class="feature-text">
                <strong>丰富的法术系统</strong>
                <span>学习并掌握超过50种独特法术</span>
              </div>
            </div>
            <div class="feature">
              <span class="feature-icon">📈</span>
              <div class="feature-text">
                <strong>深度角色成长</strong>
                <span>通过天赋系统和技能升级定制你的法师</span>
              </div>
            </div>
            <div class="feature">
              <span class="feature-icon">⚡</span>
              <div class="feature-text">
                <strong>动态活动系统</strong>
                <span>参与冥想、练习、研究等多种活动</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 按钮区 -->
      <div class="buttons-section">
        <button @click="handleNewGame" class="btn new-game-btn">
          <span class="btn-icon">🆕</span>
          <span class="btn-text">新游戏</span>
          <span class="btn-desc">创建全新的角色开始冒险</span>
        </button>

        <button 
          @click="handleContinue" 
          class="btn continue-btn"
          :disabled="!hasSave"
        >
          <span class="btn-icon">▶️</span>
          <span class="btn-text">继续游戏</span>
          <span class="btn-desc" v-if="hasSave">从上次保存的位置继续</span>
          <span class="btn-desc" v-else>没有找到存档</span>
        </button>

        <label class="btn import-btn">
          <span class="btn-icon">📥</span>
          <span class="btn-text">导入存档</span>
          <span class="btn-desc">从文件加载游戏进度</span>
          <input type="file" accept=".json" @change="handleImport" hidden />
        </label>
      </div>

      <!-- 版本信息 -->
      <div class="footer">
        <div class="version">v1.0.0</div>
        <div class="hint">游戏进度会自动保存到本地浏览器</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.start-screen {
  min-height: 100vh;
  background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%);
  color: #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  position: relative;
  overflow: hidden;
}

.background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 0;
}

.magic-circle {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 600px;
  height: 600px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(59, 0, 179, 0.1) 0%, transparent 70%);
  opacity: 0.5;
}

.particles {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.particle {
  position: absolute;
  width: 4px;
  height: 4px;
  background: #bb86fc;
  border-radius: 50%;
  animation: float 10s infinite linear;
}

@keyframes float {
  0% { transform: translateY(0) translateX(0); opacity: 0; }
  50% { opacity: 0.8; }
  100% { transform: translateY(-100vh) translateX(100px); opacity: 0; }
}

.main-content {
  position: relative;
  z-index: 1;
  max-width: 800px;
  width: 100%;
  text-align: center;
}

.title-section {
  margin-bottom: 50px;
  animation: fadeInDown 1s ease;
}

@keyframes fadeInDown {
  from { opacity: 0; transform: translateY(-30px); }
  to { opacity: 1; transform: translateY(0); }
}

.game-title {
  font-size: 3.5rem;
  color: #bb86fc;
  margin: 0 0 10px 0;
  text-shadow: 0 0 20px rgba(187, 134, 252, 0.5);
  font-weight: 800;
  letter-spacing: 2px;
}

.title-icon {
  display: inline-block;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

.game-subtitle {
  font-size: 1.5rem;
  color: #03dac6;
  margin: 0 0 30px 0;
  opacity: 0.9;
}

.title-decoration {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 20px;
}

.decoration-icon {
  font-size: 2rem;
  animation: bounce 2s infinite;
  opacity: 0.7;
}

.decoration-icon:nth-child(2) { animation-delay: 0.2s; }
.decoration-icon:nth-child(3) { animation-delay: 0.4s; }
.decoration-icon:nth-child(4) { animation-delay: 0.6s; }
.decoration-icon:nth-child(5) { animation-delay: 0.8s; }

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.description-section {
  margin-bottom: 50px;
  animation: fadeInUp 1s ease 0.3s both;
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}

.description-card {
  background: rgba(30, 30, 30, 0.8);
  border-radius: 20px;
  padding: 30px;
  border: 1px solid rgba(187, 134, 252, 0.3);
  backdrop-filter: blur(10px);
  text-align: left;
}

.description-card h2 {
  color: #03dac6;
  margin: 0 0 15px 0;
  font-size: 1.8rem;
}

.description-card p {
  color: #aaa;
  line-height: 1.6;
  margin-bottom: 25px;
  font-size: 1.1rem;
}

.features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.feature {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px;
  background: rgba(55, 0, 179, 0.1);
  border-radius: 10px;
  border: 1px solid rgba(187, 134, 252, 0.2);
}

.feature-icon {
  font-size: 2rem;
}

.feature-text {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.feature-text strong {
  color: #fff;
  font-size: 1rem;
}

.feature-text span {
  color: #888;
  font-size: 0.9rem;
}

.buttons-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 500px;
  margin: 0 auto 40px;
  animation: fadeInUp 1s ease 0.6s both;
}

.btn {
  padding: 25px;
  border: none;
  border-radius: 15px;
  font-size: 1.2rem;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  background: rgba(30, 30, 30, 0.9);
  border: 2px solid transparent;
  color: white;
  position: relative;
  overflow: hidden;
}

.btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
  transition: left 0.5s;
}

.btn:hover::before {
  left: 100%;
}

.btn:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.btn:disabled:hover::before {
  left: -100%;
}

.new-game-btn {
  border-color: #4caf50;
}

.new-game-btn:hover {
  border-color: #45a049;
  background: rgba(76, 175, 80, 0.1);
}

.continue-btn {
  border-color: #2196f3;
}

.continue-btn:hover:not(:disabled) {
  border-color: #1976d2;
  background: rgba(33, 150, 243, 0.1);
}

.import-btn {
  border-color: #ff9800;
  cursor: pointer;
}

.import-btn:hover {
  border-color: #f57c00;
  background: rgba(255, 152, 0, 0.1);
}

.btn-icon {
  font-size: 2.5rem;
  margin-bottom: 5px;
}

.btn-text {
  font-weight: bold;
  font-size: 1.4rem;
}

.btn-desc {
  font-size: 0.9rem;
  color: #aaa;
  font-weight: normal;
}

.footer {
  color: #666;
  font-size: 0.9rem;
  animation: fadeIn 1s ease 0.9s both;
}

.version {
  margin-bottom: 10px;
  font-family: monospace;
}

.hint {
  opacity: 0.7;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .game-title {
    font-size: 2.5rem;
  }
  
  .game-subtitle {
    font-size: 1.2rem;
  }
  
  .description-card {
    padding: 20px;
  }
  
  .features {
    grid-template-columns: 1fr;
  }
  
  .btn {
    padding: 20px;
  }
}
</style>