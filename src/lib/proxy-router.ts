/**
 * ProxyRouter - 智能代理路由系统
 *
 * 提供智能的代理选择、故障转移和负载均衡功能
 * 支持多种路由策略：优先级、成本、性能、地理位置等
 */

import { getDatabase } from './database'

export interface RoutingRequest {
  mediaType: 'image' | 'video' | 'text'
  model?: string
  prompt?: string
  userId?: string
  maxCost?: number
  region?: string
  priority?: 'low' | 'normal' | 'high'
}

export interface RoutingDecision {
  selectedProxy: any
  selectedModel: string
  estimatedCost: number
  routingReason: string
  alternativeProxies: any[]
  estimatedResponseTime: number
}

export interface HealthCheckResult {
  proxyId: string
  isHealthy: boolean
  responseTime: number
  errorRate: number
  lastChecked: Date
  details: any
}

export class ProxyRouter {
  private db = getDatabase()
  private healthCache = new Map<string, HealthCheckResult>()
  private lastHealthCheck = new Map<string, Date>()
  private readonly HEALTH_CHECK_INTERVAL = 60 * 1000 // 1分钟

  /**
   * 智能路由选择最佳代理
   */
  async selectOptimalProxy(request: RoutingRequest): Promise<RoutingDecision> {
    const db = await this.db

    // 1. 获取所有启用的代理账户
    const proxies = await db.getProxyAccounts({ enabled: true })
    if (proxies.length === 0) {
      throw new Error('No enabled proxy accounts available')
    }

    // 2. 获取适用的路由规则
    const routingRules = await db.getRoutingRules({ enabled: true })

    // 3. 获取模型配置
    const modelConfigs = await db.getModelConfigs({
      enabled: true,
      mediaType: request.mediaType
    })

    // 4. 应用路由规则过滤代理
    let candidateProxies = await this.applyRoutingRules(proxies, routingRules, request)

    // 5. 如果没有特定规则匹配，使用默认策略
    if (candidateProxies.length === 0) {
      candidateProxies = proxies
    }

    // 6. 基于健康状态过滤
    candidateProxies = await this.filterHealthyProxies(candidateProxies)

    if (candidateProxies.length === 0) {
      throw new Error('No healthy proxy accounts available')
    }

    // 7. 计算每个代理的得分并排序
    const scoredProxies = await this.scoreProxies(candidateProxies, request, modelConfigs)

    // 8. 选择最佳代理
    const selectedProxy = scoredProxies[0].proxy
    const selectedModel = await this.selectBestModel(selectedProxy, request.mediaType, modelConfigs)

    // 9. 计算备选代理
    const alternativeProxies = scoredProxies.slice(1, 3).map(sp => sp.proxy)

    return {
      selectedProxy,
      selectedModel,
      estimatedCost: this.estimateCost(selectedProxy, selectedModel, request),
      routingReason: scoredProxies[0].reason,
      alternativeProxies,
      estimatedResponseTime: scoredProxies[0].estimatedResponseTime
    }
  }

  /**
   * 应用路由规则
   */
  private async applyRoutingRules(
    proxies: any[],
    rules: any[],
    request: RoutingRequest
  ): Promise<any[]> {
    let filteredProxies = [...proxies]

    for (const rule of rules) {
      try {
        const conditions = JSON.parse(rule.conditions || '{}')

        // 检查条件是否匹配
        if (this.evaluateConditions(conditions, request)) {
          if (rule.action === 'route' && rule.targetProxyAccountId) {
            // 路由到指定代理
            const targetProxy = proxies.find(p => p.id === rule.targetProxyAccountId)
            if (targetProxy) {
              filteredProxies = [targetProxy]
              break
            }
          }
        }
      } catch (error) {
        console.warn(`Invalid routing rule ${rule.id}:`, error)
      }
    }

    return filteredProxies
  }

  /**
   * 评估路由条件
   */
  private evaluateConditions(conditions: any, request: RoutingRequest): boolean {
    // 媒体类型匹配
    if (conditions.media_types && !conditions.media_types.includes(request.mediaType)) {
      return false
    }

    // 模型匹配
    if (conditions.models && request.model && !conditions.models.includes(request.model)) {
      return false
    }

    // 时间范围匹配
    if (conditions.time_ranges) {
      const now = new Date()
      const currentTime = now.getHours() * 60 + now.getMinutes()
      let inTimeRange = false

      for (const range of conditions.time_ranges) {
        const [start, end] = range.split('-').map((t: string) => {
          const [hours, minutes] = t.split(':').map(Number)
          return hours * 60 + minutes
        })

        if (currentTime >= start && currentTime <= end) {
          inTimeRange = true
          break
        }
      }

      if (!inTimeRange) return false
    }

    // 用户组匹配
    if (conditions.user_groups && request.userId) {
      // 简化实现，实际应该有用户组管理
      if (!conditions.user_groups.includes('default')) {
        return false
      }
    }

    return true
  }

  /**
   * 过滤健康的代理
   */
  private async filterHealthyProxies(proxies: any[]): Promise<any[]> {
    const healthyProxies: any[] = []

    for (const proxy of proxies) {
      const health = await this.getProxyHealth(proxy.id)
      if (health.isHealthy) {
        healthyProxies.push(proxy)
      }
    }

    return healthyProxies
  }

  /**
   * 对代理进行评分
   */
  private async scoreProxies(
    proxies: any[],
    request: RoutingRequest,
    modelConfigs: any[]
  ): Promise<{ proxy: any, score: number, reason: string, estimatedResponseTime: number }[]> {
    const scored = []

    for (const proxy of proxies) {
      let score = 0
      let reason = ''
      let estimatedResponseTime = 1000 // 默认1秒

      // 1. 优先级评分 (40%)
      score += (100 - proxy.priority) * 0.4
      if (proxy.priority <= 50) {
        reason += 'High priority, '
      }

      // 2. 健康状态评分 (30%)
      const health = await this.getProxyHealth(proxy.id)
      if (health.isHealthy) {
        score += 30
        estimatedResponseTime = health.responseTime
        reason += 'Healthy, '
      } else {
        score -= 50
        reason += 'Unhealthy, '
      }

      // 3. 性能评分 (20%)
      const performanceMetrics = this.parsePerformanceMetrics(proxy.performance_metrics)
      if (performanceMetrics) {
        const avgResponseTime = performanceMetrics.avg_response_time || 1000
        const successRate = performanceMetrics.success_rate || 0.9

        score += Math.max(0, (1000 - avgResponseTime) / 1000 * 10)
        score += successRate * 10
        estimatedResponseTime = avgResponseTime
        reason += `Performance: ${Math.round(successRate * 100)}% success, `
      }

      // 4. 成本评分 (10%)
      const relevantConfigs = modelConfigs.filter(mc => mc.proxyAccountId === proxy.id)
      if (relevantConfigs.length > 0) {
        const avgCost = relevantConfigs.reduce((sum, mc) => sum + mc.cost, 0) / relevantConfigs.length
        score += Math.max(0, (100 - avgCost) / 100 * 10)
        reason += `Cost: $${avgCost.toFixed(4)}, `
      }

      // 5. 地理位置偏好
      if (request.region && proxy.region === request.region) {
        score += 5
        reason += 'Preferred region, '
      }

      scored.push({
        proxy,
        score,
        reason: reason.slice(0, -2) || 'Default selection',
        estimatedResponseTime
      })
    }

    return scored.sort((a, b) => b.score - a.score)
  }

  /**
   * 选择最佳模型
   */
  private async selectBestModel(
    proxy: any,
    mediaType: string,
    modelConfigs: any[]
  ): Promise<string> {
    const proxyConfigs = modelConfigs.filter(mc => mc.proxyAccountId === proxy.id)

    if (proxyConfigs.length === 0) {
      // 返回默认模型
      return this.getDefaultModel(mediaType, proxy.provider)
    }

    // 选择成本最低的模型
    const sortedConfigs = proxyConfigs.sort((a, b) => a.cost - b.cost)
    return sortedConfigs[0].modelName
  }

  /**
   * 获取默认模型
   */
  private getDefaultModel(mediaType: string, provider: string): string {
    const defaults = {
      'evolink': {
        'image': 'FLUX.1-schnell',
        'video': 'Kling-1.5',
        'text': 'claude-3-5-sonnet-20241022'
      },
      'openai': {
        'image': 'dall-e-3',
        'video': 'unknown', // OpenAI暂不支持视频生成
        'text': 'gpt-4'
      },
      'anthropic': {
        'image': 'unknown',
        'video': 'unknown',
        'text': 'claude-3-5-sonnet-20241022'
      }
    }

    return defaults[provider]?.[mediaType] || 'unknown'
  }

  /**
   * 估算成本
   */
  private estimateCost(proxy: any, model: string, request: RoutingRequest): number {
    // 简化的成本估算，实际应该基于具体模型的定价
    const baseCosts = {
      'image': 0.05,
      'video': 0.20,
      'text': 0.01
    }

    const baseCost = baseCosts[request.mediaType] || 0.01
    const promptMultiplier = request.prompt ? Math.min(request.prompt.length / 1000, 5) : 1

    return baseCost * promptMultiplier
  }

  /**
   * 获取代理健康状态
   */
  private async getProxyHealth(proxyId: string): Promise<HealthCheckResult> {
    const cached = this.healthCache.get(proxyId)
    const lastCheck = this.lastHealthCheck.get(proxyId)

    // 如果缓存未过期，返回缓存结果
    if (cached && lastCheck && Date.now() - lastCheck.getTime() < this.HEALTH_CHECK_INTERVAL) {
      return cached
    }

    // 执行健康检查
    const healthResult = await this.performHealthCheck(proxyId)

    // 更新缓存
    this.healthCache.set(proxyId, healthResult)
    this.lastHealthCheck.set(proxyId, new Date())

    return healthResult
  }

  /**
   * 执行健康检查
   */
  private async performHealthCheck(proxyId: string): Promise<HealthCheckResult> {
    try {
      const db = await this.db
      const proxy = await db.getProxyAccount(proxyId)

      if (!proxy) {
        return {
          proxyId,
          isHealthy: false,
          responseTime: 0,
          errorRate: 1.0,
          lastChecked: new Date(),
          details: { error: 'Proxy not found' }
        }
      }

      // 解析性能指标
      const performanceMetrics = this.parsePerformanceMetrics(proxy.performance_metrics)

      // 基于性能指标判断健康状态
      const avgResponseTime = performanceMetrics?.avg_response_time || 1000
      const successRate = performanceMetrics?.success_rate || 0.9
      const totalRequests = performanceMetrics?.total_requests || 0

      const isHealthy = (
        successRate >= 0.8 && // 成功率至少80%
        avgResponseTime <= 5000 && // 响应时间不超过5秒
        totalRequests >= 10 // 至少有10次请求记录
      )

      return {
        proxyId,
        isHealthy,
        responseTime: avgResponseTime,
        errorRate: 1 - successRate,
        lastChecked: new Date(),
        details: {
          totalRequests,
          avgResponseTime,
          successRate,
          healthStatus: proxy.health_status
        }
      }

    } catch (error) {
      return {
        proxyId,
        isHealthy: false,
        responseTime: 0,
        errorRate: 1.0,
        lastChecked: new Date(),
        details: { error: error.message }
      }
    }
  }

  /**
   * 解析性能指标
   */
  private parsePerformanceMetrics(metricsJson: string): any {
    try {
      return metricsJson ? JSON.parse(metricsJson) : null
    } catch {
      return null
    }
  }

  /**
   * 更新代理性能指标
   */
  async updateProxyPerformance(proxyId: string, metrics: {
    responseTime: number
    success: boolean
    timestamp?: Date
  }): Promise<void> {
    const db = await this.db
    const proxy = await db.getProxyAccount(proxyId)

    if (!proxy) return

    const currentMetrics = this.parsePerformanceMetrics(proxy.performance_metrics) || {
      total_requests: 0,
      successful_requests: 0,
      total_response_time: 0,
      avg_response_time: 0,
      success_rate: 0.9
    }

    // 更新指标
    currentMetrics.total_requests += 1
    currentMetrics.total_response_time += metrics.responseTime
    currentMetrics.avg_response_time = currentMetrics.total_response_time / currentMetrics.total_requests

    if (metrics.success) {
      currentMetrics.successful_requests += 1
    }

    currentMetrics.success_rate = currentMetrics.successful_requests / currentMetrics.total_requests
    currentMetrics.last_updated = metrics.timestamp?.toISOString() || new Date().toISOString()

    // 保存更新的指标
    await db.updateProxyAccount(proxyId, {
      performance_metrics: JSON.stringify(currentMetrics),
      health_status: currentMetrics.success_rate >= 0.8 ? 'healthy' : 'unhealthy',
      last_health_check: new Date().toISOString()
    })

    // 清除健康检查缓存
    this.healthCache.delete(proxyId)
    this.lastHealthCheck.delete(proxyId)
  }

  /**
   * 获取所有代理的健康状态
   */
  async getAllProxyHealth(): Promise<HealthCheckResult[]> {
    const db = await this.db
    const proxies = await db.getProxyAccounts({ enabled: true })

    const healthResults = await Promise.all(
      proxies.map(proxy => this.getProxyHealth(proxy.id))
    )

    return healthResults
  }

  /**
   * 手动触发所有代理的健康检查
   */
  async triggerHealthCheck(): Promise<void> {
    const db = await this.db
    const proxies = await db.getProxyAccounts({ enabled: true })

    for (const proxy of proxies) {
      await this.performHealthCheck(proxy.id)
      this.lastHealthCheck.set(proxy.id, new Date())
    }
  }
}

// 单例实例
export const proxyRouter = new ProxyRouter()