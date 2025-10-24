// EvoLink.AI模型管理器 - 前端工具类

export interface EvoLinkTemplate {
  id?: string
  modelId: string
  modelName: string
  mediaType: 'text' | 'image' | 'video'
  costPerRequest?: number
  description?: string
  enabled?: boolean
  is_builtin?: boolean
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
  createdAt?: string
  updatedAt?: string
}

export interface TestResult {
  modelId: string
  mediaType: string
  modelType: 'template' | 'user-model'
  testEndpoint: string
  responseTime: number
  status: number
  statusText: string
  success: boolean
  message: string
  errorType?: string
  timestamp: string
  responseData?: any
  errorData?: any
}

export interface ProxyAccount {
  id: string
  name: string
  provider: string
  enabled: boolean
}

class EvoLinkModelManager {
  private static instance: EvoLinkModelManager
  private cache: {
    templates: EvoLinkTemplate[]
    userModels: UserEvoLinkModel[]
    lastUpdate: number
  } = {
    templates: [],
    userModels: [],
    lastUpdate: 0
  }

  static getInstance(): EvoLinkModelManager {
    if (!EvoLinkModelManager.instance) {
      EvoLinkModelManager.instance = new EvoLinkModelManager()
    }
    return EvoLinkModelManager.instance
  }

  // 缓存时间：5分钟
  private get CACHE_DURATION() {
    return 5 * 60 * 1000
  }

  private isCacheValid(): boolean {
    return Date.now() - this.cache.lastUpdate < this.CACHE_DURATION
  }

  // 获取所有模型数据
  async getModels(refresh = false): Promise<{ templates: EvoLinkTemplate[], userModels: UserEvoLinkModel[] }> {
    if (!refresh && this.isCacheValid()) {
      return {
        templates: [...this.cache.templates],
        userModels: [...this.cache.userModels]
      }
    }

    try {
      const response = await fetch('/api/evolink-models')
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || '获取模型数据失败')
      }

      this.cache = {
        templates: data.data.templates || [],
        userModels: data.data.userModels || [],
        lastUpdate: Date.now()
      }

      return {
        templates: [...this.cache.templates],
        userModels: [...this.cache.userModels]
      }
    } catch (error) {
      console.error('Failed to fetch EvoLink models:', error)
      throw error
    }
  }

  // 获取模板
  async getTemplates(refresh = false): Promise<EvoLinkTemplate[]> {
    const { templates } = await this.getModels(refresh)
    return templates
  }

  // 获取用户模型
  async getUserModels(refresh = false): Promise<UserEvoLinkModel[]> {
    const { userModels } = await this.getModels(refresh)
    return userModels
  }

  // 根据媒体类型获取模型
  async getModelsByMediaType(mediaType: 'text' | 'image' | 'video', refresh = false): Promise<{
    templates: EvoLinkTemplate[]
    userModels: UserEvoLinkModel[]
  }> {
    const { templates, userModels } = await this.getModels(refresh)

    return {
      templates: templates.filter(t => t.mediaType === mediaType),
      userModels: userModels.filter(m => m.mediaType === mediaType)
    }
  }

  // 创建模板
  async createTemplate(template: Omit<EvoLinkTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<EvoLinkTemplate> {
    try {
      const response = await fetch('/api/evolink-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'template',
          data: template
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || '创建模板失败')
      }

      // 清除缓存
      this.cache.lastUpdate = 0
      return data.data
    } catch (error) {
      console.error('Failed to create template:', error)
      throw error
    }
  }

  // 创建用户模型
  async createUserModel(model: Omit<UserEvoLinkModel, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserEvoLinkModel> {
    try {
      const response = await fetch('/api/evolink-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'user-model',
          data: model
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || '创建用户模型失败')
      }

      // 清除缓存
      this.cache.lastUpdate = 0
      return data.data
    } catch (error) {
      console.error('Failed to create user model:', error)
      throw error
    }
  }

  // 更新模板
  async updateTemplate(id: string, updates: Partial<EvoLinkTemplate>): Promise<EvoLinkTemplate> {
    try {
      const response = await fetch(`/api/evolink-models/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'template',
          data: updates
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || '更新模板失败')
      }

      // 清除缓存
      this.cache.lastUpdate = 0
      return data.data
    } catch (error) {
      console.error('Failed to update template:', error)
      throw error
    }
  }

  // 更新用户模型
  async updateUserModel(id: string, updates: Partial<UserEvoLinkModel>): Promise<UserEvoLinkModel> {
    try {
      const response = await fetch(`/api/evolink-models/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'user-model',
          data: updates
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || '更新用户模型失败')
      }

      // 清除缓存
      this.cache.lastUpdate = 0
      return data.data
    } catch (error) {
      console.error('Failed to update user model:', error)
      throw error
    }
  }

  // 删除模板
  async deleteTemplate(id: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/evolink-models/${id}?type=template`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || '删除模板失败')
      }

      // 清除缓存
      this.cache.lastUpdate = 0
      return data.data.deleted
    } catch (error) {
      console.error('Failed to delete template:', error)
      throw error
    }
  }

  // 删除用户模型
  async deleteUserModel(id: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/evolink-models/${id}?type=user-model`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || '删除用户模型失败')
      }

      // 清除缓存
      this.cache.lastUpdate = 0
      return data.data.deleted
    } catch (error) {
      console.error('Failed to delete user model:', error)
      throw error
    }
  }

  // 测试模型
  async testModel(
    modelId: string,
    modelType: 'template' | 'user-model',
    mediaType: 'text' | 'image' | 'video',
    proxyAccountId?: string
  ): Promise<TestResult> {
    try {
      const response = await fetch('/api/evolink-models/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelId,
          modelType,
          mediaType,
          proxyAccountId
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || '测试模型失败')
      }

      // 清除缓存
      this.cache.lastUpdate = 0
      return data.data
    } catch (error) {
      console.error('Failed to test model:', error)
      throw error
    }
  }

  // 批量导入
  async importData(
    data: { templates?: any[], userModels?: any[] },
    overwrite = false
  ): Promise<{
    templates: { imported: number, skipped: number, errors: string[] }
    userModels: { imported: number, skipped: number, errors: string[] }
  }> {
    try {
      const response = await fetch('/api/evolink-models/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          overwrite
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || '导入数据失败')
      }

      // 清除缓存
      this.cache.lastUpdate = 0
      return result.data
    } catch (error) {
      console.error('Failed to import data:', error)
      throw error
    }
  }

  // 导出数据
  async exportData(options: {
    includeBuiltIn?: boolean
    includeTestResults?: boolean
  } = {}): Promise<Blob> {
    try {
      const params = new URLSearchParams()
      if (options.includeBuiltIn) params.append('includeBuiltIn', 'true')
      if (options.includeTestResults) params.append('includeTestResults', 'true')

      const response = await fetch(`/api/evolink-models/batch?${params}`)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return await response.blob()
    } catch (error) {
      console.error('Failed to export data:', error)
      throw error
    }
  }

  // 检查初始化状态
  async checkInitializationStatus(): Promise<boolean> {
    try {
      const response = await fetch('/api/evolink-models/init')
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      return data.success && data.data?.initialized
    } catch (error) {
      console.error('Failed to check initialization status:', error)
      return false
    }
  }

  // 初始化数据
  async initializeData(force = false): Promise<void> {
    try {
      const response = await fetch('/api/evolink-models/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || '初始化数据失败')
      }

      // 清除缓存
      this.cache.lastUpdate = 0
    } catch (error) {
      console.error('Failed to initialize data:', error)
      throw error
    }
  }

  // 工具方法：根据模型ID获取媒体类型
  static getMediaTypeFromModelId(modelId: string): 'text' | 'image' | 'video' {
    if (modelId.includes('image') || modelId.includes('dall-e') ||
        modelId.includes('midjourney') || modelId.includes('stable-diffusion') ||
        modelId.includes('flux')) {
      return 'image'
    } else if (modelId.includes('video') || modelId.includes('sora') ||
               modelId.includes('runway') || modelId.includes('pika') ||
               modelId.includes('veo')) {
      return 'video'
    } else {
      return 'text'
    }
  }

  // 工具方法：获取媒体类型的显示名称
  static getMediaTypeName(mediaType: string): string {
    switch (mediaType) {
      case 'text': return '文本生成'
      case 'image': return '图片生成'
      case 'video': return '视频生成'
      default: return '未知类型'
    }
  }

  // 工具方法：获取媒体类型的颜色类
  static getMediaTypeColorClass(mediaType: string): string {
    switch (mediaType) {
      case 'text': return 'bg-blue-100 text-blue-800'
      case 'image': return 'bg-green-100 text-green-800'
      case 'video': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // 工具方法：格式化成本
  static formatCost(cost?: number): string {
    if (cost === undefined || cost === null) return '未知'
    return `$${cost.toFixed(3)}`
  }

  // 工具方法：格式化响应时间
  static formatResponseTime(ms: number): string {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  // 工具方法：获取测试状态的图标
  static getTestStatusIcon(tested?: boolean, testResult?: TestResult): string {
    if (!tested) return 'clock'
    if (testResult?.success) return 'check-circle'
    return 'x-circle'
  }
}

export const evolinkModelManager = EvoLinkModelManager.getInstance()
export default evolinkModelManager