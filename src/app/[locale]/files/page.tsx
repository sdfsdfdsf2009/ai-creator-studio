'use client'

import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useFiles, useFileUpload, useDeleteFile, useBatchDeleteFiles, fileUtils } from '@/hooks/use-files'
import { UploadedFile } from '@/hooks/use-files'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'

export default function FilesPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: filesData, isLoading, error } = useFiles({
    type: typeFilter !== 'all' ? typeFilter as 'image' | 'video' : undefined,
  })

  const uploadMutation = useFileUpload()
  const deleteMutation = useDeleteFile()
  const batchDeleteMutation = useBatchDeleteFiles()

  const files = filesData?.items || []

  // 过滤和排序文件
  const filteredAndSortedFiles = files
    .filter(file => {
      if (!searchQuery) return true
      const query = searchQuery.toLowerCase()
      return file.name.toLowerCase().includes(query) ||
             file.originalName.toLowerCase().includes(query)
    })
    .sort((a, b) => {
      let aValue: any = a[sortBy as keyof UploadedFile]
      let bValue: any = b[sortBy as keyof UploadedFile]

      if (sortBy === 'createdAt') {
        aValue = new Date(aValue).getTime()
        bValue = new Date(bValue).getTime()
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (!fileUtils.isValidFileType(file)) {
        alert('不支持的文件类型。请上传图片或视频文件。')
        return
      }
      if (!fileUtils.isValidFileSize(file)) {
        alert('文件太大。最大支持 100MB。')
        return
      }
      uploadMutation.mutate(file)
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleSelectItem = (id: string) => {
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  const handleSelectAll = () => {
    if (selectedItems.length === filteredAndSortedFiles.length) {
      setSelectedItems([])
    } else {
      setSelectedItems(filteredAndSortedFiles.map(f => f.id))
    }
  }

  const handleDeleteFile = async (fileId: string) => {
    if (confirm('确定要删除这个文件吗？')) {
      try {
        await deleteMutation.mutateAsync(fileId)
      } catch (error) {
        console.error('删除失败:', error)
      }
    }
  }

  const handleBatchDelete = async () => {
    if (selectedItems.length === 0) return

    if (confirm(`确定要删除选中的 ${selectedItems.length} 个文件吗？`)) {
      try {
        await batchDeleteMutation.mutateAsync(selectedItems)
        setSelectedItems([])
      } catch (error) {
        console.error('批量删除失败:', error)
      }
    }
  }

  const handleDownload = (file: UploadedFile) => {
    const link = document.createElement('a')
    link.href = file.url
    link.download = file.originalName
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">加载中...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="text-center">
          <div className="text-red-500 mb-4">❌</div>
          <h3 className="text-lg font-semibold mb-2">加载失败</h3>
          <p className="text-muted-foreground mb-4">{error.message}</p>
          <Button onClick={() => window.location.reload()}>重新加载</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 标题和上传按钮 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">文件管理</h1>
          <p className="text-muted-foreground">管理您上传的图片和视频文件</p>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button onClick={handleUploadClick} disabled={uploadMutation.isPending}>
            {uploadMutation.isPending ? '上传中...' : '📤 上传文件'}
          </Button>
        </div>
      </div>

      {/* 搜索和筛选 */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <Input
          placeholder="搜索文件..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex gap-2 flex-wrap">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="all">所有类型</option>
            <option value="image">图片</option>
            <option value="video">视频</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="createdAt">上传时间</option>
            <option value="name">文件名</option>
            <option value="size">文件大小</option>
          </select>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
            className="px-3 py-2 border rounded-md"
          >
            <option value="desc">降序</option>
            <option value="asc">升序</option>
          </select>
        </div>
        <div className="flex gap-1 ml-auto">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            网格
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            列表
          </Button>
        </div>
      </div>

      {/* 批量操作 */}
      {filteredAndSortedFiles.length > 0 && (
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={selectedItems.length === filteredAndSortedFiles.length && filteredAndSortedFiles.length > 0}
              onChange={handleSelectAll}
              className="rounded"
            />
            全选
          </label>
          <span className="text-sm text-muted-foreground">
            共 {filteredAndSortedFiles.length} 个文件
          </span>
        </div>
      )}

      {selectedItems.length > 0 && (
        <div className="p-4 bg-muted rounded-lg">
          <div className="flex justify-between items-center">
            <span className="font-medium">已选择 {selectedItems.length} 个文件</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                📥 下载选中
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBatchDelete}
                disabled={batchDeleteMutation.isPending}
              >
                🗑️ 删除选中
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 文件列表 */}
      <div className={viewMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4' : 'space-y-4'}>
        {filteredAndSortedFiles.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <div className="text-muted-foreground">
              <h3 className="text-lg font-medium mb-2">
                {searchQuery || typeFilter !== 'all' ? '没有找到匹配的文件' : '暂无文件'}
              </h3>
              <p>
                {searchQuery || typeFilter !== 'all'
                  ? '尝试调整搜索条件或筛选器'
                  : '上传一些文件来开始管理'
                }
              </p>
              <Button className="mt-4" onClick={handleUploadClick}>
                上传您的第一个文件
              </Button>
            </div>
          </div>
        ) : (
          filteredAndSortedFiles.map((file) => (
            <Card key={file.id} className="group hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="space-y-3">
                  {/* 选择框和类型标识 */}
                  <div className="flex justify-between items-start">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(file.id)}
                      onChange={() => handleSelectItem(file.id)}
                      className="rounded mt-1"
                    />
                    <div className="flex gap-1">
                      <Badge variant="outline" className="text-xs">
                        {fileUtils.getFileIcon(file.type)}
                      </Badge>
                    </div>
                  </div>

                  {/* 预览图 */}
                  <div className="aspect-square bg-muted rounded-md overflow-hidden">
                    {file.type === 'image' ? (
                      <img
                        src={file.url}
                        alt={file.name}
                        className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => window.open(file.url, '_blank')}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl bg-gray-100">
                        🎬
                      </div>
                    )}
                  </div>

                  {/* 文件信息 */}
                  <div className="space-y-2">
                    <div className="font-medium text-sm truncate" title={file.originalName}>
                      {file.originalName}
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>{fileUtils.getFileTypeText(file.type)}</div>
                      <div>{fileUtils.formatFileSize(file.size)}</div>
                      <div>
                        {formatDistanceToNow(new Date(file.createdAt), {
                          addSuffix: true,
                          locale: zhCN
                        })}
                      </div>
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs h-7"
                        onClick={() => handleDownload(file)}
                      >
                        下载
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs h-7"
                        onClick={() => window.open(file.url, '_blank')}
                      >
                        查看
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="text-xs h-7 px-2"
                        onClick={() => handleDeleteFile(file.id)}
                        disabled={deleteMutation.isPending}
                      >
                        🗑️
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}