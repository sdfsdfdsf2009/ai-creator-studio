'use client'

import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// 设置类型
export interface AIProvider {
  name: string
  enabled: boolean
  apiKey: string
  baseUrl: string
  timeout: number
  models: Record<string, {
    enabled: boolean
    cost: number
  }>
}

export interface Settings {
  aiProviders: {
    openai: AIProvider
    stability: AIProvider
    runway: AIProvider
    pika: AIProvider
    custom: AIProvider
  }
  general: {
    language: string
    theme: string
    autoSave: boolean
    notifications: boolean
    defaultImageModel: string
    defaultVideoModel: string
  }
  storage: {
    type: string
    path: string
    maxSize: string
  }
}

// 设置API
const settingsApi = {
  getSettings: () => fetch('/api/settings').then(res => res.json()),
  updateSettings: (settings: Partial<Settings>) =>
    fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    }).then(res => res.json()),
  testConnection: (providerKey: string) =>
    fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providerKey, testType: 'connection' }),
    }).then(res => res.json()),
}

// 获取设置
export function useSettings() {
  const query = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.getSettings,
    refetchOnWindowFocus: false,
  })

  return query
}

// 更新设置
export function useUpdateSettings() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: settingsApi.updateSettings,
  })

  React.useEffect(() => {
    if (mutation.data?.success) {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    }
  }, [mutation.data, queryClient])

  return mutation
}

// 测试连接
export function useTestConnection() {
  const mutation = useMutation({
    mutationFn: ({ providerKey }: { providerKey: string }) =>
      settingsApi.testConnection(providerKey),
  })

  return mutation
}

// 设置验证Hook
export function useSettingsValidation() {
  const validateSettings = (settings: Settings): { isValid: boolean; errors: string[] } => {
    const errors: string[] = []

    // 验证启用的提供商
    Object.entries(settings.aiProviders).forEach(([providerKey, provider]) => {
      if (provider.enabled) {
        if (!provider.apiKey) {
          errors.push(`${provider.name} 启用但缺少API密钥`)
        }
        if (providerKey === 'custom' && !provider.baseUrl) {
          errors.push('自定义服务启用但缺少基础URL')
        }
      }
    })

    // 验证默认模型
    const imageProvider = settings.aiProviders.openai.enabled ? 'openai' :
                         settings.aiProviders.stability.enabled ? 'stability' :
                         settings.aiProviders.custom.enabled ? 'custom' : null

    if (imageProvider && !Object.keys(settings.aiProviders[imageProvider].models)
        .some(model => model.includes(settings.general.defaultImageModel))) {
      errors.push('默认图片模型不可用')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  return { validateSettings }
}

// AI提供商管理Hook
export function useAIProviders() {
  const { data: settings } = useSettings()
  const updateSettings = useUpdateSettings()
  const testConnection = useTestConnection()

  const enabledProviders = React.useMemo(() => {
    if (!settings?.aiProviders) return []
    return Object.entries(settings.aiProviders)
      .filter(([_, provider]) => provider.enabled)
      .map(([key, provider]) => ({ key, ...provider }))
  }, [settings?.aiProviders])

  const availableModels = React.useMemo(() => {
    if (!settings?.aiProviders) return { image: [], video: [] }

    const models = { image: [], video: [] } as { image: string[], video: string[] }

    Object.entries(settings.aiProviders).forEach(([providerKey, provider]) => {
      if (!provider.enabled) return

      Object.entries(provider.models).forEach(([model, config]) => {
        if (!config.enabled) return

        // 根据模型类型分类
        if (providerKey === 'openai' && model.includes('dall-e')) {
          models.image.push(model)
        } else if (providerKey === 'stability') {
          if (model.includes('stable-diffusion')) {
            models.image.push(model)
          } else if (model.includes('stable-video')) {
            models.video.push(model)
          }
        } else if (providerKey === 'runway' && model.includes('gen-')) {
          models.video.push(model)
        } else if (providerKey === 'pika') {
          models.video.push(model)
        } else if (providerKey === 'custom') {
          // 根据模型名称判断类型
          if (model.includes('midjourney') || model.includes('stable-diffusion') || model.includes('flux')) {
            models.image.push(model)
          } else if (model.includes('runway') || model.includes('pika')) {
            models.video.push(model)
          }
        }
      })
    })

    return models
  }, [settings?.aiProviders])

  const updateProvider = (providerKey: string, updates: Partial<AIProvider>) => {
    if (!settings) return

    const newSettings = {
      aiProviders: {
        ...settings.aiProviders,
        [providerKey]: {
          ...settings.aiProviders[providerKey],
          ...updates
        }
      }
    }

    updateSettings.mutate(newSettings)
  }

  const testProvider = async (providerKey: string) => {
    return await testConnection.mutateAsync({ providerKey })
  }

  return {
    enabledProviders,
    availableModels,
    updateProvider,
    testProvider,
    isTesting: testConnection.isPending,
    testResult: testConnection.data?.data
  }
}