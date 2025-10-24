// EvoLink URL配置辅助函数
import { withDatabase } from './database'

// URL验证函数
export async function validateEvoLinkUrl(url: string, mediaType: 'text' | 'image' | 'video'): Promise<{
  isValid: boolean
  errors: string[]
  warnings: string[]
  suggestions: string[]
}> {
  const errors: string[] = []
  const warnings: string[] = []
  const suggestions: string[] = []

  // 基础URL格式验证
  try {
    new URL(url)
  } catch {
    errors.push('URL格式无效')
    return { isValid: false, errors, warnings, suggestions }
  }

  // EvoLink特定验证
  if (!url.includes('evolink.ai') && !url.includes('localhost') && !url.includes('127.0.0.1')) {
    warnings.push('URL不是EvoLink.AI官方地址，请确认这是您期望的配置')
  }

  // 检查协议
  if (!url.startsWith('https://') && !url.startsWith('http://localhost')) {
    warnings.push('建议使用HTTPS协议以确保安全性')
  }

  // 检查路径
  const expectedPaths = {
    text: ['/v1/chat/completions', '/chat/completions'],
    image: ['/v1/images/generations', '/images/generations'],
    video: ['/v1/videos/generations', '/videos/generations']
  }

  const hasValidPath = expectedPaths[mediaType].some(path => url.endsWith(path))
  if (!hasValidPath) {
    warnings.push(`URL路径可能与${mediaType}类型的标准端点不匹配`)
    suggestions.push(`建议使用: ${expectedPaths[mediaType][0]}`)
  }

  // 检查端口
  if (url.includes(':3000') || url.includes(':8080') || url.includes(':9000')) {
    warnings.push('检测到开发环境端口，请确认这是生产环境的配置')
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions
  }
}

// 批量URL配置函数
export async function batchUpdateUrls(config: {
  modelIds: string[]
  customUrl: string
  applyToTemplates?: boolean
  applyToUserModels?: boolean
}): Promise<{
  success: number
  failed: number
  errors: Array<{ modelId: string; error: string }>
}> {
  const { modelIds, customUrl, applyToTemplates = true, applyToUserModels = true } = config
  let success = 0
  let failed = 0
  const errors: Array<{ modelId: string; error: string }> = []

  try {
    await withDatabase(async (db) => {
      // 更新模板配置
      if (applyToTemplates) {
        const templates = await db.getEvoLinkTemplates()
        for (const template of templates) {
          if (modelIds.includes(template.modelId)) {
            try {
              await db.updateEvoLinkTemplate(template.id!, {
                endpointUrl: customUrl
              })
              success++
            } catch (error) {
              failed++
              errors.push({
                modelId: template.modelId,
                error: error instanceof Error ? error.message : 'Unknown error'
              })
            }
          }
        }
      }

      // 更新用户模型配置
      if (applyToUserModels) {
        const userModels = await db.getUserEvoLinkModels()
        for (const userModel of userModels) {
          if (modelIds.includes(userModel.modelId)) {
            try {
              await db.updateUserEvoLinkModel(userModel.id!, {
                customEndpointUrl: customUrl
              })
              success++
            } catch (error) {
              failed++
              errors.push({
                modelId: userModel.modelId,
                error: error instanceof Error ? error.message : 'Unknown error'
              })
            }
          }
        }
      }
    })
  } catch (error) {
    throw new Error(`批量更新失败: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }

  return { success, failed, errors }
}

// URL配置导出函数
export async function exportUrlConfig(): Promise<{
  templates: Array<{
    modelId: string
    modelName: string
    mediaType: string
    customUrl: string | null
  }>
  userModels: Array<{
    modelId: string
    displayName: string
    mediaType: string
    customUrl: string | null
  }>
  exportTime: string
  version: string
}> {
  try {
    return await withDatabase(async (db) => {
      const templates = await db.getEvoLinkTemplates()
      const userModels = await db.getUserEvoLinkModels()

      return {
        templates: templates.map(t => ({
          modelId: t.modelId,
          modelName: t.modelName,
          mediaType: t.mediaType,
          customUrl: t.endpointUrl || null
        })),
        userModels: userModels.map(m => ({
          modelId: m.modelId,
          displayName: m.displayName,
          mediaType: m.mediaType,
          customUrl: m.customEndpointUrl || null
        })),
        exportTime: new Date().toISOString(),
        version: '1.0'
      }
    })
  } catch (error) {
    throw new Error(`导出配置失败: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// URL配置导入函数
export async function importUrlConfig(config: {
  templates?: Array<{
    modelId: string
    customUrl: string
  }>
  userModels?: Array<{
    modelId: string
    customUrl: string
  }>
  overwriteExisting?: boolean
}): Promise<{
  success: number
  failed: number
  errors: Array<{ modelId: string; error: string }>
  warnings: string[]
}> {
  const { templates = [], userModels = [], overwriteExisting = false } = config
  let success = 0
  let failed = 0
  const errors: Array<{ modelId: string; error: string }> = []
  const warnings: string[] = []

  try {
    await withDatabase(async (db) => {
      // 导入模板配置
      for (const templateConfig of templates) {
        try {
          const existingTemplates = await db.getEvoLinkTemplates()
          const template = existingTemplates.find(t => t.modelId === templateConfig.modelId)

          if (template) {
            if (overwriteExisting || !template.endpointUrl) {
              await db.updateEvoLinkTemplate(template.id!, {
                endpointUrl: templateConfig.customUrl
              })
              success++
            } else {
              warnings.push(`模板 ${templateConfig.modelId} 已有URL配置，跳过`)
            }
          } else {
            errors.push({
              modelId: templateConfig.modelId,
              error: '模板不存在'
            })
          }
        } catch (error) {
          failed++
          errors.push({
            modelId: templateConfig.modelId,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }

      // 导入用户模型配置
      for (const userModelConfig of userModels) {
        try {
          const existingUserModels = await db.getUserEvoLinkModels()
          const userModel = existingUserModels.find(m => m.modelId === userModelConfig.modelId)

          if (userModel) {
            if (overwriteExisting || !userModel.customEndpointUrl) {
              await db.updateUserEvoLinkModel(userModel.id!, {
                customEndpointUrl: userModelConfig.customUrl
              })
              success++
            } else {
              warnings.push(`用户模型 ${userModelConfig.modelId} 已有URL配置，跳过`)
            }
          } else {
            errors.push({
              modelId: userModelConfig.modelId,
              error: '用户模型不存在'
            })
          }
        } catch (error) {
          failed++
          errors.push({
            modelId: userModelConfig.modelId,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }
    })
  } catch (error) {
    throw new Error(`导入配置失败: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }

  return { success, failed, errors, warnings }
}

// 获取URL配置统计信息
export async function getUrlConfigStats(): Promise<{
  totalTemplates: number
  templatesWithCustomUrl: number
  totalUserModels: number
  userModelsWithCustomUrl: number
  urlUsageByMediaType: {
    text: number
    image: number
    video: number
  }
  mostUsedUrls: Array<{
    url: string
    count: number
    models: string[]
  }>
}> {
  try {
    return await withDatabase(async (db) => {
      const templates = await db.getEvoLinkTemplates()
      const userModels = await db.getUserEvoLinkModels()

      const templatesWithCustomUrl = templates.filter(t => t.endpointUrl).length
      const userModelsWithCustomUrl = userModels.filter(m => m.customEndpointUrl).length

      // 统计按媒体类型的URL使用情况
      const urlUsageByMediaType = {
        text: 0,
        image: 0,
        video: 0
      }

      const allModels = [...templates, ...userModels]
      const urlCounts = new Map<string, { count: number; models: string[] }>()

      for (const model of allModels) {
        const url = model.endpointUrl || model.customEndpointUrl
        if (url) {
          urlUsageByMediaType[model.mediaType]++

          if (urlCounts.has(url)) {
            const existing = urlCounts.get(url)!
            existing.count++
            existing.models.push(model.modelId)
          } else {
            urlCounts.set(url, {
              count: 1,
              models: [model.modelId]
            })
          }
        }
      }

      // 获取最常用的URL
      const mostUsedUrls = Array.from(urlCounts.entries())
        .map(([url, data]) => ({ url, ...data }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)

      return {
        totalTemplates: templates.length,
        templatesWithCustomUrl,
        totalUserModels: userModels.length,
        userModelsWithCustomUrl,
        urlUsageByMediaType,
        mostUsedUrls
      }
    })
  } catch (error) {
    throw new Error(`获取统计信息失败: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// 清理无效URL配置
export async function cleanupInvalidUrlConfigs(): Promise<{
  cleaned: number
  errors: Array<{ modelId: string; error: string }>
}> {
  let cleaned = 0
  const errors: Array<{ modelId: string; error: string }> = []

  try {
    await withDatabase(async (db) => {
      // 清理模板配置
      const templates = await db.getEvoLinkTemplates()
      for (const template of templates) {
        if (template.endpointUrl) {
          try {
            new URL(template.endpointUrl)
          } catch {
            try {
              await db.updateEvoLinkTemplate(template.id!, {
                endpointUrl: null
              })
              cleaned++
            } catch (error) {
              errors.push({
                modelId: template.modelId,
                error: '清理模板URL失败'
              })
            }
          }
        }
      }

      // 清理用户模型配置
      const userModels = await db.getUserEvoLinkModels()
      for (const userModel of userModels) {
        if (userModel.customEndpointUrl) {
          try {
            new URL(userModel.customEndpointUrl)
          } catch {
            try {
              await db.updateUserEvoLinkModel(userModel.id!, {
                customEndpointUrl: null
              })
              cleaned++
            } catch (error) {
              errors.push({
                modelId: userModel.modelId,
                error: '清理用户模型URL失败'
              })
            }
          }
        }
      }
    })
  } catch (error) {
    throw new Error(`清理配置失败: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }

  return { cleaned, errors }
}