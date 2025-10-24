const { addUrlFieldsToEvoLinkTables } = require('./migrations/add-url-fields.js')

// 执行数据库迁移
async function runMigration() {
  console.log('🚀 开始执行数据库迁移...')

  try {
    const success = await addUrlFieldsToEvoLinkTables()

    if (success) {
      console.log('✅ 数据库迁移完成！')
      process.exit(0)
    } else {
      console.error('❌ 数据库迁移失败！')
      process.exit(1)
    }
  } catch (error) {
    console.error('❌ 迁移过程中发生错误:', error)
    process.exit(1)
  }
}

// 如果直接运行此文件，执行迁移
if (require.main === module) {
  runMigration()
}

module.exports = { runMigration }