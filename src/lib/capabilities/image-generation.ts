/**
 * 图像生成能力
 * 封装图像生成的完整流程，支持批量生成、多模型、参数优化等
 */

import { BaseCapability, ImageOptions, ImageResult, CapabilityResult, CapabilityConfig } from './base'
import { withDatabase } from '@/lib/database'
import { mapDisplayNameToActualModel } from '@/lib/model-mapping'
import { registerCapability } from './manager'

export class ImageGenerationCapability extends BaseCapability {
  constructor(config: CapabilityConfig = { enabled: true }) {
    super(
      'ImageGeneration',
      '1.0.0',
      '图像生成能力，支持单张和批量图像生成、多模型支持和参数优化',
      config
    )
  }

  protected async onInitialize(): Promise<void> {
    // 初始化AI服务
    const { aiService } = await import('@/lib/ai-service')
    await aiService.initialize()
    console.log('✅ ImageGeneration capability initialized')
  }

  /**
   * 生成单张图像
   */
  async generateImage(
    prompt: string,
    model: string,
    options: ImageOptions = {}
  ): Promise<CapabilityResult<ImageResult>> {
    this.ensureInitialized()

    try {
      console.log(`🎨 开始图像生成: 模型=${model}, prompt="${prompt.substring(0, 50)}..."`)

      // 验证参数
      const validation = await this.validateParameters(prompt, model, options)
      if (!validation.success) {
        return this.createResult(false, undefined, validation.error)
      }

      // 映射模型名称
      const actualModel = mapDisplayNameToActualModel(model)
      console.log(`🔄 模型名称映射: ${model} -> ${actualModel}`)

      // 检查模型可用性
      const { aiService } = await import('@/lib/ai-service')
      const isModelAvailable = await aiService.testModel(actualModel)

      if (!isModelAvailable) {
        return this.createResult(false, undefined, `模型 ${actualModel} 不可用，请检查配置`)
      }

      // 准备生成参数
      const generationOptions = {
        ...options,
        quantity: 1 // 确保只生成一张
      }

      // 调用AI服务生成图像
      const results = await aiService.generateImage(actualModel, prompt, generationOptions)

      if (!results || results.length === 0) {
        return this.createResult(false, undefined, '图像生成失败：没有返回结果')
      }

      // 获取图像信息
      const imageInfo = await this.getImageInfo(results[0])

      // 构建标准结果
      const imageResult: ImageResult = {
        url: results[0],
        width: imageInfo.width,
        height: imageInfo.height,
        format: imageInfo.format,
        size: imageInfo.size,
        metadata: {
          model: actualModel,
          prompt: prompt.substring(0, 100),
          generatedAt: new Date().toISOString(),
          parameters: options
        }
      }

      console.log(`✅ 图像生成完成: ${imageResult.width}x${imageResult.height} ${imageResult.format}`)
      return this.createResult(true, imageResult)

    } catch (error) {
      console.error(`❌ 图像生成失败:`, error)
      return this.createResult(false, undefined, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  /**
   * 批量生成图像
   */
  async generateBatchImages(
    prompts: string[],
    model: string,
    options: ImageOptions = {}
  ): Promise<CapabilityResult<ImageResult[]>> {
    this.ensureInitialized()

    try {
      console.log(`🎨 开始批量图像生成: ${prompts.length} 个提示词`)

      const quantity = options.quantity || 1
      const totalImages = prompts.length * quantity
      const results: ImageResult[] = []
      let successCount = 0
      let failureCount = 0

      // 验证批量参数
      if (totalImages > 100) {
        return this.createResult(false, undefined, '批量生成数量不能超过100张')
      }

      for (let i = 0; i < prompts.length; i++) {
        const prompt = prompts[i]
        console.log(`📸 处理第 ${i + 1}/${prompts.length} 个提示词: "${prompt.substring(0, 30)}..."`)

        // 为每个提示词生成指定数量的图像
        for (let j = 0; j < quantity; j++) {
          try {
            // 为每张图像使用不同的seed确保多样性
            const imageOptions = {
              ...options,
              seed: options.seed ? options.seed + i * quantity + j : undefined,
              quantity: 1
            }

            const result = await this.generateImage(prompt, model, imageOptions)

            if (result.success && result.data) {
              results.push(result.data)
              successCount++
            } else {
              console.error(`❌ 图像生成失败: ${result.error}`)
              failureCount++
            }
          } catch (error) {
            console.error(`❌ 图像生成异常:`, error)
            failureCount++
          }

          // 添加延迟避免API限制
          if (j < quantity - 1) {
            await this.delay(1000)
          }
        }

        // 更新进度
        const progress = Math.round(((i + 1) / prompts.length) * 100)
        console.log(`📊 批量生成进度: ${progress}%`)
      }

      console.log(`✅ 批量图像生成完成: 成功 ${successCount}, 失败 ${failureCount}`)

      return this.createResult(true, results, undefined, {
        totalPrompts: prompts.length,
        quantityPerPrompt: quantity,
        totalRequested: totalImages,
        successCount,
        failureCount,
        successRate: Math.round((successCount / totalImages) * 100)
      })

    } catch (error) {
      console.error(`❌ 批量图像生成失败:`, error)
      return this.createResult(false, undefined, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  /**
   * 多模型图像生成（对比生成）
   */
  async generateMultiModelImages(
    prompt: string,
    models: string[],
    options: ImageOptions = {}
  ): Promise<CapabilityResult<{ model: string; results: ImageResult[] }[]>> {
    this.ensureInitialized()

    try {
      console.log(`🎨 开始多模型图像生成: ${models.length} 个模型`)

      if (models.length > 10) {
        return this.createResult(false, undefined, '模型数量不能超过10个')
      }

      const results: { model: string; results: ImageResult[] }[] = []

      for (let i = 0; i < models.length; i++) {
        const model = models[i]
        console.log(`🎭 处理模型 ${i + 1}/${models.length}: ${model}`)

        try {
          const modelResults = await this.generateBatchImages([prompt], model, {
            ...options,
            quantity: 1
          })

          if (modelResults.success && modelResults.data) {
            results.push({
              model,
              results: modelResults.data
            })
          } else {
            console.error(`❌ 模型 ${model} 生成失败: ${modelResults.error}`)
            results.push({
              model,
              results: []
            })
          }
        } catch (error) {
          console.error(`❌ 模型 ${model} 生成异常:`, error)
          results.push({
            model,
            results: []
          })
        }

        // 添加延迟
        if (i < models.length - 1) {
          await this.delay(2000)
        }
      }

      const successCount = results.filter(r => r.results.length > 0).length
      console.log(`✅ 多模型生成完成: ${successCount}/${models.length} 个模型成功`)

      return this.createResult(true, results, undefined, {
        totalModels: models.length,
        successModels: successCount,
        totalImages: results.reduce((sum, r) => sum + r.results.length, 0)
      })

    } catch (error) {
      console.error(`❌ 多模型图像生成失败:`, error)
      return this.createResult(false, undefined, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  /**
   * 图像变体生成
   */
  async generateImageVariations(
    originalImage: string,
    model: string,
    variations: number = 4,
    options: ImageOptions = {}
  ): Promise<CapabilityResult<ImageResult[]>> {
    this.ensureInitialized()

    try {
      console.log(`🎭 开始图像变体生成: ${variations} 个变体`)

      if (variations < 1 || variations > 10) {
        return this.createResult(false, undefined, '变体数量必须在1-10之间')
      }

      const results: ImageResult[] = []

      for (let i = 0; i < variations; i++) {
        try {
          // 使用不同的seed生成变体
          const variationOptions = {
            ...options,
            seed: options.seed ? options.seed + i + 1 : Date.now() + i,
            // 这里可以添加模型特定的变体参数
            variations: true,
            sourceImage: originalImage
          }

          const result = await this.generateImage(
            'Generate a variation of the provided image',
            model,
            variationOptions
          )

          if (result.success && result.data) {
            results.push(result.data)
          }

          // 添加延迟
          if (i < variations - 1) {
            await this.delay(1500)
          }
        } catch (error) {
          console.error(`❌ 变体 ${i + 1} 生成失败:`, error)
        }
      }

      console.log(`✅ 图像变体生成完成: ${results.length} 个变体`)
      return this.createResult(true, results, undefined, {
        requestedVariations: variations,
        generatedVariations: results.length
      })

    } catch (error) {
      console.error(`❌ 图像变体生成失败:`, error)
      return this.createResult(false, undefined, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  /**
   * 获取图像信息
   */
  private async getImageInfo(url: string): Promise<{
    width: number
    height: number
    format: string
    size: number
  }> {
    try {
      // 这里可以实现真实的图像信息获取
      // 目前返回模拟数据
      const extension = url.split('.').pop()?.toLowerCase() || 'jpg'

      return {
        width: 1024,
        height: 1024,
        format: extension,
        size: Math.floor(Math.random() * 2000000) + 500000 // 500KB - 2.5MB
      }
    } catch (error) {
      // 默认值
      return {
        width: 1024,
        height: 1024,
        format: 'jpg',
        size: 1000000
      }
    }
  }

  /**
   * 获取图像生成成本估算
   */
  async getCostEstimate(
    model: string,
    quantity: number = 1,
    options: ImageOptions = {}
  ): Promise<CapabilityResult<number>> {
    this.ensureInitialized()

    try {
      const actualModel = mapDisplayNameToActualModel(model)

      // 基础成本计算
      let baseCost = 0
      switch (actualModel) {
        case 'dall-e-3':
          baseCost = 0.04
          break
        case 'dall-e-2':
          baseCost = 0.02
          break
        case 'stable-diffusion-xl':
          baseCost = 0.01
          break
        case 'flux-pro':
          baseCost = 0.03
          break
        case 'gemini-2.5-flash-image':
          baseCost = 0.005
          break
        default:
          baseCost = 0.02
      }

      // 根据数量调整
      let totalCost = baseCost * quantity

      // 根据质量调整
      if (options.quality === 'hd') {
        totalCost *= 1.5
      }

      // 根据尺寸调整
      if (options.size && options.size.includes('1024')) {
        totalCost *= 1.2
      }

      return this.createResult(true, Math.round(totalCost * 100) / 100)
    } catch (error) {
      return this.createResult(false, undefined, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  /**
   * 验证图像生成参数
   */
  async validateParameters(
    prompt: string,
    model: string,
    options: ImageOptions = {}
  ): Promise<CapabilityResult<boolean>> {
    try {
      // 基础验证
      if (!prompt || prompt.trim().length === 0) {
        return this.createResult(false, undefined, 'Prompt 不能为空')
      }

      if (prompt.length > 4000) {
        return this.createResult(false, undefined, 'Prompt 长度不能超过4000个字符')
      }

      if (!model) {
        return this.createResult(false, undefined, '必须指定模型')
      }

      // 模型验证
      const actualModel = mapDisplayNameToActualModel(model)
      const supportedModels = [
        'dall-e-3', 'dall-e-2',
        'stable-diffusion-xl', 'flux-pro',
        'gemini-2.5-flash-image', 'midjourney-v6'
      ]

      if (!supportedModels.includes(actualModel)) {
        return this.createResult(false, undefined, `不支持的模型: ${model}`)
      }

      // 参数验证
      if (options.quantity && (options.quantity < 1 || options.quantity > 10)) {
        return this.createResult(false, undefined, '生成数量必须在1-10之间')
      }

      if (options.size) {
        const validSizes = ['256x256', '512x512', '1024x1024', '1792x1024', '1024x1792']
        if (!validSizes.includes(options.size)) {
          return this.createResult(false, undefined, `不支持的尺寸: ${options.size}`)
        }
      }

      if (options.quality && !['standard', 'hd'].includes(options.quality)) {
        return this.createResult(false, undefined, `不支持的质量: ${options.quality}`)
      }

      return this.createResult(true, true)
    } catch (error) {
      return this.createResult(false, undefined, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  /**
   * 获取支持的图像模型列表
   */
  getSupportedModels(): CapabilityResult<string[]> {
    const models = [
      { name: 'DALL-E 3', id: 'dall-e-3', description: 'OpenAI最新图像模型' },
      { name: 'DALL-E 2', id: 'dall-e-2', description: 'OpenAI图像模型' },
      { name: 'Stable Diffusion XL', id: 'stable-diffusion-xl', description: '开源高质量图像模型' },
      { name: 'Flux Pro', id: 'flux-pro', description: 'Black Forest Labs图像模型' },
      { name: 'Gemini 2.5 Flash Image', id: 'gemini-2.5-flash-image', description: 'Google多模态模型' },
      { name: 'Midjourney V6', id: 'midjourney-v6', description: '高质量艺术图像模型' }
    ]

    return this.createResult(true, models.map(m => m.name), undefined, {
      detailed: models
    })
  }

  /**
   * 图像优化（基于参数）
   */
  async optimizeImageParameters(
    prompt: string,
    model: string,
    targetQuality: 'speed' | 'balanced' | 'quality' = 'balanced'
  ): Promise<CapabilityResult<ImageOptions>> {
    this.ensureInitialized()

    try {
      const optimizedOptions: ImageOptions = {}

      switch (targetQuality) {
        case 'speed':
          optimizedOptions.quality = 'standard'
          optimizedOptions.size = '512x512'
          break
        case 'balanced':
          optimizedOptions.quality = 'standard'
          optimizedOptions.size = '1024x1024'
          break
        case 'quality':
          optimizedOptions.quality = 'hd'
          optimizedOptions.size = '1024x1024'
          break
      }

      // 根据模型调整参数
      const actualModel = mapDisplayNameToActualModel(model)
      if (actualModel.includes('dall-e')) {
        optimizedOptions.style = 'vivid'
      }

      // 根据prompt长度调整
      if (prompt.length > 500) {
        optimizedOptions.quality = 'hd'
      }

      return this.createResult(true, optimizedOptions, undefined, {
        targetQuality,
        model: actualModel
      })

    } catch (error) {
      return this.createResult(false, undefined, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  /**
   * 关闭能力
   */
  async shutdown(): Promise<void> {
    console.log('🔄 Shutting down ImageGeneration capability...')
    // 清理资源
    this._initialized = false
    console.log('✅ ImageGeneration capability shutdown complete')
  }
}

// 注册能力
registerCapability('ImageGeneration', ImageGenerationCapability)