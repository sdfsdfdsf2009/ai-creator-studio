import { NextRequest, NextResponse } from 'next/server'
import { withDatabase } from '@/lib/database'

// PUT - 批量禁用所有EvoLink模型
export async function PUT(request: NextRequest) {
  try {
    console.log('🔧 开始批量禁用所有EvoLink模型')

    let disabledTemplates = 0
    let disabledUserModels = 0

    await withDatabase(async (db) => {
      // 禁用所有模板
      const templates = await db.getEvoLinkTemplates()
      for (const template of templates) {
        try {
          await db.updateEvoLinkTemplate(template.id!, { enabled: false })
          disabledTemplates++
        } catch (error) {
          console.error(`禁用模板失败 ${template.modelName}:`, error)
        }
      }

      // 禁用所有用户模型
      const userModels = await db.getUserEvoLinkModels()
      for (const userModel of userModels) {
        try {
          await db.updateUserEvoLinkModel(userModel.id!, { enabled: false })
          disabledUserModels++
        } catch (error) {
          console.error(`禁用用户模型失败 ${userModel.displayName}:`, error)
        }
      }
    })

    console.log(`✅ 批量禁用完成: ${disabledTemplates} 个模板, ${disabledUserModels} 个用户模型`)

    return NextResponse.json({
      success: true,
      message: '批量禁用完成',
      data: {
        disabledTemplates,
        disabledUserModels,
        totalDisabled: disabledTemplates + disabledUserModels
      }
    })

  } catch (error) {
    console.error('批量禁用EvoLink模型失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: '批量禁用失败',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}