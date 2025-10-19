// 任务类型
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

export type MediaType = 'image' | 'video'

export interface Task {
  id: string
  type: MediaType
  prompt: string
  status: TaskStatus
  progress: number
  results: string[] // 结果文件URLs
  error?: string
  createdAt: string
  updatedAt: string
  cost: number
  model: string
  parameters: Record<string, any>
}

// Prompt 模板类型
export interface Variable {
  name: string
  type: 'text' | 'select' | 'number'
  defaultValue?: string | number
  options?: string[] // for select type
  required?: boolean
  description?: string
}

export interface PromptTemplate {
  id: string
  name: string
  description: string
  template: string
  variables: Variable[]
  mediaType: MediaType
  model: string
  usageCount: number
  totalCost: number
  cacheHitRate: number
  createdAt: string
  updatedAt: string
}

// AI 模型类型
export interface AIModel {
  id: string
  name: string
  type: MediaType
  provider: string
  version: string
  costPerGeneration: number
  maxPromptLength: number
  supportedParameters: string[]
  isAvailable: boolean
}

// 分析数据类型
export interface Analytics {
  totalCost: number
  totalGenerations: number
  cacheHitRate: number
  modelDistribution: Record<string, number>
  dailyStats: Array<{
    date: string
    cost: number
    generations: number
  }>
  monthlyStats: Array<{
    month: string
    cost: number
    generations: number
  }>
}

// 用户设置类型
export interface UserSettings {
  preferredModel: string
  defaultParameters: Record<string, any>
  autoSave: boolean
  notifications: boolean
  theme: 'light' | 'dark' | 'system'
}

// API 响应类型
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  hasNext: boolean
  hasPrev: boolean
}

// 素材相关类型（从 lib/materials.ts 导入）
export interface Material {
  id: string
  name: string
  type: MediaType
  url: string
  thumbnailUrl?: string
  size: number
  format: string
  width?: number
  height?: number
  duration?: number
  prompt?: string
  model?: string
  tags: string[]
  category?: string
  description?: string
  metadata: Record<string, any>
  createdAt: string
  updatedAt: string
  taskId?: string
}

export interface MaterialCategory {
  id: string
  name: string
  description?: string
  parentId?: string
  level: number
  children?: MaterialCategory[]
  materialCount: number
}

export interface MaterialCollection {
  id: string
  name: string
  description?: string
  materialIds: string[]
  isPublic: boolean
  createdAt: string
  updatedAt: string
}