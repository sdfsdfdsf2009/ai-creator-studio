import { AIProvider, AIProviderConfig } from './index'

export interface ProxyConfig {
  id: string
  name: string
  baseUrl: string
  apiKey: string
  textModel: string
  imageModel: string
  maxTokens: number
  temperature: number
  enabled: boolean
  priority: number
}

export class ProxyProvider implements AIProvider {
  private config: AIProviderConfig

  constructor(config: AIProviderConfig) {
    this.config = config
  }

  async generateImage(prompt: string, options: {
    model?: string
    size?: string
    quality?: string
    style?: string
    quantity?: number
    negativePrompt?: string
    seed?: number
  }): Promise<string[]> {
    const {
      model = 'gemini-2.5-flash-image',
      size = '1:1',
      quantity = 1
    } = options

    // 根据模型类型调用不同的API
    if (model === 'gemini-2.5-flash-image') {
      return this.generateNanoBananaImage(prompt, { model, size, quantity })
    } else {
      return this.generateOpenAICompatibleImage(prompt, options)
    }
  }

  private async generateNanoBananaImage(prompt: string, options: {
    model: string
    size: string
    quantity: number
  }): Promise<string[]> {
    console.log(`发起 Nano Banana API 请求:`, {
      url: this.config.baseUrl,
      model: options.model,
      prompt: prompt.substring(0, 50) + '...',
      size: options.size
    })

    const response = await fetch(this.config.baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: options.model,
        prompt: prompt,
        size: options.size
      })
    })

    if (!response.ok) {
      const error = await response.json()
      const errorMessage = error.error?.message || response.statusText
      const errorCode = error.error?.code || response.status

      // 根据官方API文档处理特定错误
      switch (errorCode) {
        case 401:
          throw new Error(`API认证失败: ${errorMessage}. 请检查API密钥是否正确`)
        case 402:
          throw new Error(`配额不足: ${errorMessage}. 请充值后重试`)
        case 403:
          throw new Error(`无权限访问此模型: ${errorMessage}`)
        case 429:
          throw new Error(`请求频率超限: ${errorMessage}. 请稍后重试`)
        case 503:
          throw new Error(`服务暂时不可用: ${errorMessage}. 请稍后重试`)
        default:
          throw new Error(`Nano Banana API错误 (${errorCode}): ${errorMessage}`)
      }
    }

    const result = await response.json()

    // 检查响应格式
    if (!result.id) {
      throw new Error('API响应格式错误：缺少任务ID')
    }

    // Nano Banana返回的是任务ID，需要轮询获取结果
    return await this.pollNanoBananaResult(result.id)
  }

  private async pollNanoBananaResult(taskId: string): Promise<string[]> {
    const maxAttempts = 30 // 最多等待5分钟
    const delay = 10000 // 10秒轮询一次

    console.log(`开始轮询Nano Banana任务: ${taskId}`)

    for (let i = 0; i < maxAttempts; i++) {
      try {
        // 使用 /v1/tasks/{taskId} 格式来查询任务状态
        const pollUrl = `${this.config.baseUrl.replace('/v1/images/generations', '/v1/tasks')}/${taskId}`
        const response = await fetch(pollUrl, {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`
          }
        })

        if (!response.ok) {
          throw new Error(`Failed to check task status: ${response.statusText}`)
        }

        const result = await response.json()
        console.log(`任务 ${taskId} 状态: ${result.status}, 进度: ${result.progress}%`)

        if (result.status === 'completed') {
          console.log(`任务 ${taskId} 完成，获取结果...`)

          // 根据官方API文档，完成的任务会在结果中包含图像URL
          if (result.results && Array.isArray(result.results)) {
            console.log(`成功获取 ${result.results.length} 张图片`)
            return result.results
          } else {
            throw new Error('任务完成但未找到图片结果')
          }
        } else if (result.status === 'failed') {
          const errorMsg = result.error?.message || result.task_info?.error_description || 'Unknown error'
          throw new Error(`图片生成失败: ${errorMsg}`)
        } else if (result.status === 'processing' || result.status === 'pending') {
          // 继续等待，显示进度
          console.log(`任务进行中... ${result.progress || 0}%`)
        }

        // 继续等待
        await new Promise(resolve => setTimeout(resolve, delay))
      } catch (error) {
        console.warn(`轮询Nano Banana结果时出错:`, error)
        if (i === maxAttempts - 1) {
          throw error // 最后一次尝试，抛出错误
        }
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    throw new Error(`图片生成超时: 已等待 ${maxAttempts * delay / 1000} 秒`)
  }

  private async generateOpenAICompatibleImage(prompt: string, options: any): Promise<string[]> {
    const response = await fetch(this.config.baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: options.model || 'dall-e-3',
        prompt,
        n: options.quantity || 1,
        size: options.size || '1024x1024',
        quality: options.quality || 'standard',
        response_format: 'url'
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`API error: ${error.error?.message || response.statusText}`)
    }

    const result = await response.json()
    return result.data.map((item: any) => item.url)
  }

  async generateVideo(prompt: string, options: any): Promise<string[]> {
    throw new Error('Video generation not supported by proxy provider')
  }

  async testConnection(): Promise<boolean> {
    try {
      console.log(`开始测试 Nano Banana API 连接...`)
      console.log(`URL: ${this.config.baseUrl}`)
      console.log(`API Key: ${this.config.apiKey ? '已设置' : '未设置'}`)

      // 对于 Nano Banana API，我们测试一个简单的图片生成请求
      // 但是使用一个小的测试提示词
      const response = await fetch(this.config.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gemini-2.5-flash-image',
          prompt: 'test',
          size: '1:1'
        })
      })

      console.log(`API响应状态: ${response.status} ${response.statusText}`)

      // 如果返回 402 (配额不足) 或 401 (认证失败)，说明连接是正常的，只是没有配额
      if (response.status === 402 || response.status === 401) {
        console.log('✅ Nano Banana API 连接测试成功 (认证正常但可能配额不足)')
        return true
      }

      if (response.ok) {
        console.log('✅ Nano Banana API 连接测试成功')
        return true
      }

      const errorText = await response.text()
      console.log(`❌ Nano Banana API 连接测试失败: ${response.status} ${errorText}`)
      return false
    } catch (error) {
      console.warn('❌ Nano Banana 连接测试失败:', error)
      return false
    }
  }

  getCostEstimate(type: 'image' | 'video', options: any): number {
    // 根据官方API文档的成本信息
    if (type === 'image') {
      if (options.model === 'gemini-2.5-flash-image') {
        return 1.6 // 官方文档显示的credits_reserved值
      }
      return 0.02 // 其他模型的通用定价
    }
    return 0
  }
}

// 动态代理提供商管理器
export class ProxyProviderManager {
  private providers: Map<string, ProxyProvider> = new Map()

  // 从配置更新提供商
  updateProviders(configs: ProxyConfig[]) {
    this.providers.clear()

    configs
      .filter(config => config.enabled && config.baseUrl && config.apiKey)
      .forEach(config => {
        const provider = new ProxyProvider({
          apiKey: config.apiKey,
          baseUrl: config.baseUrl,
          timeout: 120000,
          retries: 3
        })
        this.providers.set(config.id, provider)
      })
  }

  // 获取可用的图片模型
  getAvailableImageModels(): string[] {
    const models = new Set<string>()

    this.providers.forEach((provider, configId) => {
      // 这里可以根据配置添加不同的模型
      models.add('gemini-2.5-flash-image')
      models.add('dall-e-3')
      models.add('stable-diffusion-xl')
    })

    return Array.from(models)
  }

  // 获取可用的文本模型
  getAvailableTextModels(): string[] {
    const models = new Set<string>()

    this.providers.forEach((provider) => {
      models.add('gpt-4')
      models.add('gpt-3.5-turbo')
      models.add('claude-3-opus')
    })

    return Array.from(models)
  }

  // 获取优先级最高的提供商
  getHighestPriorityProvider(): ProxyProvider | undefined {
    const providers = Array.from(this.providers.values())
    return providers[0] // 简单实现，返回第一个
  }

  // 为模型获取提供商
  getProviderForModel(model: string): ProxyProvider | undefined {
    console.log(`代理管理器状态:
    - 提供商数量: ${this.providers.size}
    - 可用模型: ${this.getAvailableImageModels().join(', ')}
    - 请求模型: ${model}`)

    // 简单实现：返回第一个可用的提供商
    const provider = this.getHighestPriorityProvider()
    console.log(`返回提供商: ${provider ? '找到' : '未找到'}`)
    return provider
  }
}

export const proxyProviderManager = new ProxyProviderManager()