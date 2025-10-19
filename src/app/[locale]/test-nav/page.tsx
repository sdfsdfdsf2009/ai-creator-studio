'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { LanguageSwitcher } from '@/components/language-switcher'
import { useLocale } from 'next-intl'

export default function TestNavPage() {
  const locale = useLocale()

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold mb-6">导航诊断测试页面</h1>

      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        <h2 className="text-xl font-semibold">🧪 设置按钮专项测试</h2>
        <p className="text-gray-600">
          这个页面包含与主页导航栏完全相同的设置按钮，用于诊断问题。
        </p>

        <div className="space-y-6">
          <div className="p-4 border-2 border-blue-500 rounded bg-blue-50">
            <h3 className="font-semibold mb-2 text-blue-800">🎯 完全相同的导航栏设置按钮</h3>
            <p className="text-sm text-blue-600 mb-4">
              这是从导航组件复制的完全相同的设置按钮代码：
            </p>

            {/* 复制导航组件的设置按钮代码 */}
            <div className="flex items-center space-x-4 p-4 bg-white border rounded">
              <LanguageSwitcher />
              <Link href={`/${locale}/settings`}>
                <Button variant="outline" size="sm">
                  设置
                </Button>
              </Link>
            </div>
          </div>

          <div className="p-4 border rounded">
            <h3 className="font-semibold mb-2">1. 简化版设置按钮测试</h3>
            <Link href="/zh/settings">
              <Button>设置页面 (简化链接)</Button>
            </Link>
          </div>

          <div className="p-4 border rounded">
            <h3 className="font-semibold mb-2">2. 动态locale设置按钮测试</h3>
            <Link href={`/${locale}/settings`}>
              <Button variant="outline">设置页面 ({locale}/settings)</Button>
            </Link>
          </div>

          <div className="p-4 border rounded">
            <h3 className="font-semibold mb-2">3. 原始HTML链接测试</h3>
            <a href="/zh/settings" className="inline-block">
              <Button variant="secondary">设置页面 (HTML链接)</Button>
            </a>
          </div>

          <div className="p-4 border rounded">
            <h3 className="font-semibold mb-2">4. JavaScript跳转测试</h3>
            <Button
              variant="destructive"
              onClick={() => {
                console.log('JavaScript跳转被调用')
                window.location.href = '/zh/settings'
              }}
            >
              设置页面 (JavaScript跳转)
            </Button>
          </div>

          <div className="p-4 border rounded">
            <h3 className="font-semibold mb-2">5. 控制台测试按钮</h3>
            <Button
              onClick={() => {
                console.log('✅ 点击测试成功！')
                console.log('当前locale:', locale)
                console.log('目标URL:', `/${locale}/settings`)
                alert(`按钮点击成功！\n当前locale: ${locale}\n目标URL: /${locale}/settings`)
              }}
            >
              🧪 测试点击功能
            </Button>
          </div>
        </div>

        <div className="mt-6 p-4 bg-yellow-50 rounded">
          <h3 className="font-semibold mb-2">🔍 诊断步骤：</h3>
          <ol className="text-sm space-y-1">
            <li>1. 首先测试"🧪 测试点击功能"按钮 - 确认JavaScript工作正常</li>
            <li>2. 然后测试"完全相同的导航栏设置按钮"</li>
            <li>3. 如果这个按钮不工作，问题在导航组件本身</li>
            <li>4. 如果这个按钮工作正常，问题在主页的导航组件</li>
            <li>5. 打开浏览器开发者工具（F12）查看控制台日志</li>
          </ol>
        </div>

        <div className="mt-6 p-4 bg-green-50 rounded">
          <h3 className="font-semibold mb-2">💡 预期结果：</h3>
          <ul className="text-sm space-y-1">
            <li>✅ 如果所有按钮都能正常跳转到设置页面 - 说明链接本身没问题</li>
            <li>❌ 如果只有"完全相同的导航栏设置按钮"不工作 - 说明导航组件有bug</li>
            <li>❌ 如果所有按钮都不工作 - 说明JavaScript或路由有问题</li>
          </ul>
        </div>
      </div>
    </div>
  )
}