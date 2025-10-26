// 视频生成状态管理Hook
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

export interface VideoGenerationStatus {
  materialId: string
  status: 'idle' | 'processing' | 'completed' | 'failed' | 'cancelled'
  progress: number
  error?: string
  videoResults?: string[]
  videoGenerationTaskId?: string
  videoGenerationStartTime?: string
  videoGenerationEndTime?: string
}

export interface UseVideoGenerationOptions {
  onStatusChange?: (materialId: string, status: VideoGenerationStatus) => void
  onCompleted?: (materialId: string, results: string[]) => void
  onFailed?: (materialId: string, error: string) => void
  pollInterval?: number
}

export function useVideoGeneration(options: UseVideoGenerationOptions = {}) {
  const {
    onStatusChange,
    onCompleted,
    onFailed,
    pollInterval = 3000 // 3秒轮询间隔
  } = options

  const [generatingMaterials, setGeneratingMaterials] = useState<Set<string>>(new Set())
  const [materialStatuses, setMaterialStatuses] = useState<Map<string, VideoGenerationStatus>>(new Map())
  const [isGenerating, setIsGenerating] = useState(false)
  const pollIntervalsRef = useRef<Map<string, NodeJS.Timeout>>(new Map())

  // 清理指定素材的轮询
  const clearPolling = useCallback((materialId: string) => {
    const interval = pollIntervalsRef.current.get(materialId)
    if (interval) {
      clearInterval(interval)
      pollIntervalsRef.current.delete(materialId)
    }
  }, [])

  // 清理所有轮询
  const clearAllPolling = useCallback(() => {
    pollIntervalsRef.current.forEach(interval => clearInterval(interval))
    pollIntervalsRef.current.clear()
  }, [])

  // 获取素材状态
  const fetchMaterialStatus = useCallback(async (materialId: string): Promise<VideoGenerationStatus | null> => {
    try {
      const response = await fetch(`/api/materials/video-generate?materialIds=${materialId}`)
      if (!response.ok) {
        console.warn(`获取素材 ${materialId} 状态失败:`, response.status)
        return null
      }

      const data = await response.json()
      if (!data.success || !data.results || data.results.length === 0) {
        return null
      }

      const result = data.results[0]
      if (!result.found) {
        return null
      }

      return {
        materialId: result.materialId,
        status: result.videoGenerationStatus || 'idle',
        progress: result.videoGenerationProgress || 0,
        error: result.videoGenerationError,
        videoResults: result.videoResults || [],
        videoGenerationTaskId: result.taskInfo?.id,
        videoGenerationStartTime: result.videoGenerationStartTime,
        videoGenerationEndTime: result.videoGenerationEndTime
      }

    } catch (error) {
      console.error(`获取素材 ${materialId} 状态时出错:`, error)
      return null
    }
  }, [])

  // 开始轮询指定素材的状态
  const startPolling = useCallback((materialId: string) => {
    // 清理已有的轮询
    clearPolling(materialId)

    // 立即获取一次状态
    fetchMaterialStatus(materialId).then(status => {
      if (status) {
        setMaterialStatuses(prev => new Map(prev.set(materialId, status)))
        onStatusChange?.(materialId, status)

        // 如果状态为processing，开始定时轮询
        if (status.status === 'processing') {
          const interval = setInterval(async () => {
            const currentStatus = await fetchMaterialStatus(materialId)
            if (currentStatus) {
              setMaterialStatuses(prev => new Map(prev.set(materialId, currentStatus)))
              onStatusChange?.(materialId, currentStatus)

              // 如果不再是processing状态，停止轮询
              if (currentStatus.status !== 'processing') {
                clearPolling(materialId)
                setGeneratingMaterials(prev => {
                  const newSet = new Set(prev)
                  newSet.delete(materialId)
                  return newSet
                })

                // 触发完成/失败回调
                if (currentStatus.status === 'completed' && currentStatus.videoResults?.length) {
                  onCompleted?.(materialId, currentStatus.videoResults)
                } else if (currentStatus.status === 'failed' && currentStatus.error) {
                  onFailed?.(materialId, currentStatus.error)
                }
              }
            }
          }, pollInterval)

          pollIntervalsRef.current.set(materialId, interval)
        }
      }
    })
  }, [fetchMaterialStatus, clearPolling, onStatusChange, onCompleted, onFailed, pollInterval])

  // 开始视频生成
  const startVideoGeneration = useCallback(async (
    materialIds: string[],
    model: string = 'sora-2'
  ): Promise<{ success: boolean; results: any[]; error?: string }> => {
    try {
      setIsGenerating(true)

      // 将素材添加到生成中集合
      materialIds.forEach(id => {
        setGeneratingMaterials(prev => new Set(prev).add(id))
        // 初始化状态
        const initialStatus: VideoGenerationStatus = {
          materialId: id,
          status: 'processing',
          progress: 0
        }
        setMaterialStatuses(prev => new Map(prev.set(id, initialStatus)))
        onStatusChange?.(id, initialStatus)
      })

      const response = await fetch('/api/materials/video-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ materialIds, model })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP错误 ${response.status}`)
      }

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || '启动视频生成失败')
      }

      // 为成功启动的素材开始轮询
      data.results.forEach((result: any) => {
        if (result.success && result.videoTaskId) {
          startPolling(result.materialId)
        } else {
          // 启动失败的素材，从生成中集合移除
          setGeneratingMaterials(prev => {
            const newSet = new Set(prev)
            newSet.delete(result.materialId)
            return newSet
          })
          setMaterialStatuses(prev => {
            const newMap = new Map(prev)
            newMap.set(result.materialId, {
              materialId: result.materialId,
              status: 'failed',
              progress: 0,
              error: result.error
            })
            return newMap
          })
          onFailed?.(result.materialId, result.error)
        }
      })

      return {
        success: true,
        results: data.results
      }

    } catch (error) {
      console.error('启动视频生成失败:', error)

      // 清理所有相关状态
      materialIds.forEach(id => {
        setGeneratingMaterials(prev => {
          const newSet = new Set(prev)
          newSet.delete(id)
          return newSet
        })
        setMaterialStatuses(prev => {
          const newMap = new Map(prev)
          newMap.set(id, {
            materialId: id,
            status: 'failed',
            progress: 0,
            error: error instanceof Error ? error.message : '启动失败'
          })
          return newMap
        })
        clearPolling(id)
        onFailed?.(id, error instanceof Error ? error.message : '启动失败')
      })

      return {
        success: false,
        results: [],
        error: error instanceof Error ? error.message : '启动失败'
      }
    } finally {
      setIsGenerating(false)
    }
  }, [startPolling, clearPolling, onStatusChange, onFailed])

  // 取消视频生成
  const cancelVideoGeneration = useCallback(async (materialIds: string[]): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/materials/video-generate', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ materialIds })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP错误 ${response.status}`)
      }

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || '取消视频生成失败')
      }

      // 清理相关状态和轮询
      materialIds.forEach(id => {
        setGeneratingMaterials(prev => {
          const newSet = new Set(prev)
          newSet.delete(id)
          return newSet
        })
        setMaterialStatuses(prev => {
          const newMap = new Map(prev)
          newMap.set(id, {
            materialId: id,
            status: 'cancelled',
            progress: 0
          })
          return newMap
        })
        clearPolling(id)
      })

      return { success: true }

    } catch (error) {
      console.error('取消视频生成失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '取消失败'
      }
    }
  }, [clearPolling])

  // 获取素材当前状态
  const getMaterialStatus = useCallback((materialId: string): VideoGenerationStatus | undefined => {
    return materialStatuses.get(materialId)
  }, [materialStatuses])

  // 检查素材是否正在生成
  const isMaterialGenerating = useCallback((materialId: string): boolean => {
    return generatingMaterials.has(materialId)
  }, [generatingMaterials])

  // 初始化已有素材的状态
  const initializeMaterialStatuses = useCallback(async (materialIds: string[]) => {
    const statuses: VideoGenerationStatus[] = []

    for (const materialId of materialIds) {
      const status = await fetchMaterialStatus(materialId)
      if (status && status.status === 'processing') {
        statuses.push(status)
        setGeneratingMaterials(prev => new Set(prev).add(materialId))
        startPolling(materialId)
      }
      if (status) {
        setMaterialStatuses(prev => new Map(prev.set(materialId, status)))
      }
    }

    return statuses
  }, [fetchMaterialStatus, startPolling])

  // 组件卸载时清理轮询
  useEffect(() => {
    return () => {
      clearAllPolling()
    }
  }, [clearAllPolling])

  return {
    isGenerating,
    generatingMaterials: Array.from(generatingMaterials),
    materialStatuses: Object.fromEntries(materialStatuses),
    getMaterialStatus,
    isMaterialGenerating,
    startVideoGeneration,
    cancelVideoGeneration,
    initializeMaterialStatuses,
    clearAllPolling
  }
}