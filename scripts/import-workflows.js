#!/usr/bin/env node

/**
 * n8n 工作流导入脚本
 * 用于将工作流配置导入到 n8n 实例
 */

const fs = require('fs');
const path = require('path');

// n8n API 配置
const N8N_HOST = process.env.N8N_HOST || 'http://localhost:5678';
const N8N_USER = process.env.N8N_USER || 'admin';
const N8N_PASSWORD = process.env.N8N_PASSWORD;

// 工作流文件目录
const WORKFLOWS_DIR = path.join(__dirname, '../n8n-workflows');

/**
 * 获取 n8n 认证令牌
 */
async function getAuthToken() {
  try {
    const response = await fetch(`${N8N_HOST}/rest/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: N8N_USER,
        password: N8N_PASSWORD,
      }),
    });

    const data = await response.json();
    if (data.data) {
      return data.data.token;
    } else {
      throw new Error('Failed to get auth token');
    }
  } catch (error) {
    console.error('❌ 认证失败:', error.message);
    process.exit(1);
  }
}

/**
 * 导入单个工作流
 */
async function importWorkflow(token, workflowFile) {
  try {
    const workflowData = JSON.parse(fs.readFileSync(workflowFile, 'utf8'));
    
    const response = await fetch(`${N8N_HOST}/rest/workflows`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(workflowData),
    });

    if (response.ok) {
      const result = await response.json();
      console.log(`✅ 导入成功: ${workflowData.name}`);
      return result.data;
    } else {
      const error = await response.text();
      console.log(`❌ 导入失败: ${workflowData.name} - ${error}`);
      return null;
    }
  } catch (error) {
    console.error(`❌ 导入工作流失败 ${workflowFile}:`, error.message);
    return null;
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 开始导入 n8n 工作流...');

  // 检查 n8n 是否可访问
  try {
    const response = await fetch(`${N8N_HOST}/healthz`);
    if (!response.ok) {
      throw new Error('n8n 服务不可用');
    }
  } catch (error) {
    console.error('❌ 无法连接到 n8n 服务:', error.message);
    console.log('💡 请确保 n8n 服务已启动: npm run n8n:start');
    process.exit(1);
  }

  // 获取认证令牌
  console.log('🔐 正在认证...');
  const token = await getAuthToken();
  console.log('✅ 认证成功');

  // 获取所有工作流文件
  const workflowFiles = fs.readdirSync(WORKFLOWS_DIR)
    .filter(file => file.endsWith('.json'))
    .map(file => path.join(WORKFLOWS_DIR, file));

  if (workflowFiles.length === 0) {
    console.log('📁 没有找到工作流文件');
    return;
  }

  console.log(`📁 找到 ${workflowFiles.length} 个工作流文件`);

  // 导入所有工作流
  let successCount = 0;
  for (const workflowFile of workflowFiles) {
    const result = await importWorkflow(token, workflowFile);
    if (result) {
      successCount++;
    }
  }

  console.log(`\\n🎉 导入完成! 成功: ${successCount}/${workflowFiles.length}`);
  console.log(`📊 n8n 管理界面: ${N8N_HOST}`);
}

// 运行主函数
main().catch(error => {
  console.error('❌ 脚本执行失败:', error);
  process.exit(1);
});