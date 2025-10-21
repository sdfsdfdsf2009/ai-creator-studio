import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
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

      return await db.getMaterials(params)
    })

    // 获取所有标签
    const allTags = new Set<string>()
    result.items.forEach((material: any) => {
      material.tags?.forEach((tag: string) => allTags.add(tag))
    })

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
        tags: Array.from(allTags)
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
    const materialId = uuidv4()
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

    // 保存素材
    materials.set(materialId, material)

    // 更新分类计数
    const categoryObj = categories.get(category)
    if (categoryObj) {
      categoryObj.materialCount++
    }

    return NextResponse.json({
      success: true,
      data: material
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

    const updatedMaterials: Material[] = []

    switch (operation) {
      case 'delete':
        materialIds.forEach(id => {
          const material = materials.get(id)
          if (material) {
            // 更新分类计数
            const categoryObj = categories.get(material.category || 'default')
            if (categoryObj) {
              categoryObj.materialCount = Math.max(0, categoryObj.materialCount - 1)
            }
            materials.delete(id)
          }
        })
        break

      case 'move':
        const { categoryId } = params || {}
        if (!categoryId) {
          return NextResponse.json(
            { success: false, error: 'Missing categoryId for move operation' },
            { status: 400 }
          )
        }

        materialIds.forEach(id => {
          const material = materials.get(id)
          if (material) {
            // 更新旧分类计数
            const oldCategory = categories.get(material.category || 'default')
            if (oldCategory) {
              oldCategory.materialCount = Math.max(0, oldCategory.materialCount - 1)
            }

            // 更新素材分类
            material.category = categoryId
            material.updatedAt = new Date().toISOString()

            // 更新新分类计数
            const newCategory = categories.get(categoryId)
            if (newCategory) {
              newCategory.materialCount++
            }

            updatedMaterials.push(material)
          }
        })
        break

      case 'addTags':
        const { tags: tagsToAdd } = params || {}
        if (!Array.isArray(tagsToAdd)) {
          return NextResponse.json(
            { success: false, error: 'Missing or invalid tags for addTags operation' },
            { status: 400 }
          )
        }

        materialIds.forEach(id => {
          const material = materials.get(id)
          if (material) {
            const existingTags = new Set(material.tags)
            tagsToAdd.forEach(tag => existingTags.add(tag))
            material.tags = Array.from(existingTags)
            material.updatedAt = new Date().toISOString()
            updatedMaterials.push(material)
          }
        })
        break

      case 'removeTags':
        const { tags: tagsToRemove } = params || {}
        if (!Array.isArray(tagsToRemove)) {
          return NextResponse.json(
            { success: false, error: 'Missing or invalid tags for removeTags operation' },
            { status: 400 }
          )
        }

        materialIds.forEach(id => {
          const material = materials.get(id)
          if (material) {
            material.tags = material.tags.filter(tag => !tagsToRemove.includes(tag))
            material.updatedAt = new Date().toISOString()
            updatedMaterials.push(material)
          }
        })
        break

      default:
        return NextResponse.json(
          { success: false, error: `Unsupported operation: ${operation}` },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      data: operation === 'delete'
        ? { deletedCount: materialIds.length }
        : { updatedMaterials }
    })

  } catch (error) {
    console.error('Error performing batch operation:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}