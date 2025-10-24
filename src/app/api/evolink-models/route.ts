import { NextRequest, NextResponse } from 'next/server'
import { withDatabase } from '@/lib/database'

export interface EvoLinkTemplate {
  id?: string
  modelId: string
  modelName: string
  mediaType: 'text' | 'image' | 'video'
  costPerRequest?: number
  description?: string
  enabled?: boolean
  is_builtin?: boolean
  defaultEndpointUrl?: string
  createdAt?: string
  updatedAt?: string
}

export interface UserEvoLinkModel {
  id?: string
  templateId?: string
  modelId: string
  displayName: string
  mediaType: 'text' | 'image' | 'video'
  costPerRequest?: number
  proxyAccountId?: string
  proxyAccountName?: string
  enabled?: boolean
  tested?: boolean
  lastTestedAt?: string
  testResult?: any
  settings?: Record<string, any>
  customEndpointUrl?: string
  endpointUrl?: string // 实际使用的URL（计算得出）
  createdAt?: string
  updatedAt?: string
}

// URL配置相关接口
export interface ApiEndpointConfig {
  id?: string
  provider: string
  mediaType: 'text' | 'image' | 'video'
  endpointUrl: string
  description?: string
  enabled?: boolean
  isDefault?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface UrlPreviewRequest {
  modelId: string
  mediaType: 'text' | 'image' | 'video'
  customEndpointUrl?: string
  proxyAccountId?: string
}

export interface UrlTestRequest {
  url: string
  method?: 'GET' | 'POST' | 'HEAD'
  headers?: Record<string, string>
  timeout?: number
}

export interface UrlTestResult {
  success: boolean
  url: string
  statusCode?: number
  responseTime?: number
  error?: string
  timestamp: string
}

// GET - 获取所有EvoLink.AI模型模板和用户模型
export async function GET() {
  try {
    const result = await withDatabase(async (db) => {
      const [templates, userModels] = await Promise.all([
        db.getEvoLinkTemplates(),
        db.getUserEvoLinkModels()
      ])

      return { templates, userModels }
    })

    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('Failed to fetch EvoLink.AI models:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch models'
    }, { status: 500 })
  }
}

// POST - 创建新的EvoLink.AI模型模板或用户模型
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, data } = body

    if (!type || !data) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: type, data'
      }, { status: 400 })
    }

    const result = await withDatabase(async (db) => {
      const now = new Date().toISOString()
      let record

      if (type === 'template') {
        const template: EvoLinkTemplate = {
          ...data,
          id: data.id || `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          createdAt: data.createdAt || now,
          updatedAt: now
        }

        record = await db.createEvoLinkTemplate(template)
      } else if (type === 'user-model') {
        const userModel: UserEvoLinkModel = {
          ...data,
          id: data.id || `user_model_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          createdAt: data.createdAt || now,
          updatedAt: now
        }

        record = await db.createUserEvoLinkModel(userModel)
      } else {
        throw new Error(`Invalid type: ${type}`)
      }

      return record
    })

    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('Failed to create EvoLink.AI model:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create model'
    }, { status: 500 })
  }
}