import Papa from 'papaparse'
import { CSVData, ParsedCSV, CSVParseError, CSVValidationResult } from './csv-types'
import {
  REQUIRED_COLUMNS,
  OPTIONAL_COLUMNS,
  MAX_PROMPT_LENGTH,
  MAX_CSV_ROWS,
  DEFAULT_QUANTITY,
  DEFAULT_IMAGE_SIZE
} from './csv-types'

export class CSVParser {
  /**
   * 解析CSV文件内容
   */
  static async parseCSV(file: File): Promise<ParsedCSV> {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const parsed = this.validateAndCleanData(results.data as any[])
          resolve(parsed)
        },
        error: (error) => {
          reject(new Error(`CSV解析失败: ${error.message}`))
        }
      })
    })
  }

  /**
   * 验证和清洗数据
   */
  private static validateAndCleanData(rawData: any[]): ParsedCSV {
    const errors: CSVParseError[] = []
    const validData: CSVData[] = []
    let validRowCount = 0

    // 获取表头信息
    const headers = Object.keys(rawData[0] || {})

    rawData.forEach((row, index) => {
      const rowErrors: CSVParseError[] = []

      // 检查必需字段
      if (!row.prompt || typeof row.prompt !== 'string') {
        errors.push({
          row: index + 2, // CSV行号 (从1开始，表头是第1行)
          field: 'prompt',
          value: String(row.prompt || ''),
          message: 'prompt字段缺失或格式错误',
          severity: 'error'
        })
      } else {
        // 验证prompt长度
        if (row.prompt.length > MAX_PROMPT_LENGTH) {
          rowErrors.push({
            row: index + 2,
            field: 'prompt',
            value: row.prompt.substring(0, 100) + '...',
            message: `prompt长度超过限制 (${row.prompt.length}/${MAX_PROMPT_LENGTH})`,
            severity: 'warning'
          })
        }
      }

      // 验证可选字段
      if (row.model) {
        const validModels = ['gpt-4o-image', 'dall-e-3', 'flux-pro', 'midjourney-v6', 'stable-diffusion']
        if (!validModels.includes(row.model)) {
          rowErrors.push({
            row: index + 2,
            field: 'model',
            value: row.model,
            message: `不支持的模型: ${row.model}`,
            severity: 'warning'
          })
        }
      }

      if (row.width && (isNaN(Number(row.width)) || Number(row.width) <= 0)) {
        rowErrors.push({
          row: index + 2,
          field: 'width',
          value: String(row.width),
          message: 'width必须是正整数',
          severity: 'error'
        })
      }

      if (row.height && (isNaN(Number(row.height)) || Number(row.height) <= 0)) {
        rowErrors.push({
          row: index + 2,
          field: 'height',
          value: String(row.height),
          message: 'height必须是正整数',
          severity: 'error'
        })
      }

      if (row.quantity && (isNaN(Number(row.quantity)) || Number(row.quantity) <= 0)) {
        rowErrors.push({
          row: index + 2,
          field: 'quantity',
          value: String(row.quantity),
          message: 'quantity必须是正整数',
          severity: 'error'
        })
      }

      // 如果没有严重错误，添加到有效数据
      const hasErrors = rowErrors.some(error => error.severity === 'error')
      if (!hasErrors && row.prompt) {
        validData.push({
          prompt: row.prompt.trim(),
          model: row.model || undefined,
          width: row.width ? Number(row.width) : DEFAULT_IMAGE_SIZE,
          height: row.height ? Number(row.height) : DEFAULT_IMAGE_SIZE,
          quantity: row.quantity ? Number(row.quantity) : DEFAULT_QUANTITY,
          seed: row.seed ? Number(row.seed) : undefined,
          negative_prompt: row.negative_prompt || undefined,
          ...row // 保留其他自定义字段
        })
        validRowCount++
      }

      // 添加所有错误到总错误列表
      errors.push(...rowErrors)
    })

    return {
      headers,
      data: validData,
      errors,
      totalRows: rawData.length,
      validRows: validRowCount
    }
  }

  /**
   * 验证CSV文件格式
   */
  static validateCSVFile(file: File): { isValid: boolean; error?: string } {
    // 检查文件大小
    if (file.size > 50 * 1024 * 1024) { // 50MB
      return {
        isValid: false,
        error: `文件过大 (${(file.size / 1024 / 1024).toFixed(1)}MB，最大支持50MB`
      }
    }

    // 检查文件类型
    const validTypes = [
      'text/csv',
      'text/plain',
      'application/csv',
      'application/vnd.ms-excel'
    ]

    if (!validTypes.includes(file.type)) {
      return {
        isValid: false,
        error: `不支持的文件类型: ${file.type}，请上传CSV文件`
      }
    }

    // 检查文件扩展名
    const fileName = file.name.toLowerCase()
    const validExtensions = ['.csv', '.txt']
    const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext))

    if (!hasValidExtension) {
      return {
        isValid: false,
        error: `不支持的文件扩展名，请使用.csv或.txt文件`
      }
    }

    return { isValid: true }
  }

  /**
   * 生成CSV验证结果
   */
  static generateValidationResult(parsed: ParsedCSV): CSVValidationResult {
    const totalRows = parsed.totalRows
    const validRows = parsed.validRows
    const errorRows = totalRows - validRows

    // 分析列的使用情况
    const usedColumns = new Set<string>()
    parsed.data.forEach(row => {
      Object.keys(row).forEach(key => usedColumns.add(key))
    })

    const requiredColumns = REQUIRED_COLUMNS.filter(col => usedColumns.has(col))
    const optionalColumns = Array.from(usedColumns).filter(col =>
      !REQUIRED_COLUMNS.includes(col)
    )

    const hasErrors = parsed.errors.length > 0
    const hasRequiredColumns = requiredColumns.length > 0

    return {
      isValid: !hasErrors && hasRequiredColumns,
      errors: parsed.errors,
      warnings: parsed.errors.filter(err => err.severity === 'warning'),
      summary: {
        totalRows,
        validRows,
        errorRows,
        requiredColumns,
        optionalColumns
      }
    }
  }

  /**
   * 过滤有效数据
   */
  static filterValidData(data: CSVData[], includeWarnings: boolean = true): CSVData[] {
    return data.filter(row => {
      if (!row.prompt || row.prompt.trim().length === 0) {
        return false
      }

      if (row.prompt.length > MAX_PROMPT_LENGTH && !includeWarnings) {
        return false
      }

      return true
    })
  }

  /**
   * 为数据生成唯一ID
   */
  static addUniqueIds(data: CSVData[]): CSVData[] {
    return data.map((row, index) => ({
      ...row,
      _id: `csv-row-${index}-${Date.now()}`,
      _originalIndex: index
    }))
  }

  /**
   * 获取数据统计信息
   */
  static getDataStats(data: CSVData[]): {
    totalRows: number
    validRows: number
    totalPrompts: number
    averagePromptLength: number
    modelDistribution: Record<string, number>
    estimatedTasks: number
  } {
    const validRows = this.filterValidData(data)
    const totalPrompts = validRows.reduce((sum, row) => {
      return sum + (row.quantity || DEFAULT_QUANTITY)
    }, 0)

    const totalPromptLength = validRows.reduce((sum, row) => sum + row.prompt.length, 0)
    const averagePromptLength = validRows.length > 0 ? Math.round(totalPromptLength / validRows.length) : 0

    const modelDistribution: Record<string, number> = {}
    validRows.forEach(row => {
      const model = row.model || 'default'
      modelDistribution[model] = (modelDistribution[model] || 0) + 1
    })

    return {
      totalRows: data.length,
      validRows: validRows.length,
      totalPrompts,
      averagePromptLength,
      modelDistribution,
      estimatedTasks: totalPrompts
    }
  }
}