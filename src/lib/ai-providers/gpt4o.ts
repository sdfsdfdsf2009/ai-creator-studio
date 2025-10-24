import { AIProvider, AIProviderConfig } from './index'

export interface GPT4OConfig extends AIProviderConfig {
  // GPT-4O特定的配置选项
  temperature?: number
  maxTokens?: number
  topP?: number
  frequencyPenalty?: number
  presencePenalty?: number
  systemPrompt?: string
}

export class GPT4OProvider implements AIProvider {
  private config: GPT4OConfig

  constructor(config: GPT4OConfig) {
    this.config = {
      temperature: 0.7,
      maxTokens: 4096,
      topP: 1,
      frequencyPenalty: 0,
      presencePenalty: 0,
      ...config
    }
  }

  async generateImage(prompt: string, options: {
    model?: string
    size?: string
    quality?: string
    style?: string
    quantity?: number
    negativePrompt?: string
    seed?: number
  }): Promise<string[]> {
    // GPT-4O主要用于文本生成，不支持直接的图像生成
    // 但可以生成图像提示词，然后调用其他图像模型
    throw new Error('GPT-4O does not support direct image generation. Use it for text generation or image prompt enhancement.')
  }

  async generateVideo(prompt: string, options: any): Promise<string[]> {
    // GPT-4O不支持视频生成
    throw new Error('GPT-4O does not support video generation.')
  }

  async generateText(prompt: string, options: {
    model?: string
    temperature?: number
    maxTokens?: number
    topP?: number
    frequencyPenalty?: number
    presencePenalty?: number
    systemPrompt?: string
    stream?: boolean
  }): Promise<string> {
    const {
      model = 'gpt-4o',
      temperature = this.config.temperature,
      maxTokens = this.config.maxTokens,
      topP = this.config.topP,
      frequencyPenalty = this.config.frequencyPenalty,
      presencePenalty = this.config.presencePenalty,
      systemPrompt,
      stream = false
    } = options

    const messages: any[] = []

    // 添加系统提示词
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt })
    }

    // 添加用户提示词
    messages.push({ role: 'user', content: prompt })

    const requestBody: any = {
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      top_p: topP,
      frequency_penalty: frequencyPenalty,
      presence_penalty: presencePenalty,
      stream
    }

    // 如果有systemPrompt配置但没有传入systemPrompt参数，使用配置中的值
    if (!systemPrompt && this.config.systemPrompt) {
      messages.unshift({ role: 'system', content: this.config.systemPrompt })
    }

    try {
      console.log(`GPT-4O API Request:`, {
        url: this.config.baseUrl,
        model,
        promptLength: prompt.length,
        temperature,
        maxTokens
      })

      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          ...(this.config.baseUrl.includes('nano-banana') ? {
            'X-API-Version': '2024-08-01'
          } : {})
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        const errorMessage = error.error?.message || response.statusText
        const errorCode = error.error?.code || response.status

        // 根据OpenAI API文档处理特定错误
        switch (errorCode) {
          case 401:
            throw new Error(`Authentication failed: ${errorMessage}. Please check your API key.`)
          case 403:
            throw new Error(`Access forbidden: ${errorMessage}. Check your permissions and billing status.`)
          case 404:
            throw new Error(`Model not found: ${model}. Please check the model name.`)
          case 429:
            throw new Error(`Rate limit exceeded: ${errorMessage}. Please wait and try again.`)
          case 500:
            throw new Error(`OpenAI server error: ${errorMessage}. Please try again later.`)
          case 503:
            throw new Error(`Service unavailable: ${errorMessage}. Please try again later.`)
          default:
            throw new Error(`GPT-4O API error (${errorCode}): ${errorMessage}`)
        }
      }

      if (stream) {
        // 处理流式响应
        return await this.handleStreamResponse(response)
      } else {
        // 处理普通响应
        const result = await response.json()

        if (!result.choices || result.choices.length === 0) {
          throw new Error('No response returned from GPT-4O')
        }

        const content = result.choices[0].message?.content
        if (!content) {
          throw new Error('Empty response from GPT-4O')
        }

        console.log(`GPT-4O Response:`, {
          model: result.model,
          usage: result.usage,
          contentLength: content.length
        })

        return content
      }
    } catch (error) {
      console.error('GPT-4O API Error:', error)
      throw error
    }
  }

  private async handleStreamResponse(response: Response): Promise<string> {
    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('Stream response reader not available')
    }

    const decoder = new TextDecoder()
    let fullContent = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') {
              return fullContent
            }

            try {
              const parsed = JSON.parse(data)
              const content = parsed.choices?.[0]?.delta?.content
              if (content) {
                fullContent += content
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }

    return fullContent
  }

  async enhanceImagePrompt(originalPrompt: string, options: {
    style?: string
    mood?: string
    composition?: string
    lighting?: string
    colorScheme?: string
    additionalDetails?: string
  } = {}): Promise<string> {
    const systemPrompt = `你是一个专业的AI图像提示词优化专家。你的任务是优化用户的图像生成提示词，使其更加详细、专业和有效。

优化原则：
1. 保持用户原始意图不变
2. 添加专业的艺术和摄影术语
3. 明确图像的风格、构图、光照等要素
4. 使用描述性语言，避免模糊表达
5. 按照重要程度组织提示词结构

请直接返回优化后的提示词，不要添加解释。`

    const enhancementPrompt = `请优化以下图像生成提示词：

原始提示词：${originalPrompt}

优化要求：
${options.style ? `- 风格：${options.style}` : ''}
${options.mood ? `- 情绪氛围：${options.mood}` : ''}
${options.composition ? `- 构图：${options.composition}` : ''}
${options.lighting ? `- 光照：${options.lighting}` : ''}
${options.colorScheme ? `- 色彩方案：${options.colorScheme}` : ''}
${options.additionalDetails ? `- 其他要求：${options.additionalDetails}` : ''}

请返回优化后的英文提示词：`

    try {
      const enhancedPrompt = await this.generateText(enhancementPrompt, {
        systemPrompt,
        temperature: 0.8,
        maxTokens: 500
      })

      return enhancedPrompt.trim()
    } catch (error) {
      console.error('Failed to enhance prompt:', error)
      // 如果增强失败，返回原始提示词
      return originalPrompt
    }
  }

  async generateImageVariations(basePrompt: string, variationCount: number = 3): Promise<string[]> {
    const systemPrompt = `你是一个AI图像提示词生成专家。基于一个基础提示词，生成多个不同风格和变化的新提示词。

变化可以包括：
- 不同的艺术风格
- 不同的构图角度
- 不同的光照条件
- 不同的色彩方案
- 不同的情绪氛围
- 不同的细节程度

请为每个变化生成完整的英文提示词，每行一个。`

    const variationPrompt = `基于以下基础提示词，生成${variationCount}个不同的变化版本：

基础提示词：${basePrompt}

请生成${variationCount}个变化版本：`

    try {
      const variations = await this.generateText(variationPrompt, {
        systemPrompt,
        temperature: 0.9,
        maxTokens: 800
      })

      return variations.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .slice(0, variationCount)
    } catch (error) {
      console.error('Failed to generate variations:', error)
      return [basePrompt] // 如果生成失败，返回原始提示词
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      console.log(`Testing GPT-4O API connection...`)
      console.log(`URL: ${this.config.baseUrl}`)
      console.log(`API Key: ${this.config.apiKey ? 'Set' : 'Not set'}`)

      // 发送一个简单的测试请求
      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: 'Hello' }],
          max_tokens: 10
        })
      })

      console.log(`API Response Status: ${response.status} ${response.statusText}`)

      if (response.ok) {
        console.log('✅ GPT-4O API connection test successful')
        return true
      } else {
        const errorText = await response.text()
        console.log(`❌ GPT-4O API connection test failed: ${response.status} ${errorText}`)
        return false
      }
    } catch (error) {
      console.warn('❌ GPT-4O connection test failed:', error)
      return false
    }
  }

  getCostEstimate(type: 'image' | 'video' | 'text', options: any): number {
    // GPT-4O定价 (based on typical OpenAI pricing)
    if (type === 'text') {
      const model = options.model || 'gpt-4o'
      const maxTokens = options.maxTokens || 4096

      // 简化的成本估算
      if (model === 'gpt-4o') {
        return (maxTokens / 1000) * 0.005 // $0.005 per 1K tokens
      } else if (model === 'gpt-4o-mini') {
        return (maxTokens / 1000) * 0.00015 // $0.00015 per 1K tokens
      }
    }

    return 0
  }

  // 更新配置
  updateConfig(newConfig: Partial<GPT4OConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  // 获取当前配置
  getConfig(): GPT4OConfig {
    return { ...this.config }
  }
}