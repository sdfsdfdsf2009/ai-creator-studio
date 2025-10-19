import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

// 文件类型定义
export interface UploadedFile {
  id: string
  name: string
  originalName: string
  size: number
  type: 'image' | 'video'
  url: string
  createdAt: string
}

// API 响应类型
interface FilesResponse {
  success: boolean
  data: {
    items: UploadedFile[]
    total: number
  }
}

interface UploadResponse {
  success: boolean
  data: {
    name: string
    fileName: string
    size: number
    type: string
    url: string
    createdAt: string
  }
}

// 文件上传
export function useFileUpload() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/files', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Upload failed')
      }

      return response.json() as Promise<UploadResponse>
    },
    onSuccess: () => {
      // 刷新文件列表
      queryClient.invalidateQueries({ queryKey: ['files'] })
    },
  })
}

// 获取文件列表
export function useFiles(options?: {
  type?: 'image' | 'video'
  page?: number
  pageSize?: number
}) {
  const queryParams = new URLSearchParams()
  if (options?.type) queryParams.append('type', options.type)
  if (options?.page) queryParams.append('page', options.page.toString())
  if (options?.pageSize) queryParams.append('pageSize', options.pageSize.toString())

  return useQuery({
    queryKey: ['files', options],
    queryFn: async () => {
      const response = await fetch(`/api/files?${queryParams}`)
      if (!response.ok) {
        throw new Error('Failed to fetch files')
      }
      return response.json() as Promise<FilesResponse>
    },
    refetchOnWindowFocus: false,
  })
}

// 删除文件
export function useDeleteFile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (fileId: string) => {
      const response = await fetch(`/api/files/${fileId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete file')
      }

      return response.json()
    },
    onSuccess: () => {
      // 刷新文件列表
      queryClient.invalidateQueries({ queryKey: ['files'] })
    },
  })
}

// 批量删除文件
export function useBatchDeleteFiles() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (fileIds: string[]) => {
      const response = await fetch('/api/files/batch', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileIds }),
      })

      if (!response.ok) {
        throw new Error('Failed to delete files')
      }

      return response.json()
    },
    onSuccess: () => {
      // 刷新文件列表
      queryClient.invalidateQueries({ queryKey: ['files'] })
    },
  })
}

// 文件工具函数
export const fileUtils = {
  // 格式化文件大小
  formatFileSize: (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  },

  // 获取文件图标
  getFileIcon: (type: string): string => {
    return type === 'image' ? '🎨' : '🎬'
  },

  // 获取文件类型文本
  getFileTypeText: (type: string): string => {
    return type === 'image' ? '图片' : '视频'
  },

  // 验证文件类型
  isValidFileType: (file: File): boolean => {
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm', 'video/mov'
    ]
    return allowedTypes.includes(file.type)
  },

  // 验证文件大小 (最大 100MB)
  isValidFileSize: (file: File): boolean => {
    const maxSize = 100 * 1024 * 1024 // 100MB
    return file.size <= maxSize
  },
}