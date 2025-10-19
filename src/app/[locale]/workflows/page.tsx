'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  useN8nWorkflows,
  useCreateN8nWorkflow,
  useDeleteN8nWorkflow,
  useActivateN8nWorkflow,
  useDeactivateN8nWorkflow,
  useExecuteN8nWorkflow,
  n8nUtils
} from '@/hooks/use-n8n'
import { N8nWorkflow } from '@/lib/n8n'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'

export default function WorkflowsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [newWorkflowName, setNewWorkflowName] = useState('')
  const [newWorkflowDescription, setNewWorkflowDescription] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')

  const { data: workflowsData, isLoading, error } = useN8nWorkflows()
  const createWorkflowMutation = useCreateN8nWorkflow()
  const deleteWorkflowMutation = useDeleteN8nWorkflow()
  const activateWorkflowMutation = useActivateN8nWorkflow()
  const deactivateWorkflowMutation = useDeactivateN8nWorkflow()
  const executeWorkflowMutation = useExecuteN8nWorkflow()

  const workflows = workflowsData?.data || []

  // 过滤工作流
  const filteredWorkflows = workflows.filter(workflow => {
    const matchesSearch = !searchQuery ||
      workflow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (workflow.description && workflow.description.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesStatus = statusFilter === 'all' || workflow.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const handleCreateWorkflow = () => {
    if (!newWorkflowName.trim()) {
      alert('请输入工作流名称')
      return
    }

    createWorkflowMutation.mutate({
      name: newWorkflowName,
      description: newWorkflowDescription,
      template: selectedTemplate || undefined
    }, {
      onSuccess: () => {
        setNewWorkflowName('')
        setNewWorkflowDescription('')
        setSelectedTemplate('')
        setIsCreateModalOpen(false)
      }
    })
  }

  const handleDeleteWorkflow = (workflow: N8nWorkflow) => {
    if (confirm(`确定要删除工作流 "${workflow.name}" 吗？`)) {
      deleteWorkflowMutation.mutate(workflow.id)
    }
  }

  const handleToggleWorkflowStatus = (workflow: N8nWorkflow) => {
    if (workflow.status === 'active') {
      deactivateWorkflowMutation.mutate(workflow.id)
    } else {
      activateWorkflowMutation.mutate(workflow.id)
    }
  }

  const handleExecuteWorkflow = (workflow: N8nWorkflow) => {
    executeWorkflowMutation.mutate({
      id: workflow.id,
      data: {} // 可以传递执行数据
    })
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
          <p className="text-muted-foreground mb-4">{error.message}</p>
          <Button onClick={() => window.location.reload()}>重新加载</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 标题和操作 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">工作流管理</h1>
          <p className="text-muted-foreground">管理和自动化您的AI内容生成工作流</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          ⚡ 创建工作流
        </Button>
      </div>

      {/* 搜索和筛选 */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <Input
          placeholder="搜索工作流..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border rounded-md"
        >
          <option value="all">所有状态</option>
          <option value="active">已激活</option>
          <option value="inactive">未激活</option>
          <option value="error">错误</option>
        </select>
      </div>

      {/* 工作流列表 */}
      <div className="grid gap-6">
        {filteredWorkflows.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>暂无工作流</CardTitle>
              <CardDescription>
                {searchQuery || statusFilter !== 'all'
                  ? '没有找到符合条件的工作流'
                  : '创建您的第一个工作流来开始自动化流程'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setIsCreateModalOpen(true)}>
                创建工作流
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredWorkflows.map((workflow) => (
            <Card key={workflow.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge
                        variant="outline"
                        className={n8nUtils.getStatusColor(workflow.status)}
                      >
                        {n8nUtils.getStatusText(workflow.status)}
                      </Badge>
                      <Badge variant="outline">
                        {workflow.nodes?.length || 0} 个节点
                      </Badge>
                    </div>
                    <CardTitle className="mb-2">{workflow.name}</CardTitle>
                    {workflow.description && (
                      <CardDescription>{workflow.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant={workflow.status === 'active' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleToggleWorkflowStatus(workflow)}
                      disabled={
                        activateWorkflowMutation.isPending ||
                        deactivateWorkflowMutation.isPending
                      }
                    >
                      {workflow.status === 'active' ? '停用' : '激活'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExecuteWorkflow(workflow)}
                      disabled={executeWorkflowMutation.isPending}
                    >
                      执行
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteWorkflow(workflow)}
                      disabled={deleteWorkflowMutation.isPending}
                    >
                      删除
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* 工作流统计 */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">创建时间</div>
                      <div className="font-medium">
                        {formatDistanceToNow(new Date(workflow.createdAt), {
                          addSuffix: true,
                          locale: zhCN
                        })}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">更新时间</div>
                      <div className="font-medium">
                        {formatDistanceToNow(new Date(workflow.updatedAt), {
                          addSuffix: true,
                          locale: zhCN
                        })}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">连接数</div>
                      <div className="font-medium">
                        {workflow.connections?.length || 0}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">状态</div>
                      <div className="font-medium">
                        {n8nUtils.getStatusText(workflow.status)}
                      </div>
                    </div>
                  </div>

                  {/* 节点预览 */}
                  {workflow.nodes && workflow.nodes.length > 0 && (
                    <div>
                      <div className="text-sm font-medium mb-2">工作流节点</div>
                      <div className="flex flex-wrap gap-2">
                        {workflow.nodes.slice(0, 5).map((node) => (
                          <Badge key={node.id} variant="secondary" className="text-xs">
                            {n8nUtils.getNodeTypeDisplayName(node.type)}
                          </Badge>
                        ))}
                        {workflow.nodes.length > 5 && (
                          <Badge variant="secondary" className="text-xs">
                            +{workflow.nodes.length - 5}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 操作按钮 */}
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      查看详情
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      编辑工作流
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      查看执行历史
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* 创建工作流弹窗 */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>创建新工作流</CardTitle>
              <CardDescription>
                选择模板或创建自定义工作流
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">工作流名称</label>
                <Input
                  value={newWorkflowName}
                  onChange={(e) => setNewWorkflowName(e.target.value)}
                  placeholder="输入工作流名称"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">描述</label>
                <Input
                  value={newWorkflowDescription}
                  onChange={(e) => setNewWorkflowDescription(e.target.value)}
                  placeholder="输入工作流描述（可选）"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">模板（可选）</label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">自定义工作流</option>
                  <option value="aiGeneration">AI内容生成工作流</option>
                  <option value="batchProcessing">批量处理工作流</option>
                </select>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  取消
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleCreateWorkflow}
                  disabled={createWorkflowMutation.isPending}
                >
                  {createWorkflowMutation.isPending ? '创建中...' : '创建'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}