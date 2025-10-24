import { NextRequest, NextResponse } from 'next/server'
import { proxyProviderManager } from '@/lib/ai-providers/proxy'
import { withDatabase } from '@/lib/database'

export interface ProxyConfig {
  id?: string
  name: string
  provider: 'openai' | 'anthropic' | 'google' | 'custom' | 'nano-banana'
  apiKey: string
  baseUrl?: string
  models: string[]
  enabled: boolean
  settings?: Record<string, any>
  createdAt?: string
  updatedAt?: string
}

// 全局存储配置，供AI服务初始化时使用
declare global {
  var __proxyConfigs: ProxyConfig[]
  var __loadingConfigs: boolean
}

if (!global.__proxyConfigs) {
  global.__proxyConfigs = []
}

let storedConfigs = global.__proxyConfigs

// 从新的分离式数据库架构加载配置到内存 - 修复版本
async function loadConfigsToMemory() {
  try {
    console.log('🔄 加载代理配置到内存（安全模式）...');

    // 安全检查：如果正在初始化过程中，跳过加载避免循环
    if (global.__loadingConfigs) {
      console.log('⚠️ 配置正在加载中，跳过重复加载');
      return;
    }

    // 设置加载标志
    global.__loadingConfigs = true;

    // 从代理账号和模型配置表获取数据并合并为旧格式
    const [proxyAccounts, modelConfigs] = await withDatabase(async (db) => {
      const accounts = await db.getProxyAccounts({ enabled: true })
      const configs = await db.getModelConfigs({ enabled: true })
      return [accounts, configs]
    })

    // 将新的分离式数据转换为旧的ProxyConfig格式以保持兼容性
    const configs = proxyAccounts.map(account => {
      const accountModelConfigs = modelConfigs.filter(config => config.proxyAccountId === account.id)
      const models = accountModelConfigs.map(config => config.modelName)

      return {
        id: account.id,
        name: account.name,
        provider: account.provider,
        apiKey: account.apiKey,
        baseUrl: account.baseUrl,
        models: models,
        enabled: account.enabled,
        settings: account.settings || {},
        createdAt: account.createdAt,
        updatedAt: account.updatedAt
      }
    })

    storedConfigs = configs
    global.__proxyConfigs = storedConfigs
    proxyProviderManager.updateProviders(configs)
    console.log('✅ 从数据库加载配置完成:', configs.length)
  } catch (error) {
    console.error('❌ 加载配置失败:', error)
  } finally {
    // 清除加载标志
    global.__loadingConfigs = false;
  }
}

export async function GET() {
  try {
    console.log('📡 API调用: GET /api/proxy-config');

    // 安全检查：防止在加载期间重复调用
    if (global.__loadingConfigs) {
      console.log('⚠️ 系统正在初始化，返回空配置');
      return NextResponse.json({
        success: true,
        data: [],
        message: 'System initializing'
      });
    }

    // 如果内存中没有配置，尝试从数据库加载
    if (storedConfigs.length === 0) {
      console.log('📂 内存中没有配置，从数据库加载...');
      await loadConfigsToMemory()
    }

    console.log(`✅ 返回 ${storedConfigs.length} 个配置`);
    return NextResponse.json({
      success: true,
      data: storedConfigs
    })
  } catch (error) {
    console.error('❌ 获取代理配置失败:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get proxy configs' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('📡 API调用: POST /api/proxy-config');

    const body = await request.json()
    const { name, provider, apiKey, baseUrl, models, enabled, settings }: ProxyConfig = body

    // Validation
    if (!name || !provider || !apiKey || !models || !Array.isArray(models)) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: name, provider, apiKey, models' },
        { status: 400 }
      )
    }

    const config = {
      id: crypto.randomUUID(),
      name,
      provider,
      apiKey,
      baseUrl,
      models,
      enabled: enabled ?? true,
      settings: settings ?? {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    // 存储到内存
    storedConfigs.push(config)
    global.__proxyConfigs = storedConfigs

    // 更新AI服务提供商
    proxyProviderManager.updateProviders(storedConfigs)

    console.log('✅ 成功创建代理配置:', config.name);
    return NextResponse.json({
      success: true,
      data: config
    })
  } catch (error) {
    console.error('❌ 创建代理配置失败:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create proxy config' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    console.log('📡 API调用: PUT /api/proxy-config');

    const body = await request.json()
    const { id, name, provider, apiKey, baseUrl, models, enabled, settings }: ProxyConfig = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: id' },
        { status: 400 }
      )
    }

    const configIndex = storedConfigs.findIndex(config => config.id === id)
    if (configIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Config not found' },
        { status: 404 }
      )
    }

    const updatedConfig = {
      ...storedConfigs[configIndex],
      name: name ?? storedConfigs[configIndex].name,
      provider: provider ?? storedConfigs[configIndex].provider,
      apiKey: apiKey ?? storedConfigs[configIndex].apiKey,
      baseUrl: baseUrl ?? storedConfigs[configIndex].baseUrl,
      models: models ?? storedConfigs[configIndex].models,
      enabled: enabled ?? storedConfigs[configIndex].enabled,
      settings: settings ?? storedConfigs[configIndex].settings,
      updatedAt: new Date().toISOString()
    }

    storedConfigs[configIndex] = updatedConfig
    global.__proxyConfigs = storedConfigs

    // 更新AI服务提供商
    proxyProviderManager.updateProviders(storedConfigs)

    console.log('✅ 成功更新代理配置:', updatedConfig.name);
    return NextResponse.json({
      success: true,
      data: updatedConfig
    })
  } catch (error) {
    console.error('❌ 更新代理配置失败:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update proxy config' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    console.log('📡 API调用: DELETE /api/proxy-config');

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameter: id' },
        { status: 400 }
      )
    }

    const configIndex = storedConfigs.findIndex(config => config.id === id)
    if (configIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Config not found' },
        { status: 404 }
      )
    }

    const deletedConfig = storedConfigs[configIndex]
    storedConfigs.splice(configIndex, 1)
    global.__proxyConfigs = storedConfigs

    // 更新AI服务提供商
    proxyProviderManager.updateProviders(storedConfigs)

    console.log('✅ 成功删除代理配置:', deletedConfig.name);
    return NextResponse.json({
      success: true,
      data: deletedConfig
    })
  } catch (error) {
    console.error('❌ 删除代理配置失败:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete proxy config' },
      { status: 500 }
    )
  }
}