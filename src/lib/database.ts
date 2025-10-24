import sqlite3 from 'sqlite3'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'
import { randomUUID } from 'crypto'

// 数据库接口定义
export interface Database {
  // 任务相关
  createTask(task: any): Promise<any>
  getTask(id: string): Promise<any>
  getTasks(params?: any): Promise<{ items: any[], total: number }>
  updateTask(id: string, updates: any): Promise<any>
  deleteTask(id: string): Promise<void>

  // 素材相关
  createMaterial(material: any): Promise<any>
  getMaterial(id: string): Promise<any>
  getMaterials(params?: any): Promise<{ items: any[], total: number }>
  updateMaterial(id: string, updates: any): Promise<any>
  deleteMaterial(id: string): Promise<void>

  // 模板相关
  createTemplate(template: any): Promise<any>
  getTemplate(id: string): Promise<any>
  getTemplates(params?: any): Promise<{ items: any[], total: number }>
  updateTemplate(id: string, updates: any): Promise<any>
  deleteTemplate(id: string): Promise<void>

  // 统计相关
  getAnalytics(params?: any): Promise<any>

  // 批量任务相关
  createBatchTask(batchTask: any): Promise<any>
  getBatchTask(id: string): Promise<any>
  getBatchTasks(params?: any): Promise<{ items: any[], total: number }>
  updateBatchTask(id: string, updates: any): Promise<any>
  deleteBatchTask(id: string): Promise<void>
  getBatchSubTasks(batchId: string): Promise<any[]>

  // 变量相关
  createVariableSet(variableSet: any): Promise<any>
  getVariableSet(id: string): Promise<any>
  getVariableSets(params?: any): Promise<{ items: any[], total: number }>
  updateVariableSet(id: string, updates: any): Promise<any>
  deleteVariableSet(id: string): Promise<void>

  // 缓存相关
  createCacheEntry(cacheEntry: any): Promise<any>
  getCacheEntry(key: string): Promise<any>
  updateCacheEntry(key: string, updates: any): Promise<any>
  deleteCacheEntry(key: string): Promise<void>
  clearExpiredCache(): Promise<number>
  getCacheStats(): Promise<any>

  // 代理账号相关
  createProxyAccount(account: any): Promise<any>
  getProxyAccount(id: string): Promise<any>
  getProxyAccounts(params?: any): Promise<any[]>
  updateProxyAccount(id: string, updates: any): Promise<any>
  deleteProxyAccount(id: string): Promise<boolean>

  // 模型配置相关
  createModelConfig(config: any): Promise<any>
  getModelConfig(id: string): Promise<any>
  getModelConfigs(params?: any): Promise<any[]>
  updateModelConfig(id: string, updates: any): Promise<any>
  deleteModelConfig(id: string): Promise<boolean>

  // API端点相关
  createApiEndpoint(endpoint: any): Promise<any>
  getApiEndpoints(params?: any): Promise<any[]>
  getApiEndpoint(id: string): Promise<any>
  getApiEndpointsByProvider(provider: string): Promise<any[]>
  updateApiEndpoint(id: string, updates: any): Promise<any>
  deleteApiEndpoint(id: string): Promise<boolean>

  // 路由规则相关
  createRoutingRule(rule: any): Promise<any>
  getRoutingRule(id: string): Promise<any>
  getRoutingRules(params?: any): Promise<any[]>
  updateRoutingRule(id: string, updates: any): Promise<any>
  deleteRoutingRule(id: string): Promise<boolean>

  // 成本阈值相关
  createCostThreshold(threshold: any): Promise<any>
  getCostThreshold(id: string): Promise<any>
  getCostThresholds(params?: any): Promise<any[]>
  updateCostThreshold(id: string, updates: any): Promise<any>
  deleteCostThreshold(id: string): Promise<boolean>

  // 关闭连接
  close(): Promise<void>
}

class SQLiteDatabase implements Database {
  private db: sqlite3.Database
  private ready: Promise<void>

  constructor(dbPath: string) {
    this.db = new sqlite3.Database(dbPath)
    this.ready = this.initialize()
  }

  private generateId(): string {
    return uuidv4()
  }

  private async initialize(): Promise<void> {
    const run = promisify(this.db.run.bind(this.db))

    try {
      // 创建任务表（扩展支持批量任务）
      await run(`
        CREATE TABLE IF NOT EXISTS tasks (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          prompt TEXT NOT NULL,
          status TEXT NOT NULL,
          progress INTEGER DEFAULT 0,
          results TEXT, -- JSON array
          error TEXT,
          cost REAL DEFAULT 0,
          model TEXT NOT NULL,
          parameters TEXT, -- JSON object
          batch_id TEXT, -- 关联批量任务ID
          parent_task_id TEXT, -- 父任务ID（用于嵌套任务）
          variable_values TEXT, -- JSON object, 当前任务的变量值
          is_batch_root BOOLEAN DEFAULT FALSE, -- 是否为批量根任务
          batch_index INTEGER DEFAULT 0, -- 在批量任务中的索引
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (batch_id) REFERENCES batch_tasks (id),
          FOREIGN KEY (parent_task_id) REFERENCES tasks (id)
        )
      `)

      // 创建素材表
      await run(`
        CREATE TABLE IF NOT EXISTS materials (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          type TEXT NOT NULL,
          url TEXT NOT NULL,
          thumbnail_url TEXT,
          size INTEGER NOT NULL,
          format TEXT NOT NULL,
          width INTEGER,
          height INTEGER,
          duration INTEGER,
          prompt TEXT,
          model TEXT,
          tags TEXT, -- JSON array
          category TEXT,
          description TEXT,
          metadata TEXT, -- JSON object
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          task_id TEXT,
          FOREIGN KEY (task_id) REFERENCES tasks (id)
        )
      `)

      // 创建模板表
      await run(`
        CREATE TABLE IF NOT EXISTS templates (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          template TEXT NOT NULL,
          variables TEXT, -- JSON array
          media_type TEXT NOT NULL,
          model TEXT NOT NULL,
          usage_count INTEGER DEFAULT 0,
          total_cost REAL DEFAULT 0,
          cache_hit_rate REAL DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `)

      // 创建批量任务表
      await run(`
        CREATE TABLE IF NOT EXISTS batch_tasks (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          base_prompt TEXT NOT NULL,
          media_type TEXT NOT NULL,
          model TEXT NOT NULL,
          base_parameters TEXT, -- JSON object
          variable_definitions TEXT, -- JSON object, 变量定义
          total_subtasks INTEGER DEFAULT 0,
          completed_subtasks INTEGER DEFAULT 0,
          failed_subtasks INTEGER DEFAULT 0,
          total_cost REAL DEFAULT 0,
          status TEXT NOT NULL, -- pending, running, completed, failed, cancelled
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `)

      // 创建变量集表
      await run(`
        CREATE TABLE IF NOT EXISTS variable_sets (
          id TEXT PRIMARY KEY,
          batch_task_id TEXT NOT NULL,
          task_id TEXT, -- 关联的具体任务ID
          variable_values TEXT NOT NULL, -- JSON object
          expanded_prompt TEXT NOT NULL, -- 展开后的提示词
          cost_estimate REAL DEFAULT 0,
          status TEXT DEFAULT pending, -- pending, completed, failed
          created_at TEXT NOT NULL,
          FOREIGN KEY (batch_task_id) REFERENCES batch_tasks (id),
          FOREIGN KEY (task_id) REFERENCES tasks (id)
        )
      `)

      // 创建缓存表
      await run(`
        CREATE TABLE IF NOT EXISTS cache_entries (
          cache_key TEXT PRIMARY KEY,
          prompt TEXT NOT NULL,
          model TEXT NOT NULL,
          parameters TEXT, -- JSON object
          result TEXT NOT NULL, -- JSON object, 缓存的结果
          cost REAL DEFAULT 0,
          media_type TEXT NOT NULL,
          hit_count INTEGER DEFAULT 0,
          created_at TEXT NOT NULL,
          accessed_at TEXT NOT NULL,
          expires_at TEXT
        )
      `)

      // 创建索引
      await run('CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks (status)')
      await run('CREATE INDEX IF NOT EXISTS idx_tasks_type ON tasks (type)')
      await run('CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks (created_at)')
      await run('CREATE INDEX IF NOT EXISTS idx_tasks_batch_id ON tasks (batch_id)')
      await run('CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON tasks (parent_task_id)')
      await run('CREATE INDEX IF NOT EXISTS idx_materials_type ON materials (type)')
      await run('CREATE INDEX IF NOT EXISTS idx_materials_category ON materials (category)')
      await run('CREATE INDEX IF NOT EXISTS idx_materials_created_at ON materials (created_at)')
      await run('CREATE INDEX IF NOT EXISTS idx_templates_media_type ON templates (media_type)')
      await run('CREATE INDEX IF NOT EXISTS idx_templates_usage_count ON templates (usage_count)')

      // 新表索引
      await run('CREATE INDEX IF NOT EXISTS idx_batch_tasks_status ON batch_tasks (status)')
      await run('CREATE INDEX IF NOT EXISTS idx_batch_tasks_created_at ON batch_tasks (created_at)')
      await run('CREATE INDEX IF NOT EXISTS idx_variable_sets_batch_task_id ON variable_sets (batch_task_id)')
      await run('CREATE INDEX IF NOT EXISTS idx_variable_sets_task_id ON variable_sets (task_id)')
      await run('CREATE INDEX IF NOT EXISTS idx_variable_sets_status ON variable_sets (status)')
      await run('CREATE INDEX IF NOT EXISTS idx_cache_entries_model ON cache_entries (model)')
      await run('CREATE INDEX IF NOT EXISTS idx_cache_entries_media_type ON cache_entries (media_type)')
      await run('CREATE INDEX IF NOT EXISTS idx_cache_entries_accessed_at ON cache_entries (accessed_at)')
      await run('CREATE INDEX IF NOT EXISTS idx_cache_entries_expires_at ON cache_entries (expires_at)')

      // 创建代理账号表（扩展支持多提供商）
      await run(`
        CREATE TABLE IF NOT EXISTS proxy_accounts (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          provider TEXT NOT NULL,
          provider_type TEXT NOT NULL DEFAULT 'api', -- 'api', 'oauth', 'webhook'
          api_key TEXT,
          api_secret TEXT, -- For OAuth
          base_url TEXT,
          region TEXT, -- 地理区域：'us', 'eu', 'asia', 'global'
          priority INTEGER DEFAULT 100, -- 优先级，数字越小优先级越高
          enabled INTEGER DEFAULT 1,
          health_status TEXT DEFAULT 'unknown', -- 'healthy', 'unhealthy', 'unknown'
          last_health_check TEXT,
          performance_metrics TEXT, -- JSON: {avg_response_time, success_rate, total_requests}
          capabilities TEXT, -- JSON: {supported_media_types, supported_models}
          rate_limits TEXT, -- JSON: {requests_per_minute, tokens_per_minute}
          authentication_type TEXT DEFAULT 'api_key', -- 'api_key', 'oauth', 'bearer'
          settings TEXT, -- JSON object
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `)

      await run('CREATE INDEX IF NOT EXISTS idx_proxy_accounts_provider ON proxy_accounts (provider)')
      await run('CREATE INDEX IF NOT EXISTS idx_proxy_accounts_provider_type ON proxy_accounts (provider_type)')
      await run('CREATE INDEX IF NOT EXISTS idx_proxy_accounts_enabled ON proxy_accounts (enabled)')
      await run('CREATE INDEX IF NOT EXISTS idx_proxy_accounts_priority ON proxy_accounts (priority)')
      await run('CREATE INDEX IF NOT EXISTS idx_proxy_accounts_region ON proxy_accounts (region)')

      // 创建模型配置表（扩展支持多代理映射）
      await run(`
        CREATE TABLE IF NOT EXISTS model_configs (
          id TEXT PRIMARY KEY,
          model_name TEXT NOT NULL,
          proxy_account_id TEXT, -- 主代理
          fallback_accounts TEXT, -- JSON array: [{id: 'xxx', priority: 1}, {id: 'yyy', priority: 2}]
          media_type TEXT NOT NULL, -- 'image', 'video', 'text'
          cost REAL DEFAULT 0,
          cost_optimization TEXT, -- JSON: {batch_discount, volume_pricing, time_based_pricing}
          enabled INTEGER DEFAULT 1,
          auto_failover INTEGER DEFAULT 0, -- 是否启用自动故障转移
          performance_stats TEXT, -- JSON: {avg_response_time, success_rate, total_requests}
          routing_preferences TEXT, -- JSON: {primary_priority, cost_weight, performance_weight}
          settings TEXT, -- JSON object
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (proxy_account_id) REFERENCES proxy_accounts(id) ON DELETE SET NULL
        )
      `)

      await run('CREATE INDEX IF NOT EXISTS idx_model_configs_model_name ON model_configs (model_name)')
      await run('CREATE INDEX IF NOT EXISTS idx_model_configs_media_type ON model_configs (media_type)')
      await run('CREATE INDEX IF NOT EXISTS idx_model_configs_proxy_account_id ON model_configs (proxy_account_id)')
      await run('CREATE INDEX IF NOT EXISTS idx_model_configs_enabled ON model_configs (enabled)')
      await run('CREATE INDEX IF NOT EXISTS idx_model_configs_auto_failover ON model_configs (auto_failover)')

      // 创建EvoLink.AI模型模板表
      await run(`
        CREATE TABLE IF NOT EXISTS evolink_model_templates (
          id TEXT PRIMARY KEY,
          model_id TEXT NOT NULL UNIQUE,
          model_name TEXT NOT NULL,
          media_type TEXT NOT NULL, -- 'text', 'image', 'video'
          cost_per_request REAL DEFAULT 0,
          description TEXT,
          enabled INTEGER DEFAULT 1,
          is_builtin INTEGER DEFAULT 0, -- 是否为内置模型
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `)

      await run('CREATE INDEX IF NOT EXISTS idx_evolink_templates_model_id ON evolink_model_templates (model_id)')
      await run('CREATE INDEX IF NOT EXISTS idx_evolink_templates_media_type ON evolink_model_templates (media_type)')
      await run('CREATE INDEX IF NOT EXISTS idx_evolink_templates_enabled ON evolink_model_templates (enabled)')
      await run('CREATE INDEX IF NOT EXISTS idx_evolink_templates_builtin ON evolink_model_templates (is_builtin)')

      // 创建用户自定义EvoLink.AI模型配置表
      await run(`
        CREATE TABLE IF NOT EXISTS user_evolink_models (
          id TEXT PRIMARY KEY,
          template_id TEXT,
          model_id TEXT NOT NULL,
          display_name TEXT NOT NULL,
          media_type TEXT NOT NULL,
          cost_per_request REAL DEFAULT 0,
          proxy_account_id TEXT,
          enabled INTEGER DEFAULT 1,
          tested INTEGER DEFAULT 0, -- 是否已测试
          last_tested_at TEXT,
          test_result TEXT, -- JSON格式存储测试结果
          settings TEXT, -- JSON格式存储额外设置
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (template_id) REFERENCES evolink_model_templates(id) ON DELETE SET NULL,
          FOREIGN KEY (proxy_account_id) REFERENCES proxy_accounts(id) ON DELETE SET NULL
        )
      `)

      await run('CREATE INDEX IF NOT EXISTS idx_user_evolink_model_id ON user_evolink_models (model_id)')
      await run('CREATE INDEX IF NOT EXISTS idx_user_evolink_proxy_account_id ON user_evolink_models (proxy_account_id)')
      await run('CREATE INDEX IF NOT EXISTS idx_user_evolink_media_type ON user_evolink_models (media_type)')
      await run('CREATE INDEX IF NOT EXISTS idx_user_evolink_enabled ON user_evolink_models (enabled)')
      await run('CREATE INDEX IF NOT EXISTS idx_user_evolink_tested ON user_evolink_models (tested)')

      // 创建路由规则配置表
      await run(`
        CREATE TABLE IF NOT EXISTS routing_rules (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          priority INTEGER DEFAULT 100,
          enabled INTEGER DEFAULT 1,
          conditions TEXT,
          target_proxy_account_id TEXT,
          action TEXT DEFAULT 'route',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `)

      await run('CREATE INDEX IF NOT EXISTS idx_routing_rules_target_proxy ON routing_rules (target_proxy_account_id)')
      await run('CREATE INDEX IF NOT EXISTS idx_routing_rules_priority ON routing_rules (priority)')
      await run('CREATE INDEX IF NOT EXISTS idx_routing_rules_enabled ON routing_rules (enabled)')

      // 创建成本阈值配置表
      await run(`
        CREATE TABLE IF NOT EXISTS cost_thresholds (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          threshold_type TEXT DEFAULT 'daily',
          threshold_value REAL NOT NULL,
          currency TEXT DEFAULT 'USD',
          period TEXT DEFAULT 'daily',
          enabled INTEGER DEFAULT 1,
          alert_email TEXT,
          alert_webhook TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `)

      await run('CREATE INDEX IF NOT EXISTS idx_cost_thresholds_type ON cost_thresholds (threshold_type)')
      await run('CREATE INDEX IF NOT EXISTS idx_cost_thresholds_enabled ON cost_thresholds (enabled)')
      await run('CREATE INDEX IF NOT EXISTS idx_cost_thresholds_value ON cost_thresholds (threshold_value)')

      // 创建API端点配置表
      await run(`
        CREATE TABLE IF NOT EXISTS api_endpoints (
          id TEXT PRIMARY KEY,
          provider TEXT NOT NULL, -- 'evolink', 'openai', etc.
          media_type TEXT NOT NULL, -- 'text', 'image', 'video'
          endpoint_url TEXT NOT NULL,
          description TEXT,
          enabled INTEGER DEFAULT 1,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `)

      await run('CREATE INDEX IF NOT EXISTS idx_api_endpoints_provider ON api_endpoints (provider)')
      await run('CREATE INDEX IF NOT EXISTS idx_api_endpoints_media_type ON api_endpoints (media_type)')
      await run('CREATE INDEX IF NOT EXISTS idx_api_endpoints_enabled ON api_endpoints (enabled)')

      console.log('Database initialized successfully')
    } catch (error) {
      console.error('Database initialization failed:', error)
      throw error
    }
  }

  private async ensureReady(): Promise<void> {
    await this.ready
  }

  // 任务相关方法
  async createTask(task: any): Promise<any> {
    await this.ensureReady()
    const run = promisify(this.db.run.bind(this.db))

    const stmt = `
      INSERT INTO tasks (
        id, type, prompt, status, progress, results, error, cost, model,
        parameters, batch_id, parent_task_id, variable_values, is_batch_root, batch_index,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `

    await run(stmt, [
      task.id,
      task.type,
      task.prompt,
      task.status,
      task.progress || 0,
      JSON.stringify(task.results || []),
      task.error || null,
      task.cost || 0,
      task.model,
      JSON.stringify(task.parameters || {}),
      task.batchId || null,
      task.parentTaskId || null,
      JSON.stringify(task.variableValues || {}),
      task.isBatchRoot || false,
      task.batchIndex || 0,
      task.createdAt,
      task.updatedAt
    ])

    return task
  }

  async getTask(id: string): Promise<any> {
    await this.ensureReady()
    const get = promisify(this.db.get.bind(this.db))

    const row = await get('SELECT * FROM tasks WHERE id = ?', [id])
    if (!row) return null

    return {
      id: row.id,
      type: row.type,
      prompt: row.prompt,
      status: row.status,
      progress: row.progress,
      results: JSON.parse(row.results || '[]'),
      error: row.error,
      cost: row.cost,
      model: row.model,
      parameters: JSON.parse(row.parameters || '{}'),
      batchId: row.batch_id,
      parentTaskId: row.parent_task_id,
      variableValues: JSON.parse(row.variable_values || '{}'),
      isBatchRoot: row.is_batch_root,
      batchIndex: row.batch_index,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }

  async getTasks(params: any = {}): Promise<{ items: any[], total: number }> {
    await this.ensureReady()
    const all = promisify(this.db.all.bind(this.db))

    let whereClause = ''
    let queryParams: any[] = []

    // 构建查询条件
    if (params.status) {
      whereClause += ' WHERE status = ?'
      queryParams.push(params.status)
    }

    if (params.type) {
      whereClause += whereClause ? ' AND type = ?' : ' WHERE type = ?'
      queryParams.push(params.type)
    }

    if (params.batchId) {
      whereClause += whereClause ? ' AND batch_id = ?' : ' WHERE batch_id = ?'
      queryParams.push(params.batchId)
    }

    if (params.parentTaskId) {
      whereClause += whereClause ? ' AND parent_task_id = ?' : ' WHERE parent_task_id = ?'
      queryParams.push(params.parentTaskId)
    }

    if (params.isBatchRoot !== undefined) {
      whereClause += whereClause ? ' AND is_batch_root = ?' : ' WHERE is_batch_root = ?'
      queryParams.push(params.isBatchRoot)
    }

    // 获取总数
    const countQuery = `SELECT COUNT(*) as total FROM tasks${whereClause}`
    const countResult = await all(countQuery, queryParams)
    const total = countResult[0].total

    // 添加排序和分页
    let sortClause = ' ORDER BY created_at DESC'
    if (params.sortBy) {
      const order = params.sortOrder || 'DESC'
      // 映射前端列名到数据库列名
      const dbColumn = params.sortBy === 'createdAt' ? 'created_at' : params.sortBy
      sortClause = ` ORDER BY ${dbColumn} ${order}`
    }

    const limitClause = params.pageSize ? ` LIMIT ? OFFSET ?` : ''
    if (params.pageSize) {
      const page = params.page || 1
      const offset = (page - 1) * params.pageSize
      queryParams.push(params.pageSize, offset)
    }

    const query = `SELECT * FROM tasks${whereClause}${sortClause}${limitClause}`
    const rows = await all(query, queryParams)

    const items = rows.map(row => ({
      id: row.id,
      type: row.type,
      prompt: row.prompt,
      status: row.status,
      progress: row.progress,
      results: JSON.parse(row.results || '[]'),
      error: row.error,
      cost: row.cost,
      model: row.model,
      parameters: JSON.parse(row.parameters || '{}'),
      batchId: row.batch_id,
      parentTaskId: row.parent_task_id,
      variableValues: JSON.parse(row.variable_values || '{}'),
      isBatchRoot: row.is_batch_root,
      batchIndex: row.batch_index,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))

    return { items, total }
  }

  async updateTask(id: string, updates: any): Promise<any> {
    await this.ensureReady()
    const run = promisify(this.db.run.bind(this.db))

    const fields = []
    const values = []

    Object.entries(updates).forEach(([key, value]) => {
      if (key === 'results') {
        fields.push('results = ?')
        values.push(JSON.stringify(value))
      } else if (key === 'parameters') {
        fields.push('parameters = ?')
        values.push(JSON.stringify(value))
      } else if (key === 'createdAt' || key === 'updatedAt') {
        fields.push(`${key.replace(/([A-Z])/g, '_$1').toLowerCase()} = ?`)
        values.push(value)
      } else if (key === 'batchId') {
        fields.push('batch_id = ?')
        values.push(value)
      } else if (key === 'parentTaskId') {
        fields.push('parent_task_id = ?')
        values.push(value)
      } else if (key === 'variableValues') {
        fields.push('variable_values = ?')
        values.push(JSON.stringify(value))
      } else if (key === 'isBatchRoot') {
        fields.push('is_batch_root = ?')
        values.push(value)
      } else if (key === 'batchIndex') {
        fields.push('batch_index = ?')
        values.push(value)
      } else if (key === 'error') {
        fields.push('error = ?')
        values.push(value)
      } else if (key === 'cost') {
        fields.push('cost = ?')
        values.push(value)
      } else if (key === 'model') {
        fields.push('model = ?')
        values.push(value)
      } else if (key === 'prompt') {
        fields.push('prompt = ?')
        values.push(value)
      } else if (key === 'type') {
        fields.push('type = ?')
        values.push(value)
      } else if (key === 'progress') {
        fields.push('progress = ?')
        values.push(value)
      } else if (key === 'status') {
        fields.push('status = ?')
        values.push(value)
      } else {
        // 默认处理：转换为 snake_case
        fields.push(`${key.replace(/([A-Z])/g, '_$1').toLowerCase()} = ?`)
        values.push(value)
      }
    })

    if (fields.length === 0) return null

    fields.push('updated_at = ?')
    values.push(new Date().toISOString())
    values.push(id)

    const stmt = `UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`
    await run(stmt, values)

    return this.getTask(id)
  }

  async deleteTask(id: string): Promise<void> {
    await this.ensureReady()
    const run = promisify(this.db.run.bind(this.db))
    await run('DELETE FROM tasks WHERE id = ?', [id])
  }

  // 素材相关方法（实现类似任务的方法）
  async createMaterial(material: any): Promise<any> {
    await this.ensureReady()
    const run = promisify(this.db.run.bind(this.db))

    const stmt = `
      INSERT INTO materials (
        id, name, type, url, thumbnail_url, size, format, width, height,
        duration, prompt, model, tags, category, description, metadata,
        created_at, updated_at, task_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `

    await run(stmt, [
      material.id,
      material.name,
      material.type,
      material.url,
      material.thumbnailUrl || null,
      material.size,
      material.format,
      material.width || null,
      material.height || null,
      material.duration || null,
      material.prompt || null,
      material.model || null,
      JSON.stringify(material.tags || []),
      material.category || null,
      material.description || null,
      JSON.stringify(material.metadata || {}),
      material.createdAt,
      material.updatedAt,
      material.taskId || null
    ])

    return material
  }

  async getMaterial(id: string): Promise<any> {
    await this.ensureReady()
    const get = promisify(this.db.get.bind(this.db))

    const row = await get('SELECT * FROM materials WHERE id = ?', [id])
    if (!row) return null

    return {
      id: row.id,
      name: row.name,
      type: row.type,
      url: row.url,
      thumbnailUrl: row.thumbnail_url,
      size: row.size,
      format: row.format,
      width: row.width,
      height: row.height,
      duration: row.duration,
      prompt: row.prompt,
      model: row.model,
      tags: JSON.parse(row.tags || '[]'),
      category: row.category,
      description: row.description,
      metadata: JSON.parse(row.metadata || '{}'),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      taskId: row.task_id
    }
  }

  async getMaterials(params: any = {}): Promise<{ items: any[], total: number }> {
    await this.ensureReady()
    const all = promisify(this.db.all.bind(this.db))

    let whereClause = ''
    let queryParams: any[] = []

    if (params.type) {
      whereClause += ' WHERE type = ?'
      queryParams.push(params.type)
    }

    if (params.category) {
      whereClause += whereClause ? ' AND category = ?' : ' WHERE category = ?'
      queryParams.push(params.category)
    }

    if (params.search) {
      whereClause += whereClause ? ' AND (name LIKE ? OR description LIKE ?)' : ' WHERE (name LIKE ? OR description LIKE ?)'
      const searchTerm = `%${params.search}%`
      queryParams.push(searchTerm, searchTerm)
    }

    // 获取总数
    const countQuery = `SELECT COUNT(*) as total FROM materials${whereClause}`
    const countResult = await all(countQuery, queryParams)
    const total = countResult[0].total

    // 添加排序和分页
    let sortClause = ' ORDER BY created_at DESC'
    if (params.sortBy) {
      const order = params.sortOrder || 'DESC'
      // 映射前端列名到数据库列名
      const dbColumn = params.sortBy === 'createdAt' ? 'created_at' : params.sortBy
      sortClause = ` ORDER BY ${dbColumn} ${order}`
    }

    const limitClause = params.pageSize ? ` LIMIT ? OFFSET ?` : ''
    if (params.pageSize) {
      const page = params.page || 1
      const offset = (page - 1) * params.pageSize
      queryParams.push(params.pageSize, offset)
    }

    const query = `SELECT * FROM materials${whereClause}${sortClause}${limitClause}`
    const rows = await all(query, queryParams)

    const items = rows.map(row => ({
      id: row.id,
      name: row.name,
      type: row.type,
      url: row.url,
      thumbnailUrl: row.thumbnail_url,
      size: row.size,
      format: row.format,
      width: row.width,
      height: row.height,
      duration: row.duration,
      prompt: row.prompt,
      model: row.model,
      tags: JSON.parse(row.tags || '[]'),
      category: row.category,
      description: row.description,
      metadata: JSON.parse(row.metadata || '{}'),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      taskId: row.task_id
    }))

    return { items, total }
  }

  async updateMaterial(id: string, updates: any): Promise<any> {
    await this.ensureReady()
    const run = promisify(this.db.run.bind(this.db))

    const fields = []
    const values = []

    Object.entries(updates).forEach(([key, value]) => {
      if (key === 'tags') {
        fields.push('tags = ?')
        values.push(JSON.stringify(value))
      } else if (key === 'metadata') {
        fields.push('metadata = ?')
        values.push(JSON.stringify(value))
      } else {
        fields.push(`${key.replace(/([A-Z])/g, '_$1').toLowerCase()} = ?`)
        values.push(value)
      }
    })

    if (fields.length === 0) return null

    fields.push('updated_at = ?')
    values.push(new Date().toISOString())
    values.push(id)

    const stmt = `UPDATE materials SET ${fields.join(', ')} WHERE id = ?`
    await run(stmt, values)

    return this.getMaterial(id)
  }

  async deleteMaterial(id: string): Promise<void> {
    await this.ensureReady()
    const run = promisify(this.db.run.bind(this.db))
    await run('DELETE FROM materials WHERE id = ?', [id])
  }

  // 模板相关方法
  async createTemplate(template: any): Promise<any> {
    await this.ensureReady()
    const run = promisify(this.db.run.bind(this.db))

    const stmt = `
      INSERT INTO templates (
        id, name, description, template, variables, media_type, model,
        usage_count, total_cost, cache_hit_rate, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `

    await run(stmt, [
      template.id,
      template.name,
      template.description || null,
      template.template,
      JSON.stringify(template.variables || []),
      template.mediaType,
      template.model,
      template.usageCount || 0,
      template.totalCost || 0,
      template.cacheHitRate || 0,
      template.createdAt,
      template.updatedAt
    ])

    return template
  }

  async getTemplate(id: string): Promise<any> {
    await this.ensureReady()
    const get = promisify(this.db.get.bind(this.db))

    const row = await get('SELECT * FROM templates WHERE id = ?', [id])
    if (!row) return null

    return {
      id: row.id,
      name: row.name,
      description: row.description,
      template: row.template,
      variables: JSON.parse(row.variables || '[]'),
      mediaType: row.media_type,
      model: row.model,
      usageCount: row.usage_count,
      totalCost: row.total_cost,
      cacheHitRate: row.cache_hit_rate,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }

  async getTemplates(params: any = {}): Promise<{ items: any[], total: number }> {
    await this.ensureReady()
    const all = promisify(this.db.all.bind(this.db))

    let whereClause = ''
    let queryParams: any[] = []

    if (params.mediaType) {
      whereClause += ' WHERE media_type = ?'
      queryParams.push(params.mediaType)
    }

    if (params.search) {
      whereClause += whereClause ? ' AND (name LIKE ? OR description LIKE ?)' : ' WHERE (name LIKE ? OR description LIKE ?)'
      const searchTerm = `%${params.search}%`
      queryParams.push(searchTerm, searchTerm)
    }

    // 获取总数
    const countQuery = `SELECT COUNT(*) as total FROM templates${whereClause}`
    const countResult = await all(countQuery, queryParams)
    const total = countResult[0].total

    // 添加排序和分页
    const sortClause = ' ORDER BY usage_count DESC, created_at DESC'
    const limitClause = params.pageSize ? ` LIMIT ? OFFSET ?` : ''

    if (params.pageSize) {
      const page = params.page || 1
      const offset = (page - 1) * params.pageSize
      queryParams.push(params.pageSize, offset)
    }

    const query = `SELECT * FROM templates${whereClause}${sortClause}${limitClause}`
    const rows = await all(query, queryParams)

    const items = rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      template: row.template,
      variables: JSON.parse(row.variables || '[]'),
      mediaType: row.media_type,
      model: row.model,
      usageCount: row.usage_count,
      totalCost: row.total_cost,
      cacheHitRate: row.cache_hit_rate,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))

    return { items, total }
  }

  async updateTemplate(id: string, updates: any): Promise<any> {
    await this.ensureReady()
    const run = promisify(this.db.run.bind(this.db))

    const fields = []
    const values = []

    Object.entries(updates).forEach(([key, value]) => {
      if (key === 'variables') {
        fields.push('variables = ?')
        values.push(JSON.stringify(value))
      } else {
        fields.push(`${key.replace(/([A-Z])/g, '_$1').toLowerCase()} = ?`)
        values.push(value)
      }
    })

    if (fields.length === 0) return null

    fields.push('updated_at = ?')
    values.push(new Date().toISOString())
    values.push(id)

    const stmt = `UPDATE templates SET ${fields.join(', ')} WHERE id = ?`
    await run(stmt, values)

    return this.getTemplate(id)
  }

  async deleteTemplate(id: string): Promise<void> {
    await this.ensureReady()
    const run = promisify(this.db.run.bind(this.db))
    await run('DELETE FROM templates WHERE id = ?', [id])
  }

  // 统计相关
  async getAnalytics(params: any = {}): Promise<any> {
    await this.ensureReady()
    const all = promisify(this.db.all.bind(this.db))

    // 基础统计
    const taskStats = await all(`
      SELECT
        COUNT(*) as totalGenerations,
        SUM(cost) as totalCost,
        AVG(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successRate
      FROM tasks
    `)

    const modelDistribution = await all(`
      SELECT model, COUNT(*) as count, SUM(cost) as cost
      FROM tasks
      GROUP BY model
    `)

    const dailyStats = await all(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as generations,
        SUM(cost) as cost
      FROM tasks
      WHERE created_at >= date('now', '-30 days')
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `)

    return {
      totalCost: taskStats[0].totalCost || 0,
      totalGenerations: taskStats[0].totalGenerations || 0,
      successRate: (taskStats[0].successRate || 0) * 100,
      modelDistribution: modelDistribution.reduce((acc, row) => {
        acc[row.model] = row.count
        return acc
      }, {}),
      dailyStats: dailyStats.map(row => ({
        date: row.date,
        generations: row.generations,
        cost: row.cost
      }))
    }
  }

  // 批量任务相关方法
  async createBatchTask(batchTask: any): Promise<any> {
    await this.ensureReady()
    const run = promisify(this.db.run.bind(this.db))

    const stmt = `
      INSERT INTO batch_tasks (
        id, name, description, base_prompt, media_type, model, base_parameters,
        variable_definitions, total_subtasks, completed_subtasks, failed_subtasks,
        total_cost, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `

    await run(stmt, [
      batchTask.id,
      batchTask.name,
      batchTask.description || null,
      batchTask.basePrompt,
      batchTask.mediaType,
      batchTask.model,
      JSON.stringify(batchTask.baseParameters || {}),
      JSON.stringify(batchTask.variableDefinitions || {}),
      batchTask.totalSubtasks || 0,
      batchTask.completedSubtasks || 0,
      batchTask.failedSubtasks || 0,
      batchTask.totalCost || 0,
      batchTask.status,
      batchTask.createdAt,
      batchTask.updatedAt
    ])

    return batchTask
  }

  async getBatchTask(id: string): Promise<any> {
    await this.ensureReady()
    const get = promisify(this.db.get.bind(this.db))

    const row = await get('SELECT * FROM batch_tasks WHERE id = ?', [id])
    if (!row) return null

    return {
      id: row.id,
      name: row.name,
      description: row.description,
      basePrompt: row.base_prompt,
      mediaType: row.media_type,
      model: row.model,
      baseParameters: JSON.parse(row.base_parameters || '{}'),
      variableDefinitions: JSON.parse(row.variable_definitions || '{}'),
      totalSubtasks: row.total_subtasks,
      completedSubtasks: row.completed_subtasks,
      failedSubtasks: row.failed_subtasks,
      totalCost: row.total_cost,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }

  async getBatchTasks(params: any = {}): Promise<{ items: any[], total: number }> {
    await this.ensureReady()
    const all = promisify(this.db.all.bind(this.db))

    let whereClause = ''
    let queryParams: any[] = []

    if (params.status) {
      whereClause += ' WHERE status = ?'
      queryParams.push(params.status)
    }

    if (params.mediaType) {
      whereClause += whereClause ? ' AND media_type = ?' : ' WHERE media_type = ?'
      queryParams.push(params.mediaType)
    }

    // 获取总数
    const countQuery = `SELECT COUNT(*) as total FROM batch_tasks${whereClause}`
    const countResult = await all(countQuery, queryParams)
    const total = countResult[0].total

    // 排序和分页
    const sortClause = ' ORDER BY created_at DESC'
    const limitClause = params.pageSize ? ` LIMIT ? OFFSET ?` : ''

    if (params.pageSize) {
      const page = params.page || 1
      const offset = (page - 1) * params.pageSize
      queryParams.push(params.pageSize, offset)
    }

    const query = `SELECT * FROM batch_tasks${whereClause}${sortClause}${limitClause}`
    const rows = await all(query, queryParams)

    const items = rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      basePrompt: row.base_prompt,
      mediaType: row.media_type,
      model: row.model,
      baseParameters: JSON.parse(row.base_parameters || '{}'),
      variableDefinitions: JSON.parse(row.variable_definitions || '{}'),
      totalSubtasks: row.total_subtasks,
      completedSubtasks: row.completed_subtasks,
      failedSubtasks: row.failed_subtasks,
      totalCost: row.total_cost,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))

    return { items, total }
  }

  async updateBatchTask(id: string, updates: any): Promise<any> {
    await this.ensureReady()
    const run = promisify(this.db.run.bind(this.db))

    const fields = []
    const values = []

    Object.entries(updates).forEach(([key, value]) => {
      if (key === 'baseParameters' || key === 'variableDefinitions') {
        const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase()
        fields.push(`${dbField} = ?`)
        values.push(JSON.stringify(value))
      } else if (key === 'createdAt' || key === 'updatedAt') {
        fields.push(`${key.replace(/([A-Z])/g, '_$1').toLowerCase()} = ?`)
        values.push(value)
      } else {
        fields.push(`${key.replace(/([A-Z])/g, '_$1').toLowerCase()} = ?`)
        values.push(value)
      }
    })

    if (fields.length === 0) return null

    fields.push('updated_at = ?')
    values.push(new Date().toISOString())
    values.push(id)

    const stmt = `UPDATE batch_tasks SET ${fields.join(', ')} WHERE id = ?`
    await run(stmt, values)

    return this.getBatchTask(id)
  }

  async deleteBatchTask(id: string): Promise<void> {
    await this.ensureReady()
    const run = promisify(this.db.run.bind(this.db))
    await run('DELETE FROM batch_tasks WHERE id = ?', [id])
  }

  async getBatchSubTasks(batchId: string): Promise<any[]> {
    await this.ensureReady()
    const all = promisify(this.db.all.bind(this.db))

    const rows = await all('SELECT * FROM tasks WHERE batch_id = ? ORDER BY batch_index', [batchId])

    return rows.map(row => ({
      id: row.id,
      type: row.type,
      prompt: row.prompt,
      status: row.status,
      progress: row.progress,
      results: JSON.parse(row.results || '[]'),
      error: row.error,
      cost: row.cost,
      model: row.model,
      parameters: JSON.parse(row.parameters || '{}'),
      batchId: row.batch_id,
      parentTaskId: row.parent_task_id,
      variableValues: JSON.parse(row.variable_values || '{}'),
      isBatchRoot: row.is_batch_root,
      batchIndex: row.batch_index,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))
  }

  // 变量相关方法
  async createVariableSet(variableSet: any): Promise<any> {
    await this.ensureReady()
    const run = promisify(this.db.run.bind(this.db))

    const stmt = `
      INSERT INTO variable_sets (
        id, batch_task_id, task_id, variable_values, expanded_prompt,
        cost_estimate, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `

    await run(stmt, [
      variableSet.id,
      variableSet.batchTaskId,
      variableSet.taskId || null,
      JSON.stringify(variableSet.variableValues),
      variableSet.expandedPrompt,
      variableSet.costEstimate || 0,
      variableSet.status,
      variableSet.createdAt
    ])

    return variableSet
  }

  async getVariableSet(id: string): Promise<any> {
    await this.ensureReady()
    const get = promisify(this.db.get.bind(this.db))

    const row = await get('SELECT * FROM variable_sets WHERE id = ?', [id])
    if (!row) return null

    return {
      id: row.id,
      batchTaskId: row.batch_task_id,
      taskId: row.task_id,
      variableValues: JSON.parse(row.variable_values),
      expandedPrompt: row.expanded_prompt,
      costEstimate: row.cost_estimate,
      status: row.status,
      createdAt: row.created_at
    }
  }

  async getVariableSets(params: any = {}): Promise<{ items: any[], total: number }> {
    await this.ensureReady()
    const all = promisify(this.db.all.bind(this.db))

    let whereClause = ''
    let queryParams: any[] = []

    if (params.batchTaskId) {
      whereClause += ' WHERE batch_task_id = ?'
      queryParams.push(params.batchTaskId)
    }

    if (params.status) {
      whereClause += whereClause ? ' AND status = ?' : ' WHERE status = ?'
      queryParams.push(params.status)
    }

    // 获取总数
    const countQuery = `SELECT COUNT(*) as total FROM variable_sets${whereClause}`
    const countResult = await all(countQuery, queryParams)
    const total = countResult[0].total

    // 排序和分页
    const sortClause = ' ORDER BY created_at ASC'
    const limitClause = params.pageSize ? ` LIMIT ? OFFSET ?` : ''

    if (params.pageSize) {
      const page = params.page || 1
      const offset = (page - 1) * params.pageSize
      queryParams.push(params.pageSize, offset)
    }

    const query = `SELECT * FROM variable_sets${whereClause}${sortClause}${limitClause}`
    const rows = await all(query, queryParams)

    const items = rows.map(row => ({
      id: row.id,
      batchTaskId: row.batch_task_id,
      taskId: row.task_id,
      variableValues: JSON.parse(row.variable_values),
      expandedPrompt: row.expanded_prompt,
      costEstimate: row.cost_estimate,
      status: row.status,
      createdAt: row.created_at
    }))

    return { items, total }
  }

  async updateVariableSet(id: string, updates: any): Promise<any> {
    await this.ensureReady()
    const run = promisify(this.db.run.bind(this.db))

    const fields = []
    const values = []

    Object.entries(updates).forEach(([key, value]) => {
      if (key === 'variableValues') {
        fields.push('variable_values = ?')
        values.push(JSON.stringify(value))
      } else if (key === 'costEstimate') {
        fields.push('cost_estimate = ?')
        values.push(value)
      } else {
        fields.push(`${key.replace(/([A-Z])/g, '_$1').toLowerCase()} = ?`)
        values.push(value)
      }
    })

    if (fields.length === 0) return null

    values.push(id)

    const stmt = `UPDATE variable_sets SET ${fields.join(', ')} WHERE id = ?`
    await run(stmt, values)

    return this.getVariableSet(id)
  }

  async deleteVariableSet(id: string): Promise<void> {
    await this.ensureReady()
    const run = promisify(this.db.run.bind(this.db))
    await run('DELETE FROM variable_sets WHERE id = ?', [id])
  }

  // 缓存相关方法
  async createCacheEntry(cacheEntry: any): Promise<any> {
    await this.ensureReady()
    const run = promisify(this.db.run.bind(this.db))

    const stmt = `
      INSERT INTO cache_entries (
        cache_key, prompt, model, parameters, result, cost, media_type,
        hit_count, created_at, accessed_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `

    await run(stmt, [
      cacheEntry.cacheKey,
      cacheEntry.prompt,
      cacheEntry.model,
      JSON.stringify(cacheEntry.parameters || {}),
      JSON.stringify(cacheEntry.result),
      cacheEntry.cost || 0,
      cacheEntry.mediaType,
      cacheEntry.hitCount || 0,
      cacheEntry.createdAt,
      cacheEntry.accessedAt,
      cacheEntry.expiresAt || null
    ])

    return cacheEntry
  }

  async getCacheEntry(key: string): Promise<any> {
    await this.ensureReady()
    const get = promisify(this.db.get.bind(this.db))

    const row = await get('SELECT * FROM cache_entries WHERE cache_key = ?', [key])
    if (!row) return null

    // 更新访问时间和计数
    const run = promisify(this.db.run.bind(this.db))
    await run(
      'UPDATE cache_entries SET hit_count = hit_count + 1, accessed_at = ? WHERE cache_key = ?',
      [new Date().toISOString(), key]
    )

    return {
      cacheKey: row.cache_key,
      prompt: row.prompt,
      model: row.model,
      parameters: JSON.parse(row.parameters || '{}'),
      result: JSON.parse(row.result),
      cost: row.cost,
      mediaType: row.media_type,
      hitCount: row.hit_count + 1,
      createdAt: row.created_at,
      accessedAt: new Date().toISOString(),
      expiresAt: row.expires_at
    }
  }

  async updateCacheEntry(key: string, updates: any): Promise<any> {
    await this.ensureReady()
    const run = promisify(this.db.run.bind(this.db))

    const fields = []
    const values = []

    Object.entries(updates).forEach(([key, value]) => {
      if (key === 'cacheKey') {
        fields.push('cache_key = ?')
      } else if (key === 'parameters' || key === 'result') {
        fields.push(`${key} = ?`)
        values.push(JSON.stringify(value))
      } else {
        fields.push(`${key.replace(/([A-Z])/g, '_$1').toLowerCase()} = ?`)
        values.push(value)
      }
    })

    if (fields.length === 0) return null

    values.push(key)

    const stmt = `UPDATE cache_entries SET ${fields.join(', ')} WHERE cache_key = ?`
    await run(stmt, values)

    return this.getCacheEntry(key)
  }

  async deleteCacheEntry(key: string): Promise<void> {
    await this.ensureReady()
    const run = promisify(this.db.run.bind(this.db))
    await run('DELETE FROM cache_entries WHERE cache_key = ?', [key])
  }

  async clearExpiredCache(): Promise<number> {
    await this.ensureReady()
    const run = promisify(this.db.run.bind(this.db))

    const result = await run(
      'DELETE FROM cache_entries WHERE expires_at IS NOT NULL AND expires_at < ?',
      [new Date().toISOString()]
    )

    return result.changes || 0
  }

  async getCacheStats(): Promise<any> {
    await this.ensureReady()
    const all = promisify(this.db.all.bind(this.db))

    const totalEntries = await all('SELECT COUNT(*) as count FROM cache_entries')
    const expiredEntries = await all(
      'SELECT COUNT(*) as count FROM cache_entries WHERE expires_at IS NOT NULL AND expires_at < ?',
      [new Date().toISOString()]
    )
    const totalHits = await all('SELECT SUM(hit_count) as hits FROM cache_entries')
    const modelDistribution = await all(
      'SELECT model, COUNT(*) as count FROM cache_entries GROUP BY model'
    )

    return {
      totalEntries: totalEntries[0].count,
      expiredEntries: expiredEntries[0].count,
      totalHits: totalEntries[0].hits || 0,
      modelDistribution: modelDistribution.reduce((acc, row) => {
        acc[row.model] = row.count
        return acc
      }, {})
    }
  }

  
  
  
  
  // 代理账号相关方法
  async createProxyAccount(account: any): Promise<any> {
    await this.ensureReady()
    const run = promisify(this.db.run.bind(this.db))

    try {
      // 验证必填字段
      if (!account.name || !account.provider || !account.apiKey) {
        throw new Error('Missing required fields: name, provider, apiKey')
      }

      const stmt = `
        INSERT INTO proxy_accounts (
          id, name, provider, api_key, base_url, enabled, settings,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `

      const now = new Date().toISOString()
      const id = account.id || this.generateId()

      // 安全的JSON序列化
      let settingsStr
      try {
        settingsStr = JSON.stringify(account.settings || {})
      } catch (jsonError) {
        console.error('Failed to serialize settings:', jsonError)
        settingsStr = '{}'
      }

      // 确保布尔值转换正确
      const enabledValue = typeof account.enabled === 'boolean'
        ? (account.enabled ? 1 : 0)
        : (account.enabled === 1 ? 1 : 0)

      console.log('Creating proxy account:', {
        id,
        name: account.name,
        provider: account.provider,
        hasApiKey: !!account.apiKey,
        baseUrl: account.baseUrl,
        enabled: enabledValue
      })

      await run(stmt, [
        id,
        account.name?.trim(),
        account.provider?.trim(),
        account.apiKey?.trim(),
        account.baseUrl?.trim() || null,
        enabledValue,
        settingsStr,
        now,
        now
      ])

      console.log('Proxy account created successfully:', id)
      return this.getProxyAccount(id)

    } catch (error) {
      console.error('Error creating proxy account:', {
        error: error.message,
        stack: error.stack,
        account: {
          name: account.name,
          provider: account.provider,
          hasApiKey: !!account.apiKey,
          baseUrl: account.baseUrl,
          enabled: account.enabled
        }
      })
      throw new Error(`Failed to create proxy account: ${error.message}`)
    }
  }

  async getProxyAccount(id: string): Promise<any> {
    await this.ensureReady()
    const get = promisify(this.db.get.bind(this.db))
    const row = await get('SELECT * FROM proxy_accounts WHERE id = ?', [id])
    if (!row) return null

    return {
      id: row.id,
      name: row.name,
      provider: row.provider,
      apiKey: row.api_key,
      baseUrl: row.base_url,
      enabled: row.enabled === 1,
      settings: JSON.parse(row.settings || '{}'),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }

  async getProxyAccounts(params?: any): Promise<any[]> {
    await this.ensureReady()
    const all = promisify(this.db.all.bind(this.db))

    let query = 'SELECT * FROM proxy_accounts'
    const values: any[] = []

    if (params?.enabled !== undefined) {
      query += ' WHERE enabled = ?'
      values.push(params.enabled ? 1 : 0)
    }

    if (params?.provider) {
      query += (values.length > 0 ? ' AND' : ' WHERE') + ' provider = ?'
      values.push(params.provider)
    }

    query += ' ORDER BY created_at DESC'

    const rows = await all(query, values)
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      provider: row.provider,
      apiKey: row.api_key,
      baseUrl: row.base_url,
      enabled: row.enabled === 1,
      settings: JSON.parse(row.settings || '{}'),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))
  }

  async updateProxyAccount(id: string, updates: any): Promise<any> {
    await this.ensureReady()

    return new Promise(async (resolve, reject) => {
      try {
        if (!id) {
          throw new Error('Account ID is required for update')
        }

        const fields: string[] = []
        const values: any[] = []

        console.log('Updating proxy account:', { id, updates })

        Object.entries(updates).forEach(([key, value]) => {
          if (key === 'id') return

          console.log(`Processing field: ${key} = ${JSON.stringify(value)}`)

          if (key === 'name') {
            if (value !== undefined && value !== null) {
              fields.push('name = ?')
              values.push(value?.trim())
            }
          } else if (key === 'provider') {
            if (value !== undefined && value !== null && value.trim() !== '') {
              fields.push('provider = ?')
              values.push(value?.trim())
            }
          } else if (key === 'apiKey') {
            if (value !== undefined && value !== null) {
              fields.push('api_key = ?')
              values.push(value?.trim())
            }
          } else if (key === 'baseUrl') {
            fields.push('base_url = ?')
            values.push(value?.trim() || null)
          } else if (key === 'enabled') {
            // 更安全的布尔值处理
            const enabledValue = typeof value === 'boolean'
              ? (value ? 1 : 0)
              : (value === 1 ? 1 : 0)
            fields.push('enabled = ?')
            values.push(enabledValue)
          } else if (key === 'settings') {
            // 安全的JSON序列化
            let settingsStr
            try {
              settingsStr = JSON.stringify(value || {})
            } catch (jsonError) {
              console.error('Failed to serialize settings:', jsonError)
              settingsStr = '{}'
            }
            fields.push('settings = ?')
            values.push(settingsStr)
          }
        })

        if (fields.length === 0) {
          throw new Error('No valid fields to update')
        }

        fields.push('updated_at = ?')
        values.push(new Date().toISOString())
        values.push(id)

        const stmt = `UPDATE proxy_accounts SET ${fields.join(', ')} WHERE id = ?`

        console.log('Executing SQL:', stmt)
        console.log('Parameters:', values)

        // 在外部保存this引用，以便在回调中使用
        const self = this

        this.db.run(stmt, values, function(error) {
          if (error) {
            console.error('SQL execution error:', error)
            reject(new Error(`Failed to update proxy account: ${error.message}`))
            return
          }

          // 在回调函数中，this指向语句对象，包含changes属性
          const changes = this.changes || 0
          console.log('SQL execution result:', { changes, lastID: this.lastID })

          if (changes === 0) {
            reject(new Error(`Proxy account not found: ${id}`))
            return
          }

          console.log('Proxy account updated successfully:', id, `Changes: ${changes}`)

          // 异步获取更新后的记录 - 使用外部保存的self引用
          self.getProxyAccount(id).then(resolve).catch(reject)
        })

      } catch (error) {
        console.error('Error updating proxy account:', {
          error: error.message,
          stack: error.stack,
          id,
          updates
        })
        reject(new Error(`Failed to update proxy account: ${error.message}`))
      }
    })
  }

  async deleteProxyAccount(id: string): Promise<boolean> {
    await this.ensureReady()

    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM proxy_accounts WHERE id = ?', [id], function(error) {
        if (error) {
          console.error('SQL execution error:', error)
          reject(error)
          return
        }

        // 在回调函数中，this指向语句对象，包含changes属性
        const changes = this.changes || 0
        console.log('Delete operation result:', { changes })
        resolve(changes > 0)
      })
    })
  }

  // 模型配置相关方法
  async createModelConfig(config: any): Promise<any> {
    await this.ensureReady()
    const run = promisify(this.db.run.bind(this.db))

    const stmt = `
      INSERT INTO model_configs (
        id, model_name, proxy_account_id, media_type, cost, enabled, settings,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `

    const now = new Date().toISOString()
    const id = config.id || this.generateId()

    await run(stmt, [
      id,
      config.modelName,
      config.proxyAccountId || null,
      config.mediaType,
      config.cost || 0,
      config.enabled ? 1 : 0,
      JSON.stringify(config.settings || {}),
      now,
      now
    ])

    return this.getModelConfig(id)
  }

  async getModelConfig(id: string): Promise<any> {
    await this.ensureReady()
    const get = promisify(this.db.get.bind(this.db))
    const row = await get(`
      SELECT mc.*, pa.name as proxy_account_name, pa.provider as proxy_provider
      FROM model_configs mc
      LEFT JOIN proxy_accounts pa ON mc.proxy_account_id = pa.id
      WHERE mc.id = ?
    `, [id])

    if (!row) return null

    return {
      id: row.id,
      modelName: row.model_name,
      proxyAccountId: row.proxy_account_id,
      proxyAccountName: row.proxy_account_name,
      proxyProvider: row.proxy_provider,
      mediaType: row.media_type,
      cost: row.cost,
      enabled: row.enabled === 1,
      settings: JSON.parse(row.settings || '{}'),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }

  async getModelConfigs(params?: any): Promise<any[]> {
    await this.ensureReady()
    const all = promisify(this.db.all.bind(this.db))

    let query = `
      SELECT mc.*, pa.name as proxy_account_name, pa.provider as proxy_provider
      FROM model_configs mc
      LEFT JOIN proxy_accounts pa ON mc.proxy_account_id = pa.id
    `
    const values: any[] = []
    const whereConditions: string[] = []

    if (params?.enabled !== undefined) {
      whereConditions.push('mc.enabled = ?')
      values.push(params.enabled ? 1 : 0)
    }

    if (params?.mediaType) {
      whereConditions.push('mc.media_type = ?')
      values.push(params.mediaType)
    }

    if (params?.proxyAccountId) {
      whereConditions.push('mc.proxy_account_id = ?')
      values.push(params.proxyAccountId)
    }

    if (whereConditions.length > 0) {
      query += ' WHERE ' + whereConditions.join(' AND ')
    }

    query += ' ORDER BY mc.created_at DESC'

    const rows = await all(query, values)
    return rows.map(row => ({
      id: row.id,
      modelName: row.model_name,
      proxyAccountId: row.proxy_account_id,
      proxyAccountName: row.proxy_account_name,
      proxyProvider: row.proxy_provider,
      mediaType: row.media_type,
      cost: row.cost,
      enabled: row.enabled === 1,
      settings: JSON.parse(row.settings || '{}'),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))
  }

  async updateModelConfig(id: string, updates: any): Promise<any> {
    await this.ensureReady()
    const run = promisify(this.db.run.bind(this.db))

    const fields: string[] = []
    const values: any[] = []

    Object.entries(updates).forEach(([key, value]) => {
      if (key === 'id') return

      if (key === 'modelName') {
        fields.push('model_name = ?')
        values.push(value)
      } else if (key === 'proxyAccountId') {
        fields.push('proxy_account_id = ?')
        values.push(value)
      } else if (key === 'mediaType') {
        fields.push('media_type = ?')
        values.push(value)
      } else if (key === 'cost') {
        fields.push('cost = ?')
        values.push(value)
      } else if (key === 'enabled') {
        fields.push('enabled = ?')
        values.push(value ? 1 : 0)
      } else if (key === 'settings') {
        fields.push('settings = ?')
        values.push(JSON.stringify(value))
      }
    })

    fields.push('updated_at = ?')
    values.push(new Date().toISOString())
    values.push(id)

    const stmt = `UPDATE model_configs SET ${fields.join(', ')} WHERE id = ?`
    await run(stmt, values)

    return this.getModelConfig(id)
  }

  async deleteModelConfig(id: string): Promise<boolean> {
    await this.ensureReady()
    const run = promisify(this.db.run.bind(this.db))
    const result = await run('DELETE FROM model_configs WHERE id = ?', [id])
    return (result.changes || 0) > 0
  }

  // EvoLink.AI模型模板相关方法
  async createEvoLinkTemplate(template: any): Promise<any> {
    await this.ensureReady()
    const run = promisify(this.db.run.bind(this.db))

    const stmt = `
      INSERT INTO evolink_model_templates (
        id, model_id, model_name, media_type, cost_per_request, description,
        enabled, is_builtin, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `

    await run(stmt, [
      template.id,
      template.modelId,
      template.modelName,
      template.mediaType,
      template.costPerRequest || 0,
      template.description || null,
      template.enabled !== false ? 1 : 0,
      template.is_builtin ? 1 : 0,
      template.createdAt,
      template.updatedAt
    ])

    return template
  }

  async getEvoLinkTemplates(): Promise<any[]> {
    await this.ensureReady()
    const all = promisify(this.db.all.bind(this.db))

    const rows = await all('SELECT * FROM evolink_model_templates ORDER BY media_type, model_name')
    return rows.map(row => ({
      id: row.id,
      modelId: row.model_id,
      modelName: row.model_name,
      mediaType: row.media_type,
      costPerRequest: row.cost_per_request,
      description: row.description,
      enabled: row.enabled === 1,
      is_builtin: row.is_builtin === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))
  }

  async getEvoLinkTemplatesByMediaType(mediaType: string): Promise<any[]> {
    await this.ensureReady()
    const all = promisify(this.db.all.bind(this.db))

    const rows = await all(
      'SELECT * FROM evolink_model_templates WHERE media_type = ? AND enabled = 1 ORDER BY model_name',
      [mediaType]
    )
    return rows.map(row => ({
      id: row.id,
      modelId: row.model_id,
      modelName: row.model_name,
      mediaType: row.media_type,
      costPerRequest: row.cost_per_request,
      description: row.description,
      enabled: row.enabled === 1,
      is_builtin: row.is_builtin === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))
  }

  async updateEvoLinkTemplate(id: string, updates: any): Promise<any> {
    await this.ensureReady()
    const run = promisify(this.db.run.bind(this.db))

    const setClause = []
    const values = []

    Object.keys(updates).forEach(key => {
      const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase()
      setClause.push(`${dbKey} = ?`)
      values.push(updates[key])
    })

    setClause.push('updated_at = ?')
    values.push(new Date().toISOString())
    values.push(id)

    await run(
      `UPDATE evolink_model_templates SET ${setClause.join(', ')} WHERE id = ?`,
      values
    )

    return this.getEvoLinkTemplate(id)
  }

  async getEvoLinkTemplate(id: string): Promise<any> {
    await this.ensureReady()
    const get = promisify(this.db.get.bind(this.db))

    const row = await get('SELECT * FROM evolink_model_templates WHERE id = ?', [id])
    if (!row) return null

    return {
      id: row.id,
      modelId: row.model_id,
      modelName: row.model_name,
      mediaType: row.media_type,
      costPerRequest: row.cost_per_request,
      description: row.description,
      enabled: row.enabled === 1,
      is_builtin: row.is_builtin === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }

  async deleteEvoLinkTemplate(id: string): Promise<boolean> {
    await this.ensureReady()
    const run = promisify(this.db.run.bind(this.db))

    const result = await run('DELETE FROM evolink_model_templates WHERE id = ?', [id])
    return (result as any).changes > 0
  }

  // 用户自定义EvoLink.AI模型相关方法
  async createUserEvoLinkModel(model: any): Promise<any> {
    await this.ensureReady()
    const run = promisify(this.db.run.bind(this.db))

    const stmt = `
      INSERT INTO user_evolink_models (
        id, template_id, model_id, display_name, media_type, cost_per_request,
        proxy_account_id, enabled, tested, last_tested_at, test_result, settings,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `

    await run(stmt, [
      model.id,
      model.templateId || null,
      model.modelId,
      model.displayName,
      model.mediaType,
      model.costPerRequest || 0,
      model.proxyAccountId || null,
      model.enabled !== false ? 1 : 0,
      model.tested ? 1 : 0,
      model.lastTestedAt || null,
      model.testResult ? JSON.stringify(model.testResult) : null,
      model.settings ? JSON.stringify(model.settings) : null,
      model.createdAt,
      model.updatedAt
    ])

    return model
  }

  async getUserEvoLinkModels(): Promise<any[]> {
    await this.ensureReady()
    const all = promisify(this.db.all.bind(this.db))

    const rows = await all(`
      SELECT u.*, pa.name as proxy_account_name
      FROM user_evolink_models u
      LEFT JOIN proxy_accounts pa ON u.proxy_account_id = pa.id
      ORDER BY u.media_type, u.display_name
    `)
    return rows.map(row => ({
      id: row.id,
      templateId: row.template_id,
      modelId: row.model_id,
      displayName: row.display_name,
      mediaType: row.media_type,
      costPerRequest: row.cost_per_request,
      proxyAccountId: row.proxy_account_id,
      proxyAccountName: row.proxy_account_name,
      enabled: row.enabled === 1,
      tested: row.tested === 1,
      lastTestedAt: row.last_tested_at,
      testResult: row.test_result ? JSON.parse(row.test_result) : null,
      settings: row.settings ? JSON.parse(row.settings) : null,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))
  }

  async getUserEvoLinkModelsByAccount(proxyAccountId: string): Promise<any[]> {
    await this.ensureReady()
    const all = promisify(this.db.all.bind(this.db))

    const rows = await all(
      'SELECT * FROM user_evolink_models WHERE proxy_account_id = ? AND enabled = 1 ORDER BY media_type, display_name',
      [proxyAccountId]
    )
    return rows.map(row => ({
      id: row.id,
      templateId: row.template_id,
      modelId: row.model_id,
      displayName: row.display_name,
      mediaType: row.media_type,
      costPerRequest: row.cost_per_request,
      proxyAccountId: row.proxy_account_id,
      enabled: row.enabled === 1,
      tested: row.tested === 1,
      lastTestedAt: row.last_tested_at,
      testResult: row.test_result ? JSON.parse(row.test_result) : null,
      settings: row.settings ? JSON.parse(row.settings) : null,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))
  }

  async updateUserEvoLinkModel(id: string, updates: any): Promise<any> {
    await this.ensureReady()
    const run = promisify(this.db.run.bind(this.db))

    const setClause = []
    const values = []

    Object.keys(updates).forEach(key => {
      const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase()
      let value = updates[key]
      if (key === 'testResult' || key === 'settings') {
        value = value ? JSON.stringify(value) : null
      }
      setClause.push(`${dbKey} = ?`)
      values.push(value)
    })

    setClause.push('updated_at = ?')
    values.push(new Date().toISOString())
    values.push(id)

    await run(
      `UPDATE user_evolink_models SET ${setClause.join(', ')} WHERE id = ?`,
      values
    )

    return this.getUserEvoLinkModel(id)
  }

  async getUserEvoLinkModel(id: string): Promise<any> {
    await this.ensureReady()
    const get = promisify(this.db.get.bind(this.db))

    const row = await get('SELECT * FROM user_evolink_models WHERE id = ?', [id])
    if (!row) return null

    return {
      id: row.id,
      templateId: row.template_id,
      modelId: row.model_id,
      displayName: row.display_name,
      mediaType: row.media_type,
      costPerRequest: row.cost_per_request,
      proxyAccountId: row.proxy_account_id,
      enabled: row.enabled === 1,
      tested: row.tested === 1,
      lastTestedAt: row.last_tested_at,
      testResult: row.test_result ? JSON.parse(row.test_result) : null,
      settings: row.settings ? JSON.parse(row.settings) : null,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }

  async deleteUserEvoLinkModel(id: string): Promise<boolean> {
    await this.ensureReady()
    const run = promisify(this.db.run.bind(this.db))

    const result = await run('DELETE FROM user_evolink_models WHERE id = ?', [id])
    return (result as any).changes > 0
  }

  // API端点配置相关方法
  async createApiEndpoint(endpoint: any): Promise<any> {
    await this.ensureReady()
    const run = promisify(this.db.run.bind(this.db))

    const stmt = `
      INSERT INTO api_endpoints (
        id, provider, media_type, endpoint_url, description, enabled, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `

    await run(stmt, [
      endpoint.id,
      endpoint.provider,
      endpoint.mediaType,
      endpoint.endpointUrl,
      endpoint.description || null,
      endpoint.enabled !== false ? 1 : 0,
      endpoint.createdAt,
      endpoint.updatedAt
    ])

    return endpoint
  }

  async getApiEndpoints(): Promise<any[]> {
    await this.ensureReady()
    const all = promisify(this.db.all.bind(this.db))

    const rows = await all('SELECT * FROM api_endpoints ORDER BY provider, media_type')
    return rows.map(row => ({
      id: row.id,
      provider: row.provider,
      mediaType: row.media_type,
      endpointUrl: row.endpoint_url,
      description: row.description,
      enabled: row.enabled === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))
  }

  async getApiEndpointsByProvider(provider: string): Promise<any[]> {
    await this.ensureReady()
    const all = promisify(this.db.all.bind(this.db))

    const rows = await all(
      'SELECT * FROM api_endpoints WHERE provider = ? AND enabled = 1 ORDER BY media_type',
      [provider]
    )
    return rows.map(row => ({
      id: row.id,
      provider: row.provider,
      mediaType: row.media_type,
      endpointUrl: row.endpoint_url,
      description: row.description,
      enabled: row.enabled === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))
  }

  
  // Routing Rules Methods
  async createRoutingRule(rule: any): Promise<any> {
    await this.ensureReady()
    const run = promisify(this.db.run.bind(this.db))

    const now = new Date().toISOString()
    const id = randomUUID()

    await run(
      `INSERT INTO routing_rules (
        id, name, description, priority, enabled, conditions,
        target_proxy_account_id, action, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        rule.name,
        rule.description || null,
        rule.priority || 100,
        rule.enabled ? 1 : 0,
        JSON.stringify(rule.conditions || {}),
        rule.targetProxyAccountId || null,
        rule.action || 'route',
        now,
        now
      ]
    )

    return this.getRoutingRule(id)
  }

  async getRoutingRule(id: string): Promise<any> {
    await this.ensureReady()
    const get = promisify(this.db.get.bind(this.db))
    const row = await get('SELECT * FROM routing_rules WHERE id = ?', [id])

    if (!row) return null

    return {
      id: row.id,
      name: row.name,
      description: row.description,
      priority: row.priority,
      enabled: row.enabled === 1,
      conditions: JSON.parse(row.conditions || '{}'),
      targetProxyAccountId: row.target_proxy_account_id,
      action: row.action,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }

  async getRoutingRules(params?: any): Promise<any[]> {
    await this.ensureReady()
    const all = promisify(this.db.all.bind(this.db))

    let query = 'SELECT * FROM routing_rules'
    const queryParams: any[] = []

    if (params?.enabled !== undefined) {
      query += ' WHERE enabled = ?'
      queryParams.push(params.enabled ? 1 : 0)
    }

    query += ' ORDER BY priority ASC, created_at DESC'

    const rows = await all(query, queryParams)
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      priority: row.priority,
      enabled: row.enabled === 1,
      conditions: JSON.parse(row.conditions || '{}'),
      targetProxyAccountId: row.target_proxy_account_id,
      action: row.action,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))
  }

  async updateRoutingRule(id: string, updates: any): Promise<any> {
    await this.ensureReady()
    const run = promisify(this.db.run.bind(this.db))

    const allowedFields = ['name', 'description', 'priority', 'enabled', 'conditions', 'targetProxyAccountId', 'action']
    const setClause: string[] = []
    const values: any[] = []

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        const dbField = field.replace(/([A-Z])/g, '_$1').toLowerCase()
        if (field === 'conditions') {
          setClause.push(`${dbField} = ?`)
          values.push(JSON.stringify(updates[field]))
        } else if (field === 'enabled') {
          setClause.push(`${dbField} = ?`)
          values.push(updates[field] ? 1 : 0)
        } else {
          setClause.push(`${dbField} = ?`)
          values.push(updates[field])
        }
      }
    }

    if (setClause.length === 0) {
      throw new Error('No valid fields to update')
    }

    setClause.push('updated_at = ?')
    values.push(new Date().toISOString())
    values.push(id)

    await run(`UPDATE routing_rules SET ${setClause.join(', ')} WHERE id = ?`, values)
    return this.getRoutingRule(id)
  }

  async deleteRoutingRule(id: string): Promise<boolean> {
    await this.ensureReady()
    const run = promisify(this.db.run.bind(this.db))
    const result = await run('DELETE FROM routing_rules WHERE id = ?', [id])
    return (result as any).changes > 0
  }

  // Cost Thresholds Methods
  async createCostThreshold(threshold: any): Promise<any> {
    await this.ensureReady()
    const run = promisify(this.db.run.bind(this.db))

    const now = new Date().toISOString()
    const id = randomUUID()

    await run(
      `INSERT INTO cost_thresholds (
        id, name, description, threshold_type, threshold_value,
        currency, period, enabled, alert_email, alert_webhook,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        threshold.name,
        threshold.description || null,
        threshold.thresholdType || 'daily',
        threshold.thresholdValue,
        threshold.currency || 'USD',
        threshold.period || 'daily',
        threshold.enabled ? 1 : 0,
        threshold.alertEmail || null,
        threshold.alertWebhook || null,
        now,
        now
      ]
    )

    return this.getCostThreshold(id)
  }

  async getCostThreshold(id: string): Promise<any> {
    await this.ensureReady()
    const get = promisify(this.db.get.bind(this.db))
    const row = await get('SELECT * FROM cost_thresholds WHERE id = ?', [id])

    if (!row) return null

    return {
      id: row.id,
      name: row.name,
      description: row.description,
      thresholdType: row.threshold_type,
      thresholdValue: row.threshold_value,
      currency: row.currency,
      period: row.period,
      enabled: row.enabled === 1,
      alertEmail: row.alert_email,
      alertWebhook: row.alert_webhook,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }

  async getCostThresholds(params?: any): Promise<any[]> {
    await this.ensureReady()
    const all = promisify(this.db.all.bind(this.db))

    let query = 'SELECT * FROM cost_thresholds'
    const queryParams: any[] = []

    if (params?.enabled !== undefined) {
      query += ' WHERE enabled = ?'
      queryParams.push(params.enabled ? 1 : 0)
    }

    if (params?.thresholdType) {
      query += params?.enabled !== undefined ? ' AND threshold_type = ?' : ' WHERE threshold_type = ?'
      queryParams.push(params.thresholdType)
    }

    query += ' ORDER BY created_at DESC'

    const rows = await all(query, queryParams)
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      thresholdType: row.threshold_type,
      thresholdValue: row.threshold_value,
      currency: row.currency,
      period: row.period,
      enabled: row.enabled === 1,
      alertEmail: row.alert_email,
      alertWebhook: row.alert_webhook,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))
  }

  async updateCostThreshold(id: string, updates: any): Promise<any> {
    await this.ensureReady()
    const run = promisify(this.db.run.bind(this.db))

    const allowedFields = ['name', 'description', 'thresholdType', 'thresholdValue', 'currency', 'period', 'enabled', 'alertEmail', 'alertWebhook']
    const setClause: string[] = []
    const values: any[] = []

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        const dbField = field.replace(/([A-Z])/g, '_$1').toLowerCase()
        if (field === 'enabled') {
          setClause.push(`${dbField} = ?`)
          values.push(updates[field] ? 1 : 0)
        } else {
          setClause.push(`${dbField} = ?`)
          values.push(updates[field])
        }
      }
    }

    if (setClause.length === 0) {
      throw new Error('No valid fields to update')
    }

    setClause.push('updated_at = ?')
    values.push(new Date().toISOString())
    values.push(id)

    await run(`UPDATE cost_thresholds SET ${setClause.join(', ')} WHERE id = ?`, values)
    return this.getCostThreshold(id)
  }

  async deleteCostThreshold(id: string): Promise<boolean> {
    await this.ensureReady()
    const run = promisify(this.db.run.bind(this.db))
    const result = await run('DELETE FROM cost_thresholds WHERE id = ?', [id])
    return (result as any).changes > 0
  }

  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err)
        else resolve()
      })
    })
  }
}

// 数据库实例
let dbInstance: Database | null = null

export async function getDatabase(): Promise<Database> {
  if (!dbInstance) {
    const dbPath = path.join(process.cwd(), 'data', 'ai-creator-studio.db')

    // 确保数据目录存在
    const dataDir = path.dirname(dbPath)
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }

    dbInstance = new SQLiteDatabase(dbPath)
  }

  return dbInstance
}

// 便捷函数
export async function withDatabase<T>(callback: (db: Database) => Promise<T>): Promise<T> {
  const db = await getDatabase()
  try {
    return await callback(db)
  } finally {
    // 在生产环境中，你可能不想关闭连接
    // await db.close()
  }
}