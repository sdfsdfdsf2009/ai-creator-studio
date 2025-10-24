import { NextRequest, NextResponse } from 'next/server'
import { withDatabase } from '@/lib/database'

export interface ModelConfig {
  id?: string
  modelName: string
  proxyAccountId?: string
  mediaType: 'image' | 'video' | 'text'
  cost?: number
  enabled: boolean
  settings?: Record<string, any>
  createdAt?: string
  updatedAt?: string
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const mediaType = url.searchParams.get('mediaType') as any
    const proxyAccountId = url.searchParams.get('proxyAccountId') as any
    const enabled = url.searchParams.get('enabled')

    const params: any = {}
    if (mediaType) params.mediaType = mediaType
    if (proxyAccountId) params.proxyAccountId = proxyAccountId
    if (enabled !== null) params.enabled = enabled === 'true'

    const configs = await withDatabase(async (db) => {
      return await db.getModelConfigs(params)
    })

    return NextResponse.json({
      success: true,
      data: configs
    })
  } catch (error) {
    console.error('Error fetching model configs:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { modelName, proxyAccountId, mediaType, cost, enabled, settings }: ModelConfig = body

    // Validation
    if (!modelName || !mediaType) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: modelName, mediaType' },
        { status: 400 }
      )
    }

    if (!['image', 'video', 'text'].includes(mediaType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid mediaType. Must be: image, video, or text' },
        { status: 400 }
      )
    }

    const config = await withDatabase(async (db) => {
      return await db.createModelConfig({
        modelName,
        proxyAccountId,
        mediaType,
        cost: cost || 0,
        enabled: enabled ?? true,
        settings: settings || {}
      })
    })

    return NextResponse.json({
      success: true,
      data: config
    })
  } catch (error) {
    console.error('Error creating model config:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, modelName, proxyAccountId, mediaType, cost, enabled, settings }: ModelConfig = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Missing config ID' },
        { status: 400 }
      )
    }

    if (mediaType && !['image', 'video', 'text'].includes(mediaType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid mediaType. Must be: image, video, or text' },
        { status: 400 }
      )
    }

    const updates: any = { modelName, proxyAccountId, mediaType, cost, enabled, settings }
    // 移除undefined值
    Object.keys(updates).forEach(key => updates[key] === undefined && delete updates[key])

    const updatedConfig = await withDatabase(async (db) => {
      return await db.updateModelConfig(id, updates)
    })

    if (!updatedConfig) {
      return NextResponse.json(
        { success: false, error: 'Model config not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: updatedConfig
    })
  } catch (error) {
    console.error('Error updating model config:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const id = url.searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Missing config ID' },
        { status: 400 }
      )
    }

    const deleted = await withDatabase(async (db) => {
      return await db.deleteModelConfig(id)
    })

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Model config not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: { deleted: true }
    })
  } catch (error) {
    console.error('Error deleting model config:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}