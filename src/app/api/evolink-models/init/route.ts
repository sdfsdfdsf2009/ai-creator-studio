import { NextRequest, NextResponse } from 'next/server'
import { initializeEvoLinkData, isEvoLinkDataInitialized, reinitializeEvoLinkData } from '@/lib/init-evolink-data'

// POST - 初始化EvoLink.AI数据
export async function POST(request: NextRequest) {
  try {
    let force = false
    try {
      const body = await request.json()
      force = body.force || false
    } catch (jsonError) {
      // 如果无法解析JSON，使用默认值
      console.log('⚠️ 无法解析请求体JSON，使用默认参数')
      force = false
    }

    console.log(`🔧 请求初始化EvoLink.AI数据，force=${force}`)

    // 检查是否已初始化
    const isInitialized = await isEvoLinkDataInitialized()

    if (isInitialized && !force) {
      return NextResponse.json({
        success: true,
        message: 'EvoLink.AI数据已初始化',
        data: {
          initialized: true,
          action: 'none'
        }
      })
    }

    // 执行初始化
    const result = force ? await reinitializeEvoLinkData() : await initializeEvoLinkData()

    return NextResponse.json({
      success: true,
      message: force ? 'EvoLink.AI数据重新初始化完成' : 'EvoLink.AI数据初始化完成',
      data: {
        initialized: true,
        action: force ? 'reinitialized' : 'initialized',
        result
      }
    })

  } catch (error) {
    console.error('Failed to initialize EvoLink.AI data:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to initialize data'
    }, { status: 500 })
  }
}

// GET - 检查初始化状态
export async function GET() {
  try {
    const isInitialized = await isEvoLinkDataInitialized()

    return NextResponse.json({
      success: true,
      data: {
        initialized: isInitialized
      }
    })

  } catch (error) {
    console.error('Failed to check EvoLink.AI data status:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check status'
    }, { status: 500 })
  }
}