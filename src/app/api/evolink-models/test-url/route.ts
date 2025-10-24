import { NextRequest, NextResponse } from 'next/server'
import { UrlTestRequest, UrlTestResult } from '@/app/api/evolink-models/route'

// POST - 测试URL连通性
export async function POST(request: NextRequest) {
  try {
    const body: UrlTestRequest = await request.json()
    const { url, method = 'HEAD', headers = {}, timeout = 10000 } = body

    if (!url) {
      return NextResponse.json({
        success: false,
        error: 'Missing required field: url'
      }, { status: 400 })
    }

    console.log(`🔗 测试URL连通性: ${method} ${url}`)

    const startTime = Date.now()

    try {
      // 创建 AbortController 用于超时控制
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const response = await fetch(url, {
        method,
        headers: {
          'User-Agent': 'AI-Creator-Studio/1.0 URL-Test',
          ...headers
        },
        signal: controller.signal
      })

      clearTimeout(timeoutId)
      const responseTime = Date.now() - startTime

      const result: UrlTestResult = {
        success: true,
        url,
        statusCode: response.status,
        responseTime,
        timestamp: new Date().toISOString()
      }

      console.log(`✅ URL测试成功: ${url} (${response.status}, ${responseTime}ms)`)

      return NextResponse.json({
        success: true,
        data: result
      })

    } catch (error: any) {
      const responseTime = Date.now() - startTime

      let errorMessage = 'Unknown error'
      if (error.name === 'AbortError') {
        errorMessage = `Timeout after ${timeout}ms`
      } else if (error.code === 'ENOTFOUND') {
        errorMessage = 'Host not found'
      } else if (error.code === 'ECONNREFUSED') {
        errorMessage = 'Connection refused'
      } else if (error.code === 'CERT_HAS_EXPIRED') {
        errorMessage = 'SSL certificate has expired'
      } else if (error.message) {
        errorMessage = error.message
      }

      const result: UrlTestResult = {
        success: false,
        url,
        responseTime,
        error: errorMessage,
        timestamp: new Date().toISOString()
      }

      console.log(`❌ URL测试失败: ${url} - ${errorMessage}`)

      return NextResponse.json({
        success: true, // API调用成功，但测试失败
        data: result
      })
    }

  } catch (error) {
    console.error('Failed to test URL:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to test URL'
    }, { status: 500 })
  }
}