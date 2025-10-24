'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Plus, Edit2, Trash2, TestTube, Save, X, Check, AlertCircle, RefreshCw, Eye, EyeOff } from 'lucide-react'
import { proxyAccountManager, ProxyAccountValidationResult } from '@/lib/client-proxy-account-manager'
import { ProxyAccount } from '@/app/api/proxy-accounts/route'

export default function ProxyAccountsPage() {
  const [accounts, setAccounts] = useState<ProxyAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [editingAccount, setEditingAccount] = useState<ProxyAccount | null>(null)
  const [validationResults, setValidationResults] = useState<Record<string, ProxyAccountValidationResult>>({})
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // 加载账号
  useEffect(() => {
    loadAccounts()
  }, [])

  const loadAccounts = async () => {
    try {
      const loadedAccounts = await proxyAccountManager.getAccounts()
      setAccounts(loadedAccounts)
    } catch (error) {
      console.error('Failed to load proxy accounts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAccount = () => {
    const newAccount: ProxyAccount = {
      name: 'New Proxy Account',
      provider: 'openai',
      apiKey: '',
      enabled: true,
      settings: {}
    }
    setEditingAccount(newAccount)
  }

  const handleEditAccount = (account: ProxyAccount) => {
    setEditingAccount({ ...account })
  }

  const handleSaveAccount = async () => {
    if (!editingAccount) return

    setSaving(true)
    setError(null)
    setSuccessMessage(null)

    try {
      console.log('Saving account:', editingAccount.name, editingAccount.provider)

      // 验证必填字段
      if (!editingAccount.name || !editingAccount.name.trim()) {
        throw new Error('Account name is required')
      }
      if (!editingAccount.provider || !editingAccount.provider.trim()) {
        throw new Error('Provider is required')
      }
      if (!editingAccount.apiKey || !editingAccount.apiKey.trim()) {
        throw new Error('API Key is required')
      }

      // 清理数据
      const cleanAccount = {
        ...editingAccount,
        name: editingAccount.name.trim(),
        provider: editingAccount.provider.trim(),
        apiKey: editingAccount.apiKey.trim(),
        baseUrl: editingAccount.baseUrl?.trim() || null
      }

      if (editingAccount.id) {
        const result = await proxyAccountManager.updateAccount(editingAccount.id, cleanAccount)
        if (result) {
          setSuccessMessage('Account updated successfully!')
        } else {
          throw new Error('Failed to update account')
        }
      } else {
        const result = await proxyAccountManager.createAccount(cleanAccount)
        if (result) {
          setSuccessMessage('Account created successfully!')
        } else {
          throw new Error('Failed to create account')
        }
      }

      await loadAccounts()
      setEditingAccount(null)

      // 3秒后清除成功消息
      setTimeout(() => setSuccessMessage(null), 3000)

    } catch (error) {
      console.error('Failed to save account:', error)
      setError(error.message || 'Failed to save account. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAccount = async (id: string) => {
    if (!confirm('Are you sure you want to delete this account? This will also delete all model configurations associated with it.')) {
      return
    }

    try {
      await proxyAccountManager.deleteAccount(id)
      await loadAccounts()
    } catch (error) {
      console.error('Failed to delete account:', error)
    }
  }

  const handleTestAccount = async (account: ProxyAccount) => {
    setTesting(account.id || 'new')
    try {
      const result = await proxyAccountManager.validateAccount(account)
      setValidationResults(prev => ({
        ...prev,
        [account.id || 'new']: result
      }))
    } catch (error) {
      setValidationResults(prev => ({
        ...prev,
        [account.id || 'new']: {
          valid: false,
          error: error.message
        }
      }))
    } finally {
      setTesting(null)
    }
  }

  const toggleApiKeyVisibility = (accountId: string) => {
    setShowApiKeys(prev => ({
      ...prev,
      [accountId]: !prev[accountId]
    }))
  }

  const getProviderIcon = (provider: string) => {
    return proxyAccountManager.getProviderIcon(provider)
  }

  const getProviderDisplayName = (provider: string) => {
    return proxyAccountManager.getProviderDisplayName(provider)
  }

  const getValidationBadge = (accountId: string) => {
    const result = validationResults[accountId]
    if (!result) return null

    // 测试模式显示
    if (result.isTestMode) {
      return (
        <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">
          <><TestTube className="w-3 h-3 mr-1" /> 测试模式</>
        </Badge>
      )
    }

    // 正常验证状态
    if (result.valid) {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
          <><Check className="w-3 h-3 mr-1" /> 有效</>
        </Badge>
      )
    } else {
      return (
        <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">
          <><X className="w-3 h-3 mr-1" /> 无效</>
        </Badge>
      )
    }
  }

  const getBaseUrlForProvider = (provider: string): string => {
    switch (provider) {
      case 'openai':
        return 'https://api.openai.com/v1'
      case 'anthropic':
        return 'https://api.anthropic.com'
      case 'google':
        return 'https://generativelanguage.googleapis.com/v1'
      case 'nano-banana':
        return ''
      case 'custom':
        return ''
      default:
        return ''
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-6 h-6 animate-spin" />
        <span className="ml-2">Loading proxy accounts...</span>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Proxy Accounts</h1>
          <p className="text-muted-foreground">
            Manage your proxy service accounts and API credentials
          </p>
        </div>
        <Button onClick={handleCreateAccount}>
          <Plus className="w-4 h-4 mr-2" />
          Add Account
        </Button>
      </div>

      {editingAccount && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingAccount.id ? 'Edit Account' : 'New Account'}
            </CardTitle>
            <CardDescription>
              Configure proxy service credentials and settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Account Name</Label>
                <Input
                  id="name"
                  value={editingAccount.name}
                  onChange={(e) => setEditingAccount({ ...editingAccount, name: e.target.value })}
                  placeholder="My OpenAI Account"
                />
              </div>

              <div>
                <Label htmlFor="provider">Provider</Label>
                <Select
                  value={editingAccount.provider}
                  onValueChange={(value: any) => {
                    const newAccount = {
                      ...editingAccount,
                      provider: value,
                      baseUrl: getBaseUrlForProvider(value)
                    }
                    setEditingAccount(newAccount)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">
                      <div className="flex items-center">
                        <span className="mr-2">🤖</span>
                        OpenAI
                      </div>
                    </SelectItem>
                    <SelectItem value="anthropic">
                      <div className="flex items-center">
                        <span className="mr-2">🧠</span>
                        Anthropic
                      </div>
                    </SelectItem>
                    <SelectItem value="google">
                      <div className="flex items-center">
                        <span className="mr-2">🔍</span>
                        Google AI
                      </div>
                    </SelectItem>
                    <SelectItem value="nano-banana">
                      <div className="flex items-center">
                        <span className="mr-2">🍌</span>
                        Nano Banana
                        <span className="ml-2 text-xs text-muted-foreground">(EvoLink.AI兼容)</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="custom">
                      <div className="flex items-center">
                        <span className="mr-2">⚙️</span>
                        Custom Provider
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="apiKey">API Key</Label>
              <div className="flex space-x-2">
                <Input
                  id="apiKey"
                  type={showApiKeys[editingAccount.id || 'new'] ? "text" : "password"}
                  value={editingAccount.apiKey}
                  onChange={(e) => setEditingAccount({ ...editingAccount, apiKey: e.target.value })}
                  placeholder="sk-..."
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => toggleApiKeyVisibility(editingAccount.id || 'new')}
                >
                  {showApiKeys[editingAccount.id || 'new'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {(editingAccount.provider === 'custom' || editingAccount.provider === 'nano-banana') && (
              <div>
                <Label htmlFor="baseUrl">Base URL</Label>
                <Input
                  id="baseUrl"
                  value={editingAccount.baseUrl || ''}
                  onChange={(e) => setEditingAccount({ ...editingAccount, baseUrl: e.target.value })}
                  placeholder={editingAccount.provider === 'nano-banana'
                    ? "https://api.nano-banana.com/v1/images/generations"
                    : "https://api.example.com/v1"
                  }
                />
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Switch
                id="enabled"
                checked={editingAccount.enabled}
                onCheckedChange={(enabled) => setEditingAccount({ ...editingAccount, enabled })}
              />
              <Label htmlFor="enabled">Enable this account</Label>
            </div>

            <div className="flex items-center justify-between pt-6 border-t">
              <div className="flex items-center space-x-2">
                {getValidationBadge(editingAccount.id || 'new')}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTestAccount(editingAccount)}
                  disabled={testing === editingAccount.id || !editingAccount.apiKey}
                >
                  {testing === editingAccount.id ? (
                    <><RefreshCw className="w-3 h-3 mr-2 animate-spin" /> Testing...</>
                  ) : (
                    <><TestTube className="w-3 h-3 mr-2" /> Test Connection</>
                  )}
                </Button>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setEditingAccount(null)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveAccount}
                  disabled={saving || !editingAccount.name || !editingAccount.apiKey}
                >
                  {saving ? (
                    <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                  ) : (
                    <><Save className="w-4 h-4 mr-2" /> Save Account</>
                  )}
                </Button>
              </div>
            </div>

            {validationResults[editingAccount.id || 'new']?.error && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {validationResults[editingAccount.id || 'new']?.error}
                </AlertDescription>
              </Alert>
            )}

            {validationResults[editingAccount.id || 'new']?.warning && (
              <Alert>
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-700">
                  <div className="font-medium">提示:</div>
                  <div>{validationResults[editingAccount.id || 'new']?.warning}</div>
                </AlertDescription>
              </Alert>
            )}

            {validationResults[editingAccount.id || 'new']?.availableModels && (
              <div>
                <Label>Available Models</Label>
                <div className="mt-2 p-3 bg-muted rounded-md">
                  <div className="text-sm text-muted-foreground">
                    This provider supports {validationResults[editingAccount.id || 'new']!.availableModels!.length} models:
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {validationResults[editingAccount.id || 'new']!.availableModels!.slice(0, 10).map((model) => (
                      <Badge key={model} variant="secondary" className="text-xs">
                        {model}
                      </Badge>
                    ))}
                    {validationResults[editingAccount.id || 'new']!.availableModels!.length > 10 && (
                      <Badge variant="secondary" className="text-xs">
                        +{validationResults[editingAccount.id || 'new']!.availableModels!.length - 10} more
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 错误消息 */}
      {error && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-medium">Error:</div>
            <div>{error}</div>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => setError(null)}
            >
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* 成功消息 */}
      {successMessage && (
        <Alert>
          <Check className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">
            {successMessage}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4">
        {accounts.map((account) => (
          <Card key={account.id}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="text-2xl">
                    {getProviderIcon(account.provider)}
                  </div>
                  <div>
                    <h3 className="font-semibold">{account.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {getProviderDisplayName(account.provider)}
                      {account.baseUrl && ` • ${new URL(account.baseUrl).hostname}`}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {account.enabled ? (
                      <Badge variant="default">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                    {getValidationBadge(account.id!)}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTestAccount(account)}
                    disabled={testing === account.id}
                  >
                    {testing === account.id ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <TestTube className="w-3 h-3" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditAccount(account)}
                  >
                    <Edit2 className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteAccount(account.id!)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">API Key</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleApiKeyVisibility(account.id!)}
                  >
                    {showApiKeys[account.id!] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </Button>
                </div>
                <div className="mt-1 p-2 bg-muted rounded text-sm font-mono">
                  {showApiKeys[account.id!]
                    ? account.apiKey
                    : account.apiKey ? '***' + account.apiKey.slice(-4) : 'Not set'
                  }
                </div>
              </div>

              {validationResults[account.id!]?.warning && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <div className="flex items-center text-sm text-yellow-800">
                    <AlertCircle className="h-4 w-4 mr-2 text-yellow-600" />
                    <span>{validationResults[account.id!]!.warning}</span>
                  </div>
                </div>
              )}

              {validationResults[account.id!]?.availableModels && (
                <div className="mt-4">
                  <div className="text-sm font-medium mb-2">
                    Available Models ({validationResults[account.id!]!.availableModels!.length})
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {validationResults[account.id!]!.availableModels!.slice(0, 8).map((model) => (
                      <Badge key={model} variant="outline" className="text-xs">
                        {model}
                      </Badge>
                    ))}
                    {validationResults[account.id!]!.availableModels!.length > 8 && (
                      <Badge variant="outline" className="text-xs">
                        +{validationResults[account.id!]!.availableModels!.length - 8} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {accounts.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="text-4xl mb-4">🔐</div>
              <h3 className="text-lg font-semibold mb-2">No Proxy Accounts</h3>
              <p className="text-muted-foreground mb-4">
                Add your first proxy account to start using AI models through external providers
              </p>
              <Button onClick={handleCreateAccount}>
                <Plus className="w-4 h-4 mr-2" />
                Add Account
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}