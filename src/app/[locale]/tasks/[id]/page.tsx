'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useParams } from 'next/navigation'
import { useTask, useCancelTask, useRetryTask } from '@/hooks/use-tasks'
import { Task, TaskStatus, MediaType } from '@/types'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'

export default function TaskDetailPage() {
  const params = useParams()
  const router = useRouter()
  const taskId = params.id as string
  const [autoRefresh, setAutoRefresh] = useState(true)

  const { data: taskData, isLoading, error } = useTask(taskId)
  const cancelTaskMutation = useCancelTask()
  const retryTaskMutation = useRetryTask()

  const task = taskData?.data

  // 自动刷新运行中的任务
  useEffect(() => {
    if (!autoRefresh || task?.status !== 'running') return

    const interval = setInterval(() => {
      // refetch 是 useQuery 返回的函数，我们需要重新实现这个逻辑
      window.location.reload()
    }, 3000) // 每3秒刷新一次

    return () => clearInterval(interval)
  }, [autoRefresh, task?.status])

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
      case 'pending': return '等待中'
      case 'running': return '运行中'
      case 'completed': return '已完成'
      case 'failed': return '失败'
      case 'cancelled': return '已取消'
      default: return status
    }
  }

  const getMediaTypeText = (type: MediaType) => {
    return type === 'image' ? '图片生成' : '视频生成'
  }

  const handleCancel = () => {
    if (confirm('确定要取消这个任务吗？')) {
      cancelTaskMutation.mutate(taskId)
    }
  }

  const handleRetry = () => {
    retryTaskMutation.mutate(taskId)
  }

  const handleDelete = () => {
    if (confirm('确定要删除这个任务吗？此操作无法撤销。')) {
      fetch(`/api/tasks/${taskId}`, { method: 'DELETE' })
        .then(() => router.push('/tasks'))
    }
  }

  const handleDownload = (url: string, filename: string) => {
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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

  if (error || !task) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="text-center">
          <div className="text-red-500 mb-4">❌</div>
          <h3 className="text-lg font-semibold mb-2">任务不存在</h3>
          <p className="text-muted-foreground mb-4">{error || '找不到指定的任务'}</p>
          <Button onClick={() => router.push('/tasks')}>返回任务列表</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">任务详情</h1>
          <p className="text-muted-foreground">任务 ID: {taskId}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {task.status === 'running' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? '🔄 自动刷新中' : '🔒 已停止刷新'}
            </Button>
          )}
          {task.status === 'failed' && (
            <Button variant="outline" onClick={handleRetry}>
              🔄 重试
            </Button>
          )}
          {task.status === 'running' && (
            <Button variant="destructive" onClick={handleCancel}>
              ❌ 取消任务
            </Button>
          )}
          {(task.status === 'completed' || task.status === 'failed' || task.status === 'cancelled') && (
            <Button variant="destructive" onClick={handleDelete}>
              🗑️ 删除任务
            </Button>
          )}
          <Button variant="outline" onClick={() => router.push('/tasks')}>
            ← 返回列表
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>生成进度</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium">状态</span>
                  <Badge className={getStatusColor(task.status)}>
                    {getStatusText(task.status)}
                  </Badge>
                </div>

                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${task.progress}%` }}
                  />
                </div>

                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>进度: {Math.round(task.progress)}%</span>
                  <span>
                    更新于: {formatDistanceToNow(new Date(task.updatedAt), {
                      addSuffix: true,
                      locale: zhCN
                    })}
                  </span>
                </div>

                {task.error && (
                  <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
                    <strong>错误信息:</strong> {task.error}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                生成结果 {task.results.length > 0 && `(${task.results.length})`}
              </CardTitle>
              <CardDescription>
                {task.status === 'completed'
                  ? '任务已完成，点击图片可以查看大图或下载'
                  : '生成内容将在这里显示'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {task.results.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  {task.status === 'pending' && '⏳ 任务等待开始...'}
                  {task.status === 'running' && '🔄 正在生成中，请稍候...'}
                  {(task.status === 'failed' || task.status === 'cancelled') && '❌ 任务未能完成'}
                  {task.status === 'completed' && '✅ 任务完成，但没有生成结果'}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {task.results.map((result, index) => (
                    <div key={index} className="space-y-2">
                      <div className="text-sm font-medium">结果 {index + 1}</div>
                      {task.type === 'image' ? (
                        <div className="relative group">
                          <img
                            src={result}
                            alt={`Result ${index + 1}`}
                            className="w-full h-64 object-cover rounded-lg border cursor-pointer transition-transform hover:scale-105"
                            onClick={() => window.open(result, '_blank')}
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => window.open(result, '_blank')}
                              >
                                👁️ 查看
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleDownload(result, `result-${index + 1}.jpg`)}
                              >
                                💾 下载
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-gray-100 rounded-lg p-4 text-center">
                          <div className="text-4xl mb-2">🎬</div>
                          <div className="text-sm">视频文件</div>
                          <Button
                            size="sm"
                            className="mt-2"
                            onClick={() => handleDownload(result, `video-${index + 1}.mp4`)}
                          >
                            下载视频
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>任务信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <span className="font-medium">类型:</span>
                <p className="text-sm text-muted-foreground">{getMediaTypeText(task.type)}</p>
              </div>
              <div>
                <span className="font-medium">模型:</span>
                <p className="text-sm text-muted-foreground">{task.model}</p>
              </div>
              <div>
                <span className="font-medium">成本:</span>
                <p className="text-sm text-muted-foreground">${task.cost.toFixed(4)}</p>
              </div>
              <div>
                <span className="font-medium">创建时间:</span>
                <p className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(task.createdAt), {
                    addSuffix: true,
                    locale: zhCN
                  })}
                </p>
              </div>
              <div>
                <span className="font-medium">更新时间:</span>
                <p className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(task.updatedAt), {
                    addSuffix: true,
                    locale: zhCN
                  })}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>提示词</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {task.prompt}
              </p>
            </CardContent>
          </Card>

          {Object.keys(task.parameters).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>参数配置</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(task.parameters).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-sm font-medium">{key}:</span>
                      <span className="text-sm text-muted-foreground">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}