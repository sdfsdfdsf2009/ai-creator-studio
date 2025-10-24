import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database'
import { proxyRouter } from '@/lib/proxy-router'
import { healthChecker } from '@/lib/health-checker'
import { failoverManager } from '@/lib/failover-manager'
import { modelConfigManager } from '@/lib/model-config-manager'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    const db = await getDatabase()

    switch (action) {
      case 'system-status':
        // 获取多代理系统整体状态
        const systemStatus = await modelConfigManager.getMultiAgentSystemStatus()
        return NextResponse.json({
          success: true,
          data: systemStatus
        })

      case 'proxy-health':
        // 获取所有代理的健康状态
        const proxyHealth = await healthChecker.getAllProxyHealth()
        return NextResponse.json({
          success: true,
          data: proxyHealth
        })

      case 'health-summary':
        // 获取健康检查摘要
        const healthSummary = await healthChecker.getHealthSummary()
        return NextResponse.json({
          success: true,
          data: healthSummary
        })

      case 'routing-decision':
        // 获取路由决策示例
        const mediaType = searchParams.get('mediaType') as any
        const model = searchParams.get('model') || undefined
        const prompt = searchParams.get('prompt') || undefined

        if (!mediaType) {
          return NextResponse.json({
            success: false,
            error: 'mediaType is required for routing decision'
          }, { status: 400 })
        }

        const routingDecision = await proxyRouter.selectOptimalProxy({
          mediaType,
          model,
          prompt,
          maxCost: searchParams.get('maxCost') ? parseFloat(searchParams.get('maxCost')!) : undefined,
          region: searchParams.get('region') || undefined,
          priority: (searchParams.get('priority') as any) || 'normal'
        })

        return NextResponse.json({
          success: true,
          data: routingDecision
        })

      case 'failover-stats':
        // 获取故障转移统计
        const failoverStats = failoverManager.getFailoverStats()
        return NextResponse.json({
          success: true,
          data: failoverStats
        })

      case 'available-proxies':
        // 获取可用代理列表
        const filterMediaType = searchParams.get('mediaType') as any
        const availableProxies = await modelConfigManager.getAvailableProxies(filterMediaType)
        return NextResponse.json({
          success: true,
          data: availableProxies
        })

      case 'proxy-history':
        // 获取特定代理的健康历史
        const proxyId = searchParams.get('proxyId')
        if (!proxyId) {
          return NextResponse.json({
            success: false,
            error: 'proxyId is required'
          }, { status: 400 })
        }

        const proxyHistory = healthChecker.getProxyHealthHistory(proxyId)
        return NextResponse.json({
          success: true,
          data: proxyHistory
        })

      case 'failover-history':
        // 获取故障转移历史
        const failoverProxyId = searchParams.get('proxyId')
        const failoverHistory = failoverProxyId
          ? failoverManager.getProxyFailoverHistory(failoverProxyId)
          : null

        return NextResponse.json({
          success: true,
          data: {
            proxyId: failoverProxyId,
            history: failoverHistory,
            stats: failoverManager.getFailoverStats()
          }
        })

      default:
        // 默认返回基本系统信息
        const [proxyAccounts, modelConfigs, routingRules, costThresholds] = await Promise.all([
          db.getProxyAccounts({ enabled: true }),
          db.getModelConfigs({ enabled: true }),
          db.getRoutingRules({ enabled: true }),
          db.getCostThresholds({ enabled: true })
        ])

        return NextResponse.json({
          success: true,
          data: {
            summary: {
              proxyAccounts: proxyAccounts.length,
              modelConfigs: modelConfigs.length,
              routingRules: routingRules.length,
              costThresholds: costThresholds.length
            },
            proxyAccounts,
            modelConfigs,
            routingRules,
            costThresholds
          }
        })
    }

  } catch (error) {
    console.error('Multi-agent API error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'trigger-health-check':
        // 手动触发健康检查
        await healthChecker.triggerManualCheck()
        return NextResponse.json({
          success: true,
          message: 'Health check triggered successfully'
        })

      case 'trigger-failover':
        // 手动触发故障转移
        const { proxyId, reason } = body
        if (!proxyId) {
          return NextResponse.json({
            success: false,
            error: 'proxyId is required'
          }, { status: 400 })
        }

        await failoverManager.triggerManualFailover(proxyId, reason || 'Manual failover triggered via API')
        return NextResponse.json({
          success: true,
          message: `Failover triggered for proxy: ${proxyId}`
        })

      case 'manual-recovery':
        // 手动恢复代理
        const { recoverProxyId } = body
        if (!recoverProxyId) {
          return NextResponse.json({
            success: false,
            error: 'proxyId is required'
          }, { status: 400 })
        }

        await failoverManager.manualRecovery(recoverProxyId)
        return NextResponse.json({
          success: true,
          message: `Proxy ${recoverProxyId} recovered successfully`
        })

      case 'set-failover-config':
        // 设置故障转移配置
        const { modelName: failoverModelName, primaryProxyId, fallbackProxyIds } = body
        if (!failoverModelName || !primaryProxyId) {
          return NextResponse.json({
            success: false,
            error: 'modelName and primaryProxyId are required'
          }, { status: 400 })
        }

        const failoverResult = await modelConfigManager.setFailoverConfig(
          failoverModelName,
          primaryProxyId,
          fallbackProxyIds || []
        )

        return NextResponse.json({
          success: failoverResult,
          message: failoverResult
            ? 'Failover configuration updated successfully'
            : 'Failed to update failover configuration'
        })

      case 'execute-with-multi-agent':
        // 使用多代理执行请求（测试用）
        const {
          modelName: executionModelName,
          mediaType,
          prompt,
          enableFailover = true,
          maxCost,
          region,
          priority = 'normal'
        } = body

        if (!executionModelName || !mediaType) {
          return NextResponse.json({
            success: false,
            error: 'modelName and mediaType are required'
          }, { status: 400 })
        }

        // 模拟执行器
        const mockExecutor = async (proxy: any, model: string) => {
          // 模拟处理时间
          await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))

          // 模拟可能的失败
          if (Math.random() < 0.1) { // 10% 失败率
            throw new Error(`Mock execution failed on ${proxy.name}`)
          }

          return {
            success: true,
            result: `Mock result from ${proxy.name} using model ${model}`,
            proxy: proxy.name,
            model,
            timestamp: new Date().toISOString()
          }
        }

        const executionResult = await modelConfigManager.executeWithMultiAgent({
          modelName: executionModelName,
          mediaType,
          prompt,
          enableFailover,
          maxCost,
          region,
          priority
        }, mockExecutor)

        return NextResponse.json({
          success: true,
          data: executionResult
        })

      case 'start-health-monitoring':
        // 启动健康监控
        await modelConfigManager.startHealthMonitoring()
        return NextResponse.json({
          success: true,
          message: 'Health monitoring started'
        })

      case 'stop-health-monitoring':
        // 停止健康监控
        await modelConfigManager.stopHealthMonitoring()
        return NextResponse.json({
          success: true,
          message: 'Health monitoring stopped'
        })

      case 'start-failover-monitoring':
        // 启动故障转移监控
        await modelConfigManager.startFailoverMonitoring()
        return NextResponse.json({
          success: true,
          message: 'Failover monitoring started'
        })

      case 'stop-failover-monitoring':
        // 停止故障转移监控
        await modelConfigManager.stopFailoverMonitoring()
        return NextResponse.json({
          success: true,
          message: 'Failover monitoring stopped'
        })

      default:
        return NextResponse.json({
          success: false,
          error: 'Unknown action'
        }, { status: 400 })
    }

  } catch (error) {
    console.error('Multi-agent API POST error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error'
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'update-proxy-performance':
        // 更新代理性能指标（测试用）
        const { proxyId, responseTime, success } = body
        if (!proxyId || responseTime === undefined || success === undefined) {
          return NextResponse.json({
            success: false,
            error: 'proxyId, responseTime, and success are required'
          }, { status: 400 })
        }

        await proxyRouter.updateProxyPerformance(proxyId, {
          responseTime: parseInt(responseTime),
          success: Boolean(success),
          timestamp: new Date()
        })

        return NextResponse.json({
          success: true,
          message: 'Proxy performance updated successfully'
        })

      default:
        return NextResponse.json({
          success: false,
          error: 'Unknown action'
        }, { status: 400 })
    }

  } catch (error) {
    console.error('Multi-agent API PUT error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error'
    }, { status: 500 })
  }
}