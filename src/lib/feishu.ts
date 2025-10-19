// 飞书应用配置
const FEISHU_CONFIG = {
  appId: process.env.FEISHU_APP_ID || '',
  appSecret: process.env.FEISHU_APP_SECRET || '',
  encryptKey: process.env.FEISHU_ENCRYPT_KEY || '',
  verificationToken: process.env.FEISHU_VERIFICATION_TOKEN || '',
}

// 飞书表格相关配置
const BITABLE_CONFIG = {
  appToken: process.env.FEISHU_BITABLE_APP_TOKEN || '',
  tableId: process.env.FEISHU_BITABLE_TABLE_ID || '',
}

// 任务表格字段配置
const TASK_FIELDS = {
  id: 'record_id',          // 记录ID
  taskId: 'task_id',        // 任务ID
  type: 'type',             // 类型 (image/video)
  prompt: 'prompt',         // 提示词
  status: 'status',         // 状态
  progress: 'progress',     // 进度
  results: 'results',       // 结果URLs
  error: 'error',           // 错误信息
  cost: 'cost',             // 成本
  model: 'model',           // 模型
  parameters: 'parameters', // 参数
  createdAt: 'created_at',  // 创建时间
  updatedAt: 'updated_at',  // 更新时间
}

// 结果表格字段配置
const RESULT_FIELDS = {
  id: 'record_id',          // 记录ID
  taskId: 'task_id',        // 关联任务ID
  url: 'url',               // 文件URL
  type: 'type',             // 文件类型
  size: 'size',             // 文件大小
  thumbnail: 'thumbnail',   // 缩略图URL
  metadata: 'metadata',     // 元数据
  createdAt: 'created_at',  // 创建时间
}

// 飞书 API 客户端
export class FeishuAPIClient {
  private accessToken: string = ''

  // 获取访问令牌
  async getAccessToken(): Promise<string> {
    try {
      const response = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          app_id: FEISHU_CONFIG.appId,
          app_secret: FEISHU_CONFIG.appSecret,
        }),
      })

      const data = await response.json()
      if (data.code === 0) {
        this.accessToken = data.tenant_access_token || ''
        return this.accessToken
      } else {
        throw new Error(data.msg || 'Failed to get access token')
      }
    } catch (error) {
      console.error('Failed to get access token:', error)
      throw new Error('Failed to authenticate with Feishu')
    }
  }

  // 获取飞书表格记录
  async getBitableRecords(appToken: string, tableId: string, options?: {
    pageSize?: number
    pageToken?: string
    filter?: any
    sort?: any[]
  }) {
    try {
      const token = this.accessToken || await this.getAccessToken()
      
      const params = new URLSearchParams()
      if (options?.pageSize) params.append('page_size', options.pageSize.toString())
      if (options?.pageToken) params.append('page_token', options.pageToken)
      if (options?.filter) params.append('filter', JSON.stringify(options.filter))
      if (options?.sort) params.append('sort', JSON.stringify(options.sort))

      const response = await fetch(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records?${params}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      )

      const data = await response.json()
      if (data.code === 0) {
        return data.data
      } else {
        throw new Error(data.msg || 'Failed to get records')
      }
    } catch (error) {
      console.error('Failed to get bitable records:', error)
      throw error
    }
  }

  // 创建飞书表格记录
  async createBitableRecord(appToken: string, tableId: string, fields: Record<string, any>) {
    try {
      const token = this.accessToken || await this.getAccessToken()

      const response = await fetch(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fields,
          }),
        }
      )

      const data = await response.json()
      if (data.code === 0) {
        return data.data.records?.[0]
      } else {
        throw new Error(data.msg || 'Failed to create record')
      }
    } catch (error) {
      console.error('Failed to create bitable record:', error)
      throw error
    }
  }

  // 更新飞书表格记录
  async updateBitableRecord(appToken: string, tableId: string, recordId: string, fields: Record<string, any>) {
    try {
      const token = this.accessToken || await this.getAccessToken()

      const response = await fetch(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records/${recordId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fields,
          }),
        }
      )

      const data = await response.json()
      if (data.code === 0) {
        return data.data.records?.[0]
      } else {
        throw new Error(data.msg || 'Failed to update record')
      }
    } catch (error) {
      console.error('Failed to update bitable record:', error)
      throw error
    }
  }

  // 创建任务记录
  async createTaskRecord(taskData: {
    taskId: string
    type: string
    prompt: string
    model: string
    parameters: Record<string, any>
  }) {
    const record = {
      [TASK_FIELDS.taskId]: taskData.taskId,
      [TASK_FIELDS.type]: taskData.type,
      [TASK_FIELDS.prompt]: taskData.prompt,
      [TASK_FIELDS.status]: 'pending',
      [TASK_FIELDS.progress]: 0,
      [TASK_FIELDS.results]: [],
      [TASK_FIELDS.cost]: 0,
      [TASK_FIELDS.model]: taskData.model,
      [TASK_FIELDS.parameters]: JSON.stringify(taskData.parameters),
      [TASK_FIELDS.createdAt]: new Date().toISOString(),
      [TASK_FIELDS.updatedAt]: new Date().toISOString(),
    }

    return this.createBitableRecord(BITABLE_CONFIG.appToken, BITABLE_CONFIG.tableId, record)
  }

  // 更新任务记录
  async updateTaskRecord(recordId: string, updates: {
    status?: string
    progress?: number
    results?: string[]
    error?: string
    cost?: number
  }) {
    const fields: Record<string, any> = {
      [TASK_FIELDS.updatedAt]: new Date().toISOString(),
    }

    if (updates.status !== undefined) {
      fields[TASK_FIELDS.status] = updates.status
    }
    if (updates.progress !== undefined) {
      fields[TASK_FIELDS.progress] = updates.progress
    }
    if (updates.results !== undefined) {
      fields[TASK_FIELDS.results] = updates.results
    }
    if (updates.error !== undefined) {
      fields[TASK_FIELDS.error] = updates.error
    }
    if (updates.cost !== undefined) {
      fields[TASK_FIELDS.cost] = updates.cost
    }

    return this.updateBitableRecord(BITABLE_CONFIG.appToken, BITABLE_CONFIG.tableId, recordId, fields)
  }

  // 获取任务记录
  async getTaskRecord(taskId: string) {
    const filter = {
      conditions: [{
        field_name: TASK_FIELDS.taskId,
        operator: 'is',
        value: [taskId],
      }],
    }

    const response = await this.getBitableRecords(BITABLE_CONFIG.appToken, BITABLE_CONFIG.tableId, {
      filter,
      pageSize: 1,
    })

    return response.items?.[0]
  }

  // 获取任务列表
  async getTaskRecords(params?: {
    pageSize?: number
    pageToken?: string
    status?: string
    type?: string
  }) {
    let filter: any = undefined
    if (params?.status || params?.type) {
      const conditions = []
      if (params?.status) {
        conditions.push({
          field_name: TASK_FIELDS.status,
          operator: 'is',
          value: [params.status],
        })
      }
      if (params?.type) {
        conditions.push({
          field_name: TASK_FIELDS.type,
          operator: 'is',
          value: [params.type],
        })
      }
      filter = { conditions }
    }

    return this.getBitableRecords(BITABLE_CONFIG.appToken, BITABLE_CONFIG.tableId, {
      pageSize: params?.pageSize || 20,
      pageToken: params?.pageToken,
      filter,
      sort: [{
        field_name: TASK_FIELDS.createdAt,
        desc: true,
      }],
    })
  }

  // 创建结果记录
  async createResultRecord(resultData: {
    taskId: string
    url: string
    type: string
    size?: number
    thumbnail?: string
    metadata?: Record<string, any>
  }) {
    const record = {
      [RESULT_FIELDS.taskId]: resultData.taskId,
      [RESULT_FIELDS.url]: resultData.url,
      [RESULT_FIELDS.type]: resultData.type,
      [RESULT_FIELDS.size]: resultData.size || 0,
      [RESULT_FIELDS.thumbnail]: resultData.thumbnail || '',
      [RESULT_FIELDS.metadata]: resultData.metadata ? JSON.stringify(resultData.metadata) : '{}',
      [RESULT_FIELDS.createdAt]: new Date().toISOString(),
    }

    return this.createBitableRecord(BITABLE_CONFIG.appToken, BITABLE_CONFIG.tableId, record)
  }

  // 获取结果记录
  async getResultRecords(params?: {
    pageSize?: number
    pageToken?: string
    taskId?: string
    type?: string
  }) {
    let filter: any = undefined
    if (params?.taskId || params?.type) {
      const conditions = []
      if (params?.taskId) {
        conditions.push({
          field_name: RESULT_FIELDS.taskId,
          operator: 'is',
          value: [params.taskId],
        })
      }
      if (params?.type) {
        conditions.push({
          field_name: RESULT_FIELDS.type,
          operator: 'is',
          value: [params.type],
        })
      }
      filter = { conditions }
    }

    return this.getBitableRecords(BITABLE_CONFIG.appToken, BITABLE_CONFIG.tableId, {
      pageSize: params?.pageSize || 20,
      pageToken: params?.pageToken,
      filter,
      sort: [{
        field_name: RESULT_FIELDS.createdAt,
        desc: true,
      }],
    })
  }
}

// 导出单例实例
export const feishuAPI = new FeishuAPIClient()

// 导出配置
export { FEISHU_CONFIG, BITABLE_CONFIG, TASK_FIELDS, RESULT_FIELDS }