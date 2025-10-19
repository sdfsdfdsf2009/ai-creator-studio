'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function TestLinksPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold mb-6">链接测试页面</h1>

      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h2 className="text-xl font-semibold">测试各种链接方式</h2>

        <div className="space-y-4">
          <div className="p-4 border rounded">
            <h3 className="font-semibold mb-2">1. Next.js Link 组件 (推荐方式)</h3>
            <Link href="/zh/settings">
              <Button>设置页面 (Link组件)</Button>
            </Link>
          </div>

          <div className="p-4 border rounded">
            <h3 className="font-semibold mb-2">2. HTML 标签链接</h3>
            <a href="/zh/settings" className="inline-block">
              <Button variant="outline">设置页面 (HTML链接)</Button>
            </a>
          </div>

          <div className="p-4 border rounded">
            <h3 className="font-semibold mb-2">3. JavaScript 跳转</h3>
            <Button
              variant="secondary"
              onClick={() => {
                console.log('JavaScript跳转被调用')
                window.location.href = '/zh/settings'
              }}
            >
              设置页面 (JavaScript跳转)
            </Button>
          </div>

          <div className="p-4 border rounded">
            <h3 className="font-semibold mb-2">4. useRouter 跳转</h3>
            <Button
              variant="destructive"
              onClick={() => {
                console.log('useRouter跳转被调用')
                // 这里暂时使用window.location，因为这是测试页面
                window.location.href = '/zh/settings'
              }}
            >
              设置页面 (Router跳转)
            </Button>
          </div>
        </div>

        <div className="mt-6 p-4 bg-gray-50 rounded">
          <h3 className="font-semibold mb-2">调试说明：</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>✅ 如果任何一个按钮能正常跳转，说明路由工作正常</li>
            <li>✅ 打开浏览器开发者工具查看console日志</li>
            <li>✅ 如果所有按钮都无响应，说明JavaScript可能被阻止</li>
            <li>✅ 如果页面跳转但显示404，说明路由配置有问题</li>
          </ul>
        </div>
      </div>
    </div>
  )
}