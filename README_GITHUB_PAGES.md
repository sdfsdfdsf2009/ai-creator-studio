# AI Creator Studio - 国内环境部署指南

## 🌟 项目简介

AI Creator Studio 是一个基于 Next.js 13.5 + React 18 + TypeScript 的AI图片和视频生成平台，特别针对国内环境进行了优化。

## 🇨🇳 国内环境部署

### 方法1：GitHub Pages (推荐)

#### 前置要求
- GitHub账号
- Git 工具

#### 部署步骤

1. **克隆仓库**
   ```bash
   git clone https://github.com/sdfsdfdsf2009/ai-creator-studio.git
   cd ai-creator-studio
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **构建静态版本**
   ```bash
   npm run build:static
   ```

4. **启用 GitHub Pages**
   - 访问您的GitHub仓库
   - 进入 **Settings** → **Pages**
   - Source 选择 **Deploy from a branch**
   - Branch 选择 **main**，Folder 选择 **/(root)**
   - 点击 **Save**

5. **自动部署**
   ```bash
   npm run deploy:gh-pages
   ```

6. **访问应用**
   - 访问地址: `https://sdfsdfdsf2009.github.io/ai-creator-studio`

### 方法2：国内静态托管服务

#### Gitee Pages
1. 将代码同步到Gitee
2. 启用Gitee Pages服务
3. 配置自动部署

#### Coding Pages
1. 使用Coding账号导入GitHub仓库
2. 启用静态网站托管服务
3. 配置自动构建

#### Netlify (国内优化)
1. 访问 [Netlify](https://www.netlify.com/)
2. 使用GitHub账号登录
3. 导入仓库并配置国内CDN
4. 部署后获得 `.netlify.app` 域名

## 🛠️ 开发环境设置

### 本地开发
```bash
# 安装依赖
npm install

# 配置环境变量
cp .env.example .env.local

# 启动开发服务器
npm run dev
```

### 环境变量配置
在 `.env.local` 文件中添加：
```env
# API配置
NEXT_PUBLIC_API_URL=https://your-api-server.com

# 国内优化配置
NEXT_PUBLIC_CDN_URL=https://cdn.jsdelivr.net/npm
```

## 🎯 功能特性

### ✅ 已实现功能
- 🌐 多语言支持 (中文/英文)
- 🎨 AI图片生成界面
- 📚 素材库管理
- 📊 数据分析仪表板
- 📋 模板系统
- ⚙️ 设置管理

### 🔧 技术栈
- **框架**: Next.js 13.5 (App Router)
- **UI**: React 18 + TypeScript
- **样式**: Tailwind CSS
- **国际化**: next-intl
- **状态管理**: Zustand + TanStack Query

### 🌍 国内环境优化
- ✅ 静态导出配置
- ✅ GitHub Pages 优化
- ✅ CDN 图片域名配置
- ✅ CORS 头部配置
- ✅ 国内访问优化

## 📱 访问地址

### GitHub Pages 部署
- **主要地址**: https://sdfsdfdsf2009.github.io/ai-creator-studio

### 本地开发
- **开发环境**: http://localhost:3000

## 🔧 自定义配置

### 修改部署路径
如果需要修改部署路径，编辑 `next.config.js`：
```javascript
module.exports = {
  basePath: '/your-repo-name',
  assetPrefix: '/your-repo-name/',
  // ...
}
```

### 环境变量
创建 `.env.local` 文件：
```env
NEXT_PUBLIC_API_KEY=your_api_key
NEXT_PUBLIC_BASE_URL=https://your-api-server.com
```

## 📝 开发指南

### 添加新功能
1. 在 `src/app/[locale]/` 下创建新页面
2. 在 `src/components/` 下添加组件
3. 在 `src/lib/` 下添加工具函数

### API集成
1. 在 `src/lib/api/` 下创建API文件
2. 使用 TanStack Query 进行数据获取
3. 配置环境变量

## 🐛 常见问题

### Q: 静态版本功能有限？
A: 静态版本主要展示UI界面，API调用需要后端服务支持。

### Q: 国内访问速度慢？
A: 项目已配置CDN优化，建议使用国内CDN服务。

### Q: 如何配置自定义域名？
A: 在GitHub Pages设置中添加自定义域名。

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 发起 Pull Request

## 📄 许可证

MIT License

---

**🎉 现在您可以在国内环境轻松访问和使用 AI Creator Studio！**