'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function TestImagePage() {
  const [prompt, setPrompt] = useState('一只可爱的猫在花园里玩耍')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [testConfig, setTestConfig] = useState({
    baseUrl: '',
    apiKey: '',
    model: 'gemini-2.5-flash-image'
  })

  const handleTestProxyConnection = async () => {
    if (!testConfig.baseUrl || !testConfig.apiKey) {
      setError('请先配置API基础URL和密钥')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // 测试连接
      const response = await fetch(`${testConfig.baseUrl}/v1/images/generations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testConfig.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: testConfig.model,
          prompt: 'test image',
          size: '1:1'
        })
      })

      if (response.ok) {
        const data = await response.json()
        setResult(`✅ 连接成功！任务ID: ${data.id}`)
      } else {
        const errorData = await response.json()
        setError(`❌ 连接失败: ${errorData.error?.message || response.statusText}`)
      }
    } catch (error) {
      setError(`❌ 连接错误: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGenerateImage = async () => {
    if (!testConfig.baseUrl || !testConfig.apiKey) {
      setError('请先配置API基础URL和密钥')
      return
    }

    if (!prompt.trim()) {
      setError('请输入图片描述')
      return
    }

    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      // 生成图片
      const response = await fetch(`${testConfig.baseUrl}/v1/images/generations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testConfig.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: testConfig.model,
          prompt: prompt,
          size: '1:1'
        })
      })

      if (response.ok) {
        const data = await response.json()
        setResult(`✅ 图片生成任务已创建！任务ID: ${data.id}\n请等待处理完成...`)

        // 轮询结果
        const imageUrl = await pollImageResult(data.id)
        setResult(`✅ 图片生成成功！\n图片URL: ${imageUrl}`)
      } else {
        const errorData = await response.json()
        setError(`❌ 生成失败: ${errorData.error?.message || response.statusText}`)
      }
    } catch (error) {
      setError(`❌ 生成错误: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  const pollImageResult = async (taskId: string): Promise<string> => {
    const maxAttempts = 30
    const delay = 10000

    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, delay))

      try {
        const response = await fetch(`${testConfig.baseUrl}/v1/images/generations/${taskId}`, {
          headers: {
            'Authorization': `Bearer ${testConfig.apiKey}`
          }
        })

        if (response.ok) {
          const data = await response.json()

          if (data.status === 'completed') {
            return data.results?.[0]?.url || 'No image URL returned'
          } else if (data.status === 'failed') {
            throw new Error(data.error?.message || 'Generation failed')
          }
        }
      } catch (error) {
        console.warn(`轮询结果时出错:`, error)
      }
    }

    throw new Error('图片生成超时')
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">图片生成测试</h1>
          <p className="text-gray-600 mt-1">测试Nano Banana图片生成功能</p>
        </div>
      </div>

      {/* API配置 */}
      <Card>
        <CardHeader>
          <CardTitle>🔧 API配置</CardTitle>
          <CardDescription>
            配置Nano Banana API连接信息
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="test-base-url">API基础URL</Label>
            <Input
              id="test-base-url"
              placeholder="https://api.evolink.ai"
              value={testConfig.baseUrl}
              onChange={(e) => setTestConfig({ ...testConfig, baseUrl: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="test-api-key">API密钥</Label>
            <Input
              id="test-api-key"
              type="password"
              placeholder="your-evolink-api-key"
              value={testConfig.apiKey}
              onChange={(e) => setTestConfig({ ...testConfig, apiKey: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="test-model">模型</Label>
            <select
              id="test-model"
              value={testConfig.model}
              onChange={(e) => setTestConfig({ ...testConfig, model: e.target.value })}
              className="w-full mt-1 p-2 border rounded-md"
            >
              <option value="gemini-2.5-flash-image">Gemini 2.5 Flash</option>
            </select>
          </div>
          <Button
            onClick={handleTestProxyConnection}
            disabled={isLoading || !testConfig.baseUrl || !testConfig.apiKey}
          >
            {isLoading ? '测试中...' : '测试连接'}
          </Button>
        </CardContent>
      </Card>

      {/* 图片生成 */}
      <Card>
        <CardHeader>
          <CardTitle>🎨 图片生成</CardTitle>
          <CardDescription>
            生成测试图片
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="prompt">图片描述</Label>
            <Input
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="输入您想生成的图片描述..."
              className="mt-1"
            />
          </div>
          <Button
            onClick={handleGenerateImage}
            disabled={isLoading || !testConfig.baseUrl || !testConfig.apiKey || !prompt.trim()}
            className="w-full"
          >
            {isLoading ? '生成中...' : '生成图片'}
          </Button>
        </CardContent>
      </Card>

      {/* 结果显示 */}
      {(result || error) && (
        <Card>
          <CardHeader>
            <CardTitle>📊 结果</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`p-4 rounded-md whitespace-pre-wrap ${
              result ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              {result || error}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 使用说明 */}
      <Card>
        <CardHeader>
          <CardTitle>📋 使用说明</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-600">
          <p>1. 在API配置中输入您的Evolink API基础URL和密钥</p>
          <p>2. 点击"测试连接"验证API连接是否正常</p>
          <p>3. 在图片描述中输入您想生成的内容</p>
          <p>4. 点击"生成图片"开始生成</p>
          <p>5. Nano Banana是异步处理，需要等待一段时间才能完成</p>
        </CardContent>
      </Card>
    </div>
  )
}