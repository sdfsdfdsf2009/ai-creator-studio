#!/bin/bash

# 开发服务器进程检查脚本
# 用于监控和清理冲突的进程

echo "🔍 AI Creator Studio 进程检查工具"
echo "=================================="

# 检查开发服务器进程
echo ""
echo "📊 开发服务器进程状态："
DEV_PROCESSES=$(ps aux | grep -E "(npm run dev|next dev)" | grep -v grep || true)
if [ -n "$DEV_PROCESSES" ]; then
    echo "⚠️  发现以下开发服务器进程："
    echo "$DEV_PROCESSES"
    echo ""
    echo "PID 列表："
    ps aux | grep -E "(npm run dev|next dev)" | grep -v grep | awk '{print $2}' | while read pid; do
        echo "  - PID: $pid (进程详情: ps -p $pid -o pid,ppid,cmd)"
    done
else
    echo "✅ 没有发现开发服务器进程"
fi

# 检查端口占用
echo ""
echo "📡 端口3000占用情况："
if lsof -ti:3000 > /dev/null 2>&1; then
    echo "⚠️  端口3000被以下进程占用："
    lsof -ti:3000 | xargs ps -p | grep -v PID
else
    echo "✅ 端口3000可用"
fi

# 检查后台进程数量
echo ""
echo "🔢 后台进程统计："
BG_COUNT=$(ps aux | grep -E "(npm run dev|next dev)" | grep -v grep | wc -l)
echo "当前运行的开发服务器进程数: $BG_COUNT"

if [ "$BG_COUNT" -gt 1 ]; then
    echo ""
    echo "⚠️  警告：检测到多个开发服务器进程！"
    echo "建议运行以下命令清理："
    echo "  ./scripts/start-dev.sh"
    echo ""
    echo "或者手动清理："
    echo "  pkill -f \"npm run dev\""
    echo "  pkill -f \"next dev\""
fi

# 检查缓存状态
echo ""
echo "📁 缓存状态："
if [ -d ".next" ]; then
    SIZE=$(du -sh .next 2>/dev/null | cut -f1)
    echo "✅ .next 目录存在 (大小: $SIZE)"
else
    echo "❌ .next 目录不存在"
fi

if [ -d "node_modules/.cache" ]; then
    echo "✅ node_modules/.cache 目录存在"
else
    echo "❌ node_modules/.cache 目录不存在"
fi

echo ""
echo "🏁 检查完成"