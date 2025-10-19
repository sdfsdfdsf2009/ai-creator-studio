// 数据分析和统计系统
export interface AnalyticsData {
  // 成本统计
  costs: {
    total: number
    today: number
    thisWeek: number
    thisMonth: number
    thisYear: number
    byProvider: Record<string, number>
    byModel: Record<string, number>
    byType: {
      image: number
      video: number
    }
    averageCostPerGeneration: number
    trend: CostTrend[]
  }

  // 使用统计
  usage: {
    totalGenerations: number
    successfulGenerations: number
    failedGenerations: number
    successRate: number
    averageGenerationTime: number // 秒
    byProvider: Record<string, number>
    byModel: Record<string, number>
    byType: {
      image: number
      video: number
    }
    dailyUsage: DailyUsage[]
    hourlyUsage: HourlyUsage[]
  }

  // 性能指标
  performance: {
    averageResponseTime: number // 毫秒
    p95ResponseTime: number
    p99ResponseTime: number
    uptime: number // 百分比
    errorRate: number // 百分比
    cacheHitRate: number // 百分比
    byProvider: Record<string, PerformanceMetrics>
  }

  // 内容统计
  content: {
    totalImages: number
    totalVideos: number
    totalSize: number // 字节
    averageImageSize: number
    averageVideoSize: number
    storageUsed: number
    mostUsedPrompts: PromptStats[]
    topTags: TagStats[]
  }

  // 用户活动
  activity: {
    activeUsers: number
    newUsers: number
    returningUsers: number
    averageSessionsPerDay: number
    averageSessionDuration: number // 分钟
    peakHours: number[]
    userRetention: UserRetention[]
  }
}

export interface CostTrend {
  date: string
  amount: number
  generations: number
  averageCost: number
}

export interface DailyUsage {
  date: string
  generations: number
  successful: number
  failed: number
  cost: number
  averageTime: number
}

export interface HourlyUsage {
  hour: number
  generations: number
  successful: number
  failed: number
}

export interface PerformanceMetrics {
  averageResponseTime: number
  p95ResponseTime: number
  p99ResponseTime: number
  uptime: number
  errorRate: number
  cacheHitRate: number
}

export interface PromptStats {
  prompt: string
  usageCount: number
  successRate: number
  averageCost: number
  averageTime: number
}

export interface TagStats {
  tag: string
  usageCount: number
  averageCost: number
  successRate: number
}

export interface UserRetention {
  period: string
  newUsers: number
  retainedUsers: number
  retentionRate: number
}

export interface AnalyticsFilter {
  dateRange: {
    start: string
    end: string
  }
  providers?: string[]
  models?: string[]
  types?: ('image' | 'video')[]
  users?: string[]
}

export interface AnalyticsReport {
  id: string
  name: string
  description: string
  type: 'cost' | 'usage' | 'performance' | 'content' | 'custom'
  filters: AnalyticsFilter
  data: any
  generatedAt: string
  format: 'json' | 'csv' | 'pdf' | 'excel'
}

class AnalyticsService {
  private cache: Map<string, { data: any; timestamp: number }> = new Map()
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5分钟缓存

  // 获取完整分析数据
  async getAnalytics(filter?: Partial<AnalyticsFilter>): Promise<AnalyticsData> {
    const cacheKey = JSON.stringify(filter || {})
    const cached = this.cache.get(cacheKey)

    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data
    }

    try {
      // 在实际实现中，这些数据应该从数据库查询
      const data = await this.generateMockAnalytics(filter)

      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      })

      return data
    } catch (error) {
      console.error('Error fetching analytics:', error)
      throw new Error('获取分析数据失败')
    }
  }

  // 获取成本统计
  async getCostStats(filter?: Partial<AnalyticsFilter>) {
    const analytics = await this.getAnalytics(filter)
    return analytics.costs
  }

  // 获取使用统计
  async getUsageStats(filter?: Partial<AnalyticsFilter>) {
    const analytics = await this.getAnalytics(filter)
    return analytics.usage
  }

  // 获取性能指标
  async getPerformanceStats(filter?: Partial<AnalyticsFilter>) {
    const analytics = await this.getAnalytics(filter)
    return analytics.performance
  }

  // 生成报告
  async generateReport(
    name: string,
    description: string,
    type: AnalyticsReport['type'],
    filters: AnalyticsFilter,
    format: AnalyticsReport['format'] = 'json'
  ): Promise<AnalyticsReport> {
    try {
      const data = await this.getAnalytics(filters)

      const report: AnalyticsReport = {
        id: `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name,
        description,
        type,
        filters,
        data: this.extractReportData(data, type),
        generatedAt: new Date().toISOString(),
        format
      }

      return report
    } catch (error) {
      console.error('Error generating report:', error)
      throw new Error('生成报告失败')
    }
  }

  // 导出数据
  async exportData(
    data: any,
    format: 'json' | 'csv' | 'excel' = 'json'
  ): Promise<Blob> {
    switch (format) {
      case 'json':
        return new Blob([JSON.stringify(data, null, 2)], {
          type: 'application/json'
        })
      case 'csv':
        return this.convertToCSV(data)
      case 'excel':
        // 这里可以使用第三方库如 xlsx
        return new Blob([JSON.stringify(data, null, 2)], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        })
      default:
        throw new Error(`Unsupported format: ${format}`)
    }
  }

  // 生成模拟分析数据（用于演示）
  private async generateMockAnalytics(filter?: Partial<AnalyticsFilter>): Promise<AnalyticsData> {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // 生成成本趋势数据
    const costTrend: CostTrend[] = []
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      costTrend.push({
        date: date.toISOString().split('T')[0],
        amount: Math.random() * 50 + 10,
        generations: Math.floor(Math.random() * 20) + 5,
        averageCost: Math.random() * 2 + 0.5
      })
    }

    // 生成每日使用数据
    const dailyUsage: DailyUsage[] = []
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const generations = Math.floor(Math.random() * 30) + 10
      const successful = Math.floor(generations * (0.8 + Math.random() * 0.15))
      dailyUsage.push({
        date: date.toISOString().split('T')[0],
        generations,
        successful,
        failed: generations - successful,
        cost: Math.random() * 60 + 15,
        averageTime: Math.random() * 30 + 10
      })
    }

    // 生成每小时使用数据
    const hourlyUsage: HourlyUsage[] = []
    for (let hour = 0; hour < 24; hour++) {
      const generations = Math.floor(Math.random() * 10) + 1
      const successful = Math.floor(generations * (0.8 + Math.random() * 0.15))
      hourlyUsage.push({
        hour,
        generations,
        successful,
        failed: generations - successful
      })
    }

    return {
      costs: {
        total: 1250.75,
        today: 35.20,
        thisWeek: 245.80,
        thisMonth: 890.45,
        thisYear: 1250.75,
        byProvider: {
          'OpenAI': 625.38,
          'Stability AI': 312.19,
          'Runway': 187.54,
          'Midjourney': 125.64
        },
        byModel: {
          'dall-e-3': 312.69,
          'gpt-4-vision': 156.34,
          'stable-diffusion-xl': 187.53,
          'runway-gen3': 125.19,
          'midjourney-v6': 468.99
        },
        byType: {
          image: 875.53,
          video: 375.22
        },
        averageCostPerGeneration: 1.25,
        trend: costTrend
      },
      usage: {
        totalGenerations: 1000,
        successfulGenerations: 920,
        failedGenerations: 80,
        successRate: 92.0,
        averageGenerationTime: 18.5,
        byProvider: {
          'OpenAI': 500,
          'Stability AI': 250,
          'Runway': 150,
          'Midjourney': 100
        },
        byModel: {
          'dall-e-3': 250,
          'gpt-4-vision': 125,
          'stable-diffusion-xl': 150,
          'runway-gen3': 100,
          'midjourney-v6': 375
        },
        byType: {
          image: 700,
          video: 300
        },
        dailyUsage,
        hourlyUsage
      },
      performance: {
        averageResponseTime: 18500,
        p95ResponseTime: 35000,
        p99ResponseTime: 65000,
        uptime: 99.5,
        errorRate: 8.0,
        cacheHitRate: 25.3,
        byProvider: {
          'OpenAI': {
            averageResponseTime: 15000,
            p95ResponseTime: 28000,
            p99ResponseTime: 45000,
            uptime: 99.8,
            errorRate: 5.2,
            cacheHitRate: 30.1
          },
          'Stability AI': {
            averageResponseTime: 22000,
            p95ResponseTime: 40000,
            p99ResponseTime: 70000,
            uptime: 98.9,
            errorRate: 12.3,
            cacheHitRate: 18.5
          }
        }
      },
      content: {
        totalImages: 700,
        totalVideos: 300,
        totalSize: 5242880000, // ~5GB
        averageImageSize: 2097152, // ~2MB
        averageVideoSize: 10485760, // ~10MB
        storageUsed: 5242880000,
        mostUsedPrompts: [
          {
            prompt: '专业的商务肖像照片',
            usageCount: 45,
            successRate: 95.6,
            averageCost: 1.8,
            averageTime: 15.2
          },
          {
            prompt: '电影级视频场景',
            usageCount: 32,
            successRate: 87.5,
            averageCost: 3.2,
            averageTime: 28.5
          }
        ],
        topTags: [
          {
            tag: '商务',
            usageCount: 120,
            averageCost: 1.5,
            successRate: 94.2
          },
          {
            tag: '电影级',
            usageCount: 85,
            averageCost: 2.8,
            successRate: 89.4
          }
        ]
      },
      activity: {
        activeUsers: 150,
        newUsers: 25,
        returningUsers: 125,
        averageSessionsPerDay: 45,
        averageSessionDuration: 12.5,
        peakHours: [9, 10, 14, 15, 16, 20, 21],
        userRetention: [
          {
            period: 'Day 1',
            newUsers: 25,
            retainedUsers: 20,
            retentionRate: 80.0
          },
          {
            period: 'Day 7',
            newUsers: 25,
            retainedUsers: 15,
            retentionRate: 60.0
          },
          {
            period: 'Day 30',
            newUsers: 25,
            retainedUsers: 10,
            retentionRate: 40.0
          }
        ]
      }
    }
  }

  // 从分析数据中提取特定类型的报告数据
  private extractReportData(data: AnalyticsData, type: AnalyticsReport['type']) {
    switch (type) {
      case 'cost':
        return data.costs
      case 'usage':
        return data.usage
      case 'performance':
        return data.performance
      case 'content':
        return data.content
      case 'custom':
        return data
      default:
        return data
    }
  }

  // 转换数据为CSV格式
  private convertToCSV(data: any): Blob {
    // 简单的CSV转换实现
    const flatten = (obj: any, prefix = ''): Record<string, any> => {
      const result: Record<string, any> = {}

      for (const key in obj) {
        const value = obj[key]
        const newKey = prefix ? `${prefix}_${key}` : key

        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          Object.assign(result, flatten(value, newKey))
        } else {
          result[newKey] = value
        }
      }

      return result
    }

    const flattened = flatten(data)
    const headers = Object.keys(flattened)
    const values = Object.values(flattened)

    const csvContent = [
      headers.join(','),
      values.map(v => `"${v}"`).join(',')
    ].join('\n')

    return new Blob([csvContent], { type: 'text/csv' })
  }

  // 清理缓存
  clearCache() {
    this.cache.clear()
  }

  // 获取缓存统计
  getCacheStats() {
    return {
      size: this.cache.size,
      ttl: this.CACHE_TTL
    }
  }
}

// 创建全局分析服务实例
export const analyticsService = new AnalyticsService()

// 导出工具函数
export const analyticsUtils = {
  // 格式化数字
  formatNumber: (num: number, decimals = 2): string => {
    return new Intl.NumberFormat('zh-CN', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(num)
  },

  // 格式化货币
  formatCurrency: (amount: number, currency = 'USD'): string => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  },

  // 格式化百分比
  formatPercentage: (value: number, decimals = 1): string => {
    return `${value.toFixed(decimals)}%`
  },

  // 格式化文件大小
  formatFileSize: (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
  },

  // 格式化时间
  formatDuration: (milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000)
    if (seconds < 60) return `${seconds}秒`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}分${seconds % 60}秒`
    const hours = Math.floor(minutes / 60)
    return `${hours}小时${minutes % 60}分`
  },

  // 计算增长率
  calculateGrowthRate: (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0
    return ((current - previous) / previous) * 100
  },

  // 获取趋势方向
  getTrendDirection: (value: number): 'up' | 'down' | 'stable' => {
    if (value > 5) return 'up'
    if (value < -5) return 'down'
    return 'stable'
  },

  // 获取趋势颜色
  getTrendColor: (direction: 'up' | 'down' | 'stable', inverse = false): string => {
    const colors = {
      up: inverse ? 'text-red-600' : 'text-green-600',
      down: inverse ? 'text-green-600' : 'text-red-600',
      stable: 'text-gray-600'
    }
    return colors[direction]
  },

  // 获取性能等级
  getPerformanceGrade: (score: number): 'A' | 'B' | 'C' | 'D' | 'F' => {
    if (score >= 95) return 'A'
    if (score >= 85) return 'B'
    if (score >= 70) return 'C'
    if (score >= 60) return 'D'
    return 'F'
  },

  // 获取性能等级颜色
  getPerformanceGradeColor: (grade: string): string => {
    const colors = {
      'A': 'text-green-600',
      'B': 'text-blue-600',
      'C': 'text-yellow-600',
      'D': 'text-orange-600',
      'F': 'text-red-600'
    }
    return colors[grade as keyof typeof colors] || 'text-gray-600'
  }
}

export default AnalyticsService