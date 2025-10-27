/**
 * 能力管理器
 * 负责能力的注册、初始化、获取和执行
 */

import {
  ICapability,
  ICapabilityFactory,
  ICapabilityManager,
  CapabilityConfig,
  CapabilityResult,
  CapabilityError,
  BaseCapability
} from './base'

// 能力注册表
type CapabilityRegistry = Map<string, new (...args: any[]) => ICapability>

// 能力实例表
type CapabilityInstances = Map<string, ICapability>

class CapabilityFactory implements ICapabilityFactory {
  private static instance: CapabilityFactory
  private readonly registry: CapabilityRegistry = new Map()

  static getInstance(): CapabilityFactory {
    if (!CapabilityFactory.instance) {
      CapabilityFactory.instance = new CapabilityFactory()
    }
    return CapabilityFactory.instance
  }

  registerCapability<T extends ICapability>(name: string, capabilityClass: new (...args: any[]) => T): void {
    if (this.registry.has(name)) {
      console.warn(`Capability ${name} is already registered, overwriting...`)
    }

    this.registry.set(name, capabilityClass)
    console.log(`✅ Registered capability: ${name}`)
  }

  async createCapability<T extends ICapability>(name: string, config?: CapabilityConfig): Promise<T> {
    const CapabilityClass = this.registry.get(name)
    if (!CapabilityClass) {
      throw new CapabilityError(
        `Capability ${name} is not registered`,
        'Factory',
        'CAPABILITY_NOT_REGISTERED'
      )
    }

    try {
      const capability = new CapabilityClass(config) as T
      await capability.initialize()
      return capability
    } catch (error) {
      throw new CapabilityError(
        `Failed to create capability ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'Factory',
        'CAPABILITY_CREATION_FAILED',
        { originalError: error }
      )
    }
  }

  getAvailableCapabilities(): string[] {
    return Array.from(this.registry.keys())
  }

  isCapabilityRegistered(name: string): boolean {
    return this.registry.has(name)
  }
}

class CapabilityManager implements ICapabilityManager {
  private static instance: CapabilityManager
  private readonly capabilities: CapabilityInstances = new Map()
  private initialized = false

  static getInstance(): CapabilityManager {
    if (!CapabilityManager.instance) {
      CapabilityManager.instance = new CapabilityManager()
    }
    return CapabilityManager.instance
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return
    }

    console.log('🚀 Initializing Capability Manager...')

    try {
      // 这里可以预加载一些核心能力
      const factory = CapabilityFactory.getInstance()
      const availableCapabilities = factory.getAvailableCapabilities()

      console.log(`📋 Available capabilities: ${availableCapabilities.join(', ')}`)

      this.initialized = true
      console.log('✅ Capability Manager initialized successfully')
    } catch (error) {
      console.error('❌ Failed to initialize Capability Manager:', error)
      throw error
    }
  }

  async getCapability<T extends ICapability>(name: string): Promise<T | undefined> {
    this.ensureInitialized()

    let capability = this.capabilities.get(name) as T

    if (!capability) {
      try {
        const factory = CapabilityFactory.getInstance()
        capability = await factory.createCapability<T>(name)
        this.capabilities.set(name, capability)
        console.log(`✅ Loaded capability: ${name}`)
      } catch (error) {
        console.error(`❌ Failed to load capability ${name}:`, error)
        return undefined
      }
    }

    return capability
  }

  async executeCapability<T>(name: string, method: string, ...args: any[]): Promise<CapabilityResult<T>> {
    const capability = await this.getCapability(name)

    if (!capability) {
      return {
        success: false,
        error: `Capability ${name} not available`
      }
    }

    if (!(method in capability) || typeof (capability as any)[method] !== 'function') {
      return {
        success: false,
        error: `Method ${method} not found on capability ${name}`
      }
    }

    try {
      const result = await (capability as any)[method](...args)
      return {
        success: true,
        data: result,
        metadata: {
          capability: name,
          method,
          executionTime: Date.now()
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          capability: name,
          method,
          errorType: error instanceof Error ? error.constructor.name : 'Unknown'
        }
      }
    }
  }

  async shutdown(): Promise<void> {
    console.log('🔄 Shutting down Capability Manager...')

    for (const [name, capability] of this.capabilities) {
      try {
        if ('shutdown' in capability && typeof (capability as any).shutdown === 'function') {
          await (capability as any).shutdown()
        }
        console.log(`✅ Shutdown capability: ${name}`)
      } catch (error) {
        console.error(`❌ Error shutting down capability ${name}:`, error)
      }
    }

    this.capabilities.clear()
    this.initialized = false
    console.log('✅ Capability Manager shutdown complete')
  }

  getLoadedCapabilities(): string[] {
    return Array.from(this.capabilities.keys())
  }

  isCapabilityLoaded(name: string): boolean {
    return this.capabilities.has(name)
  }

  async preloadCapabilities(names: string[]): Promise<void> {
    console.log(`🔄 Preloading capabilities: ${names.join(', ')}`)

    for (const name of names) {
      await this.getCapability(name)
    }

    console.log('✅ All capabilities preloaded')
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new CapabilityError(
        'Capability Manager is not initialized',
        'Manager',
        'MANAGER_NOT_INITIALIZED'
      )
    }
  }
}

// 导出单例实例
export const capabilityFactory = CapabilityFactory.getInstance()
export const capabilityManager = CapabilityManager.getInstance()

// 便捷函数
export async function getCapability<T extends ICapability>(name: string): Promise<T | undefined> {
  return await capabilityManager.getCapability<T>(name)
}

export async function executeCapability<T>(name: string, method: string, ...args: any[]): Promise<CapabilityResult<T>> {
  return await capabilityManager.executeCapability<T>(name, method, ...args)
}

export function registerCapability<T extends ICapability>(name: string, capabilityClass: new (...args: any[]) => T): void {
  capabilityFactory.registerCapability(name, capabilityClass)
}

export function getAvailableCapabilities(): string[] {
  return capabilityFactory.getAvailableCapabilities()
}

// 能力装饰器
export function capability(name: string, version: string = '1.0.0') {
  return function (target: any) {
    target.prototype._capabilityName = name
    target.prototype._capabilityVersion = version
  }
}

// 依赖注入装饰器
export function inject(capabilityName: string) {
  return function (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) {
    if (!target._injectedCapabilities) {
      target._injectedCapabilities = []
    }
    target._injectedCapabilities[parameterIndex] = capabilityName
  }
}

// 全局能力初始化函数
export async function initializeCapabilities(): Promise<void> {
  await capabilityManager.initialize()
}

// 生命周期管理
export async function shutdownCapabilities(): Promise<void> {
  await capabilityManager.shutdown()
}