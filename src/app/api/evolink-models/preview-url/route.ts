import { NextRequest, NextResponse } from 'next/server'
import { withDatabase } from '@/lib/database'
import { UrlPreviewRequest } from '@/app/api/evolink-models/route'

// POST - 预览URL适配结果
export async function POST(request: NextRequest) {
  try {
    const body: UrlPreviewRequest = await request.json()
    const { modelId, mediaType, customEndpointUrl, proxyAccountId } = body

    console.log(`🔍 预览URL适配: modelId=${modelId}, mediaType=${mediaType}`)

    if (!modelId || !mediaType) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: modelId, mediaType'
      }, { status: 400 })
    }

    const result = await withDatabase(async (db) => {
      // 获取所有模型模板信息
      const templates = await db.getEvoLinkTemplates()
      const template = templates.find(t => t.modelId === modelId)
      if (!template) {
        throw new Error(`Model template not found: ${modelId}`)
      }

      // 计算最终URL
      let finalUrl = customEndpointUrl

      // 如果没有自定义URL，使用默认逻辑
      if (!finalUrl) {
        finalUrl = getDefaultEndpointUrl(mediaType)
      }

      // 如果是EvoLink模型，应用智能适配
      if (modelId.includes('evolink') || template.modelName.includes('EvoLink')) {
        finalUrl = getEvoLinkEndpointUrl(mediaType, customEndpointUrl)
      }

      // 检查代理账号配置
      let proxyAccount = null
      if (proxyAccountId) {
        proxyAccount = await db.getProxyAccount(proxyAccountId)
      }

      return {
        modelId,
        modelName: template.modelName,
        mediaType,
        finalUrl,
        customEndpointUrl: customEndpointUrl || null,
        defaultUrl: getDefaultEndpointUrl(mediaType),
        isCustom: !!customEndpointUrl,
        proxyAccount: proxyAccount ? {
          id: proxyAccount.id,
          name: proxyAccount.name,
          provider: proxyAccount.provider
        } : null,
        timestamp: new Date().toISOString()
      }
    })

    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('Failed to preview URL:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to preview URL'
    }, { status: 500 })
  }
}

// 获取默认端点URL
function getDefaultEndpointUrl(mediaType: 'text' | 'image' | 'video'): string {
  const baseUrl = 'https://api.evolink.ai/v1'

  switch (mediaType) {
    case 'text':
      return `${baseUrl}/chat/completions`
    case 'image':
      return `${baseUrl}/images/generations`
    case 'video':
      return `${baseUrl}/videos/generations`
    default:
      return baseUrl
  }
}

// 获取EvoLink端点URL（智能适配）
function getEvoLinkEndpointUrl(
  mediaType: 'text' | 'image' | 'video',
  customEndpointUrl?: string
): string {
  // 如果有自定义URL，直接返回
  if (customEndpointUrl) {
    return customEndpointUrl
  }

  // 否则返回默认的EvoLink端点
  return getDefaultEndpointUrl(mediaType)
}