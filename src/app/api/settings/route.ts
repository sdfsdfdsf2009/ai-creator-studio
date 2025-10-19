import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

// 设置存储（在生产环境中应该使用数据库）
const SETTINGS_FILE = path.join(process.cwd(), 'data', 'settings.json')

// 确保设置目录存在
const settingsDir = path.dirname(SETTINGS_FILE)
if (!fs.existsSync(settingsDir)) {
  fs.mkdirSync(settingsDir, { recursive: true })
}

// 默认设置
const DEFAULT_SETTINGS = {
  aiProviders: {
    openai: {
      name: 'OpenAI',
      enabled: false,
      apiKey: '',
      baseUrl: 'https://api.openai.com',
      timeout: 60000,
      models: {
        'dall-e-3': { enabled: true, cost: 0.04 },
        'dall-e-2': { enabled: true, cost: 0.018 }
      }
    },
    stability: {
      name: 'Stability AI',
      enabled: false,
      apiKey: '',
      baseUrl: 'https://api.stability.ai',
      timeout: 120000,
      models: {
        'stable-diffusion-xl-1024-v1-0': { enabled: true, cost: 0.06 },
        'stable-diffusion-xl-1024-v0-9': { enabled: true, cost: 0.05 },
        'stable-diffusion-512-v2-1': { enabled: true, cost: 0.02 },
        'stable-diffusion-768-v2-1': { enabled: true, cost: 0.03 },
        'stable-video-diffusion-img2vid': { enabled: true, cost: 0.25 }
      }
    },
    runway: {
      name: 'Runway',
      enabled: false,
      apiKey: '',
      baseUrl: 'https://api.runwayml.com',
      timeout: 300000,
      models: {
        'gen-3': { enabled: true, cost: 0.25 },
        'gen-2': { enabled: true, cost: 0.15 }
      }
    },
    pika: {
      name: 'Pika Labs',
      enabled: false,
      apiKey: '',
      baseUrl: 'https://api.pika.art',
      timeout: 300000,
      models: {
        'default': { enabled: true, cost: 0.12 }
      }
    },
    custom: {
      name: '自定义服务',
      enabled: false,
      apiKey: '',
      baseUrl: '',
      timeout: 120000,
      models: {
        'midjourney-v6': { enabled: true, cost: 0.03 },
        'midjourney-v5.2': { enabled: true, cost: 0.025 },
        'flux-pro': { enabled: true, cost: 0.03 },
        'runway-gen3': { enabled: true, cost: 0.25 },
        'runway-gen2': { enabled: true, cost: 0.15 },
        'pika-labs': { enabled: true, cost: 0.12 }
      }
    }
  },
  general: {
    language: 'zh-CN',
    theme: 'system',
    autoSave: true,
    notifications: true,
    defaultImageModel: 'dall-e-3',
    defaultVideoModel: 'gen-3'
  },
  storage: {
    type: 'local',
    path: './uploads',
    maxSize: '100MB'
  }
}

// 读取设置
function readSettings(): any {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf8')
      return { ...DEFAULT_SETTINGS, ...JSON.parse(data) }
    }
    return DEFAULT_SETTINGS
  } catch (error) {
    console.error('Error reading settings:', error)
    return DEFAULT_SETTINGS
  }
}

// 保存设置
function writeSettings(settings: any): void {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8')
  } catch (error) {
    console.error('Error writing settings:', error)
    throw error
  }
}

// GET - 获取设置
export async function GET() {
  try {
    const settings = readSettings()

    // 隐藏敏感信息（API密钥）
    const safeSettings = {
      ...settings,
      aiProviders: Object.fromEntries(
        Object.entries(settings.aiProviders).map(([key, provider]: [string, any]) => [
          key,
          {
            ...provider,
            apiKey: provider.apiKey ? '***' : '',
          }
        ])
      )
    }

    return NextResponse.json({
      success: true,
      data: safeSettings
    })
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - 更新设置
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const currentSettings = readSettings()

    // 更新设置
    const updatedSettings = {
      ...currentSettings,
      ...body,
      aiProviders: {
        ...currentSettings.aiProviders,
        ...body.aiProviders
      }
    }

    // 验证AI提供商配置
    Object.entries(updatedSettings.aiProviders).forEach(([providerKey, provider]: [string, any]) => {
      if (provider.enabled && !provider.apiKey) {
        return NextResponse.json(
          { success: false, error: `${provider.name} 启用但缺少API密钥` },
          { status: 400 }
        )
      }

      if (provider.enabled && providerKey === 'custom' && !provider.baseUrl) {
        return NextResponse.json(
          { success: false, error: '自定义服务启用但缺少基础URL' },
          { status: 400 }
        )
      }
    })

    // 保存设置
    writeSettings(updatedSettings)

    // 重新加载AI服务配置
    try {
      // 这里可以触发AI服务重新初始化
      console.log('Settings updated, AI services should be reinitialized')
    } catch (error) {
      console.warn('Failed to reinitialize AI services:', error)
    }

    return NextResponse.json({
      success: true,
      data: {
        message: '设置已保存',
        providers: Object.keys(updatedSettings.aiProviders).filter(key =>
          updatedSettings.aiProviders[key].enabled
        ).length
      }
    })

  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - 测试API连接
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { providerKey, testType } = body

    const settings = readSettings()
    const provider = settings.aiProviders[providerKey]

    if (!provider) {
      return NextResponse.json(
        { success: false, error: '未找到提供商配置' },
        { status: 404 }
      )
    }

    if (!provider.enabled || !provider.apiKey) {
      return NextResponse.json(
        { success: false, error: '提供商未启用或缺少API密钥' },
        { status: 400 }
      )
    }

    let testResult = { success: false, error: '', latency: 0 }

    try {
      const startTime = Date.now()

      // 根据提供商进行不同的测试
      if (providerKey === 'openai') {
        const response = await fetch(`${provider.baseUrl}/v1/models`, {
          headers: {
            'Authorization': `Bearer ${provider.apiKey}`,
          },
          signal: AbortSignal.timeout(10000),
        })
        testResult.success = response.ok
        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }))
          testResult.error = error.error?.message || `HTTP ${response.status}`
        }
      } else if (providerKey === 'stability') {
        const response = await fetch(`${provider.baseUrl}/v1/user/balance`, {
          headers: {
            'Authorization': `Bearer ${provider.apiKey}`,
          },
          signal: AbortSignal.timeout(10000),
        })
        testResult.success = response.ok
        if (!response.ok) {
          const error = await response.json().catch(() => ({ message: 'Unknown error' }))
          testResult.error = error.message || `HTTP ${response.status}`
        }
      } else if (providerKey === 'custom') {
        // 对于自定义服务，测试基础连接
        const response = await fetch(`${provider.baseUrl}/v1/models`, {
          headers: {
            'Authorization': `Bearer ${provider.apiKey}`,
          },
          signal: AbortSignal.timeout(10000),
        })
        testResult.success = response.ok
        if (!response.ok) {
          testResult.error = `连接失败，HTTP ${response.status}`
        }
      } else {
        // 其他提供商的测试
        testResult.error = '暂不支持此提供商的连接测试'
      }

      testResult.latency = Date.now() - startTime

    } catch (error) {
      testResult.error = error instanceof Error ? error.message : '连接测试失败'
    }

    return NextResponse.json({
      success: true,
      data: testResult
    })

  } catch (error) {
    console.error('Error testing API connection:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}