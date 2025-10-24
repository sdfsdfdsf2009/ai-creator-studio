import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const enabled = searchParams.get('enabled')

    const db = await getDatabase()
    const rules = await db.getRoutingRules({
      enabled: enabled ? enabled === 'true' : undefined
    })

    return NextResponse.json({
      success: true,
      data: rules
    })
  } catch (error) {
    console.error('Failed to fetch routing rules:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch routing rules'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // 验证必填字段
    if (!body.name) {
      return NextResponse.json({
        success: false,
        error: 'Rule name is required'
      }, { status: 400 })
    }

    const db = await getDatabase()
    const rule = await db.createRoutingRule({
      name: body.name,
      description: body.description,
      priority: body.priority || 100,
      enabled: body.enabled !== false,
      conditions: body.conditions || {},
      targetProxyAccountId: body.targetProxyAccountId,
      action: body.action || 'route'
    })

    return NextResponse.json({
      success: true,
      data: rule
    })
  } catch (error) {
    console.error('Failed to create routing rule:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create routing rule'
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.id) {
      return NextResponse.json({
        success: false,
        error: 'Rule ID is required'
      }, { status: 400 })
    }

    const db = await getDatabase()
    const updates: any = {}

    // 只更新提供的字段
    if (body.name !== undefined) updates.name = body.name
    if (body.description !== undefined) updates.description = body.description
    if (body.priority !== undefined) updates.priority = body.priority
    if (body.enabled !== undefined) updates.enabled = body.enabled
    if (body.conditions !== undefined) updates.conditions = body.conditions
    if (body.targetProxyAccountId !== undefined) updates.targetProxyAccountId = body.targetProxyAccountId
    if (body.action !== undefined) updates.action = body.action

    const rule = await db.updateRoutingRule(body.id, updates)

    return NextResponse.json({
      success: true,
      data: rule
    })
  } catch (error) {
    console.error('Failed to update routing rule:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to update routing rule'
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Rule ID is required'
      }, { status: 400 })
    }

    const db = await getDatabase()
    const success = await db.deleteRoutingRule(id)

    return NextResponse.json({
      success,
      message: success ? 'Routing rule deleted successfully' : 'Routing rule not found'
    })
  } catch (error) {
    console.error('Failed to delete routing rule:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to delete routing rule'
    }, { status: 500 })
  }
}