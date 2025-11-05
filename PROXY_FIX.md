# 代理服务器 CORS 修复说明

## 问题描述

之前遇到的 CORS 错误：
```
Access to fetch at 'http://127.0.0.1:5555/pixai/task' from origin 'http://127.0.0.1:8000' 
has been blocked by CORS policy: Request header field x-api-key is not allowed by 
Access-Control-Allow-Headers in preflight response.
```

## 修复内容

### 1. 添加 `x-api-key` 到允许的请求头

**文件**: `pixai_proxy.js` 第 96 行

**修改前**:
```javascript
'Access-Control-Allow-Headers': 'Content-Type, Authorization',
```

**修改后**:
```javascript
'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
```

### 2. 支持 `/pixai/*` 路径转发

**文件**: `pixai_proxy.js` 第 112-134 行

**新增功能**:
- 自动将 `/pixai/*` 路径转换为 `/v1/*`
- 支持扩展使用的 `/pixai/task` 路径
- 保持向后兼容 `/v1/*` 路径

**代码**:
```javascript
// 将 /pixai/* 转换为 /v1/*
if (path.startsWith('/pixai/')) {
  apiPath = path.replace('/pixai/', '/v1/');
}

if (path.startsWith('/v1/') || path.startsWith('/pixai/')) {
  // 转发请求
  proxyRequest(apiPath, method, req.headers, body, res);
}
```

## 测试步骤

### 1. 重启代理服务器

**停止旧进程**:
```bash
# 查找进程
netstat -ano | findstr :5555

# 停止进程（替换 PID）
taskkill /F /PID <PID>
```

**启动新代理**:
```bash
node pixai_proxy.js
```

### 2. 测试 CORS 预检请求

```bash
curl -X OPTIONS http://127.0.0.1:5555/pixai/task \
  -H "Origin: http://127.0.0.1:8000" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: x-api-key,content-type" \
  -v
```

**预期响应**:
```
HTTP/1.1 200 OK
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, x-api-key
```

### 3. 测试路径转发

```bash
# 测试 /pixai/task 路径
curl http://127.0.0.1:5555/pixai/task \
  -X POST \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

**预期行为**:
- 代理服务器日志显示: `POST /pixai/task -> /v1/task`
- 请求被转发到 `https://api.pixai.art/v1/task`

### 4. 在 SillyTavern 中测试

1. **刷新浏览器**: `Ctrl+Shift+R`
2. **打开扩展设置**: Extensions → PixAI Generation
3. **检查代理状态**: 点击 "检查" 按钮
4. **测试生成图像**:
   ```
   /pixai 1girl, white hair, blue eyes, smile
   ```

## 当前状态

✅ **代理服务器已修复并重启**
- 终端 ID: 44
- 监听地址: `http://127.0.0.1:5555`
- 健康检查: `http://127.0.0.1:5555/health`

✅ **已部署到 SillyTavern**
- 文件已复制到扩展目录
- 可以直接使用

## 下一步

1. **刷新 SillyTavern 浏览器**
2. **测试图像生成功能**
3. **如果仍有问题，检查**:
   - API 密钥是否正确
   - 浏览器控制台错误信息
   - 代理服务器日志输出

## 技术细节

### CORS 预检请求流程

1. **浏览器发送 OPTIONS 请求**:
   ```
   OPTIONS /pixai/task HTTP/1.1
   Origin: http://127.0.0.1:8000
   Access-Control-Request-Method: POST
   Access-Control-Request-Headers: x-api-key, content-type
   ```

2. **代理服务器响应**:
   ```
   HTTP/1.1 200 OK
   Access-Control-Allow-Origin: *
   Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
   Access-Control-Allow-Headers: Content-Type, Authorization, x-api-key
   ```

3. **浏览器发送实际请求**:
   ```
   POST /pixai/task HTTP/1.1
   x-api-key: Bearer xxx
   Content-Type: application/json
   ```

### 路径转换逻辑

```
客户端请求: /pixai/task
    ↓
代理服务器: 检测到 /pixai/ 前缀
    ↓
转换路径: /pixai/task → /v1/task
    ↓
转发到: https://api.pixai.art/v1/task
```

## 常见问题

### Q: 为什么需要代理服务器？
A: 浏览器的 CORS 安全策略阻止直接访问 PixAI API。代理服务器在本地运行，添加必要的 CORS 头，允许浏览器访问。

### Q: 为什么使用 `/pixai/*` 而不是 `/v1/*`？
A: 扩展代码中使用 `PIXAI_PROXY_BASE = 'http://127.0.0.1:5555/pixai'`，为了保持兼容性，代理服务器支持两种路径格式。

### Q: 可以修改扩展代码直接使用 `/v1/*` 吗？
A: 可以，但需要修改 `index.js` 中的 `PIXAI_PROXY_BASE` 常量。当前方案更灵活，支持两种格式。

### Q: Node.js 代理比 Python 代理有什么优势？
A: 
- ✅ 无需安装 Python 和 pip 依赖
- ✅ 使用 SillyTavern 已有的 Node.js 环境
- ✅ 启动更快，资源占用更少
- ✅ 代码更简洁（使用 Node.js 内置模块）

---

**修复完成时间**: 2025-11-05  
**代理服务器版本**: Node.js v22.18.0  
**状态**: ✅ 运行中

