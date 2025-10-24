import { ProxyAccount } from '@/app/api/proxy-accounts/route'

export interface ProxyAccountValidationResult {
  valid: boolean
  error?: string
  availableModels?: string[]
  isTestMode?: boolean
  warning?: string
}

export class ProxyAccountManager {
  private static instance: ProxyAccountManager
  private accounts: ProxyAccount[] = []
  private lastLoad: Date | null = null

  // 检测是否为开发环境
  private isDevelopmentMode(): boolean {
    return process.env.NODE_ENV === 'development' ||
           process.env.NEXT_PUBLIC_NODE_ENV === 'development' ||
           typeof window !== 'undefined' && window.location.hostname === 'localhost'
  }

  // 检测是否为测试API Key
  private isTestApiKey(apiKey: string): boolean {
    const testPatterns = [
      'sk-test',
      'sk_test',
      'test-key',
      'fake-key',
      'mock-key',
      'demo-key',
      'sample-key',
      'sk-123',
      'sk-111',
      'sk-000',
      'sk-clean-test',
      'sk-new-test'
    ]
    return testPatterns.some(pattern => apiKey.toLowerCase().includes(pattern.toLowerCase()))
  }

  // 检测是否为EvoLink.AI API
  private isEvoLinkAccount(baseUrl: string): boolean {
    return baseUrl ? baseUrl.includes('evolink.ai') : false
  }

  // 检测API模态类型
  private getApiModality(baseUrl: string): 'text' | 'image' | 'video' | 'unknown' {
    if (!baseUrl) return 'unknown'
    if (baseUrl.includes('/chat/completions')) return 'text'
    if (baseUrl.includes('/images/generations')) return 'image'
    if (baseUrl.includes('/videos/generations')) return 'video'
    return 'image' // 默认为图片生成
  }

  // 获取EVoLink.AI支持的所有模态类型
  private getEvoLinkSupportedModalities(baseUrl: string): ('text' | 'image' | 'video')[] {
    if (!this.isEvoLinkAccount(baseUrl)) return []

    const baseEvoLinkUrl = baseUrl.replace(/\/(images|videos|chat)\/generations|\/chat\/completions$/, '')
    const supported: ('text' | 'image' | 'video')[] = []

    // EvoLink.AI支持所有模态
    supported.push('text', 'image', 'video')
    return supported
  }

  // 检测EVoLink.AI账号的可用模态
  private async detectEvoLinkModalities(account: ProxyAccount): Promise<ProxyAccountValidationResult> {
    if (!account.baseUrl) {
      return { valid: false, error: 'Base URL is required for EvoLink.AI account' }
    }
    const baseEvoLinkUrl = account.baseUrl.replace(/\/(images|videos|chat)\/generations|\/chat\/completions$/, '')
    const supported = this.getEvoLinkSupportedModalities(account.baseUrl)

    console.log(`检测EVoLink.AI支持模态:`, {
      baseUrl: account.baseUrl,
      supportedModalities: supported
    })

    // 从数据库获取EvoLink.AI模型配置
    let allModels: string[] = []

    try {
      // 尝试从数据库获取用户自定义模型
      const { withDatabase } = await import('@/lib/database')
      const userModels = await withDatabase(async (db) => {
        return await db.getUserEvoLinkModelsByAccount(account.id || '')
      })

      if (userModels.length > 0) {
        // 使用用户配置的模型
        const enabledModels = userModels
          .filter(model => model.enabled)
          .map(model => model.modelId)

        allModels.push(...enabledModels)
        console.log(`使用数据库中的用户配置模型: ${enabledModels.length} 个`)
      } else {
        // 如果没有用户配置，从模板获取默认模型
        const templates = await withDatabase(async (db) => {
          return await db.getEvoLinkTemplates()
        })

        if (templates.length > 0) {
          const templateModels = templates
            .filter(template => template.enabled)
            .map(template => template.modelId)

          allModels.push(...templateModels)
          console.log(`使用数据库中的模板模型: ${templateModels.length} 个`)
        } else {
          // 数据库中没有模型，使用硬编码的默认模型（向后兼容）
          if (supported.includes('text')) {
            allModels.push(...['gemini-2.5-flash-text', 'gemini-2.0-pro-text', 'gpt-4o-evolink', 'claude-3.5-sonnet-evolink'])
          }
          if (supported.includes('image')) {
            allModels.push(...['gemini-2.5-flash-image', 'gemini-2.0-pro-image', 'dall-e-3-evolink', 'midjourney-v6-evolink', 'stable-diffusion-xl-evolink', 'flux-pro-evolink', 'flux-schnell-evolink'])
          }
          if (supported.includes('video')) {
            allModels.push(...['veo3-fast-evolink', 'sora-1.0-evolink', 'runway-gen3-evolink', 'pika-labs-evolink', 'luma-dream-machine-evolink'])
          }
          console.log('使用硬编码的默认模型（向后兼容）')
        }
      }
    } catch (error) {
      console.warn('从数据库读取EvoLink.AI模型失败，使用硬编码默认值:', error)

      // 数据库访问失败时，使用硬编码的默认模型（向后兼容）
      if (supported.includes('text')) {
        allModels.push(...['gemini-2.5-flash-text', 'gemini-2.0-pro-text', 'gpt-4o-evolink', 'claude-3.5-sonnet-evolink'])
      }
      if (supported.includes('image')) {
        allModels.push(...['gemini-2.5-flash-image', 'gemini-2.0-pro-image', 'dall-e-3-evolink', 'midjourney-v6-evolink', 'stable-diffusion-xl-evolink', 'flux-pro-evolink', 'flux-schnell-evolink'])
      }
      if (supported.includes('video')) {
        allModels.push(...['veo3-fast-evolink', 'sora-1.0-evolink', 'runway-gen3-evolink', 'pika-labs-evolink', 'luma-dream-machine-evolink'])
      }
    }

    return {
      valid: true,
      availableModels: allModels,
      warning: `EvoLink.AI支持: ${supported.join(', ')} 生成，可用模型: ${allModels.length} 个`
    }
  }

  private constructor() {}

  static getInstance(): ProxyAccountManager {
    if (!ProxyAccountManager.instance) {
      ProxyAccountManager.instance = new ProxyAccountManager()
    }
    return ProxyAccountManager.instance
  }

  async loadAccounts(): Promise<ProxyAccount[]> {
    try {
      const response = await fetch('/api/proxy-accounts')
      const result = await response.json()

      if (result.success) {
        this.accounts = result.data
        this.lastLoad = new Date()
        return this.accounts
      } else {
        console.error('Failed to load proxy accounts:', result.error)
        return []
      }
    } catch (error) {
      console.error('Error loading proxy accounts:', error)
      return []
    }
  }

  async getAccounts(): Promise<ProxyAccount[]> {
    // 如果5分钟内没有加载过，重新加载
    if (!this.lastLoad || (Date.now() - this.lastLoad.getTime()) > 5 * 60 * 1000) {
      await this.loadAccounts()
    }
    return this.accounts
  }

  async getAccount(id: string): Promise<ProxyAccount | null> {
    const accounts = await this.getAccounts()
    return accounts.find(account => account.id === id) || null
  }

  async createAccount(account: Omit<ProxyAccount, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProxyAccount | null> {
    try {
      const response = await fetch('/api/proxy-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(account)
      })

      const result = await response.json()

      if (result.success) {
        await this.loadAccounts() // 重新加载账号
        return result.data
      } else {
        console.error('Failed to create proxy account:', result.error)
        return null
      }
    } catch (error) {
      console.error('Error creating proxy account:', error)
      return null
    }
  }

  async updateAccount(id: string, updates: Partial<ProxyAccount>): Promise<ProxyAccount | null> {
    try {
      const response = await fetch('/api/proxy-accounts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates })
      })

      const result = await response.json()

      if (result.success) {
        await this.loadAccounts() // 重新加载账号
        return result.data
      } else {
        console.error('Failed to update proxy account:', result.error)
        return null
      }
    } catch (error) {
      console.error('Error updating proxy account:', error)
      return null
    }
  }

  async deleteAccount(id: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/proxy-accounts?id=${id}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        await this.loadAccounts() // 重新加载账号
        return true
      } else {
        console.error('Failed to delete proxy account:', result.error)
        return false
      }
    } catch (error) {
      console.error('Error deleting proxy account:', error)
      return false
    }
  }

  async validateAccount(account: ProxyAccount): Promise<ProxyAccountValidationResult> {
    try {
      // 根据提供商类型进行验证
      switch (account.provider) {
        case 'openai':
          return this.validateOpenAIAccount(account)
        case 'anthropic':
          return this.validateAnthropicAccount(account)
        case 'google':
          return this.validateGoogleAccount(account)
        case 'nano-banana':
          return this.validateNanoBananaAccount(account)
        case 'custom':
          return this.validateCustomAccount(account)
        default:
          return { valid: false, error: `Unknown provider: ${account.provider}` }
      }
    } catch (error) {
      return { valid: false, error: `Validation failed: ${error instanceof Error ? error.message : String(error)}` }
    }
  }

  private async validateOpenAIAccount(account: ProxyAccount): Promise<ProxyAccountValidationResult> {
    if (!account.apiKey) {
      return { valid: false, error: 'API Key is required' }
    }

    const baseUrl = account.baseUrl || 'https://api.openai.com/v1'

    // 开发模式下的测试API Key处理
    if (this.isDevelopmentMode() && this.isTestApiKey(account.apiKey)) {
      console.log('🔧 开发模式：检测到测试API Key，跳过真实验证')
      return {
        valid: true,
        isTestMode: true,
        warning: '开发模式：使用测试API Key，未进行真实验证',
        availableModels: [
          'dall-e-3',
          'dall-e-2',
          'gpt-4',
          'gpt-4-turbo',
          'gpt-3.5-turbo'
        ]
      }
    }

    try {
      // 测试API连接
      const response = await fetch(`${baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${account.apiKey}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        // 提供更友好的错误信息
        if (response.status === 401) {
          return { valid: false, error: 'API Key无效或已过期，请检查您的API密钥' }
        } else if (response.status === 429) {
          return { valid: false, error: 'API请求频率过高，请稍后再试' }
        } else if (response.status === 403) {
          return { valid: false, error: 'API访问被拒绝，请检查账户权限' }
        } else {
          return { valid: false, error: `API验证失败 (${response.status}): ${response.statusText}` }
        }
      }

      const data = await response.json()
      const availableModels = data.data?.map((model: any) => model.id) || []

      return { valid: true, availableModels }
    } catch (error) {
      // 提供更友好的错误信息
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (errorMessage.includes('fetch')) {
        return {
          valid: false,
          error: '网络连接失败，请检查网络连接或Base URL是否正确',
          warning: '如果使用代理，请确保网络连接正常'
        }
      } else {
        return { valid: false, error: `连接测试失败: ${errorMessage}` }
      }
    }
  }

  private async validateAnthropicAccount(account: ProxyAccount): Promise<ProxyAccountValidationResult> {
    if (!account.apiKey) {
      return { valid: false, error: 'API Key is required' }
    }

    // Anthropic API验证逻辑
    return { valid: true }
  }

  private async validateGoogleAccount(account: ProxyAccount): Promise<ProxyAccountValidationResult> {
    if (!account.apiKey) {
      return { valid: false, error: 'API Key is required' }
    }

    // Google API验证逻辑
    return { valid: true }
  }

  private async validateNanoBananaAccount(account: ProxyAccount): Promise<ProxyAccountValidationResult> {
    if (!account.apiKey) {
      return { valid: false, error: 'API Key is required' }
    }

    if (!account.baseUrl) {
      return { valid: false, error: 'Base URL is required for Nano Banana' }
    }

    const isEvoLink = this.isEvoLinkAccount(account.baseUrl)
    const serviceName = isEvoLink ? 'EvoLink.AI' : 'Nano Banana'

    // 开发模式下的测试API Key处理
    if (this.isDevelopmentMode() && this.isTestApiKey(account.apiKey)) {
      console.log(`🔧 开发模式：检测到${serviceName}测试API Key，跳过真实验证`)

      if (isEvoLink) {
        // 对于EVoLink.AI，检测所有支持的模态
        return await this.detectEvoLinkModalities(account)
      } else {
        // 原Nano Banana模型
        const availableModels = [
          'gemini-2.5-flash-image',
          'gemini-2.0-pro-image',
          'gemini-1.5-pro',
          'gemini-1.5-flash'
        ]

        return {
          valid: true,
          isTestMode: true,
          warning: `开发模式：使用测试API Key，未进行真实验证 (仅支持图片生成)`,
          availableModels
        }
      }
    }

    try {
      // 检测API模态类型
      const modality = this.getApiModality(account.baseUrl)

      // 对于EVoLink.AI，使用多模态检测
      if (isEvoLink) {
        return await this.detectEvoLinkModalities(account)
      }

      // 根据模态类型准备测试数据
      let testPayload: any = {}

      switch (modality) {
        case 'text':
          testPayload = {
            model: 'gemini-2.5-flash-text',
            messages: [{ role: 'user', content: 'Hello, test message' }]
          }
          break
        case 'image':
          testPayload = {
            model: 'gemini-2.5-flash-image',
            prompt: 'test image',
            size: '1:1'
          }
          break
        case 'video':
          testPayload = {
            model: 'veo3-fast',
            prompt: 'test video'
          }
          break
        default:
          testPayload = {
            model: 'gemini-2.5-flash-image',
            prompt: 'test',
            size: '1:1'
          }
      }

      console.log(`🧪 测试${serviceName} ${modality} API: ${account.baseUrl}`)

      // 测试API
      const response = await fetch(account.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${account.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testPayload)
      })

      // 根据模态类型返回不同的模型列表（非EVoLink.AI）
      const getModelsForService = () => {
        switch (modality) {
          case 'text':
            return ['gemini-2.5-flash-text', 'gemini-2.0-pro-text', 'gpt-4', 'claude-3']
          case 'image':
            return ['gemini-2.5-flash-image', 'gemini-2.0-pro-image', 'dall-e-3', 'midjourney-v6']
          case 'video':
            return ['veo3-fast', 'sora-1.0', 'runway-gen3', 'pika-labs']
          default:
            return ['gemini-2.5-flash-image', 'gemini-2.0-pro-image', 'gemini-1.5-pro']
        }
      }

      // 如果返回 402 (配额不足) 或 401 (认证失败)，说明连接是正常的，只是没有配额
      if (response.status === 402) {
        return {
          valid: true,
          warning: `${serviceName} API连接成功，但账户配额不足`,
          availableModels: getModelsForService()
        }
      } else if (response.status === 401) {
        return {
          valid: true,
          warning: `${serviceName} API连接成功，但API Key需要验证`,
          availableModels: getModelsForService()
        }
      } else if (response.ok) {
        return {
          valid: true,
          availableModels: getModelsForService()
        }
      } else {
        // 提供更友好的错误信息
        if (response.status === 403) {
          return { valid: false, error: `${serviceName} API访问被拒绝，请检查账户权限` }
        } else if (response.status === 429) {
          return { valid: false, error: `${serviceName} API请求频率过高，请稍后再试` }
        } else {
          return { valid: false, error: `${serviceName} API验证失败 (${response.status}): ${response.statusText}` }
        }
      }
    } catch (error) {
      // 提供更友好的错误信息
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (errorMessage.includes('fetch')) {
        return {
          valid: false,
          error: `${serviceName} API网络连接失败，请检查Base URL是否正确`,
          warning: '请确保URL格式正确'
        }
      } else {
        return { valid: false, error: `${serviceName}连接测试失败: ${errorMessage}` }
      }
    }
  }

  private async validateCustomAccount(account: ProxyAccount): Promise<ProxyAccountValidationResult> {
    if (!account.baseUrl) {
      return { valid: false, error: 'Base URL is required for custom provider' }
    }

    // 自定义提供商验证逻辑
    return { valid: true }
  }

  async getAccountByProvider(provider: string): Promise<ProxyAccount | null> {
    const accounts = await this.getAccounts()
    return accounts.find(account => account.provider === provider && account.enabled) || null
  }

  async getAccountForModel(modelName: string): Promise<ProxyAccount | null> {
    // 这个方法需要与模型配置管理器配合工作
    // 暂时返回第一个可用的账号
    const accounts = await this.getAccounts()
    return accounts.find(account => account.enabled) || null
  }

  getProviderIcon(provider: string): string {
    switch (provider) {
      case 'openai': return '🤖'
      case 'anthropic': return '🧠'
      case 'google': return '🔍'
      case 'nano-banana': return '🍌'
      case 'custom': return '⚙️'
      default: return '🔧'
    }
  }

  getProviderDisplayName(provider: string): string {
    switch (provider) {
      case 'openai': return 'OpenAI'
      case 'anthropic': return 'Anthropic'
      case 'google': return 'Google AI'
      case 'nano-banana': return 'Nano Banana'
      case 'custom': return 'Custom'
      default: return provider
    }
  }
}

// 导出单例实例
export const proxyAccountManager = ProxyAccountManager.getInstance()