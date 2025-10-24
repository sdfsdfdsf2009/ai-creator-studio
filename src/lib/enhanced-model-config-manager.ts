/**
 * 增强版模型配置管理器
 * 支持多代理架构，集成智能路由和故障转移
 */

import { Database } from './database'
import { EnhancedProxyAccountManager } from './enhanced-proxy-account-manager'
import { ProxyRouter, RoutingDecision } from './proxy-router'

export interface ModelInfo {
  id: string
  name: string
  provider: string
  supportedProviders: string[]
  mediaType: 'image' | 'video' | 'text'
  cost?: number
  capabilities?: string[]
  maxTokens?: number
  supportedSizes?: string[]
  qualityLevels?: string[]
}

export interface ModelConfig {
  id: string
  modelName: string
  proxyAccountId: string
  fallbackAccountIds?: string[]
  mediaType: 'image' | 'video' | 'text'
  cost: number
  enabled: boolean
  settings: any
  routingPreferences?: {
    prioritizeCost?: boolean
    prioritizeSpeed?: boolean
    maxRetries?: number
    timeout?: number
  }
  autoFailover?: boolean
  performanceStats?: {
    averageResponseTime: number
    successRate: number
    totalRequests: number
    lastUsed?: string
  }
  createdAt: string
  updatedAt: string
}

export interface ModelConfigWithAccount extends ModelConfig {
  proxyAccount?: any
  fallbackAccounts?: any[]
}

export interface ModelSelectionResult {
  config: ModelConfigWithAccount
  routingDecision: RoutingDecision
  estimatedCost: number
  estimatedResponseTime: number
  confidence: number
}

export class EnhancedModelConfigManager {
  private database: Database
  private proxyAccountManager: EnhancedProxyAccountManager
  private proxyRouter: ProxyRouter
  private configs: ModelConfigWithAccount[] = []
  private lastLoad: Date | null = null

  constructor(database: Database) {
    this.database = database
    this.proxyAccountManager = new EnhancedProxyAccountManager(database)
    this.proxyRouter = new ProxyRouter(database)
  }

  /**
   * 初始化管理器
   */
  async initialize(): Promise<void> {
    console.log('🔄 初始化增强版模型配置管理器...')

    // 初始化代理账户管理器
    await this.proxyAccountManager.initialize()

    // 初始化路由器
    await this.proxyRouter.initialize()

    // 加载模型配置
    await this.loadConfigs()

    console.log('✅ 增强版模型配置管理器初始化完成')
  }

  /**
   * 加载模型配置
   */
  async loadConfigs(): Promise<ModelConfigWithAccount[]> {
    try {
      const configs = await this.database.getModelConfigs()

      // 为每个配置加载代理账户信息
      this.configs = await Promise.all(
        configs.map(async (config: any) => {
          const proxyAccount = await this.proxyAccountManager.getProxyAccount(config.proxy_account_id)
          const fallbackAccounts = config.fallback_account_ids
            ? await Promise.all(
                config.fallback_account_ids.map((id: string) =>
                  this.proxyAccountManager.getProxyAccount(id)
                )
              )
            : []

          return this.formatModelConfig(config, proxyAccount, fallbackAccounts)
        })
      )

      this.lastLoad = new Date()
      return this.configs
    } catch (error) {
      console.error('加载模型配置失败:', error)
      return []
    }
  }

  /**
   * 获取模型配置
   */
  async getConfigs(params?: {
    mediaType?: string;
    proxyAccountId?: string;
    enabled?: boolean;
    provider?: string;
  }): Promise<ModelConfigWithAccount[]> {
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

    if (params?.provider) {
      filteredConfigs = filteredConfigs.filter(config =>
        config.proxyAccount?.provider === params.provider
      )
    }

    return filteredConfigs
  }

  /**
   * 获取单个模型配置
   */
  async getConfig(id: string): Promise<ModelConfigWithAccount | null> {
    const configs = await this.getConfigs()
    return configs.find(config => config.id === id) || null
  }

  /**
   * 智能选择最佳模型配置
   */
  async selectBestConfig(params: {
    modelName?: string
    mediaType: 'image' | 'video' | 'text'
    taskType: string
    userId?: string
    prompt?: string
    parameters?: any
    prioritizeCost?: boolean
    prioritizeSpeed?: boolean
  }): Promise<ModelSelectionResult> {
    console.log(`🎯 智能选择最佳模型配置: ${params.modelName || params.mediaType}`)

    // 1. 获取可用的模型配置
    const availableConfigs = await this.getAvailableConfigs(params)

    if (availableConfigs.length === 0) {
      throw new Error(`没有可用的 ${params.mediaType} 模型配置`)
    }

    // 2. 如果指定了模型名称，优先查找匹配的配置
    if (params.modelName) {
      const exactMatch = availableConfigs.find(config => config.modelName === params.modelName)
      if (exactMatch) {
        return await this.createSelectionResult(exactMatch, params)
      }
    }

    // 3. 使用智能路由选择最佳配置
    const bestConfig = this.selectBestConfigByScore(availableConfigs, params)
    return await this.createSelectionResult(bestConfig, params)
  }

  /**
   * 获取可用的模型配置
   */
  private async getAvailableConfigs(params: {
    mediaType: 'image' | 'video' | 'text'
    taskType: string
    userId?: string
    prioritizeCost?: boolean
    prioritizeSpeed?: boolean
  }): Promise<ModelConfigWithAccount[]> {
    const configs = await this.getConfigs({
      mediaType: params.mediaType,
      enabled: true
    })

    // 过滤掉健康状态不佳的代理账户
    const healthyConfigs = configs.filter(config =>
      config.proxyAccount?.enabled &&
      config.proxyAccount?.healthStatus === 'healthy'
    )

    return healthyConfigs.sort((a, b) => {
      // 根据优先级排序
      if (a.proxyAccount?.priority !== b.proxyAccount?.priority) {
        return (a.proxyAccount?.priority || 100) - (b.proxyAccount?.priority || 100)
      }

      // 根据用户偏好排序
      return this.calculateConfigScore(a, params) - this.calculateConfigScore(b, params)
    })
  }

  /**
   * 计算配置分数
   */
  private calculateConfigScore(config: ModelConfigWithAccount, params: any): number {
    let score = 0

    // 基础分数
    score += 100

    // 性能分数
    if (config.proxyAccount?.performanceMetrics) {
      const metrics = config.proxyAccount.performanceMetrics
      score += metrics.successRate * 50
      score += Math.max(0, 50 - metrics.averageResponseTime / 20)
    }

    // 成本偏好
    if (params.prioritizeCost) {
      score += Math.max(0, 100 - config.cost * 1000)
    }

    // 速度偏好
    if (params.prioritizeSpeed && config.proxyAccount?.performanceMetrics?.averageResponseTime) {
      score += Math.max(0, 200 - config.proxyAccount.performanceMetrics.averageResponseTime)
    }

    // 历史成功率
    if (config.performanceStats?.successRate) {
      score += config.performanceStats.successRate * 30
    }

    return score
  }

  /**
   * 选择最佳配置
   */
  private selectBestConfigByScore(configs: ModelConfigWithAccount[], params: any): ModelConfigWithAccount {
    let bestConfig = configs[0]
    let bestScore = this.calculateConfigScore(bestConfig, params)

    for (let i = 1; i < configs.length; i++) {
      const config = configs[i]
      const score = this.calculateConfigScore(config, params)

      if (score > bestScore) {
        bestScore = score
        bestConfig = config
      }
    }

    return bestConfig
  }

  /**
   * 创建选择结果
   */
  private async createSelectionResult(config: ModelConfigWithAccount, params: any): Promise<ModelSelectionResult> {
    // 使用路由器获取路由决策
    const routingDecision = await this.proxyRouter.route({
      model: config.modelName,
      taskType: params.taskType,
      userId: params.userId,
      prompt: params.prompt,
      parameters: params.parameters
    })

    // 计算置信度
    const confidence = this.calculateSelectionConfidence(config, routingDecision)

    return {
      config,
      routingDecision,
      estimatedCost: config.cost + (routingDecision.estimatedCost || 0),
      estimatedResponseTime: routingDecision.estimatedResponseTime ||
                           config.proxyAccount?.performanceMetrics?.averageResponseTime || 1000,
      confidence
    }
  }

  /**
   * 计算选择置信度
   */
  private calculateSelectionConfidence(config: ModelConfigWithAccount, routingDecision: RoutingDecision): number {
    let confidence = 0.5 // 基础置信度

    // 代理账户健康状态
    if (config.proxyAccount?.healthStatus === 'healthy') {
      confidence += 0.2
    }

    // 历史成功率
    if (config.performanceStats?.successRate) {
      confidence += (config.performanceStats.successRate / 100) * 0.2
    }

    // 路由决策质量
    if (routingDecision.reason.includes('最高优先级')) {
      confidence += 0.1
    }

    return Math.min(confidence, 1.0)
  }

  /**
   * 创建模型配置
   */
  async createConfig(config: Omit<ModelConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<ModelConfigWithAccount | null> {
    console.log(`➕ 创建模型配置: ${config.modelName}`)

    const now = new Date().toISOString()
    const configData = {
      id: crypto.randomUUID(),
      modelName: config.modelName,
      proxyAccountId: config.proxyAccountId,
      fallbackAccountIds: JSON.stringify(config.fallbackAccountIds || []),
      mediaType: config.mediaType,
      cost: config.cost,
      enabled: config.enabled ? 1 : 0,
      settings: JSON.stringify(config.settings || {}),
      routingPreferences: JSON.stringify(config.routingPreferences || {}),
      autoFailover: config.autoFailover ? 1 : 0,
      performanceStats: JSON.stringify(config.performanceStats || {
        averageResponseTime: 0,
        successRate: 100,
        totalRequests: 0
      }),
      createdAt: now,
      updatedAt: now
    }

    try {
      const createdConfig = await this.database.createModelConfig(configData)
      await this.loadConfigs() // 重新加载配置

      const proxyAccount = await this.proxyAccountManager.getProxyAccount(config.proxyAccountId)
      const formattedConfig = this.formatModelConfig(createdConfig, proxyAccount)

      console.log(`✅ 模型配置创建成功: ${config.modelName}`)
      return formattedConfig
    } catch (error) {
      console.error('❌ 创建模型配置失败:', error)
      return null
    }
  }

  /**
   * 更新模型配置
   */
  async updateConfig(id: string, updates: Partial<ModelConfig>): Promise<ModelConfigWithAccount | null> {
    console.log(`🔄 更新模型配置: ${id}`)

    const updateData: any = { ...updates, updatedAt: new Date().toISOString() }

    // 处理特殊字段
    if (updates.fallbackAccountIds) {
      updateData.fallbackAccountIds = JSON.stringify(updates.fallbackAccountIds)
    }
    if (updates.settings) {
      updateData.settings = JSON.stringify(updates.settings)
    }
    if (updates.routingPreferences) {
      updateData.routingPreferences = JSON.stringify(updates.routingPreferences)
    }
    if (updates.performanceStats) {
      updateData.performanceStats = JSON.stringify(updates.performanceStats)
    }
    if (updates.enabled !== undefined) {
      updateData.enabled = updates.enabled ? 1 : 0
    }
    if (updates.autoFailover !== undefined) {
      updateData.autoFailover = updates.autoFailover ? 1 : 0
    }

    try {
      const updatedConfig = await this.database.updateModelConfig(id, updateData)
      await this.loadConfigs() // 重新加载配置

      const proxyAccount = await this.proxyAccountManager.getProxyAccount(updatedConfig.proxy_account_id)
      const formattedConfig = this.formatModelConfig(updatedConfig, proxyAccount)

      console.log(`✅ 模型配置更新成功: ${id}`)
      return formattedConfig
    } catch (error) {
      console.error('❌ 更新模型配置失败:', error)
      return null
    }
  }

  /**
   * 删除模型配置
   */
  async deleteConfig(id: string): Promise<boolean> {
    console.log(`🗑️ 删除模型配置: ${id}`)

    try {
      const result = await this.database.deleteModelConfig(id)
      if (result) {
        await this.loadConfigs() // 重新加载配置
        console.log(`✅ 模型配置删除成功: ${id}`)
      }
      return result
    } catch (error) {
      console.error('❌ 删除模型配置失败:', error)
      return false
    }
  }

  /**
   * 更新模型性能统计
   */
  async updatePerformanceStats(modelId: string, responseTime: number, success: boolean): Promise<void> {
    const config = await this.getConfig(modelId)
    if (!config) return

    const currentStats = config.performanceStats || {
      averageResponseTime: 0,
      successRate: 100,
      totalRequests: 0
    }

    const newStats = {
      averageResponseTime: (currentStats.averageResponseTime * currentStats.totalRequests + responseTime) / (currentStats.totalRequests + 1),
      successRate: ((currentStats.totalRequests * currentStats.successRate / 100) + (success ? 1 : 0)) / (currentStats.totalRequests + 1) * 100,
      totalRequests: currentStats.totalRequests + 1,
      lastUsed: new Date().toISOString()
    }

    await this.updateConfig(modelId, { performanceStats: newStats })
  }

  /**
   * 获取可用的模型列表
   */
  getAvailableModels(mediaType?: 'image' | 'video' | 'text'): ModelInfo[] {
    const allModels: ModelInfo[] = [
      // Image models
      { id: 'dall-e-3', name: 'DALL-E 3', provider: 'openai', supportedProviders: ['openai', 'custom'], mediaType: 'image', cost: 0.04 },
      { id: 'dall-e-2', name: 'DALL-E 2', provider: 'openai', supportedProviders: ['openai', 'custom'], mediaType: 'image', cost: 0.02 },
      { id: 'stable-diffusion-3', name: 'Stable Diffusion 3', provider: 'stability-ai', supportedProviders: ['custom'], mediaType: 'image', cost: 0.04 },
      { id: 'flux-schnell', name: 'Flux Schnell', provider: 'black-forest-labs', supportedProviders: ['custom'], mediaType: 'image', cost: 0.008 },
      { id: 'flux-pro', name: 'Flux Pro', provider: 'black-forest-labs', supportedProviders: ['custom'], mediaType: 'image', cost: 0.08 },
      { id: 'midjourney-v6', name: 'Midjourney V6', provider: 'midjourney', supportedProviders: ['custom'], mediaType: 'image', cost: 0.04 },

      // EvoLink.AI models
      { id: 'gemini-2.5-flash-image', name: 'Gemini 2.5 Flash (EvoLink.AI)', provider: 'nano-banana', supportedProviders: ['nano-banana'], mediaType: 'image', cost: 1.6 },
      { id: 'gemini-2.0-pro-image', name: 'Gemini 2.0 Pro (EvoLink.AI)', provider: 'nano-banana', supportedProviders: ['nano-banana'], mediaType: 'image', cost: 2.4 },
      { id: 'dall-e-3-evolink', name: 'DALL-E 3 (EvoLink.AI)', provider: 'nano-banana', supportedProviders: ['nano-banana'], mediaType: 'image', cost: 0.04 },
      { id: 'flux-pro-evolink', name: 'Flux Pro (EvoLink.AI)', provider: 'nano-banana', supportedProviders: ['nano-banana'], mediaType: 'image', cost: 0.03 },

      // Video models
      { id: 'sora-1.0', name: 'Sora 1.0', provider: 'openai', supportedProviders: ['openai', 'custom'], mediaType: 'video', cost: 0.50 },
      { id: 'runway-gen-3-turbo', name: 'Runway Gen-3 Turbo', provider: 'runway', supportedProviders: ['custom'], mediaType: 'video', cost: 0.10 },
      { id: 'veo3-fast-evolink', name: 'Veo 3 Fast (EvoLink.AI)', provider: 'nano-banana', supportedProviders: ['nano-banana'], mediaType: 'video', cost: 0.12 },
      { id: 'sora-1.0-evolink', name: 'Sora 1.0 (EvoLink.AI)', provider: 'nano-banana', supportedProviders: ['nano-banana'], mediaType: 'video', cost: 0.50 },

      // Text models
      { id: 'gpt-4o', name: 'GPT-4O', provider: 'openai', supportedProviders: ['openai', 'custom', 'nano-banana'], mediaType: 'text', cost: 0.005 },
      { id: 'gpt-4o-mini', name: 'GPT-4O Mini', provider: 'openai', supportedProviders: ['openai', 'custom', 'nano-banana'], mediaType: 'text', cost: 0.00015 },
      { id: 'gemini-2.0-pro', name: 'Gemini 2.0 Pro', provider: 'google', supportedProviders: ['google', 'custom'], mediaType: 'text', cost: 0.0025 },
      { id: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'anthropic', supportedProviders: ['anthropic', 'custom'], mediaType: 'text', cost: 0.003 },
      { id: 'gemini-2.5-flash-text', name: 'Gemini 2.5 Flash Text (EvoLink.AI)', provider: 'nano-banana', supportedProviders: ['nano-banana'], mediaType: 'text', cost: 0.000325 },
      { id: 'gpt-4o-evolink', name: 'GPT-4O (EvoLink.AI)', provider: 'nano-banana', supportedProviders: ['nano-banana'], mediaType: 'text', cost: 0.005 },
    ]

    if (mediaType) {
      return allModels.filter(model => model.mediaType === mediaType)
    }

    return allModels
  }

  /**
   * 格式化模型配置数据
   */
  private formatModelConfig(config: any, proxyAccount?: any, fallbackAccounts?: any[]): ModelConfigWithAccount {
    return {
      id: config.id,
      modelName: config.model_name,
      proxyAccountId: config.proxy_account_id,
      fallbackAccountIds: config.fallback_account_ids ? JSON.parse(config.fallback_account_ids) : [],
      mediaType: config.media_type,
      cost: config.cost,
      enabled: config.enabled === 1,
      settings: config.settings ? JSON.parse(config.settings) : {},
      routingPreferences: config.routing_preferences ? JSON.parse(config.routing_preferences) : {},
      autoFailover: config.auto_failover === 1,
      performanceStats: config.performance_stats ? JSON.parse(config.performance_stats) : undefined,
      proxyAccount,
      fallbackAccounts: fallbackAccounts || [],
      createdAt: config.created_at,
      updatedAt: config.updated_at
    }
  }

  /**
   * 获取统计信息
   */
  getStats(): any {
    const stats = {
      totalConfigs: this.configs.length,
      enabledConfigs: this.configs.filter(c => c.enabled).length,
      configsByMediaType: {
        image: this.configs.filter(c => c.mediaType === 'image').length,
        video: this.configs.filter(c => c.mediaType === 'video').length,
        text: this.configs.filter(c => c.mediaType === 'text').length
      },
      configsByProvider: {} as Record<string, number>
    }

    // 按提供商统计
    this.configs.forEach(config => {
      const provider = config.proxyAccount?.provider || 'unknown'
      stats.configsByProvider[provider] = (stats.configsByProvider[provider] || 0) + 1
    })

    return stats
  }

  /**
   * 关闭管理器
   */
  async shutdown(): Promise<void> {
    await this.proxyAccountManager.shutdown()
    await this.proxyRouter.shutdown()
    console.log('🛑 增强版模型配置管理器已关闭')
  }
}