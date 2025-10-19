#!/bin/bash

# AI Creator Studio 清理启动脚本
# 解决 Next.js 多服务器实例冲突噩梦

echo "🔧 AI Creator Studio 开发环境清理"
echo "====================================="
echo "⏰ $(date)"
echo ""

# 函数：清理进程
cleanup_processes() {
    echo "📛 停止所有相关进程..."

    # 强制停止所有npm和next进程
    pkill -9 -f "npm run dev" 2>/dev/null || true
    pkill -9 -f "next dev" 2>/dev/null || true
    pkill -9 -f "node.*next" 2>/dev/null || true

    # 清理端口占用
    echo "🔌 清理端口占用 (3000, 3001, 3002)..."
    lsof -ti:3000,3001,3002 | xargs kill -9 2>/dev/null || true

    # 等待进程完全停止
    sleep 2
    echo "✅ 进程清理完成"
}

# 函数：清理缓存
cleanup_cache() {
    echo "🧹 清理所有缓存..."

    # 清理 Next.js 缓存
    if [ -d ".next" ]; then
        rm -rf .next
        echo "   - .next 缓存已清理"
    fi

    # 清理其他缓存
    if [ -d "node_modules/.cache" ]; then
        rm -rf node_modules/.cache
        echo "   - node_modules/.cache 已清理"
    fi

    echo "✅ 缓存清理完成"
}

# 函数：检查依赖
check_dependencies() {
    echo "📦 检查依赖..."

    if [ ! -d "node_modules" ]; then
        echo "⬇️ 安装依赖..."
        npm install
    else
        echo "✅ 依赖已存在"
    fi
}

# 函数：启动服务器
start_server() {
    echo ""
    echo "🚀 启动开发服务器..."
    echo "====================================="
    echo "📍 URL: http://localhost:3000"
    echo "📍 设置页面: http://localhost:3000/zh/settings"
    echo ""
    echo "按 Ctrl+C 停止服务器"
    echo "====================================="

    # 启动开发服务器
    npm run dev
}

# 主执行流程
main() {
    # 检查是否在正确的目录
    if [ ! -f "package.json" ]; then
        echo "❌ 错误：请在项目根目录运行此脚本"
        exit 1
    fi

    # 执行清理步骤
    cleanup_processes
    cleanup_cache
    check_dependencies

    # 启动服务器
    start_server
}

# 脚本被中断时的清理
trap 'echo ""; echo "🛑 脚本已停止"; exit 0' INT TERM

# 运行主函数
main