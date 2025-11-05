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

### 1. 启动代理服务器

由于浏览器 CORS 限制，需要运行本地代理服务器：

```bash
python pixai_proxy.py
```

或双击运行 `start_proxy.bat`（Windows）

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

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--negative` | 负面提示词 | 从设置中读取 |
| `--width` | 图像宽度 | 512 |
| `--height` | 图像高度 | 768 |
| `--steps` | 采样步数 | 20 |
| `--scale` | CFG Scale | 6.0 |
| `--model` | 模型 ID | 从设置中读取 |
| `--lora` | Lora ID | 从设置中读取 |
| `--lora-weight` | Lora 权重 | 0.7 |

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

