import { ProxyConfig } from '@/app/api/proxy-config/route'
import { withDatabase } from '@/lib/database'

export interface ModelInfo {
  id: string
  name: string
  provider: string
  supportedProviders: string[]
  mediaType: 'image' | 'video' | 'text'
  cost?: number
}

export interface ProxyValidationResult {
  valid: boolean
  error?: string
  availableModels?: string[]
}

export class ProxyConfigManager {
  private static instance: ProxyConfigManager
  private configs: ProxyConfig[] = []
  private lastLoad: Date | null = null

  private constructor() {}

  static getInstance(): ProxyConfigManager {
    if (!ProxyConfigManager.instance) {
      ProxyConfigManager.instance = new ProxyConfigManager()
    }
    return ProxyConfigManager.instance
  }

  async loadConfigs(): Promise<ProxyConfig[]> {
    try {
      const response = await fetch('/api/proxy-config')
      const result = await response.json()

      if (result.success) {
        this.configs = result.data
        this.lastLoad = new Date()
        return this.configs
      } else {
        console.error('Failed to load proxy configs:', result.error)
        return []
      }
    } catch (error) {
      console.error('Error loading proxy configs:', error)
      return []
    }
  }

  async getConfigs(): Promise<ProxyConfig[]> {
    // 如果5分钟内没有加载过，重新加载
    if (!this.lastLoad || (Date.now() - this.lastLoad.getTime()) > 5 * 60 * 1000) {
      await this.loadConfigs()
    }
    return this.configs
  }

  async createConfig(config: Omit<ProxyConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProxyConfig | null> {
    try {
      const response = await fetch('/api/proxy-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      })

      const result = await response.json()

      if (result.success) {
        await this.loadConfigs() // 重新加载配置
        return result.data
      } else {
        console.error('Failed to create proxy config:', result.error)
        return null
      }
    } catch (error) {
      console.error('Error creating proxy config:', error)
      return null
    }
  }

  async updateConfig(id: string, updates: Partial<ProxyConfig>): Promise<ProxyConfig | null> {
    try {
      const response = await fetch('/api/proxy-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates })
      })

      const result = await response.json()

      if (result.success) {
        await this.loadConfigs() // 重新加载配置
        return result.data
      } else {
        console.error('Failed to update proxy config:', result.error)
        return null
      }
    } catch (error) {
      console.error('Error updating proxy config:', error)
      return null
    }
  }

  async deleteConfig(id: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/proxy-config?id=${id}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        await this.loadConfigs() // 重新加载配置
        return true
      } else {
        console.error('Failed to delete proxy config:', result.error)
        return false
      }
    } catch (error) {
      console.error('Error deleting proxy config:', error)
      return false
    }
  }

  async validateConfig(config: ProxyConfig): Promise<ProxyValidationResult> {
    try {
      // 根据提供商类型进行验证
      switch (config.provider) {
        case 'openai':
          return this.validateOpenAIConfig(config)
        case 'anthropic':
          return this.validateAnthropicConfig(config)
        case 'google':
          return this.validateGoogleConfig(config)
        case 'custom':
        case 'nano-banana':
          return this.validateCustomConfig(config)
        default:
          return { valid: false, error: `Unknown provider: ${config.provider}` }
      }
    } catch (error) {
      return { valid: false, error: `Validation failed: ${error.message}` }
    }
  }

  private async validateOpenAIConfig(config: ProxyConfig): Promise<ProxyValidationResult> {
    if (!config.apiKey) {
      return { valid: false, error: 'API Key is required' }
    }

    const baseUrl = config.baseUrl || 'https://api.openai.com/v1'

    try {
      // 测试API连接
      const response = await fetch(`${baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        return { valid: false, error: `API test failed: ${response.statusText}` }
      }

      const data = await response.json()
      const availableModels = data.data?.map((model: any) => model.id) || []

      // 检查配置的模型是否在可用模型中
      const configuredModels = config.models || []
      const unavailableModels = configuredModels.filter(model => !availableModels.includes(model))

      if (unavailableModels.length > 0) {
        return {
          valid: false,
          error: `Models not available: ${unavailableModels.join(', ')}`,
          availableModels
        }
      }

      return { valid: true, availableModels }
    } catch (error) {
      return { valid: false, error: `Connection test failed: ${error.message}` }
    }
  }

  private async validateAnthropicConfig(config: ProxyConfig): Promise<ProxyValidationResult> {
    if (!config.apiKey) {
      return { valid: false, error: 'API Key is required' }
    }

    // Anthropic API验证逻辑
    return { valid: true }
  }

  private async validateGoogleConfig(config: ProxyConfig): Promise<ProxyValidationResult> {
    if (!config.apiKey) {
      return { valid: false, error: 'API Key is required' }
    }

    // Google API验证逻辑
    return { valid: true }
  }

  private async validateCustomConfig(config: ProxyConfig): Promise<ProxyValidationResult> {
    if (!config.baseUrl) {
      return { valid: false, error: 'Base URL is required for custom provider' }
    }

    // 自定义提供商验证逻辑
    return { valid: true }
  }

  getAvailableModels(mediaType?: 'image' | 'video' | 'text'): ModelInfo[] {
    const allModels: ModelInfo[] = [
      // Image models
      { id: 'dall-e-3', name: 'DALL-E 3', provider: 'openai', supportedProviders: ['openai', 'custom'], mediaType: 'image', cost: 0.04 },
      { id: 'dall-e-2', name: 'DALL-E 2', provider: 'openai', supportedProviders: ['openai', 'custom'], mediaType: 'image', cost: 0.02 },
      { id: 'stable-diffusion-3', name: 'Stable Diffusion 3', provider: 'stability-ai', supportedProviders: ['custom'], mediaType: 'image', cost: 0.04 },
      { id: 'stable-diffusion-2.1', name: 'Stable Diffusion 2.1', provider: 'stability-ai', supportedProviders: ['custom'], mediaType: 'image', cost: 0.02 },
      { id: 'flux-schnell', name: 'Flux Schnell', provider: 'black-forest-labs', supportedProviders: ['custom'], mediaType: 'image', cost: 0.008 },
      { id: 'flux-dev', name: 'Flux Dev', provider: 'black-forest-labs', supportedProviders: ['custom'], mediaType: 'image', cost: 0.04 },
      { id: 'flux-pro', name: 'Flux Pro', provider: 'black-forest-labs', supportedProviders: ['custom'], mediaType: 'image', cost: 0.08 },
      { id: 'midjourney-v6', name: 'Midjourney V6', provider: 'midjourney', supportedProviders: ['custom'], mediaType: 'image', cost: 0.04 },
      { id: 'ideogram-2.0', name: 'Ideogram 2.0', provider: 'ideogram', supportedProviders: ['custom'], mediaType: 'image', cost: 0.05 },
      { id: 'kandinsky-3.0', name: 'Kandinsky 3.0', provider: 'sber', supportedProviders: ['custom'], mediaType: 'image', cost: 0.03 },

      // Video models
      { id: 'sora-1.0', name: 'Sora 1.0', provider: 'openai', supportedProviders: ['openai', 'custom'], mediaType: 'video', cost: 0.50 },
      { id: 'runway-gen-3-turbo', name: 'Runway Gen-3 Turbo', provider: 'runway', supportedProviders: ['custom'], mediaType: 'video', cost: 0.10 },
      { id: 'pika-1.5', name: 'Pika 1.5', provider: 'pika', supportedProviders: ['custom'], mediaType: 'video', cost: 0.08 },
      { id: 'stable-video-xt', name: 'Stable Video XT', provider: 'stability-ai', supportedProviders: ['custom'], mediaType: 'video', cost: 0.06 },
      { id: 'luma-dream-machine', name: 'Luma Dream Machine', provider: 'luma', supportedProviders: ['custom'], mediaType: 'video', cost: 0.12 },

      // Text models (via proxy)
      { id: 'gpt-4o', name: 'GPT-4O', provider: 'openai', supportedProviders: ['openai', 'custom', 'nano-banana'], mediaType: 'text', cost: 0.005 },
      { id: 'gpt-4o-mini', name: 'GPT-4O Mini', provider: 'openai', supportedProviders: ['openai', 'custom', 'nano-banana'], mediaType: 'text', cost: 0.00015 },
      { id: 'gemini-2.0-pro', name: 'Gemini 2.0 Pro', provider: 'google', supportedProviders: ['google', 'custom'], mediaType: 'text', cost: 0.0025 },
      { id: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'anthropic', supportedProviders: ['anthropic', 'custom'], mediaType: 'text', cost: 0.003 },
    ]

    if (mediaType) {
      return allModels.filter(model => model.mediaType === mediaType)
    }

    return allModels
  }

  getProxyAvailableModels(): ModelInfo[] {
    // 从配置中获取可用的模型
    const availableModels: ModelInfo[] = []

    for (const config of this.configs.filter(c => c.enabled)) {
      for (const modelId of config.models) {
        const modelInfo = this.getAvailableModels().find(m => m.id === modelId)
        if (modelInfo && modelInfo.supportedProviders.includes(config.provider)) {
          availableModels.push({
            ...modelInfo,
            provider: config.provider
          })
        }
      }
    }

    // 去重
    const uniqueModels = availableModels.filter((model, index, self) =>
      index === self.findIndex(m => m.id === model.id)
    )

    return uniqueModels
  }

  getConfigByProvider(provider: string): ProxyConfig | null {
    return this.configs.find(config => config.provider === provider && config.enabled) || null
  }

  getConfigForModel(modelId: string): ProxyConfig | null {
    for (const config of this.configs.filter(c => c.enabled)) {
      if (config.models.includes(modelId)) {
        return config
      }
    }
    return null
  }
}

// 导出单例实例
export const proxyConfigManager = ProxyConfigManager.getInstance()