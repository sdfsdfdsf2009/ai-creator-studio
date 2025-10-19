'use client'

import { useRouter } from 'next/navigation'
import { TaskForm } from '@/components/task-form'

export default function CreateTaskPage() {
  const router = useRouter()

  const handleSubmit = async (taskData: any) => {
    try {
      console.log('Creating task:', taskData)
      
      // 调用 API 创建任务
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskData),
      })
      
      const result = await response.json()
      
      if (result.success) {
        console.log('Task created successfully:', result.data)
        // 跳转到任务详情页面
        router.push(`/tasks/${result.data.id}`)
      } else {
        console.error('Failed to create task:', result.error)
        alert(`创建任务失败: ${result.error}`)
      }
    } catch (error) {
      console.error('Failed to create task:', error)
      alert('创建任务失败，请稍后重试')
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">创建新任务</h1>
          <p className="text-muted-foreground">设置 AI 生成任务的参数配置</p>
        </div>

        <TaskForm onSubmit={handleSubmit} />
      </div>
    </div>
  )
}