'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'

interface ProxyAccount {
  id: string
  name: string
  provider: string
  region?: string
  priority: number
  enabled: boolean
  healthStatus: 'healthy' | 'unhealthy' | 'degraded' | 'unknown'
  responseTime: number
  successRate: number
  uptime: number
  capabilities: string[]
}

interface SystemStatus {
  healthChecker: {
    isRunning: boolean
    config: any
    lastCheck: Date
    uptime: number
  }
  failoverManager: {
    isRunning: boolean
    config: any
    activeFailovers: number
    stats: any
  }
  proxyStats: {
    total: number
    healthy: number
    unhealthy: number
    uptime: number
  }
  enabledProxies: number
  healthyProxies: number
}

interface RoutingDecision {
  selectedProxy: ProxyAccount
  selectedModel: string
  estimatedCost: number
  routingReason: string
  alternativeProxies: ProxyAccount[]
  estimatedResponseTime: number
}

export default function MultiAgentSettingsPage() {
  const t = useTranslations('settings')
  const [loading, setLoading] = useState(true)
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null)
  const [proxyAccounts, setProxyAccounts] = useState<ProxyAccount[]>([])
  const [routingDecision, setRoutingDecision] = useState<RoutingDecision | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'proxies' | 'routing' | 'failover' | 'costs'>('overview')
  const [testingModel, setTestingModel] = useState({
    modelName: '',
    mediaType: 'image' as 'image' | 'video' | 'text',
    prompt: '',
    enableFailover: true
  })

  useEffect(() => {
    loadSystemStatus()
    loadProxyAccounts()

    // 定期刷新数据
    const interval = setInterval(() => {
      loadSystemStatus()
      loadProxyAccounts()
    }, 30000) // 30秒刷新一次

    return () => clearInterval(interval)
  }, [])

  const loadSystemStatus = async () => {
    try {
      const response = await fetch('/api/multi-agent?action=system-status')
      const result = await response.json()
      if (result.success) {
        setSystemStatus(result.data)
      }
    } catch (error) {
      console.error('Failed to load system status:', error)
    }
  }

  const loadProxyAccounts = async () => {
    try {
      const response = await fetch('/api/multi-agent?action=proxy-health')
      const result = await response.json()
      if (result.success) {
        setProxyAccounts(result.data)
      }
    } catch (error) {
      console.error('Failed to load proxy accounts:', error)
    } finally {
      setLoading(false)
    }
  }

  const testRouting = async () => {
    if (!testingModel.modelName) {
      alert('Please enter a model name')
      return
    }

    try {
      const params = new URLSearchParams({
        action: 'routing-decision',
        mediaType: testingModel.mediaType,
        model: testingModel.modelName,
        prompt: testingModel.prompt
      })

      const response = await fetch(`/api/multi-agent?${params}`)
      const result = await response.json()
      if (result.success) {
        setRoutingDecision(result.data)
      }
    } catch (error) {
      console.error('Failed to test routing:', error)
      alert('Failed to test routing')
    }
  }

  const triggerHealthCheck = async () => {
    try {
      const response = await fetch('/api/multi-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'trigger-health-check' })
      })
      const result = await response.json()
      if (result.success) {
        alert('Health check triggered successfully')
        loadSystemStatus()
        loadProxyAccounts()
      }
    } catch (error) {
      console.error('Failed to trigger health check:', error)
      alert('Failed to trigger health check')
    }
  }

  const triggerFailover = async (proxyId: string, proxyName: string) => {
    const reason = prompt(`Enter reason for manual failover of ${proxyName}:`)
    if (!reason) return

    try {
      const response = await fetch('/api/multi-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'trigger-failover',
          proxyId,
          reason
        })
      })
      const result = await response.json()
      if (result.success) {
        alert(`Failover triggered for ${proxyName}`)
        loadSystemStatus()
        loadProxyAccounts()
      }
    } catch (error) {
      console.error('Failed to trigger failover:', error)
      alert('Failed to trigger failover')
    }
  }

  const manualRecovery = async (proxyId: string, proxyName: string) => {
    if (!confirm(`Are you sure you want to manually recover ${proxyName}?`)) return

    try {
      const response = await fetch('/api/multi-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'manual-recovery',
          recoverProxyId: proxyId
        })
      })
      const result = await response.json()
      if (result.success) {
        alert(`${proxyName} recovered successfully`)
        loadSystemStatus()
        loadProxyAccounts()
      }
    } catch (error) {
      console.error('Failed to recover proxy:', error)
      alert('Failed to recover proxy')
    }
  }

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-50'
      case 'unhealthy': return 'text-red-600 bg-red-50'
      case 'degraded': return 'text-yellow-600 bg-yellow-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getHealthStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return '✅'
      case 'unhealthy': return '❌'
      case 'degraded': return '⚠️'
      default: return '❓'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">🤖 Multi-Agent Settings</h1>
        <p className="text-gray-600">Manage and monitor your AI provider proxy accounts with intelligent routing and failover</p>
      </div>

      {/* System Overview Cards */}
      {systemStatus && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Proxies</p>
                <p className="text-2xl font-bold text-gray-900">{systemStatus.proxyStats.total}</p>
              </div>
              <div className="text-blue-500 text-2xl">🌐</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Healthy Proxies</p>
                <p className="text-2xl font-bold text-green-600">{systemStatus.proxyStats.healthy}</p>
              </div>
              <div className="text-green-500 text-2xl">✅</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">System Uptime</p>
                <p className="text-2xl font-bold text-blue-600">{systemStatus.proxyStats.uptime.toFixed(1)}%</p>
              </div>
              <div className="text-blue-500 text-2xl">📊</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Failovers</p>
                <p className="text-2xl font-bold text-orange-600">{systemStatus.failoverManager.activeFailovers}</p>
              </div>
              <div className="text-orange-500 text-2xl">🔄</div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          {['overview', 'proxies', 'routing', 'failover', 'costs'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">System Services Status</h2>
            {systemStatus && (
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b">
                  <div>
                    <p className="font-medium">Health Checker</p>
                    <p className="text-sm text-gray-600">Monitor proxy health status</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded text-sm ${
                      systemStatus.healthChecker.isRunning
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {systemStatus.healthChecker.isRunning ? 'Running' : 'Stopped'}
                    </span>
                    <button
                      onClick={triggerHealthCheck}
                      className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      Test Now
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between py-2 border-b">
                  <div>
                    <p className="font-medium">Failover Manager</p>
                    <p className="text-sm text-gray-600">Automatic failover and recovery</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded text-sm ${
                      systemStatus.failoverManager.isRunning
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {systemStatus.failoverManager.isRunning ? 'Running' : 'Stopped'}
                    </span>
                    <span className="text-sm text-gray-600">
                      {systemStatus.failoverManager.activeFailovers} active failovers
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={triggerHealthCheck}
                className="p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
              >
                <div className="text-blue-600 text-2xl mb-2">🔍</div>
                <p className="font-medium">Run Health Check</p>
                <p className="text-sm text-gray-600">Check all proxy health</p>
              </button>

              <button
                onClick={() => setActiveTab('routing')}
                className="p-4 bg-green-50 rounded-lg hover:bg-green-100 transition"
              >
                <div className="text-green-600 text-2xl mb-2">🎯</div>
                <p className="font-medium">Test Routing</p>
                <p className="text-sm text-gray-600">Test intelligent routing</p>
              </button>

              <button
                onClick={() => setActiveTab('failover')}
                className="p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition"
              >
                <div className="text-orange-600 text-2xl mb-2">🔄</div>
                <p className="font-medium">Manage Failover</p>
                <p className="text-sm text-gray-600">Configure failover rules</p>
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'proxies' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold">Proxy Accounts</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Proxy
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Provider
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Performance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {proxyAccounts.map((proxy) => (
                  <tr key={proxy.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{proxy.name}</div>
                        {proxy.region && (
                          <div className="text-sm text-gray-500">{proxy.region}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{proxy.provider}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getHealthStatusColor(proxy.healthStatus)}`}>
                        {getHealthStatusIcon(proxy.healthStatus)} {proxy.healthStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>Response: {proxy.responseTime}ms</div>
                      <div>Success: {(proxy.successRate * 100).toFixed(1)}%</div>
                      <div>Uptime: {proxy.uptime.toFixed(1)}%</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{proxy.priority}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {proxy.healthStatus === 'unhealthy' && (
                          <button
                            onClick={() => manualRecovery(proxy.id, proxy.name)}
                            className="text-green-600 hover:text-green-900"
                          >
                            Recover
                          </button>
                        )}
                        {proxy.healthStatus !== 'unhealthy' && (
                          <button
                            onClick={() => triggerFailover(proxy.id, proxy.name)}
                            className="text-orange-600 hover:text-orange-900"
                          >
                            Failover
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'routing' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Test Intelligent Routing</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Model Name
                </label>
                <input
                  type="text"
                  value={testingModel.modelName}
                  onChange={(e) => setTestingModel({ ...testingModel, modelName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., gpt-4o, dall-e-3"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Media Type
                </label>
                <select
                  value={testingModel.mediaType}
                  onChange={(e) => setTestingModel({ ...testingModel, mediaType: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="image">Image</option>
                  <option value="video">Video</option>
                  <option value="text">Text</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prompt (optional)
                </label>
                <input
                  type="text"
                  value={testingModel.prompt}
                  onChange={(e) => setTestingModel({ ...testingModel, prompt: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter a test prompt..."
                />
              </div>

              <div className="md:col-span-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={testingModel.enableFailover}
                    onChange={(e) => setTestingModel({ ...testingModel, enableFailover: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Enable automatic failover</span>
                </label>
              </div>

              <div className="md:col-span-2">
                <button
                  onClick={testRouting}
                  className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition"
                >
                  Test Routing Decision
                </button>
              </div>
            </div>

            {routingDecision && (
              <div className="mt-6 p-4 bg-green-50 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-2">Routing Decision</h3>
                <div className="space-y-2 text-sm">
                  <div><strong>Selected Proxy:</strong> {routingDecision.selectedProxy.name} ({routingDecision.selectedProxy.provider})</div>
                  <div><strong>Selected Model:</strong> {routingDecision.selectedModel}</div>
                  <div><strong>Routing Reason:</strong> {routingDecision.routingReason}</div>
                  <div><strong>Estimated Cost:</strong> ${routingDecision.estimatedCost.toFixed(4)}</div>
                  <div><strong>Response Time:</strong> {routingDecision.estimatedResponseTime}ms</div>
                  {routingDecision.alternativeProxies.length > 0 && (
                    <div><strong>Alternatives:</strong> {routingDecision.alternativeProxies.map(p => p.name).join(', ')}</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'failover' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Failover Configuration</h2>
            <p className="text-gray-600 mb-4">
              Configure automatic failover rules and manage recovery settings.
            </p>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800">
                <strong>Note:</strong> Advanced failover configuration UI is under development.
                Use the API endpoints for detailed configuration.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Failover Events</h3>
            <div className="text-gray-500">
              Failover event history will be displayed here.
            </div>
          </div>
        </div>
      )}

      {activeTab === 'costs' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Cost Management</h2>
            <p className="text-gray-600 mb-4">
              Set up cost thresholds and monitor spending across different AI providers.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-800">
                <strong>Note:</strong> Cost management UI is under development.
                Use the cost thresholds API for detailed configuration.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}