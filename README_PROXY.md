# PixAI 扩展使用说明

## 问题说明

由于浏览器的 CORS（跨域资源共享）安全限制，无法直接从 SillyTavern 前端调用 PixAI API。

## 解决方案

使用本地代理服务器来转发 API 请求。

## 使用步骤

### 1. 启动代理服务器

双击运行 `start_proxy.bat`

你应该看到：
```
========================================
🚀 PixAI 代理服务器启动中...
========================================
监听地址: http://127.0.0.1:5555
按 Ctrl+C 停止服务器
========================================
```

**重要：保持这个窗口打开！** 关闭窗口会停止代理服务器。

### 2. 配置 SillyTavern

1. 打开 SillyTavern
2. 进入 **Extensions** 设置
3. 找到 **PixAI Generation** 扩展
4. 在 "PixAI API 密钥 (API Key)" 输入框中输入你的 API 密钥
5. 配置其他参数（可选）

### 3. 生成图像

在聊天框中输入：

```
/pixai 1girl, white hair, blue eyes, smile
```

或使用完整参数：

```
/pixai 1girl, white hair, blue eyes, smile --negative worst quality, low quality --width 512 --height 768 --steps 20 --scale 7
```

## 测试命令

检查 API 密钥是否正确设置：

```
/pixai-test-key
```

## 常见问题

### Q: 提示 "Failed to fetch"
**A:** 确保代理服务器正在运行（`start_proxy.bat` 窗口应该是打开的）

### Q: 提示 "API 密钥未设置"
**A:** 在 Extensions 设置中输入你的 PixAI API 密钥

### Q: 图像生成失败
**A:** 检查：
1. 代理服务器是否运行
2. API 密钥是否正确
3. 模型 ID 是否有效
4. 网络连接是否正常

## 技术说明

- **代理服务器地址**: `http://127.0.0.1:5555`
- **代理端点**:
  - `POST /pixai/task` - 创建任务
  - `GET /pixai/task/<task_id>` - 查询任务状态
  - `GET /pixai/media/<url>` - 下载图片

## 依赖

- Python 3.7+
- Flask
- Flask-CORS
- Requests

（`start_proxy.bat` 会自动安装这些依赖）

