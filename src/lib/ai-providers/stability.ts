import { AIProvider, AIProviderConfig, ImageGenerationOptions, VideoGenerationOptions, AIProviderError } from './index'

export class StabilityAIProvider implements AIProvider {
  private config: AIProviderConfig

  constructor(config: AIProviderConfig) {
    this.config = config
  }

  async generateImage(prompt: string, options: ImageGenerationOptions = {}): Promise<string[]> {
    const {
      model = 'stable-diffusion-xl-1024-v1-0',
      size = '1024x1024',
      quantity = 1,
      negativePrompt,
      seed,
      style,
      ...otherOptions
    } = options

    // 解析尺寸
    const [width, height] = size.split('x').map(Number)

    try {
      const response = await fetch(`${this.config.baseUrl || 'https://api.stability.ai'}/v1/generation/${model}/text-to-image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          text_prompts: [
            {
              text: prompt,
              weight: 1
            },
            ...(negativePrompt ? [{
              text: negativePrompt,
              weight: -1
            }] : [])
          ],
          cfg_scale: 7,
          height,
          width,
          samples: quantity,
          steps: 30,
          seed: seed || undefined,
          style_preset: style,
          ...otherOptions,
        }),
        signal: AbortSignal.timeout(this.config.timeout || 120000),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Unknown error' }))
        throw new AIProviderError(
          error.message || `HTTP ${response.status}`,
          'stability-ai',
          error.code || 'unknown',
          response.status
        )
      }

      const data = await response.json()

      // 将 base64 图片转换为 URL
      const images: string[] = []
      data.artifacts?.forEach((artifact: any, index: number) => {
        if (artifact.base64) {
          // 创建 data URL
          const mimeType = artifact.finish_reason === 'content-filter' ? 'image/png' : 'image/png'
          images.push(`data:${mimeType};base64,${artifact.base64}`)
        }
      })

      return images

    } catch (error) {
      if (error instanceof AIProviderError) {
        throw error
      }

      if (error.name === 'AbortError') {
        throw new AIProviderError('Request timeout', 'stability-ai', 'timeout')
      }

      throw new AIProviderError(
        error instanceof Error ? error.message : 'Unknown error',
        'stability-ai'
      )
    }
  }

  async generateVideo(prompt: string, options: VideoGenerationOptions = {}): Promise<string[]> {
    const {
      model = 'stable-video-diffusion-img2vid',
      seed,
      ...otherOptions
    } = options

    try {
      // Stability AI 支持图片到视频的生成
      const response = await fetch(`${this.config.baseUrl || 'https://api.stability.ai'}/v1/generation/${model}/image-to-video`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          seed: seed || undefined,
          ...otherOptions,
        }),
        signal: AbortSignal.timeout(this.config.timeout || 300000), // 视频生成需要更长时间
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Unknown error' }))
        throw new AIProviderError(
          error.message || `HTTP ${response.status}`,
          'stability-ai',
          error.code || 'unknown',
          response.status
        )
      }

      const data = await response.json()

      // 返回视频 URL 或 base64
      const videos: string[] = []
      if (data.video) {
        videos.push(data.video)
      }

      return videos

    } catch (error) {
      if (error instanceof AIProviderError) {
        throw error
      }

      if (error.name === 'AbortError') {
        throw new AIProviderError('Request timeout', 'stability-ai', 'timeout')
      }

      throw new AIProviderError(
        error instanceof Error ? error.message : 'Unknown error',
        'stability-ai'
      )
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl || 'https://api.stability.ai'}/v1/user/balance`, {
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
      const model = options?.model || 'stable-diffusion-xl-1024-v1-0'
      const costs: Record<string, number> = {
        'stable-diffusion-xl-1024-v1-0': 0.06,
        'stable-diffusion-xl-1024-v0-9': 0.05,
        'stable-diffusion-512-v2-1': 0.02,
        'stable-diffusion-768-v2-1': 0.03,
      }
      const baseCost = costs[model] || 0.06
      return baseCost * (options?.quantity || 1)
    }

    if (type === 'video') {
      // 视频生成的成本较高
      return 0.25 * (options?.duration || 5) / 5
    }

    return 0
  }
}