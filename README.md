# PixAI Generation Extension for SillyTavern

SillyTavern 的 PixAI 图像生成扩展。

## 功能特性

- 🎨 使用 PixAI API 生成高质量动漫风格图像
- ⚙️ 支持自定义模型、Lora、负面提示词等参数
- 🔄 自动轮询任务状态，等待图像生成完成
- 💬 生成的图像自动添加到聊天记录

## 安装

```url
https://github.com/leebert417-ops/pixai_generation.git
```

## 配置

### 1. 启动代理服务器

由于浏览器 CORS 限制，需要手动运行一个本地代理服务器。

#### 桌面端用户 (Windows/Mac/Linux)

1.  打开您的终端 (例如 `cmd`, `PowerShell`, 或 `Terminal`)。
2.  进入此扩展的目录：
    ```bash
    # 示例路径，请替换为您的实际路径
    cd SillyTavern/public/scripts/extensions/third-party/pixai_generation
    ```
3.  使用 Node.js 启动代理服务器：
    ```bash
    node pixai_proxy.js
    ```
4.  看到 "PixAI API 代理服务器已启动" 的提示后，**保持此终端窗口运行**。

#### 移动端用户 (Termux)

操作步骤与桌面端类似，但您需要在 Termux 中管理多个会话。

1.  打开 Termux，在一个会话中启动 SillyTavern 主程序。
2.  **新建一个会话** (点击左下角ESC右侧的三个横杠，然后点击 "New session")。
3.  在新的会话中，进入此扩展的目录。路径可能类似如下 (请根据您的实际路径修改):
    ```bash
    cd /storage/20BC-D5E4/public/scripts/extensions/third-party/pixai_generation
    ```
4.  使用 Node.js 启动代理服务器：
    ```bash
    node pixai_proxy.js
    ```
5.  看到 "PixAI API 代理服务器已启动" 的提示后，**保持此 Termux 会话在后台运行**。

### 2. 确认代理运行状态

1.  在 SillyTavern 中打开 **Extensions** 设置。
2.  找到 **PixAI Generation** 扩展。
3.  在“代理服务器状态”区域，点击 **<i class="fa-solid fa-rotate"></i> 检查** 按钮。
4.  如果代理已成功启动，您会看到一个“✅ 代理服务器运行正常！”的弹窗提示。

### 3. 设置 API 密钥

1.  在 **PixAI Generation** 扩展的设置中，输入你的 PixAI API 密钥。
2.  配置其他参数（可选）。

### 4. (可选) 配置自动生图模式

此模式可以让 AI 在回复中自行决定何时生成图片。

1.  在设置中，勾选 **“启用自动生图模式”**。
2.  (可选) 勾选 **“启用提示词注入”**，并修改下方的“提示词注入内容”，以指导 AI 如何使用图片标签。例如，告诉它：
    > 在你的回复中，你可以使用 `<pix prompt="图片描述">` 标签来请求生成一张图片。
3.  (可选) 如果您更改了图片标签的格式，请同步修改“图片标签正则表达式”以确保能够正确匹配。


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
| --- | --- | --- |
| `--negative` | 负面提示词 | 从设置中读取 |
| `--width` | 图像宽度 | 512 |
| `--height` | 图像高度 | 768 |
| `--steps` | 采样步数 | 20 |
| `--scale` | CFG Scale | 6.0 |
| `--model` | 模型 ID | 从设置中读取 |
| `--lora` | Lora ID | 从设置中读取 |
| `--lora-weight` | Lora 权重 | 0.7 |

### 设置说明

#### 常见提示词前缀

- 自动添加到每次生成的提示词前面
- 默认值：`best quality, absurdres, masterpiece,`
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
- `pixai_proxy.js` - 本地代理服务器 (Node.js)
- `style.css` - 样式文件

## 依赖

- SillyTavern 1.12.0+
- Node.js (SillyTavern 已自带，无需额外安装)

## 常见问题

### Q: 提示 "Failed to fetch" 或 "代理服务器未运行"

**A:** 请确保您已按照“配置”部分的说明，在终端中手动启动了 `pixai_proxy.js` 代理服务器，并且该终端窗口仍在运行。

### Q: 提示 "API 密钥未设置"

**A:** 在 Extensions 设置中输入你的 PixAI API 密钥。

### Q: 如何获取 PixAI API 密钥？

**A:** 访问 [PixAI 官网](https://pixai.art) 并在账户设置中生成 API 密钥。

## 许可证

MIT License

## 作者

niuma
Created for SillyTavern community
