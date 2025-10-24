'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ImagePreview } from '@/components/image-preview'
import { useTasks } from '@/hooks/use-tasks'
import { useCreateTask, useCancelTask, useDeleteTask } from '@/hooks/use-tasks'
import { Task, TaskStatus, MediaType } from '@/types'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { useTranslation } from '@/hooks/use-translation'

export default function TasksPage() {
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  const { data: tasksData, isLoading, error } = useTasks({
    status: statusFilter !== 'all' ? statusFilter : undefined,
    type: typeFilter !== 'all' ? typeFilter as MediaType : undefined,
  })

  const createTaskMutation = useCreateTask()
  const cancelTaskMutation = useCancelTask()
  const deleteTaskMutation = useDeleteTask()
  const queryClient = useQueryClient()

  // 检查是否有运行中的任务
  const hasRunningTasks = tasksData?.items?.some(task =>
    ['pending', 'running'].includes(task.status)
  ) || false

  // 自动刷新运行中和等待中的任务
  useEffect(() => {
    if (!hasRunningTasks) return

    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    }, 3000) // 每3秒刷新任务列表

    return () => clearInterval(interval)
  }, [hasRunningTasks, queryClient])

  // 过滤任务
  const filteredTasks = tasksData?.items?.filter(task =>
    task.prompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
    task.model.toLowerCase().includes(searchQuery.toLowerCase())
  ) || []

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'running': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'completed': return 'bg-green-100 text-green-800 border-green-200'
      case 'failed': return 'bg-red-100 text-red-800 border-red-200'
      case 'cancelled': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusText = (status: TaskStatus) => {
    switch (status) {
      case 'pending': return t('tasks.status.pending')
      case 'running': return t('tasks.status.running')
      case 'completed': return t('tasks.status.completed')
      case 'failed': return t('tasks.status.failed')
      case 'cancelled': return t('tasks.status.cancelled')
      default: return status
    }
  }

  const handleCancelTask = (taskId: string) => {
    cancelTaskMutation.mutate(taskId)
  }

  const handleDeleteTask = (taskId: string) => {
    if (confirm('确定要删除这个任务吗？')) {
      deleteTaskMutation.mutate(taskId)
    }
  }

  const getMediaTypeIcon = (type: MediaType) => {
    return type === 'image' ? '🎨' : '🎬'
  }

  const getMediaTypeText = (type: MediaType) => {
    return type === 'image' ? t('tasks.type.image') : t('tasks.type.video')
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">加载中...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="text-center">
          <div className="text-red-500 mb-4">❌</div>
          <h3 className="text-lg font-semibold mb-2">加载失败</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>重新加载</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t('tasks.title')}</h1>
          <p className="text-muted-foreground">{t('tasks.subtitle')}</p>
        </div>
        <Link href="/tasks/create">
          <Button>
            ✨ {t('tasks.create')}
          </Button>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <Input
          placeholder={t('tasks.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="all">所有状态</option>
            <option value="pending">等待中</option>
            <option value="running">运行中</option>
            <option value="completed">已完成</option>
            <option value="failed">失败</option>
            <option value="cancelled">已取消</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="all">所有类型</option>
            <option value="image">图片生成</option>
            <option value="video">视频生成</option>
          </select>
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        共 {filteredTasks.length} 个任务
        {searchQuery && ` (搜索: "${searchQuery}")`}
      </div>

      <div className="grid gap-4">
        {filteredTasks.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>暂无任务</CardTitle>
              <CardDescription>
                {searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
                  ? '没有找到符合条件的任务，请尝试调整筛选条件'
                  : '创建您的第一个AI生成任务开始使用'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/tasks/create">
                <Button>创建任务</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          filteredTasks.map((task) => (
            <Card key={task.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{getMediaTypeIcon(task.type)}</span>
                      <Badge variant="outline">
                        {getMediaTypeText(task.type)}
                      </Badge>
                      <Badge className={getStatusColor(task.status)}>
                        {getStatusText(task.status)}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg mb-2 line-clamp-2">
                      {task.prompt}
                    </CardTitle>
                    <CardDescription className="space-y-1">
                      <div>模型: {task.model}</div>
                      <div>创建时间: {formatDistanceToNow(new Date(task.createdAt), {
                        addSuffix: true,
                        locale: zhCN
                      })}</div>
                      {task.cost > 0 && (
                        <div>成本: ${task.cost.toFixed(4)}</div>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2 ml-4">
                    {task.status === 'running' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCancelTask(task.id)}
                        disabled={cancelTaskMutation.isPending}
                      >
                        取消
                      </Button>
                    )}
                    {task.status === 'failed' && (
                      <Link href={`/tasks/${task.id}`}>
                        <Button size="sm" variant="outline">
                          重试
                        </Button>
                      </Link>
                    )}
                    {(task.status === 'completed' || task.status === 'failed' || task.status === 'cancelled') && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteTask(task.id)}
                        disabled={deleteTaskMutation.isPending}
                      >
                        删除
                      </Button>
                    )}
                    <Link href={`/tasks/${task.id}`}>
                      <Button size="sm">
                        查看详情
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardHeader>

              {(task.status === 'running' || task.progress > 0) && (
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>进度</span>
                      <span>{Math.round(task.progress)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              )}

              {task.status === 'completed' && task.results.length > 0 && (
                <CardContent>
                  <div className="text-sm text-muted-foreground mb-2">
                    生成了 {task.results.length} 个结果
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {task.results.slice(0, 3).map((result, index) => (
                      <div key={index} className="flex-shrink-0">
                        {task.type === 'image' ? (
                          <img
                            src={result}
                            alt={`Result ${index + 1}`}
                            className="w-16 h-16 object-cover rounded border cursor-pointer hover:scale-105 transition-transform"
                            onClick={() => setPreviewImage(result)}
                          />
                        ) : (
                          <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center text-xs text-center">
                            视频 {index + 1}
                          </div>
                        )}
                      </div>
                    ))}
                    {task.results.length > 3 && (
                      <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center text-xs">
                        +{task.results.length - 3}
                      </div>
                    )}
                  </div>
                </CardContent>
              )}

              {task.status === 'failed' && task.error && (
                <CardContent>
                  <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
                    错误信息: {task.error}
                  </div>
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>

      {/* Image Preview Modal */}
      <ImagePreview
        isOpen={!!previewImage}
        onClose={() => setPreviewImage(null)}
        imageUrl={previewImage || ''}
        alt="AI生成的图片"
      />
    </div>
  )
}