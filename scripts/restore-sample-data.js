// 数据恢复脚本 - 重新创建示例数据

const { v4: uuidv4 } = require('uuid')

// 示例数据
const sampleData = {
  tasks: [
    {
      id: uuidv4(),
      type: 'image',
      prompt: 'A professional portrait of a doctor in a white coat, studio lighting, high quality, detailed',
      status: 'completed',
      progress: 100,
      results: ['https://picsum.photos/1024/1024?random=1'],
      error: null,
      cost: 0.04,
      model: 'dall-e-3',
      parameters: {
        quality: 'standard',
        size: '1024x1024'
      },
      batchId: null,
      parentTaskId: null,
      variableValues: {},
      isBatchRoot: false,
      batchIndex: 0,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2天前
      updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 5 * 60 * 1000).toISOString() // 5分钟后
    }
  ],

  materials: [
    {
      id: uuidv4(),
      name: 'Doctor Portrait',
      type: 'image',
      url: 'https://picsum.photos/1024/1024?random=1',
      thumbnailUrl: 'https://picsum.photos/256/256?random=1',
      size: 1024 * 1024,
      format: 'png',
      width: 1024,
      height: 1024,
      duration: null,
      prompt: 'A professional portrait of a doctor in a white coat, studio lighting, high quality, detailed',
      model: 'dall-e-3',
      tags: ['portrait', 'doctor', 'professional'],
      category: 'portrait',
      description: 'Professional doctor portrait generated with AI',
      metadata: {
        generationTime: 15,
        steps: 20,
        seed: 12345
      },
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 5 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 5 * 60 * 1000).toISOString(),
      taskId: null // 将在插入任务后设置
    },
    {
      id: uuidv4(),
      name: 'Product Photography',
      type: 'image',
      url: 'https://picsum.photos/1024/1024?random=2',
      thumbnailUrl: 'https://picsum.photos/256/256?random=2',
      size: 1024 * 1024,
      format: 'jpg',
      width: 1024,
      height: 1024,
      duration: null,
      prompt: 'Professional product photography of a modern smartphone, minimalist style, studio lighting, clean background',
      model: 'midjourney-v6',
      tags: ['product', 'smartphone', 'minimalist'],
      category: 'product',
      description: 'Modern smartphone product photography',
      metadata: {
        generationTime: 25,
        steps: 30,
        seed: 67890
      },
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1天前
      updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      taskId: null
    }
  ],

  templates: [
    {
      id: uuidv4(),
      name: 'Professional Headshot',
      description: 'Generate professional headshots for various professions',
      template: 'Professional headshot of a {profession}, wearing {attire}, {background} background, studio lighting, high quality, detailed',
      variables: [
        {
          name: 'profession',
          type: 'select',
          options: ['doctor', 'engineer', 'artist', 'teacher', 'chef', 'lawyer'],
          description: 'The profession of the person',
          defaultValue: 'doctor',
          required: true
        },
        {
          name: 'attire',
          type: 'select',
          options: ['business suit', 'casual wear', 'uniform', 'traditional dress'],
          description: 'Style of clothing',
          defaultValue: 'business suit',
          required: true
        },
        {
          name: 'background',
          type: 'select',
          options: ['plain white', 'office', 'studio', 'outdoor blurred'],
          description: 'Background environment',
          defaultValue: 'studio',
          required: true
        }
      ],
      mediaType: 'image',
      model: 'dall-e-3',
      usageCount: 5,
      totalCost: 0.20,
      cacheHitRate: 0.0,
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 1周前
      updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() // 2天前
    },
    {
      id: uuidv4(),
      name: 'Product Photography',
      description: 'Professional product photography templates',
      template: 'Professional product photography of {product}, {style} style, {lighting}, clean background, commercial quality, detailed',
      variables: [
        {
          name: 'product',
          type: 'text',
          description: 'Product name or description',
          defaultValue: 'product',
          required: true
        },
        {
          name: 'style',
          type: 'select',
          options: ['minimalist', 'luxury', 'modern', 'vintage'],
          description: 'Photography style',
          defaultValue: 'modern',
          required: true
        },
        {
          name: 'lighting',
          type: 'select',
          options: ['natural light', 'studio lighting', 'dramatic lighting'],
          description: 'Lighting effect',
          defaultValue: 'studio lighting',
          required: true
        }
      ],
      mediaType: 'image',
      model: 'midjourney-v6',
      usageCount: 3,
      totalCost: 0.09,
      cacheHitRate: 0.0,
      createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: uuidv4(),
      name: 'Artistic Portrait',
      description: 'Create artistic portraits in various styles',
      template: 'Artistic portrait of a {subject}, {art_style} style, {mood} mood, {color_palette} colors, high detail, masterpiece',
      variables: [
        {
          name: 'subject',
          type: 'text',
          description: 'Subject of the portrait',
          defaultValue: 'woman',
          required: true
        },
        {
          name: 'art_style',
          type: 'select',
          options: ['impressionist', 'surrealist', 'cubist', 'realist', 'expressionist'],
          description: 'Art style',
          defaultValue: 'realist',
          required: true
        },
        {
          name: 'mood',
          type: 'select',
          options: ['serene', 'dramatic', 'joyful', 'melancholic', 'mysterious'],
          description: 'Mood of the portrait',
          defaultValue: 'serene',
          required: true
        },
        {
          name: 'color_palette',
          type: 'select',
          options: ['warm colors', 'cool colors', 'monochrome', 'vibrant', 'pastel'],
          description: 'Color palette',
          defaultValue: 'warm colors',
          required: true
        }
      ],
      mediaType: 'image',
      model: 'stable-diffusion-xl',
      usageCount: 2,
      totalCost: 0.02,
      cacheHitRate: 0.0,
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: uuidv4(),
      name: 'Nature Landscape',
      description: 'Generate beautiful nature landscapes',
      template: 'Beautiful {landscape_type} landscape, {time_of_day}, {weather_condition}, {composition} composition, {color_tone} tones, professional photography',
      variables: [
        {
          name: 'landscape_type',
          type: 'select',
          options: ['mountain', 'ocean', 'forest', 'desert', 'meadow', 'river'],
          description: 'Type of landscape',
          defaultValue: 'mountain',
          required: true
        },
        {
          name: 'time_of_day',
          type: 'select',
          options: ['sunrise', 'sunset', 'noon', 'golden hour', 'blue hour'],
          description: 'Time of day',
          defaultValue: 'golden hour',
          required: true
        },
        {
          name: 'weather_condition',
          type: 'select',
          options: ['clear sky', 'partly cloudy', 'overcast', 'misty', 'dramatic clouds'],
          description: 'Weather condition',
          defaultValue: 'clear sky',
          required: true
        },
        {
          name: 'composition',
          type: 'select',
          options: ['wide angle', 'close-up', 'panoramic', 'telephoto', 'aerial'],
          description: 'Photography composition',
          defaultValue: 'wide angle',
          required: true
        },
        {
          name: 'color_tone',
          type: 'select',
          options: ['warm', 'cool', 'vibrant', 'muted', 'monochrome'],
          description: 'Color tone',
          defaultValue: 'vibrant',
          required: true
        }
      ],
      mediaType: 'image',
      model: 'flux-pro',
      usageCount: 4,
      totalCost: 0.12,
      cacheHitRate: 0.0,
      createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    }
  ]
}

// 执行数据恢复
async function restoreSampleData() {
  try {
    console.log('🔄 开始恢复示例数据...')

    // 1. 插入任务
    console.log('📝 插入示例任务...')
    const taskResponse = await fetch('http://localhost:3000/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sampleData.tasks[0])
    })

    if (!taskResponse.ok) {
      throw new Error(`Task creation failed: ${taskResponse.statusText}`)
    }

    const taskResult = await taskResponse.json()
    const taskId = taskResult.data.id
    console.log('✅ 任务创建成功:', taskId)

    // 2. 插入素材（关联到任务）
    console.log('🖼️ 插入示例素材...')
    for (let i = 0; i < sampleData.materials.length; i++) {
      const material = { ...sampleData.materials[i] }
      material.taskId = i === 0 ? taskId : null // 第一个素材关联到任务

      const materialResponse = await fetch('http://localhost:3000/api/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(material)
      })

      if (!materialResponse.ok) {
        throw new Error(`Material creation failed: ${materialResponse.statusText}`)
      }

      console.log(`✅ 素材 ${i + 1} 创建成功`)
    }

    // 3. 插入模板
    console.log('📋 插入示例模板...')
    for (let i = 0; i < sampleData.templates.length; i++) {
      const template = sampleData.templates[i]

      const templateResponse = await fetch('http://localhost:3000/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(template)
      })

      if (!templateResponse.ok) {
        throw new Error(`Template creation failed: ${templateResponse.statusText}`)
      }

      console.log(`✅ 模板 ${i + 1} 创建成功`)
    }

    console.log('🎉 数据恢复完成!')
    console.log(`- 1 个任务`)
    console.log(`- ${sampleData.materials.length} 个素材`)
    console.log(`- ${sampleData.templates.length} 个模板`)

  } catch (error) {
    console.error('❌ 数据恢复失败:', error.message)
    process.exit(1)
  }
}

// 等待服务器启动后再执行数据恢复
setTimeout(restoreSampleData, 3000)