#!/bin/bash

# n8n 部署脚本
set -e

echo "🚀 开始部署 n8n 工作流引擎..."

# 检查环境变量
if [ ! -f .env.local ]; then
    echo "❌ 错误: .env.local 文件不存在"
    echo "请先复制 .env.example 到 .env.local 并填入配置"
    exit 1
fi

# 读取环境变量
source .env.local

# 检查必要的变量
if [ -z "$N8N_PASSWORD" ] || [ -z "$POSTGRES_PASSWORD" ]; then
    echo "❌ 错误: 请在 .env.local 中设置 N8N_PASSWORD 和 POSTGRES_PASSWORD"
    exit 1
fi

# 停止现有容器
echo "🛑 停止现有容器..."
docker-compose -f docker-compose.n8n.yml down

# 拉取最新镜像
echo "📦 拉取最新镜像..."
docker-compose -f docker-compose.n8n.yml pull

# 启动服务
echo "🔄 启动 n8n 服务..."
docker-compose -f docker-compose.n8n.yml up -d

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 30

# 检查服务状态
echo "🔍 检查服务状态..."
docker-compose -f docker-compose.n8n.yml ps

# 显示访问信息
echo "✅ n8n 部署完成!"
echo "📊 管理界面: http://localhost:5678"
echo "👤 用户名: admin"
echo "🔑 密码: $N8N_PASSWORD"
echo ""
echo "💡 Redis: localhost:6379"
echo "🐘 PostgreSQL: localhost:5432"
echo ""
echo "📝 日志查看: docker-compose -f docker-compose.n8n.yml logs -f n8n"
echo "🛑 停止服务: docker-compose -f docker-compose.n8n.yml down"