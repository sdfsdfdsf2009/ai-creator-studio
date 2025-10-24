import { ModelConfig } from '@/app/api/model-configs/route'
import { proxyAccountManager } from './proxy-account-manager'
import { proxyRouter } from './proxy-router'
import { failoverManager } from './failover-manager'
import { healthChecker } from './health-checker'
import { getDatabase } from './database'

export interface ModelInfo {
  id: string
  name: string
  provider: string
  supportedProviders: string[]
  mediaType: 'image' | 'video' | 'text'
  cost?: number
}

export interface ModelConfigWithAccount extends ModelConfig {
  proxyAccount?: any
  fallbackAccounts?: any[]
  healthStatus?: 'healthy' | 'unhealthy' | 'degraded' | 'unknown'
  performanceMetrics?: any
  routingPreferences?: any
  costOptimization?: any
}

export interface MultiAgentModelRequest {
  modelName: string
  mediaType: 'image' | 'video' | 'text'
  prompt?: string
  userId?: string
  maxCost?: number
  region?: string
  priority?: 'low' | 'normal' | 'high'
  enableFailover?: boolean
  preferredProviders?: string[]
  excludeProviders?: string[]
}

export interface MultiAgentExecutionResult {
  success: boolean
  result?: any
  selectedProxy: any
  selectedModel: string
  attempts: number
  totalDuration: number
  actualCost: number
  routingReason: string
  failoverEvents: any[]
  error?: string
  message: string
}

export class ModelConfigManager {
  private static instance: ModelConfigManager
  private configs: ModelConfigWithAccount[] = []
  private lastLoad: Date | null = null

  private constructor() {}

  static getInstance(): ModelConfigManager {
    if (!ModelConfigManager.instance) {
      ModelConfigManager.instance = new ModelConfigManager()
    }
    return ModelConfigManager.instance
  }

  async loadConfigs(): Promise<ModelConfigWithAccount[]> {
    try {
      const response = await fetch('/api/model-configs')
      const result = await response.json()

      if (result.success) {
        this.configs = result.data
        this.lastLoad = new Date()
        return this.configs
      } else {
        console.error('Failed to load model configs:', result.error)
        return []
      }
    } catch (error) {
      console.error('Error loading model configs:', error)
      return []
    }
  }

  async getConfigs(params?: { mediaType?: string; proxyAccountId?: string; enabled?: boolean }): Promise<ModelConfigWithAccount[]> {
    // 如果5分钟内没有加载过，重新加载
    if (!this.lastLoad || (Date.now() - this.lastLoad.getTime()) > 5 * 60 * 1000) {
      await this.loadConfigs()
    }

    let filteredConfigs = this.configs

    if (params?.mediaType) {
      filteredConfigs = filteredConfigs.filter(config => config.mediaType === params.mediaType)
    }

    if (params?.proxyAccountId) {
      filteredConfigs = filteredConfigs.filter(config => config.proxyAccountId === params.proxyAccountId)
    }

    if (params?.enabled !== undefined) {
      filteredConfigs = filteredConfigs.filter(config => config.enabled === params.enabled)
    }

    return filteredConfigs
  }

  async getConfig(id: string): Promise<ModelConfigWithAccount | null> {
    const configs = await this.getConfigs()
    return configs.find(config => config.id === id) || null
  }

  async createConfig(config: Omit<ModelConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<ModelConfigWithAccount | null> {
    try {
      const response = await fetch('/api/model-configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      })

      const result = await response.json()

      if (result.success) {
        await this.loadConfigs() // 重新加载配置
        return result.data
      } else {
        console.error('Failed to create model config:', result.error)
        return null
      }
    } catch (error) {
      console.error('Error creating model config:', error)
      return null
    }
  }

  async updateConfig(id: string, updates: Partial<ModelConfig>): Promise<ModelConfigWithAccount | null> {
    try {
      const response = await fetch('/api/model-configs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates })
      })

      const result = await response.json()

      if (result.success) {
        await this.loadConfigs() // 重新加载配置
        return result.data
      } else {
        console.error('Failed to update model config:', result.error)
        return null
      }
    } catch (error) {
      console.error('Error updating model config:', error)
      return null
    }
  }

  async deleteConfig(id: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/model-configs?id=${id}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        await this.loadConfigs() // 重新加载配置
        return true
      } else {
        console.error('Failed to delete model config:', result.error)
        return false
      }
    } catch (error) {
      console.error('Error deleting model config:', error)
      return false
    }
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

      // Text models
      { id: 'gpt-4o', name: 'GPT-4O', provider: 'openai', supportedProviders: ['openai', 'custom', 'nano-banana'], mediaType: 'text', cost: 0.005 },
      { id: 'gpt-4o-mini', name: 'GPT-4O Mini', provider: 'openai', supportedProviders: ['openai', 'custom', 'nano-banana'], mediaType: 'text', cost: 0.00015 },
      { id: 'gemini-2.0-pro', name: 'Gemini 2.0 Pro', provider: 'google', supportedProviders: ['google', 'custom'], mediaType: 'text', cost: 0.0025 },
      { id: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'anthropic', supportedProviders: ['anthropic', 'custom'], mediaType: 'text', cost: 0.003 },

      // EvoLink.AI / Nano Banana models - 通过EvoLink.AI聚合服务提供
      { id: 'gemini-2.5-flash-image', name: 'Gemini 2.5 Flash (EvoLink.AI)', provider: 'nano-banana', supportedProviders: ['nano-banana'], mediaType: 'image', cost: 1.6 },
      { id: 'gemini-2.0-pro-image', name: 'Gemini 2.0 Pro (EvoLink.AI)', provider: 'nano-banana', supportedProviders: ['nano-banana'], mediaType: 'image', cost: 2.4 },

      // EvoLink.AI 聚合的其他图片模型
      { id: 'dall-e-3-evolink', name: 'DALL-E 3 (EvoLink.AI)', provider: 'nano-banana', supportedProviders: ['nano-banana'], mediaType: 'image', cost: 0.04 },
      { id: 'midjourney-v6-evolink', name: 'Midjourney V6 (EvoLink.AI)', provider: 'nano-banana', supportedProviders: ['nano-banana'], mediaType: 'image', cost: 0.03 },
      { id: 'stable-diffusion-xl-evolink', name: 'Stable Diffusion XL (EvoLink.AI)', provider: 'nano-banana', supportedProviders: ['nano-banana'], mediaType: 'image', cost: 0.01 },
      { id: 'flux-pro-evolink', name: 'Flux Pro (EvoLink.AI)', provider: 'nano-banana', supportedProviders: ['nano-banana'], mediaType: 'image', cost: 0.03 },
      { id: 'flux-schnell-evolink', name: 'Flux Schnell (EvoLink.AI)', provider: 'nano-banana', supportedProviders: ['nano-banana'], mediaType: 'image', cost: 0.008 },
      { id: 'gpt-4o-image', name: 'GPT-4O Image (EvoLink.AI)', provider: 'nano-banana', supportedProviders: ['nano-banana'], mediaType: 'image', cost: 0.08 },

      // EvoLink.AI 视频模型
      { id: 'veo3-fast-evolink', name: 'Veo 3 Fast (EvoLink.AI)', provider: 'nano-banana', supportedProviders: ['nano-banana'], mediaType: 'video', cost: 0.12 },
      { id: 'sora-1.0-evolink', name: 'Sora 1.0 (EvoLink.AI)', provider: 'nano-banana', supportedProviders: ['nano-banana'], mediaType: 'video', cost: 0.50 },
      { id: 'runway-gen3-evolink', name: 'Runway Gen-3 (EvoLink.AI)', provider: 'nano-banana', supportedProviders: ['nano-banana'], mediaType: 'video', cost: 0.25 },
      { id: 'pika-labs-evolink', name: 'Pika Labs (EvoLink.AI)', provider: 'nano-banana', supportedProviders: ['nano-banana'], mediaType: 'video', cost: 0.12 },
      { id: 'luma-dream-machine-evolink', name: 'Luma Dream Machine (EvoLink.AI)', provider: 'nano-banana', supportedProviders: ['nano-banana'], mediaType: 'video', cost: 0.12 },

      // EvoLink.AI 文本模型
      { id: 'gemini-2.5-flash-text', name: 'Gemini 2.5 Flash Text (EvoLink.AI)', provider: 'nano-banana', supportedProviders: ['nano-banana'], mediaType: 'text', cost: 0.000325 },
      { id: 'gemini-2.0-pro-text', name: 'Gemini 2.0 Pro Text (EvoLink.AI)', provider: 'nano-banana', supportedProviders: ['nano-banana'], mediaType: 'text', cost: 0.0025 },
      { id: 'gpt-4o-evolink', name: 'GPT-4O (EvoLink.AI)', provider: 'nano-banana', supportedProviders: ['nano-banana'], mediaType: 'text', cost: 0.005 },
      { id: 'claude-3.5-sonnet-evolink', name: 'Claude 3.5 Sonnet (EvoLink.AI)', provider: 'nano-banana', supportedProviders: ['nano-banana'], mediaType: 'text', cost: 0.003 },
    ]

    if (mediaType) {
      return allModels.filter(model => model.mediaType === mediaType)
    }

    return allModels
  }

  async getAvailableModelsForMediaType(mediaType: 'image' | 'video' | 'text'): Promise<ModelConfigWithAccount[]> {
    const configs = await this.getConfigs({ mediaType, enabled: true })
    return configs
  }

  async getConfigForModel(modelName: string): Promise<ModelConfigWithAccount | null> {
    const configs = await this.getConfigs({ enabled: true })
    return configs.find(config => config.modelName === modelName) || null
  }

  async getAccountForModel(modelName: string): Promise<any> {
    const config = await this.getConfigForModel(modelName)
    if (config?.proxyAccountId) {
      return await proxyAccountManager.getAccount(config.proxyAccountId)
    }
    return null
  }

  isModelConfigured(modelName: string): boolean {
    return this.configs.some(config => config.modelName === modelName && config.enabled)
  }

  getModelsForAccount(proxyAccountId: string): ModelConfigWithAccount[] {
    return this.configs.filter(config => config.proxyAccountId === proxyAccountId && config.enabled)
  }

  async initializeDefaultModels(): Promise<void> {
    const accounts = await proxyAccountManager.getAccounts()
    const existingConfigs = await this.getConfigs()

    // 为每个可用的提供商初始化默认模型
    for (const account of accounts.filter(a => a.enabled)) {
      const existingAccountConfigs = existingConfigs.filter(c => c.proxyAccountId === account.id)

      // 如果这个账号还没有配置任何模型，添加默认模型
      if (existingAccountConfigs.length === 0) {
        const defaultModels = this.getDefaultModelsForProvider(account.provider)

        for (const model of defaultModels) {
          await this.createConfig({
            modelName: model.id,
            proxyAccountId: account.id,
            mediaType: model.mediaType,
            cost: model.cost || 0,
            enabled: true,
            settings: {}
          })
        }
      }
    }
  }

  private getDefaultModelsForProvider(provider: string): ModelInfo[] {
    switch (provider) {
      case 'openai':
        return this.getAvailableModels().filter(m =>
          m.supportedProviders.includes('openai') &&
          ['dall-e-3', 'gpt-4o', 'sora-1.0'].includes(m.id)
        )
      case 'nano-banana':
        return this.getAvailableModels().filter(m =>
          m.supportedProviders.includes('nano-banana')
        )
      case 'google':
        return this.getAvailableModels().filter(m =>
          m.supportedProviders.includes('google')
        )
      case 'anthropic':
        return this.getAvailableModels().filter(m =>
          m.supportedProviders.includes('anthropic')
        )
      case 'custom':
        return this.getAvailableModels().filter(m =>
          m.supportedProviders.includes('custom')
        )
      default:
        return []
    }
  }

  getModelIcon(mediaType: string): string {
    switch (mediaType) {
      case 'image': return '🎨'
      case 'video': return '🎬'
      case 'text': return '📝'
      default: return '📦'
    }
  }

  // ========== 多代理功能扩展 ==========

  /**
   * 使用多代理智能路由执行模型请求
   */
  async executeWithMultiAgent(
    request: MultiAgentModelRequest,
    executor: (proxy: any, model: string) => Promise<any>
  ): Promise<MultiAgentExecutionResult> {
    const startTime = Date.now()

    try {
      console.log(`🎯 Executing multi-agent request for model: ${request.modelName}`)

      // 1. 智能路由选择最佳代理
      const routingDecision = await proxyRouter.selectOptimalProxy({
        mediaType: request.mediaType,
        model: request.modelName,
        prompt: request.prompt,
        userId: request.userId,
        maxCost: request.maxCost,
        region: request.region,
        priority: request.priority || 'normal'
      })

      console.log(`📍 Selected proxy: ${routingDecision.selectedProxy.name} (${routingDecision.selectedProxy.provider})`)
      console.log(`📍 Routing reason: ${routingDecision.routingReason}`)

      // 2. 执行请求（如果启用故障转移）
      if (request.enableFailover !== false) {
        const failoverResult = await failoverManager.executeWithFailover(
          request,
          async (proxy: any) => {
            return await executor(proxy, routingDecision.selectedModel)
          }
        )

        // 计算实际成本
        const actualCost = this.calculateActualCost(routingDecision, request)

        return {
          success: failoverResult.success,
          result: failoverResult.result,
          selectedProxy: failoverResult.finalProxy,
          selectedModel: routingDecision.selectedModel,
          attempts: failoverResult.attempts,
          totalDuration: failoverResult.totalDuration,
          actualCost,
          routingReason: failoverResult.success ? routingDecision.routingReason : 'Failover used',
          failoverEvents: failoverResult.failoverEvents,
          error: failoverResult.error,
          message: failoverResult.message
        }
      } else {
        // 不启用故障转移，直接执行
        const result = await executor(routingDecision.selectedProxy, routingDecision.selectedModel)
        const duration = Date.now() - startTime
        const actualCost = this.calculateActualCost(routingDecision, request)

        // 更新性能指标
        await proxyRouter.updateProxyPerformance(routingDecision.selectedProxy.id, {
          responseTime: duration,
          success: true,
          timestamp: new Date()
        })

        return {
          success: true,
          result,
          selectedProxy: routingDecision.selectedProxy,
          selectedModel: routingDecision.selectedModel,
          attempts: 1,
          totalDuration: duration,
          actualCost,
          routingReason: routingDecision.routingReason,
          failoverEvents: [],
          message: 'Request executed successfully'
        }
      }

    } catch (error) {
      console.error(`❌ Multi-agent execution failed:`, error)
      return {
        success: false,
        selectedProxy: null,
        selectedModel: request.modelName,
        attempts: 0,
        totalDuration: Date.now() - startTime,
        actualCost: 0,
        routingReason: 'Execution failed',
        failoverEvents: [],
        error: error.message,
        message: `Multi-agent execution failed: ${error.message}`
      }
    }
  }

  /**
   * 获取模型的多代理配置（包含故障转移账户）
   */
  async getMultiAgentConfigForModel(modelName: string): Promise<ModelConfigWithAccount | null> {
    try {
      const db = await getDatabase()
      const configs = await db.getModelConfigs({ enabled: true })

      // 查找主配置
      const mainConfig = configs.find(config => config.modelName === modelName)
      if (!mainConfig) {
        return null
      }

      // 获取主代理账户
      const mainAccount = mainConfig.proxyAccountId
        ? await db.getProxyAccount(mainConfig.proxyAccountId)
        : null

      // 解析故障转移账户
      let fallbackAccounts: any[] = []
      if (mainConfig.fallback_accounts) {
        try {
          const fallbackList = JSON.parse(mainConfig.fallback_accounts)
          for (const fallback of fallbackList) {
            const account = await db.getProxyAccount(fallback.id)
            if (account && account.enabled) {
              fallbackAccounts.push({
                ...account,
                priority: fallback.priority || 999
              })
            }
          }
          fallbackAccounts.sort((a, b) => a.priority - b.priority)
        } catch (error) {
          console.warn('Failed to parse fallback accounts:', error)
        }
      }

      // 获取健康状态
      let healthStatus: 'healthy' | 'unhealthy' | 'degraded' | 'unknown' = 'unknown'
      if (mainAccount) {
        const healthResults = await healthChecker.getAllProxyHealth()
        const proxyHealth = healthResults.find(h => h.proxyId === mainAccount.id)
        if (proxyHealth) {
          healthStatus = proxyHealth.status
        }
      }

      // 解析性能指标
      let performanceMetrics = null
      if (mainAccount?.performance_metrics) {
        try {
          performanceMetrics = JSON.parse(mainAccount.performance_metrics)
        } catch (error) {
          console.warn('Failed to parse performance metrics:', error)
        }
      }

      // 解析路由偏好
      let routingPreferences = null
      if (mainConfig.routing_preferences) {
        try {
          routingPreferences = JSON.parse(mainConfig.routing_preferences)
        } catch (error) {
          console.warn('Failed to parse routing preferences:', error)
        }
      }

      // 解析成本优化配置
      let costOptimization = null
      if (mainConfig.cost_optimization) {
        try {
          costOptimization = JSON.parse(mainConfig.cost_optimization)
        } catch (error) {
          console.warn('Failed to parse cost optimization:', error)
        }
      }

      return {
        ...mainConfig,
        proxyAccount: mainAccount,
        fallbackAccounts,
        healthStatus,
        performanceMetrics,
        routingPreferences,
        costOptimization
      }

    } catch (error) {
      console.error(`❌ Failed to get multi-agent config for model ${modelName}:`, error)
      return null
    }
  }

  /**
   * 获取所有启用的代理账户的健康状态
   */
  async getProxyHealthStatus(): Promise<any[]> {
    try {
      return await healthChecker.getAllProxyHealth()
    } catch (error) {
      console.error('❌ Failed to get proxy health status:', error)
      return []
    }
  }

  /**
   * 获取可用的代理账户列表（按健康状态和性能排序）
   */
  async getAvailableProxies(mediaType?: string): Promise<any[]> {
    try {
      const db = await getDatabase()
      const proxies = await db.getProxyAccounts({ enabled: true })

      // 获取健康状态
      const healthResults = await healthChecker.getAllProxyHealth()

      // 合并健康状态信息
      const proxiesWithHealth = proxies.map(proxy => {
        const health = healthResults.find(h => h.proxyId === proxy.id)
        return {
          ...proxy,
          healthStatus: health?.status || 'unknown',
          responseTime: health?.responseTime || 0,
          successRate: health?.successRate || 0,
          uptime: health?.uptime || 0
        }
      })

      // 过滤媒体类型支持
      let filteredProxies = proxiesWithHealth
      if (mediaType) {
        filteredProxies = proxiesWithHealth.filter(proxy => {
          if (!proxy.capabilities) return true
          try {
            const capabilities = JSON.parse(proxy.capabilities)
            return capabilities.includes(mediaType) || capabilities.length === 0
          } catch {
            return true
          }
        })
      }

      // 按健康状态和性能排序
      return filteredProxies.sort((a, b) => {
        // 优先级：健康 > 降级 > 不健康 > 未知
        const statusOrder = { healthy: 0, degraded: 1, unknown: 2, unhealthy: 3 }
        const aStatus = statusOrder[a.healthStatus] || 999
        const bStatus = statusOrder[b.healthStatus] || 999

        if (aStatus !== bStatus) {
          return aStatus - bStatus
        }

        // 相同健康状态按优先级排序
        if (a.priority !== b.priority) {
          return a.priority - b.priority
        }

        // 最后按成功率排序
        return (b.successRate || 0) - (a.successRate || 0)
      })

    } catch (error) {
      console.error('❌ Failed to get available proxies:', error)
      return []
    }
  }

  /**
   * 设置模型的故障转移配置
   */
  async setFailoverConfig(
    modelName: string,
    primaryProxyId: string,
    fallbackProxyIds: string[] = []
  ): Promise<boolean> {
    try {
      const db = await getDatabase()
      const config = await db.getModelConfigs({ enabled: true })
      const modelConfig = config.find(c => c.modelName === modelName)

      if (!modelConfig) {
        throw new Error(`Model configuration not found: ${modelName}`)
      }

      // 构建故障转移列表
      const fallbackAccounts = fallbackProxyIds.map((id, index) => ({
        id,
        priority: index + 1
      }))

      // 更新配置
      await db.updateModelConfig(modelConfig.id, {
        proxyAccountId: primaryProxyId,
        fallback_accounts: JSON.stringify(fallbackAccounts),
        auto_failover: 1
      })

      console.log(`✅ Failover config set for ${modelName}: primary=${primaryProxyId}, fallbacks=${fallbackProxyIds.join(',')}`)
      return true

    } catch (error) {
      console.error(`❌ Failed to set failover config for ${modelName}:`, error)
      return false
    }
  }

  /**
   * 触发手动故障转移
   */
  async triggerManualFailover(proxyId: string, reason: string = 'Manual failover triggered'): Promise<boolean> {
    try {
      await failoverManager.triggerManualFailover(proxyId, reason)
      console.log(`✅ Manual failover triggered for proxy: ${proxyId}`)
      return true
    } catch (error) {
      console.error(`❌ Failed to trigger manual failover:`, error)
      return false
    }
  }

  /**
   * 手动恢复代理
   */
  async manualRecovery(proxyId: string): Promise<boolean> {
    try {
      await failoverManager.manualRecovery(proxyId)
      console.log(`✅ Manual recovery completed for proxy: ${proxyId}`)
      return true
    } catch (error) {
      console.error(`❌ Failed to manual recover proxy:`, error)
      return false
    }
  }

  /**
   * 获取故障转移统计信息
   */
  getFailoverStats(): any {
    return failoverManager.getFailoverStats()
  }

  /**
   * 启动健康检查服务
   */
  async startHealthMonitoring(): Promise<void> {
    try {
      await healthChecker.start()
      console.log('✅ Health monitoring started')
    } catch (error) {
      console.error('❌ Failed to start health monitoring:', error)
    }
  }

  /**
   * 停止健康检查服务
   */
  async stopHealthMonitoring(): Promise<void> {
    try {
      await healthChecker.stop()
      console.log('✅ Health monitoring stopped')
    } catch (error) {
      console.error('❌ Failed to stop health monitoring:', error)
    }
  }

  /**
   * 启动故障转移监控
   */
  async startFailoverMonitoring(): Promise<void> {
    try {
      await failoverManager.startMonitoring()
      console.log('✅ Failover monitoring started')
    } catch (error) {
      console.error('❌ Failed to start failover monitoring:', error)
    }
  }

  /**
   * 停止故障转移监控
   */
  async stopFailoverMonitoring(): Promise<void> {
    try {
      await failoverManager.stopMonitoring()
      console.log('✅ Failover monitoring stopped')
    } catch (error) {
      console.error('❌ Failed to stop failover monitoring:', error)
    }
  }

  /**
   * 计算实际成本
   */
  private calculateActualCost(routingDecision: any, request: MultiAgentModelRequest): number {
    let baseCost = routingDecision.estimatedCost || 0

    // 根据提示词长度调整成本
    if (request.prompt) {
      const promptMultiplier = Math.min(request.prompt.length / 1000, 5)
      baseCost *= promptMultiplier
    }

    // 考虑代理提供商的成本调整
    if (routingDecision.selectedProxy?.provider) {
      const providerMultiplier = this.getProviderCostMultiplier(routingDecision.selectedProxy.provider)
      baseCost *= providerMultiplier
    }

    return Math.round(baseCost * 10000) / 10000 // 保留4位小数
  }

  /**
   * 获取提供商成本乘数
   */
  private getProviderCostMultiplier(provider: string): number {
    const multipliers: Record<string, number> = {
      'openai': 1.0,
      'anthropic': 1.1,
      'google': 0.8,
      'nano-banana': 0.9,
      'custom': 1.0
    }
    return multipliers[provider.toLowerCase()] || 1.0
  }

  /**
   * 获取多代理系统状态
   */
  async getMultiAgentSystemStatus(): Promise<{
    healthChecker: any
    failoverManager: any
    proxyStats: any
    enabledProxies: number
    healthyProxies: number
  }> {
    try {
      const [healthStatus, failoverStats, proxyHealth] = await Promise.all([
        healthChecker.getServiceStatus(),
        failoverManager.getServiceStatus(),
        healthChecker.getAllProxyHealth()
      ])

      const enabledProxies = proxyHealth.length
      const healthyProxies = proxyHealth.filter(p => p.isHealthy).length

      return {
        healthChecker: healthStatus,
        failoverManager: failoverStats,
        proxyStats: {
          total: enabledProxies,
          healthy: healthyProxies,
          unhealthy: enabledProxies - healthyProxies,
          uptime: enabledProxies > 0 ? (healthyProxies / enabledProxies) * 100 : 0
        },
        enabledProxies,
        healthyProxies
      }
    } catch (error) {
      console.error('❌ Failed to get multi-agent system status:', error)
      return {
        healthChecker: { isRunning: false },
        failoverManager: { isRunning: false },
        proxyStats: { total: 0, healthy: 0, unhealthy: 0, uptime: 0 },
        enabledProxies: 0,
        healthyProxies: 0
      }
    }
  }
}

// 导出单例实例
export const modelConfigManager = ModelConfigManager.getInstance()