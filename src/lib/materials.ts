import { MediaType } from '@/types'

// 素材类型
export interface Material {
  id: string
  name: string
  type: MediaType
  url: string
  thumbnailUrl?: string
  size: number // 文件大小（字节）
  format: string // 文件格式，如 jpg, png, mp4
  width?: number
  height?: number
  duration?: number // 视频时长（秒）
  prompt?: string // 生成时的提示词
  model?: string // 使用的模型
  tags: string[]
  category?: string
  description?: string
  metadata: Record<string, any>
  createdAt: string
  updatedAt: string
  taskId?: string // 关联的任务ID
}

// 素材分类
export interface MaterialCategory {
  id: string
  name: string
  description?: string
  parentId?: string
  level: number
  children?: MaterialCategory[]
  materialCount: number
}

// 素材集合
export interface MaterialCollection {
  id: string
  name: string
  description?: string
  materialIds: string[]
  isPublic: boolean
  createdAt: string
  updatedAt: string
}

// 搜索过滤器
export interface MaterialFilter {
  type?: MediaType
  category?: string
  tags?: string[]
  dateRange?: {
    start: string
    end: string
  }
  sizeRange?: {
    min: number
    max: number
  }
  format?: string[]
  model?: string[]
  search?: string
}

// 排序选项
export interface MaterialSort {
  field: 'createdAt' | 'updatedAt' | 'name' | 'size' | 'duration'
  order: 'asc' | 'desc'
}

// 分页参数
export interface MaterialPagination {
  page: number
  pageSize: number
}

// 素材搜索结果
export interface MaterialSearchResult {
  materials: Material[]
  total: number
  page: number
  pageSize: number
  hasNext: boolean
  hasPrev: boolean
  categories: MaterialCategory[]
  tags: string[]
}

// 批量操作类型
export type BatchOperation = 'delete' | 'move' | 'addTags' | 'removeTags' | 'addToCollection'

// 批量操作参数
export interface BatchOperationParams {
  operation: BatchOperation
  materialIds: string[]
  params?: {
    categoryId?: string
    tags?: string[]
    collectionId?: string
  }
}