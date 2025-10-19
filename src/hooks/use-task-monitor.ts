import { useState, useEffect, useCallback, useRef } from 'react'
import { TaskMonitor, TaskLog, TaskNotification, taskMonitorService } from '@/lib/task-monitor'

// 任务监控 Hook
export function useTaskMonitor(taskId: string, options: {
  autoStart?: boolean
  updateInterval?: number
} = {}) {
  const [monitor, setMonitor] = useState<TaskMonitor | undefined>(() => {
    return taskMonitorService.getMonitor(taskId)
  })
  const [isConnected, setIsConnected] = useState(false)
  const unsubscribeRef = useRef<(() => void) | null>(null)

  // 创建或获取监控器
  useEffect(() => {
    if (!taskId) return

    let currentMonitor = taskMonitorService.getMonitor(taskId)
    if (!currentMonitor && options.autoStart) {
      currentMonitor = taskMonitorService.createMonitor(taskId)
    }

    setMonitor(currentMonitor)
    setIsConnected(true)

    // 订阅监控更新
    const unsubscribe = taskMonitorService.subscribe(taskId, (updatedMonitor) => {
      setMonitor(updatedMonitor)
    })

    unsubscribeRef.current = unsubscribe

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
      }
    }
  }, [taskId, options.autoStart])

  // 手动更新状态
  const updateStatus = useCallback((status: TaskMonitor['status'], stage?: string) => {
    if (taskId) {
      taskMonitorService.updateStatus(taskId, status, stage)
    }
  }, [taskId])

  // 手动更新进度
  const updateProgress = useCallback((progress: number, stage?: string) => {
    if (taskId) {
      taskMonitorService.updateProgress(taskId, progress, stage)
    }
  }, [taskId])

  // 添加日志
  const addLog = useCallback((level: TaskLog['level'], message: string, data?: any) => {
    if (taskId) {
      taskMonitorService.addLog(taskId, level, message, data)
    }
  }, [taskId])

  // 添加通知
  const addNotification = useCallback((
    type: TaskNotification['type'],
    title: string,
    message: string,
    actionUrl?: string,
    actionText?: string
  ) => {
    if (taskId) {
      taskMonitorService.addNotification(taskId, type, title, message, actionUrl, actionText)
    }
  }, [taskId])

  // 标记通知为已读
  const markNotificationAsRead = useCallback((notificationId: string) => {
    if (monitor) {
      const notification = monitor.notifications.find(n => n.id === notificationId)
      if (notification) {
        notification.read = true
        setMonitor({ ...monitor })
      }
    }
  }, [monitor])

  // 标记所有通知为已读
  const markAllNotificationsAsRead = useCallback(() => {
    if (monitor) {
      monitor.notifications.forEach(n => n.read = true)
      setMonitor({ ...monitor })
    }
  }, [monitor])

  // 清理监控器
  const cleanup = useCallback(() => {
    if (taskId) {
      taskMonitorService.cleanup(taskId)
    }
  }, [taskId])

  return {
    monitor,
    isConnected,
    updateStatus,
    updateProgress,
    addLog,
    addNotification,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    cleanup
  }
}

// 全局任务监控统计 Hook
export function useTaskMonitorStats() {
  const [stats, setStats] = useState(() => taskMonitorService.getStats())

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(taskMonitorService.getStats())
    }, 5000) // 每5秒更新一次统计

    return () => clearInterval(interval)
  }, [])

  return stats
}

// 任务日志 Hook
export function useTaskLogs(taskId: string, options: {
  level?: TaskLog['level']
  limit?: number
  autoRefresh?: boolean
} = {}) {
  const [logs, setLogs] = useState<TaskLog[]>([])
  const { monitor } = useTaskMonitor(taskId)

  useEffect(() => {
    if (!monitor) return

    let filteredLogs = monitor.logs

    // 按级别过滤
    if (options.level) {
      filteredLogs = filteredLogs.filter(log => log.level === options.level)
    }

    // 限制数量
    if (options.limit) {
      filteredLogs = filteredLogs.slice(0, options.limit)
    }

    setLogs(filteredLogs)
  }, [monitor, options.level, options.limit])

  return logs
}

// 任务通知 Hook
export function useTaskNotifications(taskId?: string, options: {
  unreadOnly?: boolean
  type?: TaskNotification['type']
} = {}) {
  const [notifications, setNotifications] = useState<TaskNotification[]>([])

  useEffect(() => {
    const updateNotifications = () => {
      let allNotifications: TaskNotification[] = []

      if (taskId) {
        const monitor = taskMonitorService.getMonitor(taskId)
        if (monitor) {
          allNotifications = monitor.notifications
        }
      } else {
        // 获取所有通知
        allNotifications = taskMonitorService.getAllMonitors()
          .flatMap(monitor => monitor.notifications)
      }

      // 按类型过滤
      if (options.type) {
        allNotifications = allNotifications.filter(n => n.type === options.type)
      }

      // 只显示未读
      if (options.unreadOnly) {
        allNotifications = allNotifications.filter(n => !n.read)
      }

      // 按时间排序
      allNotifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

      setNotifications(allNotifications)
    }

    updateNotifications()

    const interval = setInterval(updateNotifications, 2000) // 每2秒更新一次
    return () => clearInterval(interval)
  }, [taskId, options.type, options.unreadOnly])

  const markAsRead = useCallback((notificationId: string) => {
    // 查找包含该通知的监控器
    const monitors = taskMonitorService.getAllMonitors()
    for (const monitor of monitors) {
      const notification = monitor.notifications.find(n => n.id === notificationId)
      if (notification) {
        notification.read = true
        break
      }
    }
  }, [])

  const markAllAsRead = useCallback(() => {
    const monitors = taskMonitorService.getAllMonitors()
    monitors.forEach(monitor => {
      monitor.notifications.forEach(n => n.read = true)
    })
  }, [])

  return {
    notifications,
    unreadCount: notifications.filter(n => !n.read).length,
    markAsRead,
    markAllAsRead
  }
}

// 实时任务进度 Hook
export function useRealTimeTaskProgress(taskId: string, options: {
  onProgressChange?: (progress: number) => void
  onStatusChange?: (status: TaskMonitor['status']) => void
  onComplete?: () => void
  onError?: (error: string) => void
} = {}) {
  const { monitor } = useTaskMonitor(taskId)
  const previousProgress = useRef(0)
  const previousStatus = useRef<TaskMonitor['status'] | undefined>()

  useEffect(() => {
    if (!monitor) return

    // 检测进度变化
    if (Math.abs(monitor.progress - previousProgress.current) > 0.1) {
      previousProgress.current = monitor.progress
      options.onProgressChange?.(monitor.progress)
    }

    // 检测状态变化
    if (monitor.status !== previousStatus.current) {
      const oldStatus = previousStatus.current
      previousStatus.current = monitor.status

      options.onStatusChange?.(monitor.status)

      // 处理特定状态
      if (monitor.status === 'completed') {
        options.onComplete?.()
      } else if (monitor.status === 'failed') {
        options.onError?.(monitor.logs[0]?.message || '任务失败')
      }
    }
  }, [monitor, options])

  return {
    progress: monitor?.progress || 0,
    status: monitor?.status || 'pending',
    stage: monitor?.stage || '',
    isRunning: monitor?.status === 'running',
    isCompleted: monitor?.status === 'completed',
    isFailed: monitor?.status === 'failed',
    metrics: monitor?.metrics
  }
}

// 任务监控工具函数
export const taskMonitorUtils = {
  // 格式化进度
  formatProgress: (progress: number): string => {
    return `${Math.round(progress)}%`
  },

  // 获取进度条颜色
  getProgressColor: (progress: number): string => {
    if (progress < 30) return 'bg-red-500'
    if (progress < 70) return 'bg-yellow-500'
    return 'bg-green-500'
  },

  // 格式化时间
  formatDuration: (startTime: string, endTime?: string): string => {
    const start = new Date(startTime)
    const end = endTime ? new Date(endTime) : new Date()
    const duration = Math.floor((end.getTime() - start.getTime()) / 1000)

    if (duration < 60) {
      return `${duration}秒`
    } else if (duration < 3600) {
      const minutes = Math.floor(duration / 60)
      const seconds = duration % 60
      return `${minutes}分${seconds}秒`
    } else {
      const hours = Math.floor(duration / 3600)
      const minutes = Math.floor((duration % 3600) / 60)
      return `${hours}小时${minutes}分`
    }
  },

  // 获取日志级别颜色
  getLogLevelColor: (level: TaskLog['level']): string => {
    const colorMap = {
      'info': 'text-blue-600',
      'warning': 'text-yellow-600',
      'error': 'text-red-600',
      'success': 'text-green-600'
    }
    return colorMap[level] || 'text-gray-600'
  },

  // 获取日志级别图标
  getLogLevelIcon: (level: TaskLog['level']): string => {
    const iconMap = {
      'info': 'ℹ️',
      'warning': '⚠️',
      'error': '❌',
      'success': '✅'
    }
    return iconMap[level] || 'ℹ️'
  },

  // 获取通知类型颜色
  getNotificationColor: (type: TaskNotification['type']): string => {
    const colorMap = {
      'info': 'border-blue-200 bg-blue-50',
      'warning': 'border-yellow-200 bg-yellow-50',
      'error': 'border-red-200 bg-red-50',
      'success': 'border-green-200 bg-green-50'
    }
    return colorMap[type] || 'border-gray-200 bg-gray-50'
  },

  // 获取状态文本
  getStatusText: (status: TaskMonitor['status']): string => {
    const statusMap = {
      'pending': '等待中',
      'running': '运行中',
      'completed': '已完成',
      'failed': '失败',
      'cancelled': '已取消'
    }
    return statusMap[status] || status
  },

  // 获取状态颜色
  getStatusColor: (status: TaskMonitor['status']): string => {
    const colorMap = {
      'pending': 'text-gray-600 bg-gray-50',
      'running': 'text-blue-600 bg-blue-50',
      'completed': 'text-green-600 bg-green-50',
      'failed': 'text-red-600 bg-red-50',
      'cancelled': 'text-yellow-600 bg-yellow-50'
    }
    return colorMap[status] || 'text-gray-600 bg-gray-50'
  },

  // 估算剩余时间
  estimateTimeRemaining: (monitor: TaskMonitor): string => {
    if (monitor.progress === 0 || monitor.status !== 'running') {
      return '计算中...'
    }

    const elapsed = new Date().getTime() - new Date(monitor.startTime).getTime()
    const estimatedTotal = (elapsed / monitor.progress) * 100
    const remaining = estimatedTotal - elapsed

    if (remaining < 0) return '即将完成'

    const seconds = Math.floor(remaining / 1000)
    if (seconds < 60) return `${seconds}秒`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}分钟`
    return `${Math.floor(seconds / 3600)}小时`
  }
}