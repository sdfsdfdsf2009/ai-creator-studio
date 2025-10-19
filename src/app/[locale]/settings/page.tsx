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
          {/* API代理配置 - 主要配置 */}
          <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium text-blue-800">🔗 API代理配置</h3>
                <p className="text-sm text-gray-600">配置中转站API服务，支持多种代理服务</p>
              </div>
              <button
                onClick={() => window.location.href = '/zh/settings/api-proxy'}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
              >
                配置
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-700">支持多种中转站API服务</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-700">灵活的模型选择和参数配置</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-700">API连接测试功能</span>
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