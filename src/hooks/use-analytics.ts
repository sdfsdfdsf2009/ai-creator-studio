import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { analyticsService, AnalyticsData, AnalyticsFilter, AnalyticsReport } from '@/lib/analytics'

// 分析数据 Hook
export function useAnalytics(filter?: Partial<AnalyticsFilter>, options: {
  enabled?: boolean
  refetchInterval?: number
} = {}) {
  return useQuery({
    queryKey: ['analytics', filter],
    queryFn: () => analyticsService.getAnalytics(filter),
    enabled: options.enabled !== false,
    refetchInterval: options.refetchInterval || 5 * 60 * 1000, // 5分钟
    staleTime: 4 * 60 * 1000, // 4分钟
  })
}

// 成本统计 Hook
export function useCostStats(filter?: Partial<AnalyticsFilter>) {
  return useQuery({
    queryKey: ['analytics', 'costs', filter],
    queryFn: () => analyticsService.getCostStats(filter),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 4 * 60 * 1000,
  })
}

// 使用统计 Hook
export function useUsageStats(filter?: Partial<AnalyticsFilter>) {
  return useQuery({
    queryKey: ['analytics', 'usage', filter],
    queryFn: () => analyticsService.getUsageStats(filter),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 4 * 60 * 1000,
  })
}

// 性能统计 Hook
export function usePerformanceStats(filter?: Partial<AnalyticsFilter>) {
  return useQuery({
    queryKey: ['analytics', 'performance', filter],
    queryFn: () => analyticsService.getPerformanceStats(filter),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 4 * 60 * 1000,
  })
}

// 生成报告 Hook
export function useGenerateReport() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      name: string
      description: string
      type: AnalyticsReport['type']
      filters: AnalyticsFilter
      format?: AnalyticsReport['format']
    }) => {
      return analyticsService.generateReport(
        params.name,
        params.description,
        params.type,
        params.filters,
        params.format
      )
    },
    onSuccess: () => {
      // 可以在这里刷新报告列表
      queryClient.invalidateQueries({ queryKey: ['analytics-reports'] })
    },
  })
}

// 导出数据 Hook
export function useExportData() {
  return useMutation({
    mutationFn: async (params: {
      data: any
      format: 'json' | 'csv' | 'excel'
      filename?: string
    }) => {
      const blob = await analyticsService.exportData(params.data, params.format)

      // 创建下载链接
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = params.filename || `analytics-report-${Date.now()}.${params.format}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      return { success: true }
    },
  })
}

// 实时统计 Hook
export function useRealTimeStats() {
  const [stats, setStats] = useState({
    activeGenerations: 0,
    todayCost: 0,
    todayGenerations: 0,
    successRate: 0,
    averageResponseTime: 0
  })

  useEffect(() => {
    const updateStats = async () => {
      try {
        // 这里应该调用实时API
        // 现在模拟实时数据
        setStats({
          activeGenerations: Math.floor(Math.random() * 10) + 1,
          todayCost: Math.random() * 100 + 20,
          todayGenerations: Math.floor(Math.random() * 50) + 20,
          successRate: 90 + Math.random() * 8,
          averageResponseTime: 15000 + Math.random() * 10000
        })
      } catch (error) {
        console.error('Error updating real-time stats:', error)
      }
    }

    updateStats()
    const interval = setInterval(updateStats, 5000) // 每5秒更新

    return () => clearInterval(interval)
  }, [])

  return stats
}

// 趋势分析 Hook
export function useTrendAnalysis(metric: string, days: number = 30) {
  const { data: analytics } = useAnalytics()

  return {
    trend: analytics ? calculateTrend(analytics, metric, days) : null,
    prediction: analytics ? predictTrend(analytics, metric, 7) : null
  }
}

// 比较分析 Hook
export function useComparisonAnalysis(
  currentFilter: Partial<AnalyticsFilter>,
  previousFilter: Partial<AnalyticsFilter>
) {
  const { data: current } = useAnalytics(currentFilter)
  const { data: previous } = useAnalytics(previousFilter)

  return {
    comparison: current && previous ? compareAnalytics(current, previous) : null
  }
}

// 分析工具函数
function calculateTrend(data: AnalyticsData, metric: string, days: number) {
  // 根据指标计算趋势
  switch (metric) {
    case 'cost':
      const recentCosts = data.costs.trend.slice(-days)
      const totalCost = recentCosts.reduce((sum, item) => sum + item.amount, 0)
      const averageCost = totalCost / recentCosts.length

      return {
        direction: averageCost > data.costs.today ? 'up' : 'down',
        percentage: ((averageCost - data.costs.today) / data.costs.today) * 100,
        value: averageCost
      }

    case 'usage':
      const recentUsage = data.usage.dailyUsage.slice(-days)
      const totalGenerations = recentUsage.reduce((sum, item) => sum + item.generations, 0)
      const averageGenerations = totalGenerations / recentUsage.length

      return {
        direction: averageGenerations > (data.usage.totalGenerations / 30) ? 'up' : 'down',
        percentage: ((averageGenerations - (data.usage.totalGenerations / 30)) / (data.usage.totalGenerations / 30)) * 100,
        value: averageGenerations
      }

    default:
      return null
  }
}

function predictTrend(data: AnalyticsData, metric: string, days: number) {
  // 简单的趋势预测（基于历史数据）
  switch (metric) {
    case 'cost':
      const costs = data.costs.trend.slice(-7)
      const avgDailyChange = costs.reduce((sum, item, index) => {
        if (index === 0) return 0
        return sum + (item.amount - costs[index - 1].amount)
      }, 0) / (costs.length - 1)

      return {
        predicted: data.costs.today + (avgDailyChange * days),
        confidence: 0.7, // 70% 置信度
        direction: avgDailyChange > 0 ? 'up' : 'down'
      }

    default:
      return null
  }
}

function compareAnalytics(current: AnalyticsData, previous: AnalyticsData) {
  return {
    cost: {
      current: current.costs.total,
      previous: previous.costs.total,
      change: current.costs.total - previous.costs.total,
      percentage: ((current.costs.total - previous.costs.total) / previous.costs.total) * 100
    },
    usage: {
      current: current.usage.totalGenerations,
      previous: previous.usage.totalGenerations,
      change: current.usage.totalGenerations - previous.usage.totalGenerations,
      percentage: ((current.usage.totalGenerations - previous.usage.totalGenerations) / previous.usage.totalGenerations) * 100
    },
    performance: {
      currentResponseTime: current.performance.averageResponseTime,
      previousResponseTime: previous.performance.averageResponseTime,
      currentSuccessRate: current.performance.cacheHitRate,
      previousSuccessRate: previous.performance.cacheHitRate
    }
  }
}

// 高级分析 Hook
export function useAdvancedAnalytics() {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | '1y'>('30d')
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([
    'cost', 'usage', 'performance', 'content'
  ])

  const { data: analytics, isLoading, error } = useAnalytics({
    dateRange: {
      start: getDateRangeStart(period),
      end: new Date().toISOString()
    }
  })

  const generateReportMutation = useGenerateReport()
  const exportMutation = useExportData()

  const handleGenerateReport = (type: AnalyticsReport['type'], name: string) => {
    generateReportMutation.mutate({
      name,
      description: `${name} - ${period}期间的分析报告`,
      type,
      filters: {
        dateRange: {
          start: getDateRangeStart(period),
          end: new Date().toISOString()
        }
      },
      format: 'json'
    })
  }

  const handleExportData = (format: 'json' | 'csv' | 'excel') => {
    if (analytics) {
      exportMutation.mutate({
        data: analytics,
        format,
        filename: `analytics-${period}-${Date.now()}`
      })
    }
  }

  return {
    period,
    setPeriod,
    selectedMetrics,
    setSelectedMetrics,
    analytics,
    isLoading,
    error,
    generateReportMutation,
    exportMutation,
    handleGenerateReport,
    handleExportData
  }
}

// 获取日期范围开始时间
function getDateRangeStart(period: '7d' | '30d' | '90d' | '1y'): string {
  const now = new Date()
  const startDate = new Date()

  switch (period) {
    case '7d':
      startDate.setDate(now.getDate() - 7)
      break
    case '30d':
      startDate.setDate(now.getDate() - 30)
      break
    case '90d':
      startDate.setDate(now.getDate() - 90)
      break
    case '1y':
      startDate.setFullYear(now.getFullYear() - 1)
      break
  }

  return startDate.toISOString()
}

// 导出默认的分析工具
export const analyticsUtils = {
  // 计算平均值
  calculateAverage: (values: number[]): number => {
    if (values.length === 0) return 0
    return values.reduce((sum, value) => sum + value, 0) / values.length
  },

  // 计算中位数
  calculateMedian: (values: number[]): number => {
    if (values.length === 0) return 0
    const sorted = [...values].sort((a, b) => a - b)
    const middle = Math.floor(sorted.length / 2)
    return sorted.length % 2 === 0
      ? (sorted[middle - 1] + sorted[middle]) / 2
      : sorted[middle]
  },

  // 计算百分位数
  calculatePercentile: (values: number[], percentile: number): number => {
    if (values.length === 0) return 0
    const sorted = [...values].sort((a, b) => a - b)
    const index = Math.ceil((percentile / 100) * sorted.length) - 1
    return sorted[Math.max(0, index)]
  },

  // 计算标准差
  calculateStandardDeviation: (values: number[]): number => {
    if (values.length === 0) return 0
    const mean = analyticsUtils.calculateAverage(values)
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2))
    const avgSquaredDiff = analyticsUtils.calculateAverage(squaredDiffs)
    return Math.sqrt(avgSquaredDiff)
  },

  // 检测异常值
  detectOutliers: (values: number[]): number[] => {
    if (values.length < 4) return []

    const sorted = [...values].sort((a, b) => a - b)
    const q1 = analyticsUtils.calculatePercentile(sorted, 25)
    const q3 = analyticsUtils.calculatePercentile(sorted, 75)
    const iqr = q3 - q1
    const lowerBound = q1 - 1.5 * iqr
    const upperBound = q3 + 1.5 * iqr

    return values.filter(value => value < lowerBound || value > upperBound)
  },

  // 平滑数据
  smoothData: (values: number[], windowSize: number = 3): number[] => {
    if (values.length < windowSize) return values

    const smoothed = []
    for (let i = 0; i < values.length; i++) {
      const start = Math.max(0, i - Math.floor(windowSize / 2))
      const end = Math.min(values.length, i + Math.floor(windowSize / 2) + 1)
      const window = values.slice(start, end)
      smoothed.push(analyticsUtils.calculateAverage(window))
    }

    return smoothed
  }
}