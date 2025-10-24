'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Plus, Edit2, Trash2, Save, X, Check, AlertCircle, RefreshCw, Download, Upload } from 'lucide-react'
import { proxyAccountManager } from '@/lib/client-proxy-account-manager'
import { modelConfigManager, ModelInfo } from '@/lib/client-model-config-manager'
import { ModelConfig } from '@/app/api/model-configs/route'

export default function ModelConfigsPage() {
  const [configs, setConfigs] = useState<ModelConfig[]>([])
  const [availableAccounts, setAvailableAccounts] = useState<any[]>([])
  const [availableModels, setAvailableModels] = useState<ModelInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingConfig, setEditingConfig] = useState<ModelConfig | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // 加载配置和可用数据
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)

      // 并行加载所有数据
      const [configsData, accountsData, modelsData] = await Promise.all([
        modelConfigManager.getConfigs(),
        proxyAccountManager.getAccounts(),
        Promise.resolve(modelConfigManager.getAvailableModels())
      ])

      setConfigs(configsData)
      setAvailableAccounts(accountsData.filter(account => account.enabled))
      setAvailableModels(modelsData)
    } catch (error) {
      console.error('Failed to load data:', error)
      setError('加载数据失败')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateConfig = () => {
    const newConfig: ModelConfig = {
      modelName: '',
      mediaType: 'image',
      enabled: true,
      cost: 0,
      settings: {}
    }
    setEditingConfig(newConfig)
  }

  const handleEditConfig = (config: ModelConfig) => {
    setEditingConfig({ ...config })
  }

  const handleSaveConfig = async () => {
    if (!editingConfig?.modelName) {
      setError('请选择模型')
      return
    }

    try {
      setSaving(true)
      setError(null)

      if (editingConfig.id) {
        // 更新现有配置
        const response = await fetch('/api/model-configs', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editingConfig)
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || '更新失败')
        }
      } else {
        // 创建新配置
        const response = await fetch('/api/model-configs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editingConfig)
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || '创建失败')
        }
      }

      setSuccessMessage(editingConfig.id ? '配置更新成功' : '配置创建成功')
      setEditingConfig(null)
      await loadData()

      // 3秒后清除成功消息
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (error) {
      setError(error.message || '保存配置失败')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteConfig = async (configId: string) => {
    if (!confirm('确定要删除这个模型配置吗？')) {
      return
    }

    try {
      const response = await fetch(`/api/model-configs?id=${configId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '删除失败')
      }

      setSuccessMessage('配置删除成功')
      await loadData()
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (error) {
      setError(error.message || '删除配置失败')
    }
  }

  const handleBatchCreateEvoLinkModels = async () => {
    const evoLinkAccount = availableAccounts.find(account => account.provider === 'nano-banana')
    if (!evoLinkAccount) {
      setError('请先配置EVoLink.AI代理账号')
      return
    }

    try {
      setSaving(true)
      setError(null)

      const evoLinkModels = availableModels.filter(model => model.provider === 'nano-banana')
      let successCount = 0
      let errorCount = 0

      for (const model of evoLinkModels) {
        // 检查是否已经配置
        const existingConfig = configs.find(config => config.modelName === model.id)
        if (existingConfig) {
          continue // 跳过已配置的模型
        }

        try {
          const response = await fetch('/api/model-configs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              modelName: model.id,
              proxyAccountId: evoLinkAccount.id,
              mediaType: model.mediaType,
              cost: model.cost || 0,
              enabled: true,
              settings: {}
            })
          })

          if (response.ok) {
            successCount++
          } else {
            errorCount++
          }
        } catch (error) {
          errorCount++
        }
      }

      setSuccessMessage(`批量配置完成：成功 ${successCount} 个，失败 ${errorCount} 个`)
      await loadData()
      setTimeout(() => setSuccessMessage(null), 5000)
    } catch (error) {
      setError(error.message || '批量配置失败')
    } finally {
      setSaving(false)
    }
  }

  const getMediaTypeBadge = (mediaType: string) => {
    const colors = {
      image: 'bg-blue-100 text-blue-800',
      video: 'bg-green-100 text-green-800',
      text: 'bg-purple-100 text-purple-800'
    }
    const labels = {
      image: '图片',
      video: '视频',
      text: '文本'
    }
    return (
      <Badge className={colors[mediaType as keyof typeof colors]}>
        {labels[mediaType as keyof typeof labels]}
      </Badge>
    )
  }

  const getModelInfo = (modelName: string) => {
    return availableModels.find(model => model.id === modelName)
  }

  const getAccountName = (accountId: string) => {
    const account = availableAccounts.find(acc => acc.id === accountId)
    return account?.name || '未知账号'
  }

  const getModelsByMediaType = () => {
    const grouped = {
      image: configs.filter(c => c.mediaType === 'image'),
      video: configs.filter(c => c.mediaType === 'video'),
      text: configs.filter(c => c.mediaType === 'text')
    }
    return grouped
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">加载模型配置中...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">模型配置管理</h1>
          <p className="text-muted-foreground">管理AI模型的配置和启用状态</p>
        </div>
        <div className="flex space-x-2">
          <Button
            onClick={handleBatchCreateEvoLinkModels}
            disabled={saving || !availableAccounts.find(acc => acc.provider === 'nano-banana')}
            variant="outline"
          >
            <Upload className="w-4 h-4 mr-2" />
            {saving ? '配置中...' : '批量配置EVoLink.AI模型'}
          </Button>
          <Button onClick={handleCreateConfig}>
            <Plus className="w-4 h-4 mr-2" />
            添加模型配置
          </Button>
        </div>
      </div>

      {/* 错误和成功消息 */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert>
          <Check className="h-4 w-4" />
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* 统计信息 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">总配置数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{configs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">已启用</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {configs.filter(c => c.enabled).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">图片模型</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {configs.filter(c => c.mediaType === 'image').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">视频模型</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {configs.filter(c => c.mediaType === 'video').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 配置编辑表单 */}
      {editingConfig && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingConfig.id ? '编辑模型配置' : '添加模型配置'}
            </CardTitle>
            <CardDescription>
              配置AI模型的参数和绑定代理账号
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>模型类型</Label>
                <Select
                  value={editingConfig.mediaType}
                  onValueChange={(value: 'image' | 'video' | 'text') =>
                    setEditingConfig({ ...editingConfig, mediaType: value, modelName: '' })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择模型类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="image">图片生成</SelectItem>
                    <SelectItem value="video">视频生成</SelectItem>
                    <SelectItem value="text">文本生成</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>选择模型</Label>
                <Select
                  value={editingConfig.modelName}
                  onValueChange={(value) => {
                    const modelInfo = getModelInfo(value)
                    setEditingConfig({
                      ...editingConfig,
                      modelName: value,
                      cost: modelInfo?.cost || 0
                    })
                  }}
                  disabled={!editingConfig.mediaType}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择AI模型" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableModels
                      .filter(model => model.mediaType === editingConfig.mediaType)
                      .map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.name} (${model.cost?.toFixed(3) || '0.000'}/次)
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>代理账号</Label>
                <Select
                  value={editingConfig.proxyAccountId || ''}
                  onValueChange={(value) =>
                    setEditingConfig({ ...editingConfig, proxyAccountId: value || undefined })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择代理账号" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name} ({account.provider})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>单次成本 ($)</Label>
                <Input
                  type="number"
                  step="0.001"
                  min="0"
                  value={editingConfig.cost}
                  onChange={(e) =>
                    setEditingConfig({ ...editingConfig, cost: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={editingConfig.enabled}
                onCheckedChange={(checked) =>
                  setEditingConfig({ ...editingConfig, enabled: checked })
                }
              />
              <Label>启用此模型</Label>
            </div>

            <div className="flex space-x-2">
              <Button
                onClick={handleSaveConfig}
                disabled={saving || !editingConfig.modelName}
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? '保存中...' : '保存配置'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setEditingConfig(null)}
              >
                <X className="w-4 h-4 mr-2" />
                取消
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 模型配置列表 */}
      <div className="space-y-6">
        {(['image', 'video', 'text'] as const).map((mediaType) => {
          const mediaTypeConfigs = getModelsByMediaType()[mediaType]
          const unconfiguredModels = availableModels
            .filter(model => model.mediaType === mediaType)
            .filter(model => !configs.some(config => config.modelName === model.id))

          return (
            <Card key={mediaType}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <span>{mediaType === 'image' ? '图片' : mediaType === 'video' ? '视频' : '文本'}模型</span>
                      {getMediaTypeBadge(mediaType)}
                    </CardTitle>
                    <CardDescription>
                      已配置 {mediaTypeConfigs.length} 个，未配置 {unconfiguredModels.length} 个
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const unconfigured = unconfiguredModels
                      if (unconfigured.length > 0) {
                        const model = unconfigured[0]
                        setEditingConfig({
                          modelName: model.id,
                          mediaType: model.mediaType,
                          cost: model.cost || 0,
                          enabled: true,
                          settings: {}
                        })
                      }
                    }}
                    disabled={unconfiguredModels.length === 0}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    配置剩余模型
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {mediaTypeConfigs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>暂无{mediaType === 'image' ? '图片' : mediaType === 'video' ? '视频' : '文本'}模型配置</p>
                    <p className="text-sm">点击上方按钮添加模型配置</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {mediaTypeConfigs.map((config) => {
                      const modelInfo = getModelInfo(config.modelName)
                      return (
                        <div key={config.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h4 className="font-medium">
                                {modelInfo?.name || config.modelName}
                              </h4>
                              {getMediaTypeBadge(config.mediaType)}
                              <Badge variant={config.enabled ? 'default' : 'secondary'}>
                                {config.enabled ? '已启用' : '已禁用'}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground space-y-1">
                              <p>代理账号: {getAccountName(config.proxyAccountId || '')}</p>
                              <p>单次成本: ${config.cost?.toFixed(3) || '0.000'}</p>
                              {config.createdAt && (
                                <p>创建时间: {new Date(config.createdAt).toLocaleString()}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditConfig(config)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteConfig(config.id!)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* 未配置的模型列表 */}
                {unconfiguredModels.length > 0 && (
                  <div className="mt-4">
                    <h5 className="text-sm font-medium text-muted-foreground mb-2">未配置的模型:</h5>
                    <div className="flex flex-wrap gap-2">
                      {unconfiguredModels.map((model) => (
                        <Badge
                          key={model.id}
                          variant="outline"
                          className="cursor-pointer hover:bg-accent"
                          onClick={() => setEditingConfig({
                            modelName: model.id,
                            mediaType: model.mediaType,
                            cost: model.cost || 0,
                            enabled: true,
                            settings: {}
                          })}
                        >
                          {model.name} (+${model.cost?.toFixed(3) || '0.000'})
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}