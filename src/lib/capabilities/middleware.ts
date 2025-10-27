/**
 * 能力系统初始化中间件
 * 确保在应用启动时初始化能力系统
 */

import { NextRequest, NextResponse } from 'next/server'
import { initializeCapabilitySystem, checkCapabilityHealth } from './index'

let initialized = false
let initializing = false

/**
 * 初始化能力系统
 */
async function ensureCapabilitiesInitialized() {
  if (initialized) return
  if (initializing) {
    // 等待初始化完成
    while (initializing) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    return
  }

  initializing = true

  try {
    console.log('🚀 初始化能力系统...')
    await initializeCapabilitySystem()

    // 健康检查
    const health = await checkCapabilityHealth()
    if (!health.healthy) {
      console.warn('⚠️ 能力系统初始化完成，但部分能力不可用:')
      for (const [name, status] of Object.entries(health.capabilities)) {
        if (!status.available) {
          console.warn(`  ❌ ${name}: ${status.error}`)
        }
      }
    } else {
      console.log('✅ 能力系统初始化完成，所有能力正常')
    }

    initialized = true
  } catch (error) {
    console.error('❌ 能力系统初始化失败:', error)
    // 不抛出错误，允许应用继续运行
  } finally {
    initializing = false
  }
}

/**
 * Next.js中间件：初始化能力系统
 */
export async function capabilitiesMiddleware(request: NextRequest) {
  await ensureCapabilitiesInitialized()

  // 继续处理请求
  return NextResponse.next()
}

/**
 * API路由中间件：确保能力系统已初始化
 */
export async function withCapabilities(
  handler: (request: NextRequest, ...args: any[]) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: any[]) => {
    await ensureCapabilitiesInitialized()
    return handler(request, ...args)
  }
}

/**
 * 服务端组件中间件：确保能力系统已初始化
 */
export async function ensureServerCapabilities() {
  if (typeof window === 'undefined') {
    // 只在服务器端初始化
    await ensureCapabilitiesInitialized()
  }
}

/**
 * 获取能力系统状态
 */
export async function getCapabilitiesStatus() {
  if (!initialized) {
    return { initialized: false, status: 'not_initialized' }
  }

  try {
    const health = await checkCapabilityHealth()
    return {
      initialized: true,
      healthy: health.healthy,
      capabilities: health.capabilities,
      status: health.healthy ? 'healthy' : 'degraded'
    }
  } catch (error) {
    return {
      initialized: true,
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      status: 'error'
    }
  }
}

/**
 * 在应用启动时调用
 */
export async function initializeAppCapabilities() {
  console.log('🎯 应用启动 - 初始化能力系统...')
  await ensureCapabilitiesInitialized()

  const status = await getCapabilitiesStatus()
  console.log('📊 能力系统状态:', status.status)

  return status
}