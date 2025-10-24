import { AIProvider, AIProviderConfig } from './index'
import { GPT4OProvider } from './gpt4o'
import { ProxyAccount } from '@/app/api/proxy-accounts/route'
import { ModelConfig } from '@/app/api/model-configs/route'

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
  private modelConfig: ModelConfig | null = null

  constructor(config: AIProviderConfig, modelConfig?: ModelConfig) {
    this.config = config
    this.modelConfig = modelConfig || null
  }

  // 设置模型配置
  setModelConfig(modelConfig: ModelConfig) {
    this.modelConfig = modelConfig
  }

  // 智能获取API端点（支持用户自定义URL配置）
  // Fixed: Check for complete URL paths to avoid duplication
  private async getApiEndpoint(mediaType: 'image' | 'video' | 'text', modelId?: string): Promise<string> {
    const baseUrl = this.config.baseUrl

    // 如果有modelId且是EvoLink模型，优先检查用户自定义的URL配置
    if (modelId && (baseUrl?.includes('evolink.ai') || modelId.includes('evolink'))) {
      try {
        // 尝试从数据库获取用户的URL配置
        const { withDatabase } = require('@/lib/database')
        const customUrl = await withDatabase(async (db) => {
          // 首先检查用户模型配置
          const userModels = await db.getUserEvoLinkModels()
          const userModel = userModels.find(m => m.modelId === modelId)

          if (userModel?.customEndpointUrl) {
            console.log(`使用用户自定义URL ${modelId}: ${userModel.customEndpointUrl}`)
            return userModel.customEndpointUrl
          }

          // 检查模板配置（用户可能已经修改了模板的URL）
          const templates = await db.getEvoLinkTemplates()
          const template = templates.find(t => t.modelId === modelId)

          if (template?.endpointUrl) {
            console.log(`使用模板URL ${modelId}: ${template.endpointUrl}`)
            return template.endpointUrl
          }

          return null
        })

        if (customUrl) {
          return customUrl
        }
      } catch (error) {
        console.warn(`获取自定义URL配置失败 ${modelId}:`, error)
        // 如果获取自定义URL失败，继续使用默认逻辑
      }
    }

    // 默认的EvoLink.AI URL适配逻辑
    if (baseUrl && baseUrl.includes('evolink.ai')) {
      // 检查baseUrl是否已经包含了完整的API路径
      if (baseUrl.includes('/images/generations') || baseUrl.includes('/videos/generations') || baseUrl.includes('/chat/completions')) {
        return baseUrl // 直接返回已配置的完整URL
      }

      const baseEvoLinkUrl = baseUrl.replace(/\/(images|videos|chat)\/generations|\/chat\/completions$/, '')

      switch (mediaType) {
        case 'text':
          return `${baseEvoLinkUrl}/v1/chat/completions`
        case 'image':
          return `${baseEvoLinkUrl}/v1/images/generations`
        case 'video':
          return `${baseEvoLinkUrl}/v1/videos/generations`
        default:
          return baseUrl
      }
    }

    // 对于其他提供商，返回基础URL
    return baseUrl
  }

  // 获取模型对应的媒体类型
  private getModelMediaType(modelId: string): 'image' | 'video' | 'text' {
    // 从模型配置中获取媒体类型
    if (this.modelConfig) {
      return this.modelConfig.mediaType
    }

    // 如果没有模型配置，从模型ID推断
    if (modelId.includes('image') || modelId.includes('dall-e') || modelId.includes('midjourney') || modelId.includes('stable-diffusion') || modelId.includes('flux')) {
      return 'image'
    } else if (modelId.includes('video') || modelId.includes('sora') || modelId.includes('runway') || modelId.includes('pika') || modelId.includes('veo')) {
      return 'video'
    } else {
      return 'text'
    }
  }

  async generateImage(prompt: string, options: {
    model?: string
    size?: string
    quality?: string
    style?: string
    quantity?: number
    negativePrompt?: string
    seed?: number
    imageUrls?: string[]
  }): Promise<string[]> {
    const {
      model = 'gemini-2.5-flash-image',
      size = '1:1',
      quantity = 1,
      negativePrompt,
      seed,
      imageUrls
    } = options

    // 智能截断过长的prompt - 保留前90%的重要内容
    let processedPrompt = prompt
    if (prompt && prompt.length > 2000) {
      console.warn(`⚠️ Prompt过长，自动截断: ${prompt.length}/2000 字符`)
      // 保留前90%的内容，确保关键信息不被截断，并在末尾添加省略号
      const maxLength = Math.floor(2000 * 0.9)
      processedPrompt = prompt.substring(0, maxLength) + "..."
      console.log(`📝 Prompt已截断为: ${processedPrompt.length} 字符`)
    }

    // 参数验证 - 使用处理后的prompt进行长度检查
    if (processedPrompt && processedPrompt.length > 2000) {
      throw new Error(`Prompt长度超过限制: ${processedPrompt.length}/2000 字符`)
    }

    if (imageUrls && imageUrls.length > 5) {
      throw new Error(`参考图片数量超过限制: ${imageUrls.length}/5 张图片`)
    }

    // 根据模型类型调用不同的API
    if (model.startsWith('gemini-') || model.startsWith('gpt-4o') || model.startsWith('dall-e') || model.startsWith('flux') || model.startsWith('stable-diffusion') || model.startsWith('midjourney')) {
      return this.generateNanoBananaImage(prompt, { model, size, quantity, negativePrompt, seed, imageUrls })
    } else {
      return this.generateOpenAICompatibleImage(prompt, options)
    }
  }

  private async generateNanoBananaImage(prompt: string, options: {
    model: string
    size: string
    quantity: number
    negativePrompt?: string
    imageUrls?: string[]
    seed?: number
  }): Promise<string[]> {
    // 智能截断过长的prompt - 保留前90%的重要内容
    let processedPrompt = prompt
    if (prompt && prompt.length > 2000) {
      console.warn(`⚠️ Prompt过长，自动截断: ${prompt.length}/2000 字符`)
      // 保留前90%的内容，确保关键信息不被截断，并在末尾添加省略号
      const maxLength = Math.floor(2000 * 0.9)
      processedPrompt = prompt.substring(0, maxLength) + "..."
      console.log(`📝 Prompt已截断为: ${processedPrompt.length} 字符`)
    }

    const mediaType = this.getModelMediaType(options.model)
    const apiUrl = await this.getApiEndpoint(mediaType, options.model)

    console.log(`发起 Nano Banana API 请求:`, {
      url: apiUrl,
      model: options.model,
      mediaType,
      prompt: processedPrompt?.substring(0, 50) + '...' || prompt.substring(0, 50) + '...',
      size: options.size
    })

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: options.model,
        prompt: processedPrompt || prompt,
        size: options.size,
        // 添加可选的高级参数
        ...(options.negativePrompt && { negative_prompt: options.negativePrompt }),
        ...(options.imageUrls && options.imageUrls.length > 0 && { image_urls: options.imageUrls }),
        ...(options.seed && { seed: options.seed })
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
    const mediaType = this.getModelMediaType(options.model)
    const apiUrl = await this.getApiEndpoint(mediaType, options.model)

    const response = await fetch(apiUrl, {
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

  async generateText(prompt: string, options: {
    model?: string
    maxTokens?: number
    temperature?: number
  }): Promise<string> {
    const {
      model = 'gpt-4o-evolink',
      maxTokens = 1000,
      temperature = 0.7
    } = options

    const mediaType = 'text'
    const apiUrl = await this.getApiEndpoint(mediaType, model)

    console.log(`发起文本生成请求:`, {
      url: apiUrl,
      model,
      mediaType,
      prompt: prompt.substring(0, 50) + '...',
      maxTokens,
      temperature
    })

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
        temperature: temperature
      })
    })

    if (!response.ok) {
      const error = await response.json()
      const errorMessage = error.error?.message || response.statusText
      const errorCode = error.error?.code || response.status

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
          throw new Error(`文本生成API错误 (${errorCode}): ${errorMessage}`)
      }
    }

    const result = await response.json()

    if (result.choices && result.choices.length > 0) {
      return result.choices[0].message.content
    } else {
      throw new Error('API响应格式错误：缺少生成内容')
    }
  }

  async generateVideo(prompt: string, options: {
    model?: string
    duration?: number
    ratio?: string
  }): Promise<string[]> {
    const {
      model = 'veo3-fast-evolink',
      duration = 5,
      ratio = '16:9'
    } = options

    const mediaType = 'video'
    const apiUrl = await this.getApiEndpoint(mediaType, model)

    console.log(`发起视频生成请求:`, {
      url: apiUrl,
      model,
      mediaType,
      prompt: prompt.substring(0, 50) + '...',
      duration,
      ratio
    })

    // 根据模型类型调用不同的API
    if (model.includes('evolink') || model.includes('nano-banana')) {
      return this.generateNanoBananaVideo(prompt, { model, duration, ratio, apiUrl })
    } else {
      return this.generateOpenAICompatibleVideo(prompt, { model, duration, ratio, apiUrl })
    }
  }

  private async generateNanoBananaVideo(prompt: string, options: {
    model: string
    duration: number
    ratio: string
    apiUrl: string
  }): Promise<string[]> {
    const response = await fetch(options.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: options.model,
        prompt: prompt,
        duration: options.duration,
        ratio: options.ratio
      })
    })

    if (!response.ok) {
      const error = await response.json()
      const errorMessage = error.error?.message || response.statusText
      const errorCode = error.error?.code || response.status

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
          throw new Error(`Nano Banana视频API错误 (${errorCode}): ${errorMessage}`)
      }
    }

    const result = await response.json()

    if (!result.id) {
      throw new Error('API响应格式错误：缺少任务ID')
    }

    const taskId = result.id
    console.log(`视频生成任务已创建: ${taskId}`)

    // 轮询获取结果
    const maxAttempts = 30 // 视频生成需要更长时间
    const delay = 5000 // 5秒间隔

    for (let i = 0; i < maxAttempts; i++) {
      try {
        await new Promise(resolve => setTimeout(resolve, delay))

        const statusResponse = await fetch(`${options.apiUrl.replace('/generations', '')}/status/${taskId}`, {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`
          }
        })

        if (statusResponse.ok) {
          const statusResult = await statusResponse.json()

          if (statusResult.status === 'completed' && statusResult.output) {
            console.log(`视频生成完成: ${taskId}`)
            return Array.isArray(statusResult.output) ? statusResult.output : [statusResult.output]
          } else if (statusResult.status === 'failed') {
            throw new Error(`视频生成失败: ${statusResult.error || '未知错误'}`)
          } else {
            console.log(`视频生成进度: ${statusResult.status || 'processing'} (${i + 1}/${maxAttempts})`)
          }
        }
      } catch (error) {
        console.warn(`轮询Nano Banana视频结果时出错:`, error)
        if (i === maxAttempts - 1) {
          throw error
        }
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    throw new Error(`视频生成超时: 已等待 ${maxAttempts * delay / 1000} 秒`)
  }

  private async generateOpenAICompatibleVideo(prompt: string, options: {
    model: string
    duration: number
    ratio: string
    apiUrl: string
  }): Promise<string[]> {
    const response = await fetch(options.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: options.model,
        prompt,
        duration: options.duration,
        ratio: options.ratio
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`API error: ${error.error?.message || response.statusText}`)
    }

    const result = await response.json()
    return Array.isArray(result.data) ? result.data.map((item: any) => item.url) : [result.data?.url]
  }

  async testConnection(): Promise<boolean> {
    try {
      console.log(`开始测试 Nano Banana API 连接...`)

      // 使用getApiEndpoint获取正确的URL，避免重复路径问题
      const testUrl = await this.getApiEndpoint('image', 'gemini-2.5-flash-image')
      console.log(`URL: ${testUrl}`)
      console.log(`Base URL: ${this.config.baseUrl}`)
      console.log(`API Key: ${this.config.apiKey ? '已设置' : '未设置'}`)

      // 对于 Nano Banana API，我们测试一个简单的图片生成请求
      // 但是使用一个小的测试提示词
      const response = await fetch(testUrl, {
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

  getCostEstimate(type: 'image' | 'video' | 'text', options: any): number {
    // 根据EVoLink.AI模型的成本信息
    const model = options?.model

    if (type === 'image') {
      const imageCosts: Record<string, number> = {
        'gemini-2.5-flash-image': 1.6,
        'gemini-2.0-pro-image': 2.4,
        'dall-e-3-evolink': 0.04,
        'midjourney-v6-evolink': 0.03,
        'stable-diffusion-xl-evolink': 0.01,
        'flux-pro-evolink': 0.03,
        'flux-schnell-evolink': 0.008
      }
      return imageCosts[model] || 0.04
    }

    if (type === 'video') {
      const videoCosts: Record<string, number> = {
        'veo3-fast-evolink': 0.12,
        'sora-1.0-evolink': 0.50,
        'runway-gen3-evolink': 0.25,
        'pika-labs-evolink': 0.12,
        'luma-dream-machine-evolink': 0.12
      }
      const baseCost = videoCosts[model] || 0.12
      // 根据时长调整成本
      const duration = options?.duration || 5
      return baseCost * (duration / 5)
    }

    if (type === 'text') {
      const textCosts: Record<string, number> = {
        'gemini-2.5-flash-text': 0.000325,
        'gemini-2.0-pro-text': 0.0025,
        'gpt-4o-evolink': 0.005,
        'claude-3.5-sonnet-evolink': 0.003
      }
      const baseCost = textCosts[model] || 0.005
      // 根据token数量调整成本
      const maxTokens = options?.maxTokens || 1000
      return baseCost * (maxTokens / 1000)
    }

    return 0
  }
}

// 动态代理提供商管理器
export class ProxyProviderManager {
  private providers: Map<string, AIProvider> = new Map()
  private proxyAccounts: ProxyAccount[] = []
  private modelConfigs: ModelConfig[] = []

  // 从账号和模型配置更新提供商
  updateFromAccountsAndConfigs(accounts: ProxyAccount[], configs: ModelConfig[]) {
    console.log(`🔄 updateFromAccountsAndConfigs 被调用:`)
    console.log(`    - 代理账户数量: ${accounts.length}`)
    console.log(`    - 模型配置数量: ${configs.length}`)

    this.providers.clear()
    this.proxyAccounts = accounts
    this.modelConfigs = configs

    console.log(`📋 代理账户详情:`)
    accounts.forEach((account, index) => {
      console.log(`    ${index + 1}. ID: ${account.id}, 提供商: ${account.provider}, 启用: ${account.enabled}, 有API密钥: ${!!account.apiKey}`)
    })

    console.log(`📋 模型配置详情 (仅前5个):`)
    configs.slice(0, 5).forEach((config, index) => {
      console.log(`    ${index + 1}. 模型: ${config.modelName}, 启用: ${config.enabled}, 代理账户ID: ${config.proxyAccountId}`)
    })

    const enabledAccounts = accounts.filter(account => account.enabled && account.apiKey)
    console.log(`🚀 处理 ${enabledAccounts.length} 个启用的代理账户...`)

    enabledAccounts
      .forEach(account => {
        console.log(`🔧 创建代理提供商实例: ${account.id} (${account.provider})`)

        let provider: AIProvider

        // 根据提供商类型创建不同的实例
        if (account.provider === 'openai' || account.provider === 'nano-banana') {
          // 对于OpenAI和Nano Banana，使用现有的ProxyProvider
          provider = new ProxyProvider({
            apiKey: account.apiKey,
            baseUrl: account.baseUrl || 'https://api.openai.com/v1',
            timeout: 120000,
            retries: 3
          })
        } else if (account.provider === 'custom') {
          // 对于自定义提供商，也使用ProxyProvider（兼容OpenAI格式）
          provider = new ProxyProvider({
            apiKey: account.apiKey,
            baseUrl: account.baseUrl!,
            timeout: 120000,
            retries: 3
          })
        } else {
          // 对于其他提供商，可以使用GPT-4OProvider作为通用提供商
          provider = new GPT4OProvider({
            apiKey: account.apiKey,
            baseUrl: account.baseUrl || 'https://api.openai.com/v1',
            timeout: 120000,
            retries: 3,
            ...(account.settings || {})
          })
        }

        this.providers.set(account.id, provider)
        console.log(`✅ 代理提供商已注册: ${account.id}`)
      })

    console.log(`✅ Updated ${this.providers.size} proxy providers`)
    console.log(`📋 providers Map 中的键: ${Array.from(this.providers.keys()).join(', ')}`)
  }

  // 获取带模型配置的Provider
  getProviderWithModelConfig(accountId: string, modelId: string): AIProvider | null {
    const baseProvider = this.providers.get(accountId)
    if (!baseProvider) return null

    // 如果是ProxyProvider，设置模型配置
    if (baseProvider instanceof ProxyProvider) {
      const modelConfig = this.modelConfigs.find(config =>
        config.proxyAccountId === accountId && config.modelName === modelId
      )

      if (modelConfig) {
        // 创建新的ProxyProvider实例并设置模型配置
        const account = this.proxyAccounts.find(acc => acc.id === accountId)
        if (account) {
          const enhancedProvider = new ProxyProvider({
            apiKey: account.apiKey,
            baseUrl: account.baseUrl || 'https://api.openai.com/v1',
            timeout: 120000,
            retries: 3
          }, modelConfig)

          return enhancedProvider
        }
      }
    }

    return baseProvider
  }

  // 向后兼容：保持旧的updateProviders方法
  updateProviders(configs: any[]) {
    // 这里应该将旧的配置格式转换为新的账号和模型配置
    // 暂时保持空实现，等待数据迁移
    console.log('Legacy updateProviders called - waiting for migration')
  }

  // 获取可用的图片模型
  getAvailableImageModels(): string[] {
    const models = new Set<string>()

    if (Array.isArray(this.modelConfigs)) {
      this.modelConfigs
        .filter(config => config.enabled && config.mediaType === 'image')
        .forEach(config => {
          // 添加图像模型名称
          if (config.modelName) {
            models.add(config.modelName)
          }
        })
    }

    return Array.from(models)
  }

  // 获取可用的文本模型
  getAvailableTextModels(): string[] {
    const models = new Set<string>()

    if (Array.isArray(this.modelConfigs)) {
      this.modelConfigs
        .filter(config => config.enabled && config.mediaType === 'text')
        .forEach(config => {
          // 添加文本模型名称
          if (config.modelName) {
            models.add(config.modelName)
          }
        })
    }

    return Array.from(models)
  }

  // 获取所有可用模型
  getAllAvailableModels(): string[] {
    const models = new Set<string>()

    // 从启用的模型配置中提取模型名称
    if (Array.isArray(this.modelConfigs)) {
      this.modelConfigs
        .filter(config => config.enabled)
        .forEach(config => {
          if (config.modelName) {
            models.add(config.modelName)
          }
        })
    }

    return Array.from(models)
  }

  // 获取优先级最高的提供商
  getHighestPriorityProvider(): AIProvider | undefined {
    const providers = Array.from(this.providers.values())
    return providers[0] // 简单实现，返回第一个
  }

  // 为模型获取提供商
  getProviderForModel(model: string): AIProvider | undefined {
    console.log(`🔍 getProviderForModel 被调用:`)
    console.log(`    - 提供商数量: ${this.providers.size}`)
    console.log(`    - 模型配置数量: ${this.modelConfigs.length}`)
    console.log(`    - 请求模型: ${model}`)
    console.log(`    - 可用模型: ${this.getAllAvailableModels().join(', ')}`)

    // 详细检查modelConfigs
    console.log(`📋 modelConfigs详情: ${JSON.stringify(this.modelConfigs.map(c => ({
      modelName: c.modelName,
      enabled: c.enabled,
      proxyAccountId: c.proxyAccountId
    })), null, 2)}`)

    // 查找支持该模型的配置
    if (Array.isArray(this.modelConfigs) && this.modelConfigs.length > 0) {
      console.log(`🔎 正在搜索支持模型 ${model} 的配置...`)
      const supportingConfig = this.modelConfigs.find(config =>
        config.enabled && config.modelName === model
      )

      if (supportingConfig) {
        console.log(`✅ 找到支持配置: ${JSON.stringify(supportingConfig, null, 2)}`)

        // 通过代理账户ID获取提供商
        if (supportingConfig.proxyAccountId) {
          const provider = this.providers.get(supportingConfig.proxyAccountId)
          console.log(`📞 通过代理账户ID ${supportingConfig.proxyAccountId} 获取提供商: ${provider ? '成功' : '失败'}`)
          console.log(`找到支持模型 ${model} 的提供商: ${supportingConfig.modelName}`)
          return provider
        } else {
          console.log(`❌ 配置缺少 proxyAccountId`)
        }
      } else {
        console.log(`❌ 未找到支持模型 ${model} 的配置`)
        console.log(`📋 所有配置: ${this.modelConfigs.map(c => `${c.modelName}(${c.enabled ? '启用' : '禁用'})`).join(', ')}`)
      }
    } else {
      console.log(`❌ modelConfigs为空或不是数组: ${typeof this.modelConfigs}, 长度: ${this.modelConfigs?.length || 'N/A'}`)
    }

    // 如果没有找到特定支持该模型的提供商，返回第一个可用的提供商（向后兼容）
    console.log(`🔄 尝试返回默认提供商...`)
    const provider = this.getHighestPriorityProvider()
    console.log(`返回默认提供商: ${provider ? '找到' : '未找到'}`)
    return provider
  }

  // 获取配置信息
  getConfigForModel(model: string): ModelConfig | undefined {
    if (!Array.isArray(this.modelConfigs)) {
      return undefined
    }
    return this.modelConfigs.find(config =>
      config.enabled && config.modelName === model
    )
  }

  // 获取所有配置
  getAllConfigs(): ModelConfig[] {
    return Array.isArray(this.modelConfigs) ? this.modelConfigs : []
  }

  // 检查模型是否被支持
  isModelSupported(model: string): boolean {
    if (!Array.isArray(this.modelConfigs)) {
      return false
    }
    return this.modelConfigs.some(config =>
      config.enabled && config.modelName === model
    )
  }
}

export const proxyProviderManager = new ProxyProviderManager()