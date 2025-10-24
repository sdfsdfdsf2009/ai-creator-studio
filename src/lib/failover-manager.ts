/**
 * FailoverManager - 故障转移管理器
 *
 * 提供智能的故障检测、自动切换和恢复机制
 * 支持多级故障转移策略和恢复测试
 */

import { getDatabase } from './database'
import { proxyRouter } from './proxy-router'
import { healthChecker } from './health-checker'

export interface FailoverConfig {
  maxRetries: number
  retryDelay: number // 重试延迟（毫秒）
  healthCheckInterval: number // 健康检查间隔
  recoveryTestInterval: number // 恢复测试间隔
  consecutiveFailuresThreshold: number // 连续失败阈值
  autoRecoveryEnabled: boolean // 是否启用自动恢复
  failoverTimeout: number // 故障转移超时时间
}

export interface FailoverEvent {
  id: string
  timestamp: Date
  proxyId: string
  proxyName: string
  eventType: 'failure' | 'recovery' | 'manual_failover' | 'auto_failover'
  reason: string
  details: any
  previousStatus: string
  newStatus: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  resolved: boolean
  resolvedAt?: Date
  resolutionMethod?: string
}

export interface FailoverStrategy {
  id: string
  name: string
  description: string
  enabled: boolean
  priority: number
  conditions: {
    errorRate: number // 错误率阈值
    responseTime: number // 响应时间阈值
    consecutiveFailures: number // 连续失败次数
    availabilityThreshold: number // 可用性阈值
  }
  actions: {
    enableFailover: boolean
    alertEmail?: string
    alertWebhook?: string
    maxRetryAttempts: number
    cooldownPeriod: number // 冷却期
  }
  createdAt: string
  updatedAt: string
}

export interface FailoverResult {
  success: boolean
  originalProxy: any
  finalProxy: any
  attempts: number
  totalDuration: number
  failoverEvents: FailoverEvent[]
  error?: string
  message: string
}

export class FailoverManager {
  private db = getDatabase()
  private config: FailoverConfig
  private isRunning = false
  private monitoringInterval: NodeJS.Timeout | null = null
  private failoverHistory = new Map<string, FailoverEvent[]>()
  private activeFailovers = new Set<string>()
  private recoveryTests = new Map<string, NodeJS.Timeout>()

  constructor(config: Partial<FailoverConfig> = {}) {
    this.config = {
      maxRetries: 3,
      retryDelay: 1000,
      healthCheckInterval: 30000, // 30秒
      recoveryTestInterval: 300000, // 5分钟
      consecutiveFailuresThreshold: 3,
      autoRecoveryEnabled: true,
      failoverTimeout: 30000, // 30秒
      ...config
    }
  }

  /**
   * 启动故障转移监控
   */
  async startMonitoring(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ Failover monitoring already running')
      return
    }

    console.log('🚀 Starting failover monitoring...')
    this.isRunning = true

    // 设置定期监控
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.performHealthMonitoring()
      } catch (error) {
        console.error('❌ Failover monitoring failed:', error)
      }
    }, this.config.healthCheckInterval)

    console.log(`✅ Failover monitoring started with ${this.config.healthCheckInterval}ms interval`)
  }

  /**
   * 停止故障转移监控
   */
  async stopMonitoring(): Promise<void> {
    if (!this.isRunning) {
      return
    }

    console.log('🛑 Stopping failover monitoring...')
    this.isRunning = false

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }

    // 停止所有恢复测试
    for (const timeout of this.recoveryTests.values()) {
      clearTimeout(timeout)
    }
    this.recoveryTests.clear()

    console.log('✅ Failover monitoring stopped')
  }

  /**
   * 执行健康监控
   */
  private async performHealthMonitoring(): Promise<void> {
    try {
      const db = await this.db
      const proxies = await db.getProxyAccounts({ enabled: true })

      for (const proxy of proxies) {
        await this.checkProxyFailoverConditions(proxy)
      }
    } catch (error) {
      console.error('❌ Health monitoring failed:', error)
    }
  }

  /**
   * 检查代理故障转移条件
   */
  private async checkProxyFailoverConditions(proxy: any): Promise<void> {
    try {
      const healthResult = await healthChecker.getAllHealthResults()
      const proxyHealth = healthResult.find(h => h.proxyId === proxy.id)

      if (!proxyHealth) {
        return
      }

      // 检查是否需要故障转移
      const needsFailover = this.evaluateFailoverConditions(proxyHealth, proxy)

      if (needsFailover && !this.activeFailovers.has(proxy.id)) {
        console.log(`🚨 Proxy ${proxy.name} needs failover: ${needsFailover.reason}`)
        await this.triggerFailover(proxy, needsFailover.reason, needsFailover.severity)
      } else if (!needsFailover && this.activeFailovers.has(proxy.id)) {
        console.log(`✅ Proxy ${proxy.name} is healthy again, checking for recovery...`)
        await this.checkRecovery(proxy)
      }

    } catch (error) {
      console.error(`❌ Failed to check failover conditions for proxy ${proxy.name}:`, error)
    }
  }

  /**
   * 评估故障转移条件
   */
  private evaluateFailoverConditions(healthResult: any, proxy: any): {
    needsFailover: boolean
    reason: string
    severity: 'low' | 'medium' | 'high' | 'critical'
  } | null {
    const issues = []

    // 检查健康状态
    if (healthResult.status === 'unhealthy') {
      issues.push({
        reason: 'Proxy is unhealthy',
        severity: 'critical' as const
      })
    }

    // 检查成功率
    if (healthResult.successRate < 0.5) {
      issues.push({
        reason: `Very low success rate: ${Math.round(healthResult.successRate * 100)}%`,
        severity: 'critical' as const
      })
    } else if (healthResult.successRate < 0.8) {
      issues.push({
        reason: `Low success rate: ${Math.round(healthResult.successRate * 100)}%`,
        severity: 'high' as const
      })
    }

    // 检查响应时间
    if (healthResult.responseTime > 10000) {
      issues.push({
        reason: `Very high response time: ${Math.round(healthResult.responseTime)}ms`,
        severity: 'high' as const
      })
    } else if (healthResult.responseTime > 5000) {
      issues.push({
        reason: `High response time: ${Math.round(healthResult.responseTime)}ms`,
        severity: 'medium' as const
      })
    }

    // 检查连续失败次数
    if (healthResult.consecutiveFailures >= this.config.consecutiveFailuresThreshold) {
      issues.push({
        reason: `Consecutive failures: ${healthResult.consecutiveFailures}`,
        severity: 'critical' as const
      })
    }

    // 检查可用性
    if (healthResult.uptime < 50) {
      issues.push({
        reason: `Very low uptime: ${healthResult.uptime}%`,
        severity: 'critical' as const
      })
    } else if (healthResult.uptime < 80) {
      issues.push({
        reason: `Low uptime: ${healthResult.uptime}%`,
        severity: 'medium' as const
      })
    }

    if (issues.length === 0) {
      return null
    }

    // 返回最严重的问题
    const mostSevere = issues.reduce((prev, curr) => {
      const severityLevels = { low: 1, medium: 2, high: 3, critical: 4 }
      return severityLevels[curr.severity] > severityLevels[prev.severity] ? curr : prev
    })

    return {
      needsFailover: true,
      reason: mostSevere.reason,
      severity: mostSevere.severity
    }
  }

  /**
   * 触发故障转移
   */
  private async triggerFailover(
    proxy: any,
    reason: string,
    severity: 'low' | 'medium' | 'high' | 'critical'
  ): Promise<void> {
    try {
      // 记录故障转移事件
      const failoverEvent: FailoverEvent = {
        id: this.generateId(),
        timestamp: new Date(),
        proxyId: proxy.id,
        proxyName: proxy.name,
        eventType: 'auto_failover',
        reason,
        details: {
          severity,
          proxyProvider: proxy.provider,
          proxyRegion: proxy.region
        },
        previousStatus: 'active',
        newStatus: 'failed_over',
        severity,
        resolved: false
      }

      await this.recordFailoverEvent(failoverEvent)

      // 将代理标记为故障转移状态
      await this.markProxyAsFailedOver(proxy.id)

      // 添加到活跃故障转移集合
      this.activeFailovers.add(proxy.id)

      console.log(`🚨 Failover triggered for ${proxy.name}: ${reason}`)

      // 发送告警通知
      await this.sendFailoverAlert(failoverEvent)

    } catch (error) {
      console.error(`❌ Failed to trigger failover for proxy ${proxy.name}:`, error)
    }
  }

  /**
   * 标记代理为故障转移状态
   */
  private async markProxyAsFailedOver(proxyId: string): Promise<void> {
    try {
      const db = await this.db
      await db.updateProxyAccount(proxyId, {
        enabled: false,
        health_status: 'unhealthy',
        last_health_check: new Date().toISOString()
      })
    } catch (error) {
      console.error(`❌ Failed to mark proxy as failed over:`, error)
    }
  }

  /**
   * 检查恢复
   */
  private async checkRecovery(proxy: any): Promise<void> {
    if (!this.config.autoRecoveryEnabled) {
      return
    }

    // 取消现有的恢复测试
    const existingTest = this.recoveryTests.get(proxy.id)
    if (existingTest) {
      clearTimeout(existingTest)
    }

    // 设置新的恢复测试
    const testTimeout = setTimeout(async () => {
      try {
        const healthResults = await healthChecker.getAllHealthResults()
        const proxyHealth = healthResults.find(h => h.proxyId === proxy.id)

        if (proxyHealth && proxyHealth.isHealthy) {
          await this.recoverProxy(proxy)
        } else {
          console.log(`🔄 Recovery test failed for ${proxy.name}, will retry...`)
          // 重新安排测试
          this.checkRecovery(proxy)
        }
      } catch (error) {
        console.error(`❌ Recovery test failed for ${proxy.name}:`, error)
      }
    }, this.config.recoveryTestInterval)

    this.recoveryTests.set(proxy.id, testTimeout)
  }

  /**
   * 恢复代理
   */
  private async recoverProxy(proxy: any): Promise<void> {
    try {
      const db = await this.db
      await db.updateProxyAccount(proxy.id, {
        enabled: true,
        health_status: 'healthy',
        last_health_check: new Date().toISOString()
      })

      // 从活跃故障转移集合中移除
      this.activeFailovers.delete(proxy.id)

      // 记录恢复事件
      const recoveryEvent: FailoverEvent = {
        id: this.generateId(),
        timestamp: new Date(),
        proxyId: proxy.id,
        proxyName: proxy.name,
        eventType: 'recovery',
        reason: 'Automatic recovery after health check',
        details: {
          proxyProvider: proxy.provider
        },
        previousStatus: 'failed_over',
        newStatus: 'active',
        severity: 'low',
        resolved: true,
        resolvedAt: new Date(),
        resolutionMethod: 'automatic'
      }

      await this.recordFailoverEvent(recoveryEvent)

      console.log(`✅ Proxy ${proxy.name} has been recovered automatically`)

      // 发送恢复通知
      await this.sendRecoveryAlert(recoveryEvent)

    } catch (error) {
      console.error(`❌ Failed to recover proxy ${proxy.name}:`, error)
    }
  }

  /**
   * 执行带故障转移的请求
   */
  async executeWithFailover<T>(
    request: any,
    executor: (proxy: any) => Promise<T>
  ): Promise<FailoverResult & { result?: T }> {
    const startTime = Date.now()
    const failoverEvents: FailoverEvent[] = []
    let attempts = 0
    let finalProxy = null
    let result: T | undefined

    try {
      // 1. 获取最佳代理
      const routingDecision = await proxyRouter.selectOptimalProxy(request)
      let currentProxy = routingDecision.selectedProxy
      finalProxy = currentProxy

      // 2. 尝试执行请求
      for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
        attempts++
        console.log(`🎯 Attempt ${attempt + 1}/${this.config.maxRetries} with proxy: ${currentProxy.name}`)

        try {
          result = await this.executeWithTimeout(executor(currentProxy), this.config.failoverTimeout)

          // 成功，更新性能指标
          await proxyRouter.updateProxyPerformance(currentProxy.id, {
            responseTime: Date.now() - startTime,
            success: true,
            timestamp: new Date()
          })

          return {
            success: true,
            originalProxy: routingDecision.selectedProxy,
            finalProxy: currentProxy,
            attempts,
            totalDuration: Date.now() - startTime,
            failoverEvents,
            result,
            message: `Request succeeded on attempt ${attempt + 1}`
          }

        } catch (error) {
          console.error(`❌ Attempt ${attempt + 1} failed with proxy ${currentProxy.name}:`, error.message)

          // 更新失败指标
          await proxyRouter.updateProxyPerformance(currentProxy.id, {
            responseTime: this.config.failoverTimeout,
            success: false,
            timestamp: new Date()
          })

          // 记录失败事件
          const failoverEvent: FailoverEvent = {
            id: this.generateId(),
            timestamp: new Date(),
            proxyId: currentProxy.id,
            proxyName: currentProxy.name,
            eventType: 'failure',
            reason: error.message,
            details: {
              attempt: attempt + 1,
              errorType: error.constructor.name
            },
            previousStatus: 'active',
            newStatus: 'failed',
            severity: 'high',
            resolved: false
          }

          failoverEvents.push(failoverEvent)
          await this.recordFailoverEvent(failoverEvent)

          // 如果还有重试机会，尝试切换到备选代理
          if (attempt < this.config.maxRetries - 1) {
            const alternatives = routingDecision.alternativeProxies.filter(
              alt => alt.id !== currentProxy.id && this.activeFailovers.has(alt.id) === false
            )

            if (alternatives.length > 0) {
              currentProxy = alternatives[0]
              finalProxy = currentProxy
              console.log(`🔄 Failing over to alternative proxy: ${currentProxy.name}`)

              // 等待重试延迟
              await this.sleep(this.config.retryDelay)
            } else {
              console.log('❌ No alternative proxies available')
              break
            }
          }
        }
      }

      // 所有尝试都失败了
      return {
        success: false,
        originalProxy: routingDecision.selectedProxy,
        finalProxy: finalProxy || routingDecision.selectedProxy,
        attempts,
        totalDuration: Date.now() - startTime,
        failoverEvents,
        error: 'All retry attempts failed',
        message: `Request failed after ${attempts} attempts`
      }

    } catch (error) {
      return {
        success: false,
        originalProxy: null,
        finalProxy: null,
        attempts,
        totalDuration: Date.now() - startTime,
        failoverEvents,
        error: error.message,
        message: `Request execution failed: ${error.message}`
      }
    }
  }

  /**
   * 带超时执行函数
   */
  private async executeWithTimeout<T>(
    promise: Promise<T>,
    timeout: number
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), timeout)
      )
    ])
  }

  /**
   * 记录故障转移事件
   */
  private async recordFailoverEvent(event: FailoverEvent): Promise<void> {
    // 保存到内存历史
    if (!this.failoverHistory.has(event.proxyId)) {
      this.failoverHistory.set(event.proxyId, [])
    }

    const history = this.failoverHistory.get(event.proxyId)!
    history.push(event)

    // 保留最近100个事件
    if (history.length > 100) {
      history.splice(0, history.length - 100)
    }

    // TODO: 保存到数据库
    // await this.db.createFailoverEvent(event)
  }

  /**
   * 发送故障转移告警
   */
  private async sendFailoverAlert(event: FailoverEvent): Promise<void> {
    // TODO: 实现实际的告警发送逻辑
    console.error(`🚨 FAILOVER ALERT: ${event.proxyName} - ${event.reason}`)
  }

  /**
   * 发送恢复通知
   */
  private async sendRecoveryAlert(event: FailoverEvent): Promise<void> {
    // TODO: 实现实际的恢复通知逻辑
    console.log(`✅ RECOVERY ALERT: ${event.proxyName} has been recovered`)
  }

  /**
   * 手动触发故障转移
   */
  async triggerManualFailover(proxyId: string, reason: string): Promise<void> {
    try {
      const db = await this.db
      const proxy = await db.getProxyAccount(proxyId)

      if (!proxy) {
        throw new Error(`Proxy not found: ${proxyId}`)
      }

      const failoverEvent: FailoverEvent = {
        id: this.generateId(),
        timestamp: new Date(),
        proxyId: proxy.id,
        proxyName: proxy.name,
        eventType: 'manual_failover',
        reason,
        details: {
          triggeredBy: 'user'
        },
        previousStatus: 'active',
        newStatus: 'failed_over',
        severity: 'medium',
        resolved: false
      }

      await this.recordFailoverEvent(failoverEvent)
      await this.markProxyAsFailedOver(proxy.id)
      this.activeFailovers.add(proxy.id)

      console.log(`🔧 Manual failover triggered for ${proxy.name}: ${reason}`)

    } catch (error) {
      console.error(`❌ Failed to trigger manual failover:`, error)
      throw error
    }
  }

  /**
   * 手动恢复代理
   */
  async manualRecovery(proxyId: string): Promise<void> {
    try {
      const db = await this.db
      const proxy = await db.getProxyAccount(proxyId)

      if (!proxy) {
        throw new Error(`Proxy not found: ${proxyId}`)
      }

      await this.recoverProxy(proxy)

    } catch (error) {
      console.error(`❌ Failed to manually recover proxy:`, error)
      throw error
    }
  }

  /**
   * 获取故障转移统计
   */
  getFailoverStats(): {
    totalEvents: number
    activeFailovers: number
    recentFailures: number
    recentRecoveries: number
    uptime: number
  } {
    let totalEvents = 0
    let recentFailures = 0
    let recentRecoveries = 0
    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

    for (const [proxyId, events] of this.failoverHistory.entries()) {
      totalEvents += events.length

      for (const event of events) {
        if (event.timestamp > oneHourAgo) {
          if (event.eventType === 'failure' || event.eventType === 'auto_failover') {
            recentFailures++
          } else if (event.eventType === 'recovery') {
            recentRecoveries++
          }
        }
      }
    }

    return {
      totalEvents,
      activeFailovers: this.activeFailovers.size,
      recentFailures,
      recentRecoveries,
      uptime: this.isRunning ? 100 : 0
    }
  }

  /**
   * 获取代理的故障转移历史
   */
  getProxyFailoverHistory(proxyId: string): FailoverEvent[] {
    return this.failoverHistory.get(proxyId) || []
  }

  /**
   * 工具方法
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 获取服务状态
   */
  getServiceStatus(): {
    isRunning: boolean
    config: FailoverConfig
    activeFailovers: number
    stats: any
  } {
    return {
      isRunning: this.isRunning,
      config: this.config,
      activeFailovers: this.activeFailovers.size,
      stats: this.getFailoverStats()
    }
  }
}

// 单例实例
export const failoverManager = new FailoverManager()