/**
 * 素材管理能力
 * 统一的素材创建、保存、管理和元数据处理功能
 */

import { BaseCapability, AssetConfig, Asset, AssetContext, CapabilityResult, CapabilityConfig } from './base'
import { MediaType } from '@/types'
import { randomUUID } from 'crypto'
import { registerCapability } from './manager'

export class AssetManagementCapability extends BaseCapability {
  constructor(config: CapabilityConfig = { enabled: true }) {
    super(
      'AssetManagement',
      '1.0.0',
      '素材管理能力，提供素材创建、保存、元数据处理和库管理功能',
      config
    )
  }

  protected async onInitialize(): Promise<void> {
    console.log('✅ AssetManagement capability initialized')
  }

  /**
   * 创建单个素材
   */
  async createAsset(config: AssetConfig): Promise<CapabilityResult<Asset>> {
    this.ensureInitialized()

    try {
      console.log(`📎 创建素材: ${config.name} (${config.type})`)

      // 验证配置
      const validation = await this.validateAssetConfig(config)
      if (!validation.success) {
        return this.createResult(false, undefined, validation.error)
      }

      // 获取素材元数据
      const metadata = await this.generateAssetMetadata(config.url, {
        taskId: config.taskId,
        model: '', // 从上下文获取
        prompt: '',
        parameters: {}
      })

      // 构建素材对象
      const asset: Asset = {
        id: randomUUID(),
        name: config.name,
        type: config.type,
        url: config.url,
        thumbnailUrl: metadata.thumbnailUrl,
        size: metadata.size,
        format: metadata.format,
        width: metadata.width,
        height: metadata.height,
        duration: metadata.duration,
        taskId: config.taskId,
        tags: config.tags || [],
        category: config.category || this.inferCategory(config.name, config.type),
        metadata: {
          ...metadata,
          ...config.metadata
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      // 保存到数据库
      await this.saveAssetToDatabase(asset)

      console.log(`✅ 素材创建成功: ${asset.id}`)
      return this.createResult(true, asset)

    } catch (error) {
      console.error(`❌ 素材创建失败:`, error)
      return this.createResult(false, undefined, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  /**
   * 批量保存到素材库
   */
  async saveToLibrary(
    taskId: string,
    results: string[],
    context: AssetContext
  ): Promise<CapabilityResult<Asset[]>> {
    this.ensureInitialized()

    try {
      console.log(`📚 批量保存到素材库: ${results.length} 个结果`)

      const assets: Asset[] = []
      let successCount = 0
      let failureCount = 0

      for (let i = 0; i < results.length; i++) {
        const result = results[i]

        try {
          const assetConfig: AssetConfig = {
            type: context.parameters?.mediaType || this.detectMediaType(result),
            url: result,
            name: `${context.prompt.substring(0, 30)}${context.prompt.length > 30 ? '...' : ''} - ${i + 1}`,
            taskId: taskId,
            metadata: {
              prompt: context.prompt,
              model: context.model,
              parameters: context.parameters,
              resultIndex: i,
              generatedAt: new Date().toISOString()
            }
          }

          const assetResult = await this.createAsset(assetConfig)

          if (assetResult.success && assetResult.data) {
            assets.push(assetResult.data)
            successCount++
          } else {
            console.error(`❌ 素材 ${i + 1} 创建失败: ${assetResult.error}`)
            failureCount++
          }

        } catch (error) {
          console.error(`❌ 素材 ${i + 1} 创建异常:`, error)
          failureCount++
        }
      }

      console.log(`✅ 批量保存完成: 成功 ${successCount}, 失败 ${failureCount}`)

      return this.createResult(true, assets, undefined, {
        totalResults: results.length,
        successCount,
        failureCount,
        successRate: Math.round((successCount / results.length) * 100)
      })

    } catch (error) {
      console.error(`❌ 批量保存失败:`, error)
      return this.createResult(false, undefined, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  /**
   * 获取素材详情
   */
  async getAsset(assetId: string): Promise<CapabilityResult<Asset | null>> {
    this.ensureInitialized()

    try {
      const asset = await this.loadAssetFromDatabase(assetId)

      if (!asset) {
        return this.createResult(true, null, undefined, {
          message: 'Asset not found'
        })
      }

      return this.createResult(true, asset)

    } catch (error) {
      console.error(`❌ 获取素材失败:`, error)
      return this.createResult(false, undefined, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  /**
   * 获取素材列表
   */
  async getAssets(params: {
    type?: MediaType
    category?: string
    tags?: string[]
    taskId?: string
    search?: string
    limit?: number
    page?: number
    sortBy?: 'createdAt' | 'name' | 'size'
    sortOrder?: 'asc' | 'desc'
  } = {}): Promise<CapabilityResult<{
    assets: Asset[]
    total: number
    page: number
    pageSize: number
  }>> {
    this.ensureInitialized()

    try {
      const pageSize = Math.min(params.limit || 20, 100)
      const page = Math.max(params.page || 1, 1)

      console.log(`📋 获取素材列表: page=${page}, pageSize=${pageSize}`)

      const { assets, total } = await this.loadAssetsFromDatabase({
        ...params,
        limit: pageSize,
        offset: (page - 1) * pageSize
      })

      return this.createResult(true, {
        assets,
        total,
        page,
        pageSize
      }, undefined, {
        hasMore: (page - 1) * pageSize + assets.length < total,
        filters: Object.keys(params).filter(key => params[key as keyof typeof params] !== undefined)
      })

    } catch (error) {
      console.error(`❌ 获取素材列表失败:`, error)
      return this.createResult(false, undefined, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  /**
   * 更新媒体类型统计
   */
  async updateAssetStats(): Promise<CapabilityResult<{
    totalCount: number
    byType: Record<MediaType, number>
    byCategory: Record<string, number>
    totalSize: number
    averageSize: number
  }>> {
    this.ensureInitialized()

    try {
      console.log(`📊 更新媒体类型统计`)

      const stats = await this.loadAssetStatsFromDatabase()

      return this.createResult(true, stats)

    } catch (error) {
      console.error(`❌ 更新统计失败:`, error)
      return this.createResult(false, undefined, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  /**
   * 删除素材
   */
  async deleteAsset(assetId: string): Promise<CapabilityResult<boolean>> {
    this.ensureInitialized()

    try {
      console.log(`🗑️ 删除素材: ${assetId}`)

      const asset = await this.loadAssetFromDatabase(assetId)
      if (!asset) {
        return this.createResult(false, undefined, '素材不存在')
      }

      // 从数据库删除
      await this.deleteAssetFromDatabase(assetId)

      console.log(`✅ 素材删除成功: ${assetId}`)
      return this.createResult(true, true)

    } catch (error) {
      console.error(`❌ 删除素材失败:`, error)
      return this.createResult(false, undefined, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  /**
   * 批量删除素材
   */
  async deleteAssets(assetIds: string[]): Promise<CapabilityResult<{
    successCount: number
    failureCount: number
    errors: string[]
  }>> {
    this.ensureInitialized()

    try {
      console.log(`🗑️ 批量删除素材: ${assetIds.length} 个`)

      let successCount = 0
      let failureCount = 0
      const errors: string[] = []

      for (const assetId of assetIds) {
        try {
          const result = await this.deleteAsset(assetId)
          if (result.success) {
            successCount++
          } else {
            failureCount++
            errors.push(`${assetId}: ${result.error}`)
          }
        } catch (error) {
          failureCount++
          errors.push(`${assetId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      console.log(`✅ 批量删除完成: 成功 ${successCount}, 失败 ${failureCount}`)

      return this.createResult(true, {
        successCount,
        failureCount,
        errors
      })

    } catch (error) {
      console.error(`❌ 批量删除失败:`, error)
      return this.createResult(false, undefined, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  /**
   * 清理过期素材
   */
  async cleanupExpiredAssets(olderThanDays: number = 30): Promise<CapabilityResult<number>> {
    this.ensureInitialized()

    try {
      console.log(`🧹 清理过期素材: ${olderThanDays} 天前`)

      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

      const deletedCount = await this.deleteExpiredAssetsFromDatabase(cutoffDate.toISOString())

      console.log(`✅ 清理完成: 删除 ${deletedCount} 个过期素材`)
      return this.createResult(true, deletedCount)

    } catch (error) {
      console.error(`❌ 清理过期素材失败:`, error)
      return this.createResult(false, undefined, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  // 私有方法

  private async validateAssetConfig(config: AssetConfig): Promise<CapabilityResult<boolean>> {
    if (!config.name || config.name.trim().length === 0) {
      return this.createResult(false, undefined, '素材名称不能为空')
    }

    if (!config.url || config.url.trim().length === 0) {
      return this.createResult(false, undefined, '素材URL不能为空')
    }

    if (!config.type || !['image', 'video'].includes(config.type)) {
      return this.createResult(false, undefined, '无效的素材类型')
    }

    if (!config.taskId) {
      return this.createResult(false, undefined, '任务ID不能为空')
    }

    return this.createResult(true, true)
  }

  private async generateAssetMetadata(
    url: string,
    context: AssetContext
  ): Promise<{
    size: number
    format: string
    width?: number
    height?: number
    duration?: number
    thumbnailUrl?: string
  }> {
    try {
      // 检测媒体类型
      const extension = url.split('.').pop()?.toLowerCase() || ''
      const isVideo = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'].includes(extension)

      // 模拟获取文件信息
      const size = Math.floor(Math.random() * 10000000) + 100000 // 100KB - 10MB

      if (isVideo) {
        return {
          size,
          format: extension,
          width: 1920,
          height: 1080,
          duration: Math.floor(Math.random() * 60) + 10, // 10-70秒
          thumbnailUrl: url.replace(/\.[^.]+$/, '_thumb.jpg')
        }
      } else {
        return {
          size,
          format: extension,
          width: 1024,
          height: 1024
        }
      }
    } catch (error) {
      // 默认值
      return {
        size: 1000000,
        format: 'jpg',
        width: 1024,
        height: 1024
      }
    }
  }

  private inferCategory(name: string, type: MediaType): string {
    const nameLower = name.toLowerCase()

    if (type === 'video') {
      if (nameLower.includes('人物') || nameLower.includes('人')) return '人物视频'
      if (nameLower.includes('风景') || nameLower.includes('景色')) return '风景视频'
      if (nameLower.includes('动画') || nameLower.includes('anime')) return '动画视频'
      return '其他视频'
    } else {
      if (nameLower.includes('人物') || nameLower.includes('人')) return '人物图片'
      if (nameLower.includes('风景') || nameLower.includes('景色')) return '风景图片'
      if (nameLower.includes('动物')) return '动物图片'
      if (nameLower.includes('建筑')) return '建筑图片'
      return '其他图片'
    }
  }

  private detectMediaType(url: string): MediaType {
    const extension = url.split('.').pop()?.toLowerCase() || ''
    const videoExtensions = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm']
    return videoExtensions.includes(extension) ? 'video' : 'image'
  }

  // 数据库操作方法

  private async saveAssetToDatabase(asset: Asset): Promise<void> {
    const { withDatabase } = await import('@/lib/database')
    await withDatabase(async (db) => {
      await db.createMaterial({
        id: asset.id,
        name: asset.name,
        type: asset.type,
        url: asset.url,
        thumbnailUrl: asset.thumbnailUrl,
        size: asset.size,
        format: asset.format,
        width: asset.width,
        height: asset.height,
        duration: asset.duration,
        taskId: asset.taskId,
        tags: JSON.stringify(asset.tags),
        category: asset.category,
        metadata: JSON.stringify(asset.metadata),
        createdAt: asset.createdAt,
        updatedAt: asset.updatedAt
      })
    })
  }

  private async loadAssetFromDatabase(assetId: string): Promise<Asset | null> {
    const { withDatabase } = await import('@/lib/database')
    return await withDatabase(async (db) => {
      const material = await db.getMaterial(assetId)
      if (!material) return null

      return {
        id: material.id,
        name: material.name,
        type: material.type,
        url: material.url,
        thumbnailUrl: material.thumbnailUrl,
        size: material.size,
        format: material.format,
        width: material.width,
        height: material.height,
        duration: material.duration,
        taskId: material.taskId,
        tags: JSON.parse(material.tags || '[]'),
        category: material.category,
        metadata: JSON.parse(material.metadata || '{}'),
        createdAt: material.createdAt,
        updatedAt: material.updatedAt
      }
    })
  }

  private async loadAssetsFromDatabase(params: {
    type?: MediaType
    category?: string
    tags?: string[]
    taskId?: string
    search?: string
    limit: number
    offset: number
    sortBy?: string
    sortOrder?: string
  }): Promise<{ assets: Asset[]; total: number }> {
    const { withDatabase } = await import('@/lib/database')
    return await withDatabase(async (db) => {
      // 这里需要实现具体的查询逻辑
      // 目前返回模拟数据
      const mockAssets: Asset[] = []
      for (let i = 0; i < Math.min(params.limit, 10); i++) {
        mockAssets.push({
          id: `asset-${i}`,
          name: `示例素材 ${i}`,
          type: 'image',
          url: `https://example.com/image-${i}.jpg`,
          size: 1000000,
          format: 'jpg',
          width: 1024,
          height: 1024,
          taskId: 'task-mock',
          tags: ['示例'],
          category: '其他图片',
          metadata: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      }

      return {
        assets: mockAssets,
        total: 100
      }
    })
  }

  private async loadAssetStatsFromDatabase(): Promise<{
    totalCount: number
    byType: Record<MediaType, number>
    byCategory: Record<string, number>
    totalSize: number
    averageSize: number
  }> {
    const { withDatabase } = await import('@/lib/database')
    return await withDatabase(async (db) => {
      // 这里需要实现具体的统计查询逻辑
      return {
        totalCount: 500,
        byType: {
          image: 400,
          video: 100
        },
        byCategory: {
          '人物图片': 150,
          '风景图片': 100,
          '其他图片': 150,
          '人物视频': 30,
          '风景视频': 40,
          '其他视频': 30
        },
        totalSize: 5000000000, // 5GB
        averageSize: 10000000 // 10MB
      }
    })
  }

  private async deleteAssetFromDatabase(assetId: string): Promise<void> {
    const { withDatabase } = await import('@/lib/database')
    await withDatabase(async (db) => {
      await db.deleteMaterial(assetId)
    })
  }

  private async deleteExpiredAssetsFromDatabase(cutoffDate: string): Promise<number> {
    const { withDatabase } = await import('@/lib/database')
    return await withDatabase(async (db) => {
      // 这里需要实现删除过期素材的具体逻辑
      console.log(`删除 ${cutoffDate} 之前的素材`)
      return 10 // 模拟返回删除的数量
    })
  }

  /**
   * 关闭能力
   */
  async shutdown(): Promise<void> {
    console.log('🔄 Shutting down AssetManagement capability...')
    // 清理资源
    this._initialized = false
    console.log('✅ AssetManagement capability shutdown complete')
  }
}

// 注册能力
registerCapability('AssetManagement', AssetManagementCapability)