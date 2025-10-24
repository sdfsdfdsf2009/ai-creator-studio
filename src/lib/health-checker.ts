/**
 * HealthChecker - 代理健康检查服务
 *
 * 定期检查代理账户的健康状态，提供详细的监控和报告功能
 */

import { getDatabase } from './database'
import { proxyRouter } from './proxy-router'

export interface HealthCheckConfig {
  interval: number // 检查间隔（毫秒）
  timeout: number // 单次检查超时时间
  retries: number // 重试次数
  alertThreshold: number // 告警阈值（成功率）
}

export interface DetailedHealthResult {
  proxyId: string
  proxyName: string
  provider: string
  isHealthy: boolean
  responseTime: number
  successRate: number
  totalRequests: number
  errorRate: number
  lastChecked: Date
  status: 'healthy' | 'unhealthy' | 'degraded' | 'unknown'
  issues: string[]
  capabilities: string[]
  region?: string
  uptime: number // 运行时间百分比
  avgResponseTime: number
  lastError?: string
  lastSuccessTime?: Date
  consecutiveFailures: number
  metrics: {
    requestsPerMinute: number
    errorCount: number
    warningCount: number
  }
}

export interface HealthSummary {
  totalProxies: number
  healthyProxies: number
  unhealthyProxies: number
  degradedProxies: number
  overallHealth: number // 整体健康评分 0-100
  averageResponseTime: number
  totalRequests: number
  uptime: number
  lastCheck: Date
  alerts: {
    critical: number
    warning: number
    info: number
  }
}

export class HealthChecker {
  private db = getDatabase()
  private config: HealthCheckConfig
  private intervalId: NodeJS.Timeout | null = null
  private isRunning = false
  private lastCheckTime = new Date()
  private healthHistory = new Map<string, DetailedHealthResult[]>()

  constructor(config: Partial<HealthCheckConfig> = {}) {
    this.config = {
      interval: 60 * 1000, // 1分钟
      timeout: 10 * 1000, // 10秒
      retries: 3,
      alertThreshold: 0.8, // 80%成功率阈值
      ...config
    }
  }

  /**
   * 启动健康检查服务
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ Health checker already running')
      return
    }

    console.log('🚀 Starting health checker service...')
    this.isRunning = true

    // 立即执行一次检查
    await this.performHealthCheck()

    // 设置定期检查
    this.intervalId = setInterval(async () => {
      try {
        await this.performHealthCheck()
      } catch (error) {
        console.error('❌ Health check failed:', error)
      }
    }, this.config.interval)

    console.log(`✅ Health checker started with ${this.config.interval}ms interval`)
  }

  /**
   * 停止健康检查服务
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return
    }

    console.log('🛑 Stopping health checker service...')
    this.isRunning = false

    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }

    console.log('✅ Health checker stopped')
  }

  /**
   * 执行健康检查
   */
  private async performHealthCheck(): Promise<void> {
    const startTime = Date.now()
    console.log('🔍 Performing health check...')

    try {
      const db = await this.db
      const proxies = await db.getProxyAccounts({ enabled: true })

      if (proxies.length === 0) {
        console.log('⚠️ No enabled proxy accounts to check')
        return
      }

      // 并行检查所有代理
      const healthPromises = proxies.map(proxy => this.checkProxyHealth(proxy))
      const results = await Promise.allSettled(healthPromises)

      // 统计结果
      let healthyCount = 0
      let unhealthyCount = 0

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          if (result.value.isHealthy) {
            healthyCount++
          } else {
            unhealthyCount++
          }
        } else {
          console.error(`Health check failed for proxy ${proxies[index]?.name}:`, result.reason)
          unhealthyCount++
        }
      })

      const duration = Date.now() - startTime
      this.lastCheckTime = new Date()

      console.log(`✅ Health check completed in ${duration}ms: ${healthyCount} healthy, ${unhealthyCount} unhealthy`)

      // 触发告警检查
      await this.checkAlerts(results)

    } catch (error) {
      console.error('❌ Health check failed:', error)
    }
  }

  /**
   * 检查单个代理的健康状态
   */
  private async checkProxyHealth(proxy: any): Promise<DetailedHealthResult> {
    const startTime = Date.now()

    try {
      // 解析性能指标
      const performanceMetrics = this.parsePerformanceMetrics(proxy.performance_metrics)
      const capabilities = this.parseCapabilities(proxy.capabilities)

      // 计算各项指标
      const totalRequests = performanceMetrics?.total_requests || 0
      const successfulRequests = performanceMetrics?.successful_requests || 0
      const avgResponseTime = performanceMetrics?.avg_response_time || 0
      const successRate = totalRequests > 0 ? successfulRequests / totalRequests : 0.9
      const errorRate = 1 - successRate

      // 判断健康状态
      const isHealthy = this.evaluateHealth({
        successRate,
        responseTime: avgResponseTime,
        totalRequests,
        lastHealthCheck: proxy.last_health_check
      })

      // 检测问题
      const issues = this.detectIssues({
        successRate,
        responseTime: avgResponseTime,
        totalRequests,
        proxy,
        performanceMetrics
      })

      // 计算状态
      let status: 'healthy' | 'unhealthy' | 'degraded' | 'unknown' = 'unknown'
      if (isHealthy && successRate >= 0.95) {
        status = 'healthy'
      } else if (isHealthy && successRate >= 0.8) {
        status = 'degraded'
      } else if (!isHealthy) {
        status = 'unhealthy'
      }

      // 计算运行时间
      const uptime = this.calculateUptime(proxy, performanceMetrics)

      // 获取最后成功时间
      const lastSuccessTime = this.getLastSuccessTime(performanceMetrics)

      // 计算连续失败次数
      const consecutiveFailures = this.calculateConsecutiveFailures(performanceMetrics)

      const result: DetailedHealthResult = {
        proxyId: proxy.id,
        proxyName: proxy.name,
        provider: proxy.provider,
        isHealthy,
        responseTime: avgResponseTime,
        successRate,
        totalRequests,
        errorRate,
        lastChecked: new Date(),
        status,
        issues,
        capabilities,
        region: proxy.region,
        uptime,
        avgResponseTime,
        lastError: this.getLastError(performanceMetrics),
        lastSuccessTime,
        consecutiveFailures,
        metrics: {
          requestsPerMinute: this.calculateRequestsPerMinute(performanceMetrics),
          errorCount: totalRequests - successfulRequests,
          warningCount: issues.length
        }
      }

      // 更新数据库中的健康状态
      await this.updateProxyHealthStatus(proxy.id, result)

      // 保存历史记录
      this.saveHealthHistory(proxy.id, result)

      return result

    } catch (error) {
      console.error(`Health check failed for proxy ${proxy.name}:`, error)

      const errorResult: DetailedHealthResult = {
        proxyId: proxy.id,
        proxyName: proxy.name,
        provider: proxy.provider,
        isHealthy: false,
        responseTime: 0,
        successRate: 0,
        totalRequests: 0,
        errorRate: 1,
        lastChecked: new Date(),
        status: 'unhealthy',
        issues: [`Health check failed: ${error.message}`],
        capabilities: [],
        uptime: 0,
        avgResponseTime: 0,
        lastError: error.message,
        consecutiveFailures: 1,
        metrics: {
          requestsPerMinute: 0,
          errorCount: 1,
          warningCount: 1
        }
      }

      await this.updateProxyHealthStatus(proxy.id, errorResult)
      this.saveHealthHistory(proxy.id, errorResult)

      return errorResult
    }
  }

  /**
   * 评估健康状态
   */
  private evaluateHealth(metrics: {
    successRate: number
    responseTime: number
    totalRequests: number
    lastHealthCheck?: string
  }): boolean {
    const { successRate, responseTime, totalRequests } = metrics

    // 成功率必须大于阈值
    if (successRate < this.config.alertThreshold) {
      return false
    }

    // 响应时间不能太长
    if (responseTime > 10000) { // 10秒
      return false
    }

    // 需要有足够的请求样本
    if (totalRequests < 10) {
      return false
    }

    return true
  }

  /**
   * 检测问题
   */
  private detectIssues(metrics: {
    successRate: number
    responseTime: number
    totalRequests: number
    proxy: any
    performanceMetrics: any
  }): string[] {
    const issues: string[] = []

    // 成功率问题
    if (metrics.successRate < 0.8) {
      issues.push('Low success rate')
    } else if (metrics.successRate < 0.95) {
      issues.push('Moderate success rate')
    }

    // 响应时间问题
    if (metrics.responseTime > 5000) {
      issues.push('High response time')
    } else if (metrics.responseTime > 2000) {
      issues.push('Moderate response time')
    }

    // 请求量问题
    if (metrics.totalRequests < 10) {
      issues.push('Insufficient data')
    }

    // 代理特定问题
    if (metrics.proxy.enabled === false) {
      issues.push('Proxy disabled')
    }

    if (metrics.proxy.health_status === 'unhealthy') {
      issues.push('Previously marked unhealthy')
    }

    // 检查最后更新时间
    const lastUpdate = metrics.performanceMetrics?.last_updated
    if (lastUpdate) {
      const lastUpdateDate = new Date(lastUpdate)
      const hoursSinceUpdate = (Date.now() - lastUpdateDate.getTime()) / (1000 * 60 * 60)

      if (hoursSinceUpdate > 24) {
        issues.push('Stale data')
      } else if (hoursSinceUpdate > 1) {
        issues.push('Outdated data')
      }
    }

    return issues
  }

  /**
   * 解析性能指标
   */
  private parsePerformanceMetrics(metricsJson: string): any {
    try {
      return metricsJson ? JSON.parse(metricsJson) : {}
    } catch {
      return {}
    }
  }

  /**
   * 解析能力列表
   */
  private parseCapabilities(capabilitiesJson: string): string[] {
    try {
      return capabilitiesJson ? JSON.parse(capabilitiesJson) : []
    } catch {
      return []
    }
  }

  /**
   * 计算运行时间
   */
  private calculateUptime(proxy: any, performanceMetrics: any): number {
    if (!performanceMetrics || !performanceMetrics.total_requests) {
      return 100 // 默认100%
    }

    const successRate = performanceMetrics.successful_requests / performanceMetrics.total_requests
    return Math.round(successRate * 100)
  }

  /**
   * 获取最后成功时间
   */
  private getLastSuccessTime(performanceMetrics: any): Date | undefined {
    if (performanceMetrics?.last_success) {
      return new Date(performanceMetrics.last_success)
    }
    return undefined
  }

  /**
   * 获取最后错误
   */
  private getLastError(performanceMetrics: any): string | undefined {
    return performanceMetrics?.last_error
  }

  /**
   * 计算连续失败次数
   */
  private calculateConsecutiveFailures(performanceMetrics: any): number {
    return performanceMetrics?.consecutive_failures || 0
  }

  /**
   * 计算每分钟请求数
   */
  private calculateRequestsPerMinute(performanceMetrics: any): number {
    // 简化实现，实际应该基于时间窗口计算
    return performanceMetrics?.requests_per_minute || 0
  }

  /**
   * 更新代理健康状态
   */
  private async updateProxyHealthStatus(proxyId: string, result: DetailedHealthResult): Promise<void> {
    try {
      const db = await this.db
      await db.updateProxyAccount(proxyId, {
        health_status: result.status,
        last_health_check: result.lastChecked.toISOString()
      })
    } catch (error) {
      console.error(`Failed to update health status for proxy ${proxyId}:`, error)
    }
  }

  /**
   * 保存健康历史记录
   */
  private saveHealthHistory(proxyId: string, result: DetailedHealthResult): void {
    if (!this.healthHistory.has(proxyId)) {
      this.healthHistory.set(proxyId, [])
    }

    const history = this.healthHistory.get(proxyId)!
    history.push(result)

    // 保留最近100条记录
    if (history.length > 100) {
      history.splice(0, history.length - 100)
    }
  }

  /**
   * 检查告警
   */
  private async checkAlerts(results: PromiseSettledResult<DetailedHealthResult>[]): Promise<void> {
    // 这里可以实现告警逻辑，如发送邮件、webhook通知等
    // 简化实现：仅记录日志

    const criticalIssues: string[] = []
    const warningIssues: string[] = []

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const health = result.value

        if (health.status === 'unhealthy') {
          criticalIssues.push(`${health.proxyName} (${health.provider}) is unhealthy`)
        } else if (health.status === 'degraded') {
          warningIssues.push(`${health.proxyName} (${health.provider}) is degraded`)
        }

        if (health.consecutiveFailures > 5) {
          criticalIssues.push(`${health.proxyName} has ${health.consecutiveFailures} consecutive failures`)
        }
      }
    })

    if (criticalIssues.length > 0) {
      console.error('🚨 Critical Health Alerts:', criticalIssues)
    }

    if (warningIssues.length > 0) {
      console.warn('⚠️ Health Warnings:', warningIssues)
    }
  }

  /**
   * 获取所有代理的健康状态
   */
  async getAllHealthResults(): Promise<DetailedHealthResult[]> {
    const db = await this.db
    const proxies = await db.getProxyAccounts({ enabled: true })

    const results = await Promise.all(
      proxies.map(proxy => this.checkProxyHealth(proxy))
    )

    return results
  }

  /**
   * 获取健康摘要
   */
  async getHealthSummary(): Promise<HealthSummary> {
    const results = await this.getAllHealthResults()

    const totalProxies = results.length
    const healthyProxies = results.filter(r => r.status === 'healthy').length
    const unhealthyProxies = results.filter(r => r.status === 'unhealthy').length
    const degradedProxies = results.filter(r => r.status === 'degraded').length

    const totalRequests = results.reduce((sum, r) => sum + r.totalRequests, 0)
    const averageResponseTime = results.length > 0
      ? results.reduce((sum, r) => sum + r.avgResponseTime, 0) / results.length
      : 0

    const overallHealth = totalProxies > 0
      ? Math.round(((healthyProxies + degradedProxies * 0.5) / totalProxies) * 100)
      : 0

    const uptime = results.length > 0
      ? Math.round(results.reduce((sum, r) => sum + r.uptime, 0) / results.length)
      : 0

    return {
      totalProxies,
      healthyProxies,
      unhealthyProxies,
      degradedProxies,
      overallHealth,
      averageResponseTime,
      totalRequests,
      uptime,
      lastCheck: this.lastCheckTime,
      alerts: {
        critical: unhealthyProxies,
        warning: degradedProxies,
        info: healthyProxies
      }
    }
  }

  /**
   * 获取特定代理的健康历史
   */
  getProxyHealthHistory(proxyId: string): DetailedHealthResult[] {
    return this.healthHistory.get(proxyId) || []
  }

  /**
   * 手动触发健康检查
   */
  async triggerManualCheck(): Promise<void> {
    console.log('🔧 Triggering manual health check...')
    await this.performHealthCheck()
  }

  /**
   * 获取服务状态
   */
  getServiceStatus(): {
    isRunning: boolean
    config: HealthCheckConfig
    lastCheck: Date
    uptime: number
  } {
    return {
      isRunning: this.isRunning,
      config: this.config,
      lastCheck: this.lastCheckTime,
      uptime: this.isRunning ? Date.now() - this.lastCheckTime.getTime() : 0
    }
  }
}

// 单例实例
export const healthChecker = new HealthChecker()