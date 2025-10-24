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
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Plus, Edit2, Trash2, TestTube, Save, X, Check, AlertCircle, RefreshCw, Eye, EyeOff,
  Activity, Zap, Shield, Globe, Settings, BarChart3, Route, Clock, DollarSign,
  TrendingUp, AlertTriangle, CheckCircle, Server, Cpu, Network
} from 'lucide-react'
import { ProxyAccount, ProxyAccountConfig } from '@/lib/enhanced-proxy-account-manager'
import { RoutingRule } from '@/lib/proxy-router'

export default function SmartProxyPage() {
  const [activeTab, setActiveTab] = useState('accounts')
  const [accounts, setAccounts] = useState<ProxyAccount[]>([])
  const [routingRules, setRoutingRules] = useState<RoutingRule[]>([])
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [editingAccount, setEditingAccount] = useState<ProxyAccount | null>(null)
  const [editingRule, setEditingRule] = useState<RoutingRule | null>(null)
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // 统计数据
  const [stats, setStats] = useState({
    totalAccounts: 0,
    healthyAccounts: 0,
    enabledAccounts: 0,
    totalRules: 0,
    enabledRules: 0,
    avgResponseTime: 0,
    totalRequests: 0,
    successRate: 0
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      // 加载代理账户数据
      const accountsResponse = await fetch('/api/proxy-accounts')
      const accountsResult = await accountsResponse.json()
      if (accountsResult.success) {
        setAccounts(accountsResult.data)
      }

      // 加载路由规则数据
      const rulesResponse = await fetch('/api/routing-rules')
      const rulesResult = await rulesResponse.json()
      if (rulesResult.success) {
        setRoutingRules(rulesResult.data)
      }

      // 计算统计数据
      calculateStats(accountsResult.data || [], rulesResult.data || [])
    } catch (error) {
      console.error('Failed to load data:', error)
      setError('加载数据失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (accounts: ProxyAccount[], rules: RoutingRule[]) => {
    const healthyAccounts = accounts.filter(acc => acc.healthStatus === 'healthy').length
    const enabledAccounts = accounts.filter(acc => acc.enabled).length
    const enabledRules = rules.filter(rule => rule.enabled).length

    const avgResponseTime = accounts.reduce((sum, acc) =>
      sum + (acc.performanceMetrics?.averageResponseTime || 0), 0) / (accounts.length || 1)

    const totalRequests = accounts.reduce((sum, acc) =>
      sum + (acc.performanceMetrics?.totalRequests || 0), 0)

    const avgSuccessRate = accounts.reduce((sum, acc) =>
      sum + (acc.performanceMetrics?.successRate || 0), 0) / (accounts.length || 1)

    setStats({
      totalAccounts: accounts.length,
      healthyAccounts,
      enabledAccounts,
      totalRules: rules.length,
      enabledRules,
      avgResponseTime: Math.round(avgResponseTime),
      totalRequests,
      successRate: Math.round(avgSuccessRate)
    })
  }

  const handleCreateAccount = () => {
    const newAccount: ProxyAccount = {
      id: '',
      name: 'New Smart Proxy Account',
      provider: 'openai',
      providerType: 'api',
      priority: 100,
      enabled: true,
      healthStatus: 'unknown',
      authenticationType: 'api_key',
      capabilities: [],
      rateLimits: {},
      settings: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    setEditingAccount(newAccount)
  }

  const handleCreateRule = () => {
    const newRule: RoutingRule = {
      id: '',
      name: 'New Routing Rule',
      description: '',
      priority: 100,
      enabled: true,
      conditions: {},
      action: 'route',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    setEditingRule(newRule)
  }

  const handleTestAccount = async (account: ProxyAccount) => {
    setTesting(account.id)
    try {
      const response = await fetch('/api/proxy-accounts/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: account.id })
      })

      const result = await response.json()
      if (result.success) {
        setSuccessMessage(`账户 ${account.name} 测试成功！响应时间: ${result.responseTime}ms`)
      } else {
        setError(`账户 ${account.name} 测试失败: ${result.message}`)
      }
    } catch (error) {
      setError(`测试账户时发生错误: ${error.message}`)
    } finally {
      setTesting(null)
      setTimeout(() => {
        setSuccessMessage(null)
        setError(null)
      }, 3000)
    }
  }

  const getProviderIcon = (provider: string) => {
    const icons: Record<string, string> = {
      'openai': '🤖',
      'anthropic': '🧠',
      'google': '🔍',
      'nanobanana': '🍌',
      'evolink': '🚀',
      'custom': '⚙️'
    }
    return icons[provider.toLowerCase()] || '🔧'
  }

  const getHealthBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: React.ReactNode; text: string }> = {
      'healthy': {
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: <CheckCircle className="w-3 h-3" />,
        text: '健康'
      },
      'unhealthy': {
        color: 'bg-red-100 text-red-800 border-red-200',
        icon: <AlertCircle className="w-3 h-3" />,
        text: '异常'
      },
      'unknown': {
        color: 'bg-gray-100 text-gray-800 border-gray-200',
        icon: <AlertTriangle className="w-3 h-3" />,
        text: '未知'
      }
    }

    const config = statusConfig[status] || statusConfig['unknown']
    return (
      <Badge variant="secondary" className={config.color}>
        {config.icon}
        <span className="ml-1">{config.text}</span>
      </Badge>
    )
  }

  const formatResponseTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-6 h-6 animate-spin" />
        <span className="ml-2">加载智能代理管理...</span>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            <Network className="w-8 h-8 mr-3 text-blue-600" />
            智能代理管理
          </h1>
          <p className="text-muted-foreground">
            多代理提供商智能路由和负载均衡管理
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={loadData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            刷新数据
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">代理账户</p>
                <p className="text-2xl font-bold">{stats.totalAccounts}</p>
                <p className="text-xs text-muted-foreground">
                  {stats.healthyAccounts} 健康 / {stats.enabledAccounts} 启用
                </p>
              </div>
              <Server className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">路由规则</p>
                <p className="text-2xl font-bold">{stats.totalRules}</p>
                <p className="text-xs text-muted-foreground">
                  {stats.enabledRules} 条规则启用
                </p>
              </div>
              <Route className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">平均响应时间</p>
                <p className="text-2xl font-bold">{formatResponseTime(stats.avgResponseTime)}</p>
                <p className="text-xs text-muted-foreground">
                  {stats.totalRequests} 总请求
                </p>
              </div>
              <Clock className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">成功率</p>
                <p className="text-2xl font-bold">{stats.successRate}%</p>
                <div className="flex items-center mt-1">
                  <Progress value={stats.successRate} className="w-12 h-2 mr-2" />
                  <span className="text-xs text-muted-foreground">
                    {stats.successRate > 90 ? '优秀' : stats.successRate > 70 ? '良好' : '需关注'}
                  </span>
                </div>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 错误和成功消息 */}
      {error && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert>
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* 主内容标签页 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="accounts" className="flex items-center">
            <Server className="w-4 h-4 mr-2" />
            代理账户
          </TabsTrigger>
          <TabsTrigger value="rules" className="flex items-center">
            <Route className="w-4 h-4 mr-2" />
            路由规则
          </TabsTrigger>
          <TabsTrigger value="monitoring" className="flex items-center">
            <Activity className="w-4 h-4 mr-2" />
            实时监控
          </TabsTrigger>
        </TabsList>

        {/* 代理账户管理 */}
        <TabsContent value="accounts" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">代理账户管理</h2>
              <p className="text-muted-foreground">管理多个AI提供商的代理账户配置</p>
            </div>
            <Button onClick={handleCreateAccount}>
              <Plus className="w-4 h-4 mr-2" />
              添加账户
            </Button>
          </div>

          <div className="grid gap-4">
            {accounts.map((account) => (
              <Card key={account.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="text-2xl">{getProviderIcon(account.provider)}</div>
                      <div>
                        <h3 className="font-semibold">{account.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {account.provider} • {account.providerType} • 优先级: {account.priority}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {account.enabled ? (
                          <Badge variant="default">启用</Badge>
                        ) : (
                          <Badge variant="secondary">禁用</Badge>
                        )}
                        {getHealthBadge(account.healthStatus)}
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
                      <Button variant="outline" size="sm">
                        <Edit2 className="w-3 h-3" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  {/* 性能指标 */}
                  {account.performanceMetrics && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 p-4 bg-muted/50 rounded-lg">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">响应时间</p>
                        <p className="font-semibold">{formatResponseTime(account.performanceMetrics.averageResponseTime)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">成功率</p>
                        <p className="font-semibold">{account.performanceMetrics.successRate}%</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">总请求</p>
                        <p className="font-semibold">{account.performanceMetrics.totalRequests}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">失败数</p>
                        <p className="font-semibold">{account.performanceMetrics.failedRequests}</p>
                      </div>
                    </div>
                  )}

                  {/* 能力标签 */}
                  {account.capabilities && account.capabilities.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium mb-2">支持能力:</p>
                      <div className="flex flex-wrap gap-1">
                        {account.capabilities.map((capability, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {capability}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {accounts.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <div className="text-4xl mb-4">🌐</div>
                  <h3 className="text-lg font-semibold mb-2">还没有代理账户</h3>
                  <p className="text-muted-foreground mb-4">
                    添加您的第一个代理账户，开始使用智能路由功能
                  </p>
                  <Button onClick={handleCreateAccount}>
                    <Plus className="w-4 h-4 mr-2" />
                    添加账户
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* 路由规则管理 */}
        <TabsContent value="rules" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">路由规则配置</h2>
              <p className="text-muted-foreground">配置智能路由规则，优化请求分配策略</p>
            </div>
            <Button onClick={handleCreateRule}>
              <Plus className="w-4 h-4 mr-2" />
              添加规则
            </Button>
          </div>

          <div className="grid gap-4">
            {routingRules.map((rule) => (
              <Card key={rule.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-semibold">{rule.name}</h3>
                        {rule.enabled ? (
                          <Badge variant="default">启用</Badge>
                        ) : (
                          <Badge variant="secondary">禁用</Badge>
                        )}
                        <Badge variant="outline">优先级 {rule.priority}</Badge>
                      </div>
                      {rule.description && (
                        <p className="text-sm text-muted-foreground mb-2">{rule.description}</p>
                      )}
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span>动作: {rule.action}</span>
                        {rule.targetProxyAccountId && (
                          <span>目标账户: {rule.targetProxyAccountId}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm">
                        <Edit2 className="w-3 h-3" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {routingRules.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <div className="text-4xl mb-4">🎯</div>
                  <h3 className="text-lg font-semibold mb-2">还没有路由规则</h3>
                  <p className="text-muted-foreground mb-4">
                    创建路由规则，实现智能请求分配和负载均衡
                  </p>
                  <Button onClick={handleCreateRule}>
                    <Plus className="w-4 h-4 mr-2" />
                    添加规则
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* 实时监控 */}
        <TabsContent value="monitoring" className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">实时监控仪表板</h2>
            <p className="text-muted-foreground">监控代理账户状态、性能指标和路由统计</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 系统状态 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="w-5 h-5 mr-2" />
                  系统状态
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>健康代理账户</span>
                    <span className="font-semibold">{stats.healthyAccounts}/{stats.totalAccounts}</span>
                  </div>
                  <Progress value={(stats.healthyAccounts / stats.totalAccounts) * 100} className="h-2" />

                  <div className="flex items-center justify-between">
                    <span>活跃路由规则</span>
                    <span className="font-semibold">{stats.enabledRules}/{stats.totalRules}</span>
                  </div>
                  <Progress value={(stats.enabledRules / stats.totalRules) * 100} className="h-2" />

                  <div className="flex items-center justify-between">
                    <span>系统成功率</span>
                    <span className="font-semibold">{stats.successRate}%</span>
                  </div>
                  <Progress value={stats.successRate} className="h-2" />
                </div>
              </CardContent>
            </Card>

            {/* 性能统计 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2" />
                  性能统计
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>平均响应时间</span>
                    <span className="font-semibold">{formatResponseTime(stats.avgResponseTime)}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span>总请求数</span>
                    <span className="font-semibold">{stats.totalRequests.toLocaleString()}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span>启用账户数</span>
                    <span className="font-semibold">{stats.enabledAccounts}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span>路由规则数</span>
                    <span className="font-semibold">{stats.totalRules}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 实时日志 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Cpu className="w-5 h-5 mr-2" />
                系统活动
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>智能路由系统正常运行</span>
                  <span className="text-muted-foreground">刚刚</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <Activity className="w-4 h-4 text-blue-600" />
                  <span>健康检查完成，所有代理账户状态正常</span>
                  <span className="text-muted-foreground">2分钟前</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <Zap className="w-4 h-4 text-yellow-600" />
                  <span>图片生成任务完成，使用EvoLink.AI代理</span>
                  <span className="text-muted-foreground">5分钟前</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}