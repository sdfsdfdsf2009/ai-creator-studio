'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { BatchImageManager } from '@/components/batch-image-manager'
import { BatchOperations } from '@/components/batch-operations'
import { useQuery } from '@tanstack/react-query'

interface BatchTask {
  id: string
  name: string
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

interface Material {
  id: string
  name: string
  type: 'image' | 'video'
  url: string
  thumbnailUrl?: string
  prompt?: string
  model?: string
  status?: string
  batchTaskId?: string
  csvRowIndex?: number
  createdAt: string
  size: number
  width?: number
  height?: number
  batchTask?: {
    id: string
    name: string
    createdAt: string
  }
}

export default function BatchReviewPage() {
  const [selectedBatchId, setSelectedBatchId] = useState<string>('all') // 默认显示所有素材
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<string>('createdAt') // 全部素材时默认按创建时间排序
  const [mediaType, setMediaType] = useState<'all' | 'image' | 'video'>('all') // 媒体类型筛选
  const [isFixing, setIsFixing] = useState(false)

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // 获取URL参数
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const batchId = urlParams.get('batchId')
    if (batchId) {
      setSelectedBatchId(batchId)
    }
  }, [])

  // 重置分页当筛选条件改变时
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedBatchId, mediaType, searchQuery])

  // 获取批次任务列表
  const { data: batchTasks, isLoading: isLoadingBatches } = useQuery({
    queryKey: ['batch-tasks-with-images'],
    queryFn: async () => {
      const response = await fetch('/api/batch-tasks/')
      const result = await response.json()
      return result.success ? result.data?.items || [] : []
    }
  })

  // 获取选中批次的材料或所有材料
  const { data: materials, isLoading: isLoadingMaterials, refetch: refetchMaterials } = useQuery({
    queryKey: ['batch-materials', selectedBatchId, mediaType, currentPage, pageSize],
    queryFn: async () => {
      if (!selectedBatchId) return { items: [], total: 0 }

      const params = new URLSearchParams()
      if (selectedBatchId !== 'all') {
        params.append('batchTaskId', selectedBatchId)
      }
      if (mediaType !== 'all') {
        params.append('type', mediaType)
      }
      // 添加分页参数
      params.append('page', currentPage.toString())
      params.append('pageSize', pageSize.toString())

      let url = '/api/materials'
      if (params.toString()) {
        url += `?${params.toString()}`
      }

      const response = await fetch(url)
      const result = await response.json()
      return result.success ? result.data : { items: [], total: 0 }
    },
    enabled: !!selectedBatchId
  })

  // 过滤和排序材料
  const filteredMaterials = materials?.items?.filter((material: Material) => {
    if (!searchQuery) return true
    return material.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           material.prompt?.toLowerCase().includes(searchQuery.toLowerCase())
  }).sort((a: Material, b: Material) => {
    switch (sortBy) {
      case 'csvSequence':
        // 按CSV序号排序，没有序号的排在后面
        if (a.csvRowIndex && b.csvRowIndex) {
          return a.csvRowIndex - b.csvRowIndex
        }
        return a.csvRowIndex ? -1 : (b.csvRowIndex ? 1 : 0)
      case 'createdAt':
        // 按创建时间排序（新的在前）
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      case 'name':
        // 按名称排序
        return (a.name || '').localeCompare(b.name || '')
      case 'size':
        // 按文件大小排序（大的在前）
        return b.size - a.size
      default:
        return 0
    }
  }) || []

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

  // 修复批次ID数据
  const handleFixBatchIds = async () => {
    if (!confirm('确定要修复历史数据吗？这将更新所有缺失批次ID的材料记录。')) {
      return
    }

    setIsFixing(true)
    try {
      console.log('🔧 开始修复批次ID数据...')

      const response = await fetch('/api/admin/fix-batch-ids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const result = await response.json()

      if (result.success) {
        console.log('✅ 批次ID修复成功:', result.data)
        alert(`修复成功！修复了 ${result.data.fixedCount} 个记录`)

        // 刷新数据
        refetchMaterials()
        refetchBatchTasks()
      } else {
        console.error('❌ 批次ID修复失败:', result.error)
        alert('修复失败: ' + (result.error || '未知错误'))
      }
    } catch (error) {
      console.error('❌ 修复过程中发生错误:', error)
      alert('修复失败，请检查网络连接')
    } finally {
      setIsFixing(false)
    }
  }

  // 获取批次统计信息
  const getBatchStats = (batchId: string) => {
    const batchMaterials = materials?.items?.filter((m: Material) => m.batchTaskId === batchId) || []
    const total = batchMaterials.length
    const completed = batchMaterials.filter((m: Material) => m.status === 'completed').length
    const failed = batchMaterials.filter((m: Material) => m.status === 'failed').length

    return { total, completed, failed, successRate: total > 0 ? Math.round((completed / total) * 100) : 0 }
  }

  // 获取全局统计信息
  const getAllMaterialsStats = () => {
    const allMaterials = materials?.items || []
    const total = allMaterials.length
    const completed = allMaterials.filter((m: Material) => m.status === 'completed').length
    const failed = allMaterials.filter((m: Material) => m.status === 'failed').length
    const withCsvIndex = allMaterials.filter((m: Material) => m.csvRowIndex).length
    const batchesCount = new Set(allMaterials.map((m: Material) => m.batchTaskId).filter(Boolean)).size

    return { total, completed, failed, withCsvIndex, batchesCount, successRate: total > 0 ? Math.round((completed / total) * 100) : 0 }
  }

  const selectedBatch = batchTasks?.find((batch: BatchTask) => batch.id === selectedBatchId)
  const batchStats = selectedBatchId && selectedBatchId !== 'all' ? getBatchStats(selectedBatchId) : getAllMaterialsStats()

  if (isLoadingBatches) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">加载批次信息...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">素材管理中心</h1>
          <p className="text-muted-foreground">
            {selectedBatchId === 'all'
              ? '管理所有素材，支持批量操作、重新生成和CSV导入'
              : '管理CSV导入的批量图片，支持重新生成和视频转换'
            }
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="default"
            onClick={() => window.location.href = '/csv-import'}
          >
            ✨ 新建批量任务
          </Button>
          <Button
            variant="outline"
            onClick={() => window.location.href = '/batch-tasks'}
          >
            ← 批量任务
          </Button>
        </div>
      </div>

      {/* 媒体类型选择标签页 */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">媒体类型</h3>
              <div className="text-sm text-muted-foreground">
                当前显示 {filteredMaterials.length} 个{mediaType === 'all' ? '素材' :
                         mediaType === 'image' ? '图片' : '视频'}
              </div>
            </div>
            <Tabs value={mediaType} onValueChange={(value) => setMediaType(value as 'all' | 'image' | 'video')}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all" className="flex items-center gap-2">
                  📊 全部
                  <Badge variant="secondary" className="ml-1">
                    {materials?.mediaTypeCounts?.all || 0}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="image" className="flex items-center gap-2">
                  🎨 图片
                  <Badge variant="secondary" className="ml-1">
                    {materials?.mediaTypeCounts?.image || 0}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="video" className="flex items-center gap-2">
                  🎬 视频
                  <Badge variant="secondary" className="ml-1">
                    {materials?.mediaTypeCounts?.video || 0}
                  </Badge>
                </TabsTrigger>
              </TabsList>
              <TabsContent value="all" className="mt-4">
                <p className="text-sm text-muted-foreground">
                  显示所有类型的素材内容，包括图片和视频
                </p>
              </TabsContent>
              <TabsContent value="image" className="mt-4">
                <p className="text-sm text-muted-foreground">
                  只显示图片类型的内容，支持预览、编辑和重新生成
                </p>
              </TabsContent>
              <TabsContent value="video" className="mt-4">
                <p className="text-sm text-muted-foreground">
                  只显示视频类型的内容，支持播放、下载和重新生成
                </p>
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* 批次选择器 - 压缩为两行 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📁 批次选择
            {selectedBatch && (
              <Badge className={getStatusColor(selectedBatch.status)}>
                {getStatusText(selectedBatch.status)}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* 第一行：批次选择和操作区域 */}
            <div className="flex flex-col lg:flex-row gap-4 items-start">
              {/* 左侧：批次选择 */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                  <label className="text-sm font-medium whitespace-nowrap">选择批次:</label>
                  <select
                    value={selectedBatchId}
                    onChange={(e) => setSelectedBatchId(e.target.value)}
                    className="flex-1 min-w-[200px] px-3 py-2 border rounded-md text-sm"
                  >
                    <option value="all">🗂️ 全部素材</option>
                    <option value="">请选择批次...</option>
                    {batchTasks?.map((batch: BatchTask) => (
                      <option key={batch.id} value={batch.id}>
                        {batch.name} ({getProgressPercentage(batch)}% - {batch.completedSubtasks}/{batch.totalSubtasks})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 中间：操作按钮 */}
              <div className="flex flex-wrap gap-2">
                {selectedBatchId && selectedBatchId !== 'all' && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.location.href = `/csv-import`}
                    >
                      导入新CSV
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleFixBatchIds}
                      disabled={isFixing}
                    >
                      {isFixing ? '修复中...' : '修复历史数据'}
                    </Button>
                  </>
                )}
                {selectedBatchId === 'all' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.location.href = `/csv-import`}
                  >
                    导入新CSV
                  </Button>
                )}
              </div>

              {/* 右侧：统计标题 */}
              {(selectedBatch || selectedBatchId === 'all') && (
                <div className="text-sm font-medium text-right">
                  {selectedBatchId === 'all' ? '🗂️ 全部素材统计' : `📊 ${selectedBatch?.name}`}
                </div>
              )}
            </div>

            {/* 第二行：统计信息和批次详情 */}
            {(selectedBatch || selectedBatchId === 'all') && (
              <div className="space-y-2">
                {/* 统计卡片 */}
                <div className="flex flex-wrap gap-2">
                  <div className="flex-shrink-0 text-center px-3 py-2 bg-muted rounded-lg border">
                    <div className="text-base font-semibold">{batchStats.total}</div>
                    <div className="text-xs text-muted-foreground">总图片数</div>
                  </div>
                  <div className="flex-shrink-0 text-center px-3 py-2 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-base font-semibold text-green-600">{batchStats.completed}</div>
                    <div className="text-xs text-muted-foreground">已完成</div>
                  </div>
                  <div className="flex-shrink-0 text-center px-3 py-2 bg-red-50 rounded-lg border border-red-200">
                    <div className="text-base font-semibold text-red-600">{batchStats.failed}</div>
                    <div className="text-xs text-muted-foreground">失败</div>
                  </div>
                  <div className="flex-shrink-0 text-center px-3 py-2 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="text-base font-semibold text-blue-600">{batchStats.successRate}%</div>
                    <div className="text-xs text-muted-foreground">成功率</div>
                  </div>
                  {/* 全部素材时显示额外统计 */}
                  {selectedBatchId === 'all' && 'withCsvIndex' in batchStats && (
                    <>
                      <div className="flex-shrink-0 text-center px-3 py-2 bg-purple-50 rounded-lg border border-purple-200">
                        <div className="text-base font-semibold text-purple-600">{(batchStats as any).withCsvIndex}</div>
                        <div className="text-xs text-muted-foreground">含CSV序号</div>
                      </div>
                      <div className="flex-shrink-0 text-center px-3 py-2 bg-orange-50 rounded-lg border border-orange-200">
                        <div className="text-base font-semibold text-orange-600">{(batchStats as any).batchesCount}</div>
                        <div className="text-xs text-muted-foreground">批次数量</div>
                      </div>
                    </>
                  )}
                </div>

                {/* 精简的批次详情 */}
                {selectedBatch && selectedBatchId !== 'all' && (
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground bg-gray-50 px-3 py-2 rounded-lg border">
                    <span><strong>ID:</strong> <span className="font-mono">{selectedBatch.id.slice(0, 8)}...</span></span>
                    <span><strong>模型:</strong> {selectedBatch.model}</span>
                    <span><strong>成本:</strong> ${selectedBatch.totalCost.toFixed(2)}</span>
                    <span><strong>创建:</strong> {new Date(selectedBatch.createdAt).toLocaleDateString()}</span>
                    {selectedBatch.status === 'running' && (
                      <span className="flex items-center gap-1">
                        <strong>进度:</strong> {getProgressPercentage(selectedBatch)}%
                        <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 transition-all duration-300"
                            style={{ width: `${getProgressPercentage(selectedBatch)}%` }}
                          />
                        </div>
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 批量操作工具栏 */}
      {selectedBatchId && filteredMaterials.length > 0 && (
        <BatchOperations
          selectedMaterials={selectedMaterials}
          batchId={selectedBatchId}
          materials={filteredMaterials}
          onSelectionChange={setSelectedMaterials}
          onRefresh={() => refetchMaterials()}
        />
      )}

      {/* 图片管理主界面 */}
      {selectedBatchId && (
        <BatchImageManager
          batchId={selectedBatchId}
          materials={filteredMaterials}
          selectedMaterials={selectedMaterials}
          onSelectionChange={setSelectedMaterials}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          isLoading={isLoadingMaterials}
          onRefresh={() => refetchMaterials()}
          sortBy={sortBy}
          onSortChange={setSortBy}
          // 分页参数
          currentPage={currentPage}
          totalPages={materials ? Math.ceil(materials.total / pageSize) : 1}
          totalItems={materials?.total || 0}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize)
            setCurrentPage(1)
          }}
        />
      )}

      {/* 空状态 */}
      {selectedBatchId && !isLoadingMaterials && filteredMaterials.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <h3 className="text-lg font-semibold mb-2">
              {searchQuery ? '没有找到匹配的图片' : '该批次暂无图片'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? '尝试调整搜索条件' : '图片生成完成后将在此显示'}
            </p>
            {searchQuery && (
              <Button variant="outline" onClick={() => setSearchQuery('')}>
                清除搜索
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* 无批次选择状态 */}
      {!selectedBatchId && (
        <Card>
          <CardContent className="py-12 text-center">
            <h3 className="text-lg font-semibold mb-2">请选择一个批次</h3>
            <p className="text-muted-foreground mb-4">
              选择一个批次来管理和编辑生成的图片
            </p>
            <Button onClick={() => window.location.href = '/csv-import'}>
              导入新的CSV文件
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}