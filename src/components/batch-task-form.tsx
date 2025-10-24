'use client'

import React, { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { VariableEditor } from '@/components/variable-editor'
import { Variable, MediaType } from '@/types'

interface BatchTaskFormProps {
  onSubmit?: (result: any) => void
  onCancel?: () => void
}

// AI 模型配置
const AI_MODELS = {
  image: [
    { id: 'dall-e-3', name: 'DALL-E 3', provider: 'OpenAI', cost: 0.04 },
    { id: 'midjourney-v6', name: 'MidJourney v6', provider: 'MidJourney', cost: 0.03 },
    { id: 'midjourney-v5.2', name: 'MidJourney v5.2', provider: 'MidJourney', cost: 0.025 },
    { id: 'stable-diffusion-xl', name: 'Stable Diffusion XL', provider: 'Stability AI', cost: 0.01 },
    { id: 'flux-pro', name: 'Flux Pro', provider: 'Flux', cost: 0.03 },
    { id: 'gpt-4o-image', name: 'GPT-4O Image (Nano Banana)', provider: 'Nano Banana', cost: 0.08 },
    { id: 'gemini-2.5-flash-image', name: 'Gemini 2.5 Flash (Nano Banana)', provider: 'Nano Banana', cost: 1.6 },
  ],
  video: [
    { id: 'runway-gen3', name: 'Runway Gen-3', provider: 'Runway', cost: 0.25 },
    { id: 'runway-gen2', name: 'Runway Gen-2', provider: 'Runway', cost: 0.15 },
    { id: 'pika-labs', name: 'Pika Labs', provider: 'Pika', cost: 0.12 },
    { id: 'stable-video', name: 'Stable Video Diffusion', provider: 'Stability AI', cost: 0.08 },
  ]
}

export function BatchTaskForm({ onSubmit, onCancel }: BatchTaskFormProps) {
  const t = useTranslations('batchTasks')
  const [taskType, setTaskType] = useState<MediaType>('image')
  const [batchName, setBatchName] = useState('')
  const [batchDescription, setBatchDescription] = useState('')
  const [basePrompt, setBasePrompt] = useState('')
  // 替换单模型选择为多模型选择
  const [selectedModels, setSelectedModels] = useState<string[]>([])
  const [modelQuantities, setModelQuantities] = useState<Record<string, number>>({})
  const [parameters, setParameters] = useState<Record<string, any>>({})
  const [variables, setVariables] = useState<Record<string, Variable>>({})
  const [variableValues, setVariableValues] = useState<Record<string, any>>({})
  const [estimatedTasks, setEstimatedTasks] = useState(0)
  const [estimatedCost, setEstimatedCost] = useState(0)
  const [costBreakdown, setCostBreakdown] = useState<Record<string, number>>({})
  const [isCreating, setIsCreating] = useState(false)

  // 计算预估任务数量和成本
  const calculateEstimates = () => {
    // 计算多模型的成本分解
    const breakdown: Record<string, number> = {}
    let totalCost = 0
    let totalTasks = 0

    if (Object.keys(variables).length === 0) {
      // 无变量时：计算所有模型数量之和
      selectedModels.forEach(modelId => {
        const model = AI_MODELS[taskType].find(m => m.id === modelId)
        const quantity = modelQuantities[modelId] || 1
        const modelCost = model?.cost || 0.04
        const modelTotalCost = quantity * modelCost

        breakdown[modelId] = modelTotalCost
        totalCost += modelTotalCost
        totalTasks += quantity
      })
    } else {
      // 有变量时：计算变量组合数
      let combinations = 1
      Object.values(variables).forEach(variable => {
        if (variable.type === 'select') {
          combinations *= variable.options?.length || 1
        } else {
          combinations *= 1 // 文本和数字类型通常只有一组值
        }
      })

      selectedModels.forEach(modelId => {
        const model = AI_MODELS[taskType].find(m => m.id === modelId)
        const quantity = modelQuantities[modelId] || 1
        const modelCost = model?.cost || 0.04
        const modelTotalCost = combinations * quantity * modelCost

        breakdown[modelId] = modelTotalCost
        totalCost += modelTotalCost
        totalTasks += combinations * quantity
      })
    }

    setEstimatedTasks(totalTasks)
    setEstimatedCost(totalCost)
    setCostBreakdown(breakdown)
  }

  // 更新预估
  React.useEffect(() => {
    calculateEstimates()
  }, [taskType, selectedModels, modelQuantities, variables])

  // 处理变量变化
  const handleVariablesChange = (newVariables: Record<string, Variable>) => {
    setVariables(newVariables)
  }

  // 处理变量值变化
  const handleVariableValuesChange = (newValues: Record<string, any>) => {
    setVariableValues(newValues)
  }

  // 处理提示词变化
  const handlePromptChange = (newPrompt: string) => {
    setBasePrompt(newPrompt)
  }

  // 切换模型选择
  const toggleModel = (modelId: string, checked: boolean) => {
    if (checked) {
      // 限制最多选择5个模型
      if (selectedModels.length < 5) {
        // 防重复：检查是否已存在该模型
        if (!selectedModels.includes(modelId)) {
          setSelectedModels(prev => [...prev, modelId])
          setModelQuantities(prev => ({ ...prev, [modelId]: 1 }))
        }
      }
    } else {
      setSelectedModels(prev => prev.filter(id => id !== modelId))
      const newQuantities = { ...modelQuantities }
      delete newQuantities[modelId]
      setModelQuantities(newQuantities)
    }
  }

  // 更新模型数量
  const updateModelQuantity = (modelId: string, quantity: number) => {
    setModelQuantities(prev => ({ ...prev, [modelId]: quantity }))
  }

  // 按提供商分组模型
  const getModelsByProvider = () => {
    const models = AI_MODELS[taskType]
    const grouped: Record<string, typeof models> = {}

    models.forEach(model => {
      const provider = model.provider
      if (!grouped[provider]) {
        grouped[provider] = []
      }
      grouped[provider].push(model)
    })

    return grouped
  }

  // 创建批量任务
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!batchName.trim()) {
      alert(t('form.taskName') + ' ' + (typeof window !== 'undefined' ? 'is required' : '不能为空'))
      return
    }

    if (!basePrompt.trim()) {
      alert('Prompt ' + (typeof window !== 'undefined' ? 'is required' : '不能为空'))
      return
    }

    if (selectedModels.length === 0) {
      alert(t('form.aiModel') + ' ' + (typeof window !== 'undefined' ? 'is required' : '不能为空'))
      return
    }

    setIsCreating(true)

    try {
      // 数据验证和清理
      // 去除重复模型
      const uniqueModels = [...new Set(selectedModels)]
      // 验证数量设置
      const validModels = uniqueModels.filter(modelId => {
        const quantity = modelQuantities[modelId] || 1
        return quantity > 0
      })

      // 构建多模型配置
      const models = validModels.map(modelId => ({
        modelId,
        quantity: modelQuantities[modelId] || 1,
        parameters: { ...parameters }
      }))

      console.log('🚀 Creating batch task:', {
        name: batchName.trim(),
        modelCount: validModels.length,
        variableCount: Object.keys(variables).length
      })

      const response = await fetch('/api/batch-tasks/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'create',
          name: batchName.trim(),
          description: batchDescription.trim() || undefined,
          basePrompt,
          mediaType: taskType,
          models,
          variables,
          userValues: variableValues
        })
      })

      console.log('📡 API Response status:', response.status)

      const data = await response.json()

      console.log('📄 API Response data:', data)

      if (!data.success) {
        console.error('❌ Batch task creation failed:', data.error)
        alert('批量任务创建失败: ' + (data.error || '未知错误'))
        throw new Error(data.error || 'Failed to create batch task')
      }

      const result = data.data
      console.log('✅ Batch task created successfully:', result)

      onSubmit?.(result)

      // 重置表单
      setBatchName('')
      setBatchDescription('')
      setBasePrompt('')
      setSelectedModels([])
      setModelQuantities({})
      setParameters({})
      setVariables({})
      setVariableValues({})
      setCostBreakdown({})

    } catch (error) {
      console.error('💥 Batch task creation error:', error)
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')

      // 显示用户友好的错误信息
      const errorMessage = error instanceof Error ? error.message : '网络错误或服务器问题'
      alert('批量任务创建失败:\n' + errorMessage + '\n\n请检查网络连接或稍后重试。')
    } finally {
      setIsCreating(false)
    }
  }

  // 渲染参数配置
  const renderParameters = () => {
    if (taskType === 'image') {
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>图片质量</Label>
            <select
              value={parameters.quality || 'standard'}
              onChange={(e) => setParameters({ ...parameters, quality: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="standard">标准</option>
              <option value="hd">高清</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label>图片尺寸</Label>
            <select
              value={parameters.size || '1024x1024'}
              onChange={(e) => setParameters({ ...parameters, size: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="1024x1024">1024x1024</option>
              <option value="1024x1792">1024x1792 (竖版)</option>
              <option value="1792x1024">1792x1024 (横版)</option>
            </select>
          </div>
        </div>
      )
    } else if (taskType === 'video') {
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>视频时长 (秒)</Label>
            <select
              value={parameters.duration || 5}
              onChange={(e) => setParameters({ ...parameters, duration: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value={3}>3 秒</option>
              <option value={5}>5 秒</option>
              <option value={10}>10 秒</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label>视频质量</Label>
            <select
              value={parameters.quality || 'standard'}
              onChange={(e) => setParameters({ ...parameters, quality: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="standard">标准</option>
              <option value="pro">专业</option>
            </select>
          </div>
        </div>
      )
    }

    return null
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 基本信息 */}
      <Card>
        <CardHeader>
          <CardTitle>{t('config.title')}</CardTitle>
          <CardDescription>
            {t('config.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="batchName">{t('form.taskName')} *</Label>
            <Input
              id="batchName"
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
              placeholder={t('form.taskNamePlaceholder')}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="batchDescription">{t('form.taskDescription')}</Label>
            <Input
              id="batchDescription"
              value={batchDescription}
              onChange={(e) => setBatchDescription(e.target.value)}
              placeholder={t('form.taskDescriptionPlaceholder')}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('form.mediaType')}</Label>
              <select
                value={taskType}
                onChange={(e) => setTaskType(e.target.value as MediaType)}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="image">{t('form.imageGeneration')}</option>
                <option value="video">{t('form.videoGeneration')}</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label>{t('form.aiModel')} (最多选择5个)</Label>
              <div className="space-y-3">
                {Object.entries(getModelsByProvider()).map(([provider, models]) => (
                  <div key={provider} className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">{provider}</h4>
                    <div className="grid grid-cols-1 gap-2">
                      {models.map(model => (
                        <div key={model.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                          <div className="flex items-center space-x-3">
                            <Checkbox
                              id={model.id}
                              checked={selectedModels.includes(model.id)}
                              onCheckedChange={(checked) => toggleModel(model.id, checked as boolean)}
                            />
                            <Label htmlFor={model.id} className="text-sm font-medium cursor-pointer">
                              {model.name}
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500">${model.cost}/次</span>
                            {selectedModels.includes(model.id) && (
                              <div className="flex items-center space-x-1">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => updateModelQuantity(model.id, Math.max(1, (modelQuantities[model.id] || 1) - 1))}
                                  className="h-6 w-6 p-0"
                                >
                                  -
                                </Button>
                                <span className="text-sm font-medium w-8 text-center">
                                  {modelQuantities[model.id] || 1}
                                </span>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => updateModelQuantity(model.id, (modelQuantities[model.id] || 1) + 1)}
                                  className="h-6 w-6 p-0"
                                >
                                  +
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {selectedModels.length === 0 && (
                <p className="text-sm text-gray-500">请至少选择一个AI模型</p>
              )}
            </div>
          </div>

          {/* 参数配置 */}
          {selectedModels.length > 0 && renderParameters()}
        </CardContent>
      </Card>

      {/* 变量编辑器 */}
      <Card>
        <CardHeader>
          <CardTitle>{t('variables.title')}</CardTitle>
          <CardDescription>
            {t('variables.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <VariableEditor
            initialPrompt={basePrompt}
            onPromptChange={handlePromptChange}
            onVariablesChange={handleVariablesChange}
            onValuesChange={handleVariableValuesChange}
          />
        </CardContent>
      </Card>

      {/* 预估信息 */}
      {(selectedModels.length > 0 || Object.keys(variables).length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>{t('estimate.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{estimatedTasks}</div>
                <div className="text-sm text-muted-foreground">{t('estimate.estimatedTasks')}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">${estimatedCost.toFixed(2)}</div>
                <div className="text-sm text-muted-foreground">{t('estimate.estimatedCost')}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {Object.keys(variables).length}
                </div>
                <div className="text-sm text-muted-foreground">{t('estimate.variableCount')}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {selectedModels.length}
                </div>
                <div className="text-sm text-muted-foreground">选择模型数</div>
              </div>
            </div>

            {/* 模型成本分解 */}
            {selectedModels.length > 0 && (
              <div className="mt-6 space-y-3">
                <h4 className="text-sm font-medium text-gray-700 mb-2">成本分解</h4>
                {Object.entries(costBreakdown).map(([modelId, cost]) => {
                  const model = AI_MODELS[taskType].find(m => m.id === modelId)
                  const quantity = modelQuantities[modelId] || 1
                  return (
                    <div key={modelId} className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="text-sm font-medium">{model?.name}</span>
                        <span className="text-xs text-gray-500">×{quantity}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-green-600">${cost.toFixed(2)}</div>
                        <div className="text-xs text-gray-500">
                          {((cost / estimatedCost) * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {estimatedTasks > 10 && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  {t('subtasks.warning').replace('{count}', estimatedTasks.toString())}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 操作按钮 */}
      <div className="flex gap-4">
        <Button
          type="submit"
          disabled={!batchName.trim() || !basePrompt.trim() || selectedModels.length === 0 || isCreating}
          className="flex-1"
        >
          {isCreating ? t('form.creating') : t('form.submit').replace('{count}', estimatedTasks.toString())}
        </Button>

        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            {t('form.cancel')}
          </Button>
        )}
      </div>
    </form>
  )
}