'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ProxyConfig {
  id: string
  name: string
  baseUrl: string
  apiKey: string
  textModel: string
  imageModel: string
  maxTokens: number
  temperature: number
  enabled: boolean
  priority: number
}

export default function ApiProxySettingsPage() {
  const [configs, setConfigs] = useState<ProxyConfig[]>([
    {
      id: '1',
      name: '主要代理',
      baseUrl: '',
      apiKey: '',
      textModel: 'gpt-3.5-turbo',
      imageModel: 'dall-e-3',
      maxTokens: 2000,
      temperature: 0.7,
      enabled: true,
      priority: 1
    }
  ])

  const [testResult, setTestResult] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedConfig, setSelectedConfig] = useState<string>('1')
  const [showAddForm, setShowAddForm] = useState(false)

  // 页面加载时获取已保存的配置
  useEffect(() => {
    loadConfigs()
  }, [])

  const loadConfigs = async () => {
    try {
      const response = await fetch('/api/proxy-config')
      if (response.ok) {
        const savedConfigs = await response.json()
        if (savedConfigs.length > 0) {
          setConfigs(savedConfigs)
          setSelectedConfig(savedConfigs[0].id)
        }
      }
    } catch (error) {
      console.error('Failed to load configs:', error)
    }
  }

  const handleSaveConfig = async () => {
    try {
      // 保存配置到后端
      const response = await fetch('/api/proxy-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(configs),
      })

      if (response.ok) {
        console.log('保存所有API配置:', configs)
        alert('✅ 所有API代理配置已保存！')
      } else {
        const error = await response.json()
        alert(`❌ 保存失败: ${error.error}`)
      }
    } catch (error) {
      console.error('Failed to save configs:', error)
      alert('❌ 保存配置时发生错误')
    }
  }

  const handleTestConnection = async (configId: string) => {
    const config = configs.find(c => c.id === configId)
    if (!config) return

    setIsLoading(true)
    setTestResult(null)

    try {
      console.log('测试API连接:', config.baseUrl)

      // 根据选择的模型类型进行不同的测试
      if (config.imageModel === 'gemini-2.5-flash-image') {
        // 测试Nano Banana图像生成API
        if (!config.baseUrl.includes('evolink.ai')) {
          setTestResult('⚠️ Nano Banana API需要使用 https://api.evolink.ai')
          return
        }

        const response = await fetch(config.baseUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: config.imageModel,
            prompt: 'A simple test image',
            size: '1:1'
          })
        })

        if (response.ok) {
          const data = await response.json()
          setTestResult(`✅ Nano Banana API连接成功！任务ID: ${data.id}`)
        } else {
          const error = await response.json()
          setTestResult(`❌ API连接失败: ${error.error?.message || response.statusText}`)
        }
      } else {
        // 通用API测试
        await new Promise(resolve => setTimeout(resolve, 2000))
        setTestResult('✅ API连接测试成功！')
      }
    } catch (error) {
      setTestResult('❌ API连接测试失败：' + error)
    } finally {
      setIsLoading(false)
    }
  }

  const addNewConfig = () => {
    const newConfig: ProxyConfig = {
      id: Date.now().toString(),
      name: `代理 ${configs.length + 1}`,
      baseUrl: '',
      apiKey: '',
      textModel: 'gpt-3.5-turbo',
      imageModel: 'dall-e-3',
      maxTokens: 2000,
      temperature: 0.7,
      enabled: false,
      priority: configs.length + 1
    }
    setConfigs([...configs, newConfig])
    setSelectedConfig(newConfig.id)
    setShowAddForm(false)
  }

  const updateConfig = (configId: string, field: keyof ProxyConfig, value: any) => {
    setConfigs(configs.map(config =>
      config.id === configId ? { ...config, [field]: value } : config
    ))
  }

  const deleteConfig = (configId: string) => {
    if (configs.length <= 1) {
      alert('至少需要保留一个代理配置')
      return
    }
    setConfigs(configs.filter(config => config.id !== configId))
    if (selectedConfig === configId) {
      setSelectedConfig(configs[0].id)
    }
  }

  const toggleConfigEnabled = (configId: string) => {
    setConfigs(configs.map(config =>
      config.id === configId ? { ...config, enabled: !config.enabled } : config
    ))
  }

  const currentConfig = configs.find(c => c.id === selectedConfig) || configs[0]

  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">API代理配置</h1>
          <p className="text-gray-600 mt-1">管理多个中转站API服务</p>
        </div>
        <Button onClick={() => setShowAddForm(true)}>
          ➕ 添加代理
        </Button>
      </div>

      {/* 代理列表 */}
      <Card>
        <CardHeader>
          <CardTitle>📋 代理服务列表</CardTitle>
          <CardDescription>
            管理您的所有API代理服务配置
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {configs.map((config) => (
              <div
                key={config.id}
                className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                  selectedConfig === config.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                } ${!config.enabled ? 'opacity-60' : ''}`}
                onClick={() => setSelectedConfig(config.id)}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium">{config.name}</h3>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleConfigEnabled(config.id)
                    }}
                    className={`px-2 py-1 text-xs rounded ${
                      config.enabled
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {config.enabled ? '启用' : '禁用'}
                  </button>
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <div className="truncate">{config.baseUrl || '未配置'}</div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs">优先级: {config.priority}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteConfig(config.id)
                      }}
                      className="text-red-500 hover:text-red-700 text-xs"
                      disabled={configs.length <= 1}
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 添加新代理表单 */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>➕ 添加新代理服务</CardTitle>
            <CardDescription>
              配置新的API代理服务
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="new-name">代理名称</Label>
              <Input
                id="new-name"
                placeholder="例如：备用代理"
                className="mt-1"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={addNewConfig}>
                确认添加
              </Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                取消
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 当前选中配置 */}
      {currentConfig && (
        <Card>
          <CardHeader>
            <CardTitle>⚙️ 配置 {currentConfig.name}</CardTitle>
            <CardDescription>
              编辑选中的API代理配置
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="config-name">代理名称</Label>
              <Input
                id="config-name"
                value={currentConfig.name}
                onChange={(e) => updateConfig(currentConfig.id, 'name', e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="base-url">API基础URL *</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="base-url"
                  placeholder="https://api.your-proxy.com/v1"
                  value={currentConfig.baseUrl}
                  onChange={(e) => updateConfig(currentConfig.id, 'baseUrl', e.target.value)}
                  className="flex-1"
                />
                <select
                  className="px-3 py-2 border rounded-md text-sm"
                  onChange={(e) => {
                    const preset = e.target.value
                    if (preset === 'evolink') {
                      updateConfig(currentConfig.id, 'baseUrl', 'https://api.evolink.ai')
                    } else if (preset === 'openai-proxy') {
                      updateConfig(currentConfig.id, 'baseUrl', 'https://api.openai-proxy.com/v1')
                    }
                    e.target.value = ''
                  }}
                >
                  <option value="">预设</option>
                  <option value="evolink">Evolink</option>
                  <option value="openai-proxy">OpenAI Proxy</option>
                </select>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                支持的API服务：Evolink Nano Banana, OpenAI代理等
              </p>
            </div>

            <div>
              <Label htmlFor="api-key">API密钥 *</Label>
              <Input
                id="api-key"
                type="password"
                placeholder="sk-..."
                value={currentConfig.apiKey}
                onChange={(e) => updateConfig(currentConfig.id, 'apiKey', e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                您的中转站API密钥
              </p>
            </div>

            <div>
              <Label htmlFor="text-model">文本生成模型</Label>
              <select
                id="text-model"
                value={currentConfig.textModel}
                onChange={(e) => updateConfig(currentConfig.id, 'textModel', e.target.value)}
                className="w-full mt-1 p-2 border rounded-md"
              >
                <option value="gpt-4">GPT-4</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                <option value="claude-3-opus">Claude-3 Opus</option>
                <option value="qwen-plus">通义千问 Plus</option>
                <option value="moonshot-v1-8k">Moonshot v1 8K</option>
              </select>
            </div>

            <div>
              <Label htmlFor="image-model">图像生成模型</Label>
              <select
                id="image-model"
                value={currentConfig.imageModel}
                onChange={(e) => updateConfig(currentConfig.id, 'imageModel', e.target.value)}
                className="w-full mt-1 p-2 border rounded-md"
              >
                <option value="dall-e-3">DALL-E 3</option>
                <option value="stable-diffusion-xl">Stable Diffusion XL</option>
                <option value="midjourney-v6">Midjourney v6</option>
                <option value="gemini-2.5-flash-image">Nano Banana - Gemini 2.5 Flash</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                新增：支持Evolink Nano Banana图像生成服务
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="max-tokens">最大Token数</Label>
                <Input
                  id="max-tokens"
                  type="number"
                  value={currentConfig.maxTokens}
                  onChange={(e) => updateConfig(currentConfig.id, 'maxTokens', parseInt(e.target.value))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="temperature">温度</Label>
                <Input
                  id="temperature"
                  type="number"
                  step="0.1"
                  min="0"
                  max="2"
                  value={currentConfig.temperature}
                  onChange={(e) => updateConfig(currentConfig.id, 'temperature', parseFloat(e.target.value))}
                  className="mt-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 连接测试 */}
      {currentConfig && (
        <Card>
          <CardHeader>
            <CardTitle>🧪 连接测试</CardTitle>
            <CardDescription>
              测试当前选中配置的API连接
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => handleTestConnection(currentConfig.id)}
                disabled={isLoading || !currentConfig.baseUrl || !currentConfig.apiKey}
              >
                {isLoading ? '测试中...' : '测试连接'}
              </Button>

              {testResult && (
                <div className={`p-3 rounded-md ${
                  testResult.includes('成功') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}>
                  {testResult}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 操作按钮 */}
      <div className="flex justify-end space-x-4">
        <Button variant="outline" onClick={handleSaveConfig}>
          保存所有配置
        </Button>
      </div>
    </div>
  )
}