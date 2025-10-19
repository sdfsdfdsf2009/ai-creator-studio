'use client'

import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { templateApi } from '@/lib/api'
import { useTemplateStore } from '@/store'
import { PromptTemplate } from '@/types'

// 获取模板列表
export function useTemplates(params?: {
  page?: number
  pageSize?: number
  mediaType?: string
  search?: string
}) {
  const { setTemplates, setLoading, setError } = useTemplateStore()

  const query = useQuery({
    queryKey: ['templates', params],
    queryFn: () => templateApi.getTemplates(params),
  })

  React.useEffect(() => {
    if (query.data) {
      setTemplates(query.data.items)
    }
    setLoading(query.isLoading)
    if (query.error) {
      setError(query.error instanceof Error ? query.error.message : String(query.error))
    }
  }, [query.data, query.isLoading, query.error, setTemplates, setLoading, setError])

  return query
}

// 获取单个模板
export function useTemplate(id: string) {
  const { setCurrentTemplate, setLoading, setError } = useTemplateStore()

  const query = useQuery({
    queryKey: ['template', id],
    queryFn: () => templateApi.getTemplate(id),
    enabled: !!id,
  })

  React.useEffect(() => {
    if (query.data) {
      setCurrentTemplate(query.data.data || null)
    }
    setLoading(query.isLoading)
    if (query.error) {
      setError(query.error instanceof Error ? query.error.message : String(query.error))
    }
  }, [query.data, query.isLoading, query.error, setCurrentTemplate, setLoading, setError])

  return query
}

// 创建模板
export function useCreateTemplate() {
  const queryClient = useQueryClient()
  const { addTemplate, setLoading, setError } = useTemplateStore()

  const mutation = useMutation({
    mutationFn: templateApi.createTemplate,
  })

  React.useEffect(() => {
    if (mutation.data) {
      if (mutation.data.data) {
        addTemplate(mutation.data.data)
      }
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      setLoading(false)
    }
    if (mutation.error) {
      setError(mutation.error instanceof Error ? mutation.error.message : String(mutation.error))
      setLoading(false)
    }
  }, [mutation.data, mutation.error, addTemplate, queryClient, setLoading, setError])

  return mutation
}

// 更新模板
export function useUpdateTemplate() {
  const queryClient = useQueryClient()
  const { updateTemplate } = useTemplateStore()

  const mutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PromptTemplate> }) =>
      templateApi.updateTemplate(id, data),
  })

  React.useEffect(() => {
    if (mutation.data?.data) {
      updateTemplate(mutation.data.data.id, mutation.data.data)
      queryClient.invalidateQueries({ queryKey: ['template', mutation.data.data.id] })
      queryClient.invalidateQueries({ queryKey: ['templates'] })
    }
  }, [mutation.data, updateTemplate, queryClient])

  return mutation
}

// 删除模板
export function useDeleteTemplate() {
  const queryClient = useQueryClient()
  const { removeTemplate } = useTemplateStore()

  const mutation = useMutation({
    mutationFn: templateApi.deleteTemplate,
  })

  React.useEffect(() => {
    if (mutation.isSuccess) {
      removeTemplate(mutation.variables as string)
      queryClient.invalidateQueries({ queryKey: ['templates'] })
    }
  }, [mutation.isSuccess, mutation.variables, removeTemplate, queryClient])

  return mutation
}

// 使用模板
export function useUseTemplate() {
  return useMutation({
    mutationFn: ({ id, variables }: { id: string; variables: Record<string, any> }) =>
      templateApi.useTemplate(id, variables),
  })
}