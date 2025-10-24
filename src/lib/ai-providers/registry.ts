import { AIProvider, AIProviderConfig } from './index'
import { OpenAIProvider, OpenAICompatibleProvider } from './openai'
import { StabilityAIProvider } from './stability'
import { RunwayProvider, PikaLabsProvider } from './video'
import { ProxyProvider, proxyProviderManager } from './proxy'
import { GPT4OProvider } from './gpt4o'
import { readFile, mkdir } from 'fs/promises'
import { join } from 'path'

// AI 提供商注册表
export class AIProviderRegistry {
  private providers: Map<string, AIProvider> = new Map()
  private configs: Map<string, AIProviderConfig> = new Map()

  // 注册提供商
  register(name: string, provider: AIProvider, config: AIProviderConfig) {
    this.providers.set(name, provider)
    this.configs.set(name, config)
  }

  // 获取提供商
  get(name: string): AIProvider | undefined {
    return this.providers.get(name)
  }

  // 获取配置
  getConfig(name: string): AIProviderConfig | undefined {
    return this.configs.get(name)
  }

  // 获取所有提供商名称
  list(): string[] {
    return Array.from(this.providers.keys())
  }

  // 测试提供商连接
  async testConnection(name: string): Promise<boolean> {
    const provider = this.providers.get(name)
    if (!provider) return false

    try {
      return await provider.testConnection()
    } catch (error) {
      return false
    }
  }

  // 获取成本估算
  getCostEstimate(providerName: string, type: 'image' | 'video', options?: any): number {
    const provider = this.providers.get(providerName)
    if (!provider) return 0

    return provider.getCostEstimate(type, options)
  }
}

// 创建全局注册表实例
export const aiRegistry = new AIProviderRegistry()

// 初始化默认提供商
export async function initializeProviders() {
  // 首先初始化代理配置
  await initializeProxyProviders()

  // OpenAI
  if (process.env.OPENAI_API_KEY) {
    aiRegistry.register(
      'openai',
      new OpenAIProvider({
        apiKey: process.env.OPENAI_API_KEY,
        baseUrl: process.env.OPENAI_BASE_URL,
        timeout: parseInt(process.env.OPENAI_TIMEOUT || '60000'),
        retries: parseInt(process.env.OPENAI_RETRIES || '3'),
      }),
      {
        apiKey: process.env.OPENAI_API_KEY,
        baseUrl: process.env.OPENAI_BASE_URL,
        timeout: parseInt(process.env.OPENAI_TIMEOUT || '60000'),
        retries: parseInt(process.env.OPENAI_RETRIES || '3'),
      }
    )
  }

  // Stability AI
  if (process.env.STABILITY_API_KEY) {
    aiRegistry.register(
      'stability-ai',
      new StabilityAIProvider({
        apiKey: process.env.STABILITY_API_KEY,
        baseUrl: process.env.STABILITY_BASE_URL,
        timeout: parseInt(process.env.STABILITY_TIMEOUT || '120000'),
        retries: parseInt(process.env.STABILITY_RETRIES || '3'),
      }),
      {
        apiKey: process.env.STABILITY_API_KEY,
        baseUrl: process.env.STABILITY_BASE_URL,
        timeout: parseInt(process.env.STABILITY_TIMEOUT || '120000'),
        retries: parseInt(process.env.STABILITY_RETRIES || '3'),
      }
    )
  }

  // Runway
  if (process.env.RUNWAY_API_KEY) {
    aiRegistry.register(
      'runway',
      new RunwayProvider({
        apiKey: process.env.RUNWAY_API_KEY,
        baseUrl: process.env.RUNWAY_BASE_URL,
        timeout: parseInt(process.env.RUNWAY_TIMEOUT || '300000'),
        retries: parseInt(process.env.RUNWAY_RETRIES || '3'),
      }),
      {
        apiKey: process.env.RUNWAY_API_KEY,
        baseUrl: process.env.RUNWAY_BASE_URL,
        timeout: parseInt(process.env.RUNWAY_TIMEOUT || '300000'),
        retries: parseInt(process.env.RUNWAY_RETRIES || '3'),
      }
    )
  }

  // Pika Labs
  if (process.env.PIKA_API_KEY) {
    aiRegistry.register(
      'pika-labs',
      new PikaLabsProvider({
        apiKey: process.env.PIKA_API_KEY,
        baseUrl: process.env.PIKA_BASE_URL,
        timeout: parseInt(process.env.PIKA_TIMEOUT || '300000'),
        retries: parseInt(process.env.PIKA_RETRIES || '3'),
      }),
      {
        apiKey: process.env.PIKA_API_KEY,
        baseUrl: process.env.PIKA_BASE_URL,
        timeout: parseInt(process.env.PIKA_TIMEOUT || '300000'),
        retries: parseInt(process.env.PIKA_RETRIES || '3'),
      }
    )
  }

  // 自定义 OpenAI 兼容服务
  if (process.env.CUSTOM_AI_API_KEY && process.env.CUSTOM_AI_BASE_URL) {
    aiRegistry.register(
      'custom-ai',
      new OpenAICompatibleProvider({
        apiKey: process.env.CUSTOM_AI_API_KEY,
        baseUrl: process.env.CUSTOM_AI_BASE_URL,
        timeout: parseInt(process.env.CUSTOM_AI_TIMEOUT || '120000'),
        retries: parseInt(process.env.CUSTOM_AI_RETRIES || '3'),
      }),
      {
        apiKey: process.env.CUSTOM_AI_API_KEY,
        baseUrl: process.env.CUSTOM_AI_BASE_URL,
        timeout: parseInt(process.env.CUSTOM_AI_TIMEOUT || '120000'),
        retries: parseInt(process.env.CUSTOM_AI_RETRIES || '3'),
      }
    )
  }
}

// 模型映射到提供商
export const modelProviderMap: Record<string, string> = {
  // OpenAI 模型
  'dall-e-3': 'openai',
  'dall-e-2': 'openai',
  'sora-1.0': 'openai',

  // Stability AI 模型
  'stable-diffusion-xl': 'stability-ai',
  'stable-diffusion-xl-1024-v1-0': 'stability-ai',
  'stable-diffusion-xl-1024-v0-9': 'stability-ai',
  'stable-diffusion-512-v2-1': 'stability-ai',
  'stable-diffusion-768-v2-1': 'stability-ai',
  'stable-diffusion-3': 'stability-ai',
  'stable-diffusion-2.1': 'stability-ai',
  'sdxl-turbo': 'stability-ai',
  'stable-video': 'stability-ai',
  'stable-video-diffusion-img2vid': 'stability-ai',
  'stable-video-xt': 'stability-ai',

  // Flux 模型（通过自定义 API）
  'flux-pro': 'custom-ai',
  'flux-schnell': 'custom-ai',
  'flux-dev': 'custom-ai',

  // MidJourney 模型（通过自定义 API）
  'midjourney-v6': 'custom-ai',
  'midjourney-v5.2': 'custom-ai',

  // Runway 模型
  'runway-gen3': 'runway',
  'runway-gen2': 'runway',
  'runway-gen3-turbo': 'runway',

  // Pika 模型
  'pika-labs': 'pika-labs',
  'pika-1.5': 'pika-labs',

  // Nano Banana 代理模型
  'gemini-2.5-flash-image': 'proxy',
  'gemini-2.0-pro-image': 'proxy',

  // GPT-4O 模型（通过代理）
  'gpt-4o': 'proxy',
  'gpt-4o-mini': 'proxy',
  'gpt-4o-turbo': 'proxy',
  'gpt-4o-image': 'proxy',

  // 其他模型（通过自定义 API）
  'ideogram-2.0': 'custom-ai',
  'kandinsky-3.0': 'custom-ai',
  'luma-dream-machine': 'custom-ai',
  'kling-v1': 'custom-ai',
}

// 获取模型对应的提供商
export function getProviderForModel(model: string): AIProvider | undefined {
  const providerName = modelProviderMap[model]
  if (!providerName) return undefined

  // 对于代理提供商，从代理管理器中获取
  if (providerName === 'proxy') {
    return proxyProviderManager.getProviderForModel(model)
  }

  return aiRegistry.get(providerName)
}

// 检查模型是否可用
export function isModelAvailable(model: string): boolean {
  const provider = getProviderForModel(model)
  return !!provider
}

// 从文件加载配置
async function loadConfigsFromFile(): Promise<any[]> {
  try {
    const configPath = join(process.cwd(), 'data', 'proxy-configs.json')
    await mkdir(join(process.cwd(), 'data'), { recursive: true })
    const data = await readFile(configPath, 'utf-8')
    const configs = JSON.parse(data)
    console.log('从文件加载了配置:', configs.length, '个')
    return configs
  } catch (error) {
    console.log('配置文件不存在或读取失败，使用默认配置')
    return []
  }
}

// 初始化代理提供商 - 修复版本（避免token limit错误）
async function initializeProxyProviders() {
  try {
    console.log('🚀 初始化代理提供商...');

    // 从数据库加载代理账户和模型配置
    const { withDatabase } = await import('@/lib/database')
    const { proxyAccountManager } = await import('@/lib/proxy-account-manager')

    await withDatabase(async (db) => {
      // 获取启用的代理账户
      const accounts = await db.getProxyAccounts({ enabled: true })
      console.log(`找到 ${accounts.length} 个启用的代理账户`)

      // 获取启用的模型配置
      const modelConfigs = await db.getModelConfigs({ enabled: true })
      console.log(`找到 ${modelConfigs.length} 个启用的模型配置`)

      // 更新代理提供商管理器
      proxyProviderManager.updateFromAccountsAndConfigs(accounts, modelConfigs)

      // 为每个启用的代理账户创建AI提供商
      for (const account of accounts) {
        try {
          const provider = new ProxyProvider({
            apiKey: account.apiKey,
            baseUrl: account.baseUrl || 'https://api.openai.com/v1',
            timeout: 120000,
            retries: 3
          })

          // 设置模型配置
          const accountModelConfigs = modelConfigs.filter(config => config.proxyAccountId === account.id)
          provider.setModelConfig(accountModelConfigs)

          // 注册到AI注册表
          aiRegistry.register(
            account.id!,
            provider,
            {
              apiKey: account.apiKey,
              baseUrl: account.baseUrl,
              timeout: 120000,
              retries: 3
            }
          )

          console.log(`✅ 已注册代理提供商: ${account.name}`)
        } catch (error) {
          console.warn(`注册代理提供商失败 ${account.name}:`, error)
        }
      }
    })

    console.log('✅ 代理提供商初始化完成')
  } catch (error) {
    console.warn('代理提供商初始化失败:', error);
    // 设置一个空的默认配置，避免系统崩溃
    const emptyConfig = {
      id: 'empty-config',
      name: 'Empty Configuration',
      baseUrl: '',
      apiKey: '',
      textModel: 'gemini-2.5-flash-image',
      imageModel: 'gemini-2.5-flash-image',
      maxTokens: 2048,
      temperature: 0.7,
      enabled: false,
      priority: 999
    };

    proxyProviderManager.updateProviders([emptyConfig]);
  }
}