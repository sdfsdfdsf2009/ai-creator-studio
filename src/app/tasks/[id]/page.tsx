'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useParams } from 'next/navigation'

export default function TaskDetailPage() {
  const params = useParams()
  const taskId = params.id as string

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Task Details</h1>
          <p className="text-muted-foreground">Task ID: {taskId}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Retry</Button>
          <Button variant="destructive">Cancel</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Generation Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Status</span>
                  <Badge variant="secondary">Pending</Badge>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: '0%' }}></div>
                </div>
                <div className="text-sm text-muted-foreground">
                  Progress: 0%
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Results</CardTitle>
              <CardDescription>Generated content will appear here</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                No results yet. Task is still pending.
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Task Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <span className="font-medium">Type:</span>
                <p className="text-sm text-muted-foreground">Image Generation</p>
              </div>
              <div>
                <span className="font-medium">Model:</span>
                <p className="text-sm text-muted-foreground">DALL-E 3</p>
              </div>
              <div>
                <span className="font-medium">Cost:</span>
                <p className="text-sm text-muted-foreground">$0.0400</p>
              </div>
              <div>
                <span className="font-medium">Created:</span>
                <p className="text-sm text-muted-foreground">Just now</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Prompt</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                A beautiful sunset over mountains...
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}