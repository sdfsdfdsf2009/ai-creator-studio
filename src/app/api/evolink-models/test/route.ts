import { NextRequest, NextResponse } from 'next/server'
import { withDatabase } from '@/lib/database'

export interface TestModelRequest {
  modelId: string
  modelType: 'template' | 'user-model'
  proxyAccountId?: string
  mediaType: 'text' | 'image' | 'video'
  baseUrl?: string
  apiKey?: string
}

// POST - 测试EvoLink.AI模型
export async function POST(request: NextRequest) {
  try {
    const body: TestModelRequest = await request.json()
    const { modelId, modelType, proxyAccountId, mediaType, baseUrl, apiKey } = body

    if (!modelId || !modelType || !mediaType) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: modelId, modelType, mediaType'
      }, { status: 400 })
    }

    let testBaseUrl = baseUrl
    let testApiKey = apiKey

    // 如果没有提供baseUrl和apiKey，从代理账户获取
    if (!testBaseUrl || !testApiKey) {
      if (!proxyAccountId) {
        return NextResponse.json({
          success: false,
          error: 'Either baseUrl/apiKey or proxyAccountId must be provided'
        }, { status: 400 })
      }

      const proxyAccount = await withDatabase(async (db) => {
        return await db.getProxyAccount(proxyAccountId)
      })

      if (!proxyAccount) {
        return NextResponse.json({
          success: false,
          error: 'Proxy account not found'
        }, { status: 404 })
      }

      testBaseUrl = proxyAccount.baseUrl || testBaseUrl
      testApiKey = proxyAccount.apiKey || testApiKey
    }

    if (!testBaseUrl || !testApiKey) {
      return NextResponse.json({
        success: false,
        error: 'Both baseUrl and apiKey are required for testing'
      }, { status: 400 })
    }

    // 构建EvoLink.AI的测试端点
    const baseEvoLinkUrl = testBaseUrl.replace(/\/(images|videos|chat)\/generations|\/chat\/completions$/, '')
    let testEndpoint = ''
    let testPayload: any = {}

    switch (mediaType) {
      case 'text':
        testEndpoint = `${baseEvoLinkUrl}/v1/chat/completions`
        testPayload = {
          model: modelId,
          messages: [{ role: 'user', content: 'Test message from AI Creator Studio' }],
          max_tokens: 50
        }
        break
      case 'image':
        testEndpoint = `${baseEvoLinkUrl}/v1/images/generations`
        testPayload = {
          model: modelId,
          prompt: 'test image',
          size: '1:1'
        }
        break
      case 'video':
        testEndpoint = `${baseEvoLinkUrl}/v1/videos/generations`
        testPayload = {
          model: modelId,
          prompt: 'test video'
        }
        break
    }

    console.log(`🧪 测试EvoLink.AI模型:`, {
      modelId,
      mediaType,
      testEndpoint,
      modelType
    })

    // 执行测试请求
    const startTime = Date.now()
    const response = await fetch(testEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${testApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPayload)
    })
    const responseTime = Date.now() - startTime

    let testResult: any = {
      modelId,
      mediaType,
      modelType,
      testEndpoint,
      responseTime,
      status: response.status,
      statusText: response.statusText,
      success: false,
      timestamp: new Date().toISOString()
    }

    // 分析响应结果
    if (response.status === 401) {
      testResult.success = true
      testResult.message = '连接成功，但API Key需要验证'
      testResult.errorType = 'authentication'
    } else if (response.status === 402) {
      testResult.success = true
      testResult.message = '连接成功，但账户配额不足'
      testResult.errorType = 'quota'
    } else if (response.status === 403) {
      testResult.success = false
      testResult.message = '无权限访问此模型'
      testResult.errorType = 'permission'
    } else if (response.status === 429) {
      testResult.success = false
      testResult.message = '请求频率超限'
      testResult.errorType = 'rate_limit'
    } else if (response.status >= 500) {
      testResult.success = false
      testResult.message = '服务器错误'
      testResult.errorType = 'server'
    } else if (response.ok) {
      testResult.success = true
      testResult.message = '模型测试成功'

      try {
        const responseData = await response.json()
        testResult.responseData = responseData
      } catch (e) {
        testResult.warning = '无法解析响应JSON数据'
      }
    } else {
      testResult.success = false
      testResult.message = `测试失败 (${response.status})`

      try {
        const errorData = await response.json()
        testResult.errorData = errorData
        if (errorData.error?.message) {
          testResult.message += `: ${errorData.error.message}`
        }
      } catch (e) {
        // 无法解析错误响应
      }
    }

    // 如果是用户模型，更新测试结果
    if (modelType === 'user-model' && proxyAccountId) {
      await withDatabase(async (db) => {
        // 找到对应的用户模型
        const userModels = await db.getUserEvoLinkModelsByAccount(proxyAccountId)
        const targetModel = userModels.find(model => model.modelId === modelId)

        if (targetModel) {
          await db.updateUserEvoLinkModel(targetModel.id, {
            tested: true,
            lastTestedAt: testResult.timestamp,
            testResult: testResult
          })
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: testResult
    })

  } catch (error) {
    console.error('Failed to test EvoLink.AI model:', error)

    const errorResult = {
      success: false,
      message: '测试请求失败',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to test model',
      data: errorResult
    }, { status: 500 })
  }
}