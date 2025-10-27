'use client'

import React, { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Upload, X, Image as ImageIcon, AlertCircle } from 'lucide-react'

interface ImageUploaderProps {
  value: string[] // 图片URL数组
  onChange: (urls: string[]) => void
  maxImages?: number // 最大图片数量，默认2张
  accept?: string // 接受的文件类型
  maxSize?: number // 最大文件大小（字节），默认10MB
}

interface UploadedImage {
  id: string
  url: string
  file: File
  preview: string
}

export function ImageUploader({
  value = [],
  onChange,
  maxImages = 2,
  accept = 'image/*',
  maxSize = 10 * 1024 * 1024 // 10MB
}: ImageUploaderProps) {
  const [uploadingImages, setUploadingImages] = useState<UploadedImage[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 验证文件
  const validateFile = (file: File): string | null => {
    // 检查文件类型
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) {
      return '只支持 JPG、PNG、WEBP 格式的图片'
    }

    // 检查文件大小
    if (file.size > maxSize) {
      return `图片大小不能超过 ${(maxSize / 1024 / 1024).toFixed(1)}MB`
    }

    return null
  }

  // 创建预览URL
  const createPreview = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.readAsDataURL(file)
    })
  }

  // 上传文件到服务器
  const uploadToServer = async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      throw new Error('上传失败')
    }

    const result = await response.json()
    if (!result.url) {
      throw new Error('上传失败：未返回图片URL')
    }

    return result.url
  }

  // 处理文件选择
  const handleFiles = async (files: FileList) => {
    const fileArray = Array.from(files)
    const newErrors: string[] = []
    const newImages: UploadedImage[] = []

    // 检查总数限制
    if (value.length + uploadingImages.length + fileArray.length > maxImages) {
      newErrors.push(`最多只能上传${maxImages}张图片`)
      setErrors(newErrors)
      return
    }

    for (const file of fileArray) {
      const error = validateFile(file)
      if (error) {
        newErrors.push(`${file.name}: ${error}`)
        continue
      }

      try {
        const preview = await createPreview(file)
        const tempImage: UploadedImage = {
          id: Math.random().toString(36).substr(2, 9),
          url: '', // 暂时为空，上传后会更新
          file,
          preview
        }
        newImages.push(tempImage)
      } catch (error) {
        newErrors.push(`${file.name}: 创建预览失败`)
      }
    }

    if (newErrors.length > 0) {
      setErrors(newErrors)
    }

    // 添加到上传队列
    setUploadingImages(prev => [...prev, ...newImages])

    // 逐个上传文件
    for (const image of newImages) {
      try {
        const uploadedUrl = await uploadToServer(image.file)

        // 更新上传的图片URL
        setUploadingImages(prev =>
          prev.map(img =>
            img.id === image.id ? { ...img, url: uploadedUrl } : img
          )
        )

        // 添加到最终结果
        onChange([...value, uploadedUrl])
      } catch (error) {
        console.error('上传失败:', error)
        setErrors(prev => [...prev, `${image.file.name}: 上传失败`])

        // 从上传队列中移除失败的图片
        setUploadingImages(prev => prev.filter(img => img.id !== image.id))
      }
    }

    // 清理成功的上传
    setTimeout(() => {
      setUploadingImages(prev => prev.filter(img => img.url !== ''))
    }, 1000)
  }

  // 处理拖拽
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFiles(files)
    }
  }, [value, uploadingImages])

  // 处理文件选择
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFiles(files)
    }
    // 清空input值，允许重复选择同一文件
    e.target.value = ''
  }

  // 移除图片
  const removeImage = (index: number) => {
    const newUrls = value.filter((_, i) => i !== index)
    onChange(newUrls)
  }

  // 移除上传中的图片
  const removeUploadingImage = (id: string) => {
    setUploadingImages(prev => prev.filter(img => img.id !== id))
  }

  const allImages = [...uploadingImages, ...value.map((url, index) => ({
    id: `existing-${index}`,
    url,
    preview: url,
    file: null as any
  }))]

  return (
    <div className="space-y-4">
      {/* 上传区域 */}
      {allImages.length < maxImages && (
        <Card
          className={`border-2 border-dashed transition-colors ${
            dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <CardContent className="p-6">
            <div className="text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept={accept}
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />

              <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />

              <div className="space-y-2">
                <p className="text-lg font-medium">
                  点击或拖拽上传图片
                </p>
                <p className="text-sm text-muted-foreground">
                  支持 JPG、PNG、WEBP 格式，单个文件最大 {(maxSize / 1024 / 1024).toFixed(1)}MB
                </p>
                <p className="text-xs text-muted-foreground">
                  最多可上传{maxImages}张图片（用于首帧或首尾帧视频生成）
                </p>
              </div>

              <Button
                variant="outline"
                className="mt-4"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImages.length > 0}
              >
                <ImageIcon className="w-4 h-4 mr-2" />
                选择图片
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 错误信息 */}
      {errors.length > 0 && (
        <div className="space-y-2">
          {errors.map((error, index) => (
            <div key={index} className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          ))}
        </div>
      )}

      {/* 图片预览 */}
      {allImages.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {allImages.map((image, index) => (
            <Card key={image.id} className="relative">
              <CardContent className="p-2">
                <div className="relative aspect-video">
                  <img
                    src={image.preview}
                    alt={`预览图片 ${index + 1}`}
                    className="w-full h-full object-cover rounded-md"
                  />

                  {/* 上传状态覆盖层 */}
                  {!image.url && (
                    <div className="absolute inset-0 bg-black/50 rounded-md flex items-center justify-center">
                      <div className="text-white text-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mx-auto mb-2"></div>
                        <p className="text-sm">上传中...</p>
                      </div>
                    </div>
                  )}

                  {/* 删除按钮 */}
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2 h-8 w-8 p-0"
                    onClick={() => {
                      if (image.url) {
                        // 已上传的图片
                        const originalIndex = value.indexOf(image.url)
                        if (originalIndex !== -1) {
                          removeImage(originalIndex)
                        }
                      } else {
                        // 上传中的图片
                        removeUploadingImage(image.id)
                      }
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* 图片说明 */}
                <div className="mt-2 text-center">
                  <p className="text-sm font-medium">
                    {index === 0 ? "首帧" : index === 1 ? "尾帧" : `图片 ${index + 1}`}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {image.file ? image.file.name : "已上传"}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 使用说明 */}
      {allImages.length === 1 && (
        <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
          💡 提示：您可以再上传一张图片作为视频的尾帧，实现首尾帧视频生成
        </div>
      )}
    </div>
  )
}