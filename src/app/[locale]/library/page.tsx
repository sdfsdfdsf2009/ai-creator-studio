'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useMaterials, useBatchMaterialsOperation } from '@/hooks/use-materials'
import { Material, MediaType } from '@/types'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'

export default function LibraryPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const { data: materialsData, isLoading, error } = useMaterials({
    search: searchQuery || undefined,
    type: typeFilter !== 'all' ? typeFilter as MediaType : undefined,
    sortBy,
    sortOrder,
  })

  const batchOperation = useBatchMaterialsOperation()

  const materials = materialsData?.items || []
  const categories = materialsData?.categories || []

  const handleSelectItem = (id: string) => {
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  const handleSelectAll = () => {
    if (selectedItems.length === materials.length) {
      setSelectedItems([])
    } else {
      setSelectedItems(materials.map(m => m.id))
    }
  }

  const handleBatchDelete = async () => {
    if (selectedItems.length === 0) return

    if (confirm(`确定要删除选中的 ${selectedItems.length} 个素材吗？`)) {
      try {
        await batchOperation.mutateAsync({
          operation: 'delete',
          materialIds: selectedItems,
        })
        setSelectedItems([])
      } catch (error) {
        console.error('Failed to delete materials:', error)
      }
    }
  }

  const handleDownload = (material: Material) => {
    const link = document.createElement('a')
    link.href = material.url
    link.download = `${material.name}.${material.format}`
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const getMediaTypeIcon = (type: MediaType) => {
    return type === 'image' ? '🎨' : '🎬'
  }

  const getMediaTypeText = (type: MediaType) => {
    return type === 'image' ? '图片' : '视频'
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  // 格式化精确时间显示
  const formatDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      })
    } catch (error) {
      return dateString
    }
  }

  // 格式化模型名称显示
  const formatModelName = (model?: string) => {
    if (!model) return '未知模型'
    return model
  }

  // 格式化任务ID显示并支持跳转
  const formatTaskId = (taskId?: string) => {
    if (!taskId) return null
    const shortId = taskId.length > 12 ? `${taskId.substring(0, 8)}...` : taskId
    return shortId
  }

  // 处理任务ID点击跳转
  const handleTaskIdClick = (taskId: string) => {
    if (taskId.startsWith('batch-')) {
      // 如果是批量任务ID，跳转到批量任务页面
      window.location.href = '/batch-tasks'
    } else {
      // 如果是单个任务ID，跳转到任务管理页面
      window.location.href = '/tasks'
    }
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
          <h1 className="text-3xl font-bold">素材库</h1>
          <p className="text-muted-foreground">浏览和管理您生成的内容</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            📤 导出选中
          </Button>
          <Button size="sm">
            📤 上传内容
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <Input
          placeholder="搜索素材..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex gap-2 flex-wrap">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="all">所有类型</option>
            <option value="image">图片</option>
            <option value="video">视频</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="createdAt">创建时间</option>
            <option value="name">名称</option>
            <option value="size">文件大小</option>
            <option value="updatedAt">更新时间</option>
          </select>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
            className="px-3 py-2 border rounded-md"
          >
            <option value="desc">降序</option>
            <option value="asc">升序</option>
          </select>
        </div>
        <div className="flex gap-1 ml-auto">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            网格
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            列表
          </Button>
        </div>
      </div>

      {materials.length > 0 && (
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={selectedItems.length === materials.length && materials.length > 0}
              onChange={handleSelectAll}
              className="rounded"
            />
            全选
          </label>
          <span className="text-sm text-muted-foreground">
            共 {materialsData?.total || 0} 个素材
          </span>
        </div>
      )}

      {selectedItems.length > 0 && (
        <div className="p-4 bg-muted rounded-lg">
          <div className="flex justify-between items-center">
            <span className="font-medium">已选择 {selectedItems.length} 个素材</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                📥 下载
              </Button>
              <Button variant="outline" size="sm">
                📁 添加到集合
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBatchDelete}
                disabled={batchOperation.isPending}
              >
                🗑️ 删除
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className={viewMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4' : 'space-y-4'}>
        {materials.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <div className="text-muted-foreground">
              <h3 className="text-lg font-medium mb-2">
                {searchQuery || typeFilter !== 'all' ? '没有找到匹配的素材' : '暂无素材'}
              </h3>
              <p>
                {searchQuery || typeFilter !== 'all'
                  ? '尝试调整搜索条件或筛选器'
                  : '生成一些内容来填充您的素材库'
                }
              </p>
              <Button className="mt-4" onClick={() => window.location.href = '/tasks/create'}>
                创建您的第一个生成任务
              </Button>
            </div>
          </div>
        ) : (
          materials.map((material) => (
            <Card key={material.id} className="group hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="space-y-3">
                  {/* 选择框 */}
                  <div className="flex justify-between items-start">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(material.id)}
                      onChange={() => handleSelectItem(material.id)}
                      className="rounded mt-1"
                    />
                    <div className="flex gap-1">
                      <Badge variant="outline" className="text-xs">
                        {getMediaTypeIcon(material.type)}
                      </Badge>
                    </div>
                  </div>

                  {/* 预览图 */}
                  <div className="aspect-square bg-muted rounded-md overflow-hidden">
                    {material.type === 'image' ? (
                      <img
                        src={material.thumbnailUrl || material.url}
                        alt={material.name}
                        className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => window.open(material.url, '_blank')}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl bg-gray-100">
                        🎬
                      </div>
                    )}
                  </div>

                  {/* 信息 */}
                  <div className="space-y-2">
                    <div className="font-medium text-sm truncate" title={material.name}>
                      {material.name}
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>{getMediaTypeText(material.type)}</div>
                      <div>{formatFileSize(material.size)}</div>
                      {material.duration && (
                        <div>时长: {material.duration}秒</div>
                      )}

                      {/* 新增：精确创建时间 */}
                      <div className="text-blue-600 font-medium">
                        📅 {formatDateTime(material.createdAt)}
                      </div>

                      {/* 新增：AI模型信息 */}
                      {material.model && (
                        <div className="text-green-600 font-medium">
                          🤖 模型: {formatModelName(material.model)}
                        </div>
                      )}

                      {/* 新增：任务ID */}
                      {material.taskId && (
                        <div
                          className="text-purple-600 font-medium cursor-pointer hover:underline"
                          onClick={() => handleTaskIdClick(material.taskId)}
                          title="点击查看任务详情"
                        >
                          📋 任务: {formatTaskId(material.taskId)}
                        </div>
                      )}

                      {/* 原有：相对时间 */}
                      <div className="text-gray-500">
                        {formatDistanceToNow(new Date(material.createdAt), {
                          addSuffix: true,
                          locale: zhCN
                        })}
                      </div>
                    </div>

                    {/* 标签 */}
                    {material.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {material.tags.slice(0, 2).map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {material.tags.length > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{material.tags.length - 2}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* 操作按钮 */}
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs h-7"
                        onClick={() => handleDownload(material)}
                      >
                        下载
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs h-7"
                        onClick={() => window.open(material.url, '_blank')}
                      >
                        查看
                      </Button>
                    </div>
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