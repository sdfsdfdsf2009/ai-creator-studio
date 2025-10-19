'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useTemplates, useDeleteTemplate } from '@/hooks/use-templates'
import { PromptTemplate, MediaType } from '@/types'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'

export default function PromptsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [mediaTypeFilter, setMediaTypeFilter] = useState('all')
  const router = useRouter()

  const { data: templatesData, isLoading, error } = useTemplates({
    mediaType: mediaTypeFilter !== 'all' ? mediaTypeFilter as MediaType : undefined,
    search: searchQuery || undefined,
  })

  const deleteTemplateMutation = useDeleteTemplate()

  const templates = templatesData?.items || []

  const handleCreateTemplate = () => {
    router.push('/prompts/create')
  }

  const handleUseTemplate = (template: PromptTemplate) => {
    // 跳转到任务创建页面，并传递模板参数
    router.push(`/tasks/create?templateId=${template.id}`)
  }

  const handleEditTemplate = (template: PromptTemplate) => {
    router.push(`/prompts/edit/${template.id}`)
  }

  const handleDeleteTemplate = async (template: PromptTemplate) => {
    if (confirm(`确定要删除模板 "${template.name}" 吗？`)) {
      try {
        await deleteTemplateMutation.mutateAsync(template.id)
      } catch (error) {
        console.error('Failed to delete template:', error)
      }
    }
  }

  const getMediaTypeText = (type: MediaType) => {
    return type === 'image' ? '图片' : '视频'
  }

  const getMediaTypeIcon = (type: MediaType) => {
    return type === 'image' ? '🎨' : '🎬'
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
          <h1 className="text-3xl font-bold">Prompt 模板</h1>
          <p className="text-muted-foreground">管理和复用您的 Prompt 模板</p>
        </div>
        <Button onClick={handleCreateTemplate}>
          ✨ 创建新模板
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <Input
          placeholder="搜索模板..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
        <select
          value={mediaTypeFilter}
          onChange={(e) => setMediaTypeFilter(e.target.value)}
          className="px-3 py-2 border rounded-md"
        >
          <option value="all">所有类型</option>
          <option value="image">图片模板</option>
          <option value="video">视频模板</option>
        </select>
      </div>

      {templates.length > 0 && (
        <div className="text-sm text-muted-foreground">
          共 {templatesData?.total || 0} 个模板
          {searchQuery && ` (搜索: "${searchQuery}")`}
        </div>
      )}

      <div className="grid gap-6">
        {templates.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>暂无模板</CardTitle>
              <CardDescription>
                {searchQuery || mediaTypeFilter !== 'all'
                  ? '没有找到符合条件的模板'
                  : '创建您的第一个 Prompt 模板来开始使用'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleCreateTemplate}>创建模板</Button>
            </CardContent>
          </Card>
        ) : (
          templates.map((template) => (
            <Card key={template.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{getMediaTypeIcon(template.mediaType)}</span>
                      <Badge variant="secondary">
                        {getMediaTypeText(template.mediaType)}
                      </Badge>
                      <Badge variant="outline">
                        {template.model}
                      </Badge>
                      {template.usageCount > 10 && (
                        <Badge variant="outline" className="text-orange-600 border-orange-200">
                          🔥 热门
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="mb-2">{template.name}</CardTitle>
                    <CardDescription>{template.description}</CardDescription>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditTemplate(template)}
                    >
                      编辑
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteTemplate(template)}
                      disabled={deleteTemplateMutation.isPending}
                    >
                      删除
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Prompt 内容 */}
                  <div className="bg-muted p-3 rounded-md">
                    <p className="text-sm font-mono line-clamp-3">
                      {template.template}
                    </p>
                  </div>

                  {/* 变量信息 */}
                  {template.variables.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium">变量:</div>
                      <div className="flex flex-wrap gap-2">
                        {template.variables.map((variable) => (
                          <Badge key={variable.name} variant="outline" className="text-xs">
                            {variable.name}
                            {variable.required && ' *'}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 统计信息 */}
                  <div className="flex justify-between items-center text-sm text-muted-foreground">
                    <div>
                      使用 {template.usageCount} 次 •
                      总成本 ${template.totalCost.toFixed(2)} •
                      缓存命中率 {(template.cacheHitRate * 100).toFixed(0)}%
                    </div>
                    <div>
                      创建于 {formatDistanceToNow(new Date(template.createdAt), {
                        addSuffix: true,
                        locale: zhCN
                      })}
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleUseTemplate(template)}
                      className="flex-1"
                    >
                      🚀 使用模板
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigator.clipboard.writeText(template.template)}
                    >
                      📋 复制 Prompt
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}