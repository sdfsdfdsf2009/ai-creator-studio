import { ProxyAccount } from '@/app/api/proxy-accounts/route'

export interface ProxyAccountValidationResult {
  valid: boolean
  error?: string
  availableModels?: string[]
  isTestMode?: boolean
  warning?: string
}

export class ClientProxyAccountManager {
  private static instance: ClientProxyAccountManager
  private accounts: ProxyAccount[] = []
  private lastLoad: Date | null = null

  private constructor() {}

  static getInstance(): ClientProxyAccountManager {
    if (!ClientProxyAccountManager.instance) {
      ClientProxyAccountManager.instance = new ClientProxyAccountManager()
    }
    return ClientProxyAccountManager.instance
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
      // 调用API进行验证
      const response = await fetch('/api/proxy-accounts/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(account)
      })

      const result = await response.json()
      return result.data || { valid: false, error: 'Validation failed' }
    } catch (error) {
      return { valid: false, error: `Validation failed: ${error instanceof Error ? error.message : String(error)}` }
    }
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

// 导出客户端实例
export const proxyAccountManager = ClientProxyAccountManager.getInstance()