'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useState } from 'react'

export default function LibraryPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedItems, setSelectedItems] = useState<string[]>([])

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Material Library</h1>
          <p className="text-muted-foreground">Browse and manage your generated content</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            Export Selected
          </Button>
          <Button size="sm">
            Upload Content
          </Button>
        </div>
      </div>

      <div className="flex gap-4 items-center">
        <Input
          placeholder="Search materials..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
        <select className="px-3 py-2 border rounded-md">
          <option value="all">All Types</option>
          <option value="image">Images</option>
          <option value="video">Videos</option>
        </select>
        <select className="px-3 py-2 border rounded-md">
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="name">Name</option>
        </select>
        <div className="flex gap-1 ml-auto">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            Grid
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            List
          </Button>
        </div>
      </div>

      {selectedItems.length > 0 && (
        <div className="p-4 bg-muted rounded-lg">
          <div className="flex justify-between items-center">
            <span className="font-medium">{selectedItems.length} items selected</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                Download
              </Button>
              <Button variant="outline" size="sm">
                Add to Collection
              </Button>
              <Button variant="destructive" size="sm">
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className={viewMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4' : 'space-y-4'}>
        {/* Placeholder for empty state */}
        <div className="col-span-full text-center py-12">
          <div className="text-muted-foreground">
            <h3 className="text-lg font-medium mb-2">No materials yet</h3>
            <p>Generate some content to see it appear in your library</p>
            <Button className="mt-4">Create Your First Generation</Button>
          </div>
        </div>
      </div>
    </div>
  )
}