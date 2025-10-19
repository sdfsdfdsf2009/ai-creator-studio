'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function SettingsPage() {
  const [openaiApiKey, setOpenaiApiKey] = useState('')
  const [openaiEnabled, setOpenaiEnabled] = useState(false)
  const [testResult, setTestResult] = useState<string>('')

  const handleToggleOpenAI = () => {
    console.log('Toggle OpenAI clicked')
    setOpenaiEnabled(!openaiEnabled)
    alert(`OpenAI ${!openaiEnabled ? '已启用' : '已禁用'}`)
  }

  const handleApiKeyChange = (value: string) => {
    console.log('API Key changed:', value.substring(0, 10) + '...')
    setOpenaiApiKey(value)
  }

  const handleTestConnection = async () => {
    console.log('Test connection clicked')
    setTestResult('测试中...')

    // 模拟连接测试
    setTimeout(() => {
      if (openaiApiKey) {
        setTestResult('连接成功 ✓')
        alert('连接测试成功！')
      } else {
        setTestResult('请先输入API密钥')
        alert('请先输入API密钥')
      }
    }, 1000)
  }

  const handleSave = () => {
    console.log('Save settings clicked')
    console.log('Settings:', { openaiEnabled, openaiApiKey })
    alert('设置已保存！\nOpenAI: ' + (openaiEnabled ? '启用' : '禁用') +
          (openaiApiKey ? '\nAPI密钥: 已设置' : '\nAPI密钥: 未设置'))
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">设置</h1>
          <p className="text-muted-foreground">配置AI服务和应用设置</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline">
            已启用 {openaiEnabled ? '1' : '0'} 个AI服务
          </Badge>
        </div>
      </div>

      <div className="space-y-6">
        {/* AI服务配置 */}
        <Card>
          <CardHeader>
            <CardTitle>AI服务提供商</CardTitle>
            <CardDescription>
              配置您的AI服务API密钥和设置。启用服务后，可以在任务创建时选择对应的模型。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* OpenAI 配置 */}
            <div className="border rounded-lg p-4 space-y-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold">OpenAI</h3>
                    <Badge variant="secondary">
                      {openaiEnabled ? '已启用' : '未启用'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    支持 DALL-E 图片生成
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant={openaiEnabled ? "default" : "outline"}
                    size="sm"
                    onClick={handleToggleOpenAI}
                  >
                    {openaiEnabled ? '禁用' : '启用'}
                  </Button>
                </div>
              </div>

              {openaiEnabled && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>API密钥</Label>
                      <Input
                        type="password"
                        value={openaiApiKey}
                        onChange={(e) => handleApiKeyChange(e.target.value)}
                        placeholder="输入OpenAI API密钥"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleTestConnection}
                    >
                      测试连接
                    </Button>
                    {testResult && (
                      <div className="text-sm">
                        <span className={testResult.includes('成功') ? 'text-green-600' : 'text-red-600'}>
                          {testResult}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 其他服务提示 */}
        <Card>
          <CardHeader>
            <CardTitle>其他AI服务</CardTitle>
            <CardDescription>
              更多AI服务配置将在后续版本中添加
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border rounded-lg p-4 opacity-50">
                <h4 className="font-medium">Stability AI</h4>
                <p className="text-sm text-muted-foreground">即将推出</p>
              </div>
              <div className="border rounded-lg p-4 opacity-50">
                <h4 className="font-medium">Runway</h4>
                <p className="text-sm text-muted-foreground">即将推出</p>
              </div>
              <div className="border rounded-lg p-4 opacity-50">
                <h4 className="font-medium">Pika Labs</h4>
                <p className="text-sm text-muted-foreground">即将推出</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 保存按钮 */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                配置更改需要手动保存
              </div>
              <Button onClick={handleSave}>
                保存设置
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}