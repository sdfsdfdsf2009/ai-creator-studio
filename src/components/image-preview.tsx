'use client'

import React, { useState } from 'react'
import { X, Download, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ImagePreviewProps {
  isOpen: boolean
  onClose: () => void
  imageUrl: string
  alt?: string
}

export function ImagePreview({ isOpen, onClose, imageUrl, alt }: ImagePreviewProps) {
  const [isImageLoading, setIsImageLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  if (!isOpen) return null

  const handleDownload = () => {
    // 创建下载链接
    const link = document.createElement('a')
    link.href = imageUrl
    link.download = alt || 'generated-image.png'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(imageUrl)
      .then(() => {
        // 可以添加toast提示
        console.log('图片链接已复制到剪贴板')
      })
      .catch(err => {
        console.error('复制失败:', err)
      })
  }

  const handleImageLoad = () => {
    setIsImageLoading(false)
  }

  const handleImageError = () => {
    setIsImageLoading(false)
    setHasError(true)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] w-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-medium truncate">{alt || 'AI生成的图片'}</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Image Container */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center min-h-[200px]">
          {isImageLoading && (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2 text-sm text-muted-foreground">加载中...</span>
            </div>
          )}

          {hasError ? (
            <div className="text-center text-muted-foreground">
              <div className="text-red-500 mb-2">❌</div>
              <p>图片加载失败</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => window.open(imageUrl, '_blank')}
              >
                在新窗口打开
              </Button>
            </div>
          ) : (
            <img
              src={imageUrl}
              alt={alt || 'AI生成的图片'}
              className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-lg"
              onLoad={handleImageLoad}
              onError={handleImageError}
              style={{ display: isImageLoading ? 'none' : 'block' }}
            />
          )}
        </div>

        {/* Footer with Actions */}
        <div className="flex items-center justify-between p-4 border-t bg-gray-50">
          <div className="text-sm text-muted-foreground">
            {!hasError && !isImageLoading && (
              <span>点击图片可查看大图</span>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyUrl}
              className="flex items-center gap-2"
            >
              <Copy className="h-4 w-4" />
              复制链接
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={handleDownload}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              下载图片
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}