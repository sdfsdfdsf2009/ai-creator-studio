'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { VariableEditor } from '@/components/variable-editor'
import { Task, MediaType, Variable } from '@/types'
import { proxyAccountManager } from '@/lib/client-proxy-account-manager'
import { modelConfigManager } from '@/lib/client-model-config-manager'
import { proxyProviderManager } from '@/lib/ai-providers/proxy'

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
    { id: 'dall-e-2', name: 'DALL-E 2', provider: 'OpenAI', cost: 0.02 },
    { id: 'midjourney-v6', name: 'MidJourney v6', provider: 'MidJourney', cost: 0.03 },
    { id: 'midjourney-v5.2', name: 'MidJourney v5.2', provider: 'MidJourney', cost: 0.025 },
    { id: 'stable-diffusion-xl', name: 'Stable Diffusion XL', provider: 'Stability AI', cost: 0.01 },
    { id: 'stable-diffusion-3', name: 'Stable Diffusion 3', provider: 'Stability AI', cost: 0.04 },
    { id: 'stable-diffusion-2.1', name: 'Stable Diffusion 2.1', provider: 'Stability AI', cost: 0.008 },
    { id: 'flux-pro', name: 'Flux Pro', provider: 'Flux', cost: 0.03 },
    { id: 'flux-schnell', name: 'Flux Schnell', provider: 'Flux', cost: 0.008 },
    { id: 'flux-dev', name: 'Flux Dev', provider: 'Flux', cost: 0.015 },
    { id: 'sdxl-turbo', name: 'SDXL Turbo', provider: 'Stability AI', cost: 0.004 },
    { id: 'gemini-2.5-flash-image', name: 'Gemini 2.5 Flash (Nano Banana)', provider: 'Nano Banana', cost: 1.6 },
    { id: 'gemini-2.0-pro-image', name: 'Gemini 2.0 Pro (Nano Banana)', provider: 'Nano Banana', cost: 2.4 },
    { id: 'ideogram-2.0', name: 'Ideogram 2.0', provider: 'Ideogram', cost: 0.05 },
    { id: 'kandinsky-3.0', name: 'Kandinsky 3.0', provider: 'Sber', cost: 0.01 },
  ],
  video: [
    { id: 'runway-gen3', name: 'Runway Gen-3', provider: 'Runway', cost: 0.25 },
    { id: 'runway-gen2', name: 'Runway Gen-2', provider: 'Runway', cost: 0.15 },
    { id: 'runway-gen3-turbo', name: 'Runway Gen-3 Turbo', provider: 'Runway', cost: 0.20 },
    { id: 'pika-labs', name: 'Pika Labs', provider: 'Pika', cost: 0.12 },
    { id: 'pika-1.5', name: 'Pika 1.5', provider: 'Pika', cost: 0.15 },
    { id: 'stable-video', name: 'Stable Video Diffusion', provider: 'Stability AI', cost: 0.08 },
    { id: 'stable-video-xt', name: 'Stable Video XT', provider: 'Stability AI', cost: 0.10 },
    { id: 'luma-dream-machine', name: 'Luma Dream Machine', provider: 'Luma', cost: 0.12 },
    { id: 'kling-v1', name: 'Kling v1', provider: 'Kling', cost: 0.08 },
    { id: 'sora-1.0', name: 'Sora 1.0', provider: 'OpenAI', cost: 0.50 },
  ]
}

export function TaskForm({ onSubmit, onCancel, initialData }: TaskFormProps) {
  const [taskType, setTaskType] = useState<MediaType>(initialData?.type || 'image')
  const [prompt, setPrompt] = useState(initialData?.prompt || '')
  const [selectedModel, setSelectedModel] = useState(initialData?.model || '')
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [parameters, setParameters] = useState<Record<string, any>>(initialData?.parameters || {})
  const [estimatedCost, setEstimatedCost] = useState(0)
  const [variables, setVariables] = useState<Record<string, Variable>>({})
  const [variableValues, setVariableValues] = useState<Record<string, any>>({})
  const [availableAccounts, setAvailableAccounts] = useState<any[]>([])
  const [availableModels, setAvailableModels] = useState<ModelInfo[]>([])
  const [configuredModels, setConfiguredModels] = useState<any[]>([])
  const [loadingModels, setLoadingModels] = useState(true)

  // 加载可用模型和账号
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingModels(true)

        // 加载可用的代理账号
        const accounts = await proxyAccountManager.getAccounts()
        const enabledAccounts = accounts.filter(account => account.enabled)
        setAvailableAccounts(enabledAccounts)

        // 加载已配置的模型
        const configs = await modelConfigManager.getConfigs({ enabled: true })
        setConfiguredModels(Array.isArray(configs) ? configs : [])

        // 获取所有可能的模型（包含EvoLink模型）
        const allModels = await modelConfigManager.getAllAvailableModels()
        setAvailableModels(allModels)

        // 如果有初始数据中的模型，检查是否还可用
        if (initialData?.model) {
          const isModelConfigured = Array.isArray(configs) && configs.some(c => c.modelName === initialData.model)
          if (!isModelConfigured) {
            console.warn(`Model ${initialData.model} is not configured`)
            setSelectedModel('')
          }
        }

        // 自动选择第一个可用的账号
        if (enabledAccounts.length > 0 && !selectedAccountId) {
          setSelectedAccountId(enabledAccounts[0].id)
        }
      } catch (error) {
        console.error('Failed to load data:', error)
      } finally {
        setLoadingModels(false)
      }
    }

    loadData()
  }, [initialData?.model, selectedAccountId])

  // 当选中的账号改变时，重置模型选择
  useEffect(() => {
    if (selectedAccountId) {
      setSelectedModel('') // 重置模型选择
    }
  }, [selectedAccountId])

  // 当任务类型改变时，重置选中的模型（如果当前模型不支持新的任务类型）
  useEffect(() => {
    if (selectedModel) {
      const model = availableModels.find(m => m.id === selectedModel)
      if (model && model.mediaType !== taskType) {
        setSelectedModel('')
      }
    }
  }, [taskType, selectedModel, availableModels])

  // 计算预估成本
  const calculateCost = () => {
    // 优先使用动态模型信息
    const model = availableModels.find(m => m.id === selectedModel)

    // 如果动态模型中没有找到，回退到硬编码的模型列表
    let fallbackCost = 0
    if (!model) {
      const hardcodedModels = AI_MODELS[taskType]
      const hardcodedModel = hardcodedModels.find(m => m.id === selectedModel)
      fallbackCost = hardcodedModel?.cost || 0
    }

    const baseCost = model?.cost || fallbackCost || 0
    let multiplier = 1

    if (taskType === 'image') {
      multiplier = parameters.quantity || 1
    } else if (taskType === 'video') {
      multiplier = parameters.duration || 5 // 默认5秒
    }

    return baseCost * multiplier
  }

  // 获取当前选中账号和任务类型可用的模型
  const getAvailableModelsForType = () => {
    if (!selectedAccountId) {
      return []
    }

    // 确保configuredModels是数组
    if (!Array.isArray(configuredModels)) {
      return []
    }

    // 1. 获取当前账号配置的模型
    const accountModels = configuredModels.filter(config =>
      config.proxyAccountId === selectedAccountId &&
      config.mediaType === taskType &&
      config.enabled
    )

    // 转换已配置模型为ModelInfo格式
    const configuredModelInfos = accountModels.map(config => {
      const baseModel = availableModels.find(m => m.id === config.modelName)
      return {
        id: config.modelName,
        name: baseModel?.name || config.modelName,
        provider: config.proxyProvider || 'unknown',
        supportedProviders: baseModel?.supportedProviders || [],
        mediaType: config.mediaType,
        cost: config.cost || baseModel?.cost || 0,
        isEvoLink: baseModel?.isEvoLink || baseModel?.provider === 'nano-banana' || config.modelName.includes('evolink')
      }
    })

    // 2. 获取所有EvoLink模型（不管是否已配置）
    const evoLinkModels = availableModels.filter(model =>
      model.isEvoLink &&
      model.mediaType === taskType &&
      !configuredModelInfos.some(configured => configured.id === model.id)
    )

    // 3. 合并已配置模型和EvoLink模型
    const allModels = [...configuredModelInfos, ...evoLinkModels]

    // 4. 按名称排序
    return allModels.sort((a, b) => a.name.localeCompare(b.name))
  }

  // 按供应商分组模型
  const getModelsByProvider = () => {
    const models = getAvailableModelsForType()
    const grouped: Record<string, typeof models> = {}

    models.forEach(model => {
      let provider = model.provider

      // 特殊处理EVoLink.AI模型
      if (model.isEvoLink || provider === 'nano-banana') {
        provider = 'EVoLink.AI'
      }

      if (!grouped[provider]) {
        grouped[provider] = []
      }
      grouped[provider].push(model)
    })

    return grouped
  }

  // 获取供应商的显示名称和样式
  const getProviderInfo = (provider: string) => {
    const providerMap: Record<string, { name: string; color: string; icon: string }> = {
      'EVoLink.AI': { name: 'EVoLink.AI', color: 'text-purple-600', icon: '🔗' },
      'openai': { name: 'OpenAI', color: 'text-green-600', icon: '🤖' },
      'anthropic': { name: 'Anthropic', color: 'text-blue-600', icon: '🧠' },
      'google': { name: 'Google', color: 'text-red-600', icon: '🔍' },
      'custom': { name: 'Custom', color: 'text-gray-600', icon: '⚙️' }
    }

    return providerMap[provider] || { name: provider, color: 'text-gray-600', icon: '📦' }
  }

  // 获取模型状态信息
  const getModelStatus = (modelId: string) => {
    const isConfigured = configuredModels.some(config =>
      config.modelName === modelId && config.enabled
    )

    if (isConfigured) {
      return {
        status: 'configured',
        text: 'Configured',
        color: 'bg-green-500',
        description: 'Configured for this account'
      }
    } else {
      return {
        status: 'unconfigured',
        text: 'Not Configured',
        color: 'bg-gray-500',
        description: 'Not configured for this account'
      }
    }
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

          <div className="space-y-4">
            {/* 账号选择 */}
            <div className="space-y-2">
              <Label>代理账号</Label>
              {loadingModels ? (
                <div className="flex items-center justify-center py-4 border rounded-md">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                  <span className="text-sm text-muted-foreground">Loading accounts...</span>
                </div>
              ) : (
                <>
                  <select
                    value={selectedAccountId || ''}
                    onChange={(e) => setSelectedAccountId(e.target.value || null)}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="">选择一个代理账号</option>
                    {availableAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name} ({proxyAccountManager.getProviderDisplayName(account.provider)})
                      </option>
                    ))}
                  </select>

                  {availableAccounts.length === 0 && (
                    <div className="text-sm text-muted-foreground">
                      No proxy accounts configured.{' '}
                      <a href="/settings/proxy-accounts" className="text-primary underline">
                        Configure accounts here
                      </a>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* 模型选择 */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>AI 模型</Label>
                {selectedModel && (
                  <div className="flex items-center space-x-2">
                    {(() => {
                      const model = getAvailableModelsForType().find(m => m.id === selectedModel)
                      const status = getModelStatus(selectedModel)
                      return (
                        <>
                          <div className={`w-2 h-2 rounded-full ${status.color}`}></div>
                          <span className="text-xs text-muted-foreground">{status.description}</span>
                          {model?.isEvoLink && (
                            <Badge variant="secondary" className="text-xs">
                              🔗 EvoLink.AI
                            </Badge>
                          )}
                        </>
                      )
                    })()}
                  </div>
                )}
              </div>

              {loadingModels || !selectedAccountId ? (
                <div className="flex items-center justify-center py-8 border rounded-md bg-muted/20">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                  <span className="text-sm text-muted-foreground">
                    {selectedAccountId ? 'Loading models...' : '请先选择一个代理账号'}
                  </span>
                </div>
              ) : (
                <>
                  {getAvailableModelsForType().length === 0 ? (
                    <div className="text-center py-8 border rounded-md bg-muted/20">
                      <p className="text-sm text-muted-foreground mb-2">
                        此账号暂未配置{taskType === 'image' ? '图片' : '视频'}模型
                      </p>
                      <a href="/settings/model-configs" className="text-primary underline text-sm">
                        前往配置模型 →
                      </a>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {Object.entries(getModelsByProvider()).map(([provider, models]) => {
                        const providerInfo = getProviderInfo(provider)
                        return (
                          <div key={provider} className="border rounded-lg p-4">
                            <div className="flex items-center mb-3">
                              <span className="text-lg mr-2">{providerInfo.icon}</span>
                              <h4 className={`font-medium ${providerInfo.color}`}>
                                {providerInfo.name}
                              </h4>
                              <Badge variant="outline" className="ml-2">
                                {models.length} 个模型
                              </Badge>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {models.map((model) => (
                                <div
                                  key={model.id}
                                  className={`relative p-3 border rounded-lg cursor-pointer transition-all hover:border-primary/50 hover:shadow-sm ${
                                    selectedModel === model.id
                                      ? 'border-primary bg-primary/5'
                                      : 'border-border bg-background'
                                  }`}
                                  onClick={() => setSelectedModel(model.id)}
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center space-x-2 mb-1">
                                        <h5 className="font-medium text-sm truncate">
                                          {model.name}
                                        </h5>
                                        {model.isEvoLink && (
                                          <Badge variant="secondary" className="text-xs px-1 py-0">
                                            🔗
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        ${model.cost?.toFixed(3) || '0.000'}/次
                                      </div>
                                    </div>
                                    <div className="ml-2">
                                      <div className={`w-3 h-3 rounded-full border-2 ${
                                        selectedModel === model.id
                                          ? 'bg-primary border-primary'
                                          : 'border-muted-foreground'
                                      }`} />
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
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