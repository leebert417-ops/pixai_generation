# 更新日志

## [最新版本] - 2025-11-05

### 🚀 重大更新

#### Node.js 代理服务器（无需 Python）
- 使用 Node.js 重写代理服务器，无需安装 Python
- 利用 SillyTavern 已有的 Node.js 环境
- 更轻量，无需额外依赖（Flask, Flask-CORS）
- 提供 `pixai_proxy.js` 和 `start_proxy_node.bat`

#### 代理服务器状态监控
- 在扩展设置界面添加代理服务器状态显示
- 实时检查代理服务器是否运行
- 一键检查按钮
- 启动按钮（提示用户手动运行脚本）
- 自动在扩展加载时检查代理状态

### ✨ 新增功能

#### 1. 常见提示词前缀
- 添加 "常见提示词前缀" 设置
- 自动在每次生成的提示词前添加常用质量标签
- 默认值：`best quality, absurdres, masterpiece,`
- 可自定义或留空不使用

#### 2. 采样器选择
- 添加了采样器下拉菜单，支持 8 种常见采样器：
  - Euler a
  - Euler
  - DPM++ 2M Karras (默认)
  - DPM++ SDE Karras
  - DPM++ 2M SDE Karras
  - DDIM
  - PLMS
  - UniPC

#### 3. 多 Lora 支持
- 支持添加多个 Lora（点击 "添加 Lora" 按钮）
- 每个 Lora 可以单独设置 ID 和权重
- 可以删除不需要的 Lora
- 添加 "使用 Lora" 复选框控制是否应用 Lora
- 添加订阅层级提示信息

### 🔧 改进

- 优化设置界面布局
- 改进设置项的组织结构
- 添加更清晰的分组（默认参数 / Lora 设置）

### 📝 文档更新

- 更新 README.md，添加采样器说明
- 添加 Lora 设置使用说明
- 创建 CHANGELOG.md 记录更新历史

---

## [初始版本]

### ✨ 功能

- 基本的 PixAI 图像生成功能
- 支持自定义提示词、负面提示词
- 支持调整图像尺寸、采样步数、CFG Scale
- 支持模型和 Lora 选择
- 本地代理服务器解决 CORS 问题
- 自动轮询任务状态
- 生成的图像自动添加到聊天记录

