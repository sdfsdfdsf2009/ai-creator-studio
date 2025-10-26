'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { VideoPlayer, VideoPreview } from '@/components/video-player'
import { MaterialCard } from '@/components/material-card'
import { VideoGenerationDialog } from '@/components/video-generation-dialog'
import { useVideoGeneration } from '@/hooks/use-video-generation'
import { Pagination } from '@/components/ui/pagination'

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

interface BatchImageManagerProps {
  batchId: string
  materials: Material[]
  selectedMaterials: string[]
  onSelectionChange: (selectedIds: string[]) => void
  viewMode: 'grid' | 'list'
  onViewModeChange: (mode: 'grid' | 'list') => void
  searchQuery: string
  onSearchChange: (query: string) => void
  isLoading: boolean
  onRefresh: () => void
  sortBy?: string
  onSortChange?: (sortBy: string) => void
  // 分页相关
  currentPage: number
  totalPages: number
  totalItems: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
}

// 格式化日期时间显示（精确到分秒）
const formatDateTime = (dateString?: string) => {
  if (!dateString) return ''
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

export function BatchImageManager({
  batchId,
  materials,
  selectedMaterials,
  onSelectionChange,
  viewMode,
  onViewModeChange,
  searchQuery,
  onSearchChange,
  isLoading,
  onRefresh,
  sortBy,
  onSortChange,
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange
}: BatchImageManagerProps) {
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null)
  const [availableModels, setAvailableModels] = useState<any[]>([])
  const [modelsLoading, setModelsLoading] = useState(false)
  const [editPrompt, setEditPrompt] = useState('')
  const [previewMaterial, setPreviewMaterial] = useState<Material | null>(null)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [jumpToSequence, setJumpToSequence] = useState('')

  // 视频生成对话框状态
  const [videoDialogMaterial, setVideoDialogMaterial] = useState<Material | null>(null)
  const [isVideoDialogOpen, setIsVideoDialogOpen] = useState(false)

  // 新增状态管理：跟踪重新生成的素材
  const [regeneratingIds, setRegeneratingIds] = useState<Set<string>>(new Set())
  const [regenerateStatus, setRegenerateStatus] = useState<Record<string, 'success' | 'error' | 'processing'>>({})
  const [notifications, setNotifications] = useState<Array<{id: string, type: 'success' | 'error' | 'info', message: string, timestamp: number}>>([])

  // 手动刷新视频生成状态
  const handleRefreshVideoStatus = async () => {
    try {
      addNotification('info', '🔄 正在检查视频生成状态...')

      // 先调用API修复状态
      const fixResponse = await fetch('/api/materials/fix-video-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const fixResult = await fixResponse.json()

      if (fixResult.success && fixResult.data.fixedCount > 0) {
        addNotification('success', `🔧 修复了 ${fixResult.data.fixedCount} 个状态异常的素材`)
      }

      // 刷新数据
      onRefresh()

      // 给一点时间让状态更新，然后显示统计信息
      setTimeout(() => {
        const processingCount = materials.filter(m =>
          m.videoGenerationStatus === 'processing' ||
          (m.videoGenerationTaskId && !m.videoGenerationStatus)
        ).length

        const completedCount = materials.filter(m =>
          m.videoResults && m.videoResults.length > 0
        ).length

        const errorCount = materials.filter(m =>
          m.videoGenerationStatus === 'failed'
        ).length

        if (processingCount > 0) {
          addNotification('info', `📊 状态统计: ${processingCount} 个处理中, ${completedCount} 个已完成, ${errorCount} 个失败`)
        } else if (completedCount > 0) {
          addNotification('success', `📊 当前有 ${completedCount} 个视频任务完成`)
        } else {
          addNotification('info', '📊 暂无视频生成任务')
        }
      }, 1000)
    } catch (error) {
      console.error('刷新状态失败:', error)
      addNotification('error', '❌ 刷新状态失败: ' + (error instanceof Error ? error.message : '未知错误'))
    }
  }

  // 视频生成状态管理
  const videoGeneration = useVideoGeneration({
    onStatusChange: (materialId, status) => {
      // 当状态变化时，更新对应的素材数据
      const material = materials.find(m => m.id === materialId)
      if (material) {
        const updatedMaterial = {
          ...material,
          videoGenerationStatus: status.status,
          videoGenerationProgress: status.progress,
          videoGenerationError: status.error,
          videoResults: status.videoResults,
          videoGenerationTaskId: status.videoGenerationTaskId,
          videoGenerationStartTime: status.videoGenerationStartTime,
          videoGenerationEndTime: status.videoGenerationEndTime
        }
        // 触发组件重新渲染以更新MaterialCard显示
        onRefresh()
      }
    },
    onCompleted: (materialId, results) => {
      addNotification('success', `🎬 视频生成成功: ${materials.find(m => m.id === materialId)?.name || materialId}`)
      onRefresh()
    },
    onFailed: (materialId, error) => {
      addNotification('error', `❌ 视频生成失败: ${materials.find(m => m.id === materialId)?.name || materialId} - ${error}`)
    }
  })

  // 加载可用模型
  useEffect(() => {
    const loadModels = async () => {
      try {
        setModelsLoading(true)
        const response = await fetch('/api/model-configs/?mediaType=video')
        const result = await response.json()
        if (result.success && Array.isArray(result.data)) {
          setAvailableModels(result.data)
        }
      } catch (error) {
        console.error('加载视频模型失败:', error)
        setAvailableModels([])
      } finally {
        setModelsLoading(false)
      }
    }

    loadModels()
  }, [])

  // 初始化视频生成状态
  useEffect(() => {
    if (materials.length > 0) {
      const imageMaterialIds = materials
        .filter(m => m.type === 'image')
        .map(m => m.id)

      if (imageMaterialIds.length > 0) {
        videoGeneration.initializeMaterialStatuses(imageMaterialIds)
      }
    }
  }, [materials, videoGeneration])

  // 自动刷新处理中的视频生成任务状态
  useEffect(() => {
    const checkVideoGenerationStatus = () => {
      const processingMaterials = materials.filter(m =>
        m.videoGenerationStatus === 'processing' ||
        (m.videoGenerationTaskId && !m.videoGenerationStatus)
      )

      if (processingMaterials.length > 0) {
        console.log(`🔄 检查 ${processingMaterials.length} 个处理中的视频生成任务状态`)
        onRefresh()
      }
    }

    // 每30秒检查一次
    const interval = setInterval(checkVideoGenerationStatus, 30000)

    // 初始检查
    checkVideoGenerationStatus()

    return () => clearInterval(interval)
  }, [materials, onRefresh])

  // 修复过期的错误状态
  useEffect(() => {
    const fixStaleErrorStatuses = async () => {
      const materialsToFix = materials.filter(m =>
        m.videoGenerationStatus === 'failed' &&
        m.videoResults &&
        m.videoResults.length > 0
      )

      const materialsWithoutStatus = materials.filter(m =>
        (!m.videoGenerationStatus || m.videoGenerationStatus === 'idle') &&
        m.videoResults &&
        m.videoResults.length > 0
      )

      const totalToFix = materialsToFix.length + materialsWithoutStatus.length

      if (totalToFix > 0) {
        console.log(`🔧 发现 ${totalToFix} 个需要修复状态的素材，调用API修复...`)

        try {
          const response = await fetch('/api/materials/fix-video-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          })

          const result = await response.json()

          if (result.success && result.data.fixedCount > 0) {
            console.log(`✅ API修复成功，修复了 ${result.data.fixedCount} 条记录`)
            addNotification('success', `🔧 自动修复了 ${result.data.fixedCount} 个素材状态`)
            onRefresh()
          }
        } catch (error) {
          console.error('❌ API修复失败:', error)
        }
      }
    }

    // 立即检查一次
    fixStaleErrorStatuses()

    // 每2分钟检查一次
    const interval = setInterval(fixStaleErrorStatuses, 120000)

    return () => clearInterval(interval)
  }, [materials, onRefresh])

  // Toast通知函数
  const addNotification = (type: 'success' | 'error' | 'info', message: string) => {
    const id = Date.now().toString()
    setNotifications(prev => [...prev, { id, type, message, timestamp: Date.now() }])

    // 自动移除通知（3秒后）
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id))
    }, 3000)
  }

  // 处理视频生成对话框
  const handleShowVideoGenerationDialog = (material: Material) => {
    setVideoDialogMaterial(material)
    setIsVideoDialogOpen(true)
  }

  const handleCloseVideoDialog = () => {
    setIsVideoDialogOpen(false)
    setVideoDialogMaterial(null)
  }

  const handleVideoGenerate = async (material: Material, selectedModel: string) => {
    try {
      addNotification('info', `🎬 开始为 ${material.name} 生成视频...`)
      const result = await videoGeneration.startVideoGeneration([material.id], selectedModel)

      if (result.success) {
        addNotification('success', `✅ ${material.name} 视频生成任务已启动，可在批量生成页面查看进度`)
      } else {
        addNotification('error', `❌ 启动视频生成失败: ${result.error}`)
      }
    } catch (error) {
      console.error('视频生成启动失败:', error)
      addNotification('error', `💥 视频生成启动失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  // 获取状态颜色
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'running': case 'processing': return 'bg-blue-100 text-blue-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'failed': return 'bg-red-100 text-red-800'
      case 'cancelled': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // 获取状态文本
  const getStatusText = (status?: string) => {
    switch (status) {
      case 'pending': return '等待中'
      case 'running': case 'processing': return '生成中'
      case 'completed': return '已完成'
      case 'failed': return '失败'
      case 'cancelled': return '已取消'
      default: return '未知'
    }
  }

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  // 选择/取消选择图片
  const handleSelectMaterial = (materialId: string) => {
    const newSelection = selectedMaterials.includes(materialId)
      ? selectedMaterials.filter(id => id !== materialId)
      : [...selectedMaterials, materialId]
    onSelectionChange(newSelection)
  }

  // 编辑提示词
  const handleEditPrompt = (material: Material) => {
    setEditingMaterial(material)
    setEditPrompt(material.prompt || '')
  }

  // 保存提示词
  const handleSavePrompt = async () => {
    if (!editingMaterial) return

    try {
      const response = await fetch(`/api/materials/${editingMaterial.id}/prompt`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: editPrompt,
          regenerate: false
        })
      })

      const result = await response.json()
      if (result.success) {
        onRefresh()
        setEditingMaterial(null)
        addNotification('success', '✅ 提示词已更新')
      } else {
        addNotification('error', '❌ 更新失败: ' + (result.error || '未知错误'))
      }
    } catch (error) {
      console.error('保存提示词失败:', error)
      addNotification('error', '❌ 保存失败，请重试')
    }
  }

  // 清理重生状态的辅助函数
  const clearRegeneratingState = (materialId: string) => {
    setRegeneratingIds(prev => {
      const newSet = new Set(prev)
      newSet.delete(materialId)
      return newSet
    })
    setRegenerateStatus(prev => {
      const newStatus = { ...prev }
      delete newStatus[materialId]
      return newStatus
    })
  }

  // 重新生成单个图片
  const handleRegenerateImage = async (material: Material, options: any = {}) => {
    setIsRegenerating(true)
    setRegeneratingIds(prev => new Set(prev).add(material.id))
    setRegenerateStatus(prev => ({ ...prev, [material.id]: 'processing' }))

    // 显示开始通知
    addNotification('info', `开始重新生成图片: ${material.name}`)

    // 设置超时处理 (30秒)
    const timeoutId = setTimeout(() => {
      setRegenerateStatus(prev => ({ ...prev, [material.id]: 'error' }))
      addNotification('error', `图片重生超时: ${material.name} - 请检查网络连接或稍后重试`)
      clearRegeneratingState(material.id)
      setIsRegenerating(false)
    }, 30000)

    try {
      const response = await fetch(`/api/materials/${material.id}/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: options.prompt || material.prompt,
          model: options.model || material.model,
          parameters: {
            width: options.width || material.width || 1024,
            height: options.height || material.height || 1024,
            quality: 'standard'
          },
          replaceOriginal: options.replaceOriginal !== false
        })
      })

      // 清除超时计时器
      clearTimeout(timeoutId)

      // 检查HTTP响应状态
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP错误 ${response.status}: ${response.statusText}`

        try {
          const errorData = JSON.parse(errorText)
          errorMessage = errorData.error || errorMessage
        } catch {
          // 如果不是JSON格式，使用原始错误信息
          console.warn('非JSON错误响应:', errorText)
        }

        setRegenerateStatus(prev => ({ ...prev, [material.id]: 'error' }))
        addNotification('error', `❌ 图片重生失败: ${material.name} - ${errorMessage}`)
        clearRegeneratingState(material.id)
        return
      }

      // 解析成功响应
      const result = await response.json()

      if (result.success) {
        setRegenerateStatus(prev => ({ ...prev, [material.id]: 'success' }))
        addNotification('success', `✅ 图片重新生成成功: ${material.name}`)

        // 延迟刷新以显示成功状态
        setTimeout(() => {
          onRefresh()
          clearRegeneratingState(material.id)
        }, 1500)
      } else {
        setRegenerateStatus(prev => ({ ...prev, [material.id]: 'error' }))
        addNotification('error', `❌ 图片重生失败: ${material.name} - ${result.error || '未知错误'}`)
        clearRegeneratingState(material.id)
      }
    } catch (error) {
      // 清除超时计时器
      clearTimeout(timeoutId)

      console.error('重新生成失败:', error)
      setRegenerateStatus(prev => ({ ...prev, [material.id]: 'error' }))

      // 根据错误类型提供更详细的信息
      let errorMessage = '请重试'
      if (error instanceof TypeError && error.message.includes('fetch')) {
        errorMessage = '网络连接失败，请检查网络连接'
      } else if (error instanceof Error) {
        errorMessage = error.message
      }

      addNotification('error', `❌ 图片重生失败: ${material.name} - ${errorMessage}`)
      clearRegeneratingState(material.id)
    } finally {
      // 只有在没有其他重生任务时才设置全局状态
      if (regeneratingIds.size <= 1) {
        setIsRegenerating(false)
      }
    }
  }

  // 跳转到指定序号
  const handleJumpToSequence = () => {
    const targetSequence = parseInt(jumpToSequence)
    if (isNaN(targetSequence) || targetSequence <= 0) {
      addNotification('error', '请输入有效的序号（大于0的整数）')
      return
    }

    const targetMaterial = materials.find(m => m.csvRowIndex === targetSequence)
    if (targetMaterial) {
      // 滚动到目标素材
      const element = document.getElementById(`material-${targetMaterial.id}`)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        // 高亮效果
        element.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2')
        setTimeout(() => {
          element.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2')
        }, 3000)
        addNotification('success', `已跳转到序号 ${targetSequence}`)
      }
    } else {
      addNotification('error', `找不到序号为 ${targetSequence} 的图片`)
    }
  }

  // 图片卡片组件
  const ImageCard = ({ material }: { material: Material }) => (
    <Card
      id={`material-${material.id}`}
      className={`group hover:shadow-md transition-all ${
        selectedMaterials.includes(material.id) ? 'ring-2 ring-blue-500' : ''
      }`}
    >
      <CardContent className="p-3">
        {/* 选择框和状态 */}
        <div className="flex justify-between items-start mb-2">
          <input
            type="checkbox"
            checked={selectedMaterials.includes(material.id)}
            onChange={() => handleSelectMaterial(material.id)}
            className="rounded mt-1"
          />
          <div className="flex gap-1">
            {material.status && (
              <Badge variant="outline" className={`text-xs ${getStatusColor(material.status)}`}>
                {getStatusText(material.status)}
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              {material.type === 'image' ? '🎨' : '🎬'}
            </Badge>
          </div>
        </div>

        {/* 图片预览 */}
        <div className="aspect-square bg-muted rounded-md overflow-hidden mb-2 cursor-pointer relative"
             onClick={() => setPreviewMaterial(material)}>
          {/* 重新生成中的遮罩 */}
          {regeneratingIds.has(material.id) && (
            <div className="absolute inset-0 bg-black bg-opacity-60 z-20 flex items-center justify-center">
              <div className="text-center text-white">
                <div className="w-8 h-8 border-2 border-white border-t-transparent animate-spin rounded-full mx-auto mb-2"></div>
                <p className="text-xs font-medium">图片重生中</p>
              </div>
            </div>
          )}

          {/* 重新生成状态指示器 */}
          {regenerateStatus[material.id] === 'success' && (
            <div className="absolute top-2 right-2 z-10">
              <div className="bg-green-500 text-white p-1 rounded-full shadow-lg">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          )}

          {regenerateStatus[material.id] === 'error' && (
            <div className="absolute top-2 right-2 z-10">
              <div className="bg-red-500 text-white p-1 rounded-full shadow-lg">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          )}

          {/* CSV序号徽章 */}
          {material.csvRowIndex && (
            <div className="absolute top-2 left-2 z-10">
              <div className="bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
                #{material.csvRowIndex}
              </div>
            </div>
          )}
          {material.type === 'image' ? (
            <img
              src={material.thumbnailUrl || material.url}
              alt={material.name}
              className="w-full h-full object-cover hover:scale-105 transition-transform"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
                target.nextElementSibling?.classList.remove('hidden')
              }}
            />
          ) : (
            <VideoPreview
              src={material.url}
              thumbnail={material.thumbnailUrl}
              className="w-full h-full"
              onPlay={() => setPreviewMaterial(material)}
            />
          )}
          {material.type === 'image' && (
            <div className="hidden w-full h-full flex items-center justify-center text-2xl bg-gray-100">
              📷 加载失败
            </div>
          )}
          {material.type === 'video' && (
            <div className="hidden w-full h-full flex items-center justify-center text-2xl bg-gray-100">
              🎬 加载失败
            </div>
          )}
        </div>

        {/* 媒体信息 */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {material.csvRowIndex && (
              <Badge variant="secondary" className="text-xs font-mono">
                #{material.csvRowIndex}
              </Badge>
            )}
            <div className="text-sm font-medium truncate" title={material.name}>
              {material.name}
            </div>
          </div>

          {material.model && (
            <div className="text-xs text-muted-foreground">
              🤖 {material.model}
            </div>
          )}

          {/* 批次信息显示 */}
          {material.batchTask && (
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="font-medium text-blue-600" title={material.batchTask.name}>
                📦 {material.batchTask.name.length > 15
                  ? `${material.batchTask.name.substring(0, 15)}...`
                  : material.batchTask.name}
              </div>
              <div className="text-gray-500" title={formatDateTime(material.batchTask.createdAt)}>
                🕒 {formatDateTime(material.batchTask.createdAt)}
              </div>
            </div>
          )}

          {material.prompt && (
            <div className="text-xs text-muted-foreground line-clamp-2" title={material.prompt}>
              📝 {material.prompt.substring(0, 50)}...
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            📊 {formatFileSize(material.size)}
            {material.width && material.height && (
              <span> • {material.width}×{material.height}</span>
            )}
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-xs h-7 px-1"
            onClick={() => handleEditPrompt(material)}
          >
            编辑
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-xs h-7 px-1"
            onClick={() => handleRegenerateImage(material)}
            disabled={regeneratingIds.has(material.id)}
          >
            {regeneratingIds.has(material.id) ? (
              <>
                <div className="w-3 h-3 border-2 border-current border-t-transparent animate-spin rounded-full mr-1"></div>
                重新生成中...
              </>
            ) : (
              <>
                重生
                {regenerateStatus[material.id] === 'success' && (
                  <span className="ml-1">✓</span>
                )}
                {regenerateStatus[material.id] === 'error' && (
                  <span className="ml-1">✗</span>
                )}
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-xs h-7 px-1"
            onClick={() => window.open(material.url, '_blank')}
          >
            查看
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-4">
      {/* 搜索和视图控制 */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="搜索图片名称或提示词..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          {/* 视频状态刷新按钮 */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshVideoStatus}
            className="h-8 px-2 text-xs"
            title="刷新视频生成状态，修复过期的错误状态"
          >
            🔄 刷新状态
          </Button>

          {/* 序号跳转 */}
          {materials.some(m => m.csvRowIndex) && (
            <div className="flex gap-1 items-center">
              <Input
                placeholder="跳转到序号"
                value={jumpToSequence}
                onChange={(e) => setJumpToSequence(e.target.value)}
                className="w-24 h-8 text-xs"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleJumpToSequence()
                  }
                }}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleJumpToSequence}
                className="h-8 px-2 text-xs"
                disabled={!jumpToSequence.trim()}
              >
                跳转
              </Button>
            </div>
          )}

          {onSortChange && (
            <Select value={sortBy || 'csvSequence'} onValueChange={onSortChange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csvSequence">CSV序号</SelectItem>
                <SelectItem value="createdAt">创建时间</SelectItem>
                <SelectItem value="name">名称</SelectItem>
                <SelectItem value="size">文件大小</SelectItem>
              </SelectContent>
            </Select>
          )}
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onViewModeChange('grid')}
          >
            网格
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onViewModeChange('list')}
          >
            列表
          </Button>
        </div>
      </div>

      {/* 序号统计信息 */}
      {materials.some(m => m.csvRowIndex) && (
        <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
          📊 当前显示 {materials.length} 张图片，其中 {materials.filter(m => m.csvRowIndex).length} 张有CSV序号
          {materials.filter(m => m.csvRowIndex).length > 0 && (
            <span>
              ，序号范围：{Math.min(...materials.filter(m => m.csvRowIndex).map(m => m.csvRowIndex!))} - {Math.max(...materials.filter(m => m.csvRowIndex).map(m => m.csvRowIndex!))}
            </span>
          )}
        </div>
      )}

      {/* 加载状态 */}
      {isLoading && (
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">加载图片中...</p>
          </div>
        </div>
      )}

      {/* 全选控制 */}
      {!isLoading && materials.length > 0 && (
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border mb-4">
          <div className="relative bg-white rounded-md shadow-sm border-2 border-gray-300 hover:border-blue-400 transition-all duration-200">
            <Checkbox
              checked={materials.length > 0 && selectedMaterials.length === materials.length}
              onCheckedChange={(checked) => {
                if (checked) {
                  // 全选
                  const allMaterialIds = materials.map(m => m.id)
                  onSelectionChange(allMaterialIds)
                } else {
                  // 取消全选
                  onSelectionChange([])
                }
              }}
              className="w-5 h-5 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 border-gray-400 rounded cursor-pointer"
            />
          </div>
          <span className="text-sm text-gray-600">
            {selectedMaterials.length === 0
              ? '点击选择素材'
              : selectedMaterials.length === materials.length
              ? `已选中全部 ${materials.length} 个素材`
              : `已选中 ${selectedMaterials.length} / ${materials.length} 个素材`
            }
          </span>
          <div className="flex-1"></div>
          {selectedMaterials.length > 0 && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSelectionChange([])}
                className="text-xs"
              >
                清空选择
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const allMaterialIds = materials.map(m => m.id)
                  onSelectionChange(allMaterialIds)
                }}
                className="text-xs"
                disabled={selectedMaterials.length === materials.length}
              >
                全选
              </Button>
            </div>
          )}
        </div>
      )}

      {/* 图片网格/列表 */}
      {!isLoading && (
        <div className={viewMode === 'grid'
          ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4'
          : 'space-y-2'
        }>
          {materials.map((material) => {
            // 合并视频生成状态
            const videoStatus = videoGeneration.getMaterialStatus(material.id)
            const enhancedMaterial = {
              ...material,
              videoGenerationStatus: videoStatus?.status || material.videoGenerationStatus,
              videoGenerationProgress: videoStatus?.progress || material.videoGenerationProgress,
              videoGenerationError: videoStatus?.error || material.videoGenerationError,
              videoResults: videoStatus?.videoResults || material.videoResults,
              videoGenerationTaskId: videoStatus?.videoGenerationTaskId || material.videoGenerationTaskId,
              videoGenerationStartTime: videoStatus?.videoGenerationStartTime || material.videoGenerationStartTime,
              videoGenerationEndTime: videoStatus?.videoGenerationEndTime || material.videoGenerationEndTime
            }

            return (
              <MaterialCard
                key={material.id}
                material={enhancedMaterial}
                isSelected={selectedMaterials.includes(material.id)}
                onSelectChange={(selected) => handleSelectMaterial(material.id)}
                onPreview={(material) => setPreviewMaterial(material)}
                onShowVideoGenerationDialog={handleShowVideoGenerationDialog}
                onVideoCancel={async (material) => {
                  try {
                    addNotification('info', `⏹ 正在取消 ${material.name} 的视频生成...`)
                    const result = await videoGeneration.cancelVideoGeneration([material.id])

                    if (result.success) {
                      addNotification('success', `✅ 已取消 ${material.name} 的视频生成`)
                    } else {
                      addNotification('error', `❌ 取消失败: ${result.error}`)
                    }
                  } catch (error) {
                    console.error('取消视频生成失败:', error)
                    addNotification('error', `💥 取消失败: ${error instanceof Error ? error.message : '未知错误'}`)
                  }
                }}
                viewMode={viewMode}
                showSelection={true}
              />
            )
          })}
        </div>
      )}

      {/* 图片预览弹窗 */}
      {previewMaterial && (
        <Dialog open={!!previewMaterial} onOpenChange={() => setPreviewMaterial(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{previewMaterial.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* 大图预览 */}
              <div className="flex justify-center">
                {previewMaterial.type === 'image' ? (
                  <img
                    src={previewMaterial.url}
                    alt={previewMaterial.name}
                    className="max-w-full max-h-96 object-contain rounded-lg"
                  />
                ) : (
                  <VideoPlayer
                    src={previewMaterial.url}
                    thumbnail={previewMaterial.thumbnailUrl}
                    width={640}
                    height={360}
                    controls={true}
                    showControls={true}
                  />
                )}
              </div>

              {/* 详细信息 */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                {previewMaterial.csvRowIndex && (
                  <div>
                    <span className="font-medium">CSV序号:</span>
                    <Badge variant="secondary" className="ml-2 font-mono">
                      #{previewMaterial.csvRowIndex}
                    </Badge>
                  </div>
                )}
                <div>
                  <span className="font-medium">状态:</span>
                  <Badge className={`ml-2 ${getStatusColor(previewMaterial.status)}`}>
                    {getStatusText(previewMaterial.status)}
                  </Badge>
                </div>
                {previewMaterial.batchTask && (
                  <>
                    <div className="col-span-2">
                      <span className="font-medium">批次信息:</span>
                      <div className="ml-2 mt-1">
                        <div className="text-blue-600">
                          📦 {previewMaterial.batchTask.name}
                        </div>
                        <div className="text-gray-500 text-xs">
                          🕒 {formatDateTime(previewMaterial.batchTask.createdAt)}
                        </div>
                      </div>
                    </div>
                  </>
                )}
                <div>
                  <span className="font-medium">模型:</span>
                  <span className="ml-2">{previewMaterial.model || '未知'}</span>
                </div>
                <div>
                  <span className="font-medium">尺寸:</span>
                  <span className="ml-2">
                    {previewMaterial.width && previewMaterial.height
                      ? `${previewMaterial.width}×${previewMaterial.height}`
                      : '未知'}
                  </span>
                </div>
                <div>
                  <span className="font-medium">大小:</span>
                  <span className="ml-2">{formatFileSize(previewMaterial.size)}</span>
                </div>
              </div>

              {/* 提示词 */}
              {previewMaterial.prompt && (
                <div>
                  <Label className="text-sm font-medium">提示词:</Label>
                  <div className="mt-1 p-3 bg-muted rounded-md text-sm">
                    {previewMaterial.prompt}
                  </div>
                </div>
              )}

              {/* 操作按钮 */}
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    handleEditPrompt(previewMaterial)
                    setPreviewMaterial(null)
                  }}
                >
                  编辑提示词
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleRegenerateImage(previewMaterial)}
                  disabled={isRegenerating}
                >
                  {isRegenerating ? '生成中...' : '重新生成'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.open(previewMaterial.url, '_blank')}
                >
                  在新窗口打开
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* 编辑提示词弹窗 */}
      {editingMaterial && (
        <Dialog open={!!editingMaterial} onOpenChange={() => setEditingMaterial(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>编辑提示词</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-prompt">提示词:</Label>
                <Textarea
                  id="edit-prompt"
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  rows={4}
                  className="mt-1"
                  placeholder="输入新的提示词..."
                />
              </div>

              <div>
                <Label>模型选择:</Label>
                <Select defaultValue={editingMaterial.model}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={editingMaterial.model}>
                      保持原模型 ({editingMaterial.model})
                    </SelectItem>
                    {modelsLoading ? (
                      <SelectItem value="" disabled>
                        加载模型中...
                      </SelectItem>
                    ) : availableModels.length === 0 ? (
                      <SelectItem value="" disabled>
                        暂无可用模型
                      </SelectItem>
                    ) : (
                      availableModels.map((model) => (
                        <SelectItem key={model.modelName} value={model.modelName}>
                          {model.proxyAccountName ? `🔗 ${model.modelName} (${model.proxyAccountName})` : model.modelName}
                          {model.cost ? ` - $${model.cost.toFixed(3)}/次` : ''}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSavePrompt}>
                  保存提示词
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    handleRegenerateImage(editingMaterial, { prompt: editPrompt })
                    setEditingMaterial(null)
                  }}
                  disabled={isRegenerating}
                >
                  {isRegenerating ? '生成中...' : '保存并重新生成'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setEditingMaterial(null)}
                >
                  取消
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Toast 通知容器 */}
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`p-4 rounded-lg shadow-lg border-l-4 transition-all transform animate-in slide-in-from-right duration-300 ${
              notification.type === 'success'
                ? 'bg-green-50 border-green-500 text-green-800'
                : notification.type === 'error'
                ? 'bg-red-50 border-red-500 text-red-800'
                : 'bg-blue-50 border-blue-500 text-blue-800'
            }`}
          >
            <div className="flex items-start">
              <div className="flex-shrink-0">
                {notification.type === 'success' && (
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
                {notification.type === 'error' && (
                  <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.316 1.293a1 1 0 001.414-1.414L11.414 10l1.316-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                )}
                {notification.type === 'info' && (
                  <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium">{notification.message}</p>
              </div>
              <button
                onClick={() => {
                  setNotifications(prev => prev.filter(n => n.id !== notification.id))
                }}
                className="ml-3 flex-shrink-0 focus:outline-none"
              >
                <svg className="w-4 h-4 opacity-60 hover:opacity-100" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 视频生成对话框 */}
      {videoDialogMaterial && (
        <VideoGenerationDialog
          isOpen={isVideoDialogOpen}
          onClose={handleCloseVideoDialog}
          material={videoDialogMaterial}
          availableModels={availableModels.filter(model => model.mediaType === 'video')}
          onGenerate={handleVideoGenerate}
          isGenerating={isProcessing}
        />
      )}

      {/* 分页组件 */}
      {totalPages > 1 && (
        <Card>
          <CardContent className="pt-6">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={onPageChange}
              onPageSizeChange={onPageSizeChange}
              enableAutoPlay={true}
              autoPlayInterval={5000}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}