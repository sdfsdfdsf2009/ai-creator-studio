'use client'

import React, { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
// import { Button } from '@/components/ui/button' // 暂时移除，使用原生HTML按钮
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { BatchTaskForm } from '@/components/batch-task-form' // 重新启用，应该已修复SQLite客户端编译问题
import { useQuery } from '@tanstack/react-query'

interface BatchTask {
  id: string
  name: string
  description: string
  status: 'pending' | 'running' | 'completed' | 'completed_with_errors' | 'cancelled'
  totalSubtasks: number
  completedSubtasks: number
  failedSubtasks: number
  totalCost: number
  mediaType: 'image' | 'video'
  model: string
  createdAt: string
  updatedAt: string
}

export default function BatchTasksPage() {
  const t = useTranslations('batchTasks')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedBatch, setSelectedBatch] = useState<BatchTask | null>(null)

  // 调试输出
  console.log('BatchTasksPage render:', { showCreateForm, batchTasksStatus: 'loading' })

  // 获取批量任务列表
  const { data: batchTasks, refetch: refetchBatchTasks } = useQuery({
    queryKey: ['batch-tasks'],
    queryFn: async () => {
      console.log('📡 Fetching batch tasks list...')
      const response = await fetch('/api/batch-tasks/')
      const result = await response.json()
      console.log('📊 Batch tasks response:', result)
      return result.success ? result.data : { items: [], total: 0 }
    },
    // 添加自动刷新，每5秒刷新一次
    refetchInterval: 5000
  })

  // 获取选中批量任务的详细信息
  const { data: batchDetail } = useQuery({
    queryKey: ['batch-task-detail', selectedBatch?.id],
    queryFn: async () => {
      if (!selectedBatch) return null
      const response = await fetch(`/api/batch-tasks/?id=${selectedBatch.id}`)
      const result = await response.json()
      return result.success ? result.data : null
    },
    enabled: !!selectedBatch,
    // 添加自动刷新，每5秒刷新一次详情
    refetchInterval: selectedBatch ? 5000 : false
  })

  // 开始批量任务
  const startBatchTask = async (batchId: string) => {
    try {
      console.log('🚀 Starting batch task:', batchId)
      const response = await fetch('/api/batch-tasks/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          batchTaskId: batchId
        })
      })

      const result = await response.json()
      console.log('📋 Start batch response:', result)

      if (result.success) {
        console.log('✅ Batch task started successfully')
        // 立即刷新列表以显示状态更新
        refetchBatchTasks()
        alert('批量任务已开始执行！')
      } else {
        console.error('❌ Failed to start batch task:', result.error)
        alert('启动失败: ' + (result.error || '未知错误'))
      }
    } catch (error) {
      console.error('💥 Start batch task error:', error)
      alert('启动失败，请检查网络连接')
    }
  }

  // 取消批量任务
  const cancelBatchTask = async (batchId: string) => {
    if (!confirm('确定要取消这个批量任务吗？')) return

    try {
      console.log('⏹ Cancelling batch task:', batchId)
      const response = await fetch('/api/batch-tasks/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cancel',
          batchTaskId: batchId
        })
      })

      const result = await response.json()
      console.log('📋 Cancel batch response:', result)

      if (result.success) {
        console.log('✅ Batch task cancelled successfully')
        refetchBatchTasks()
        alert('批量任务已取消！')
      } else {
        console.error('❌ Failed to cancel batch task:', result.error)
        alert('取消失败: ' + (result.error || '未知错误'))
      }
    } catch (error) {
      console.error('💥 Cancel batch task error:', error)
      alert('取消失败，请检查网络连接')
    }
  }

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'running': return 'bg-blue-100 text-blue-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'completed_with_errors': return 'bg-orange-100 text-orange-800'
      case 'cancelled': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // 获取状态文本
  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '等待中'
      case 'running': return '执行中'
      case 'completed': return '已完成'
      case 'completed_with_errors': return '部分完成'
      case 'cancelled': return '已取消'
      default: return status
    }
  }

  // 计算进度百分比
  const getProgressPercentage = (batch: BatchTask) => {
    if (batch.totalSubtasks === 0) return 0
    return Math.round((batch.completedSubtasks / batch.totalSubtasks) * 100)
  }

  // 创建表单视图
  if (showCreateForm) {
    return (
      <div className="container mx-auto py-6 max-w-4xl">
        <div className="mb-6">
          <button
            onClick={() => setShowCreateForm(false)}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid #e2e8f0',
              borderRadius: '0.375rem',
              backgroundColor: '#6b7280',
              color: '#ffffff',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
          >
            ← 返回批量任务列表
          </button>
        </div>

        <div className="mb-6">
          <h1 className="text-3xl font-bold">创建批量任务</h1>
          <p className="text-muted-foreground">
            使用变量系统批量生成多个相似但不完全相同的内容
          </p>
        </div>

        <BatchTaskForm
          onSubmit={(result) => {
            console.log('BatchTaskForm 提交结果:', result)
            setShowCreateForm(false)
            refetchBatchTasks()
            alert(`批量任务创建成功！将生成 ${result.totalSubtasks} 个子任务`)
          }}
          onCancel={() => setShowCreateForm(false)}
        />
      </div>
    )
  }

  // 主列表视图
  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">批量任务</h1>
          <p className="text-muted-foreground">
            管理和监控批量生成任务
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              console.log('调试按钮1被点击')
              alert('页面加载正常，showCreateForm = ' + showCreateForm)
            }}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid #e2e8f0',
              borderRadius: '0.375rem',
              backgroundColor: '#ffffff',
              color: '#374151',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
          >
            🐛 调试状态
          </button>
          <button
            onClick={() => {
              console.log('创建批量任务按钮被点击')
              setShowCreateForm(true)
            }}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid #e2e8f0',
              borderRadius: '0.375rem',
              backgroundColor: '#3b82f6',
              color: '#ffffff',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
          >
            创建批量任务
          </button>
        </div>
      </div>

      {/* 批量任务列表 */}
      <div className="grid gap-4">
        {batchTasks?.items?.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <h3 className="text-lg font-semibold mb-2">暂无批量任务</h3>
              <p className="text-muted-foreground mb-4">
                创建第一个批量任务来体验变量系统的强大功能
              </p>
              <button
                onClick={() => setShowCreateForm(true)}
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.375rem',
                  backgroundColor: '#3b82f6',
                  color: '#ffffff',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  transition: 'all 0.2s'
                }}
              >
                创建批量任务
              </button>
            </CardContent>
          </Card>
        ) : (
          batchTasks?.items?.map((batch: BatchTask) => (
            <Card key={batch.id} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {batch.name}
                      <Badge className={getStatusColor(batch.status)}>
                        {getStatusText(batch.status)}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {batch.description}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">
                      {batch.mediaType === 'image' ? '图片' : '视频'} • {batch.model}
                    </div>
                    <div className="text-sm font-medium">
                      ${batch.totalCost.toFixed(2)}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* 进度条 */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span>进度</span>
                    <span>{batch.completedSubtasks} / {batch.totalSubtasks} 任务完成</span>
                  </div>
                  <Progress
                    value={getProgressPercentage(batch)}
                    className="w-full"
                  />
                </div>

                {/* 统计信息 */}
                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-lg font-semibold">{batch.totalSubtasks}</div>
                    <div className="text-xs text-muted-foreground">总任务</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-green-600">{batch.completedSubtasks}</div>
                    <div className="text-xs text-muted-foreground">已完成</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-red-600">{batch.failedSubtasks}</div>
                    <div className="text-xs text-muted-foreground">失败</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold">{getProgressPercentage(batch)}%</div>
                    <div className="text-xs text-muted-foreground">完成率</div>
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="flex gap-2">
                  {batch.status === 'pending' && (
                    <button
                      onClick={() => startBatchTask(batch.id)}
                      style={{
                        padding: '0.25rem 0.75rem',
                        border: '1px solid #e2e8f0',
                        borderRadius: '0.375rem',
                        backgroundColor: '#10b981',
                        color: '#ffffff',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        transition: 'all 0.2s'
                      }}
                    >
                      开始执行
                    </button>
                  )}
                  {(batch.status === 'pending' || batch.status === 'running') && (
                    <button
                      onClick={() => cancelBatchTask(batch.id)}
                      style={{
                        padding: '0.25rem 0.75rem',
                        border: '1px solid #e2e8f0',
                        borderRadius: '0.375rem',
                        backgroundColor: '#ef4444',
                        color: '#ffffff',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        transition: 'all 0.2s'
                      }}
                    >
                      取消任务
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedBatch(batch)}
                    style={{
                      padding: '0.25rem 0.75rem',
                      border: '1px solid #e2e8f0',
                      borderRadius: '0.375rem',
                      backgroundColor: '#ffffff',
                      color: '#374151',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      transition: 'all 0.2s'
                    }}
                  >
                    查看详情
                  </button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* 任务详情弹窗 */}
      {selectedBatch && batchDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl max-h-[80vh] overflow-auto p-6 m-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">{selectedBatch.name}</h2>
              <button
                onClick={() => setSelectedBatch(null)}
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.375rem',
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  transition: 'all 0.2s'
                }}
              >
                关闭
              </button>
            </div>

            <div className="space-y-6">
              {/* 子任务列表 */}
              <div>
                <h3 className="text-lg font-semibold mb-3">子任务列表</h3>
                <div className="grid gap-2 max-h-96 overflow-y-auto">
                  {batchDetail.subtasks?.map((subtask: any, index: number) => (
                    <div key={subtask.id} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">#{index + 1}</span>
                        <div>
                          <div className="text-sm font-medium truncate max-w-md">
                            {subtask.prompt}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            变量值: {JSON.stringify(subtask.variableValues)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(subtask.status)}>
                          {getStatusText(subtask.status)}
                        </Badge>
                        {subtask.status === 'completed' && subtask.results?.length > 0 && (
                          <button
                            style={{
                              padding: '0.25rem 0.5rem',
                              border: '1px solid #e2e8f0',
                              borderRadius: '0.25rem',
                              backgroundColor: '#3b82f6',
                              color: '#ffffff',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                              fontWeight: '500'
                            }}
                          >
                            查看结果
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}