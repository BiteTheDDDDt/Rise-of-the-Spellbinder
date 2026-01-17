import { reactive } from 'vue'

export type LogType = 'info' | 'success' | 'warning' | 'error'

export interface LogEntry {
  id: number
  timestamp: number
  type: LogType
  message: string
  details?: any
}

export interface LogOptions {
  maxEntries?: number
  persist?: boolean
}

export class LogSystem {
  private entries: LogEntry[] = reactive([])
  private nextId = 1
  private maxEntries: number
  private listeners: Array<(entry: LogEntry) => void> = []

  constructor(options: LogOptions = {}) {
    this.maxEntries = options.maxEntries || 100
  }

  log(type: LogType, message: string, details?: any) {
    const entry: LogEntry = {
      id: this.nextId++,
      timestamp: Date.now(),
      type,
      message,
      details
    }

    this.entries.unshift(entry) // 最新日志在前面
    if (this.entries.length > this.maxEntries) {
      this.entries.pop()
    }

    // 通知监听器
    this.listeners.forEach(listener => listener(entry))

    // 控制台输出（开发模式）
    if (import.meta.env.DEV) {
      const colors: Record<LogType, string> = {
        info: '#2196F3',
        success: '#4CAF50',
        warning: '#FF9800',
        error: '#F44336'
      }
      console.log(`%c[${type.toUpperCase()}] %c${message}`, `color: ${colors[type]}; font-weight: bold`, 'color: inherit', details || '')
    }

    return entry
  }

  info(message: string, details?: any) {
    return this.log('info', message, details)
  }

  success(message: string, details?: any) {
    return this.log('success', message, details)
  }

  warning(message: string, details?: any) {
    return this.log('warning', message, details)
  }

  error(message: string, details?: any) {
    return this.log('error', message, details)
  }

  getEntries(limit?: number): LogEntry[] {
    if (limit && limit > 0) {
      return this.entries.slice(0, limit)
    }
    return [...this.entries]
  }

  clear() {
    this.entries.length = 0
  }

  subscribe(listener: (entry: LogEntry) => void) {
    this.listeners.push(listener)
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index > -1) this.listeners.splice(index, 1)
    }
  }

  getRecent(limit: number = 10): LogEntry[] {
    return this.getEntries(limit)
  }

  formatTime(timestamp: number): string {
    const date = new Date(timestamp)
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`
  }
}

// 全局日志实例
export const logSystem = new LogSystem({
  maxEntries: 200,
  persist: false
})