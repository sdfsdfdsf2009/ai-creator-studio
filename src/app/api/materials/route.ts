import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { Material, MediaType, MaterialCategory } from '@/types'
import { withDatabase } from '@/lib/database'

// GET - 获取素材列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // 解析查询参数
    const type = searchParams.get('type') as MediaType | null
    const category = searchParams.get('category')
    const search = searchParams.get('search') || ''
    const batchTaskId = searchParams.get('batchTaskId')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const pageSize = parseInt(searchParams.get('pageSize') || '20')
    const page = parseInt(searchParams.get('page') || '1')

    // 从数据库获取素材
    const result = await withDatabase(async (db) => {
      const params: any = {
        sortBy: sortBy === 'createdAt' ? 'created_at' : sortBy,
        sortOrder: sortOrder.toUpperCase(),
        pageSize,
        page
      }

      if (type && type !== 'undefined') params.type = type
      if (category && category !== 'undefined') params.category = category
      if (search && search !== 'undefined') params.search = search
      if (batchTaskId && batchTaskId !== 'undefined') params.batchTaskId = batchTaskId

      return await db.getMaterials(params)
    })

    // 获取全局媒体类型统计（简化版本）
    const globalStats = await withDatabase(async (db) => {
      try {
        // 获取全局总数（不分类型）
        const allResult = await db.getMaterials({ pageSize: 1, page: 1 })

        // 获取图片总数
        const imageResult = await db.getMaterials({
          type: 'image',
          pageSize: 1,
          page: 1,
          batchTaskId: batchTaskId && batchTaskId !== 'undefined' ? batchTaskId : undefined
        })

        // 获取视频总数
        const videoResult = await db.getMaterials({
          type: 'video',
          pageSize: 1,
          page: 1,
          batchTaskId: batchTaskId && batchTaskId !== 'undefined' ? batchTaskId : undefined
        })

        return {
          global: {
            total: allResult.total,
            imageCount: imageResult.total,
            videoCount: videoResult.total
          },
          batch: batchTaskId && batchTaskId !== 'undefined' ? {
            total: imageResult.total + videoResult.total,
            imageCount: imageResult.total,
            videoCount: videoResult.total
          } : null
        }
      } catch (error) {
        console.warn('获取全局统计失败，使用当前页面数据:', error)
        // 如果统计查询失败，返回当前页面的统计
        return {
          global: {
            total: result.total,
            imageCount: result.items.filter((m: any) => m.type === 'image').length,
            videoCount: result.items.filter((m: any) => m.type === 'video').length
          },
          batch: null
        }
      }
    })

    // 获取所有标签
    const allTags = new Set<string>()
    result.items.forEach((material: any) => {
      material.tags?.forEach((tag: string) => allTags.add(tag))
    })

    // 计算媒体类型统计 - 使用全局统计数据而不是当前页面数据
    const stats = batchTaskId && batchTaskId !== 'undefined' ? globalStats.batch : globalStats.global
    const mediaTypeCounts = {
      all: stats?.total || 0,
      image: stats?.imageCount || 0,
      video: stats?.videoCount || 0
    }

    // 定义默认分类
    const categories = [
      { id: 'default', name: '默认分类', level: 0, materialCount: 0 },
      { id: 'characters', name: '人物角色', level: 0, materialCount: 0 },
      { id: 'landscapes', name: '风景场景', level: 0, materialCount: 0 },
      { id: 'abstract', name: '抽象艺术', level: 0, materialCount: 0 },
      { id: 'products', name: '产品展示', level: 0, materialCount: 0 }
    ]

    return NextResponse.json({
      success: true,
      data: {
        items: result.items,
        total: result.total,
        page,
        pageSize,
        hasNext: (page * pageSize) < result.total,
        hasPrev: page > 1,
        categories,
        tags: Array.from(allTags),
        mediaTypeCounts
      }
    })

  } catch (error) {
    console.error('Error fetching materials:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - 创建新素材
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name,
      type,
      url,
      thumbnailUrl,
      size,
      format,
      width,
      height,
      duration,
      prompt,
      model,
      tags = [],
      category = 'default',
      description,
      taskId,
      metadata = {}
    } = body

    // 验证必需字段
    if (!name || !type || !url || !size || !format) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: name, type, url, size, format' },
        { status: 400 }
      )
    }

    // 验证类型
    if (!['image', 'video'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid type. Must be image or video' },
        { status: 400 }
      )
    }

    // 创建新素材
    const materialId = randomUUID()
    const now = new Date().toISOString()

    const material: Material = {
      id: materialId,
      name,
      type: type as MediaType,
      url,
      thumbnailUrl,
      size,
      format,
      width,
      height,
      duration,
      prompt,
      model,
      tags,
      category,
      description,
      metadata,
      createdAt: now,
      updatedAt: now,
      taskId
    }

    // 保存到数据库
    const savedMaterial = await withDatabase(async (db) => {
      await db.createMaterial(material)
      return material
    })

    return NextResponse.json({
      success: true,
      data: savedMaterial
    })

  } catch (error) {
    console.error('Error creating material:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - 批量操作素材
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { operation, materialIds, params } = body

    if (!operation || !Array.isArray(materialIds) || materialIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: operation, materialIds' },
        { status: 400 }
      )
    }

    const result = await withDatabase(async (db) => {
      switch (operation) {
        case 'delete':
          // 批量删除
          for (const id of materialIds) {
            await db.deleteMaterial(id)
          }
          return { deletedCount: materialIds.length }

        case 'move':
          // 批量移动分类
          const { categoryId } = params || {}
          if (!categoryId) {
            throw new Error('Missing categoryId for move operation')
          }

          const updatedMaterials = []
          for (const id of materialIds) {
            const material = await db.getMaterial(id)
            if (material) {
              const updated = await db.updateMaterial(id, {
                category: categoryId,
                updatedAt: new Date().toISOString()
              })
              updatedMaterials.push(updated)
            }
          }
          return { updatedMaterials }

        case 'addTags':
          // 批量添加标签
          const { tags: tagsToAdd } = params || {}
          if (!Array.isArray(tagsToAdd)) {
            throw new Error('Missing or invalid tags for addTags operation')
          }

          const addTagMaterials = []
          for (const id of materialIds) {
            const material = await db.getMaterial(id)
            if (material) {
              const existingTags = new Set(material.tags)
              tagsToAdd.forEach(tag => existingTags.add(tag))
              const updated = await db.updateMaterial(id, {
                tags: Array.from(existingTags),
                updatedAt: new Date().toISOString()
              })
              addTagMaterials.push(updated)
            }
          }
          return { updatedMaterials: addTagMaterials }

        case 'removeTags':
          // 批量移除标签
          const { tags: tagsToRemove } = params || {}
          if (!Array.isArray(tagsToRemove)) {
            throw new Error('Missing or invalid tags for removeTags operation')
          }

          const removeTagMaterials = []
          for (const id of materialIds) {
            const material = await db.getMaterial(id)
            if (material) {
              const filteredTags = material.tags.filter(tag => !tagsToRemove.includes(tag))
              const updated = await db.updateMaterial(id, {
                tags: filteredTags,
                updatedAt: new Date().toISOString()
              })
              removeTagMaterials.push(updated)
            }
          }
          return { updatedMaterials: removeTagMaterials }

        default:
          throw new Error(`Unsupported operation: ${operation}`)
      }
    })

    return NextResponse.json({
      success: true,
      data: result
    })

  } catch (error) {
    console.error('Error performing batch operation:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}