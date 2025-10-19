'use client'

import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { materialsApi } from '@/lib/api'
import { Material, MaterialFilter, MaterialSort, BatchOperationParams } from '@/lib/materials'

// 获取素材列表
export function useMaterials(params?: {
  page?: number
  pageSize?: number
  type?: 'image' | 'video'
  category?: string
  tags?: string[]
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}) {
  const query = useQuery({
    queryKey: ['materials', params],
    queryFn: () => materialsApi.getMaterials(params),
  })

  return query
}

// 获取素材详情
export function useMaterial(id: string) {
  const query = useQuery({
    queryKey: ['material', id],
    queryFn: () => materialsApi.getMaterial(id),
    enabled: !!id,
  })

  return query
}

// 创建素材
export function useCreateMaterial() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: materialsApi.createMaterial,
  })

  React.useEffect(() => {
    if (mutation.data?.data) {
      queryClient.invalidateQueries({ queryKey: ['materials'] })
    }
  }, [mutation.data, queryClient])

  return mutation
}

// 更新素材
export function useUpdateMaterial() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Material> }) =>
      materialsApi.updateMaterial(id, data),
  })

  React.useEffect(() => {
    if (mutation.data?.data) {
      queryClient.invalidateQueries({ queryKey: ['materials'] })
      queryClient.invalidateQueries({ queryKey: ['material', mutation.variables?.id] })
    }
  }, [mutation.data, mutation.variables, queryClient])

  return mutation
}

// 删除素材
export function useDeleteMaterial() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: materialsApi.deleteMaterial,
  })

  React.useEffect(() => {
    if (mutation.isSuccess) {
      queryClient.invalidateQueries({ queryKey: ['materials'] })
      queryClient.invalidateQueries({ queryKey: ['material', mutation.variables] })
    }
  }, [mutation.isSuccess, mutation.variables, queryClient])

  return mutation
}

// 批量操作素材
export function useBatchMaterialsOperation() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: materialsApi.batchOperation,
  })

  React.useEffect(() => {
    if (mutation.data?.data) {
      queryClient.invalidateQueries({ queryKey: ['materials'] })
    }
  }, [mutation.data, queryClient])

  return mutation
}

// 获取素材分类
export function useMaterialCategories() {
  const query = useQuery({
    queryKey: ['material-categories'],
    queryFn: materialsApi.getCategories,
  })

  return query
}

// 创建素材分类
export function useCreateMaterialCategory() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: materialsApi.createCategory,
  })

  React.useEffect(() => {
    if (mutation.data?.data) {
      queryClient.invalidateQueries({ queryKey: ['material-categories'] })
      queryClient.invalidateQueries({ queryKey: ['materials'] })
    }
  }, [mutation.data, queryClient])

  return mutation
}

// 获取素材集合
export function useMaterialCollections() {
  const query = useQuery({
    queryKey: ['material-collections'],
    queryFn: materialsApi.getCollections,
  })

  return query
}

// 创建素材集合
export function useCreateMaterialCollection() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: materialsApi.createCollection,
  })

  React.useEffect(() => {
    if (mutation.data?.data) {
      queryClient.invalidateQueries({ queryKey: ['material-collections'] })
    }
  }, [mutation.data, queryClient])

  return mutation
}

// 素材搜索 Hook
export function useMaterialSearch(searchTerm: string, options?: {
  type?: 'image' | 'video'
  category?: string
  tags?: string[]
  enabled?: boolean
}) {
  const { enabled = true } = options || {}

  const query = useQuery({
    queryKey: ['material-search', searchTerm, options],
    queryFn: () => materialsApi.searchMaterials({
      search: searchTerm,
      ...options,
      page: 1,
      pageSize: 20,
    }),
    enabled: enabled && searchTerm.length > 0,
  })

  return query
}