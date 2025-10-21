import sqlite3 from 'sqlite3'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs'

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