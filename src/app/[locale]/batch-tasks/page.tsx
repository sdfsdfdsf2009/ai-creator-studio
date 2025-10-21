'use client'

import React, { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { BatchTaskForm } from '@/components/batch-task-form'
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

  // 获取批量任务列表
  const { data: batchTasks, refetch: refetchBatchTasks } = useQuery({
    queryKey: ['batch-tasks'],
    queryFn: async () => {
      const response = await fetch('/api/batch-tasks')
      const result = await response.json()
      return result.success ? result.data : { items: [], total: 0 }
    }
  })

  // 获取选中批量任务的详细信息
  const { data: batchDetail } = useQuery({
    queryKey: ['batch-task-detail', selectedBatch?.id],
    queryFn: async () => {
      if (!selectedBatch) return null
      const response = await fetch(`/api/batch-tasks?id=${selectedBatch.id}`)
      const result = await response.json()
      return result.success ? result.data : null
    },
    enabled: !!selectedBatch
  })

  // 开始批量任务
  const startBatchTask = async (batchId: string) => {
    try {
      const response = await fetch('/api/batch-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          batchTaskId: batchId
        })
      })

      const result = await response.json()
      if (result.success) {
        refetchBatchTasks()
      } else {
        alert('启动失败: ' + result.error)
      }
    } catch (error) {
      console.error('启动批量任务失败:', error)
      alert('启动失败')
    }
  }

  // 取消批量任务
  const cancelBatchTask = async (batchId: string) => {
    if (!confirm('确定要取消这个批量任务吗？')) return

    try {
      const response = await fetch('/api/batch-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cancel',
          batchTaskId: batchId
        })
      })

      const result = await response.json()
      if (result.success) {
        refetchBatchTasks()
      } else {
        alert('取消失败: ' + result.error)
      }
    } catch (error) {
      console.error('取消批量任务失败:', error)
      alert('取消失败')
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

  if (showCreateForm) {
    return (
      <div className="container mx-auto py-6 max-w-4xl">
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => setShowCreateForm(false)}
          >
            ← 返回批量任务列表
          </Button>
        </div>

        <div className="mb-6">
          <h1 className="text-3xl font-bold">创建批量任务</h1>
          <p className="text-muted-foreground">
            使用变量系统批量生成多个相似但不完全相同的内容
          </p>
        </div>

        <BatchTaskForm
          onSubmit={(result) => {
            setShowCreateForm(false)
            refetchBatchTasks()
            alert(`批量任务创建成功！将生成 ${result.totalSubtasks} 个子任务`)
          }}
          onCancel={() => setShowCreateForm(false)}
        />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">批量任务</h1>
          <p className="text-muted-foreground">
            管理和监控批量生成任务
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          创建批量任务
        </Button>
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
              <Button onClick={() => setShowCreateForm(true)}>
                创建批量任务
              </Button>
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
                    <Button
                      size="sm"
                      onClick={() => startBatchTask(batch.id)}
                    >
                      开始执行
                    </Button>
                  )}
                  {(batch.status === 'pending' || batch.status === 'running') && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => cancelBatchTask(batch.id)}
                    >
                      取消任务
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedBatch(batch)}
                  >
                    查看详情
                  </Button>
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
              <Button variant="outline" onClick={() => setSelectedBatch(null)}>
                关闭
              </Button>
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
                          <Button size="sm" variant="outline">
                            查看结果
                          </Button>
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