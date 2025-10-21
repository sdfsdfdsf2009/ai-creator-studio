import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { PromptTemplate, MediaType } from '@/types'
import { withDatabase } from '@/lib/database'

// 全局模板存储（生产环境应使用数据库）
declare global {
  var __promptTemplates: Map<string, PromptTemplate>
}

if (!global.__promptTemplates) {
  global.__promptTemplates = new Map()

  // 初始化一些示例模板
  const sampleTemplates: PromptTemplate[] = [
    {
      id: 'template-1',
      name: '专业商务肖像',
      description: '生成专业商务风格的个人肖像照片',
      template: 'Professional headshot of a {subject}, wearing {attire}, {background} background, studio lighting, high quality, business portrait',
      variables: [
        {
          name: 'subject',
          type: 'text',
          defaultValue: 'business professional',
          required: true,
          description: '主体人物描述'
        },
        {
          name: 'attire',
          type: 'select',
          defaultValue: 'business suit',
          options: ['business suit', 'business casual', 'formal wear', 'professional attire'],
          required: true,
          description: '服装类型'
        },
        {
          name: 'background',
          type: 'select',
          defaultValue: 'plain',
          options: ['plain', 'office', 'studio', 'neutral'],
          required: false,
          description: '背景类型'
        }
      ],
      mediaType: 'image',
      model: 'dall-e-3',
      usageCount: 24,
      totalCost: 12.40,
      cacheHitRate: 0.15,
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'template-2',
      name: '电影级视频场景',
      description: '创建具有电影质感的视频场景',
      template: 'Cinematic scene of {scene}, {lighting} lighting, {camera_work} camera work, {atmosphere} atmosphere, 4K quality, professional videography',
      variables: [
        {
          name: 'scene',
          type: 'text',
          defaultValue: 'dramatic cityscape at night',
          required: true,
          description: '场景描述'
        },
        {
          name: 'lighting',
          type: 'select',
          defaultValue: 'dramatic',
          options: ['dramatic', 'soft', 'natural', 'studio'],
          required: true,
          description: '光照风格'
        },
        {
          name: 'camera_work',
          type: 'select',
          defaultValue: 'professional',
          options: ['professional', 'handheld', 'steady', 'dynamic'],
          required: false,
          description: '摄像手法'
        },
        {
          name: 'atmosphere',
          type: 'text',
          defaultValue: 'tense and mysterious',
          required: false,
          description: '氛围描述'
        }
      ],
      mediaType: 'video',
      model: 'runway-gen3',
      usageCount: 8,
      totalCost: 6.80,
      cacheHitRate: 0.25,
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'template-3',
      name: '产品展示图',
      description: '生成高质量的产品展示图片',
      template: 'Professional product photography of {product}, {background} background, {lighting} lighting, studio quality, commercial photography, detailed',
      variables: [
        {
          name: 'product',
          type: 'text',
          defaultValue: 'luxury watch',
          required: true,
          description: '产品描述'
        },
        {
          name: 'background',
          type: 'select',
          defaultValue: 'white studio',
          options: ['white studio', 'dark background', 'lifestyle setting', 'minimalist'],
          required: true,
          description: '背景设置'
        },
        {
          name: 'lighting',
          type: 'select',
          defaultValue: 'soft studio',
          options: ['soft studio', 'dramatic', 'natural', 'ring light'],
          required: false,
          description: '光照设置'
        }
      ],
      mediaType: 'image',
      model: 'stable-diffusion-xl-1024-v1-0',
      usageCount: 15,
      totalCost: 4.50,
      cacheHitRate: 0.30,
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'template-4',
      name: '抽象艺术创作',
      description: '创建现代抽象艺术风格的作品',
      template: 'Abstract art piece featuring {elements}, {style} style, {colors} color palette, contemporary, artistic, gallery quality',
      variables: [
        {
          name: 'elements',
          type: 'text',
          defaultValue: 'geometric shapes and flowing lines',
          required: true,
          description: '艺术元素'
        },
        {
          name: 'style',
          type: 'select',
          defaultValue: 'contemporary',
          options: ['contemporary', 'modernist', 'minimalist', 'expressionist'],
          required: true,
          description: '艺术风格'
        },
        {
          name: 'colors',
          type: 'text',
          defaultValue: 'vibrant blues and purples',
          required: false,
          description: '色彩方案'
        }
      ],
      mediaType: 'image',
      model: 'midjourney-v6',
      usageCount: 12,
      totalCost: 8.60,
      cacheHitRate: 0.20,
      createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    }
  ]

  sampleTemplates.forEach(template => {
    global.__promptTemplates.set(template.id, template)
  })
}

const templates = global.__promptTemplates

// GET - 获取模板列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // 解析查询参数
    const mediaType = searchParams.get('mediaType') as MediaType | null
    const search = searchParams.get('search') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')

    // 过滤模板
    let filteredTemplates = Array.from(templates.values())

    // 类型过滤
    if (mediaType && ['image', 'video'].includes(mediaType)) {
      filteredTemplates = filteredTemplates.filter(t => t.mediaType === mediaType)
    }

    // 搜索过滤
    if (search) {
      const searchLower = search.toLowerCase()
      filteredTemplates = filteredTemplates.filter(t =>
        t.name.toLowerCase().includes(searchLower) ||
        t.description.toLowerCase().includes(searchLower) ||
        t.template.toLowerCase().includes(searchLower)
      )
    }

    // 按使用次数排序
    filteredTemplates.sort((a, b) => b.usageCount - a.usageCount)

    // 分页
    const total = filteredTemplates.length
    const startIndex = (page - 1) * pageSize
    const endIndex = startIndex + pageSize
    const paginatedTemplates = filteredTemplates.slice(startIndex, endIndex)

    return NextResponse.json({
      success: true,
      data: {
        items: paginatedTemplates,
        total,
        page,
        pageSize,
        hasNext: endIndex < total,
        hasPrev: page > 1
      }
    })

  } catch (error) {
    console.error('Error fetching templates:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - 创建新模板
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name,
      description,
      template,
      variables = [],
      mediaType,
      model
    } = body

    // 验证必需字段
    if (!name || !template || !mediaType || !model) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: name, template, mediaType, model' },
        { status: 400 }
      )
    }

    // 验证类型
    if (!['image', 'video'].includes(mediaType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid mediaType. Must be image or video' },
        { status: 400 }
      )
    }

    // 创建新模板
    const templateId = uuidv4()
    const now = new Date().toISOString()

    const newTemplate: PromptTemplate = {
      id: templateId,
      name,
      description: description || '',
      template,
      variables,
      mediaType: mediaType as MediaType,
      model,
      usageCount: 0,
      totalCost: 0,
      cacheHitRate: 0,
      createdAt: now,
      updatedAt: now
    }

    // 保存到数据库
    const savedTemplate = await withDatabase(async (db) => {
      await db.createTemplate(newTemplate)
      return newTemplate
    })

    return NextResponse.json({
      success: true,
      data: savedTemplate
    })

  } catch (error) {
    console.error('Error creating template:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}