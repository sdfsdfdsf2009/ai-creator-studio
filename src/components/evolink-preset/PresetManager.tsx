'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Database, Zap, Play, CheckCircle, XCircle, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react'

interface ModelTemplate {
  id: string
  modelId: string
  modelName: string
  mediaType: 'text' | 'image' | 'video'
  costPerRequest: number
  description: string
  enabled: boolean
  is_builtin: boolean
}

interface ApiResponse {
  success: boolean
  data: {
    templates: ModelTemplate[]
    userModels: any[]
  }
  error?: string
}

function PresetManager() {
  const [models, setModels] = useState<ModelTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // 清除消息
  const clearMessages = () => {
    setError(null)
    setSuccessMessage(null)
  }

  // 加载模型数据
  const loadModels = async () => {
    try {
      setLoading(true)
      clearMessages()

      const response = await fetch('/api/evolink-models')
      const result: ApiResponse = await response.json()

      if (result.success) {
        setModels(result.data.templates)
      } else {
        setError(result.error || 'Failed to load models')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setLoading(false)
    }
  }

  // 批量操作函数
  const performBatchAction = async (action: string) => {
    try {
      setActionLoading(action)
      clearMessages()

      let url = ''
      let method = 'PUT'
      let body: any = undefined
      let actionName = ''

      switch (action) {
        case 'enable':
          url = '/api/evolink-models/batch/enable'
          actionName = '启用所有模型'
          break
        case 'disable':
          url = '/api/evolink-models/batch/disable'
          actionName = '禁用所有模型'
          break
        case 'preset':
          url = '/api/evolink-models/preset/batch'
          method = 'POST'
          body = JSON.stringify({})
          actionName = '预置所有模型'
          break
        case 'text-preset':
          url = '/api/evolink-models/preset/batch'
          method = 'POST'
          body = JSON.stringify({ mediaType: 'text' })
          actionName = '预置文本模型'
          break
        case 'image-preset':
          url = '/api/evolink-models/preset/batch'
          method = 'POST'
          body = JSON.stringify({ mediaType: 'image' })
          actionName = '预置图像模型'
          break
        case 'video-preset':
          url = '/api/evolink-models/preset/batch'
          method = 'POST'
          body = JSON.stringify({ mediaType: 'video' })
          actionName = '预置视频模型'
          break
        default:
          throw new Error(`Unknown action: ${action}`)
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        ...(body && { body }),
      })

      const result = await response.json()

      if (result.success) {
        // 重新加载数据
        await loadModels()

        // 显示成功消息
        let successMsg = result.message || `${actionName}完成`
        if (result.data) {
          const { totalProcessed, presetCount, updatedCount } = result.data
          if (totalProcessed !== undefined) {
            successMsg += ` (处理了 ${totalProcessed} 个模型)`
          }
          if (presetCount || updatedCount) {
            const details = []
            if (presetCount) details.push(`新增 ${presetCount} 个`)
            if (updatedCount) details.push(`更新 ${updatedCount} 个`)
            successMsg += ` - ${details.join(', ')}`
          }
        }
        setSuccessMessage(successMsg)
      } else {
        setError(result.error || `${actionName}失败`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : `网络错误，请检查连接`)
    } finally {
      setActionLoading(null)
    }
  }

  // 组件加载时获取数据
  useEffect(() => {
    loadModels()
  }, [])

  // 计算统计数据
  const stats = {
    total: models.length,
    preset: models.filter(m => m.is_builtin).length,
    enabled: models.filter(m => m.enabled).length,
    disabled: models.filter(m => !m.enabled).length,
    text: models.filter(m => m.mediaType === 'text').length,
    image: models.filter(m => m.mediaType === 'image').length,
    video: models.filter(m => m.mediaType === 'video').length,
  }

  // 按类型分组模型
  const modelsByType = {
    text: models.filter(m => m.mediaType === 'text'),
    image: models.filter(m => m.mediaType === 'image'),
    video: models.filter(m => m.mediaType === 'video'),
  }

  // 获取模型图标
  const getModelIcon = (mediaType: string) => {
    switch (mediaType) {
      case 'text': return '📝'
      case 'image': return '🖼️'
      case 'video': return '🎬'
      default: return '🤖'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        加载中...
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <span className="text-red-700">{error}</span>
        </div>
        <Button onClick={loadModels} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          重试
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 错误和成功消息 */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-red-700">{error}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearMessages}
            className="text-red-500 hover:text-red-700"
          >
            ×
          </Button>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-green-700">{successMessage}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearMessages}
            className="text-green-500 hover:text-green-700"
          >
            ×
          </Button>
        </div>
      )}

      {/* 头部信息 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Database className="h-6 w-6" />
            EvoLink 模型预置中心
          </h2>
          <p className="text-muted-foreground">
            快速预置和管理 EvoLink.AI 模型
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadModels} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>
      </div>

      {/* 预置状态总览 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            预置状态总览
          </CardTitle>
          <CardDescription>
            当前 EvoLink 模型的预置和使用状态
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-sm text-muted-foreground">总模型数</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats.preset}</div>
              <div className="text-sm text-muted-foreground">已预置</div>
            </div>
            <div className="text-center p-4 bg-emerald-50 rounded-lg">
              <div className="text-2xl font-bold text-emerald-600">{stats.enabled}</div>
              <div className="text-sm text-muted-foreground">已启用</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-600">{stats.disabled}</div>
              <div className="text-sm text-muted-foreground">已禁用</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">0</div>
              <div className="text-sm text-muted-foreground">需更新</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">0</div>
              <div className="text-sm text-muted-foreground">有错误</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 批量操作 */}
      <Card>
        <CardHeader>
          <CardTitle>批量操作</CardTitle>
          <CardDescription>
            对所有 EvoLink 模型进行批量管理操作
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => performBatchAction('preset')}
              className="flex items-center gap-2"
              disabled={actionLoading === 'preset'}
            >
              <Play className="h-4 w-4" />
              {actionLoading === 'preset' ? '预置中...' : '预置所有模型'}
            </Button>
            <Button
              onClick={() => performBatchAction('enable')}
              variant="outline"
              className="flex items-center gap-2"
              disabled={actionLoading === 'enable'}
            >
              <CheckCircle className="h-4 w-4" />
              {actionLoading === 'enable' ? '启用中...' : '启用所有模型'}
            </Button>
            <Button
              onClick={() => performBatchAction('disable')}
              variant="outline"
              className="flex items-center gap-2"
              disabled={actionLoading === 'disable'}
            >
              <XCircle className="h-4 w-4" />
              {actionLoading === 'disable' ? '禁用中...' : '禁用所有模型'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 分类预置 */}
      <Card>
        <CardHeader>
          <CardTitle>快速预置</CardTitle>
          <CardDescription>
            按模型类型分类预置 EvoLink 模型
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <span className="text-2xl">📝</span>
                  文本模型
                  <Badge variant="secondary">{stats.text}个</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-sm text-muted-foreground">
                    {modelsByType.text.filter(m => m.is_builtin).length} 个已预置，{modelsByType.text.filter(m => m.enabled).length} 个已启用
                  </div>
                  <Button
                    onClick={() => performBatchAction('text-preset')}
                    className="w-full"
                    disabled={actionLoading === 'text-preset'}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    {actionLoading === 'text-preset' ? '预置中...' : '预置文本模型'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-green-50 border-green-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <span className="text-2xl">🖼️</span>
                  图像模型
                  <Badge variant="secondary">{stats.image}个</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-sm text-muted-foreground">
                    {modelsByType.image.filter(m => m.is_builtin).length} 个已预置，{modelsByType.image.filter(m => m.enabled).length} 个已启用
                  </div>
                  <Button
                    onClick={() => performBatchAction('image-preset')}
                    className="w-full"
                    disabled={actionLoading === 'image-preset'}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    {actionLoading === 'image-preset' ? '预置中...' : '预置图像模型'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-purple-50 border-purple-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <span className="text-2xl">🎬</span>
                  视频模型
                  <Badge variant="secondary">{stats.video}个</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-sm text-muted-foreground">
                    {modelsByType.video.filter(m => m.is_builtin).length} 个已预置，{modelsByType.video.filter(m => m.enabled).length} 个已启用
                  </div>
                  <Button
                    onClick={() => performBatchAction('video-preset')}
                    className="w-full"
                    disabled={actionLoading === 'video-preset'}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    {actionLoading === 'video-preset' ? '预置中...' : '预置视频模型'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* 详细列表 */}
      <Card>
        <CardHeader>
          <CardTitle>模型列表</CardTitle>
          <CardDescription>
            所有 EvoLink 模型的详细状态和配置
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(modelsByType).map(([mediaType, typeModels]) => (
              <div key={mediaType}>
                <div className="text-sm font-medium mb-3">
                  {mediaType === 'text' ? '文本模型' : mediaType === 'image' ? '图像模型' : '视频模型'} ({typeModels.length}个)
                </div>
                {typeModels.map((model) => (
                  <div key={model.id} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center gap-2">
                      <span>{getModelIcon(model.mediaType)}</span>
                      <span className="font-medium">{model.modelName}</span>
                      <span className="text-xs text-muted-foreground">${model.costPerRequest}/请求</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {model.is_builtin && <Badge variant="secondary">预置</Badge>}
                      <Badge variant={model.enabled ? "default" : "outline"}>
                        {model.enabled ? "已启用" : "已禁用"}
                      </Badge>
                    </div>
                  </div>
                ))}
                {typeModels.length === 0 && (
                  <div className="text-center text-muted-foreground py-4">
                    暂无{mediaType === 'text' ? '文本' : mediaType === 'image' ? '图像' : '视频'}模型
                  </div>
                )}
              </div>
            ))}
            {models.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                暂无模型数据，请检查数据库初始化状态
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default PresetManager