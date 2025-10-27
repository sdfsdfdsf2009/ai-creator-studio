'use client'

import React, { useRef, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

interface VideoPlayerProps {
  src: string
  thumbnail?: string
  autoPlay?: boolean
  controls?: boolean
  width?: number
  height?: number
  className?: string
  onPlay?: () => void
  onPause?: () => void
  onEnded?: () => void
  showControls?: boolean
  enablePreview?: boolean // 新增：是否启用预览模式（禁用内部点击处理）
}

export function VideoPlayer({
  src,
  thumbnail,
  autoPlay = false,
  controls = true,
  width,
  height,
  className = '',
  onPlay,
  onPause,
  onEnded,
  showControls = true,
  enablePreview = false
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showOverlay, setShowOverlay] = useState(true)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const updateTime = () => setCurrentTime(video.currentTime)
    const updateDuration = () => setDuration(video.duration)
    const handlePlay = () => {
      setIsPlaying(true)
      onPlay?.()
    }
    const handlePause = () => {
      setIsPlaying(false)
      onPause?.()
    }
    const handleEnded = () => {
      setIsPlaying(false)
      onEnded?.()
    }
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    video.addEventListener('timeupdate', updateTime)
    video.addEventListener('loadedmetadata', updateDuration)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('ended', handleEnded)
    video.addEventListener('fullscreenchange', handleFullscreenChange)

    return () => {
      video.removeEventListener('timeupdate', updateTime)
      video.removeEventListener('loadedmetadata', updateDuration)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('ended', handleEnded)
      video.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [onPlay, onPause, onEnded])

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return

    if (isPlaying) {
      video.pause()
    } else {
      video.play()
    }
  }

  const handleSeek = (value: number[]) => {
    const video = videoRef.current
    if (!video) return
    video.currentTime = value[0]
    setCurrentTime(value[0])
  }

  const handleVolumeChange = (value: number[]) => {
    const video = videoRef.current
    if (!video) return
    const newVolume = value[0]
    video.volume = newVolume
    setVolume(newVolume)
    setIsMuted(newVolume === 0)
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return
    video.muted = !isMuted
    setIsMuted(!isMuted)
  }

  const toggleFullscreen = () => {
    const container = videoRef.current?.parentElement
    if (!container) return

    if (!document.fullscreenElement) {
      container.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div
      className={`relative bg-black rounded-lg overflow-hidden group ${className}`}
      style={{ width, height }}
      onMouseEnter={() => setShowOverlay(true)}
      onMouseLeave={() => setShowOverlay(false)}
    >
      <video
        ref={videoRef}
        src={src}
        poster={thumbnail || undefined}
        className="w-full h-full object-contain"
        autoPlay={autoPlay}
        playsInline
        preload="metadata"
      />

      {/* 播放按钮覆盖层 */}
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
          <Button
            data-play-button="true"
            onClick={(e) => {
              e.stopPropagation()
              togglePlay()
            }}
            size="lg"
            className="w-16 h-16 rounded-full bg-white bg-opacity-80 hover:bg-opacity-100 text-black"
          >
            <svg className="w-8 h-8 ml-1" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
            </svg>
          </Button>
        </div>
      )}

      {/* 默认封面（当没有缩略图时显示） */}
      {!thumbnail && !isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-600">
          <div className="text-center text-white">
            <div className="text-6xl mb-2">🎬</div>
            <div className="text-sm opacity-80">点击播放视频</div>
          </div>
        </div>
      )}

      {/* 控制栏 */}
      {showControls && (
        <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300 ${
          showOverlay || isPlaying ? 'opacity-100' : 'opacity-0'
        }`}>
          {/* 进度条 */}
          <div className="mb-3">
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={1}
              value={currentTime}
              onChange={(e) => handleSeek([parseInt(e.target.value)])}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-white text-xs mt-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* 控制按钮 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* 播放/暂停按钮 */}
              <Button
                data-play-controls="true"
                onClick={(e) => {
                  e.stopPropagation()
                  togglePlay()
                }}
                size="sm"
                variant="ghost"
                className="text-white hover:bg-white/20"
              >
                {isPlaying ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                )}
              </Button>

              {/* 音量控制 */}
              <div className="flex items-center gap-2">
                <Button
                  onClick={toggleMute}
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-white/20"
                >
                  {isMuted ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                    </svg>
                  )}
                </Button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.1}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => handleVolumeChange([parseFloat(e.target.value)])}
                  className="w-20 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* 全屏按钮 */}
              <Button
                onClick={toggleFullscreen}
                size="sm"
                variant="ghost"
                className="text-white hover:bg-white/20"
              >
                {isFullscreen ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H5v3a1 1 0 01-2 0V4zm12 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-2 0V5h-3a1 1 0 010-2zM4 15a1 1 0 011-1h3a1 1 0 010 2H5v3a1 1 0 01-2 0v-4zm12 0a1 1 0 011-1h3a1 1 0 011 1v4a1 1 0 01-2 0v-3h-3a1 1 0 010-2z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H5v3a1 1 0 01-2 0V4zm12 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-2 0V5h-3a1 1 0 010-2zM4 15a1 1 0 011-1h3a1 1 0 010 2H5v3a1 1 0 01-2 0v-4zm12 0a1 1 0 011-1h3a1 1 0 011 1v4a1 1 0 01-2 0v-3h-3a1 1 0 010-2z" clipRule="evenodd" />
                  </svg>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// 视频预览组件（用于卡片中的小尺寸预览）
interface VideoPreviewProps {
  src: string
  thumbnail?: string
  width?: number
  height?: number
  className?: string
  onPlay?: () => void
}

export function VideoPreview({
  src,
  thumbnail,
  width = 300,
  height = 200,
  className = '',
  onPlay
}: VideoPreviewProps) {
  const [isHovering, setIsHovering] = useState(false)

  return (
    <div
      className={`relative bg-black rounded-md overflow-hidden ${enablePreview ? 'cursor-pointer' : 'cursor-pointer'} group ${className}`}
      style={{ width, height }}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onClick={!enablePreview ? onPlay : undefined}
    >
      {/* 缩略图或视频 */}
      <div className="w-full h-full relative">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt="Video thumbnail"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-900">
            <div className="text-4xl">🎬</div>
          </div>
        )}

        {/* 播放按钮覆盖层 */}
        <div className={`absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 transition-opacity duration-200 ${
          isHovering ? 'opacity-100' : 'opacity-0'
        }`}>
          <div className="w-12 h-12 bg-white bg-opacity-90 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-black ml-1" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
            </svg>
          </div>
        </div>

        {/* 视频类型标签 */}
        <div className="absolute top-2 right-2 bg-red-600 text-white text-xs px-2 py-1 rounded">
          VIDEO
        </div>
      </div>
    </div>
  )
}