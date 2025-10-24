import { withDatabase } from '@/lib/database'
import fs from 'fs'
import path from 'path'

interface EvoLinkTemplate {
  modelId: string
  modelName: string
  mediaType: 'text' | 'image' | 'video'
  costPerRequest?: number
  description?: string
  enabled?: boolean
  is_builtin?: boolean
}

interface ApiEndpoint {
  provider: string
  mediaType: 'text' | 'image' | 'video'
  endpointUrl: string
  description?: string
  enabled?: boolean
}

interface EvoLinkModelsData {
  version: string
  description: string
  lastUpdated: string
  templates: EvoLinkTemplate[]
  apiEndpoints: ApiEndpoint[]
  metadata: any
}

export async function initializeEvoLinkData() {
  console.log('🚀 开始初始化EvoLink.AI模型数据...')

  try {
    // 读取JSON文件
    const jsonPath = path.join(process.cwd(), 'src/data/evolink-models.json')
    const jsonData = fs.readFileSync(jsonPath, 'utf-8')
    const evolinkModelsData: EvoLinkModelsData = JSON.parse(jsonData)

    const result = await withDatabase(async (db) => {
      const initResults = {
        templates: { created: 0, skipped: 0 },
        apiEndpoints: { created: 0, skipped: 0 },
        errors: [] as string[]
      }

      const now = new Date().toISOString()

      // 1. 初始化API端点
      console.log('📡 初始化API端点配置...')
      for (const endpoint of evolinkModelsData.apiEndpoints) {
        try {
          // 检查是否已存在
          const existingEndpoints = await db.getApiEndpoints()
          const exists = existingEndpoints.find(e =>
            e.provider === endpoint.provider && e.mediaType === endpoint.mediaType
          )

          if (exists) {
            console.log(`⏭️  API端点已存在: ${endpoint.provider}/${endpoint.mediaType}`)
            initResults.apiEndpoints.skipped++
          } else {
            const endpointData = {
              id: `endpoint_${endpoint.provider}_${endpoint.mediaType}_${Date.now()}`,
              provider: endpoint.provider,
              mediaType: endpoint.mediaType,
              endpointUrl: endpoint.endpointUrl,
              description: endpoint.description,
              enabled: endpoint.enabled,
              createdAt: now,
              updatedAt: now
            }

            await db.createApiEndpoint(endpointData)
            console.log(`✅ API端点创建成功: ${endpoint.provider}/${endpoint.mediaType}`)
            initResults.apiEndpoints.created++
          }
        } catch (error) {
          const errorMsg = `API端点创建失败 ${endpoint.provider}/${endpoint.mediaType}: ${error instanceof Error ? error.message : String(error)}`
          console.error(`❌ ${errorMsg}`)
          initResults.errors.push(errorMsg)
        }
      }

      // 2. 初始化模型模板
      console.log('🤖 初始化EvoLink.AI模型模板...')
      for (const template of evolinkModelsData.templates) {
        try {
          // 检查是否已存在
          const existingTemplates = await db.getEvoLinkTemplates()
          const exists = existingTemplates.find(t => t.modelId === template.modelId)

          if (exists) {
            console.log(`⏭️  模型模板已存在: ${template.modelId}`)
            initResults.templates.skipped++
          } else {
            const templateData = {
              ...template,
              id: `template_${template.modelId}_${Date.now()}`,
              createdAt: now,
              updatedAt: now
            }

            await db.createEvoLinkTemplate(templateData)
            console.log(`✅ 模型模板创建成功: ${template.modelId}`)
            initResults.templates.created++
          }
        } catch (error) {
          const errorMsg = `模型模板创建失败 ${template.modelId}: ${error instanceof Error ? error.message : String(error)}`
          console.error(`❌ ${errorMsg}`)
          initResults.errors.push(errorMsg)
        }
      }

      return initResults
    })

    console.log('\n🎉 EvoLink.AI数据初始化完成!')
    console.log('📊 初始化结果统计:')
    console.log(`   - API端点: 创建 ${result.apiEndpoints.created} 个，跳过 ${result.apiEndpoints.skipped} 个`)
    console.log(`   - 模型模板: 创建 ${result.templates.created} 个，跳过 ${result.templates.skipped} 个`)

    if (result.errors.length > 0) {
      console.log(`   - 错误数量: ${result.errors.length} 个`)
      result.errors.forEach(error => console.log(`     ❌ ${error}`))
    }

    return result

  } catch (error) {
    console.error('💥 EvoLink.AI数据初始化失败:', error)
    throw error
  }
}

// 检查数据是否已初始化
export async function isEvoLinkDataInitialized(): Promise<boolean> {
  try {
    const result = await withDatabase(async (db) => {
      const [templates, endpoints] = await Promise.all([
        db.getEvoLinkTemplates(),
        db.getApiEndpoints()
      ])

      return {
        templateCount: templates.length,
        endpointCount: endpoints.length
      }
    })

    console.log(`📋 当前EvoLink.AI数据状态: ${result.templateCount} 个模板，${result.endpointCount} 个API端点`)

    // 如果有模板数据，认为已初始化
    return result.templateCount > 0
  } catch (error) {
    console.error('检查EvoLink.AI数据状态失败:', error)
    return false
  }
}

// 重新初始化数据（删除现有数据后重新创建）
export async function reinitializeEvoLinkData() {
  console.log('🔄 重新初始化EvoLink.AI数据...')

  const result = await withDatabase(async (db) => {
    const now = new Date().toISOString()
    const reinitResults = {
      templates: { deleted: 0, created: 0 },
      apiEndpoints: { deleted: 0, created: 0 },
      errors: [] as string[]
    }

    try {
      // 删除现有的API端点
      const existingEndpoints = await db.getApiEndpoints()
      for (const endpoint of existingEndpoints) {
        if (endpoint.provider === 'evolink') {
          await db.run('DELETE FROM api_endpoints WHERE id = ?', [endpoint.id])
          reinitResults.apiEndpoints.deleted++
        }
      }

      // 删除现有的模板（仅非内置的）
      const existingTemplates = await db.getEvoLinkTemplates()
      for (const template of existingTemplates) {
        if (!template.is_builtin) {
          await db.run('DELETE FROM evolink_model_templates WHERE id = ?', [template.id])
          reinitResults.templates.deleted++
        }
      }

      // 重新创建数据
      const initResult = await initializeEvoLinkData()

      reinitResults.templates.created = initResult.templates.created
      reinitResults.apiEndpoints.created = initResult.apiEndpoints.created
      reinitResults.errors.push(...initResult.errors)

      return reinitResults
    } catch (error) {
      const errorMsg = `重新初始化失败: ${error instanceof Error ? error.message : String(error)}`
      console.error(`❌ ${errorMsg}`)
      reinitResults.errors.push(errorMsg)
      return reinitResults
    }
  })

  return result
}

// 如果直接运行此文件，执行初始化
if (require.main === module) {
  initializeEvoLinkData()
    .then((result) => {
      console.log('\n✅ 初始化完成')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 初始化失败:', error)
      process.exit(1)
    })
}