#!/usr/bin/env npx tsx

/**
 * 数据库迁移脚本
 * 将现有数据库升级到支持多代理架构的新版本
 */

import { getDatabase } from '../src/lib/database'
import { promises as fs } from 'fs'
import path from 'path'

async function migrateDatabase() {
  console.log('🔄 开始数据库迁移...')

  try {
    const db = await getDatabase()

    // 1. 检查并添加 proxy_accounts 表的新字段
    console.log('📋 检查 proxy_accounts 表结构...')
    await migrateProxyAccounts(db)

    // 2. 检查并添加 model_configs 表的新字段
    console.log('📋 检查 model_configs 表结构...')
    await migrateModelConfigs(db)

    // 3. 创建新的路由规则和成本阈值表
    console.log('📋 创建新的配置表...')
    await createNewTables(db)

    console.log('✅ 数据库迁移完成！')

  } catch (error) {
    console.error('❌ 数据库迁移失败:', error)
    process.exit(1)
  }
}

async function migrateProxyAccounts(db: any) {
  // 检查是否已有 provider_type 列
  try {
    await db.getProxyAccounts()
    console.log('✅ proxy_accounts 表结构正常')
  } catch (error) {
    if (error.message.includes('no such column: provider_type')) {
      console.log('🔧 添加 proxy_accounts 表新字段...')

      // 添加新列到 proxy_accounts 表
      const run = (sql: string, params: any[] = []) => {
        return new Promise((resolve, reject) => {
          db.db.run(sql, params, function(err) {
            if (err) reject(err)
            else resolve(this)
          })
        })
      }

      // 添加新字段
      await run(`ALTER TABLE proxy_accounts ADD COLUMN provider_type TEXT DEFAULT 'api'`)
      await run(`ALTER TABLE proxy_accounts ADD COLUMN api_secret TEXT`)
      await run(`ALTER TABLE proxy_accounts ADD COLUMN region TEXT`)
      await run(`ALTER TABLE proxy_accounts ADD COLUMN priority INTEGER DEFAULT 100`)
      await run(`ALTER TABLE proxy_accounts ADD COLUMN health_status TEXT DEFAULT 'unknown'`)
      await run(`ALTER TABLE proxy_accounts ADD COLUMN last_health_check TEXT`)
      await run(`ALTER TABLE proxy_accounts ADD COLUMN performance_metrics TEXT`)
      await run(`ALTER TABLE proxy_accounts ADD COLUMN capabilities TEXT`)
      await run(`ALTER TABLE proxy_accounts ADD COLUMN rate_limits TEXT`)
      await run(`ALTER TABLE proxy_accounts ADD COLUMN authentication_type TEXT DEFAULT 'api_key'`)

      console.log('✅ proxy_accounts 表字段添加完成')
    } else {
      throw error
    }
  }
}

async function migrateModelConfigs(db: any) {
  try {
    await db.getModelConfigs()
    console.log('✅ model_configs 表结构正常')
  } catch (error) {
    if (error.message.includes('no such column')) {
      console.log('🔧 添加 model_configs 表新字段...')

      const run = (sql: string, params: any[] = []) => {
        return new Promise((resolve, reject) => {
          db.db.run(sql, params, function(err) {
            if (err) reject(err)
            else resolve(this)
          })
        })
      }

      // 添加新字段到 model_configs 表
      await run(`ALTER TABLE model_configs ADD COLUMN fallback_account_ids TEXT`)
      await run(`ALTER TABLE model_configs ADD COLUMN routing_preferences TEXT`)
      await run(`ALTER TABLE model_configs ADD COLUMN auto_failover INTEGER DEFAULT 0`)
      await run(`ALTER TABLE model_configs ADD COLUMN performance_stats TEXT`)

      console.log('✅ model_configs 表字段添加完成')
    } else {
      throw error
    }
  }
}

async function createNewTables(db: any) {
  const run = (sql: string, params: any[] = []) => {
    return new Promise((resolve, reject) => {
      db.db.run(sql, params, function(err) {
        if (err) reject(err)
        else resolve(this)
      })
    })
  }

  // 创建路由规则表
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

  // 创建成本阈值表
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

  console.log('✅ 新表创建完成')
}

// 运行迁移
if (require.main === module) {
  migrateDatabase()
}

export { migrateDatabase }