'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { VariableEditor } from '@/components/variable-editor'
import { Variable, MediaType } from '@/types'
import { createBatchTask } from '@/lib/batch-processor'

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
  const [taskType, setTaskType] = useState<MediaType>('image')
  const [batchName, setBatchName] = useState('')
  const [batchDescription, setBatchDescription] = useState('')
  const [basePrompt, setBasePrompt] = useState('')
  const [selectedModel, setSelectedModel] = useState('')
  const [parameters, setParameters] = useState<Record<string, any>>({})
  const [variables, setVariables] = useState<Record<string, Variable>>({})
  const [variableValues, setVariableValues] = useState<Record<string, any>>({})
  const [estimatedTasks, setEstimatedTasks] = useState(0)
  const [estimatedCost, setEstimatedCost] = useState(0)
  const [isCreating, setIsCreating] = useState(false)

  // 计算预估任务数量和成本
  const calculateEstimates = () => {
    if (Object.keys(variables).length === 0) {
      setEstimatedTasks(1)
      setEstimatedCost(0)
      return
    }

    // 计算可能的组合数量
    let combinations = 1
    Object.values(variables).forEach(variable => {
      if (variable.type === 'select') {
        combinations *= variable.options?.length || 1
      } else {
        combinations *= 1 // 文本和数字类型通常只有一组值
      }
    })

    const model = AI_MODELS[taskType].find(m => m.id === selectedModel)
    const baseCost = model?.cost || 0.04
    const totalCost = combinations * baseCost

    setEstimatedTasks(combinations)
    setEstimatedCost(totalCost)
  }

  // 更新预估
  React.useEffect(() => {
    calculateEstimates()
  }, [taskType, selectedModel, variables])

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

  // 创建批量任务
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!batchName.trim()) {
      alert('请输入批量任务名称')
      return
    }

    if (!basePrompt.trim()) {
      alert('请输入基础提示词')
      return
    }

    if (!selectedModel) {
      alert('请选择AI模型')
      return
    }

    setIsCreating(true)

    try {
      const result = await createBatchTask({
        name: batchName.trim(),
        description: batchDescription.trim() || undefined,
        basePrompt,
        mediaType: taskType,
        model: selectedModel,
        baseParameters: parameters,
        variables,
        userValues: variableValues
      })

      onSubmit?.(result)

      // 重置表单
      setBatchName('')
      setBatchDescription('')
      setBasePrompt('')
      setSelectedModel('')
      setParameters({})
      setVariables({})
      setVariableValues({})

    } catch (error) {
      console.error('创建批量任务失败:', error)
      alert('创建批量任务失败: ' + (error instanceof Error ? error.message : '未知错误'))
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
          <CardTitle>批量任务配置</CardTitle>
          <CardDescription>
            设置批量任务的基本信息和AI模型
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="batchName">任务名称 *</Label>
            <Input
              id="batchName"
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
              placeholder="例如: 职业肖像批量生成"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="batchDescription">任务描述</Label>
            <Input
              id="batchDescription"
              value={batchDescription}
              onChange={(e) => setBatchDescription(e.target.value)}
              placeholder="可选：详细描述这个批量任务的目的"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>媒体类型</Label>
              <select
                value={taskType}
                onChange={(e) => setTaskType(e.target.value as MediaType)}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="image">图片生成</option>
                <option value="video">视频生成</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label>AI模型</Label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                required
              >
                <option value="">请选择模型</option>
                {AI_MODELS[taskType].map(model => (
                  <option key={model.id} value={model.id}>
                    {model.name} ({model.provider}) - ${model.cost}/次
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 参数配置 */}
          {selectedModel && renderParameters()}
        </CardContent>
      </Card>

      {/* 变量编辑器 */}
      <Card>
        <CardHeader>
          <CardTitle>变量配置</CardTitle>
          <CardDescription>
            定义变量来批量生成不同版本的内容
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
      {Object.keys(variables).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>批量预估</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{estimatedTasks}</div>
                <div className="text-sm text-muted-foreground">预估任务数</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">${estimatedCost.toFixed(2)}</div>
                <div className="text-sm text-muted-foreground">预估总成本</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {Object.keys(variables).length}
                </div>
                <div className="text-sm text-muted-foreground">变量数量</div>
              </div>
            </div>

            {estimatedTasks > 10 && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  ⚠️ 注意：这将生成 {estimatedTasks} 个任务，请确认变量配置是否正确
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
          disabled={!batchName.trim() || !basePrompt.trim() || !selectedModel || isCreating}
          className="flex-1"
        >
          {isCreating ? '创建中...' : `创建批量任务 (${estimatedTasks} 个子任务)`}
        </Button>

        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            取消
          </Button>
        )}
      </div>
    </form>
  )
}