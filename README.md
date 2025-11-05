# PixAI Generation Extension for SillyTavern

SillyTavern 的 PixAI 图像生成扩展。

## 功能特性

- 🎨 使用 PixAI API 生成高质量动漫风格图像
- ⚙️ 支持自定义模型、Lora、负面提示词等参数
- 🔄 自动轮询任务状态，等待图像生成完成
- 💬 生成的图像自动添加到聊天记录

## 安装

1. 将此扩展文件夹复制到 SillyTavern 的扩展目录：
   ```
   SillyTavern/public/scripts/extensions/third-party/pixai_generation/
   ```

2. 重启 SillyTavern

## 配置

### 1. 启动代理服务器（Node.js 版本 - 无需 Python）

由于浏览器 CORS 限制，需要运行本地代理服务器。**现在使用 Node.js 版本，无需安装 Python！**

#### 方法 A：从扩展界面启动（推荐）

1. 打开 SillyTavern 的 Extensions 设置
2. 找到 "PixAI Generation" 扩展
3. 查看 "代理服务器状态" 区域
4. 点击 "检查" 按钮查看状态
5. 如果显示 "❌ 代理服务器未运行"，点击 "启动" 按钮
6. 按照提示手动运行 `start_proxy_node.bat`

#### 方法 B：手动启动

**Windows**:
```bash
# 双击运行
start_proxy_node.bat

# 或手动运行
node pixai_proxy.js
```

**确认代理运行**：
- 代理服务器地址：`http://127.0.0.1:5555`
- 健康检查：访问 `http://127.0.0.1:5555/health`
- 或在扩展界面点击 "检查" 按钮

**优势**：
- ✅ 无需 Python：使用 Node.js（SillyTavern 已包含）
- ✅ 更轻量：无需安装额外依赖
- ✅ 状态监控：扩展界面实时显示代理状态
- ✅ 一键检查：点击按钮即可检查代理是否运行

### 2. 设置 API 密钥

1. 在 SillyTavern 中打开 **Extensions** 设置
2. 找到 **PixAI Generation** 扩展
3. 输入你的 PixAI API 密钥
4. 配置其他参数（可选）

## 使用方法

### 基本用法

在聊天框中输入：

```
/pixai 1girl, white hair, blue eyes, smile
```

### 高级用法

使用命名参数自定义生成：

```
/pixai 1girl, white hair, blue eyes, smile --negative worst quality, low quality --width 768 --height 1024 --steps 30 --scale 7
```

### 可用参数

| 参数            | 说明       | 默认值       |
| --------------- | ---------- | ------------ |
| `--negative`    | 负面提示词 | 从设置中读取 |
| `--width`       | 图像宽度   | 512          |
| `--height`      | 图像高度   | 768          |
| `--steps`       | 采样步数   | 20           |
| `--scale`       | CFG Scale  | 6.0          |
| `--model`       | 模型 ID    | 从设置中读取 |
| `--lora`        | Lora ID    | 从设置中读取 |
| `--lora-weight` | Lora 权重  | 0.7          |

### 设置说明

#### 常见提示词前缀
- 自动添加到每次生成的提示词前面
- 默认值：`best quality, absurdres, masterpiece,`
- 示例：如果设置前缀为 `best quality, masterpiece,`，输入提示词 `1girl, smile`，实际发送的提示词为 `best quality, masterpiece, 1girl, smile`
- 留空则不添加前缀

#### 采样器 (Sampling Method)
扩展支持以下采样器：
- **Euler a** - 快速，适合简单图像
- **Euler** - 稳定的基础采样器
- **DPM++ 2M Karras** (默认) - 高质量，推荐使用
- **DPM++ SDE Karras** - 更多细节，速度较慢
- **DPM++ 2M SDE Karras** - 最高质量，最慢
- **DDIM** - 经典采样器
- **PLMS** - 快速采样器
- **UniPC** - 新型高效采样器

#### Lora 设置
- 勾选 "使用 Lora" 后才会应用 Lora 模型
- 支持添加多个 Lora（点击 "添加 Lora" 按钮）
- 每个 Lora 可以单独设置 ID 和权重
- Lora 权重范围：0.0 - 1.0（推荐 0.5 - 0.8）
- **注意**：请检查您的 PixAI 订阅层级以确定可以使用多少个 Lora

## 技术说明

### 为什么需要代理服务器？

浏览器的 CORS（跨域资源共享）安全策略阻止直接从网页调用外部 API。代理服务器作为中间层，绕过这个限制：

```
浏览器 → 本地代理 (127.0.0.1:5555) → PixAI API
```

### 文件说明

- `index.js` - 扩展主逻辑
- `settings.html` - 设置界面
- `manifest.json` - 扩展元数据
- `pixai_proxy.py` - 本地代理服务器
- `start_proxy.bat` - Windows 启动脚本
- `style.css` - 样式文件

## 依赖

### 扩展依赖
- SillyTavern 1.12.0+

### 代理服务器依赖
- Python 3.7+
- Flask
- Flask-CORS
- Requests

安装依赖：
```bash
pip install flask flask-cors requests
```

## 常见问题

### Q: 提示 "Failed to fetch"
**A:** 确保代理服务器正在运行（`python pixai_proxy.py`）

### Q: 提示 "API 密钥未设置"
**A:** 在 Extensions 设置中输入你的 PixAI API 密钥

### Q: 图像生成失败
**A:** 检查：
1. 代理服务器是否运行
2. API 密钥是否正确
3. 模型 ID 是否有效
4. 网络连接是否正常

### Q: 如何获取 PixAI API 密钥？
**A:** 访问 [PixAI 官网](https://pixai.art) 并在账户设置中生成 API 密钥

## 许可证

MIT License

## 作者

Created for SillyTavern community

