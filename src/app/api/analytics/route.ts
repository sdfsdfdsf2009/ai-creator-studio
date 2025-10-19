import { NextRequest, NextResponse } from 'next/server'
import { analyticsService, AnalyticsFilter } from '@/lib/analytics'

// GET - 获取分析数据
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // 解析过滤参数
    const filter: Partial<AnalyticsFilter> = {}

    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    if (startDate && endDate) {
      filter.dateRange = {
        start: startDate,
        end: endDate
      }
    }

    const providers = searchParams.get('providers')
    if (providers) {
      filter.providers = providers.split(',')
    }

    const models = searchParams.get('models')
    if (models) {
      filter.models = models.split(',')
    }

    const types = searchParams.get('types')
    if (types) {
      filter.types = types.split(',') as ('image' | 'video')[]
    }

    const type = searchParams.get('type') // 'cost', 'usage', 'performance', 'content'

    let data
    switch (type) {
      case 'cost':
        data = await analyticsService.getCostStats(filter)
        break
      case 'usage':
        data = await analyticsService.getUsageStats(filter)
        break
      case 'performance':
        data = await analyticsService.getPerformanceStats(filter)
        break
      default:
        data = await analyticsService.getAnalytics(filter)
    }

    return NextResponse.json({
      success: true,
      data
    })

  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}

// POST - 生成报告
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, type, filters, format = 'json' } = body

    if (!name || !type) {
      return NextResponse.json(
        { success: false, error: 'Name and type are required' },
        { status: 400 }
      )
    }

    const report = await analyticsService.generateReport(
      name,
      description || '',
      type,
      filters || {},
      format
    )

    return NextResponse.json({
      success: true,
      data: report
    })

  } catch (error) {
    console.error('Error generating report:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate report' },
      { status: 500 }
    )
  }
}