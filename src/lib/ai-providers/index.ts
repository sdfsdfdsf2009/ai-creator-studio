// AI 提供商接口定义
export interface AIProvider {
  generateImage(prompt: string, options?: ImageGenerationOptions): Promise<string[]>
  generateVideo(prompt: string, options?: VideoGenerationOptions): Promise<string[]>
  testConnection(): Promise<boolean>
  getCostEstimate(type: 'image' | 'video', options?: any): number
}

export interface ImageGenerationOptions {
  model?: string
  size?: string
  quality?: string
  style?: string
  quantity?: number
  negativePrompt?: string
  seed?: number
}

export interface VideoGenerationOptions {
  model?: string
  duration?: number
  fps?: number
  motion?: string
  transition?: string
  cameraAngle?: string
  negativePrompt?: string
  seed?: number
}

// AI 提供商配置
export interface AIProviderConfig {
  apiKey: string
  baseUrl?: string
  timeout?: number
  retries?: number
}

// 错误类型
export class AIProviderError extends Error {
  constructor(
    message: string,
    public provider: string,
    public code?: string,
    public statusCode?: number
  ) {
    super(message)
    this.name = 'AIProviderError'
  }
}