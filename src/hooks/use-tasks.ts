'use client'

import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { taskApi } from '@/lib/api'
import { useTaskStore } from '@/store'
import { Task } from '@/types'

// 获取任务列表
export function useTasks(params?: {
  page?: number
  pageSize?: number
  status?: string
  type?: string
}) {
  const { setTasks, setLoading, setError } = useTaskStore()

  const query = useQuery({
    queryKey: ['tasks', params],
    queryFn: () => taskApi.getTasks(params),
  })

  React.useEffect(() => {
    if (query.data) {
      setTasks(query.data.items)
    }
    setLoading(query.isLoading)
    if (query.error) {
      setError(query.error instanceof Error ? query.error.message : String(query.error))
    }
  }, [query.data, query.isLoading, query.error, setTasks, setLoading, setError])

  return query
}

// 获取单个任务
export function useTask(id: string) {
  const { setCurrentTask, setLoading, setError } = useTaskStore()

  const query = useQuery({
    queryKey: ['task', id],
    queryFn: () => taskApi.getTask(id),
    enabled: !!id,
  })

  React.useEffect(() => {
    if (query.data) {
      setCurrentTask(query.data.data || null)
    }
    setLoading(query.isLoading)
    if (query.error) {
      setError(query.error instanceof Error ? query.error.message : String(query.error))
    }
  }, [query.data, query.isLoading, query.error, setCurrentTask, setLoading, setError])

  return query
}

// 创建任务
export function useCreateTask() {
  const queryClient = useQueryClient()
  const { addTask, setLoading, setError } = useTaskStore()

  const mutation = useMutation({
    mutationFn: taskApi.createTask,
  })

  React.useEffect(() => {
    if (mutation.data) {
      if (mutation.data.data) {
        addTask(mutation.data.data)
      }
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      setLoading(false)
    }
    if (mutation.error) {
      setError(mutation.error instanceof Error ? mutation.error.message : String(mutation.error))
      setLoading(false)
    }
  }, [mutation.data, mutation.error, addTask, queryClient, setLoading, setError])

  return mutation
}

// 取消任务
export function useCancelTask() {
  const queryClient = useQueryClient()
  const { updateTask } = useTaskStore()

  const mutation = useMutation({
    mutationFn: taskApi.cancelTask,
  })

  React.useEffect(() => {
    if (mutation.data?.data) {
      updateTask(mutation.data.data.id, mutation.data.data)
      queryClient.invalidateQueries({ queryKey: ['task', mutation.data.data.id] })
    }
  }, [mutation.data, updateTask, queryClient])

  return mutation
}

// 重试任务
export function useRetryTask() {
  const queryClient = useQueryClient()
  const { updateTask } = useTaskStore()

  const mutation = useMutation({
    mutationFn: taskApi.retryTask,
  })

  React.useEffect(() => {
    if (mutation.data?.data) {
      updateTask(mutation.data.data.id, mutation.data.data)
      queryClient.invalidateQueries({ queryKey: ['task', mutation.data.data.id] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    }
  }, [mutation.data, updateTask, queryClient])

  return mutation
}

// 删除任务
export function useDeleteTask() {
  const queryClient = useQueryClient()
  const { updateTask } = useTaskStore()

  const mutation = useMutation({
    mutationFn: taskApi.deleteTask,
  })

  React.useEffect(() => {
    if (mutation.isSuccess) {
      updateTask(mutation.variables as string, { status: 'cancelled' })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    }
  }, [mutation.isSuccess, mutation.variables, updateTask, queryClient])

  return mutation
}