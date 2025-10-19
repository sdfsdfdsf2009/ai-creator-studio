'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  useTaskMonitor,
  useTaskMonitorStats,
  useTaskNotifications,
  taskMonitorUtils
} from '@/hooks/use-task-monitor'
import { TaskLog, TaskNotification } from '@/lib/task-monitor'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'

export default function MonitorPage() {
  const [selectedTaskId, setSelectedTaskId] = useState<string>('')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const stats = useTaskMonitorStats()
  const { notifications, unreadCount, markAllAsRead } = useTaskNotifications(undefined, { unreadOnly: true })

  // 获取一个示例任务ID进行演示
  useEffect(() => {
    if (stats.total > 0 && !selectedTaskId) {
      // 这里应该从实际任务列表中获取，现在使用模拟ID
      setSelectedTaskId('demo-task-1')
    }
  }, [stats, selectedTaskId])

  const { monitor, updateStatus, updateProgress, addLog } = useTaskMonitor(selectedTaskId, {
    autoStart: true
  })

  // 模拟任务操作
  const handleSimulateStart = () => {
    if (selectedTaskId) {
      updateStatus('running', '正在处理prompt')
      updateProgress(10)
      addLog('info', '任务开始执行', { timestamp: new Date().toISOString() })
    }
  }

  const handleSimulateProgress = () => {
    if (monitor) {
      const newProgress = Math.min(100, monitor.progress + 20)
      updateProgress(newProgress, `处理中 ${newProgress}%`)
      addLog('info', `进度更新到 ${newProgress}%`)

      if (newProgress >= 100) {
        updateStatus('completed', '任务完成')
        addLog('success', '任务执行完成')
      }
    }
  }

  const handleSimulateError = () => {
    if (selectedTaskId) {
      updateStatus('failed', '处理失败')
      addLog('error', '任务执行失败', { errorCode: 'AI_SERVICE_ERROR' })
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 标题和统计 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">任务监控</h1>
          <p className="text-muted-foreground">实时监控AI生成任务的执行状态和进度</p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="text-sm">
            {stats.total} 个活跃任务
          </Badge>
          <Button
            variant={autoRefresh ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? '自动刷新开启' : '自动刷新关闭'}
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">等待中</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">运行中</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.running}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">已完成</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">失败</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 主要监控区域 */}
        <div className="lg:col-span-2 space-y-6">
          {monitor ? (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      任务监控
                      <Badge
                        variant="outline"
                        className={taskMonitorUtils.getStatusColor(monitor.status)}
                      >
                        {taskMonitorUtils.getStatusText(monitor.status)}
                      </Badge>
                    </CardTitle>
                    <CardDescription>任务ID: {monitor.taskId}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={handleSimulateStart}>
                      模拟开始
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleSimulateProgress}>
                      模拟进度
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleSimulateError}>
                      模拟错误
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList>
                    <TabsTrigger value="overview">概览</TabsTrigger>
                    <TabsTrigger value="logs">日志</TabsTrigger>
                    <TabsTrigger value="metrics">指标</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-4">
                    {/* 进度条 */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{monitor.stage}</span>
                        <span>{taskMonitorUtils.formatProgress(monitor.progress)}</span>
                      </div>
                      <Progress
                        value={monitor.progress}
                        className="h-2"
                      />
                    </div>

                    {/* 时间信息 */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">开始时间</div>
                        <div className="font-medium">
                          {formatDistanceToNow(new Date(monitor.startTime), {
                            addSuffix: true,
                            locale: zhCN
                          })}
                        </div>
                      </div>
                      {monitor.endTime && (
                        <div>
                          <div className="text-muted-foreground">完成时间</div>
                          <div className="font-medium">
                            {formatDistanceToNow(new Date(monitor.endTime), {
                              addSuffix: true,
                              locale: zhCN
                            })}
                          </div>
                        </div>
                      )}
                      <div>
                        <div className="text-muted-foreground">运行时长</div>
                        <div className="font-medium">
                          {taskMonitorUtils.formatDuration(monitor.startTime, monitor.endTime)}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">预计剩余时间</div>
                        <div className="font-medium">
                          {taskMonitorUtils.estimateTimeRemaining(monitor)}
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="logs">
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-2">
                        {monitor.logs.length === 0 ? (
                          <div className="text-center text-muted-foreground py-8">
                            暂无日志
                          </div>
                        ) : (
                          monitor.logs.map((log) => (
                            <div
                              key={log.id}
                              className="flex items-start gap-2 p-2 rounded-md border"
                            >
                              <span className="text-sm">
                                {taskMonitorUtils.getLogLevelIcon(log.level)}
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className={`text-sm ${taskMonitorUtils.getLogLevelColor(log.level)}`}>
                                  {log.message}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(log.timestamp), {
                                    addSuffix: true,
                                    locale: zhCN
                                  })}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="metrics" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground">总步骤</div>
                        <div className="text-lg font-medium">{monitor.metrics.totalSteps}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">已完成步骤</div>
                        <div className="text-lg font-medium">{monitor.metrics.completedSteps}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">当前成本</div>
                        <div className="text-lg font-medium">${monitor.metrics.costSoFar.toFixed(4)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">预估总成本</div>
                        <div className="text-lg font-medium">${monitor.metrics.estimatedTotalCost.toFixed(4)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">API调用次数</div>
                        <div className="text-lg font-medium">{monitor.metrics.apiCallsCount}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">当前步骤</div>
                        <div className="text-lg font-medium">{monitor.metrics.currentStep}</div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>选择任务</CardTitle>
                <CardDescription>选择一个任务来查看监控详情</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center text-muted-foreground">
                  请选择一个任务ID来开始监控
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 侧边栏 */}
        <div className="space-y-6">
          {/* 通知 */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">通知</CardTitle>
                {unreadCount > 0 && (
                  <Button size="sm" variant="outline" onClick={markAllAsRead}>
                    标记全部已读
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {notifications.length === 0 ? (
                    <div className="text-center text-muted-foreground text-sm">
                      暂无新通知
                    </div>
                  ) : (
                    notifications.slice(0, 10).map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-3 rounded-lg border ${taskMonitorUtils.getNotificationColor(notification.type)}`}
                      >
                        <div className="flex items-start gap-2">
                          <div className="flex-1">
                            <div className="font-medium text-sm">{notification.title}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {notification.message}
                            </div>
                            <div className="text-xs text-muted-foreground mt-2">
                              {formatDistanceToNow(new Date(notification.timestamp), {
                                addSuffix: true,
                                locale: zhCN
                              })}
                            </div>
                          </div>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* 快速操作 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">快速操作</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full" variant="outline">
                刷新监控数据
              </Button>
              <Button className="w-full" variant="outline">
                导出监控报告
              </Button>
              <Button className="w-full" variant="outline">
                配置监控设置
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}