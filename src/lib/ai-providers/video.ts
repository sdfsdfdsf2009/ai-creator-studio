import { AIProvider, AIProviderConfig, VideoGenerationOptions, AIProviderError } from './index'

// Runway API 提供商
export class RunwayProvider implements AIProvider {
  private config: AIProviderConfig

  constructor(config: AIProviderConfig) {
    this.config = config
  }

  async generateImage(prompt: string, options?: any): Promise<string[]> {
    // Runway 主要专注于视频生成
    throw new AIProviderError('Runway does not support image generation', 'runway', 'not_supported')
  }

  async generateVideo(prompt: string, options: VideoGenerationOptions = {}): Promise<string[]> {
    const {
      model = 'gen-3',
      duration = 5,
      seed,
      ...otherOptions
    } = options

    try {
      // Runway Gen-3 API 调用
      const response = await fetch(`${this.config.baseUrl || 'https://api.runwayml.com'}/v1/video_generations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text_prompt: prompt,
          model: model === 'gen-3' ? 'gen3a_turbo' : 'gen2a',
          watermarked: false,
          duration: Math.min(duration, 10), // Runway 限制最长10秒
          seed: seed || undefined,
          ...otherOptions,
        }),
        signal: AbortSignal.timeout(this.config.timeout || 300000), // 视频生成需要更长时间
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Unknown error' }))
        throw new AIProviderError(
          error.message || `HTTP ${response.status}`,
          'runway',
          error.code || 'unknown',
          response.status
        )
      }

      const data = await response.json()

      // Runway 返回任务ID，需要轮询获取结果
      const taskId = data.id || data.task_id

      if (!taskId) {
        throw new AIProviderError('No task ID returned from Runway', 'runway', 'no_task_id')
      }

      // 轮询获取结果
      return await this.pollForResult(taskId)

    } catch (error) {
      if (error instanceof AIProviderError) {
        throw error
      }

      if (error.name === 'AbortError') {
        throw new AIProviderError('Request timeout', 'runway', 'timeout')
      }

      throw new AIProviderError(
        error instanceof Error ? error.message : 'Unknown error',
        'runway'
      )
    }
  }

  private async pollForResult(taskId: string, maxAttempts = 30): Promise<string[]> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await fetch(`${this.config.baseUrl || 'https://api.runwayml.com'}/v1/video_generations/${taskId}`, {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
          },
          signal: AbortSignal.timeout(10000),
        })

        if (!response.ok) {
          throw new AIProviderError(`Failed to poll result: HTTP ${response.status}`, 'runway')
        }

        const data = await response.json()

        switch (data.status) {
          case 'PENDING':
          case 'RUNNING':
            // 继续等待
            await new Promise(resolve => setTimeout(resolve, 5000))
            break

          case 'SUCCEEDED':
          case 'COMPLETED':
            if (data.output && data.output.length > 0) {
              return data.output.map((item: any) => item.url || item)
            }
            throw new AIProviderError('No video output in successful response', 'runway', 'no_output')

          case 'FAILED':
            throw new AIProviderError(
              data.failure_reason || 'Video generation failed',
              'runway',
              'generation_failed'
            )

          case 'CANCELLED':
            throw new AIProviderError('Video generation was cancelled', 'runway', 'cancelled')

          default:
            await new Promise(resolve => setTimeout(resolve, 5000))
        }
      } catch (error) {
        if (error instanceof AIProviderError) {
          throw error
        }
        // 网络错误，继续重试
        if (attempt < maxAttempts - 1) {
          await new Promise(resolve => setTimeout(resolve, 5000))
          continue
        }
        throw error
      }
    }

    throw new AIProviderError('Video generation timed out', 'runway', 'timeout')
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl || 'https://api.runwayml.com'}/v1/account`, {
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
    if (type === 'video') {
      const model = options?.model || 'gen-3'
      const duration = options?.duration || 5

      // Runway 定价（示例）
      const costs: Record<string, number> = {
        'gen-3': 0.25, // 每5秒
        'gen-2': 0.15, // 每5秒
      }

      const baseCost = costs[model] || 0.25
      return baseCost * (duration / 5)
    }

    return 0
  }
}

// Pika Labs API 提供商
export class PikaLabsProvider implements AIProvider {
  private config: AIProviderConfig

  constructor(config: AIProviderConfig) {
    this.config = config
  }

  async generateImage(prompt: string, options?: any): Promise<string[]> {
    throw new AIProviderError('Pika Labs does not support image generation', 'pika-labs', 'not_supported')
  }

  async generateVideo(prompt: string, options: VideoGenerationOptions = {}): Promise<string[]> {
    const {
      duration = 3,
      fps = 24,
      motion = 'medium',
      seed,
      ...otherOptions
    } = options

    try {
      // Pika Labs API 调用
      const response = await fetch(`${this.config.baseUrl || 'https://api.pika.art'}/v1/generate_video`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          duration: Math.min(duration, 4), // Pika 限制最长4秒
          fps,
          motion_strength: motion,
          seed: seed || undefined,
          ...otherOptions,
        }),
        signal: AbortSignal.timeout(this.config.timeout || 300000),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Unknown error' }))
        throw new AIProviderError(
          error.message || `HTTP ${response.status}`,
          'pika-labs',
          error.code || 'unknown',
          response.status
        )
      }

      const data = await response.json()

      if (data.video_url) {
        return [data.video_url]
      }

      if (data.task_id) {
        // 需要轮询获取结果
        return await this.pollForResult(data.task_id)
      }

      throw new AIProviderError('No video URL or task ID in response', 'pika-labs', 'no_output')

    } catch (error) {
      if (error instanceof AIProviderError) {
        throw error
      }

      if (error.name === 'AbortError') {
        throw new AIProviderError('Request timeout', 'pika-labs', 'timeout')
      }

      throw new AIProviderError(
        error instanceof Error ? error.message : 'Unknown error',
        'pika-labs'
      )
    }
  }

  private async pollForResult(taskId: string, maxAttempts = 20): Promise<string[]> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await fetch(`${this.config.baseUrl || 'https://api.pika.art'}/v1/tasks/${taskId}`, {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
          },
          signal: AbortSignal.timeout(10000),
        })

        if (!response.ok) {
          throw new AIProviderError(`Failed to poll result: HTTP ${response.status}`, 'pika-labs')
        }

        const data = await response.json()

        if (data.status === 'completed' && data.video_url) {
          return [data.video_url]
        }

        if (data.status === 'failed') {
          throw new AIProviderError(
            data.error || 'Video generation failed',
            'pika-labs',
            'generation_failed'
          )
        }

        // 继续等待
        await new Promise(resolve => setTimeout(resolve, 3000))
      } catch (error) {
        if (error instanceof AIProviderError) {
          throw error
        }
        if (attempt < maxAttempts - 1) {
          await new Promise(resolve => setTimeout(resolve, 3000))
          continue
        }
        throw error
      }
    }

    throw new AIProviderError('Video generation timed out', 'pika-labs', 'timeout')
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl || 'https://api.pika.art'}/v1/account`, {
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
    if (type === 'video') {
      const duration = options?.duration || 3
      return 0.12 * (duration / 3) // Pika 定价示例
    }

    return 0
  }
}