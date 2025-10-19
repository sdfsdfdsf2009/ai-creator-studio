import { NextRequest, NextResponse } from 'next/server'
import { createN8nClient } from '@/lib/n8n'

export async function POST(request: NextRequest) {
  try {
    const { baseUrl, apiKey } = await request.json()

    if (!baseUrl) {
      return NextResponse.json(
        { success: false, error: 'Base URL is required' },
        { status: 400 }
      )
    }

    const client = createN8nClient(baseUrl, apiKey)
    const isConnected = await client.testConnection()

    return NextResponse.json({
      success: true,
      data: {
        connected: isConnected,
        message: isConnected ? '连接成功' : '连接失败，请检查URL和API密钥'
      }
    })

  } catch (error) {
    console.error('Error testing n8n connection:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Connection test failed'
      },
      { status: 500 }
    )
  }
}