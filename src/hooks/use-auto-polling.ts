'use client'

import React from 'react'
import { useRefreshTask } from './use-tasks'
import { Task } from '@/types'

interface AutoPollingOptions {
  enabled?: boolean
  interval?: number // 轮询间隔（毫秒）
  maxRetries?: number // 最大重试次数
  onComplete?: (task: Task) => void // 完成回调
  onError?: (task: Task, error: any) => void // 错误回调
}

/**
 * 自动轮询 hook
 * 用于对进行中的任务进行自动状态查询
 */
export function useAutoPolling(options: AutoPollingOptions = {}) {
  const {
    enabled = true,
    interval = 5000, // 默认5秒
    maxRetries = 120, // 默认最大重试120次（10分钟）
    onComplete,
    onError
  } = options

  const refreshTask = useRefreshTask()
  const pollingIntervals = React.useRef<Map<string, NodeJS.Timeout>>(new Map())
  const retryCounts = React.useRef<Map<string, number>>(new Map())

  // 清理指定任务的轮询
  const clearPolling = React.useCallback((taskId: string) => {
    const interval = pollingIntervals.current.get(taskId)
    if (interval) {
      clearInterval(interval)
      pollingIntervals.current.delete(taskId)
      retryCounts.current.delete(taskId)
      console.log(`🛑 [AUTO-POLLING] 停止轮询任务: ${taskId}`)
    }
  }, [])

  // 清理所有轮询
  const clearAllPolling = React.useCallback(() => {
    pollingIntervals.current.forEach((interval, taskId) => {
      clearInterval(interval)
      console.log(`🛑 [AUTO-POLLING] 停止轮询任务: ${taskId}`)
    })
    pollingIntervals.current.clear()
    retryCounts.current.clear()
    console.log(`🧹 [AUTO-POLLING] 已清理所有轮询任务`)
  }, [])

  // 开始自动轮询任务
  const startPolling = React.useCallback((task: Task) => {
    if (!enabled) {
      console.log(`⏸️ [AUTO-POLLING] 自动轮询已禁用，跳过任务: ${task.id}`)
      return
    }

    // 只对进行中的视频任务进行轮询
    if (task.type !== 'video' || !['pending', 'processing', 'running'].includes(task.status)) {
      console.log(`⏭️ [AUTO-POLLING] 任务不需要轮询: ${task.id} (状态: ${task.status}, 类型: ${task.type})`)
      return
    }

    // 清理已有的轮询
    clearPolling(task.id)

    // 初始化重试计数
    retryCounts.current.set(task.id, 0)

    console.log(`🚀 [AUTO-POLLING] 开始自动轮询任务: ${task.id} (间隔: ${interval}ms)`)
    console.log(`📋 [AUTO-POLLING] 任务详情:`, {
      id: task.id,
      status: task.status,
      progress: task.progress,
      externalTaskId: task.external_task_id
    })

    const intervalId = setInterval(async () => {
      const currentRetry = retryCounts.current.get(task.id) || 0

      // 检查最大重试次数
      if (currentRetry >= maxRetries) {
        console.log(`⏰ [AUTO-POLLING] 任务 ${task.id} 达到最大重试次数 ${maxRetries}，停止轮询`)
        clearPolling(task.id)
        if (onError) {
          onError(task, new Error('轮询超时'))
        }
        return
      }

      try {
        console.log(`🔄 [AUTO-POLLING] 轮询任务 ${task.id} (第 ${currentRetry + 1} 次)`)

        // 调用刷新API
        await refreshTask.mutateAsync(task.id)

        // 增加重试计数
        retryCounts.current.set(task.id, currentRetry + 1)

      } catch (error) {
        console.error(`❌ [AUTO-POLLING] 轮询任务 ${task.id} 失败:`, error)

        // 增加重试计数
        retryCounts.current.set(task.id, currentRetry + 1)

        // 网络错误时继续重试，其他错误时停止
        if (error instanceof Error && !error.message.includes('fetch')) {
          console.log(`🛑 [AUTO-POLLING] 任务 ${task.id} 轮询遇到非网络错误，停止轮询`)
          clearPolling(task.id)
          if (onError) {
            onError(task, error)
          }
        }
      }
    }, interval)

    pollingIntervals.current.set(task.id, intervalId)
  }, [enabled, interval, maxRetries, refreshTask, clearPolling, onComplete, onError])

  // 监听任务状态变化，处理轮询结果
  React.useEffect(() => {
    if (refreshTask.data?.data) {
      const updatedTask = refreshTask.data.data

      console.log(`📊 [AUTO-POLLING] 任务状态更新:`, {
        id: updatedTask.id,
        status: updatedTask.status,
        progress: updatedTask.progress,
        hasResults: !!(updatedTask.results && updatedTask.results.length > 0)
      })

      // 检查任务是否完成
      if (['completed', 'failed'].includes(updatedTask.status)) {
        console.log(`🎯 [AUTO-POLLING] 任务 ${updatedTask.id} 已${updatedTask.status === 'completed' ? '完成' : '失败'}，停止轮询`)
        clearPolling(updatedTask.id)

        if (updatedTask.status === 'completed' && onComplete) {
          onComplete(updatedTask)
        } else if (updatedTask.status === 'failed' && onError) {
          onError(updatedTask, new Error(updatedTask.error || '任务失败'))
        }
      }
    }
  }, [refreshTask.data, clearPolling, onComplete, onError])

  // 组件卸载时清理所有轮询
  React.useEffect(() => {
    return () => {
      clearAllPolling()
    }
  }, [clearAllPolling])

  return {
    startPolling,
    clearPolling,
    clearAllPolling,
    isPolling: (taskId: string) => pollingIntervals.current.has(taskId),
    getPollingTasks: () => Array.from(pollingIntervals.current.keys())
  }
}

/**
 * 自动轮询管理器 Hook
 * 用于管理多个任务的自动轮询
 */
export function useAutoPollingManager() {
  const autoPolling = useAutoPolling({
    enabled: true,
    interval: 5000, // 5秒轮询一次
    maxRetries: 120, // 最大10分钟
    onComplete: (task) => {
      console.log(`🎉 [AUTO-POLLING-MANAGER] 任务完成: ${task.id}`)

      // 显示完成通知
      if (typeof window !== 'undefined') {
        const message = task.status === 'completed'
          ? `✅ 视频生成完成: ${task.prompt?.substring(0, 50)}...`
          : `❌ 视频生成失败: ${task.error || '未知错误'}`

        // 可以在这里添加 toast 通知
        console.log(`🔔 [NOTIFICATION] ${message}`)
      }
    },
    onError: (task, error) => {
      console.error(`💥 [AUTO-POLLING-MANAGER] 任务出错: ${task.id}`, error)
    }
  })

  // 批量开始轮询多个任务
  const startPollingTasks = React.useCallback((tasks: Task[]) => {
    console.log(`🚀 [AUTO-POLLING-MANAGER] 开始批量轮询 ${tasks.length} 个任务`)

    tasks.forEach(task => {
      autoPolling.startPolling(task)
    })
  }, [autoPolling])

  return {
    ...autoPolling,
    startPollingTasks
  }
}