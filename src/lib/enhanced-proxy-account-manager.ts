/**
 * 增强版代理账户管理器
 * 集成智能路由系统，支持多代理提供商管理
 */

import { ProxyRouter, ProxyAccount, RoutingContext, RoutingDecision } from './proxy-router'
import { Database } from './database'

export interface ProxyAccountConfig {
  name: string
  provider: string
  providerType: 'api' | 'sdk' | 'proxy'
  apiKey?: string
  apiSecret?: string
  baseUrl?: string
  region?: string
  priority?: number
  capabilities?: string[]
  rateLimits?: {
    requestsPerMinute?: number
    requestsPerHour?: number
    requestsPerDay?: number
  }
  authenticationType?: 'api_key' | 'oauth' | 'basic'
  settings?: any
}

export interface ProxyAccountStats {
  id: string
  name: string
  provider: string
  healthStatus: 'healthy' | 'unhealthy' | 'unknown'
  lastHealthCheck?: string
  performanceMetrics?: {
    averageResponseTime: number
    successRate: number
    totalRequests: number
    failedRequests: number
  }
  costUsage?: {
    daily: number
    weekly: number
    monthly: number
  }
  quotaUsage?: {
    used: number
    total: number
    percentage: number
  }
}

export class EnhancedProxyAccountManager {
  private router: ProxyRouter
  private database: Database

  constructor(database: Database) {
    this.database = database
    this.router = new ProxyRouter(database, {
      healthCheckInterval: 60000,
      enableMetrics: true,
      enableFailover: true,
      maxRetries: 3
    })
  }

  /**
   * 初始化管理器
   */
  async initialize(): Promise<void> {
    console.log('🔄 初始化增强版代理账户管理器...')
    await this.router.initialize()
    console.log('✅ 增强版代理账户管理器初始化完成')
  }

  /**
   * 创建代理账户
   */
  async createProxyAccount(config: ProxyAccountConfig): Promise<ProxyAccount> {
    console.log(`➕ 创建代理账户: ${config.name} (${config.provider})`)

    const now = new Date().toISOString()
    const accountData = {
      id: crypto.randomUUID(),
      name: config.name,
      provider: config.provider,
      providerType: config.providerType || 'api',
      apiKey: config.apiKey,
      apiSecret: config.apiSecret,
      baseUrl: config.baseUrl,
      region: config.region,
      priority: config.priority || 100,
      enabled: 1,
      healthStatus: 'unknown',
      lastHealthCheck: null,
      performanceMetrics: JSON.stringify({
        averageResponseTime: 0,
        successRate: 100,
        totalRequests: 0,
        failedRequests: 0
      }),
      capabilities: JSON.stringify(config.capabilities || []),
      rateLimits: JSON.stringify(config.rateLimits || {}),
      authenticationType: config.authenticationType || 'api_key',
      settings: JSON.stringify(config.settings || {}),
      createdAt: now,
      updatedAt: now
    }

    const account = await this.database.createProxyAccount(accountData)

    // 重新加载路由器数据
    await this.router.reload()

    console.log(`✅ 代理账户创建成功: ${account.name}`)
    return this.formatProxyAccount(account)
  }

  /**
   * 获取代理账户
   */
  async getProxyAccount(id: string): Promise<ProxyAccount | null> {
    const account = await this.database.getProxyAccount(id)
    return account ? this.formatProxyAccount(account) : null
  }

  /**
   * 获取所有代理账户
   */
  async getProxyAccounts(params?: { enabled?: boolean; provider?: string }): Promise<ProxyAccount[]> {
    const accounts = await this.database.getProxyAccounts(params)
    return accounts.map(account => this.formatProxyAccount(account))
  }

  /**
   * 更新代理账户
   */
  async updateProxyAccount(id: string, updates: Partial<ProxyAccountConfig>): Promise<ProxyAccount> {
    console.log(`🔄 更新代理账户: ${id}`)

    const updateData: any = { ...updates, updatedAt: new Date().toISOString() }

    // 处理特殊字段
    if (updates.capabilities) {
      updateData.capabilities = JSON.stringify(updates.capabilities)
    }
    if (updates.rateLimits) {
      updateData.rateLimits = JSON.stringify(updates.rateLimits)
    }
    if (updates.settings) {
      updateData.settings = JSON.stringify(updates.settings)
    }
    if (updates.enabled !== undefined) {
      updateData.enabled = updates.enabled ? 1 : 0
    }

    const account = await this.database.updateProxyAccount(id, updateData)

    // 重新加载路由器数据
    await this.router.reload()

    console.log(`✅ 代理账户更新成功: ${account.name}`)
    return this.formatProxyAccount(account)
  }

  /**
   * 删除代理账户
   */
  async deleteProxyAccount(id: string): Promise<boolean> {
    console.log(`🗑️ 删除代理账户: ${id}`)

    const result = await this.database.deleteProxyAccount(id)

    if (result) {
      // 重新加载路由器数据
      await this.router.reload()
      console.log(`✅ 代理账户删除成功: ${id}`)
    }

    return result
  }

  /**
   * 启用/禁用代理账户
   */
  async toggleProxyAccount(id: string, enabled: boolean): Promise<ProxyAccount> {
    return this.updateProxyAccount(id, { enabled })
  }

  /**
   * 测试代理账户连接
   */
  async testProxyAccount(id: string): Promise<{ success: boolean; message: string; responseTime?: number }> {
    console.log(`🧪 测试代理账户连接: ${id}`)

    const account = await this.getProxyAccount(id)
    if (!account) {
      return { success: false, message: '代理账户不存在' }
    }

    try {
      const startTime = Date.now()

      // 根据提供商执行相应的测试
      const testResult = await this.performConnectionTest(account)

      const responseTime = Date.now() - startTime

      // 更新健康状态
      await this.updateHealthStatus(id, testResult.success, responseTime)

      console.log(`✅ 连接测试完成: ${account.name} - ${testResult.success ? '成功' : '失败'}`)

      return {
        success: testResult.success,
        message: testResult.message,
        responseTime
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误'

      // 更新健康状态
      await this.updateHealthStatus(id, false)

      console.error(`❌ 连接测试失败: ${account.name} - ${errorMessage}`)

      return {
        success: false,
        message: errorMessage
      }
    }
  }

  /**
   * 执行连接测试
   */
  private async performConnectionTest(account: ProxyAccount): Promise<{ success: boolean; message: string }> {
    // 根据不同的提供商实现相应的测试逻辑
    switch (account.provider.toLowerCase()) {
      case 'openai':
        return this.testOpenAIConnection(account)
      case 'anthropic':
        return this.testAnthropicConnection(account)
      case 'google':
        return this.testGoogleConnection(account)
      case 'evolink':
      case 'nanobanana':
        return this.testEvoLinkConnection(account)
      default:
        return { success: false, message: `不支持的提供商: ${account.provider}` }
    }
  }

  /**
   * 测试OpenAI连接
   */
  private async testOpenAIConnection(account: ProxyAccount): Promise<{ success: boolean; message: string }> {
    if (!account.apiKey) {
      return { success: false, message: '缺少API密钥' }
    }

    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${account.apiKey}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        return { success: true, message: 'OpenAI连接成功' }
      } else {
        const errorData = await response.json().catch(() => ({}))
        return {
          success: false,
          message: `OpenAI连接失败: ${errorData.error?.message || response.statusText}`
        }
      }
    } catch (error) {
      return {
        success: false,
        message: `OpenAI连接错误: ${error instanceof Error ? error.message : '网络错误'}`
      }
    }
  }

  /**
   * 测试Anthropic连接
   */
  private async testAnthropicConnection(account: ProxyAccount): Promise<{ success: boolean; message: string }> {
    if (!account.apiKey) {
      return { success: false, message: '缺少API密钥' }
    }

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': account.apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Hi' }]
        })
      })

      if (response.ok) {
        return { success: true, message: 'Anthropic连接成功' }
      } else {
        const errorData = await response.json().catch(() => ({}))
        return {
          success: false,
          message: `Anthropic连接失败: ${errorData.error?.message || response.statusText}`
        }
      }
    } catch (error) {
      return {
        success: false,
        message: `Anthropic连接错误: ${error instanceof Error ? error.message : '网络错误'}`
      }
    }
  }

  /**
   * 测试Google连接
   */
  private async testGoogleConnection(account: ProxyAccount): Promise<{ success: boolean; message: string }> {
    if (!account.apiKey) {
      return { success: false, message: '缺少API密钥' }
    }

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${account.apiKey}`)

      if (response.ok) {
        return { success: true, message: 'Google AI连接成功' }
      } else {
        const errorData = await response.json().catch(() => ({}))
        return {
          success: false,
          message: `Google AI连接失败: ${errorData.error?.message || response.statusText}`
        }
      }
    } catch (error) {
      return {
        success: false,
        message: `Google AI连接错误: ${error instanceof Error ? error.message : '网络错误'}`
      }
    }
  }

  /**
   * 测试EvoLink连接
   */
  private async testEvoLinkConnection(account: ProxyAccount): Promise<{ success: boolean; message: string }> {
    if (!account.apiKey) {
      return { success: false, message: '缺少API密钥' }
    }

    const baseUrl = account.baseUrl || 'https://api.evolink.ai'

    try {
      const response = await fetch(`${baseUrl}/v1/models`, {
        headers: {
          'Authorization': `Bearer ${account.apiKey}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        return { success: true, message: 'EvoLink连接成功' }
      } else {
        const errorData = await response.json().catch(() => ({}))
        return {
          success: false,
          message: `EvoLink连接失败: ${errorData.error?.message || response.statusText}`
        }
      }
    } catch (error) {
      return {
        success: false,
        message: `EvoLink连接错误: ${error instanceof Error ? error.message : '网络错误'}`
      }
    }
  }

  /**
   * 更新健康状态
   */
  private async updateHealthStatus(accountId: string, isHealthy: boolean, responseTime?: number): Promise<void> {
    try {
      const account = await this.database.getProxyAccount(accountId)
      if (!account) return

      let performanceMetrics = account.performance_metrics ? JSON.parse(account.performance_metrics) : {
        averageResponseTime: 0,
        successRate: 100,
        totalRequests: 0,
        failedRequests: 0
      }

      // 更新性能指标
      performanceMetrics.totalRequests += 1
      if (!isHealthy) {
        performanceMetrics.failedRequests += 1
      }

      // 计算成功率
      performanceMetrics.successRate = ((performanceMetrics.totalRequests - performanceMetrics.failedRequests) / performanceMetrics.totalRequests) * 100

      // 更新平均响应时间
      if (responseTime) {
        const totalResponseTime = performanceMetrics.averageResponseTime * (performanceMetrics.totalRequests - 1) + responseTime
        performanceMetrics.averageResponseTime = totalResponseTime / performanceMetrics.totalRequests
      }

      await this.database.updateProxyAccount(accountId, {
        healthStatus: isHealthy ? 'healthy' : 'unhealthy',
        lastHealthCheck: new Date().toISOString(),
        performanceMetrics: JSON.stringify(performanceMetrics)
      })
    } catch (error) {
      console.error('更新健康状态失败:', error)
    }
  }

  /**
   * 获取代理账户统计信息
   */
  async getProxyAccountStats(accountId: string): Promise<ProxyAccountStats | null> {
    const account = await this.getProxyAccount(accountId)
    if (!account) return null

    return {
      id: account.id,
      name: account.name,
      provider: account.provider,
      healthStatus: account.healthStatus,
      lastHealthCheck: account.lastHealthCheck,
      performanceMetrics: account.performanceMetrics,
      // 这里可以添加实际的成本和配额统计
      costUsage: {
        daily: 0,
        weekly: 0,
        monthly: 0
      },
      quotaUsage: {
        used: 0,
        total: 1000,
        percentage: 0
      }
    }
  }

  /**
   * 获取所有代理账户统计信息
   */
  async getAllProxyAccountStats(): Promise<ProxyAccountStats[]> {
    const accounts = await this.getProxyAccounts()
    const stats: ProxyAccountStats[] = []

    for (const account of accounts) {
      const accountStats = await this.getProxyAccountStats(account.id)
      if (accountStats) {
        stats.push(accountStats)
      }
    }

    return stats
  }

  /**
   * 智能路由到最佳代理账户
   */
  async route(context: {
    model: string
    taskType: string
    userId?: string
    estimatedCost?: number
    prompt?: string
    parameters?: any
  }): Promise<RoutingDecision> {
    return this.router.route({
      ...context,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * 获取路由统计信息
   */
  getRouterStats(): any {
    return this.router.getStats()
  }

  /**
   * 重新加载路由器数据
   */
  async reloadRouter(): Promise<void> {
    await this.router.reload()
  }

  /**
   * 格式化代理账户数据
   */
  private formatProxyAccount(account: any): ProxyAccount {
    return {
      id: account.id,
      name: account.name,
      provider: account.provider,
      providerType: account.provider_type,
      apiKey: account.api_key,
      apiSecret: account.api_secret,
      baseUrl: account.base_url,
      region: account.region,
      priority: account.priority,
      enabled: account.enabled === 1,
      healthStatus: account.health_status,
      lastHealthCheck: account.last_health_check,
      performanceMetrics: account.performance_metrics ? JSON.parse(account.performance_metrics) : undefined,
      capabilities: account.capabilities ? JSON.parse(account.capabilities) : undefined,
      rateLimits: account.rate_limits ? JSON.parse(account.rate_limits) : undefined,
      authenticationType: account.authentication_type,
      settings: account.settings ? JSON.parse(account.settings) : undefined,
      createdAt: account.created_at,
      updatedAt: account.updated_at
    }
  }

  /**
   * 关闭管理器
   */
  async shutdown(): Promise<void> {
    await this.router.shutdown()
    console.log('🛑 增强版代理账户管理器已关闭')
  }
}