import { aiRegistry, initializeProviders, getProviderForModel, isModelAvailable } from './ai-providers/registry'
import { AIProviderError } from './ai-providers/index'
import { MediaType } from '@/types'

export interface AIServiceConfig {
  enableFallback?: boolean
  maxRetries?: number
  timeout?: number
}

export class AIService {
  private config: AIServiceConfig
  private initialized = false

  constructor(config: AIServiceConfig = {}) {
    this.config = {
      enableFallback: true,
      maxRetries: 3,
      timeout: 120000,
      ...config,
    }
  }

  // 初始化服务
  async initialize() {
    if (this.initialized) return

    await initializeProviders()
    this.initialized = true
  }

  // 生成图片
  async generateImage(
    model: string,
    prompt: string,
    options: {
      size?: string
      quality?: string
      style?: string
      quantity?: number
      negativePrompt?: string
      seed?: number
    } = {}
  ): Promise<string[]> {
    await this.ensureInitialized()

    const provider = getProviderForModel(model)
    if (!provider) {
      throw new AIProviderError(`No provider found for model: ${model}`, 'unknown', 'model_not_found')
    }

    try {
      return await this.withRetry(() =>
        provider.generateImage(prompt, {
          model,
          ...options,
        })
      )
    } catch (error) {
      if (this.config.enableFallback && this.shouldFallback(error)) {
        return await this.generateImageFallback(model, prompt, options)
      }
      throw error
    }
  }

  // 生成视频
  async generateVideo(
    model: string,
    prompt: string,
    options: {
      duration?: number
      fps?: number
      motion?: string
      transition?: string
      cameraAngle?: string
      negativePrompt?: string
      seed?: number
    } = {}
  ): Promise<string[]> {
    await this.ensureInitialized()

    const provider = getProviderForModel(model)
    if (!provider) {
      throw new AIProviderError(`No provider found for model: ${model}`, 'unknown', 'model_not_found')
    }

    try {
      return await this.withRetry(() =>
        provider.generateVideo(prompt, {
          model,
          ...options,
        })
      )
    } catch (error) {
      if (this.config.enableFallback && this.shouldFallback(error)) {
        return await this.generateVideoFallback(model, prompt, options)
      }
      throw error
    }
  }

  // 获取成本估算
  async getCostEstimate(type: MediaType, model: string, options?: any): Promise<number> {
    await this.ensureInitialized()

    const providerName = model in {
      // OpenAI Models
      'dall-e-3': 'openai',
      'dall-e-2': 'openai',

      // Stability AI Models
      'stable-diffusion-xl-1024-v1-0': 'stability-ai',
      'stable-diffusion-xl-1024-v0-9': 'stability-ai',
      'stable-diffusion-512-v2-1': 'stability-ai',
      'stable-diffusion-768-v2-1': 'stability-ai',
      'stable-video-diffusion-img2vid': 'stability-ai',

      // Custom AI Models
      'midjourney-v6': 'custom-ai',
      'midjourney-v5.2': 'custom-ai',
      'flux-pro': 'custom-ai',
      'runway-gen3': 'custom-ai',
      'runway-gen2': 'custom-ai',
      'pika-labs': 'custom-ai',

      // EvoLink AI Models (Text)
      'gemini-2.5-flash-text': 'proxy',
      'gemini-2.5-pro-text': 'proxy',
      'claude-3.5-sonnet-text': 'proxy',
      'gpt-4o-text': 'proxy',

      // EvoLink AI Models (Image)
      'flux-1.1-pro-image': 'proxy',
      'flux-1.1-dev-image': 'proxy',
      'flux-schnell-image': 'proxy',
      'sd-3.5-large-image': 'proxy',
      'sd-3.5-medium-turbo-image': 'proxy',
      'sd-3.5-large-turbo-image': 'proxy',
      'gemini-2.0-pro-image': 'proxy',
      'gemini-2.5-flash-image': 'proxy',

      // EvoLink AI Models (Video)
      'kling-1.6-video': 'proxy',
      'kling-1.5-video': 'proxy',
      'luma-1.6-video': 'proxy',
      'video-1-video': 'proxy',
    } ? {
      // OpenAI Models
      'dall-e-3': 'openai',
      'dall-e-2': 'openai',

      // Stability AI Models
      'stable-diffusion-xl-1024-v1-0': 'stability-ai',
      'stable-diffusion-xl-1024-v0-9': 'stability-ai',
      'stable-diffusion-512-v2-1': 'stability-ai',
      'stable-diffusion-768-v2-1': 'stability-ai',
      'stable-video-diffusion-img2vid': 'stability-ai',

      // Custom AI Models
      'midjourney-v6': 'custom-ai',
      'midjourney-v5.2': 'custom-ai',
      'flux-pro': 'custom-ai',
      'runway-gen3': 'custom-ai',
      'runway-gen2': 'custom-ai',
      'pika-labs': 'custom-ai',

      // EvoLink AI Models (Text)
      'gemini-2.5-flash-text': 'proxy',
      'gemini-2.5-pro-text': 'proxy',
      'claude-3.5-sonnet-text': 'proxy',
      'gpt-4o-text': 'proxy',

      // EvoLink AI Models (Image)
      'flux-1.1-pro-image': 'proxy',
      'flux-1.1-dev-image': 'proxy',
      'flux-schnell-image': 'proxy',
      'sd-3.5-large-image': 'proxy',
      'sd-3.5-medium-turbo-image': 'proxy',
      'sd-3.5-large-turbo-image': 'proxy',
      'gemini-2.0-pro-image': 'proxy',
      'gemini-2.5-flash-image': 'proxy',

      // EvoLink AI Models (Video)
      'kling-1.6-video': 'proxy',
      'kling-1.5-video': 'proxy',
      'luma-1.6-video': 'proxy',
      'video-1-video': 'proxy',
    }[model] : undefined

    if (!providerName) return 0

    // 对于代理提供商，直接从代理管理器获取成本估算
    if (providerName === 'proxy') {
      const { proxyProviderManager } = require('./ai-providers/proxy')
      const provider = proxyProviderManager.getProviderForModel(model)
      if (provider) {
        return provider.getCostEstimate(type, { model, ...options })
      }
    }

    return aiRegistry.getCostEstimate(providerName, type, { model, ...options })
  }

  // 测试模型可用性
  async testModel(model: string): Promise<boolean> {
    console.log(`🔍 开始测试模型可用性: ${model}`)
    await this.ensureInitialized()

    const provider = getProviderForModel(model)
    if (!provider) {
      console.log(`❌ 找不到模型 ${model} 的提供商`)
      return false
    }

    console.log(`✅ 找到模型 ${model} 的提供商`)

    try {
      console.log(`📞 开始测试提供商连接...`)
      const result = await provider.testConnection()
      console.log(`📊 模型 ${model} 连接测试结果: ${result}`)
      return result
    } catch (error) {
      console.error(`❌ 模型 ${model} 连接测试异常:`, error)
      return false
    }
  }

  // 获取可用模型列表
  async getAvailableModels(type?: MediaType): Promise<string[]> {
    await this.ensureInitialized()

    const allModels = Object.keys({
      'dall-e-3': 'openai',
      'dall-e-2': 'openai',
      'stable-diffusion-xl-1024-v1-0': 'stability-ai',
      'stable-diffusion-xl-1024-v0-9': 'stability-ai',
      'stable-diffusion-512-v2-1': 'stability-ai',
      'stable-diffusion-768-v2-1': 'stability-ai',
      'stable-video-diffusion-img2vid': 'stability-ai',
      'midjourney-v6': 'custom-ai',
      'midjourney-v5.2': 'custom-ai',
      'flux-pro': 'custom-ai',
      'runway-gen3': 'custom-ai',
      'runway-gen2': 'custom-ai',
      'pika-labs': 'custom-ai',
    })

    const availableModels = allModels.filter(model => isModelAvailable(model))

    if (!type) return availableModels

    // 根据类型过滤模型
    const imageModels = [
      'dall-e-3', 'dall-e-2',
      'stable-diffusion-xl-1024-v1-0', 'stable-diffusion-xl-1024-v0-9',
      'stable-diffusion-512-v2-1', 'stable-diffusion-768-v2-1',
      'midjourney-v6', 'midjourney-v5.2', 'flux-pro'
    ]

    const videoModels = [
      'stable-video-diffusion-img2vid',
      'runway-gen3', 'runway-gen2', 'pika-labs'
    ]

    if (type === 'image') {
      return availableModels.filter(model => imageModels.includes(model))
    } else if (type === 'video') {
      return availableModels.filter(model => videoModels.includes(model))
    }

    return availableModels
  }

  // 私有方法

  private async ensureInitialized() {
    if (!this.initialized) {
      await this.initialize()
    }
  }

  private async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    const maxRetries = this.config.maxRetries || 3
    let lastError: Error

    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error

        // 如果是最后一次尝试，或者错误不应该重试，直接抛出
        if (i === maxRetries || !this.shouldRetry(error)) {
          throw error
        }

        // 指数退避
        const delay = Math.min(1000 * Math.pow(2, i), 10000)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    throw lastError!
  }

  private shouldRetry(error: any): boolean {
    if (error instanceof AIProviderError) {
      // 某些错误码不应该重试
      const noRetryCodes = ['invalid_api_key', 'insufficient_quota', 'not_supported']
      return !noRetryCodes.includes(error.code || '')
    }

    // 网络错误或超时可以重试
    return error.name === 'AbortError' || error.message.includes('timeout')
  }

  private shouldFallback(error: any): boolean {
    if (error instanceof AIProviderError) {
      const fallbackCodes = ['rate_limit_exceeded', 'service_unavailable', 'timeout']
      return fallbackCodes.includes(error.code || '') || (error.statusCode && error.statusCode >= 500)
    }
    return false
  }

  private async generateImageFallback(
    originalModel: string,
    prompt: string,
    options: any
  ): Promise<string[]> {
    // 简单的回退策略：尝试使用同类型的其他模型
    const fallbackModels = {
      'dall-e-3': ['stable-diffusion-xl-1024-v1-0', 'dall-e-2'],
      'midjourney-v6': ['stable-diffusion-xl-1024-v1-0', 'flux-pro'],
      'flux-pro': ['stable-diffusion-xl-1024-v1-0', 'dall-e-3'],
    }

    const fallbacks = fallbackModels[originalModel as keyof typeof fallbackModels] || ['stable-diffusion-xl-1024-v1-0']

    for (const model of fallbacks) {
      try {
        return await this.generateImage(model, prompt, options)
      } catch (error) {
        console.warn(`Fallback model ${model} also failed:`, error)
      }
    }

    throw new AIProviderError('All fallback models failed', 'fallback')
  }

  private async generateVideoFallback(
    originalModel: string,
    prompt: string,
    options: any
  ): Promise<string[]> {
    // 视频生成的回退策略
    const fallbackModels = {
      'runway-gen3': ['runway-gen2', 'stable-video-diffusion-img2vid'],
      'pika-labs': ['runway-gen2', 'stable-video-diffusion-img2vid'],
    }

    const fallbacks = fallbackModels[originalModel as keyof typeof fallbackModels] || ['stable-video-diffusion-img2vid']

    for (const model of fallbacks) {
      try {
        return await this.generateVideo(model, prompt, options)
      } catch (error) {
        console.warn(`Fallback model ${model} also failed:`, error)
      }
    }

    throw new AIProviderError('All fallback models failed', 'fallback')
  }
}

// 创建全局 AI 服务实例
export const aiService = new AIService()

// 导出便捷函数
export const generateImage = (model: string, prompt: string, options?: any) =>
  aiService.generateImage(model, prompt, options)

export const generateVideo = (model: string, prompt: string, options?: any) =>
  aiService.generateVideo(model, prompt, options)

export const getAICostEstimate = (type: MediaType, model: string, options?: any) =>
  aiService.getCostEstimate(type, model, options)

export const testAIModel = (model: string) =>
  aiService.testModel(model)

export const getAvailableAIModels = (type?: MediaType) =>
  aiService.getAvailableModels(type)