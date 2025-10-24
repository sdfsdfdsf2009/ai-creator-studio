// 客户端模型配置管理器 - 不依赖服务端数据库
import { ModelConfig } from '@/app/api/model-configs/route'

export interface ModelInfo {
  id: string
  name: string
  provider: string
  supportedProviders: string[]
  mediaType: 'image' | 'video' | 'text'
  cost?: number
  description?: string
  isEvoLink?: boolean
  isBuiltin?: boolean
}

export class ClientModelConfigManager {
  private static instance: ClientModelConfigManager

  static getInstance(): ClientModelConfigManager {
    if (!ClientModelConfigManager.instance) {
      ClientModelConfigManager.instance = new ClientModelConfigManager()
    }
    return ClientModelConfigManager.instance
  }

  // 通过API获取配置
  async getConfigs(options?: { enabled?: boolean }): Promise<ModelConfig[]> {
    try {
      const params = new URLSearchParams()
      if (options?.enabled !== undefined) {
        params.set('enabled', options.enabled.toString())
      }

      const response = await fetch(`/api/model-configs?${params.toString()}`)
      if (!response.ok) {
        throw new Error('Failed to fetch model configs')
      }

      const result = await response.json()
      // API返回的是 { success: boolean, data: ModelConfig[] } 格式
      if (result.success && Array.isArray(result.data)) {
        return result.data
      }
      // 如果直接返回数组格式，也支持
      if (Array.isArray(result)) {
        return result
      }
      return []
    } catch (error) {
      console.error('Error fetching model configs:', error)
      return []
    }
  }

  // 通过API获取单个配置
  async getConfig(id: string): Promise<ModelConfig | null> {
    try {
      const response = await fetch(`/api/model-configs/${id}`)
      if (!response.ok) {
        if (response.status === 404) return null
        throw new Error('Failed to fetch model config')
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching model config:', error)
      return null
    }
  }

  // 通过API创建配置
  async createConfig(config: Omit<ModelConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<ModelConfig> {
    try {
      const response = await fetch('/api/model-configs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      })

      if (!response.ok) {
        throw new Error('Failed to create model config')
      }

      return await response.json()
    } catch (error) {
      console.error('Error creating model config:', error)
      throw error
    }
  }

  // 通过API更新配置
  async updateConfig(id: string, updates: Partial<ModelConfig>): Promise<ModelConfig> {
    try {
      const response = await fetch(`/api/model-configs/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        throw new Error('Failed to update model config')
      }

      return await response.json()
    } catch (error) {
      console.error('Error updating model config:', error)
      throw error
    }
  }

  // 通过API删除配置
  async deleteConfig(id: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/model-configs/${id}`, {
        method: 'DELETE',
      })

      return response.ok
    } catch (error) {
      console.error('Error deleting model config:', error)
      return false
    }
  }

  // 通过API测试配置
  async testConfig(id: string): Promise<{ success: boolean; error?: string; latency?: number }> {
    try {
      const response = await fetch(`/api/model-configs/${id}/test`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to test model config')
      }

      return await response.json()
    } catch (error) {
      console.error('Error testing model config:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  // 获取EvoLink模型模板
  async getEvoLinkModels(): Promise<ModelInfo[]> {
    try {
      const response = await fetch('/api/evolink-models')
      if (!response.ok) {
        throw new Error('Failed to fetch EvoLink models')
      }

      const result = await response.json()
      if (result.success && Array.isArray(result.data?.templates)) {
        // 转换EvoLink模型模板为ModelInfo格式
        return result.data.templates.map((template: any) => ({
          id: template.modelId,
          name: template.modelName,
          provider: 'evolink',
          supportedProviders: ['evolink', 'proxy'],
          mediaType: template.mediaType as 'text' | 'image' | 'video',
          cost: template.costPerRequest || 0,
          description: template.description,
          isEvoLink: true,
          isBuiltin: template.is_builtin || false
        }))
      }
      return []
    } catch (error) {
      console.error('Error fetching EvoLink models:', error)
      return []
    }
  }

  // 获取基础模型列表（硬编码，不依赖数据库）
  getBaseAvailableModels(): ModelInfo[] {
    return [
      // OpenAI Models
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        provider: 'openai',
        supportedProviders: ['openai', 'proxy'],
        mediaType: 'text',
        cost: 0.005,
        description: 'OpenAI GPT-4o模型'
      },
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        provider: 'openai',
        supportedProviders: ['openai', 'proxy'],
        mediaType: 'text',
        cost: 0.00015,
        description: 'OpenAI GPT-4o Mini模型'
      },
      {
        id: 'dall-e-3',
        name: 'DALL-E 3',
        provider: 'openai',
        supportedProviders: ['openai', 'proxy'],
        mediaType: 'image',
        cost: 0.04,
        description: 'OpenAI DALL-E 3图像生成模型'
      },

      // Anthropic Models
      {
        id: 'claude-3-5-sonnet-20241022',
        name: 'Claude 3.5 Sonnet (2024-10-22)',
        provider: 'anthropic',
        supportedProviders: ['anthropic', 'proxy'],
        mediaType: 'text',
        cost: 0.003,
        description: 'Anthropic Claude 3.5 Sonnet最新版本'
      },
      {
        id: 'claude-3-haiku-20240307',
        name: 'Claude 3 Haiku',
        provider: 'anthropic',
        supportedProviders: ['anthropic', 'proxy'],
        mediaType: 'text',
        cost: 0.00025,
        description: 'Anthropic Claude 3 Haiku快速模型'
      }
    ]
  }

  // 获取可用模型列表（包含基础模型和EvoLink模型）
  async getAllAvailableModels(): Promise<ModelInfo[]> {
    // 获取基础模型
    const baseModels = this.getBaseAvailableModels()

    // 获取EvoLink模型
    try {
      const evoLinkModels = await this.getEvoLinkModels()
      return [...baseModels, ...evoLinkModels]
    } catch (error) {
      console.error('Failed to load EvoLink models:', error)
      return baseModels
    }
  }

  // 向后兼容的方法
  getAvailableModels(): ModelInfo[] {
    console.warn('getAvailableModels() is deprecated, use getAllAvailableModels() instead')
    return this.getBaseAvailableModels()
  }

  // 根据媒体类型筛选模型
  async getModelsByMediaType(mediaType: 'image' | 'video' | 'text'): Promise<ModelInfo[]> {
    const allModels = await this.getAllAvailableModels()
    return allModels.filter(model => model.mediaType === mediaType)
  }

  // 根据提供商筛选模型
  async getModelsByProvider(provider: string): Promise<ModelInfo[]> {
    const allModels = await this.getAllAvailableModels()
    return allModels.filter(model =>
      model.supportedProviders.includes(provider)
    )
  }

  // 查找模型信息
  async findModel(modelId: string): Promise<ModelInfo | undefined> {
    const allModels = await this.getAllAvailableModels()
    return allModels.find(model => model.id === modelId)
  }

  // 验证模型配置
  async validateConfig(config: ModelConfig): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = []
    if (!config.modelId.trim()) {
      errors.push('模型ID不能为空')
    }
    if (!config.modelName.trim()) {
      errors.push('模型名称不能为空')
    }
    if (!config.provider.trim()) {
      errors.push('提供商不能为空')
    }
    const availableModels = await this.getAllAvailableModels()
    const modelExists = availableModels.some(model => model.id === config.modelId)
    if (!modelExists) {
      errors.push('模型ID不存在于可用模型列表中')
    }
    return {
      isValid: errors.length === 0,
      errors
    }
  }
}

// 导出单例实例
export const modelConfigManager = ClientModelConfigManager.getInstance()