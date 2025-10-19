'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useState } from 'react'

export default function TasksPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Tasks</h1>
          <p className="text-muted-foreground">Manage your AI generation tasks</p>
        </div>
        <Button>
          Create New Task
        </Button>
      </div>

      <div className="flex gap-4 items-center">
        <Input
          placeholder="Search tasks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border rounded-md"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="running">Running</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      <div className="grid gap-4">
        {/* Task cards will be rendered here */}
        <Card>
          <CardHeader>
            <CardTitle>No tasks yet</CardTitle>
            <CardDescription>Create your first AI generation task to get started</CardDescription>
          </CardHeader>
          <CardContent>
            <Button>Create Task</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}