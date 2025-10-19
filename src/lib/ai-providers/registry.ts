import { AIProvider, AIProviderConfig } from './index'
import { OpenAIProvider, OpenAICompatibleProvider } from './openai'
import { StabilityAIProvider } from './stability'
import { RunwayProvider, PikaLabsProvider } from './video'
import { ProxyProvider, proxyProviderManager } from './proxy'
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
  'dall-e-3': 'openai',
  'dall-e-2': 'openai',
  'stable-diffusion-xl-1024-v1-0': 'stability-ai',
  'stable-diffusion-xl-1024-v0-9': 'stability-ai',
  'stable-diffusion-512-v2-1': 'stability-ai',
  'stable-diffusion-768-v2-1': 'stability-ai',
  'stable-video-diffusion-img2vid': 'stability-ai',
  'midjourney-v6': 'custom-ai', // 假设通过自定义 API
  'midjourney-v5.2': 'custom-ai',
  'flux-pro': 'custom-ai',
  'runway-gen3': 'runway',
  'runway-gen2': 'runway',
  'pika-labs': 'pika-labs',
  'gemini-2.5-flash-image': 'proxy', // Nano Banana 通过代理提供商
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

// 初始化代理提供商
async function initializeProxyProviders() {
  try {
    console.log('初始化代理提供商...')

    // 检查环境变量中是否有默认的 Nano Banana 配置
    if (process.env.NANO_BANANA_API_KEY && process.env.NANO_BANANA_BASE_URL) {
      const defaultConfig = {
        id: 'default-nano-banana',
        name: 'Default Nano Banana',
        baseUrl: process.env.NANO_BANANA_BASE_URL,
        apiKey: process.env.NANO_BANANA_API_KEY,
        textModel: 'gemini-2.5-flash-image',
        imageModel: 'gemini-2.5-flash-image',
        maxTokens: 2048,
        temperature: 0.7,
        enabled: true,
        priority: 1
      }

      console.log('使用默认 Nano Banana 配置')
      proxyProviderManager.updateProviders([defaultConfig])
      return
    }

    // 首先尝试从文件加载配置
    const fileConfigs = await loadConfigsFromFile()
    if (fileConfigs.length > 0) {
      console.log(`从文件加载了 ${fileConfigs.length} 个代理配置`)
      proxyProviderManager.updateProviders(fileConfigs)
      // 同时更新全局变量
      ;(global as any).__proxyConfigs = fileConfigs
      return
    }

    // 直接从全局变量读取配置（避免HTTP调用问题）
    const globalConfigs = (global as any).__proxyConfigs
    if (globalConfigs && Array.isArray(globalConfigs) && globalConfigs.length > 0) {
      console.log(`从全局变量加载了 ${globalConfigs.length} 个代理配置`)
      proxyProviderManager.updateProviders(globalConfigs)
      return
    }

    // 如果都没有配置，输出警告信息
    console.log('⚠️ 未找到有效的代理配置，请检查配置文件或重新保存API配置')

    // 如果全局变量中没有配置，尝试通过HTTP加载（回退方案）
    try {
      const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/proxy-config`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const configs = await response.json()
        if (Array.isArray(configs) && configs.length > 0) {
          console.log(`通过HTTP加载了 ${configs.length} 个代理配置`)
          proxyProviderManager.updateProviders(configs)
        }
      } else {
        console.log('未找到保存的代理配置')
      }
    } catch (httpError) {
      console.log('HTTP加载代理配置失败，跳过')
    }
  } catch (error) {
    console.warn('加载代理配置失败:', error)
  }
}