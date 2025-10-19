'use client'

import { useRouter } from 'next/navigation'
import { TaskForm } from '@/components/task-form'
import { useCreateTask } from '@/hooks/use-tasks'

export default function CreateTaskPage() {
  const router = useRouter()
  const createTaskMutation = useCreateTask()

  const handleSubmit = async (taskData: {
    type: 'image' | 'video'
    prompt: string
    model: string
    parameters: Record<string, any>
  }) => {
    try {
      const result = await createTaskMutation.mutateAsync(taskData)

      if (result.data) {
        // 跳转到任务详情页面
        router.push(`/tasks/${result.data.id}`)
      }
    } catch (error) {
      console.error('Failed to create task:', error)
      // 错误处理已经在 useCreateTask hook 中完成
    }
  }

  const handleCancel = () => {
    router.push('/tasks')
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">创建新任务</h1>
          <p className="text-muted-foreground">设置 AI 生成任务的参数配置</p>
        </div>

        <TaskForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      </div>
    </div>
  )
}