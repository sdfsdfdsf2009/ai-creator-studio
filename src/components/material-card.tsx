'use client'

import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import { VideoGenerationStatus, MediaType } from '@/types'
import { VideoPlayer, VideoPreview } from '@/components/video-player'

interface Material {
  id: string
  name: string
  type: MediaType
  url: string
  thumbnailUrl?: string
  size: number
  format: string
  width?: number
  height?: number
  duration?: number
  prompt?: string
  model?: string
  status?: string
  batchTaskId?: string
  csvRowIndex?: number
  createdAt: string
  tags: string[]
  // 视频生成相关字段
  videoGenerationStatus?: VideoGenerationStatus
  videoGenerationProgress?: number
  videoGenerationTaskId?: string
  videoGenerationError?: string
  videoGenerationStartTime?: string
  videoGenerationEndTime?: string
  videoResults?: string[]
}

interface MaterialCardProps {
  material: Material
  isSelected: boolean
  onSelectChange: (selected: boolean) => void
  onPreview: (material: Material) => void
  onVideoGenerate?: (material: Material) => void
  onVideoCancel?: (material: Material) => void
  onShowVideoGenerationDialog?: (material: Material) => void
  showSelection?: boolean
  viewMode?: 'grid' | 'list'
}

export function MaterialCard({
  material,
  isSelected,
  onSelectChange,
  onPreview,
  onVideoGenerate,
  onVideoCancel,
  onShowVideoGenerationDialog,
  showSelection = true,
  viewMode = 'grid'
}: MaterialCardProps) {
  const [imageError, setImageError] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  // 获取视频生成状态信息
  const getVideoGenerationInfo = () => {
    const status = material.videoGenerationStatus || 'idle'
    const progress = material.videoGenerationProgress || 0
    const error = material.videoGenerationError

    // 检查如果有 videoResults 但状态不是 completed，则自动更新状态
    if (material.videoResults && material.videoResults.length > 0 && status !== 'completed') {
      return {
        icon: '✅',
        color: 'bg-green-100 text-green-800',
        text: '已完成',
        showProgress: false
      }
    }

    switch (status) {
      case 'processing':
        return {
          icon: '🔄',
          color: 'bg-blue-100 text-blue-800',
          text: `生成中 ${progress}%`,
          showProgress: true
        }
      case 'completed':
        return {
          icon: '✅',
          color: 'bg-green-100 text-green-800',
          text: '已完成',
          showProgress: false
        }
      case 'failed':
        return {
          icon: '❌',
          color: 'bg-red-100 text-red-800',
          text: error || '生成失败',
          showProgress: false
        }
      case 'cancelled':
        return {
          icon: '⏹️',
          color: 'bg-gray-100 text-gray-800',
          text: '已取消',
          showProgress: false
        }
      default:
        return {
          icon: '',
          color: '',
          text: '',
          showProgress: false
        }
    }
  }

  const videoInfo = getVideoGenerationInfo()

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // 格式化时间
  const formatDuration = (duration?: number) => {
    if (!duration) return ''
    const minutes = Math.floor(duration / 60)
    const seconds = Math.floor(duration % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  // 渲染状态覆盖层
  const renderStatusOverlay = () => {
    // 如果有视频结果但没有完成状态，显示完成状态
    if (material.videoResults && material.videoResults.length > 0 &&
        material.videoGenerationStatus !== 'completed' &&
        material.videoGenerationStatus !== 'processing') {
      return (
        <div className="absolute inset-0 bg-black bg-opacity-40 flex flex-col items-center justify-center rounded-lg">
          <div className="text-white text-center">
            <div className="text-2xl mb-2">✅</div>
            <div className="text-sm font-medium">已完成</div>
            <div className="text-xs text-gray-300 mt-1">
              {material.videoResults.length} 个视频
            </div>
          </div>
        </div>
      )
    }

    if (material.videoGenerationStatus === 'idle' || !material.videoGenerationStatus) {
      return null
    }

    // 如果状态是失败但有视频结果，也显示完成状态
    if (material.videoGenerationStatus === 'failed' &&
        material.videoResults &&
        material.videoResults.length > 0) {
      return (
        <div className="absolute inset-0 bg-black bg-opacity-40 flex flex-col items-center justify-center rounded-lg">
          <div className="text-white text-center">
            <div className="text-2xl mb-2">✅</div>
            <div className="text-sm font-medium">已完成</div>
            <div className="text-xs text-gray-300 mt-1">
              {material.videoResults.length} 个视频
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="absolute inset-0 bg-black bg-opacity-60 flex flex-col items-center justify-center rounded-lg">
        <div className="text-white text-center">
          <div className="text-2xl mb-2">{videoInfo.icon}</div>
          <div className="text-sm font-medium">{videoInfo.text}</div>
          {videoInfo.showProgress && (
            <div className="w-32 mt-2">
              <Progress
                value={material.videoGenerationProgress}
                className="h-2 bg-white bg-opacity-30"
              />
            </div>
          )}
          {material.videoGenerationStatus === 'processing' && onVideoCancel && (
            <Button
              size="sm"
              variant="destructive"
              className="mt-2 text-xs"
              onClick={(e) => {
                e.stopPropagation()
                onVideoCancel(material)
              }}
            >
              取消
            </Button>
          )}
          {material.videoGenerationStatus === 'failed' && (
            <div className="mt-2 text-xs text-gray-300">
              可以尝试重新生成
            </div>
          )}
        </div>
      </div>
    )
  }

  // 渲染网格视图
  const renderGridView = () => (
    <Card className={`group relative overflow-hidden transition-all duration-200 ${
      isSelected ? 'ring-2 ring-blue-500' : ''
    } ${isHovered ? 'shadow-lg transform scale-105' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardContent className="p-0">
        {/* 媒体预览区域 */}
        <div className="relative aspect-square bg-gray-100">
          {/* 选择框 */}
          {showSelection && (
            <div className="absolute top-2 left-2 z-20">
              <div className="relative bg-white rounded-md shadow-lg border-2 border-gray-300 hover:border-blue-400 transition-all duration-200">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={onSelectChange}
                  className="w-5 h-5 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 border-gray-400 rounded cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* 媒体内容 */}
          {material.type === 'image' ? (
            !imageError ? (
              <img
                src={material.thumbnailUrl || material.url}
                alt={material.name}
                className="w-full h-full object-cover cursor-pointer"
                onError={() => setImageError(true)}
                onClick={() => onPreview(material)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <div className="text-2xl mb-1">🖼️</div>
                  <div className="text-xs">图片加载失败</div>
                </div>
              </div>
            )
          ) : (
            <div className="w-full h-full relative">
              <VideoPlayer
                src={material.url}
                thumbnail={material.thumbnailUrl}
                className="w-full h-full object-cover"
                controls={false}
                muted
                onClick={() => onPreview(material)}
              />
            </div>
          )}

          {/* 状态覆盖层 */}
          {renderStatusOverlay()}

          {/* 悬停操作按钮 */}
          {isHovered && material.videoGenerationStatus === 'idle' && onVideoGenerate && (
            <div className="absolute bottom-2 right-2 flex gap-1">
              <Button
                size="sm"
                variant="secondary"
                className="bg-white bg-opacity-90 hover:bg-opacity-100 text-xs"
                onClick={(e) => {
                  e.stopPropagation()
                  if (onShowVideoGenerationDialog) {
                    onShowVideoGenerationDialog(material)
                  } else if (onVideoGenerate) {
                    onVideoGenerate(material)
                  }
                }}
              >
                🎬 生成视频
              </Button>
            </div>
          )}

          {/* 视频结果数量标记 */}
          {material.videoResults && material.videoResults.length > 0 && (
            <div className="absolute top-2 right-2">
              <Badge variant="secondary" className="text-xs">
                🎬 {material.videoResults.length}
              </Badge>
            </div>
          )}
        </div>

        {/* 信息区域 */}
        <div className="p-3">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm truncate" title={material.name}>
                {material.name}
              </h3>
              {material.prompt && (
                <p className="text-xs text-gray-500 mt-1 line-clamp-2" title={material.prompt}>
                  {material.prompt}
                </p>
              )}
            </div>
          </div>

          {/* 标签和元数据 */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {material.type === 'image' ? '🖼️' : '🎬'}
              </Badge>
              <span>{formatFileSize(material.size)}</span>
              {material.duration && (
                <span>{formatDuration(material.duration)}</span>
              )}
            </div>
            <span className="text-xs text-gray-400">
              {new Date(material.createdAt).toLocaleDateString()}
            </span>
          </div>

          {/* 视频生成状态条 */}
          {videoInfo.showProgress && (
            <div className="mt-2">
              <Progress value={material.videoGenerationProgress} className="h-1" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )

  // 渲染列表视图
  const renderListView = () => {
    // 处理行点击事件
    const handleRowClick = (e: React.MouseEvent) => {
      // 检查点击的目标，避免按钮点击触发行选中
      const target = e.target as HTMLElement
      const isButton = target.closest('button')
      const isCheckbox = target.closest('[data-state]')

      if (!isButton && !isCheckbox && showSelection) {
        onSelectChange(!isSelected)
      }
    }

    return (
      <Card
        className={`transition-all duration-200 cursor-pointer ${
          isSelected ? 'ring-2 ring-blue-500 bg-blue-50/50' : ''
        } ${!isSelected ? 'hover:bg-gray-50/80' : ''}`}
        onClick={handleRowClick}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            {/* 选择框 */}
            {showSelection && (
              <div className="relative bg-white rounded-md shadow-md border-2 border-gray-300 hover:border-blue-400 transition-all duration-200" onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={onSelectChange}
                  className="w-5 h-5 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 border-gray-400 rounded cursor-pointer flex-shrink-0"
                />
              </div>
            )}

            {/* 缩略图 */}
            <div className="relative w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
              {material.type === 'image' ? (
                !imageError ? (
                  <img
                    src={material.thumbnailUrl || material.url}
                    alt={material.name}
                    className="w-full h-full object-cover cursor-pointer"
                    onError={() => setImageError(true)}
                    onClick={(e) => {
                      e.stopPropagation()
                      onPreview(material)
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-2xl">
                    🖼️
                  </div>
                )
              ) : (
                <VideoPlayer
                  src={material.url}
                  thumbnail={material.thumbnailUrl}
                  className="w-full h-full object-cover"
                  controls={false}
                  muted
                  onClick={(e) => {
                    e.stopPropagation()
                    onPreview(material)
                  }}
                />
              )}

              {/* 状态覆盖层 */}
              {renderStatusOverlay()}
            </div>

            {/* 信息区域 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm truncate" title={material.name}>
                    {material.name}
                  </h3>
                  {material.prompt && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-1" title={material.prompt}>
                      {material.prompt}
                    </p>
                  )}
                </div>

                {/* 操作按钮 */}
                <div className="flex items-center gap-2 ml-4">
                  {material.videoGenerationStatus === 'idle' && onVideoGenerate && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (onShowVideoGenerationDialog) {
                          onShowVideoGenerationDialog(material)
                        } else if (onVideoGenerate) {
                          onVideoGenerate(material)
                        }
                      }}
                    >
                      🎬 生成视频
                    </Button>
                  )}
                  {material.videoGenerationStatus === 'processing' && onVideoCancel && (
                    <Button
                      size="sm"
                      variant="destructive"
                      className="text-xs"
                      onClick={(e) => {
                        e.stopPropagation()
                        onVideoCancel(material)
                      }}
                    >
                      取消
                    </Button>
                  )}
                </div>
              </div>

              {/* 元数据 */}
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <Badge variant="outline" className="text-xs">
                  {material.type === 'image' ? '🖼️ 图片' : '🎬 视频'}
                </Badge>
                <span>{formatFileSize(material.size)}</span>
                {material.duration && (
                  <span>{formatDuration(material.duration)}</span>
                )}
                <span>{new Date(material.createdAt).toLocaleDateString()}</span>
                {material.videoResults && material.videoResults.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    🎬 {material.videoResults.length} 个视频
                  </Badge>
                )}
              </div>

              {/* 进度条 */}
              {videoInfo.showProgress && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-blue-600">{videoInfo.text}</span>
                    <span className="text-gray-500">{material.videoGenerationProgress}%</span>
                  </div>
                  <Progress value={material.videoGenerationProgress} className="h-1" />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return viewMode === 'grid' ? renderGridView() : renderListView()
}