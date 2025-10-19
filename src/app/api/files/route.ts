import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/mov']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Only images and videos are allowed' },
        { status: 400 }
      )
    }

    // 验证文件大小 (最大 100MB)
    const maxSize = 100 * 1024 * 1024 // 100MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'File too large. Maximum size is 100MB' },
        { status: 400 }
      )
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // 创建上传目录
    const uploadDir = join(process.cwd(), 'uploads')
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // 生成唯一文件名
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const fileExtension = file.name.split('.').pop()
    const fileName = `${timestamp}_${randomString}.${fileExtension}`
    const filePath = join(uploadDir, fileName)

    // 保存文件
    await writeFile(filePath, buffer)

    // 返回文件信息
    const fileUrl = `/uploads/${fileName}`

    return NextResponse.json({
      success: true,
      data: {
        name: file.name,
        fileName,
        size: file.size,
        type: file.type,
        url: fileUrl,
        createdAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Error uploading file:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'image' or 'video'

    // 这里应该从数据库获取文件列表
    // 现在返回模拟数据
    const mockFiles = [
      {
        id: '1',
        name: 'sample-image.jpg',
        originalName: 'my-image.jpg',
        size: 1024000,
        type: 'image',
        url: '/uploads/sample-image.jpg',
        createdAt: new Date().toISOString()
      },
      {
        id: '2',
        name: 'sample-video.mp4',
        originalName: 'my-video.mp4',
        size: 5120000,
        type: 'video',
        url: '/uploads/sample-video.mp4',
        createdAt: new Date().toISOString()
      }
    ]

    const filteredFiles = type
      ? mockFiles.filter(file => file.type === type)
      : mockFiles

    return NextResponse.json({
      success: true,
      data: {
        items: filteredFiles,
        total: filteredFiles.length
      }
    })

  } catch (error) {
    console.error('Error fetching files:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}