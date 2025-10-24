'use client'

import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import {
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Check,
  AlertCircle,
  RefreshCw,
  Download,
  Upload,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  Settings,
  Globe
} from 'lucide-react'

// 导入预置管理组件
import PresetManager from '@/components/evolink-preset/PresetManager'

// 类型定义
interface EvoLinkTemplate {
  id?: string
  modelId: string
  modelName: string
  mediaType: 'text' | 'image' | 'video'
  costPerRequest?: number
  description?: string
  enabled?: boolean
  is_builtin?: boolean
  defaultEndpointUrl?: string
  endpointUrl?: string // 实际使用的URL（计算得出）
  createdAt?: string
  updatedAt?: string
}

interface UserEvoLinkModel {
  id?: string
  templateId?: string
  modelId: string
  displayName: string
  mediaType: 'text' | 'image' | 'video'
  costPerRequest?: number
  proxyAccountId?: string
  proxyAccountName?: string
  enabled?: boolean
  tested?: boolean
  lastTestedAt?: string
  testResult?: any
  settings?: Record<string, any>
  customEndpointUrl?: string
  endpointUrl?: string // 实际使用的URL（计算得出）
  createdAt?: string
  updatedAt?: string
}

interface ProxyAccount {
  id: string
  name: string
  provider: string
  enabled: boolean
}

export default function EvoLinkModelsPage() {
  const searchParams = useSearchParams()
  const [templates, setTemplates] = useState<EvoLinkTemplate[]>([])
  const [userModels, setUserModels] = useState<UserEvoLinkModel[]>([])
  const [proxyAccounts, setProxyAccounts] = useState<ProxyAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("user-models")

  // 编辑状态
  const [editingTemplate, setEditingTemplate] = useState<EvoLinkTemplate | null>(null)
  const [editingUserModel, setEditingUserModel] = useState<UserEvoLinkModel | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // URL配置相关状态
  const [urlConfigDialogOpen, setUrlConfigDialogOpen] = useState(false)
  const [configuringModel, setConfiguringModel] = useState<EvoLinkTemplate | UserEvoLinkModel | null>(null)
  const [customUrl, setCustomUrl] = useState('')
  const [testingUrl, setTestingUrl] = useState(false)
  const [urlTestResult, setUrlTestResult] = useState<any>(null)

  // 初始化状态
  const [isInitialized, setIsInitialized] = useState(false)
  const [initializing, setInitializing] = useState(false)

  useEffect(() => {
    loadData()
    checkInitializationStatus()

    // 处理URL参数，自动切换到指定标签页
    const tab = searchParams.get('tab')
    if (tab === 'preset' || tab === 'templates' || tab === 'user-models') {
      setActiveTab(tab)
    }
  }, [searchParams])

  const loadData = async () => {
    try {
      setLoading(true)

      const [modelsResponse, accountsResponse] = await Promise.all([
        fetch('/api/evolink-models'),
        fetch('/api/proxy-accounts')
      ])

      if (modelsResponse.ok) {
        const modelsData = await modelsResponse.json()
        if (modelsData.success) {
          setTemplates(modelsData.data.templates || [])
          setUserModels(modelsData.data.userModels || [])
        }
      }

      if (accountsResponse.ok) {
        const accountsData = await accountsResponse.json()
        if (accountsData.success) {
          setProxyAccounts(accountsData.data.filter((acc: ProxyAccount) => acc.enabled))
        }
      }
    } catch (error) {
      console.error('Failed to load data:', error)
      setError('加载数据失败')
    } finally {
      setLoading(false)
    }
  }

  const checkInitializationStatus = async () => {
    try {
      const response = await fetch('/api/evolink-models/init')
      if (response.ok) {
        const data = await response.json()
        setIsInitialized(data.data?.initialized || false)
      }
    } catch (error) {
      console.error('Failed to check initialization status:', error)
    }
  }

  const initializeData = async () => {
    try {
      setInitializing(true)
      const response = await fetch('/api/evolink-models/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: false })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setIsInitialized(true)
          setSuccessMessage(data.message)
          await loadData()
        }
      }
    } catch (error) {
      setError('初始化失败')
    } finally {
      setInitializing(false)
    }
  }

  const saveTemplate = async (template: EvoLinkTemplate) => {
    try {
      setSaving(true)
      const response = await fetch('/api/evolink-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'template',
          data: template
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setSuccessMessage('模板保存成功')
          await loadData()
          setIsDialogOpen(false)
          setEditingTemplate(null)
        }
      }
    } catch (error) {
      setError('保存模板失败')
    } finally {
      setSaving(false)
    }
  }

  const saveUserModel = async (model: UserEvoLinkModel) => {
    try {
      setSaving(true)
      const response = await fetch('/api/evolink-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'user-model',
          data: model
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setSuccessMessage('模型保存成功')
          await loadData()
          setIsDialogOpen(false)
          setEditingUserModel(null)
        }
      }
    } catch (error) {
      setError('保存模型失败')
    } finally {
      setSaving(false)
    }
  }

  const testModel = async (modelId: string, modelType: 'template' | 'user-model', mediaType: 'text' | 'image' | 'video', proxyAccountId?: string) => {
    try {
      setTesting(modelId)
      const response = await fetch('/api/evolink-models/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelId,
          modelType,
          mediaType,
          proxyAccountId
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setSuccessMessage(`测试完成: ${data.data.message}`)
          await loadData()
        }
      }
    } catch (error) {
      setError('测试失败')
    } finally {
      setTesting(null)
    }
  }

  const deleteModel = async (id: string, type: 'template' | 'user-model') => {
    if (!confirm('确定要删除这个模型吗？')) return

    try {
      const response = await fetch(`/api/evolink-models/${id}?type=${type}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setSuccessMessage('删除成功')
          await loadData()
        }
      }
    } catch (error) {
      setError('删除失败')
    }
  }

  const exportData = async () => {
    try {
      const response = await fetch('/api/evolink-models/batch?includeBuiltIn=false&includeTestResults=true')
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `evolink-models-${new Date().toISOString().split('T')[0]}.json`
        a.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      setError('导出失败')
    }
  }

  const importData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const data = JSON.parse(text)

      const response = await fetch('/api/evolink-models/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          overwrite: false
        })
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setSuccessMessage(`导入完成: 模板 ${result.data.templates.imported} 个，用户模型 ${result.data.userModels.imported} 个`)
          await loadData()
        }
      }
    } catch (error) {
      setError('导入失败')
    }
  }

  // URL配置相关函数
  const openUrlConfigDialog = (model: EvoLinkTemplate | UserEvoLinkModel) => {
    setConfiguringModel(model)
    setCustomUrl(model.customEndpointUrl || '')
    setUrlTestResult(null)
    setUrlConfigDialogOpen(true)
  }

  const closeUrlConfigDialog = () => {
    setUrlConfigDialogOpen(false)
    setConfiguringModel(null)
    setCustomUrl('')
    setUrlTestResult(null)
  }

  const testUrl = async (url: string) => {
    setTestingUrl(true)
    setUrlTestResult(null)

    try {
      const response = await fetch('/api/evolink-models/test-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      })

      const result = await response.json()
      if (result.success) {
        setUrlTestResult(result.data)
      }
    } catch (error) {
      setUrlTestResult({
        success: false,
        error: 'Failed to test URL',
        timestamp: new Date().toISOString()
      })
    } finally {
      setTestingUrl(false)
    }
  }

  const saveUrlConfig = async () => {
    if (!configuringModel) return

    try {
      const modelId = configuringModel.modelId
      const isTemplate = 'is_builtin' in configuringModel

      let response
      if (isTemplate) {
        response = await fetch(`/api/evolink-models/${configuringModel.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...configuringModel,
            endpointUrl: customUrl || undefined
          })
        })
      } else {
        response = await fetch(`/api/evolink-models/${configuringModel.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...configuringModel,
            customEndpointUrl: customUrl || undefined
          })
        })
      }

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setSuccessMessage('URL配置保存成功')
          await loadData()
          closeUrlConfigDialog()
        }
      }
    } catch (error) {
      setError('保存URL配置失败')
    }
  }

  const getMediaTypeColor = (mediaType: string) => {
    switch (mediaType) {
      case 'text': return 'bg-blue-100 text-blue-800'
      case 'image': return 'bg-green-100 text-green-800'
      case 'video': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTestStatusIcon = (model: UserEvoLinkModel) => {
    if (!model.tested) return <Clock className="h-4 w-4 text-gray-500" />
    if (model.testResult?.success) return <CheckCircle className="h-4 w-4 text-green-500" />
    return <XCircle className="h-4 w-4 text-red-500" />
  }

  // 获取模型URL
  const getModelUrl = (template: EvoLinkTemplate, customUrl?: string) => {
    if (customUrl) return customUrl
    if (template.endpointUrl) return template.endpointUrl

    // 默认EvoLink URL
    const baseUrl = 'https://api.evolink.ai/v1'
    switch (template.mediaType) {
      case 'text': return `${baseUrl}/chat/completions`
      case 'image': return `${baseUrl}/images/generations`
      case 'video': return `${baseUrl}/videos/generations`
      default: return baseUrl
    }
  }

  // 获取URL状态颜色
  const getUrlStatusColor = (customUrl?: string) => {
    if (customUrl) return 'bg-orange-100 text-orange-800'
    return 'bg-gray-100 text-gray-800'
  }

  // 截断URL显示
  const truncateUrl = (url: string, maxLength: number = 40) => {
    if (url.length <= maxLength) return url
    return url.substring(0, maxLength) + '...'
  }

  if (!isInitialized) {
    return (
      <div className="container mx-auto p-6">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              EvoLink.AI模型数据未初始化
            </CardTitle>
            <CardDescription>
              系统检测到EvoLink.AI模型数据尚未初始化。点击下方按钮来初始化默认的模型配置。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={initializeData}
              disabled={initializing}
              className="w-full"
            >
              {initializing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  初始化中...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  初始化EvoLink.AI数据
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">EvoLink.AI 模型管理</h1>
          <p className="text-muted-foreground">管理EvoLink.AI模型配置和测试连接</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={exportData}>
            <Download className="mr-2 h-4 w-4" />
            导出
          </Button>
          <Button variant="outline" asChild>
            <label className="cursor-pointer">
              <Upload className="mr-2 h-4 w-4" />
              导入
              <input
                type="file"
                accept=".json"
                onChange={importData}
                className="hidden"
              />
            </label>
          </Button>
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            刷新
          </Button>
        </div>
      </div>

      {error && (
        <Alert className="mb-6 border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">{error}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert className="mb-6 border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">{successMessage}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="user-models">我的模型</TabsTrigger>
          <TabsTrigger value="templates">模型模板</TabsTrigger>
          <TabsTrigger value="preset">预置管理</TabsTrigger>
        </TabsList>

        <TabsContent value="user-models">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>用户自定义模型</CardTitle>
                  <CardDescription>您配置的EvoLink.AI模型，支持测试和管理</CardDescription>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => setEditingUserModel({
                      modelId: '',
                      displayName: '',
                      mediaType: 'text',
                      enabled: true
                    })}>
                      <Plus className="mr-2 h-4 w-4" />
                      添加模型
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>{editingUserModel?.id ? '编辑模型' : '添加新模型'}</DialogTitle>
                      <DialogDescription>
                        配置EvoLink.AI模型的基本信息和参数
                      </DialogDescription>
                    </DialogHeader>
                    {editingUserModel && (
                      <UserModelForm
                        model={editingUserModel}
                        proxyAccounts={proxyAccounts}
                        onSave={saveUserModel}
                        onCancel={() => {
                          setIsDialogOpen(false)
                          setEditingUserModel(null)
                        }}
                        saving={saving}
                      />
                    )}
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">加载中...</div>
              ) : userModels.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Settings className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>暂无用户模型</p>
                  <p className="text-sm">点击上方"添加模型"按钮开始配置</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {userModels.map((model) => (
                    <div key={model.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold">{model.displayName}</h3>
                            <Badge className={getMediaTypeColor(model.mediaType)}>
                              {model.mediaType}
                            </Badge>
                            <Badge variant="outline">{model.modelId}</Badge>
                            {getTestStatusIcon(model)}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {model.proxyAccountName && `代理账户: ${model.proxyAccountName}`}
                            {model.costPerRequest && ` • 成本: $${model.costPerRequest}/请求`}
                          </p>
                          <div className="text-xs text-muted-foreground mb-2 p-2 bg-muted/50 rounded-md">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">API端点:</span>
                              <div className="flex items-center gap-1">
                                {getModelUrl(model) ? (
                                  <>
                                    <Globe className="h-3 w-3 text-green-600" />
                                    <span className="text-green-600">
                                      {model.customEndpointUrl ? '自定义' : '默认'}
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <AlertCircle className="h-3 w-3 text-orange-500" />
                                    <span className="text-orange-500">未配置</span>
                                  </>
                                )}
                              </div>
                            </div>
                            {getModelUrl(model) && (
                              <div className="mt-1 font-mono text-xs break-all">
                                {truncateUrl(getModelUrl(model)!, 40)}
                              </div>
                            )}
                          </div>
                          {model.lastTestedAt && (
                            <p className="text-xs text-muted-foreground">
                              最后测试: {new Date(model.lastTestedAt).toLocaleString()}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Switch
                            checked={model.enabled}
                            onCheckedChange={async (enabled) => {
                              const response = await fetch(`/api/evolink-models/${model.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  type: 'user-model',
                                  data: { enabled }
                                })
                              })
                              if (response.ok) await loadData()
                            }}
                          />

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => testModel(model.modelId, 'user-model', model.mediaType, model.proxyAccountId)}
                            disabled={testing === model.id}
                          >
                            {testing === model.id ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingUserModel(model)
                              setIsDialogOpen(true)
                            }}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openUrlConfigDialog(model)}
                            title="配置API端点URL"
                          >
                            <Settings className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteModel(model.id!, 'user-model')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle>模型模板库</CardTitle>
              <CardDescription>系统内置的EvoLink.AI模型模板，可以用作参考或复制</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">加载中...</div>
              ) : (
                <div className="space-y-4">
                  {templates.map((template) => (
                    <div key={template.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold">{template.modelName}</h3>
                            <Badge className={getMediaTypeColor(template.mediaType)}>
                              {template.mediaType}
                            </Badge>
                            <Badge variant="outline">{template.modelId}</Badge>
                            {template.is_builtin && (
                              <Badge variant="secondary">内置</Badge>
                            )}
                          </div>
                          {template.description && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {template.description}
                            </p>
                          )}
                          {template.costPerRequest && (
                            <p className="text-sm text-muted-foreground">
                              成本: ${template.costPerRequest}/请求
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Switch
                            checked={template.enabled}
                            onCheckedChange={async (enabled) => {
                              const response = await fetch(`/api/evolink-models/${template.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  type: 'template',
                                  data: { enabled }
                                })
                              })
                              if (response.ok) await loadData()
                            }}
                          />

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => testModel(template.modelId, 'template', template.mediaType)}
                            disabled={testing === template.modelId}
                          >
                            {testing === template.modelId ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openUrlConfigDialog(template)}
                            title="配置API端点URL"
                          >
                            <Settings className="h-4 w-4" />
                          </Button>

                          {!template.is_builtin && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteModel(template.id!, 'template')}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preset">
          <PresetManager />
        </TabsContent>
      </Tabs>

      {/* URL配置对话框 */}
      <Dialog open={urlConfigDialogOpen} onOpenChange={setUrlConfigDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>配置API端点URL</DialogTitle>
            <DialogDescription>
              为模型 {configuringModel?.modelName || configuringModel?.displayName} 配置自定义API端点URL
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="customUrl">自定义API端点URL</Label>
              <Input
                id="customUrl"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="例如: https://api.evolink.ai/v1/chat/completions"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                留空则使用默认端点。不同媒体类型有不同的默认端点：
                <br />
                • 文本模型: /v1/chat/completions
                <br />
                • 图片模型: /v1/images/generations
                <br />
                • 视频模型: /v1/videos/generations
              </p>
            </div>

            {customUrl && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => testUrl()}
                    disabled={testingUrl || !customUrl}
                  >
                    {testingUrl ? (
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Play className="h-4 w-4 mr-2" />
                    )}
                    测试连通性
                  </Button>

                  <span className="text-sm text-muted-foreground">
                    测试URL的可用性和响应时间
                  </span>
                </div>

                {urlTestResult && (
                  <div className={`p-3 rounded-md text-sm ${
                    urlTestResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">
                        {urlTestResult.success ? '✅ 连接成功' : '❌ 连接失败'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(urlTestResult.timestamp).toLocaleString()}
                      </span>
                    </div>

                    {urlTestResult.success ? (
                      <div className="space-y-1">
                        <div>状态码: {urlTestResult.statusCode}</div>
                        <div>响应时间: {urlTestResult.responseTime}ms</div>
                        <div>URL: {urlTestResult.url}</div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div>错误: {urlTestResult.error}</div>
                        <div>响应时间: {urlTestResult.responseTime}ms</div>
                        <div>URL: {urlTestResult.url}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>当前配置</Label>
              <div className="p-3 bg-muted/50 rounded-md text-sm space-y-1">
                <div>
                  <span className="font-medium">模型:</span> {configuringModel?.modelName || configuringModel?.displayName}
                </div>
                <div>
                  <span className="font-medium">类型:</span> {configuringModel?.mediaType}
                </div>
                <div>
                  <span className="font-medium">默认URL:</span>
                  <div className="font-mono text-xs break-all mt-1">
                    {configuringModel && getDefaultEndpointUrl(configuringModel.mediaType)}
                  </div>
                </div>
                {configuringModel?.customEndpointUrl && (
                  <div>
                    <span className="font-medium">当前自定义URL:</span>
                    <div className="font-mono text-xs break-all mt-1">
                      {configuringModel.customEndpointUrl}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUrlConfigDialogOpen(false)}
            >
              取消
            </Button>
            <Button
              onClick={() => saveUrlConfig()}
              disabled={saving}
            >
              {saving ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  保存配置
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// 用户模型表单组件
function UserModelForm({
  model,
  proxyAccounts,
  onSave,
  onCancel,
  saving
}: {
  model: UserEvoLinkModel
  proxyAccounts: ProxyAccount[]
  onSave: (model: UserEvoLinkModel) => void
  onCancel: () => void
  saving: boolean
}) {
  const [formData, setFormData] = useState<UserEvoLinkModel>(model)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="modelId">模型ID</Label>
          <Input
            id="modelId"
            value={formData.modelId}
            onChange={(e) => setFormData({ ...formData, modelId: e.target.value })}
            placeholder="例如: gemini-2.5-flash-text"
            required
          />
        </div>

        <div>
          <Label htmlFor="displayName">显示名称</Label>
          <Input
            id="displayName"
            value={formData.displayName}
            onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
            placeholder="例如: Gemini 2.5 Flash (文本)"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="mediaType">媒体类型</Label>
          <Select
            value={formData.mediaType}
            onValueChange={(value: 'text' | 'image' | 'video') =>
              setFormData({ ...formData, mediaType: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">文本生成</SelectItem>
              <SelectItem value="image">图片生成</SelectItem>
              <SelectItem value="video">视频生成</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="proxyAccountId">代理账户</Label>
          <Select
            value={formData.proxyAccountId || ''}
            onValueChange={(value) => setFormData({ ...formData, proxyAccountId: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="选择代理账户" />
            </SelectTrigger>
            <SelectContent>
              {proxyAccounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name} ({account.provider})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="costPerRequest">每次请求成本（美元）</Label>
        <Input
          id="costPerRequest"
          type="number"
          step="0.001"
          min="0"
          value={formData.costPerRequest || ''}
          onChange={(e) => setFormData({ ...formData, costPerRequest: parseFloat(e.target.value) || undefined })}
          placeholder="0.001"
        />
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="enabled"
          checked={formData.enabled}
          onCheckedChange={(enabled) => setFormData({ ...formData, enabled })}
        />
        <Label htmlFor="enabled">启用此模型</Label>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              保存中...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              保存
            </>
          )}
        </Button>
      </div>
    </form>
  )
}

// 获取默认端点URL函数
function getDefaultEndpointUrl(mediaType: 'text' | 'image' | 'video'): string {
  const baseUrl = 'https://api.evolink.ai/v1'

  switch (mediaType) {
    case 'text':
      return `${baseUrl}/chat/completions`
    case 'image':
      return `${baseUrl}/images/generations`
    case 'video':
      return `${baseUrl}/videos/generations`
    default:
      return baseUrl
  }
}