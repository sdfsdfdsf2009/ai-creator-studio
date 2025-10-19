# Next.js 开发故障排除指南

## 🚨 多服务器实例问题的噩梦解决方案

### 症状
- 多个 Next.js 开发服务器实例同时运行
- 端口冲突（3000, 3001, 3002）
- 按钮无响应但页面正常加载
- JavaScript 编译错误导致功能失效
- 清理缓存后问题仍然存在

### 根本原因
- 多个开发服务器实例相互冲突
- 损坏的缓存导致编译错误
- 缺少关键文件（如设置页面）
- 组件中的配置错误（如缺少 Link 包装）

### 立即解决方案

#### 1. 强制清理所有进程（最有效的方法）
```bash
# 终极解决方案 - 强制杀死所有相关进程
pkill -9 -f "node"
pkill -9 -f "npm"
pkill -9 -f "next dev"

# 检查并杀死端口占用
lsof -ti:3000,3001,3002 | xargs kill -9 2>/dev/null || echo "端口清理完成"
```

#### 2. 完全清理所有缓存
```bash
# 清理 Next.js 缓存
rm -rf .next

# 清理 npm 缓存
rm -rf node_modules/.cache

# 清理构建缓存
rm -rf dist
rm -rf .turbo
```

#### 3. 重新启动单一服务器
```bash
# 确保在正确的目录
cd /Users/lidong/Desktop/code/ai_creator_studio

# 启动单一开发服务器
npm run dev
```

### 预防措施

#### 1. 开发环境管理
```bash
# 创建启动脚本
#!/bin/bash
# 文件名: start-dev.sh

echo "🔧 清理开发环境..."

# 停止所有相关进程
pkill -9 -f "npm run dev" 2>/dev/null
pkill -9 -f "next dev" 2>/dev/null

# 清理缓存
rm -rf .next

# 启动开发服务器
echo "🚀 启动开发服务器..."
npm run dev
```

#### 2. 使用进程管理工具
```bash
# 安装进程管理工具
npm install -g concurrently
npm install -g kill-port

# 创建 package.json 脚本
"scripts": {
  "dev:clean": "kill-port 3000 && kill-port 3001 && rm -rf .next && npm run dev",
  "dev:safe": "npm run dev:clean"
}
```

#### 3. 服务器配置优化
```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // 避免端口冲突
  experimental: {
    serverComponentsExternalPackages: []
  },

  // 开发模式优化
  swcMinify: true,

  // 环境变量配置
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  }
}

module.exports = nextConfig
```

### 常见问题快速诊断

#### 问题1: 按钮无响应
**症状：** 页面加载正常，但点击按钮无反应
**解决方案：**
1. 检查浏览器控制台是否有JavaScript错误
2. 确认按钮被 `<Link>` 包装，而不是裸 `<Button>`
3. 验证组件没有语法错误

#### 问题2: 404 页面错误
**症状：** 访问特定页面显示404
**解决方案：**
1. 检查文件路径是否正确（`src/app/[locale]/settings/page.tsx`）
2. 确认文件存在且有正确的导出
3. 检查文件名是否正确（`page.tsx`）

#### 问题3: 编译错误
**症状：** 服务器显示编译错误
**解决方案：**
1. 检查语法错误（特别是JSX）
2. 确认依赖已安装（`npm install`）
3. 检查文件路径是否正确

#### 问题4: 端口冲突
**症状：** 服务器启动时提示端口已占用
**解决方案：**
1. 使用 `lsof -i :端口号` 查看占用进程
2. 杀死占用进程或使用不同端口
3. 考虑使用环境变量配置端口

### 调试工具和脚本

#### 1. 开发环境启动脚本
```bash
#!/bin/bash
# save as: ./scripts/clean-start.sh

echo "🔧 AI Creator Studio 开发环境清理"
echo "====================================="

# 强制停止所有相关进程
echo "📛 停止所有开发服务器..."
pkill -9 -f "npm run dev" 2>/dev/null || true
pkill -9 -f "next dev" 2>/dev/null || true
pkill -9 -f "node.*next" 2>/dev/null || true

# 清理端口
echo "🔌 清理端口占用..."
lsof -ti:3000,3001,3002 | xargs kill -9 2>/dev/null || true

# 清理缓存
echo "🧹 清理所有缓存..."
rm -rf .next 2>/dev/null || true
rm -rf node_modules/.cache 2>/dev/null || true

# 重新安装依赖（如果需要）
echo "📦 检查依赖..."
if [ ! -d "node_modules" ]; then
    echo "⬇️ 安装依赖..."
    npm install
fi

echo "🚀 启动开发服务器..."
echo "====================================="
npm run dev
```

#### 2. 快速诊断页面
```tsx
// src/app/[locale]/diagnostic/page.tsx
'use client'

export default function DiagnosticPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">🔍 系统诊断</h1>

      <div className="space-y-4">
        <div className="p-4 border rounded">
          <h2 className="text-xl font-semibold">JavaScript 测试</h2>
          <button
            onClick={() => {
              console.log('✅ JavaScript 工作正常')
              alert('JavaScript 功能正常')
            }}
            className="bg-green-500 text-white px-4 py-2 rounded"
          >
            测试 JavaScript
          </button>
        </div>

        <div className="p-4 border rounded">
          <h2 className="text-xl font-semibold">导航测试</h2>
          <a href="/zh/settings" className="inline-block">
            <button className="bg-blue-500 text-white px-4 py-2 rounded">
              测试设置页面链接
            </button>
          </a>
        </div>

        <div className="p-4 border rounded">
          <h2 className="text-xl font-semibold">环境信息</h2>
          <pre className="text-sm bg-gray-100 p-2 rounded">
            {JSON.stringify({
              userAgent: navigator.userAgent,
              timestamp: new Date().toISOString(),
              href: window.location.href
            }, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  )
}
```

### 必须检查的项目清单

#### 开发前检查
- [ ] 确保只有一个终端窗口运行开发服务器
- [ ] 检查是否有其他 `npm run dev` 进程在运行
- [ ] 验证端口3000没有被占用
- [ ] 确认所有依赖已正确安装

#### 部署前检查
- [ ] 清理所有开发缓存
- [ ] 运行生产构建测试
- [ ] 检查环境变量配置
- [ ] 验证所有路由正常工作

### 紧急恢复方案

如果遇到无法解决的问题，使用以下步骤：

1. **完全重置开发环境**
```bash
cd /Users/lidong/Desktop/code/ai_creator_studio

# 删除所有可能引起问题的目录
rm -rf .next
rm -rf node_modules
rm -rf package-lock.json

# 重新安装所有依赖
npm install

# 重新启动
npm run dev
```

2. **从版本控制恢复**
```bash
# 如果使用git
git reset --hard HEAD
git clean -fd

# 重新安装依赖并启动
npm install && npm run dev
```

### 联系信息和支持

如果按照本指南仍然无法解决问题：

1. 记录具体的错误信息和控制台输出
2. 截图展示问题现象
3. 列出已经尝试过的解决方案
4. 提供您的系统环境和版本信息

**记住：** 多服务器实例问题是 Next.js 开发中最常见也最麻烦的问题之一，按照本指南操作可以避免90%的相关问题。

---

*最后更新：2025-10-19 - 基于实际调试经验整理*