import { NextRequest, NextResponse } from 'next/server'
import { proxyProviderManager } from '@/lib/ai-providers/proxy'
import { writeFile, readFile, mkdir } from 'fs/promises'
import { join } from 'path'

// 配置文件路径
const CONFIG_FILE_PATH = join(process.cwd(), 'data', 'proxy-configs.json')

// 确保数据目录存在
async function ensureDataDir() {
  try {
    await mkdir(join(process.cwd(), 'data'), { recursive: true })
  } catch (error) {
    // 目录已存在，忽略错误
  }
}

// 从文件读取配置
async function loadConfigsFromFile(): Promise<any[]> {
  try {
    await ensureDataDir()
    const data = await readFile(CONFIG_FILE_PATH, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    // 文件不存在或读取失败，返回空数组
    console.log('配置文件不存在，使用默认配置')
    return []
  }
}

// 保存配置到文件
async function saveConfigsToFile(configs: any[]): Promise<void> {
  try {
    await ensureDataDir()
    await writeFile(CONFIG_FILE_PATH, JSON.stringify(configs, null, 2), 'utf-8')
    console.log('配置已保存到文件:', CONFIG_FILE_PATH)
  } catch (error) {
    console.error('保存配置到文件失败:', error)
    throw error
  }
}

// 全局存储配置，供AI服务初始化时使用
declare global {
  var __proxyConfigs: any[]
}

if (!global.__proxyConfigs) {
  global.__proxyConfigs = []
}

// 使用 let 而不是 const，因为我们需要重新赋值
let storedConfigs = global.__proxyConfigs

export async function GET() {
  try {
    // 如果内存中没有配置，尝试从文件加载
    if (storedConfigs.length === 0) {
      storedConfigs = await loadConfigsFromFile()
      global.__proxyConfigs = storedConfigs
      console.log('从文件加载了配置:', storedConfigs.length, '个')
    }
    return NextResponse.json(storedConfigs)
  } catch (error) {
    console.error('Failed to get proxy configs:', error)
    return NextResponse.json({ error: 'Failed to get proxy configs' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const configs = await request.json()

    // 验证配置
    if (!Array.isArray(configs)) {
      return NextResponse.json({ error: 'Configs must be an array' }, { status: 400 })
    }

    // 保存到文件
    await saveConfigsToFile(configs)

    // 更新内存中的配置
    storedConfigs = configs
    global.__proxyConfigs = storedConfigs

    // 更新代理提供商管理器
    proxyProviderManager.updateProviders(configs)

    console.log('Updated proxy configs:', configs.length)
    console.log('配置已持久化保存到文件')
    console.log('Providers updated. Available models:', proxyProviderManager.getAvailableImageModels())

    return NextResponse.json({ success: true, message: 'Proxy configs updated and saved successfully' })
  } catch (error) {
    console.error('Failed to save proxy configs:', error)
    return NextResponse.json({ error: 'Failed to save proxy configs' }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    storedConfigs = []
    global.__proxyConfigs = []

    // 删除配置文件
    try {
      await writeFile(CONFIG_FILE_PATH, '[]', 'utf-8')
      console.log('配置文件已清空')
    } catch (error) {
      console.warn('清空配置文件失败:', error)
    }

    proxyProviderManager.updateProviders([])

    return NextResponse.json({ success: true, message: 'Proxy configs cleared successfully' })
  } catch (error) {
    console.error('Failed to clear proxy configs:', error)
    return NextResponse.json({ error: 'Failed to clear proxy configs' }, { status: 500 })
  }
}