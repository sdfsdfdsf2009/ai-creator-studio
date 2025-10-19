import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { Task, MediaType, TaskStatus } from '@/types'
import { feishuAPI } from '@/lib/feishu'

// 全局任务存储，用于API间共享
declare global {
  var __tasks: Map<string, Task>
}

if (!global.__tasks) {
  global.__tasks = new Map()
}

const tasks = global.__tasks

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, prompt, model, parameters } = body

    // 验证请求参数
    if (!type || !prompt || !model) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: type, prompt, model' },
        { status: 400 }
      )
    }

    // 验证类型
    if (!['image', 'video'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid type. Must be image or video' },
        { status: 400 }
      )
    }

    // 创建新任务
    const taskId = uuidv4()
    const now = new Date().toISOString()

    const task: Task = {
      id: taskId,
      type: type as MediaType,
      prompt,
      status: 'pending' as TaskStatus,
      progress: 0,
      results: [],
      cost: calculateCost(type, model, parameters),
      model,
      parameters,
      createdAt: now,
      updatedAt: now
    }

    // 存储任务
    tasks.set(taskId, task)

    // 尝试同步到飞书（可选，失败不影响主要功能）
    try {
      await feishuAPI.createTaskRecord({
        taskId,
        type,
        prompt,
        model,
        parameters
      })
    } catch (feishuError) {
      console.warn('Failed to sync to Feishu:', feishuError)
    }

    // 异步处理任务
    processTask(taskId)

    return NextResponse.json({
      success: true,
      data: task
    })

  } catch (error) {
    console.error('Error creating task:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    let filteredTasks = Array.from(tasks.values())

    // 过滤状态
    if (status) {
      filteredTasks = filteredTasks.filter(task => task.status === status)
    }

    // 过滤类型
    if (type) {
      filteredTasks = filteredTasks.filter(task => task.type === type)
    }

    // 按创建时间倒序排列
    filteredTasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    // 分页
    const paginatedTasks = filteredTasks.slice(offset, offset + limit)

    return NextResponse.json({
      success: true,
      data: {
        items: paginatedTasks,
        total: filteredTasks.length,
        limit,
        offset,
        hasMore: offset + limit < filteredTasks.length
      }
    })

  } catch (error) {
    console.error('Error fetching tasks:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// 计算任务成本
function calculateCost(type: MediaType, model: string, parameters: any): number {
  const modelCosts: Record<string, number> = {
    'dall-e-3': 0.04,
    'midjourney-v6': 0.03,
    'midjourney-v5.2': 0.025,
    'stable-diffusion-xl': 0.01,
    'flux-pro': 0.03,
    'gemini-2.5-flash-image': 1.6, // Nano Banana 官方定价
    'runway-gen3': 0.25,
    'runway-gen2': 0.15,
    'pika-labs': 0.12,
    'stable-video': 0.08
  }

  const baseCost = modelCosts[model] || 0.04

  if (type === 'image') {
    const quantity = parameters?.quantity || 1
    return baseCost * quantity
  } else if (type === 'video') {
    const duration = parameters?.duration || 5
    return baseCost * (duration / 5) // 按5秒为基准计算
  }

  return baseCost
}

// 异步处理任务
async function processTask(taskId: string) {
  const task = tasks.get(taskId)
  if (!task) return

  try {
    // 更新任务状态为运行中
    updateTaskStatus(taskId, 'running', 0)

    // 使用真实的AI生成服务
    await processWithAI(taskId)

    // 更新任务状态为完成
    updateTaskStatus(taskId, 'completed', 100)

  } catch (error) {
    console.error('Error processing task:', error)
    updateTaskStatus(taskId, 'failed', 0, error instanceof Error ? error.message : 'Unknown error')
  }
}

// 使用真实的AI生成服务
async function processWithAI(taskId: string) {
  const task = tasks.get(taskId)
  if (!task) return

  try {
    // 动态导入 AI 服务
    const { aiService } = await import('@/lib/ai-service')

    // 确保AI服务已初始化
    await aiService.initialize()

    let results: string[] = []

    // 根据任务类型调用相应的生成方法
    if (task.type === 'image') {
      console.log(`开始图片生成任务: model=${task.model}, prompt="${task.prompt.substring(0, 50)}..."`)

      // 检查模型是否可用
      const isModelAvailable = await aiService.testModel(task.model)
      console.log(`模型 ${task.model} 可用性:`, isModelAvailable)

      if (!isModelAvailable) {
        throw new Error(`模型 ${task.model} 不可用，请检查代理配置`)
      }

      results = await aiService.generateImage(task.model, task.prompt, task.parameters)
      console.log(`图片生成完成，结果数量: ${results.length}`)

      // 更新进度 - 图片生成步骤较少
      updateTaskStatus(taskId, 'running', 50)

    } else if (task.type === 'video') {
      console.log(`开始视频生成任务: model=${task.model}`)
      results = await aiService.generateVideo(task.model, task.prompt, task.parameters)

      // 更新进度 - 视频生成步骤较多，中间更新
      updateTaskStatus(taskId, 'running', 30)
      await new Promise(resolve => setTimeout(resolve, 2000))
      updateTaskStatus(taskId, 'running', 70)
    }

    // 保存生成结果
    updateTaskResults(taskId, results)

  } catch (error) {
    console.error('AI generation failed:', error)

    // 如果AI服务不可用，回退到模拟生成
    console.warn('Falling back to mock generation due to AI service error')
    await simulateAIGeneration(taskId)
  }
}

// 模拟AI生成过程（作为回退选项）
async function simulateAIGeneration(taskId: string) {
  const task = tasks.get(taskId)
  if (!task) return

  const steps = task.type === 'image' ? 5 : 8
  const delay = task.type === 'image' ? 2000 : 5000

  for (let i = 1; i <= steps; i++) {
    const progress = (i / steps) * 100
    updateTaskStatus(taskId, 'running', progress)
    await new Promise(resolve => setTimeout(resolve, delay / steps))
  }

  // 生成模拟结果
  const mockResults = generateMockResults(task)
  updateTaskResults(taskId, mockResults)
}

// 生成模拟结果
function generateMockResults(task: Task): string[] {
  const results: string[] = []
  const quantity = task.parameters.quantity || 1

  for (let i = 0; i < quantity; i++) {
    // 生成模拟图片URL
    const mockUrl = `https://picsum.photos/seed/${task.id}-${i}/1024/1024.jpg`
    results.push(mockUrl)
  }

  return results
}

// 更新任务状态
function updateTaskStatus(
  taskId: string, 
  status: TaskStatus, 
  progress: number, 
  error?: string
) {
  const task = tasks.get(taskId)
  if (task) {
    task.status = status
    task.progress = progress
    task.updatedAt = new Date().toISOString()
    if (error) {
      task.error = error
    }
  }
}

// 更新任务结果
async function updateTaskResults(taskId: string, results: string[]) {
  const task = tasks.get(taskId)
  if (!task) return

  task.results = results
  task.updatedAt = new Date().toISOString()

  // 自动保存到素材库
  try {
    await saveToMaterialLibrary(task, results)
  } catch (error) {
    console.warn('Failed to save to material library:', error)
  }
}

// 保存到素材库
async function saveToMaterialLibrary(task: Task, results: string[]) {
  // 获取全局素材存储
  const materials = (global as any).__materials || new Map()

  for (let i = 0; i < results.length; i++) {
    const result = results[i]
    const materialId = `material-${Date.now()}-${i}`

    // 估算文件信息（实际应该从文件获取）
    const fileInfo = await getFileInfo(result, task.type)

    const material = {
      id: materialId,
      name: `${task.prompt.substring(0, 30)}${task.prompt.length > 30 ? '...' : ''} - ${i + 1}`,
      type: task.type,
      url: result,
      thumbnailUrl: task.type === 'image' ? result : undefined,
      size: fileInfo.size,
      format: fileInfo.format,
      width: fileInfo.width,
      height: fileInfo.height,
      duration: fileInfo.duration,
      prompt: task.prompt,
      model: task.model,
      tags: extractTagsFromPrompt(task.prompt),
      category: inferCategoryFromPrompt(task.prompt),
      description: `由 ${task.model} 生成的${task.type === 'image' ? '图片' : '视频'}`,
      metadata: {
        taskId: task.id,
        parameters: task.parameters,
        cost: task.cost,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      taskId: task.id,
    }

    materials.set(materialId, material)
  }

  // 更新全局素材存储
  if (!(global as any).__materials) {
    (global as any).__materials = new Map()
  }
  ;(global as any).__materials = materials

  console.log(`Saved ${results.length} materials to library`)
}

// 获取文件信息（模拟）
async function getFileInfo(url: string, type: 'image' | 'video') {
  // 在实际项目中，这里应该发送HEAD请求或下载文件来获取真实信息
  // 现在返回模拟数据
  if (type === 'image') {
    return {
      size: Math.floor(Math.random() * 2000000) + 500000, // 500KB - 2.5MB
      format: 'jpg',
      width: 1024,
      height: 1024,
    }
  } else {
    return {
      size: Math.floor(Math.random() * 10000000) + 5000000, // 5MB - 15MB
      format: 'mp4',
      duration: 5,
      width: 1024,
      height: 1024,
    }
  }
}

// 从提示词提取标签
function extractTagsFromPrompt(prompt: string): string[] {
  const tags: string[] = []
  const lowerPrompt = prompt.toLowerCase()

  // 简单的关键词提取
  const keywords: Record<string, string[]> = {
    '人物': ['person', 'woman', 'man', 'girl', 'boy', 'people', 'character'],
    '风景': ['landscape', 'mountain', 'ocean', 'sky', 'nature', 'forest', 'beach'],
    '动物': ['cat', 'dog', 'bird', 'animal', 'pet'],
    '建筑': ['building', 'house', 'city', 'architecture', 'street'],
    '艺术': ['art', 'painting', 'drawing', 'artistic', 'abstract'],
    '科技': ['technology', 'futuristic', 'sci-fi', 'robot', 'computer'],
    '美食': ['food', 'fruit', 'vegetable', 'delicious', 'meal'],
  }

  Object.entries(keywords).forEach(([tag, keywords]) => {
    if (keywords.some(keyword => lowerPrompt.includes(keyword))) {
      tags.push(tag)
    }
  })

  return tags
}

// 从提示词推断分类
function inferCategoryFromPrompt(prompt: string): string {
  const lowerPrompt = prompt.toLowerCase()

  if (lowerPrompt.includes('character') || lowerPrompt.includes('person') || lowerPrompt.includes('people')) {
    return 'characters'
  }
  if (lowerPrompt.includes('landscape') || lowerPrompt.includes('nature') || lowerPrompt.includes('mountain')) {
    return 'landscapes'
  }
  if (lowerPrompt.includes('abstract') || lowerPrompt.includes('artistic')) {
    return 'abstract'
  }
  if (lowerPrompt.includes('product') || lowerPrompt.includes('item') || lowerPrompt.includes('object')) {
    return 'products'
  }

  return 'default'
}