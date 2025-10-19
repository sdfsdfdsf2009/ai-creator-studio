'use client'

import { useEffect, useState } from 'react'

export default function SettingsDiagnosticPage() {
  const [browserInfo, setBrowserInfo] = useState('')
  const [reactVersion, setReactVersion] = useState('')
  const [jsEnabled, setJsEnabled] = useState(false)

  useEffect(() => {
    setJsEnabled(true)
    setBrowserInfo(navigator.userAgent)
    setReactVersion('18.2.0') // React version

    // 测试事件监听器
    const testClick = () => {
      console.log('Diagnostic: 点击事件正常工作')
      alert('诊断测试：JavaScript 事件处理正常！')
    }

    // 添加全局点击监听器
    document.addEventListener('click', testClick)

    return () => {
      document.removeEventListener('click', testClick)
    }
  }, [])

  const testButtonEvent = (event: React.MouseEvent) => {
    console.log('Diagnostic: 按钮事件触发', event)
    alert('诊断测试：React 按钮事件正常工作！')
  }

  const testInlineEvent = () => {
    console.log('Diagnostic: 内联事件触发')
    alert('诊断测试：内联事件处理正常！')
  }

  const testInputEvent = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('Diagnostic: 输入事件触发', event.target.value)
  }

  if (!jsEnabled) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-100 p-4 rounded">
          <h1 className="text-red-700 font-bold text-xl">JavaScript 已禁用</h1>
          <p className="text-red-600">请启用 JavaScript 以使用此应用。</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">设置页面诊断工具</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 系统信息 */}
        <Card>
          <CardHeader>
            <CardTitle>系统信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p><strong>JavaScript:</strong> {jsEnabled ? '✅ 已启用' : '❌ 已禁用'}</p>
            <p><strong>React:</strong> ✅ {reactVersion}</p>
            <p><strong>浏览器:</strong> {browserInfo}</p>
            <p><strong>时间:</strong> {new Date().toLocaleString()}</p>
          </CardContent>
        </Card>

        {/* 事件测试 */}
        <Card>
          <CardHeader>
            <CardTitle>事件处理测试</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <button
              onClick={testButtonEvent}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 w-full"
            >
              React 按钮事件测试
            </button>

            <button
              onClick={testInlineEvent}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 w-full"
            >
              内联事件测试
            </button>

            <input
              type="text"
              placeholder="输入测试"
              onChange={testInputEvent}
              className="w-full p-2 border rounded"
            />

            <button
              onMouseDown={() => console.log('Diagnostic: Mouse down')}
              onMouseUp={() => console.log('Diagnostic: Mouse up')}
              className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 w-full"
            >
              鼠标事件测试
            </button>
          </CardContent>
        </Card>
      </div>

      {/* 控制台测试 */}
      <Card>
        <CardHeader>
          <CardTitle>控制台测试</CardTitle>
        </CardHeader>
        <CardContent>
          <p>请打开浏览器开发者工具的控制台（Console）标签页，查看是否有以下信息：</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>点击按钮时的日志信息</li>
            <li>任何 JavaScript 错误</li>
            <li>网络请求状态</li>
          </ul>
          <button
            onClick={() => {
              console.log('Diagnostic: 控制台测试成功！')
              console.log('Diagnostic: 当前时间:', new Date())
              console.log('Diagnostic: 用户代理:', navigator.userAgent)
              console.log('Diagnostic: URL:', window.location.href)
            }}
            className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 mt-4"
          >
            向控制台写入测试信息
          </button>
        </CardContent>
      </Card>

      {/* CSS 检查 */}
      <Card>
        <CardHeader>
          <CardTitle>CSS 样式检查</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="bg-red-500 text-white p-2 rounded">红色背景 - 如果显示正常，CSS 工作正常</div>
            <div className="bg-blue-500 text-white p-2 rounded">蓝色背景 - hover 效果测试</div>
            <div className="bg-green-500 text-white p-2 rounded pointer-events-none">绿色背景 - 禁用点击测试</div>
          </div>
        </CardContent>
      </Card>

      {/* 快速导航 */}
      <Card>
        <CardHeader>
          <CardTitle>快速导航测试</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <a href="/zh-CN/settings" className="block bg-blue-100 p-2 rounded hover:bg-blue-200">
              → 返回主设置页面
            </a>
            <a href="/zh-CN/settings/test" className="block bg-green-100 p-2 rounded hover:bg-green-200">
              → 前往简单测试页面
            </a>
            <a href="/zh-CN" className="block bg-gray-100 p-2 rounded hover:bg-gray-200">
              → 返回首页
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// 简单的 Card 组件实现
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-lg shadow-md border ${className}`}>
      {children}
    </div>
  )
}

function CardHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-6 py-4 border-b">
      {children}
    </div>
  )
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-lg font-semibold">
      {children}
    </h3>
  )
}

function CardContent({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`px-6 py-4 ${className}`}>
      {children}
    </div>
  )
}