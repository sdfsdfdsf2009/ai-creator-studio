'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { VariableEditor } from '@/components/variable-editor'
import { Task, MediaType, Variable } from '@/types'

interface TaskFormProps {
  onSubmit: (taskData: {
    type: MediaType
    prompt: string
    model: string
    parameters: Record<string, any>
  }) => void
  onCancel?: () => void
  initialData?: Partial<Task>
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

export function TaskForm({ onSubmit, onCancel, initialData }: TaskFormProps) {
  const [taskType, setTaskType] = useState<MediaType>(initialData?.type || 'image')
  const [prompt, setPrompt] = useState(initialData?.prompt || '')
  const [selectedModel, setSelectedModel] = useState(initialData?.model || '')
  const [parameters, setParameters] = useState<Record<string, any>>(initialData?.parameters || {})
  const [estimatedCost, setEstimatedCost] = useState(0)
  const [variables, setVariables] = useState<Record<string, Variable>>({})
  const [variableValues, setVariableValues] = useState<Record<string, any>>({})

  // 计算预估成本
  const calculateCost = () => {
    // 使用硬编码的成本作为回退
    const models = AI_MODELS[taskType]
    const model = models.find(m => m.id === selectedModel)
    const fallbackCost = model?.cost || 0

    let multiplier = 1

    if (taskType === 'image') {
      multiplier = parameters.quantity || 1
    } else if (taskType === 'video') {
      multiplier = parameters.duration || 5 // 默认5秒
    }

    return fallbackCost * multiplier
  }

  // 更新预估成本
  React.useEffect(() => {
    setEstimatedCost(calculateCost())
  }, [taskType, selectedModel, parameters, calculateCost])

  // 渲染图片生成参数
  const renderImageParameters = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>数量</Label>
          <select
            value={parameters.quantity || 1}
            onChange={(e) => setParameters({ ...parameters, quantity: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border rounded-md"
          >
            <option value={1}>1 张</option>
            <option value={2}>2 张</option>
            <option value={4}>4 张</option>
            <option value={8}>8 张</option>
          </select>
        </div>
        
        <div className="space-y-2">
          <Label>尺寸</Label>
          <select
            value={parameters.size || '1024x1024'}
            onChange={(e) => setParameters({ ...parameters, size: e.target.value })}
            className="w-full px-3 py-2 border rounded-md"
          >
            <option value="512x512">512x512</option>
            <option value="1024x1024">1024x1024</option>
            <option value="1024x1792">1024x1792</option>
            <option value="1792x1024">1792x1024</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>质量</Label>
          <select
            value={parameters.quality || 'standard'}
            onChange={(e) => setParameters({ ...parameters, quality: e.target.value })}
            className="w-full px-3 py-2 border rounded-md"
          >
            <option value="standard">标准</option>
            <option value="high">高质量</option>
          </select>
        </div>
        
        <div className="space-y-2">
          <Label>风格</Label>
          <Input
            value={parameters.style || ''}
            onChange={(e) => setParameters({ ...parameters, style: e.target.value })}
            placeholder="vivid, natural, cinematic..."
          />
        </div>
      </div>
    </div>
  )

  // 渲染视频生成参数
  const renderVideoParameters = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>时长 (秒)</Label>
          <select
            value={parameters.duration || 5}
            onChange={(e) => setParameters({ ...parameters, duration: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border rounded-md"
          >
            <option value={3}>3 秒</option>
            <option value={5}>5 秒</option>
            <option value={10}>10 秒</option>
            <option value={15}>15 秒</option>
          </select>
        </div>
        
        <div className="space-y-2">
          <Label>帧率</Label>
          <select
            value={parameters.fps || 24}
            onChange={(e) => setParameters({ ...parameters, fps: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border rounded-md"
          >
            <option value={12}>12 FPS</option>
            <option value={24}>24 FPS</option>
            <option value={30}>30 FPS</option>
            <option value={60}>60 FPS</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>运动强度</Label>
          <select
            value={parameters.motion || 'medium'}
            onChange={(e) => setParameters({ ...parameters, motion: e.target.value })}
            className="w-full px-3 py-2 border rounded-md"
          >
            <option value="low">低</option>
            <option value="medium">中</option>
            <option value="high">高</option>
            <option value="extreme">极高</option>
          </select>
        </div>
        
        <div className="space-y-2">
          <Label>转场效果</Label>
          <select
            value={parameters.transition || 'none'}
            onChange={(e) => setParameters({ ...parameters, transition: e.target.value })}
            className="w-full px-3 py-2 border rounded-md"
          >
            <option value="none">无</option>
            <option value="fade">淡入淡出</option>
            <option value="slide">滑动</option>
            <option value="zoom">缩放</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>镜头角度</Label>
        <select
          value={parameters.cameraAngle || 'eye-level'}
          onChange={(e) => setParameters({ ...parameters, cameraAngle: e.target.value })}
          className="w-full px-3 py-2 border rounded-md"
        >
          <option value="eye-level">平视</option>
          <option value="high-angle">俯视</option>
          <option value="low-angle">仰视</option>
          <option value="dutch-angle">倾斜</option>
          <option value="bird-eye">鸟瞰</option>
        </select>
      </div>
    </div>
  )

  // 渲染高级参数
  const renderAdvancedParameters = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>种子值 (可选)</Label>
        <Input
          type="number"
          value={parameters.seed || ''}
          onChange={(e) => setParameters({ 
            ...parameters, 
            seed: e.target.value ? parseInt(e.target.value) : undefined 
          })}
          placeholder="随机种子值，用于复现结果"
        />
      </div>

      <div className="space-y-2">
        <Label>负向提示词</Label>
        <textarea
          value={parameters.negativePrompt || ''}
          onChange={(e) => setParameters({ ...parameters, negativePrompt: e.target.value })}
          placeholder="描述不希望出现的内容..."
          className="w-full px-3 py-2 border rounded-md h-20 resize-none"
        />
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="addWatermark"
          checked={parameters.addWatermark || false}
          onChange={(e) => setParameters({ ...parameters, addWatermark: e.target.checked })}
        />
        <Label htmlFor="addWatermark">添加水印</Label>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>基础配置</CardTitle>
          <CardDescription>选择生成类型和基本参数</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>生成类型</Label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setTaskType('image')}
                className={`px-4 py-2 rounded-md border ${
                  taskType === 'image' 
                    ? 'bg-primary text-primary-foreground border-primary' 
                    : 'bg-background border-input'
                }`}
              >
                🎨 图片生成
              </button>
              <button
                type="button"
                onClick={() => setTaskType('video')}
                className={`px-4 py-2 rounded-md border ${
                  taskType === 'video' 
                    ? 'bg-primary text-primary-foreground border-primary' 
                    : 'bg-background border-input'
                }`}
              >
                🎬 视频生成
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>提示词配置</Label>
            <VariableEditor
              initialPrompt={prompt}
              onPromptChange={setPrompt}
              onVariablesChange={setVariables}
              onValuesChange={setVariableValues}
            />
          </div>

          <div className="space-y-2">
            <Label>AI 模型</Label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="">选择一个模型</option>
              {AI_MODELS[taskType].map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name} ({model.provider}) - ${model.cost.toFixed(3)}/次
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {taskType === 'image' && (
        <Card>
          <CardHeader>
            <CardTitle>图片参数</CardTitle>
            <CardDescription>配置图片生成的具体参数</CardDescription>
          </CardHeader>
          <CardContent>
            {renderImageParameters()}
          </CardContent>
        </Card>
      )}

      {taskType === 'video' && (
        <Card>
          <CardHeader>
            <CardTitle>视频参数</CardTitle>
            <CardDescription>配置视频生成的具体参数</CardDescription>
          </CardHeader>
          <CardContent>
            {renderVideoParameters()}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>高级参数</CardTitle>
          <CardDescription>可选的高级配置选项</CardDescription>
        </CardHeader>
        <CardContent>
          {renderAdvancedParameters()}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-center mb-4">
            <span className="font-medium">预估成本</span>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">
                ${estimatedCost.toFixed(4)}
              </div>
              <p className="text-sm text-muted-foreground">
                基于当前参数的预估费用
              </p>
            </div>
          </div>
          
          <div className="flex gap-4">
              <Button
                onClick={() => onSubmit({
                  type: taskType,
                  prompt,
                  model: selectedModel,
                  parameters: {
                ...parameters,
                variables: variables,
                variableValues: variableValues
              }
                })}
              disabled={!prompt || !selectedModel}
              className="flex-1"
              >
                开始生成
              </Button>
              {onCancel && (
          <Button variant="outline" onClick={onCancel}>
          取消
          </Button>
          )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}