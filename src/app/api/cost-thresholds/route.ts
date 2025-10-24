import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const enabled = searchParams.get('enabled')
    const thresholdType = searchParams.get('thresholdType')

    const db = await getDatabase()

    if (id) {
      // 获取单个成本阈值
      const threshold = await db.getCostThreshold(id)
      if (!threshold) {
        return NextResponse.json({
          success: false,
          error: 'Cost threshold not found'
        }, { status: 404 })
      }

      return NextResponse.json({
        success: true,
        data: threshold
      })
    } else {
      // 获取成本阈值列表
      const params: any = {}
      if (enabled !== null) {
        params.enabled = enabled === 'true'
      }
      if (thresholdType) {
        params.thresholdType = thresholdType
      }

      const thresholds = await db.getCostThresholds(params)
      return NextResponse.json({
        success: true,
        data: thresholds
      })
    }

  } catch (error) {
    console.error('Cost thresholds GET error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name,
      description,
      thresholdType,
      thresholdValue,
      currency = 'USD',
      period = 'daily',
      enabled = true,
      alertEmail,
      alertWebhook
    } = body

    // 验证必填字段
    if (!name || thresholdType === undefined || thresholdValue === undefined) {
      return NextResponse.json({
        success: false,
        error: 'name, thresholdType, and thresholdValue are required'
      }, { status: 400 })
    }

    // 验证阈值类型
    const validTypes = ['daily', 'weekly', 'monthly', 'per_task', 'per_user']
    if (!validTypes.includes(thresholdType)) {
      return NextResponse.json({
        success: false,
        error: `Invalid thresholdType. Must be one of: ${validTypes.join(', ')}`
      }, { status: 400 })
    }

    // 验证阈值数值
    if (typeof thresholdValue !== 'number' || thresholdValue <= 0) {
      return NextResponse.json({
        success: false,
        error: 'thresholdValue must be a positive number'
      }, { status: 400 })
    }

    const db = await getDatabase()
    const threshold = await db.createCostThreshold({
      name: name.trim(),
      description: description?.trim() || null,
      thresholdType,
      thresholdValue,
      currency,
      period,
      enabled,
      alertEmail: alertEmail?.trim() || null,
      alertWebhook: alertWebhook?.trim() || null
    })

    return NextResponse.json({
      success: true,
      data: threshold,
      message: 'Cost threshold created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Cost thresholds POST error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error'
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'id is required for updates'
      }, { status: 400 })
    }

    // 验证阈值类型（如果提供）
    if (updates.thresholdType !== undefined) {
      const validTypes = ['daily', 'weekly', 'monthly', 'per_task', 'per_user']
      if (!validTypes.includes(updates.thresholdType)) {
        return NextResponse.json({
          success: false,
          error: `Invalid thresholdType. Must be one of: ${validTypes.join(', ')}`
        }, { status: 400 })
      }
    }

    // 验证阈值数值（如果提供）
    if (updates.thresholdValue !== undefined) {
      if (typeof updates.thresholdValue !== 'number' || updates.thresholdValue <= 0) {
        return NextResponse.json({
          success: false,
          error: 'thresholdValue must be a positive number'
        }, { status: 400 })
      }
    }

    const db = await getDatabase()
    const updatedThreshold = await db.updateCostThreshold(id, updates)

    if (!updatedThreshold) {
      return NextResponse.json({
        success: false,
        error: 'Cost threshold not found'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: updatedThreshold,
      message: 'Cost threshold updated successfully'
    })

  } catch (error) {
    console.error('Cost thresholds PUT error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error'
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
        error: 'id is required for deletion'
      }, { status: 400 })
    }

    const db = await getDatabase()
    const deleted = await db.deleteCostThreshold(id)

    if (!deleted) {
      return NextResponse.json({
        success: false,
        error: 'Cost threshold not found'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: 'Cost threshold deleted successfully'
    })

  } catch (error) {
    console.error('Cost thresholds DELETE error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error'
    }, { status: 500 })
  }
}