import { spawn } from 'child_process'
import { join } from 'path'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'

/**
 * 视频缩略图生成服务
 * 支持从视频URL提取帧并生成缩略图
 */

export interface ThumbnailOptions {
  width?: number
  height?: number
  timePosition?: string // 格式: '00:00:01' 或百分比 '10%'
  quality?: number // 1-31, 越低质量越高
  format?: 'jpg' | 'png'
}

export interface ThumbnailResult {
  success: boolean
  thumbnailPath?: string
  thumbnailUrl?: string
  error?: string
}

// 检查FFmpeg是否可用
export function checkFFmpegAvailability(): boolean {
  try {
    const result = spawn('ffmpeg', ['-version'], { stdio: 'pipe' })
    return result.pid !== undefined
  } catch {
    return false
  }
}

/**
 * 从视频URL生成缩略图
 * @param videoUrl 视频URL
 * @param outputPath 输出文件路径
 * @param options 缩略图选项
 * @returns 生成结果
 */
export async function generateVideoThumbnail(
  videoUrl: string,
  outputPath: string,
  options: ThumbnailOptions = {}
): Promise<ThumbnailResult> {
  const {
    width = 320,
    height = 180,
    timePosition = '00:00:01', // 默认提取第1秒的帧
    quality = 8,
    format = 'jpg'
  } = options

  console.log(`🎬 [THUMBNAIL] 开始生成视频缩略图:`)
  console.log(`  - 视频URL: ${videoUrl}`)
  console.log(`  - 输出路径: ${outputPath}`)
  console.log(`  - 尺寸: ${width}x${height}`)
  console.log(`  - 时间位置: ${timePosition}`)

  try {
    // 检查FFmpeg是否可用
    if (!checkFFmpegAvailability()) {
      throw new Error('FFmpeg不可用，请安装FFmpeg: brew install ffmpeg')
    }

    // 确保输出目录存在
    const outputDir = join(outputPath, '..')
    if (!existsSync(outputDir)) {
      await mkdir(outputDir, { recursive: true })
    }

    // 构建FFmpeg命令
    const args = [
      '-i', videoUrl,
      '-ss', timePosition,
      '-vframes', '1',
      '-vf', `scale=${width}:${height}`,
      '-q:v', quality.toString(),
      '-y', // 覆盖输出文件
      outputPath
    ]

    console.log(`🔧 [THUMBNAIL] FFmpeg命令: ffmpeg ${args.join(' ')}`)

    return new Promise((resolve) => {
      const process = spawn('ffmpeg', args)

      let stdout = ''
      let stderr = ''

      process.stdout?.on('data', (data) => {
        stdout += data.toString()
      })

      process.stderr?.on('data', (data) => {
        stderr += data.toString()
      })

      process.on('close', (code) => {
        if (code === 0) {
          console.log(`✅ [THUMBNAIL] 缩略图生成成功: ${outputPath}`)

          // 构建缩略图URL（相对于public目录）
          const publicPath = outputPath.replace(/^.*public\//, '/')
          const thumbnailUrl = `http://localhost:3014${publicPath}`

          resolve({
            success: true,
            thumbnailPath: outputPath,
            thumbnailUrl
          })
        } else {
          console.error(`❌ [THUMBNAIL] FFmpeg执行失败，退出码: ${code}`)
          console.error(`❌ [THUMBNAIL] 错误信息: ${stderr}`)

          resolve({
            success: false,
            error: `FFmpeg执行失败: ${stderr}`
          })
        }
      })

      process.on('error', (error) => {
        console.error(`❌ [THUMBNAIL] 进程错误:`, error)
        resolve({
          success: false,
          error: `进程错误: ${error.message}`
        })
      })
    })

  } catch (error) {
    console.error(`❌ [THUMBNAIL] 生成失败:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }
  }
}

/**
 * 智能选择最佳时间位置
 * @param videoUrl 视频URL
 * @returns 最佳时间位置
 */
async function getOptimalTimePosition(videoUrl: string): Promise<string> {
  // 这里可以添加获取视频时长并计算最佳位置的逻辑
  // 目前返回固定值
  return '00:00:01' // 视频开始1秒后的位置
}

/**
 * 生成多种尺寸的缩略图
 * @param videoUrl 视频URL
 * @param baseOutputPath 基础输出路径（不含扩展名）
 * @returns 生成结果
 */
export async function generateMultipleThumbnails(
  videoUrl: string,
  baseOutputPath: string
): Promise<ThumbnailResult[]> {
  console.log(`🎬 [THUMBNAILS] 开始生成多种尺寸缩略图`)

  const sizes = [
    { width: 160, height: 90, suffix: '_thumb' },   // 小缩略图
    { width: 320, height: 180, suffix: '_medium' }, // 中等缩略图
    { width: 640, height: 360, suffix: '_large' }   // 大缩略图
  ]

  const results: ThumbnailResult[] = []

  for (const size of sizes) {
    const outputPath = `${baseOutputPath}${size.suffix}.jpg`

    const result = await generateVideoThumbnail(videoUrl, outputPath, {
      width: size.width,
      height: size.height
    })

    results.push(result)
  }

  console.log(`✅ [THUMBNAILS] 生成了 ${results.filter(r => r.success).length}/${results.length} 个缩略图`)
  return results
}

/**
 * 为视频生成默认缩略图（带降级方案）
 * @param videoUrl 视频URL
 * @param taskId 任务ID（用于文件命名）
 * @param originalImageUrl 原始图片URL（用于图片转视频场景）
 * @returns 缩略图结果
 */
export async function generateVideoThumbnailWithFallback(
  videoUrl: string,
  taskId: string,
  originalImageUrl?: string
): Promise<ThumbnailResult> {
  console.log(`🎬 [THUMBNAIL-FALLBACK] 开始生成视频缩略图（带降级方案）`)

  // 降级方案1：如果有原始图片，直接使用
  if (originalImageUrl) {
    console.log(`🔄 [FALLBACK] 使用原始图片作为缩略图: ${originalImageUrl}`)
    return {
      success: true,
      thumbnailUrl: originalImageUrl
    }
  }

  // 主要方案：尝试从视频提取缩略图
  const thumbnailDir = join(process.cwd(), 'public', 'thumbnails', 'videos')
  const outputPath = join(thumbnailDir, `${taskId}.jpg`)

  const result = await generateVideoThumbnail(videoUrl, outputPath)

  if (result.success) {
    return result
  }

  // 降级方案2：生成默认占位图
  console.log(`🔄 [FALLBACK] 使用默认占位图`)
  return {
    success: true,
    thumbnailUrl: 'https://via.placeholder.com/320x180/000000/FFFFFF?text=视频'
  }
}

/**
 * 检查缩略图是否已存在
 * @param thumbnailPath 缩略图路径
 * @returns 是否存在
 */
export function thumbnailExists(thumbnailPath: string): boolean {
  return existsSync(thumbnailPath)
}