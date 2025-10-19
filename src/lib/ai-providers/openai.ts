import { AIProvider, AIProviderConfig, ImageGenerationOptions, VideoGenerationOptions, AIProviderError } from './index'

export class OpenAIProvider implements AIProvider {
  private config: AIProviderConfig

  constructor(config: AIProviderConfig) {
    this.config = config
  }

  async generateImage(prompt: string, options: ImageGenerationOptions = {}): Promise<string[]> {
    const {
      model = 'dall-e-3',
      size = '1024x1024',
      quality = 'standard',
      style = 'vivid',
      quantity = 1,
      n = quantity
    } = options

    try {
      const response = await fetch(`${this.config.baseUrl || 'https://api.openai.com'}/v1/images/generations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          prompt,
          n: Math.min(n, 10), // DALL-E 3 只支持 n=1
          size,
          quality,
          style,
        }),
        signal: AbortSignal.timeout(this.config.timeout || 60000),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }))
        throw new AIProviderError(
          error.error?.message || `HTTP ${response.status}`,
          'openai',
          error.error?.code,
          response.status
        )
      }

      const data = await response.json()
      return data.data.map((item: any) => item.url)

    } catch (error) {
      if (error instanceof AIProviderError) {
        throw error
      }

      if (error.name === 'AbortError') {
        throw new AIProviderError('Request timeout', 'openai', 'timeout')
      }

      throw new AIProviderError(
        error instanceof Error ? error.message : 'Unknown error',
        'openai'
      )
    }
  }

  async generateVideo(prompt: string, options: VideoGenerationOptions = {}): Promise<string[]> {
    // OpenAI 目前不支持视频生成，抛出错误
    throw new AIProviderError('OpenAI does not support video generation', 'openai', 'not_supported')
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl || 'https://api.openai.com'}/v1/models`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        signal: AbortSignal.timeout(10000),
      })

      return response.ok
    } catch (error) {
      return false
    }
  }

  getCostEstimate(type: 'image' | 'video', options?: any): number {
    if (type === 'image') {
      const model = options?.model || 'dall-e-3'
      const costs: Record<string, number> = {
        'dall-e-3': 0.04,
        'dall-e-2': 0.018,
      }
      const baseCost = costs[model] || 0.04

      // DALL-E 3 只支持单张图片
      const quantity = model === 'dall-e-3' ? 1 : (options?.quantity || 1)
      return baseCost * quantity
    }

    return 0 // OpenAI 不支持视频生成
  }
}

// OpenAI 兼容的图片生成服务（如 Stable Diffusion API）
export class OpenAICompatibleProvider implements AIProvider {
  private config: AIProviderConfig

  constructor(config: AIProviderConfig) {
    this.config = config
  }

  async generateImage(prompt: string, options: ImageGenerationOptions = {}): Promise<string[]> {
    const {
      model = 'stable-diffusion-xl',
      size = '1024x1024',
      quantity = 1,
      negativePrompt,
      seed,
      ...otherOptions
    } = options

    try {
      const response = await fetch(`${this.config.baseUrl}/v1/images/generations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          prompt,
          n: quantity,
          size,
          negative_prompt: negativePrompt,
          seed,
          ...otherOptions,
        }),
        signal: AbortSignal.timeout(this.config.timeout || 120000),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }))
        throw new AIProviderError(
          error.error?.message || `HTTP ${response.status}`,
          'openai-compatible',
          error.error?.code,
          response.status
        )
      }

      const data = await response.json()
      return data.data.map((item: any) => item.url || item.image_url)

    } catch (error) {
      if (error instanceof AIProviderError) {
        throw error
      }

      if (error.name === 'AbortError') {
        throw new AIProviderError('Request timeout', 'openai-compatible', 'timeout')
      }

      throw new AIProviderError(
        error instanceof Error ? error.message : 'Unknown error',
        'openai-compatible'
      )
    }
  }

  async generateVideo(prompt: string, options: VideoGenerationOptions = {}): Promise<string[]> {
    // 大多数 OpenAI 兼容服务不支持视频生成
    throw new AIProviderError('This provider does not support video generation', 'openai-compatible', 'not_supported')
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/v1/models`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        signal: AbortSignal.timeout(10000),
      })

      return response.ok
    } catch (error) {
      return false
    }
  }

  getCostEstimate(type: 'image' | 'video', options?: any): number {
    if (type === 'image') {
      // 默认价格，实际价格取决于具体提供商
      return 0.01 * (options?.quantity || 1)
    }
    return 0
  }
}