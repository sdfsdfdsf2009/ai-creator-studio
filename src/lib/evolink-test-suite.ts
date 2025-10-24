// EvoLink.AI高级测试套件

import { evolinkModelManager, TestResult, UserEvoLinkModel } from './evolink-model-manager'

export interface TestSuiteConfig {
  parallel?: boolean
  timeout?: number
  retryCount?: number
  retryDelay?: number
  detailedLogs?: boolean
}

export interface TestSuiteResult {
  totalTests: number
  passedTests: number
  failedTests: number
  skippedTests: number
  testResults: TestResult[]
  summary: {
    successRate: number
    averageResponseTime: number
    totalCost: number
    errorsByType: Record<string, number>
  }
  timestamp: string
  duration: number
}

export interface BatchTestConfig {
  modelIds: string[]
  proxyAccountId?: string
  testConfig?: TestSuiteConfig
  onProgress?: (progress: number, current: TestResult) => void
}

class EvoLinkTestSuite {
  private static instance: EvoLinkTestSuite

  static getInstance(): EvoLinkTestSuite {
    if (!EvoLinkTestSuite.instance) {
      EvoLinkTestSuite.instance = new EvoLinkTestSuite()
    }
    return EvoLinkTestSuite.instance
  }

  // 单个模型测试
  async testSingleModel(
    modelId: string,
    modelType: 'template' | 'user-model',
    mediaType: 'text' | 'image' | 'video',
    proxyAccountId?: string,
    options: TestSuiteConfig = {}
  ): Promise<TestResult> {
    const {
      timeout = 30000,
      retryCount = 2,
      retryDelay = 1000,
      detailedLogs = false
    } = options

    let lastError: Error | null = null

    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        if (detailedLogs) {
          console.log(`🧪 测试模型 ${modelId} (尝试 ${attempt + 1}/${retryCount + 1})`)
        }

        const result = await Promise.race([
          evolinkModelManager.testModel(modelId, modelType, mediaType, proxyAccountId),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('测试超时')), timeout)
          )
        ])

        if (detailedLogs) {
          console.log(`✅ 模型 ${modelId} 测试成功: ${result.message}`)
        }

        return result
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        if (detailedLogs) {
          console.log(`❌ 模型 ${modelId} 测试失败 (尝试 ${attempt + 1}): ${lastError.message}`)
        }

        if (attempt < retryCount) {
          await new Promise(resolve => setTimeout(resolve, retryDelay))
        }
      }
    }

    // 所有重试都失败了
    return {
      modelId,
      mediaType,
      modelType,
      testEndpoint: '',
      responseTime: 0,
      status: 0,
      statusText: 'Failed',
      success: false,
      message: `测试失败: ${lastError?.message || '未知错误'}`,
      timestamp: new Date().toISOString()
    }
  }

  // 批量测试模型
  async testBatchModels(config: BatchTestConfig): Promise<TestSuiteResult> {
    const {
      modelIds,
      proxyAccountId,
      testConfig = {},
      onProgress
    } = config

    const {
      parallel = true,
      detailedLogs = false
    } = testConfig

    console.log(`🚀 开始批量测试 ${modelIds.length} 个模型`)

    const startTime = Date.now()
    const testResults: TestResult[] = []

    if (parallel) {
      // 并行测试
      const promises = modelIds.map(async (modelId, index) => {
        const mediaType = EvoLinkModelManager.getMediaTypeFromModelId(modelId)
        const result = await this.testSingleModel(
          modelId,
          'user-model',
          mediaType,
          proxyAccountId,
          testConfig
        )

        testResults[index] = result
        onProgress?.((index + 1) / modelIds.length, result)

        return result
      })

      await Promise.all(promises)
    } else {
      // 串行测试
      for (let i = 0; i < modelIds.length; i++) {
        const modelId = modelIds[i]
        const mediaType = EvoLinkModelManager.getMediaTypeFromModelId(modelId)

        const result = await this.testSingleModel(
          modelId,
          'user-model',
          mediaType,
          proxyAccountId,
          testConfig
        )

        testResults.push(result)
        onProgress?.((i + 1) / modelIds.length, result)
      }
    }

    const duration = Date.now() - startTime
    const summary = this.calculateSummary(testResults, duration)

    if (detailedLogs) {
      console.log(`📊 批量测试完成: ${summary.passedTests}/${testResults.length} 通过`)
    }

    return {
      totalTests: testResults.length,
      passedTests: summary.passedTests,
      failedTests: summary.failedTests,
      skippedTests: summary.skippedTests,
      testResults,
      summary,
      timestamp: new Date().toISOString(),
      duration
    }
  }

  // 测试所有用户模型
  async testAllUserModels(
    proxyAccountId?: string,
    testConfig?: TestSuiteConfig,
    onProgress?: (progress: number, current: TestResult) => void
  ): Promise<TestSuiteResult> {
    try {
      const userModels = await evolinkModelManager.getUserModels(true) // 强制刷新
      const enabledModels = userModels.filter(model => model.enabled)

      if (enabledModels.length === 0) {
        return {
          totalTests: 0,
          passedTests: 0,
          failedTests: 0,
          skippedTests: 0,
          testResults: [],
          summary: {
            successRate: 0,
            averageResponseTime: 0,
            totalCost: 0,
            errorsByType: {}
          },
          timestamp: new Date().toISOString(),
          duration: 0
        }
      }

      return await this.testBatchModels({
        modelIds: enabledModels.map(model => model.modelId),
        proxyAccountId,
        testConfig,
        onProgress
      })
    } catch (error) {
      console.error('测试所有用户模型失败:', error)
      throw error
    }
  }

  // 定期健康检查
  async scheduleHealthCheck(
    proxyAccountId: string,
    intervalMinutes: number = 60,
    onResult?: (result: TestSuiteResult) => void
  ): Promise<NodeJS.Timeout> {
    const intervalMs = intervalMinutes * 60 * 1000

    console.log(`⏰ 安排定期健康检查，间隔: ${intervalMinutes} 分钟`)

    const healthCheck = async () => {
      try {
        console.log('🔍 执行定期健康检查...')
        const result = await this.testAllUserModels(proxyAccountId, {
          parallel: false, // 健康检查使用串行模式
          detailedLogs: true,
          timeout: 15000, // 健康检查超时时间较短
          retryCount: 1
        })

        onResult?.(result)

        // 记录健康检查结果
        if (result.summary.successRate < 0.8) {
          console.warn(`⚠️ 健康检查警告: 成功率仅为 ${(result.summary.successRate * 100).toFixed(1)}%`)
        } else {
          console.log(`✅ 健康检查通过: 成功率 ${(result.summary.successRate * 100).toFixed(1)}%`)
        }
      } catch (error) {
        console.error('健康检查失败:', error)
      }
    }

    // 立即执行一次
    await healthCheck()

    // 设置定期执行
    return setInterval(healthCheck, intervalMs)
  }

  // 计算测试结果统计
  private calculateSummary(testResults: TestResult[], duration: number): {
    passedTests: number
    failedTests: number
    skippedTests: number
    successRate: number
    averageResponseTime: number
    totalCost: number
    errorsByType: Record<string, number>
  } {
    const passedTests = testResults.filter(r => r.success).length
    const failedTests = testResults.filter(r => !r.success).length
    const skippedTests = 0 // 当前实现中没有跳过的测试

    const successRate = testResults.length > 0 ? passedTests / testResults.length : 0

    const successfulTests = testResults.filter(r => r.success)
    const averageResponseTime = successfulTests.length > 0
      ? successfulTests.reduce((sum, r) => sum + r.responseTime, 0) / successfulTests.length
      : 0

    // 简单的成本计算（基于响应时间估算）
    const totalCost = successfulTests.reduce((sum, r) => {
      return sum + (r.responseTime / 1000) * 0.001 // 假设每秒成本 $0.001
    }, 0)

    const errorsByType: Record<string, number> = {}
    testResults.forEach(result => {
      if (!result.success && result.errorType) {
        errorsByType[result.errorType] = (errorsByType[result.errorType] || 0) + 1
      }
    })

    return {
      passedTests,
      failedTests,
      skippedTests,
      successRate,
      averageResponseTime,
      totalCost,
      errorsByType
    }
  }

  // 生成测试报告
  generateTestReport(result: TestSuiteResult): string {
    const {
      totalTests,
      passedTests,
      failedTests,
      summary,
      duration,
      timestamp
    } = result

    const report = []
    report.push('# EvoLink.AI 模型测试报告')
    report.push('')
    report.push(`**测试时间**: ${new Date(timestamp).toLocaleString()}`)
    report.push(`**测试持续时间**: ${(duration / 1000).toFixed(2)} 秒`)
    report.push('')
    report.push('## 测试结果概览')
    report.push('')
    report.push(`- **总测试数**: ${totalTests}`)
    report.push(`- **通过测试**: ${passedTests}`)
    report.push(`- **失败测试**: ${failedTests}`)
    report.push(`- **成功率**: ${(summary.successRate * 100).toFixed(1)}%`)
    report.push(`- **平均响应时间**: ${summary.averageResponseTime.toFixed(0)}ms`)
    report.push(`- **估算总成本**: $${summary.totalCost.toFixed(4)}`)
    report.push('')

    if (Object.keys(summary.errorsByType).length > 0) {
      report.push('## 错误统计')
      report.push('')
      Object.entries(summary.errorsByType).forEach(([errorType, count]) => {
        report.push(`- **${errorType}**: ${count} 次`)
      })
      report.push('')
    }

    report.push('## 详细测试结果')
    report.push('')

    result.testResults.forEach((testResult, index) => {
      const status = testResult.success ? '✅' : '❌'
      report.push(`${index + 1}. ${status} **${testResult.modelId}**`)
      report.push(`   - 媒体类型: ${testResult.mediaType}`)
      report.push(`   - 响应时间: ${testResult.responseTime}ms`)
      report.push(`   - 状态: ${testResult.message}`)
      if (testResult.testEndpoint) {
        report.push(`   - 端点: ${testResult.testEndpoint}`)
      }
      report.push('')
    })

    return report.join('\n')
  }

  // 导出测试结果
  async exportTestResults(result: TestSuiteResult, format: 'json' | 'csv' | 'markdown' = 'json'): Promise<Blob> {
    let content: string
    let mimeType: string

    switch (format) {
      case 'json':
        content = JSON.stringify(result, null, 2)
        mimeType = 'application/json'
        break
      case 'csv':
        content = this.convertToCSV(result)
        mimeType = 'text/csv'
        break
      case 'markdown':
        content = this.generateTestReport(result)
        mimeType = 'text/markdown'
        break
      default:
        throw new Error(`不支持的导出格式: ${format}`)
    }

    return new Blob([content], { type: mimeType })
  }

  // 转换为CSV格式
  private convertToCSV(result: TestSuiteResult): string {
    const headers = [
      '模型ID',
      '媒体类型',
      '成功',
      '响应时间(ms)',
      '状态消息',
      '错误类型',
      '测试端点',
      '测试时间'
    ]

    const rows = result.testResults.map(testResult => [
      testResult.modelId,
      testResult.mediaType,
      testResult.success ? '是' : '否',
      testResult.responseTime.toString(),
      testResult.message,
      testResult.errorType || '',
      testResult.testEndpoint || '',
      testResult.timestamp
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    return csvContent
  }
}

export const evolinkTestSuite = EvoLinkTestSuite.getInstance()
export default evolinkTestSuite