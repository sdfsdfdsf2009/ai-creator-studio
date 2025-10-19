// 变量系统 - 检测、定义、展开功能

export interface Variable {
  name: string
  type: 'text' | 'select' | 'number'
  defaultValue?: string | number
  options?: string[] // for select type
  required?: boolean
  description?: string
}

export interface VariableMatch {
  name: string
  start: number
  end: number
  fullMatch: string
}

// 检测文本中的变量
export function detectVariables(text: string): VariableMatch[] {
  const regex = /\{(\w+)\}/g
  const matches: VariableMatch[] = []
  let match

  while ((match = regex.exec(text)) !== null) {
    matches.push({
      name: match[1],
      start: match.index,
      end: match.index + match[0].length,
      fullMatch: match[0]
    })
  }

  return matches
}

// 从提示词中提取变量定义
export function extractVariableDefinitions(text: string): Record<string, Variable> {
  const variables: Record<string, Variable> = {}
  const variableRegex = /@(\w+):\s*(text|select|number)(?:\s*\[([^\]]+)\])?(?:\s*\(([^)]+)\))?(?:\s*=\s*([^\s}]+))?/g
  let match

  while ((match = variableRegex.exec(text)) !== null) {
    const name = match[1]
    const type = match[2] as 'text' | 'select' | 'number'
    const optionsStr = match[3]
    const description = match[4]
    const defaultValue = match[5]

    let options: string[] | undefined
    if (type === 'select' && optionsStr) {
      options = optionsStr.split(',').map(opt => opt.trim())
    }

    variables[name] = {
      name,
      type,
      options,
      description: description?.trim(),
      defaultValue: defaultValue?.trim(),
      required: !defaultValue
    }
  }

  return variables
}

// 清理提示词中的变量定义语法
export function cleanPrompt(text: string): string {
  // 移除变量定义语法
  const cleaned = text.replace(/@\w+:\s*(text|select|number)(?:\s*\[[^\]]+\])?(?:\s*\([^)]+\))?(?:\s*=\s*[^\s}]+)?/g, '')
  // 移除多余的空格和换行
  return cleaned.replace(/\s+/g, ' ').trim()
}

// 展开变量到最终提示词
export function expandVariables(
  template: string, 
  variables: Record<string, Variable>, 
  values: Record<string, any>
): string {
  let result = template

  // 首先清理模板中的变量定义
  result = cleanPrompt(result)

  // 获取模板中的所有变量占位符
  const matches = detectVariables(result)

  // 替换每个变量
  matches.forEach(match => {
    const variable = variables[match.name]
    if (variable) {
      const value = values[match.name] || variable.defaultValue || ''
      result = result.replace(match.fullMatch, String(value))
    }
  })

  return result
}

// 验证变量值
export function validateVariableValues(
  variables: Record<string, Variable>,
  values: Record<string, any>
): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {}
  let valid = true

  Object.entries(variables).forEach(([name, variable]) => {
    const value = values[name]

    // 检查必填字段
    if (variable.required && (!value || value === '')) {
      errors[name] = `${name} 是必填字段`
      valid = false
      return
    }

    // 跳过空值验证（可选字段）
    if (!value || value === '') return

    // 类型验证
    if (variable.type === 'number') {
      const numValue = Number(value)
      if (isNaN(numValue)) {
        errors[name] = `${name} 必须是数字`
        valid = false
      }
    } else if (variable.type === 'select' && variable.options) {
      if (!variable.options.includes(String(value))) {
        errors[name] = `${name} 必须是有效选项之一`
        valid = false
      }
    }
  })

  return { valid, errors }
}

// 生成变量的默认值
export function generateDefaultValues(variables: Record<string, Variable>): Record<string, any> {
  const values: Record<string, any> = {}

  Object.entries(variables).forEach(([name, variable]) => {
    if (variable.defaultValue !== undefined) {
      values[name] = variable.defaultValue
    } else if (variable.type === 'number') {
      values[name] = 0
    } else {
      values[name] = ''
    }
  })

  return values
}

// 计算变量展开后的成本估算
export function calculateVariableCost(
  baseCost: number,
  variables: Record<string, Variable>,
  values: Record<string, any>,
  multiplier: number = 1
): number {
  // 检查是否有数量相关的变量
  let quantityMultiplier = 1

  if (values.quantity && typeof values.quantity === 'number') {
    quantityMultiplier = values.quantity
  }

  if (values.duration && typeof values.duration === 'number') {
    quantityMultiplier = values.duration
  }

  return baseCost * quantityMultiplier * multiplier
}

// 示例提示词模板
export const EXAMPLE_TEMPLATES = {
  // 人物肖像模板
  professionalHeadshot: {
    template: `@occupation: select [Doctor, Engineer, Artist, Teacher, Chef, Lawyer] (人物的职业)
@attire: select [Business suit, Casual wear, Uniform, Traditional dress] (服装风格)
@background: select [Plain white, Office, Studio, Outdoor blurred] (背景环境)
Professional headshot of a {occupation}, wearing {attire}, {background} background, studio lighting, high quality, detailed`,
    
    variables: {
      occupation: {
        name: 'occupation',
        type: 'select' as const,
        options: ['Doctor', 'Engineer', 'Artist', 'Teacher', 'Chef', 'Lawyer'],
        description: '人物的职业',
        required: true,
        defaultValue: 'Doctor'
      },
      attire: {
        name: 'attire',
        type: 'select' as const,
        options: ['Business suit', 'Casual wear', 'Uniform', 'Traditional dress'],
        description: '服装风格',
        required: true,
        defaultValue: 'Business suit'
      },
      background: {
        name: 'background',
        type: 'select' as const,
        options: ['Plain white', 'Office', 'Studio', 'Outdoor blurred'],
        description: '背景环境',
        required: true,
        defaultValue: 'Studio'
      }
    }
  },

  // 产品展示模板
  productPhotography: {
    template: `@product: text (产品名称)
@style: select [Minimalist, Luxury, Modern, Vintage] (摄影风格)
@lighting: select [Natural light, Studio lighting, Dramatic lighting] (光线效果)
Professional product photography of {product}, {style} style, {lighting}, clean background, commercial quality, detailed`,
    
    variables: {
      product: {
        name: 'product',
        type: 'text' as const,
        description: '产品名称',
        required: true
      },
      style: {
        name: 'style',
        type: 'select' as const,
        options: ['Minimalist', 'Luxury', 'Modern', 'Vintage'],
        description: '摄影风格',
        required: true,
        defaultValue: 'Modern'
      },
      lighting: {
        name: 'lighting',
        type: 'select' as const,
        options: ['Natural light', 'Studio lighting', 'Dramatic lighting'],
        description: '光线效果',
        required: true,
        defaultValue: 'Studio lighting'
      }
    }
  }
}