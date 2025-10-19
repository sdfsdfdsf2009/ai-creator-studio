import { zh } from '@/i18n/translations'

// 简单的翻译Hook，避免复杂的国际化配置
export function useTranslation() {
  const t = (key: string, params?: Record<string, any>) => {
    // 解析嵌套的key，如 'tasks.status.pending'
    const keys = key.split('.')
    let value: any = zh

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k]
      } else {
        return key // 如果找不到翻译，返回原始key
      }
    }

    // 如果是函数，调用它（处理带参数的翻译）
    if (typeof value === 'function') {
      return value(params)
    }

    // 如果是字符串，支持参数替换
    if (typeof value === 'string' && params) {
      return value.replace(/\{(\w+)\}/g, (match, paramKey) => {
        return params[paramKey] !== undefined ? String(params[paramKey]) : match
      })
    }

    return value || key
  }

  return { t }
}

// 便捷函数，用于在非组件环境中使用翻译
export function translate(key: string, params?: Record<string, any>): string {
  const keys = key.split('.')
  let value: any = zh

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k]
    } else {
      return key
    }
  }

  if (typeof value === 'string' && params) {
    return value.replace(/\{(\w+)\}/g, (match, paramKey) => {
      return params[paramKey] !== undefined ? String(params[paramKey]) : match
    })
  }

  return value || key
}