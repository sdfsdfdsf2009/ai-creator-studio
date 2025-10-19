# 开发服务器管理规范

## 🚨 问题背景

在开发过程中，我们发现多个开发服务器进程同时运行导致的问题：
- 端口冲突
- 服务器不稳定
- 链接失败
- 资源浪费

## 🛠️ 解决方案

### 1. 使用专用启动脚本

**推荐启动方式：**
```bash
# 正常启动
./scripts/start-dev.sh

# 启动前清理缓存
./scripts/start-dev.sh --clean
```

**脚本功能：**
- 自动检测并终止现有进程
- 释放端口3000
- 可选缓存清理
- 前台运行，避免后台进程积累

### 2. 进程监控

**检查进程状态：**
```bash
./scripts/check-processes.sh
```

**手动清理命令：**
```bash
# 温和终止
pkill -f "npm run dev"
pkill -f "next dev"

# 强制终止
pkill -9 -f "npm run dev"
pkill -9 -f "next dev"

# 清理端口占用
lsof -ti:3000 | xargs kill -9
```

### 3. Claude助手使用规范

**禁止行为：**
- ❌ 频繁重启开发服务器
- ❌ 使用 `run_in_background: true` 参数
- ❌ 未清理现有进程就启动新服务器
- ❌ 滥用缓存清理命令

**推荐行为：**
- ✅ 使用专用启动脚本
- ✅ 前台运行服务器
- ✅ 定期检查进程状态
- ✅ 遇到问题时先诊断再重启

## 📋 最佳实践

### 开发启动流程
1. **检查现有进程**：`./scripts/check-processes.sh`
2. **启动服务器**：`./scripts/start-dev.sh`
3. **验证运行**：访问 http://localhost:3000/zh
4. **停止服务器**：按 `Ctrl+C`

### 问题排查流程
1. **检查进程状态**：`./scripts/check-processes.sh`
2. **清理冲突进程**：`pkill -f "npm run dev"`
3. **清理缓存（如需要）**：`./scripts/start-dev.sh --clean`
4. **重新启动**：`./scripts/start-dev.sh`

### 缓存管理
- **仅在必要时清理缓存**（构建问题、依赖冲突）
- **使用脚本的 --clean 参数**而不是手动删除
- **清理前确认没有重要数据**

## 🔧 脚本说明

### start-dev.sh
- **功能**：安全的开发服务器启动
- **参数**：`--clean` 启动前清理缓存
- **输出**：详细的启动日志和提示信息

### check-processes.sh
- **功能**：监控进程状态和资源使用
- **输出**：进程列表、端口状态、缓存信息
- **建议**：定期运行以检查系统健康状态

## 📝 故障排除

### 常见问题

**Q: 端口3000被占用**
```bash
lsof -ti:3000 | xargs kill -9
./scripts/start-dev.sh
```

**Q: 多个进程冲突**
```bash
pkill -9 -f "npm run dev"
./scripts/start-dev.sh
```

**Q: 构建问题**
```bash
./scripts/start-dev.sh --clean
```

**Q: 页面无法访问**
```bash
./scripts/check-processes.sh
# 查看进程状态，根据输出进行相应处理
```

## 🎯 预防措施

1. **始终使用启动脚本**
2. **避免后台运行开发服务器**
3. **定期检查进程状态**
4. **及时清理僵尸进程**
5. **记录问题和解决方案**

## 📞 支持

如果遇到问题：
1. 运行 `./scripts/check-processes.sh` 获取诊断信息
2. 查看本文档的故障排除部分
3. 重启开发服务器：`./scripts/start-dev.sh --clean`

---
*最后更新：2025-10-19*
*维护者：Claude Code Assistant*