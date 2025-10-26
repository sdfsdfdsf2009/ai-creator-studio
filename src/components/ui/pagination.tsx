'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, SkipBack, SkipForward, Play, Pause } from 'lucide-react'

interface PaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  className?: string
  // 自动播放相关
  enableAutoPlay?: boolean
  onAutoPlayChange?: (playing: boolean) => void
  autoPlayInterval?: number
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  className = '',
  enableAutoPlay = false,
  onAutoPlayChange,
  autoPlayInterval = 5000
}: PaginationProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(autoPlayInterval)
  const [inputPage, setInputPage] = useState(currentPage.toString())

  // 计算显示的页码范围
  const getVisiblePages = useCallback(() => {
    const delta = 2 // 当前页前后显示的页数
    const range = []
    const rangeWithDots = []

    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i)
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...')
    } else {
      rangeWithDots.push(1)
    }

    rangeWithDots.push(...range)

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages)
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages)
    }

    return rangeWithDots.filter((page, index, arr) => page !== arr[index - 1])
  }, [currentPage, totalPages])

  // 自动播放逻辑
  useEffect(() => {
    let interval: NodeJS.Timeout

    if (isPlaying && currentPage < totalPages) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1000) {
            onPageChange(Math.min(currentPage + 1, totalPages))
            return autoPlayInterval
          }
          return prev - 1000
        })
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isPlaying, currentPage, totalPages, onPageChange, autoPlayInterval])

  // 重置计时器
  useEffect(() => {
    setTimeRemaining(autoPlayInterval)
  }, [currentPage, autoPlayInterval])

  // 当播放到最后一页时停止
  useEffect(() => {
    if (isPlaying && currentPage >= totalPages) {
      setIsPlaying(false)
      onAutoPlayChange?.(false)
    }
  }, [currentPage, totalPages, isPlaying, onAutoPlayChange])

  const handlePlayPause = () => {
    const newPlayingState = !isPlaying
    setIsPlaying(newPlayingState)
    onAutoPlayChange?.(newPlayingState)
    if (newPlayingState) {
      setTimeRemaining(autoPlayInterval)
    }
  }

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      onPageChange(page)
      setInputPage(page.toString())
      // 用户手动切换页面时暂停自动播放
      if (isPlaying) {
        setIsPlaying(false)
        onAutoPlayChange?.(false)
      }
    }
  }

  const handleInputPageSubmit = () => {
    const page = parseInt(inputPage)
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      handlePageChange(page)
    } else {
      setInputPage(currentPage.toString())
    }
  }

  const handlePageSizeChange = (newSize: string) => {
    const size = parseInt(newSize)
    onPageSizeChange(size)
    // 改变页面大小时重置到第一页
    onPageChange(1)
    setInputPage('1')
  }

  const visiblePages = getVisiblePages()
  const startItem = (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, totalItems)

  return (
    <div className={`flex flex-col space-y-4 ${className}`}>
      {/* 页面信息栏 */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-4">
          <span>
            第 {startItem}-{endItem} 项，共 {totalItems} 项
          </span>
          <Badge variant="outline">
            第 {currentPage} 页，共 {totalPages} 页
          </Badge>
        </div>

        {/* 自动播放控制 */}
        {enableAutoPlay && totalPages > 1 && (
          <div className="flex items-center gap-3">
            <Button
              variant={isPlaying ? "default" : "outline"}
              size="sm"
              onClick={handlePlayPause}
              className="flex items-center gap-2"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3 h-3" />
                  暂停
                </>
              ) : (
                <>
                  <Play className="w-3 h-3" />
                  播放
                </>
              )}
            </Button>

            {isPlaying && (
              <div className="flex items-center gap-2">
                <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-1000"
                    style={{
                      width: `${((autoPlayInterval - timeRemaining) / autoPlayInterval) * 100}%`
                    }}
                  />
                </div>
                <span className="text-xs">
                  {Math.ceil(timeRemaining / 1000)}s
                </span>
              </div>
            )}

            <Select
              value={autoPlayInterval.toString()}
              onValueChange={(value) => {
                const newInterval = parseInt(value)
                setTimeRemaining(newInterval)
              }}
            >
              <SelectTrigger className="w-20 h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3000">3s</SelectItem>
                <SelectItem value="5000">5s</SelectItem>
                <SelectItem value="10000">10s</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* 分页控制 */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          {/* 每页显示数量 */}
          <div className="flex items-center gap-2 text-sm">
            <span>每页显示:</span>
            <Select
              value={pageSize.toString()}
              onValueChange={handlePageSizeChange}
            >
              <SelectTrigger className="w-16 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 页码导航 */}
        <div className="flex items-center gap-1">
          {/* 首页 */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
            className="h-8 w-8 p-0"
          >
            <SkipBack className="w-3 h-3" />
          </Button>

          {/* 上一页 */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="w-3 h-3" />
          </Button>

          {/* 页码 */}
          <div className="flex items-center gap-1 mx-1">
            {visiblePages.map((page, index) =>
              page === '...' ? (
                <span key={`dots-${index}`} className="px-2 text-muted-foreground">
                  ...
                </span>
              ) : (
                <Button
                  key={page as number}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePageChange(page as number)}
                  className="h-8 w-8 p-0 text-xs"
                >
                  {page}
                </Button>
              )
            )}
          </div>

          {/* 下一页 */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="w-3 h-3" />
          </Button>

          {/* 末页 */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="h-8 w-8 p-0"
          >
            <SkipForward className="w-3 h-3" />
          </Button>

          {/* 跳转输入框 */}
          <div className="flex items-center gap-1 ml-2">
            <span className="text-sm text-muted-foreground">跳转至</span>
            <input
              type="number"
              min="1"
              max={totalPages}
              value={inputPage}
              onChange={(e) => setInputPage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleInputPageSubmit()
                }
              }}
              onBlur={handleInputPageSubmit}
              className="w-12 h-8 text-center text-sm border rounded px-1"
            />
            <span className="text-sm text-muted-foreground">页</span>
          </div>
        </div>
      </div>
    </div>
  )
}