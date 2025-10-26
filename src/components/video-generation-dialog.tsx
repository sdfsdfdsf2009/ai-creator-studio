'use client'

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Image } from 'lucide-react'

interface Material {
  id: string
  name: string
  type: 'image' | 'video'
  url: string
  thumbnailUrl?: string
  prompt?: string
  model?: string
  status?: string
  width?: number
  height?: number
}

interface VideoModel {
  modelId: string
  modelName: string
  description?: string
  costPerRequest?: number
  proxyAccountName?: string
  proxyProvider?: string
}

interface VideoGenerationDialogProps {
  isOpen: boolean
  onClose: () => void
  material: Material | null
  availableModels: VideoModel[]
  onGenerate: (material: Material, selectedModel: string) => void
  isGenerating?: boolean
}

export function VideoGenerationDialog({
  isOpen,
  onClose,
  material,
  availableModels,
  onGenerate,
  isGenerating = false
}: VideoGenerationDialogProps) {
  const [selectedModel, setSelectedModel] = useState<string>('')

  // 当对话框打开时，设置默认模型
  React.useEffect(() => {
    if (isOpen && availableModels.length > 0) {
      // 优先选择Sora 2.0，否则选择第一个可用模型
      const sora2Model = availableModels.find(model =>
        model.modelName.toLowerCase().includes('sora 2') ||
        model.modelName.toLowerCase().includes('sora-2')
      )
      const defaultModel = sora2Model || availableModels[0]
      setSelectedModel(defaultModel.modelId)
    }
  }, [isOpen, availableModels])

  const handleGenerate = async () => {
    if (!material || !selectedModel) return

    try {
      // 立即关闭弹窗，不等待异步操作完成
      onGenerate(material, selectedModel)
      onClose()
    } catch (error) {
      console.error('视频生成启动失败:', error)
      // 即使出现错误，也要确保弹窗关闭
      onClose()
    }

    // 保障机制：确保弹窗无论如何都会在短时间后关闭
    setTimeout(() => {
      onClose()
    }, 100)
  }

  const getModelDisplayName = (model: VideoModel) => {
    return model.proxyAccountName
      ? `🔗 ${model.modelName} (${model.proxyAccountName})`
      : model.modelName
  }

  const getModelCost = (model: VideoModel) => {
    const cost = model.costPerRequest || 0
    return cost > 0 ? `${cost.toFixed(3)} 积分/次` : '免费'
  }

  if (!material) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Image className="w-5 h-5" />
            🎬 生成视频
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 素材预览 */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">选择的素材</Label>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-12 h-12 bg-gray-200 rounded overflow-hidden flex-shrink-0">
                <img
                  src={material.thumbnailUrl || material.url}
                  alt={material.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = '/placeholder-image.png'
                  }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{material.name}</p>
                <p className="text-xs text-gray-500">
                  {material.width && material.height && `${material.width}×${material.height}`}
                  {material.prompt && ` • ${material.prompt.slice(0, 50)}${material.prompt.length > 50 ? '...' : ''}`}
                </p>
              </div>
            </div>
          </div>

          {/* 模型选择 */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">参考模型</Label>
            <Select value={selectedModel} onValueChange={setSelectedModel} disabled={isGenerating}>
              <SelectTrigger>
                <SelectValue placeholder="请选择视频生成模型" />
              </SelectTrigger>
              <SelectContent>
                {availableModels.map((model) => (
                  <SelectItem key={model.modelId} value={model.modelId}>
                    <div className="flex flex-col items-start">
                      <div className="flex items-center gap-2">
                        <span>{getModelDisplayName(model)}</span>
                        {model.costPerRequest && model.costPerRequest > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {getModelCost(model)}
                          </Badge>
                        )}
                      </div>
                      {model.description && (
                        <p className="text-xs text-gray-500 mt-1 max-w-[200px] truncate">
                          {model.description}
                        </p>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 选中模型的详细信息 */}
          {selectedModel && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">模型信息</Label>
              {(() => {
                const selectedModelData = availableModels.find(model => model.modelId === selectedModel)
                if (!selectedModelData) return null

                return (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{selectedModelData.modelName}</span>
                      <Badge variant="outline">
                        {getModelCost(selectedModelData)}
                      </Badge>
                    </div>
                    {selectedModelData.description && (
                      <p className="text-xs text-gray-600">{selectedModelData.description}</p>
                    )}
                  </div>
                )
              })()}
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isGenerating}
              className="flex-1"
            >
              取消
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={!selectedModel || isGenerating}
              className="flex-1"
            >
              {isGenerating ? '生成中...' : '开始生成'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}