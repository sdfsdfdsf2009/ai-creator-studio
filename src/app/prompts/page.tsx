'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useState } from 'react'

export default function PromptsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [mediaTypeFilter, setMediaTypeFilter] = useState('all')

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Prompt Templates</h1>
          <p className="text-muted-foreground">Manage and reuse your prompt templates</p>
        </div>
        <Button>Create New Template</Button>
      </div>

      <div className="flex gap-4 items-center">
        <Input
          placeholder="Search templates..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
        <select
          value={mediaTypeFilter}
          onChange={(e) => setMediaTypeFilter(e.target.value)}
          className="px-3 py-2 border rounded-md"
        >
          <option value="all">All Types</option>
          <option value="image">Image Templates</option>
          <option value="video">Video Templates</option>
        </select>
      </div>

      <div className="grid gap-6">
        {/* Example template cards */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>Professional Headshot</CardTitle>
                <CardDescription>Generate professional business portraits</CardDescription>
              </div>
              <div className="flex gap-2">
                <Badge variant="secondary">Image</Badge>
                <Badge variant="outline">Popular</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Professional headshot of a professional, wearing business attire, 
                plain background, studio lighting, high quality
              </p>
              <div className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                  Used 24 times • Saved $12.40 in costs
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">Edit</Button>
                  <Button size="sm">Use Template</Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>Cinematic Video Scene</CardTitle>
                <CardDescription>Create dramatic video scenes</CardDescription>
              </div>
              <div className="flex gap-2">
                <Badge variant="secondary">Video</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Cinematic scene with dramatic lighting, 
                professional camera work, dramatic atmosphere, 4K quality
              </p>
              <div className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                  Used 8 times • Saved $6.80 in costs
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">Edit</Button>
                  <Button size="sm">Use Template</Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}