// 高级任务监控系统
export interface TaskMonitor {
  id: string
  taskId: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  progress: number // 0-100
  stage: string
  startTime: string
  endTime?: string
  estimatedTimeRemaining?: number // 秒
  logs: TaskLog[]
  metrics: TaskMetrics
  notifications: TaskNotification[]
}

export interface TaskLog {
  id: string
  timestamp: string
  level: 'info' | 'warning' | 'error' | 'success'
  message: string
  data?: any
  source: string
}

export interface TaskMetrics {
  totalSteps: number
  completedSteps: number
  currentStep: string
  cpuUsage?: number
  memoryUsage?: number
  networkUsage?: number
  costSoFar: number
  estimatedTotalCost: number
  tokensUsed?: number
  apiCallsCount: number
}

export interface TaskNotification {
  id: string
  type: 'info' | 'warning' | 'error' | 'success'
  title: string
  message: string
  timestamp: string
  read: boolean
  actionUrl?: string
  actionText?: string
}

export interface TaskMonitorConfig {
  enableRealTimeUpdates: boolean
  updateInterval: number // 毫秒
  enableNotifications: boolean
  enableLogs: boolean
  enableMetrics: boolean
  logLevel: 'info' | 'warning' | 'error'
  maxLogEntries: number
}

class TaskMonitorService {
  private monitors: Map<string, TaskMonitor> = new Map()
  private subscribers: Map<string, Set<(monitor: TaskMonitor) => void>> = new Map()
  private config: TaskMonitorConfig
  private intervals: Map<string, NodeJS.Timeout> = new Map()

  constructor(config: Partial<TaskMonitorConfig> = {}) {
    this.config = {
      enableRealTimeUpdates: true,
      updateInterval: 1000, // 1秒
      enableNotifications: true,
      enableLogs: true,
      enableMetrics: true,
      logLevel: 'info',
      maxLogEntries: 1000,
      ...config
    }
  }

  // 创建任务监控器
  createMonitor(taskId: string): TaskMonitor {
    const monitor: TaskMonitor = {
      id: `monitor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      taskId,
      status: 'pending',
      progress: 0,
      stage: '准备中',
      startTime: new Date().toISOString(),
      logs: [],
      metrics: {
        totalSteps: 0,
        completedSteps: 0,
        currentStep: '初始化',
        costSoFar: 0,
        estimatedTotalCost: 0,
        apiCallsCount: 0
      },
      notifications: []
    }

    this.monitors.set(taskId, monitor)
    this.subscribers.set(taskId, new Set())

    // 添加初始日志
    this.addLog(taskId, 'info', '任务监控已启动', { taskId })

    return monitor
  }

  // 获取任务监控器
  getMonitor(taskId: string): TaskMonitor | undefined {
    return this.monitors.get(taskId)
  }

  // 获取所有监控器
  getAllMonitors(): TaskMonitor[] {
    return Array.from(this.monitors.values())
  }

  // 更新任务状态
  updateStatus(taskId: string, status: TaskMonitor['status'], stage?: string) {
    const monitor = this.monitors.get(taskId)
    if (!monitor) return

    const oldStatus = monitor.status
    monitor.status = status

    if (stage) {
      monitor.stage = stage
    }

    if (status === 'completed' || status === 'failed' || status === 'cancelled') {
      monitor.endTime = new Date().toISOString()
      monitor.progress = 100

      // 停止实时更新
      this.stopRealTimeUpdates(taskId)
    }

    // 添加状态变更日志
    this.addLog(taskId, 'info', `任务状态变更: ${oldStatus} → ${status}`, {
      oldStatus,
      newStatus: status,
      stage
    })

    // 发送通知
    if (this.config.enableNotifications) {
      this.addNotification(taskId, this.getStatusNotificationType(status),
        `任务${this.getStatusText(status)}`,
        `任务 "${taskId}" 已${this.getStatusText(status)}`)
    }

    this.notifySubscribers(taskId, monitor)
  }

  // 更新进度
  updateProgress(taskId: string, progress: number, stage?: string) {
    const monitor = this.monitors.get(taskId)
    if (!monitor) return

    monitor.progress = Math.max(0, Math.min(100, progress))
    if (stage) {
      monitor.stage = stage
    }

    // 更新指标
    monitor.metrics.completedSteps = Math.floor((progress / 100) * monitor.metrics.totalSteps)

    // 添加进度日志
    if (Math.floor(progress) % 10 === 0) { // 每10%记录一次
      this.addLog(taskId, 'info', `任务进度: ${Math.floor(progress)}%`, {
        progress,
        stage
      })
    }

    this.notifySubscribers(taskId, monitor)
  }

  // 更新指标
  updateMetrics(taskId: string, metrics: Partial<TaskMetrics>) {
    const monitor = this.monitors.get(taskId)
    if (!monitor) return

    monitor.metrics = { ...monitor.metrics, ...metrics }

    // 添加指标日志
    if (metrics.costSoFar !== undefined) {
      this.addLog(taskId, 'info', `当前成本: $${metrics.costSoFar.toFixed(4)}`, {
        cost: metrics.costSoFar
      })
    }

    this.notifySubscribers(taskId, monitor)
  }

  // 添加日志
  addLog(taskId: string, level: TaskLog['level'], message: string, data?: any) {
    if (!this.config.enableLogs) return

    const monitor = this.monitors.get(taskId)
    if (!monitor) return

    // 检查日志级别
    if (this.shouldLog(level)) {
      const log: TaskLog = {
        id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        level,
        message,
        data,
        source: 'task-monitor'
      }

      monitor.logs.unshift(log)

      // 限制日志数量
      if (monitor.logs.length > this.config.maxLogEntries) {
        monitor.logs = monitor.logs.slice(0, this.config.maxLogEntries)
      }

      this.notifySubscribers(taskId, monitor)
    }
  }

  // 添加通知
  addNotification(taskId: string, type: TaskNotification['type'], title: string, message: string, actionUrl?: string, actionText?: string) {
    const monitor = this.monitors.get(taskId)
    if (!monitor) return

    const notification: TaskNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      title,
      message,
      timestamp: new Date().toISOString(),
      read: false,
      actionUrl,
      actionText
    }

    monitor.notifications.unshift(notification)
    this.notifySubscribers(taskId, monitor)

    // 可以在这里添加外部通知逻辑（邮件、推送等）
    this.sendExternalNotification(notification)
  }

  // 订阅任务监控更新
  subscribe(taskId: string, callback: (monitor: TaskMonitor) => void): () => void {
    const subscribers = this.subscribers.get(taskId) || new Set()
    subscribers.add(callback)
    this.subscribers.set(taskId, subscribers)

    // 如果启用实时更新，开始轮询
    if (this.config.enableRealTimeUpdates && !this.intervals.has(taskId)) {
      this.startRealTimeUpdates(taskId)
    }

    // 返回取消订阅函数
    return () => {
      subscribers.delete(callback)
      if (subscribers.size === 0) {
        this.subscribers.delete(taskId)
        this.stopRealTimeUpdates(taskId)
      }
    }
  }

  // 开始实时更新
  private startRealTimeUpdates(taskId: string) {
    if (this.intervals.has(taskId)) return

    const interval = setInterval(() => {
      const monitor = this.monitors.get(taskId)
      if (monitor && (monitor.status === 'running' || monitor.status === 'pending')) {
        // 模拟进度更新（实际应该从任务系统获取）
        this.simulateProgressUpdate(taskId)
      }
    }, this.config.updateInterval)

    this.intervals.set(taskId, interval)
  }

  // 停止实时更新
  private stopRealTimeUpdates(taskId: string) {
    const interval = this.intervals.get(taskId)
    if (interval) {
      clearInterval(interval)
      this.intervals.delete(taskId)
    }
  }

  // 模拟进度更新（用于演示）
  private simulateProgressUpdate(taskId: string) {
    const monitor = this.monitors.get(taskId)
    if (!monitor || monitor.status !== 'running') return

    // 模拟进度增长
    const progressIncrement = Math.random() * 5
    const newProgress = Math.min(100, monitor.progress + progressIncrement)

    if (newProgress !== monitor.progress) {
      this.updateProgress(taskId, newProgress)
    }

    // 模拟指标更新
    if (Math.random() > 0.7) { // 30% 概率更新指标
      const costIncrement = Math.random() * 0.01
      this.updateMetrics(taskId, {
        costSoFar: monitor.metrics.costSoFar + costIncrement,
        apiCallsCount: monitor.metrics.apiCallsCount + 1
      })
    }
  }

  // 通知订阅者
  private notifySubscribers(taskId: string, monitor: TaskMonitor) {
    const subscribers = this.subscribers.get(taskId)
    if (subscribers) {
      subscribers.forEach(callback => {
        try {
          callback(monitor)
        } catch (error) {
          console.error('Error in task monitor subscriber:', error)
        }
      })
    }
  }

  // 检查是否应该记录日志
  private shouldLog(level: TaskLog['level']): boolean {
    const levels = ['error', 'warning', 'info']
    const configLevelIndex = levels.indexOf(this.config.logLevel)
    const logLevelIndex = levels.indexOf(level)
    return logLevelIndex <= configLevelIndex
  }

  // 获取状态通知类型
  private getStatusNotificationType(status: TaskMonitor['status']): TaskNotification['type'] {
    switch (status) {
      case 'completed':
        return 'success'
      case 'failed':
      case 'cancelled':
        return 'error'
      default:
        return 'info'
    }
  }

  // 获取状态文本
  private getStatusText(status: TaskMonitor['status']): string {
    const statusMap = {
      'pending': '等待中',
      'running': '运行中',
      'completed': '完成',
      'failed': '失败',
      'cancelled': '已取消'
    }
    return statusMap[status] || status
  }

  // 发送外部通知（可扩展）
  private sendExternalNotification(notification: TaskNotification) {
    // 这里可以集成邮件、短信、推送通知等服务
    console.log('External notification:', notification)
  }

  // 清理监控器
  cleanup(taskId: string) {
    this.stopRealTimeUpdates(taskId)
    this.monitors.delete(taskId)
    this.subscribers.delete(taskId)
  }

  // 获取统计信息
  getStats() {
    const monitors = Array.from(this.monitors.values())

    return {
      total: monitors.length,
      pending: monitors.filter(m => m.status === 'pending').length,
      running: monitors.filter(m => m.status === 'running').length,
      completed: monitors.filter(m => m.status === 'completed').length,
      failed: monitors.filter(m => m.status === 'failed').length,
      cancelled: monitors.filter(m => m.status === 'cancelled').length,
      averageProgress: monitors.reduce((sum, m) => sum + m.progress, 0) / monitors.length || 0,
      totalCost: monitors.reduce((sum, m) => sum + m.metrics.costSoFar, 0)
    }
  }
}

// 创建全局任务监控服务实例
export const taskMonitorService = new TaskMonitorService()

// 导出类型和服务
export default TaskMonitorService