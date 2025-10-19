#!/bin/bash

# AI Creator Studio 开发服务器安全启动脚本
# 作者：Claude Code Assistant
# 日期：2025-10-19
# 目的：避免多进程冲突，确保单一开发服务器运行

set -e  # 遇到错误立即退出

echo "🔄 AI Creator Studio 开发服务器启动脚本"
echo "=========================================="

# 1. 检查是否有现有进程
echo "🔍 检查现有开发服务器进程..."

# 查找所有相关进程
DEV_PROCESSES=$(ps aux | grep -E "(npm run dev|next dev)" | grep -v grep || true)

if [ -n "$DEV_PROCESSES" ]; then
    echo "⚠️  发现现有开发服务器进程："
    echo "$DEV_PROCESSES"
    echo ""

    echo "🛑 终止现有进程..."
    # 温和终止
    pkill -f "npm run dev" || true
    pkill -f "next dev" || true

    # 等待进程终止
    sleep 3

    # 检查是否还有进程残留
    REMAINING=$(ps aux | grep -E "(npm run dev|next dev)" | grep -v grep || true)
    if [ -n "$REMAINING" ]; then
        echo "⚡ 强制终止残留进程..."
        pkill -9 -f "npm run dev" || true
        pkill -9 -f "next dev" || true
        sleep 1
    fi
else
    echo "✅ 没有发现现有进程"
fi

# 2. 检查端口占用
echo ""
echo "🔍 检查端口3000占用情况..."

if lsof -ti:3000 > /dev/null 2>&1; then
    echo "⚠️  端口3000被占用，正在释放..."
    lsof -ti:3000 | xargs kill -9 || true
    sleep 1
else
    echo "✅ 端口3000可用"
fi

# 3. 可选：缓存清理（仅在需要时）
if [ "$1" = "--clean" ]; then
    echo ""
    echo "🧹 清理缓存文件..."
    if [ -d ".next" ]; then
        rm -rf .next
        echo "✅ .next 目录已清理"
    fi
    if [ -d "node_modules/.cache" ]; then
        rm -rf node_modules/.cache
        echo "✅ node_modules/.cache 目录已清理"
    fi
fi

# 4. 启动开发服务器
echo ""
echo "🚀 启动开发服务器..."
echo "📍 URL: http://localhost:3000"
echo "📍 中文版: http://localhost:3000/zh"
echo ""
echo "💡 提示："
echo "   - 使用 Ctrl+C 停止服务器"
echo "   - 使用 --clean 参数启动前清理缓存"
echo "   - 查看日志：tail -f .next/server.log"
echo ""

# 启动服务器（前台运行，避免后台进程积累）
npm run dev