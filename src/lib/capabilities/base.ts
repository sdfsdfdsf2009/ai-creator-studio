/**
 * 系统能力基础架构
 * 定义了所有能力模块的基础接口和抽象类
 */

import { Task, MediaType, TaskStatus } from '@/types'

// 基础能力接口
export interface ICapability {
  readonly name: string
  readonly version: string
  readonly description: string
  initialize(): Promise<void>
  isInitialized(): boolean
}

// 能力执行结果接口
export interface CapabilityResult<T = any> {
  success: boolean
  data?: T
  error?: string
  metadata?: Record<string, any>
}

// 能力配置接口
export interface CapabilityConfig {
  enabled: boolean
  options?: Record<string, any>
  dependencies?: string[]
}

// 通用选项接口
export interface BaseOptions {
  timeout?: number
  retries?: number
  retryDelay?: number
}

// 视频生成相关接口
export interface VideoOptions extends BaseOptions {
  duration?: number
  fps?: number
  motion?: string
  transition?: string
  cameraAngle?: string
  negativePrompt?: string
  seed?: number
  aspectRatio?: string
}

export interface VideoResult {
  url: string
  duration?: number
  format?: string
  size?: number
  thumbnailUrl?: string
  metadata?: Record<string, any>
}

export interface VideoStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  results?: string[]
  error?: string
  externalTaskId?: string
}

// 图像生成相关接口
export interface ImageOptions extends BaseOptions {
  size?: string
  quality?: string
  style?: string
  quantity?: number
  negativePrompt?: string
  seed?: number
  aspectRatio?: string
}

export interface ImageResult {
  url: string
  width?: number
  height?: number
  format?: string
  size?: number
  metadata?: Record<string, any>
}

// 任务管理相关接口
export interface TaskConfig {
  type: MediaType
  prompt: string
  model: string
  parameters?: Record<string, any>
  imageUrls?: string[]
  priority?: number
  tags?: string[]
}

export interface TaskUpdateConfig {
  status?: TaskStatus
  progress?: number
  error?: string
  results?: string[]
  metadata?: Record<string, any>
}

// 异步处理相关接口
export interface AsyncTaskConfig<T> extends BaseOptions {
  taskId: string
  executor: () => Promise<T>
  onProgress?: (progress: number) => void
  onSuccess?: (result: T) => void
  onError?: (error: Error) => void
  timeout?: number
}

export interface PollingConfig<T> extends BaseOptions {
  taskId: string
  poller: () => Promise<T>
  condition: (result: T) => boolean
  interval?: number
  maxDuration?: number
}

export interface AsyncContext {
  taskId: string
  operation: string
  startTime: number
  metadata?: Record<string, any>
}

export interface ErrorHandlingResult {
  shouldRetry: boolean
  delay?: number
  shouldFail?: boolean
  fallbackResult?: any
}

// 批量处理相关接口
export interface BatchTaskConfig {
  name: string
  description?: string
  basePrompt: string
  mediaType: MediaType
  models: Array<{
    modelId: string
    quantity: number
    parameters?: Record<string, any>
  }>
  baseParameters?: Record<string, any>
  maxConcurrent?: number
}

export interface BatchResult {
  totalTasks: number
  completedTasks: number
  failedTasks: number
  results: any[]
  errors: string[]
  duration: number
}

// 素材管理相关接口
export interface AssetConfig {
  type: MediaType
  url: string
  name: string
  taskId: string
  metadata?: Record<string, any>
  tags?: string[]
  category?: string
}

export interface Asset {
  id: string
  name: string
  type: MediaType
  url: string
  thumbnailUrl?: string
  size: number
  format: string
  width?: number
  height?: number
  duration?: number
  taskId: string
  tags: string[]
  category: string
  metadata: Record<string, any>
  createdAt: string
  updatedAt: string
}

export interface AssetContext {
  taskId: string
  model: string
  prompt: string
  parameters: Record<string, any>
}

// 外部集成相关接口
export interface ExternalAPIConfig extends BaseOptions {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  headers?: Record<string, string>
  body?: any
  service: string
}

export interface FeishuData {
  taskId: string
  type: MediaType
  prompt: string
  model: string
  parameters: Record<string, any>
  results?: string[]
}

// 能力错误类
export class CapabilityError extends Error {
  constructor(
    message: string,
    public readonly capabilityName: string,
    public readonly errorCode: string,
    public readonly details?: any
  ) {
    super(message)
    this.name = 'CapabilityError'
  }
}

// 抽象能力基类
export abstract class BaseCapability implements ICapability {
  protected _initialized = false
  protected _config: CapabilityConfig

  constructor(
    public readonly name: string,
    public readonly version: string,
    public readonly description: string,
    config: CapabilityConfig = { enabled: true }
  ) {
    this._config = config
  }

  async initialize(): Promise<void> {
    if (!this._config.enabled) {
      throw new CapabilityError(
        `Capability ${this.name} is disabled`,
        this.name,
        'CAPABILITY_DISABLED'
      )
    }

    await this.onInitialize()
    this._initialized = true
  }

  protected abstract onInitialize(): Promise<void>

  isInitialized(): boolean {
    return this._initialized
  }

  protected ensureInitialized(): void {
    if (!this._initialized) {
      throw new CapabilityError(
        `Capability ${this.name} is not initialized`,
        this.name,
        'CAPABILITY_NOT_INITIALIZED'
      )
    }
  }

  protected async executeWithRetry<T>(
    operation: () => Promise<T>,
    retries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error

    for (let i = 0; i <= retries; i++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error

        if (i === retries) {
          break
        }

        if (error instanceof CapabilityError && !this.shouldRetryError(error)) {
          break
        }

        await this.delay(delay * Math.pow(2, i)) // Exponential backoff
      }
    }

    throw lastError!
  }

  protected shouldRetryError(error: Error): boolean {
    if (error instanceof CapabilityError) {
      const nonRetryableCodes = [
        'CAPABILITY_DISABLED',
        'CAPABILITY_NOT_INITIALIZED',
        'INVALID_PARAMETERS',
        'PERMISSION_DENIED'
      ]
      return !nonRetryableCodes.includes(error.errorCode)
    }
    return true
  }

  protected delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  protected createResult<T>(success: boolean, data?: T, error?: string, metadata?: Record<string, any>): CapabilityResult<T> {
    return {
      success,
      data,
      error,
      metadata
    }
  }
}

// 能力工厂接口
export interface ICapabilityFactory {
  createCapability<T extends ICapability>(name: string, config?: CapabilityConfig): Promise<T>
  registerCapability<T extends ICapability>(name: string, capabilityClass: new (...args: any[]) => T): void
  getAvailableCapabilities(): string[]
}

// 能力管理器接口
export interface ICapabilityManager {
  initialize(): Promise<void>
  getCapability<T extends ICapability>(name: string): T | undefined
  executeCapability<T>(name: string, method: string, ...args: any[]): Promise<CapabilityResult<T>>
  shutdown(): Promise<void>
}