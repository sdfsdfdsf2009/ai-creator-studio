import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { Task, PromptTemplate, UserSettings, Analytics, AIModel } from '@/types'

// 任务 Store
interface TaskStore {
  tasks: Task[]
  currentTask: Task | null
  isLoading: boolean
  error: string | null
  
  // Actions
  setTasks: (tasks: Task[]) => void
  addTask: (task: Task) => void
  updateTask: (id: string, updates: Partial<Task>) => void
  setCurrentTask: (task: Task | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearTasks: () => void
}

export const useTaskStore = create<TaskStore>()(
  devtools(
    (set, get) => ({
      tasks: [],
      currentTask: null,
      isLoading: false,
      error: null,

      setTasks: (tasks) => set({ tasks }),
      
      addTask: (task) => set((state) => ({ 
        tasks: [task, ...state.tasks] 
      })),
      
      updateTask: (id, updates) => set((state) => ({
        tasks: state.tasks.map(task => 
          task.id === id ? { ...task, ...updates } : task
        ),
        currentTask: state.currentTask?.id === id 
          ? { ...state.currentTask, ...updates } 
          : state.currentTask
      })),
      
      setCurrentTask: (task) => set({ currentTask: task }),
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      clearTasks: () => set({ tasks: [], currentTask: null }),
    }),
    { name: 'task-store' }
  )
)

// Prompt 模板 Store
interface TemplateStore {
  templates: PromptTemplate[]
  currentTemplate: PromptTemplate | null
  isLoading: boolean
  error: string | null
  
  // Actions
  setTemplates: (templates: PromptTemplate[]) => void
  addTemplate: (template: PromptTemplate) => void
  updateTemplate: (id: string, updates: Partial<PromptTemplate>) => void
  removeTemplate: (id: string) => void
  setCurrentTemplate: (template: PromptTemplate | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export const useTemplateStore = create<TemplateStore>()(
  devtools(
    (set) => ({
      templates: [],
      currentTemplate: null,
      isLoading: false,
      error: null,

      setTemplates: (templates) => set({ templates }),
      addTemplate: (template) => set((state) => ({ 
        templates: [template, ...state.templates] 
      })),
      updateTemplate: (id, updates) => set((state) => ({
        templates: state.templates.map(template => 
          template.id === id ? { ...template, ...updates } : template
        ),
        currentTemplate: state.currentTemplate?.id === id 
          ? { ...state.currentTemplate, ...updates } 
          : state.currentTemplate
      })),
      removeTemplate: (id) => set((state) => ({
        templates: state.templates.filter(template => template.id !== id),
        currentTemplate: state.currentTemplate?.id === id ? null : state.currentTemplate
      })),
      setCurrentTemplate: (template) => set({ currentTemplate: template }),
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
    }),
    { name: 'template-store' }
  )
)

// 用户设置 Store
interface SettingsStore {
  settings: UserSettings
  isLoading: boolean
  error: string | null
  
  // Actions
  updateSettings: (updates: Partial<UserSettings>) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  resetSettings: () => void
}

const defaultSettings: UserSettings = {
  preferredModel: 'dall-e-3',
  defaultParameters: {},
  autoSave: true,
  notifications: true,
  theme: 'system'
}

export const useSettingsStore = create<SettingsStore>()(
  devtools(
    (set) => ({
      settings: defaultSettings,
      isLoading: false,
      error: null,

      updateSettings: (updates) => set((state) => ({ 
        settings: { ...state.settings, ...updates } 
      })),
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      resetSettings: () => set({ settings: defaultSettings }),
    }),
    { name: 'settings-store' }
  )
)

// 分析数据 Store
interface AnalyticsStore {
  analytics: Analytics | null
  isLoading: boolean
  error: string | null
  
  // Actions
  setAnalytics: (analytics: Analytics) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearAnalytics: () => void
}

export const useAnalyticsStore = create<AnalyticsStore>()(
  devtools(
    (set) => ({
      analytics: null,
      isLoading: false,
      error: null,

      setAnalytics: (analytics) => set({ analytics }),
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      clearAnalytics: () => set({ analytics: null }),
    }),
    { name: 'analytics-store' }
  )
)

// AI 模型 Store
interface ModelStore {
  models: AIModel[]
  isLoading: boolean
  error: string | null
  
  // Actions
  setModels: (models: AIModel[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export const useModelStore = create<ModelStore>()(
  devtools(
    (set) => ({
      models: [],
      isLoading: false,
      error: null,

      setModels: (models) => set({ models }),
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
    }),
    { name: 'model-store' }
  )
)