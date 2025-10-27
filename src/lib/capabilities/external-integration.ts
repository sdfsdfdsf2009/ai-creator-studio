/**
 * 外部集成能力
 * 统一的外部服务集成框架，包括飞书集成、第三方API调用等
 */

import { BaseCapability, ExternalAPIConfig, FeishuData, CapabilityResult, CapabilityConfig } from './base'
import { registerCapability } from './manager'

export class ExternalIntegrationCapability extends BaseCapability {
  private apiCredentials = new Map<string, { apiKey: string; baseUrl?: string }>()
  private rateLimiters = new Map<string, { requests: number[]; maxRequests: number; windowMs: number }>()

  constructor(config: CapabilityConfig = { enabled: true }) {
    super(
      'ExternalIntegration',
      '1.0.0',
      '外部集成能力，提供统一的外部服务集成、API调用、限流和错误处理功能',
      config
    )
  }

  protected async onInitialize(): Promise<void> {
    // 初始化外部服务配置
    await this.loadExternalConfigurations()
    console.log('✅ ExternalIntegration capability initialized')
  }

  /**
   * 集成飞书服务
   */
  async integrateWithFeishu(data: FeishuData): Promise<CapabilityResult<boolean>> {
    this.ensureInitialized()

    try {
      console.log(`📊 集成飞书: 任务 ${data.taskId}`)

      // 检查飞书配置
      const feishuConfig = this.apiCredentials.get('feishu')
      if (!feishuConfig) {
        return this.createResult(false, undefined, '飞书配置未设置')
      }

      // 调用飞书API
      const result = await this.callFeishuAPI(data)

      console.log(`✅ 飞书集成成功: ${data.taskId}`)
      return this.createResult(true, result)

    } catch (error) {
      console.error(`❌ 飞书集成失败:`, error)

      // 飞书集成失败不应该影响主要功能
      console.warn('飞书集成失败，但不影响主要功能')
      return this.createResult(false, undefined, error instanceof Error ? error.message : 'Unknown error', {
        isWarning: true
      })
    }
  }

  /**
   * 调用外部API
   */
  async callExternalAPI<T>(config: ExternalAPIConfig): Promise<CapabilityResult<T>> {
    this.ensureInitialized()

    try {
      console.log(`🌐 调用外部API: ${config.service} - ${config.method || 'GET'} ${config.url}`)

      // 检查限流
      await this.checkRateLimit(config.service)

      // 获取认证信息
      const credentials = this.apiCredentials.get(config.service)
      if (!credentials) {
        return this.createResult(false, undefined, `服务 ${config.service} 的认证信息未配置`)
      }

      // 构建请求头
      const headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'AI-Creator-Studio/1.0',
        ...config.headers
      }

      // 添加认证头
      if (credentials.apiKey) {
        headers['Authorization'] = `Bearer ${credentials.apiKey}`
      }

      // 构建请求选项
      const requestOptions: RequestInit = {
        method: config.method || 'GET',
        headers,
        signal: AbortSignal.timeout(config.timeout || 30000)
      }

      if (config.body && (config.method || 'GET') !== 'GET') {
        requestOptions.body = JSON.stringify(config.body)
      }

      // 发起请求
      const response = await fetch(config.url, requestOptions)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      // 解析响应
      const contentType = response.headers.get('content-type')
      let result: T

      if (contentType?.includes('application/json')) {
        result = await response.json()
      } else {
        result = (await response.text()) as unknown as T
      }

      console.log(`✅ 外部API调用成功: ${config.service}`)
      return this.createResult(true, result, undefined, {
        service: config.service,
        status: response.status,
        responseTime: Date.now()
      })

    } catch (error) {
      console.error(`❌ 外部API调用失败:`, error)

      const errorResult = await this.handleIntegrationError(error as Error, config.service)

      return this.createResult(false, undefined, error instanceof Error ? error.message : 'Unknown error', {
        service: config.service,
        errorType: error instanceof Error ? error.constructor.name : 'Unknown',
        shouldRetry: errorResult.shouldRetry
      })
    }
  }

  /**
   * 批量调用外部API
   */
  async callExternalAPIBatch<T>(
    configs: ExternalAPIConfig[],
    maxConcurrency: number = 3
  ): Promise<CapabilityResult<{
    results: Array<{ config: ExternalAPIConfig; result: T | null }>
    successCount: number
    failureCount: number
    errors: string[]
  }>> {
    this.ensureInitialized()

    try {
      console.log(`🚀 批量调用外部API: ${configs.length} 个请求, 并发=${maxConcurrency}`)

      const results: Array<{ config: ExternalAPIConfig; result: T | null }> = []
      const errors: string[] = []
      let successCount = 0
      let failureCount = 0

      // 分批并发执行
      for (let i = 0; i < configs.length; i += maxConcurrency) {
        const batch = configs.slice(i, i + maxConcurrency)

        const batchPromises = batch.map(async (config) => {
          const result = await this.callExternalAPI<T>(config)

          if (result.success) {
            results.push({ config, result: result.data || null })
            successCount++
          } else {
            results.push({ config, result: null })
            errors.push(`${config.service}: ${result.error}`)
            failureCount++
          }
        })

        await Promise.all(batchPromises)

        console.log(`📊 批次进度: ${Math.min(i + maxConcurrency, configs.length)}/${configs.length}`)
      }

      console.log(`✅ 批量API调用完成: 成功 ${successCount}, 失败 ${failureCount}`)

      return this.createResult(true, {
        results,
        successCount,
        failureCount,
        errors
      }, undefined, {
        totalRequests: configs.length,
        successRate: Math.round((successCount / configs.length) * 100)
      })

    } catch (error) {
      console.error(`❌ 批量API调用失败:`, error)
      return this.createResult(false, undefined, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  /**
   * 配置外部服务认证
   */
  configureService(service: string, credentials: { apiKey: string; baseUrl?: string }): CapabilityResult<boolean> {
    try {
      console.log(`🔧 配置外部服务: ${service}`)

      this.apiCredentials.set(service, credentials)

      // 初始化限流器
      if (!this.rateLimiters.has(service)) {
        this.rateLimiters.set(service, {
          requests: [],
          maxRequests: this.getDefaultRateLimit(service),
          windowMs: 60000 // 1分钟窗口
        })
      }

      console.log(`✅ 外部服务配置成功: ${service}`)
      return this.createResult(true, true)

    } catch (error) {
      console.error(`❌ 配置外部服务失败:`, error)
      return this.createResult(false, undefined, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  /**
   * 获取服务配置
   */
  getServiceConfig(service: string): CapabilityResult<{ apiKey: string; baseUrl?: string } | null> {
    const config = this.apiCredentials.get(service)
    return this.createResult(true, config || null)
  }

  /**
   * 获取所有已配置的服务
   */
  getConfiguredServices(): string[] {
    return Array.from(this.apiCredentials.keys())
  }

  /**
   * 测试外部服务连接
   */
  async testServiceConnection(service: string): Promise<CapabilityResult<boolean>> {
    this.ensureInitialized()

    try {
      console.log(`🔍 测试服务连接: ${service}`)

      const credentials = this.apiCredentials.get(service)
      if (!credentials) {
        return this.createResult(false, undefined, `服务 ${service} 未配置`)
      }

      // 根据服务类型选择测试方法
      let testConfig: ExternalAPIConfig

      switch (service) {
        case 'feishu':
          testConfig = {
            url: 'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
            method: 'POST',
            service: 'feishu',
            body: {
              app_id: 'test',
              app_secret: credentials.apiKey
            }
          }
          break

        case 'evolink':
          testConfig = {
            url: 'https://api.evolink.ai/v1/models',
            service: 'evolink'
          }
          break

        default:
          return this.createResult(false, undefined, `不支持测试的服务: ${service}`)
      }

      const result = await this.callExternalAPI(testConfig)

      console.log(`✅ 服务连接测试成功: ${service}`)
      return this.createResult(true, true)

    } catch (error) {
      console.error(`❌ 服务连接测试失败:`, error)
      return this.createResult(false, undefined, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  /**
   * 获取API调用统计
   */
  getAPIStatistics(): CapabilityResult<{
    services: Record<string, {
      totalRequests: number
      currentWindowRequests: number
      rateLimit: number
      status: 'active' | 'rate-limited' | 'configured'
    }>
    totalServices: number
    activeServices: number
  }> {
    const services: Record<string, any> = {}

    for (const [service, credentials] of this.apiCredentials) {
      const rateLimiter = this.rateLimiters.get(service)
      const currentRequests = rateLimiter ? rateLimiter.requests.length : 0

      services[service] = {
        totalRequests: 0, // 这里可以实现持久化统计
        currentWindowRequests: currentRequests,
        rateLimit: rateLimiter?.maxRequests || 0,
        status: currentRequests >= (rateLimiter?.maxRequests || 0) ? 'rate-limited' : 'active'
      }
    }

    return this.createResult(true, {
      services,
      totalServices: this.apiCredentials.size,
      activeServices: Array.from(services.values()).filter(s => s.status === 'active').length
    })
  }

  // 私有方法

  private async loadExternalConfigurations(): Promise<void> {
    try {
      // 从环境变量加载配置
      const feishuAppId = process.env.FEISHU_APP_ID
      const feishuAppSecret = process.env.FEISHU_APP_SECRET

      if (feishuAppId && feishuAppSecret) {
        this.configureService('feishu', { apiKey: feishuAppSecret })
      }

      const evolinkToken = process.env.EVOLINK_API_TOKEN
      if (evolinkToken) {
        this.configureService('evolink', { apiKey: evolinkToken })
      }

      // 其他服务配置...

    } catch (error) {
      console.warn('加载外部配置失败:', error)
    }
  }

  private async callFeishuAPI(data: FeishuData): Promise<any> {
    // 动态导入飞书API
    const { feishuAPI } = await import('@/lib/feishu')

    try {
      await feishuAPI.createTaskRecord({
        taskId: data.taskId,
        type: data.type,
        prompt: data.prompt,
        model: data.model,
        parameters: data.parameters,
        results: data.results
      })

      return true
    } catch (error) {
      throw new Error(`飞书API调用失败: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async checkRateLimit(service: string): Promise<void> {
    const rateLimiter = this.rateLimiters.get(service)
    if (!rateLimiter) return

    const now = Date.now()
    const windowStart = now - rateLimiter.windowMs

    // 清理过期请求记录
    rateLimiter.requests = rateLimiter.requests.filter(timestamp => timestamp > windowStart)

    // 检查是否超过限制
    if (rateLimiter.requests.length >= rateLimiter.maxRequests) {
      const oldestRequest = Math.min(...rateLimiter.requests)
      const waitTime = oldestRequest + rateLimiter.windowMs - now

      if (waitTime > 0) {
        console.log(`⏳ 触发限流: ${service}, 等待 ${waitTime}ms`)
        await this.delay(waitTime)
      }
    }

    // 记录当前请求
    rateLimiter.requests.push(now)
  }

  private getDefaultRateLimit(service: string): number {
    const limits: Record<string, number> = {
      'feishu': 100,
      'evolink': 60,
      'openai': 60,
      'default': 30
    }

    return limits[service] || limits.default
  }

  private async handleIntegrationError(error: Error, service: string): Promise<{
    shouldRetry: boolean
    delay?: number
  }> {
    const errorMessage = error.message.toLowerCase()

    // 网络错误 - 应该重试
    if (errorMessage.includes('network') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('connection')) {
      return {
        shouldRetry: true,
        delay: 2000
      }
    }

    // 认证错误 - 不应该重试
    if (errorMessage.includes('unauthorized') ||
        errorMessage.includes('authentication') ||
        errorMessage.includes('forbidden')) {
      return {
        shouldRetry: false
      }
    }

    // 限流错误 - 延迟重试
    if (errorMessage.includes('rate limit') ||
        errorMessage.includes('quota') ||
        errorMessage.includes('too many requests')) {
      return {
        shouldRetry: true,
        delay: 60000 // 1分钟
      }
    }

    // 服务器错误 - 可以重试
    if (errorMessage.includes('500') ||
        errorMessage.includes('502') ||
        errorMessage.includes('503') ||
        errorMessage.includes('504')) {
      return {
        shouldRetry: true,
        delay: 5000
      }
    }

    // 默认不重试
    return {
      shouldRetry: false
    }
  }

  /**
   * 关闭能力
   */
  async shutdown(): Promise<void> {
    console.log('🔄 Shutting down ExternalIntegration capability...')

    // 清理资源
    this.apiCredentials.clear()
    this.rateLimiters.clear()
    this._initialized = false

    console.log('✅ ExternalIntegration capability shutdown complete')
  }
}

// 注册能力
registerCapability('ExternalIntegration', ExternalIntegrationCapability)