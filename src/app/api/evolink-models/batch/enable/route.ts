import { NextRequest, NextResponse } from 'next/server'
import { withDatabase } from '@/lib/database'

// PUT - 批量启用所有EvoLink模型
export async function PUT(request: NextRequest) {
  try {
    console.log('🔧 开始批量启用所有EvoLink模型')

    let enabledTemplates = 0
    let enabledUserModels = 0

    await withDatabase(async (db) => {
      // 启用所有模板
      const templates = await db.getEvoLinkTemplates()
      for (const template of templates) {
        try {
          await db.updateEvoLinkTemplate(template.id!, { enabled: true })
          enabledTemplates++
        } catch (error) {
          console.error(`启用模板失败 ${template.modelName}:`, error)
        }
      }

      // 启用所有用户模型
      const userModels = await db.getUserEvoLinkModels()
      for (const userModel of userModels) {
        try {
          await db.updateUserEvoLinkModel(userModel.id!, { enabled: true })
          enabledUserModels++
        } catch (error) {
          console.error(`启用用户模型失败 ${userModel.displayName}:`, error)
        }
      }
    })

    console.log(`✅ 批量启用完成: ${enabledTemplates} 个模板, ${enabledUserModels} 个用户模型`)

    return NextResponse.json({
      success: true,
      message: '批量启用完成',
      data: {
        enabledTemplates,
        enabledUserModels,
        totalEnabled: enabledTemplates + enabledUserModels
      }
    })

  } catch (error) {
    console.error('批量启用EvoLink模型失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: '批量启用失败',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}