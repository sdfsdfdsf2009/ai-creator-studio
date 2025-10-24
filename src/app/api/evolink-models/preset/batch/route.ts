import { NextRequest, NextResponse } from 'next/server'
import { withDatabase } from '@/lib/database'

// POST - 批量预置EvoLink模型
export async function POST(request: NextRequest) {
  try {
    const { mediaType, force } = await request.json()

    console.log(`🔧 开始批量预置EvoLink模型，mediaType=${mediaType || 'all'}, force=${force || false}`)

    let presetCount = 0
    let updatedCount = 0

    await withDatabase(async (db) => {
      // 读取预置数据
      const presetData = await readPresetData()
      const templates = presetData.templates

      // 筛选要预置的模板
      let templatesToPreset = templates
      if (mediaType) {
        templatesToPreset = templates.filter((t: any) => t.mediaType === mediaType)
      }

      console.log(`找到 ${templatesToPreset.length} 个需要预置的模板`)

      for (const template of templatesToPreset) {
        try {
          // 检查模板是否已存在
          const existingTemplate = await db.getEvoLinkTemplate(template.modelId)

          if (existingTemplate) {
            if (force) {
              // 强制更新现有模板
              await db.updateEvoLinkTemplate(existingTemplate.id!, {
                modelName: template.modelName,
                mediaType: template.mediaType,
                costPerRequest: template.costPerRequest,
                description: template.description,
                enabled: template.enabled,
                endpointUrl: template.endpointUrl || null
              })
              updatedCount++
              console.log(`✅ 更新模板: ${template.modelName}`)
            } else {
              console.log(`⏭️ 跳过已存在模板: ${template.modelName}`)
            }
          } else {
            // 创建新模板
            await db.createEvoLinkTemplate({
              modelId: template.modelId,
              modelName: template.modelName,
              mediaType: template.mediaType,
              costPerRequest: template.costPerRequest,
              description: template.description,
              enabled: template.enabled,
              is_builtin: true,
              endpointUrl: template.endpointUrl || null
            })
            presetCount++
            console.log(`✅ 预置模板: ${template.modelName}`)
          }
        } catch (error) {
          console.error(`❌ 预置模板失败 ${template.modelName}:`, error)
        }
      }
    })

    const totalProcessed = presetCount + updatedCount

    return NextResponse.json({
      success: true,
      message: `批量预置完成`,
      data: {
        presetCount,
        updatedCount,
        totalProcessed,
        mediaType: mediaType || 'all'
      }
    })

  } catch (error) {
    console.error('批量预置EvoLink模型失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: '批量预置失败',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// 读取预置数据
async function readPresetData() {
  const fs = await import('fs/promises')
  const path = await import('path')

  try {
    const presetPath = path.join(process.cwd(), 'src', 'data', 'evolink-models.json')
    const data = await fs.readFile(presetPath, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    console.error('读取预置数据失败:', error)
    throw new Error('无法读取预置数据文件')
  }
}