import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { accountId } = body

    if (!accountId) {
      return NextResponse.json({
        success: false,
        message: 'Account ID is required'
      }, { status: 400 })
    }

    const db = await getDatabase()
    const account = await db.getProxyAccount(accountId)

    if (!account) {
      return NextResponse.json({
        success: false,
        message: 'Proxy account not found'
      }, { status: 404 })
    }

    const startTime = Date.now()
    let testResult = { success: false, message: '' }

    // 根据提供商类型执行不同的测试
    switch (account.provider.toLowerCase()) {
      case 'openai':
        testResult = await testOpenAIAccount(account)
        break
      case 'anthropic':
        testResult = await testAnthropicAccount(account)
        break
      case 'google':
        testResult = await testGoogleAccount(account)
        break
      case 'nanobanana':
      case 'evolink':
        testResult = await testEvoLinkAccount(account)
        break
      default:
        testResult = await testCustomAccount(account)
    }

    const responseTime = Date.now() - startTime

    // 更新健康状态和性能指标
    await updateAccountHealth(db, accountId, testResult.success, responseTime)

    return NextResponse.json({
      success: true,
      message: testResult.message,
      responseTime,
      healthy: testResult.success
    })

  } catch (error) {
    console.error('Failed to test proxy account:', error)
    return NextResponse.json({
      success: false,
      message: `Test failed: ${error.message}`
    }, { status: 500 })
  }
}

async function testOpenAIAccount(account: any): Promise<{ success: boolean; message: string }> {
  if (!account.api_key) {
    return { success: false, message: 'API Key is required' }
  }

  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${account.api_key}`,
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(10000) // 10秒超时
    })

    if (response.ok) {
      const data = await response.json()
      return {
        success: true,
        message: `连接成功，发现 ${data.data?.length || 0} 个可用模型`
      }
    } else {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        message: `连接失败 (${response.status}): ${errorData.error?.message || response.statusText}`
      }
    }
  } catch (error) {
    return {
      success: false,
      message: `连接错误: ${error.message}`
    }
  }
}

async function testAnthropicAccount(account: any): Promise<{ success: boolean; message: string }> {
  if (!account.api_key) {
    return { success: false, message: 'API Key is required' }
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': account.api_key,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }]
      }),
      signal: AbortSignal.timeout(10000)
    })

    if (response.ok) {
      return { success: true, message: 'Anthropic API 连接成功' }
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
      message: `Anthropic连接错误: ${error.message}`
    }
  }
}

async function testGoogleAccount(account: any): Promise<{ success: boolean; message: string }> {
  if (!account.api_key) {
    return { success: false, message: 'API Key is required' }
  }

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${account.api_key}`, {
      signal: AbortSignal.timeout(10000)
    })

    if (response.ok) {
      const data = await response.json()
      return {
        success: true,
        message: `Google AI 连接成功，发现 ${data.models?.length || 0} 个可用模型`
      }
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
      message: `Google AI连接错误: ${error.message}`
    }
  }
}

async function testEvoLinkAccount(account: any): Promise<{ success: boolean; message: string }> {
  if (!account.api_key) {
    return { success: false, message: 'API Key is required' }
  }

  const baseUrl = account.base_url || 'https://api.evolink.ai'

  try {
    // 测试模型列表接口
    const response = await fetch(`${baseUrl}/v1/models`, {
      headers: {
        'Authorization': `Bearer ${account.api_key}`,
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(15000) // 15秒超时
    })

    if (response.ok) {
      const data = await response.json()
      return {
        success: true,
        message: `EvoLink.AI 连接成功，发现 ${data.data?.length || 0} 个可用模型`
      }
    } else if (response.status === 402) {
      return {
        success: true,
        message: 'EvoLink.AI 连接成功，但账户配额不足'
      }
    } else if (response.status === 401) {
      return {
        success: false,
        message: 'EvoLink.AI API Key 无效或已过期'
      }
    } else {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        message: `EvoLink.AI连接失败: ${errorData.error?.message || response.statusText}`
      }
    }
  } catch (error) {
    return {
      success: false,
      message: `EvoLink.AI连接错误: ${error.message}`
    }
  }
}

async function testCustomAccount(account: any): Promise<{ success: boolean; message: string }> {
  if (!account.base_url) {
    return { success: false, message: 'Base URL is required for custom provider' }
  }

  try {
    const response = await fetch(account.base_url, {
      method: 'GET',
      headers: account.api_key ? {
        'Authorization': `Bearer ${account.api_key}`,
        'Content-Type': 'application/json'
      } : {},
      signal: AbortSignal.timeout(10000)
    })

    if (response.ok) {
      return { success: true, message: '自定义提供商连接成功' }
    } else {
      return {
        success: false,
        message: `自定义提供商连接失败: ${response.statusText}`
      }
    }
  } catch (error) {
    return {
      success: false,
      message: `自定义提供商连接错误: ${error.message}`
    }
  }
}

async function updateAccountHealth(db: any, accountId: string, isHealthy: boolean, responseTime: number) {
  try {
    const account = await db.getProxyAccount(accountId)
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
    if (responseTime > 0) {
      const totalResponseTime = performanceMetrics.averageResponseTime * (performanceMetrics.totalRequests - 1) + responseTime
      performanceMetrics.averageResponseTime = totalResponseTime / performanceMetrics.totalRequests
    }

    await db.updateProxyAccount(accountId, {
      healthStatus: isHealthy ? 'healthy' : 'unhealthy',
      lastHealthCheck: new Date().toISOString(),
      performanceMetrics: JSON.stringify(performanceMetrics)
    })
  } catch (error) {
    console.error('Failed to update account health:', error)
  }
}