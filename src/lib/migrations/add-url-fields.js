const { withDatabase } = require('../database')

// 数据库迁移：为EvoLink模型表添加URL字段
async function addUrlFieldsToEvoLinkTables() {
  console.log('🔄 开始数据库迁移：添加URL字段到EvoLink表...')

  try {
    await withDatabase(async (db) => {
      const run = (sql, params = []) =>
        new Promise((resolve, reject) => {
          db.db.run(sql, params, function(err) {
            if (err) reject(err)
            else resolve(this)
          })
        })

      // 1. 为 evolink_model_templates 表添加 endpoint_url 字段
      console.log('📋 为 evolink_model_templates 表添加 endpoint_url 字段...')
      try {
        await run(`
          ALTER TABLE evolink_model_templates
          ADD COLUMN endpoint_url TEXT
        `)
        console.log('✅ endpoint_url 字段添加成功')
      } catch (error) {
        if (error.message.includes('duplicate column name')) {
          console.log('⏭️  endpoint_url 字段已存在，跳过')
        } else {
          throw error
        }
      }

      // 2. 为 user_evolink_models 表添加 custom_endpoint_url 字段
      console.log('📋 为 user_evolink_models 表添加 custom_endpoint_url 字段...')
      try {
        await run(`
          ALTER TABLE user_evolink_models
          ADD COLUMN custom_endpoint_url TEXT
        `)
        console.log('✅ custom_endpoint_url 字段添加成功')
      } catch (error) {
        if (error.message.includes('duplicate column name')) {
          console.log('⏭️  custom_endpoint_url 字段已存在，跳过')
        } else {
          throw error
        }
      }

      // 3. 创建API端点配置表（如果不存在）
      console.log('📋 创建 api_endpoints 表...')
      await run(`
        CREATE TABLE IF NOT EXISTS api_endpoints (
          id TEXT PRIMARY KEY,
          provider TEXT NOT NULL,
          media_type TEXT NOT NULL,
          endpoint_url TEXT NOT NULL,
          description TEXT,
          enabled INTEGER DEFAULT 1,
          is_default INTEGER DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          UNIQUE(provider, media_type)
        )
      `)

      // 4. 创建索引
      console.log('📋 创建相关索引...')
      await run('CREATE INDEX IF NOT EXISTS idx_api_endpoints_provider ON api_endpoints (provider)')
      await run('CREATE INDEX IF NOT EXISTS idx_api_endpoints_media_type ON api_endpoints (media_type)')
      await run('CREATE INDEX IF NOT EXISTS idx_api_endpoints_enabled ON api_endpoints (enabled)')

      console.log('✅ 数据库迁移完成：URL字段添加成功')
    })

    // 5. 初始化默认API端点配置
    await initializeDefaultApiEndpoints()

    return true
  } catch (error) {
    console.error('❌ 数据库迁移失败:', error)
    return false
  }
}

// 初始化默认API端点配置
async function initializeDefaultApiEndpoints() {
  console.log('🚀 初始化默认API端点配置...')

  try {
    await withDatabase(async (db) => {
      const run = (sql, params = []) =>
        new Promise((resolve, reject) => {
          db.db.run(sql, params, function(err) {
            if (err) reject(err)
            else resolve(this)
          })
        })

      const all = (sql, params = []) =>
        new Promise((resolve, reject) => {
          db.db.all(sql, params, (err, rows) => {
            if (err) reject(err)
            else resolve(rows)
          })
        })

      const now = new Date().toISOString()

      // 检查是否已有EvoLink的端点配置
      const existingEndpoints = await all('SELECT * FROM api_endpoints WHERE provider = ?', ['evolink'])

      if (existingEndpoints.length === 0) {
        // 插入默认的EvoLink端点配置
        const defaultEndpoints = [
          {
            id: `endpoint_evolink_text_${Date.now()}`,
            provider: 'evolink',
            mediaType: 'text',
            endpointUrl: 'https://api.evolink.ai/v1/chat/completions',
            description: 'EvoLink.AI 文本生成API端点',
            enabled: true,
            isDefault: true
          },
          {
            id: `endpoint_evolink_image_${Date.now()}`,
            provider: 'evolink',
            mediaType: 'image',
            endpointUrl: 'https://api.evolink.ai/v1/images/generations',
            description: 'EvoLink.AI 图片生成API端点',
            enabled: true,
            isDefault: true
          },
          {
            id: `endpoint_evolink_video_${Date.now()}`,
            provider: 'evolink',
            mediaType: 'video',
            endpointUrl: 'https://api.evolink.ai/v1/videos/generations',
            description: 'EvoLink.AI 视频生成API端点',
            enabled: true,
            isDefault: true
          }
        ]

        for (const endpoint of defaultEndpoints) {
          await run(`
            INSERT INTO api_endpoints (
              id, provider, media_type, endpoint_url, description, enabled, is_default, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            endpoint.id,
            endpoint.provider,
            endpoint.mediaType,
            endpoint.endpointUrl,
            endpoint.description,
            endpoint.enabled ? 1 : 0,
            endpoint.isDefault ? 1 : 0,
            now,
            now
          ])

          console.log(`✅ 创建默认端点: ${endpoint.provider}/${endpoint.mediaType}`)
        }
      } else {
        console.log('⏭️  API端点配置已存在，跳过初始化')
      }
    })

    console.log('✅ 默认API端点配置初始化完成')
  } catch (error) {
    console.error('❌ 初始化默认API端点配置失败:', error)
    throw error
  }
}

module.exports = { addUrlFieldsToEvoLinkTables }