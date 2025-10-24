import { NextRequest, NextResponse } from 'next/server'
import { withDatabase } from '@/lib/database'
import { ApiEndpointConfig } from '@/app/api/evolink-models/route'

// GET - 获取所有API端点配置
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const provider = searchParams.get('provider')
    const mediaType = searchParams.get('mediaType')

    console.log(`📋 获取API端点配置: provider=${provider}, mediaType=${mediaType}`)

    const result = await withDatabase(async (db) => {
      const params: any = {}
      if (provider) params.provider = provider
      if (mediaType) params.mediaType = mediaType

      return await db.getApiEndpoints(params)
    })

    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('Failed to fetch API endpoints:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch API endpoints'
    }, { status: 500 })
  }
}

// POST - 创建新的API端点配置
export async function POST(request: NextRequest) {
  try {
    const body: ApiEndpointConfig = await request.json()
    const { provider, mediaType, endpointUrl, description, enabled = true, isDefault = false } = body

    if (!provider || !mediaType || !endpointUrl) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: provider, mediaType, endpointUrl'
      }, { status: 400 })
    }

    console.log(`➕ 创建API端点配置: ${provider}/${mediaType}`)

    const result = await withDatabase(async (db) => {
      // 检查是否已存在相同的配置
      const existingEndpoints = await db.getApiEndpoints({ provider, mediaType })
      if (existingEndpoints.length > 0) {
        throw new Error(`API endpoint already exists for ${provider}/${mediaType}`)
      }

      const endpointConfig = {
        provider,
        mediaType,
        endpointUrl,
        description,
        enabled,
        isDefault
      }

      return await db.createApiEndpoint(endpointConfig)
    })

    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('Failed to create API endpoint:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create API endpoint'
    }, { status: 500 })
  }
}