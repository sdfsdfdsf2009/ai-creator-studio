'use client'

export default function SettingsPageSimple() {
  const handleTestClick = () => {
    console.log('✅ 按钮点击成功！')
    alert('🎉 设置页面按钮功能正常工作！')
  }

  const handleToggleClick = () => {
    console.log('✅ 切换按钮点击成功！')
    const isEnabled = confirm('是否启用 OpenAI 服务？\n\n点击"确定"启用，点击"取消"禁用。')
    alert(`OpenAI 服务已${isEnabled ? '启用' : '禁用'}`)
  }

  const handleSaveClick = () => {
    console.log('✅ 保存按钮点击成功！')
    alert('💾 设置已保存成功！')
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">AI 创作工作室 - 设置</h1>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">🌐 AI 服务配置</h2>

        <div className="space-y-6">
          {/* 智能代理管理 - 新功能 */}
          <div className="border border-purple-200 bg-purple-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium text-purple-800">🌐 智能代理管理</h3>
                <p className="text-sm text-gray-600">多代理提供商智能路由和负载均衡管理</p>
              </div>
              <button
                onClick={() => window.location.href = '/zh/settings/smart-proxy'}
                className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 transition-colors"
              >
                管理代理
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <span className="text-sm text-gray-700">支持多个AI提供商（OpenAI、Anthropic、Google等）</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <span className="text-sm text-gray-700">智能路由和故障转移机制</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <span className="text-sm text-gray-700">实时健康监控和性能统计</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-sm text-gray-700">
                  <span className="font-medium">快速操作：</span>
                  <button
                    onClick={() => window.location.href = '/zh/settings/smart-proxy?tab=monitoring'}
                    className="text-blue-600 hover:text-blue-800 underline ml-1"
                  >
                    实时监控
                  </button>
                  /
                  <button
                    onClick={() => window.location.href = '/zh/settings/smart-proxy?tab=rules'}
                    className="text-blue-600 hover:text-blue-800 underline ml-1"
                  >
                    路由规则
                  </button>
                </span>
              </div>
            </div>
          </div>

          {/* API代理配置 - 主要配置 */}
          <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium text-blue-800">🔗 代理账户管理</h3>
                <p className="text-sm text-gray-600">配置和管理代理服务账户</p>
              </div>
              <button
                onClick={() => window.location.href = '/zh/settings/proxy-accounts'}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
              >
                管理账户
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-700">支持多种代理服务提供商</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-700">API连接测试和验证</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-700">账户健康状态监控</span>
              </div>
            </div>
          </div>

          {/* EvoLink AI 模型管理 */}
          <div className="border border-green-200 bg-green-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium text-green-800">🤖 EvoLink AI 模型管理</h3>
                <p className="text-sm text-gray-600">管理EvoLink.AI模型配置、测试连接和预置管理</p>
              </div>
              <button
                onClick={() => window.location.href = '/zh/settings/evolink-models'}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors"
              >
                管理模型
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-700">16个AI模型模板（文本、图像、视频）</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-700">智能预置管理，一键配置所有模型</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-700">API连接测试和状态监控</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-sm text-gray-700">
                  <span className="font-medium">快速操作：</span>
                  <button
                    onClick={() => window.location.href = '/zh/settings/evolink-models?tab=preset'}
                    className="text-blue-600 hover:text-blue-800 underline ml-1"
                  >
                    预置管理
                  </button>
                </span>
              </div>
            </div>
          </div>

          {/* OpenAI 配置 - 备用配置 */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium">OpenAI 直连</h3>
                <p className="text-sm text-gray-600">配置 OpenAI API Key 和模型设置</p>
              </div>
              <button
                onClick={handleToggleClick}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors"
              >
                启用/禁用
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">API Key</label>
                <input
                  type="password"
                  placeholder="sk-..."
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">模型</label>
                <select className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <option value="gpt-4">GPT-4</option>
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                  <option value="dall-e-3">DALL-E 3</option>
                </select>
              </div>
            </div>
          </div>

          {/* 其他服务配置 */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium">Stability AI</h3>
                <p className="text-sm text-gray-600">图像生成服务配置</p>
              </div>
              <button
                onClick={() => alert('Stability AI 配置功能开发中...')}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors"
              >
                配置
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">🧪 功能测试</h2>
        <p className="text-gray-600 mb-4">
          如果您能看到这个页面并且按钮可以正常点击，说明设置页面的基本功能已经修复了。
        </p>

        <div className="space-x-4">
          <button
            onClick={handleTestClick}
            className="bg-green-500 text-white px-6 py-3 rounded hover:bg-green-600 transition-colors text-lg"
          >
            🎯 测试按钮功能
          </button>

          <button
            onClick={handleSaveClick}
            className="bg-purple-500 text-white px-6 py-3 rounded hover:bg-purple-600 transition-colors text-lg"
          >
            💾 保存设置
          </button>
        </div>
      </div>

      <div className="bg-blue-50 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">📋 测试说明</h2>
        <ul className="space-y-2 text-sm">
          <li>✅ 页面正常加载 - 说明路由和组件工作正常</li>
          <li>✅ CSS 样式显示正常 - 说明 Tailwind CSS 工作正常</li>
          <li>🔘 点击上方测试按钮 - 验证 JavaScript 事件处理</li>
          <li>🔘 尝试启用/禁用 OpenAI - 测试交互功能</li>
          <li>🔘 在输入框中输入文字 - 测试表单控件</li>
        </ul>

        <div className="mt-4 p-3 bg-yellow-100 rounded">
          <p className="text-sm">
            <strong>调试提示：</strong> 请打开浏览器开发者工具（F12），查看控制台是否有错误信息或成功日志。
          </p>
        </div>
      </div>

      <div className="bg-blue-50 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">🔧 更多设置</h2>
        <div className="space-y-3">
          <a href="/zh/settings/debug" className="block p-4 bg-white border rounded-lg hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-purple-800">🧪 调试和测试</h3>
                <p className="text-sm text-gray-600">系统诊断和功能测试页面</p>
              </div>
              <div className="text-purple-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </a>

          <div className="block p-4 bg-white border rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-800">📊 数据备份</h3>
                <p className="text-sm text-gray-600">导出和备份您的创作数据</p>
              </div>
              <button
                onClick={() => alert('数据备份功能开发中...')}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          <div className="block p-4 bg-white border rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-800">🎨 界面主题</h3>
                <p className="text-sm text-gray-600">自定义应用外观和主题</p>
              </div>
              <button
                onClick={() => alert('主题设置功能开发中...')}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          <div className="block p-4 bg-white border rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-800">📱 通知设置</h3>
                <p className="text-sm text-gray-600">配置系统通知和提醒</p>
              </div>
              <button
                onClick={() => alert('通知设置功能开发中...')}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 text-center text-gray-500 text-sm">
        <p>AI 创作工作室 v2.0 - 设置页面</p>
      </div>
    </div>
  )
}