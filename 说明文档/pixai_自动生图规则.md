# 规则：前端界面与图片生成 (V4 - 浮动透明版)

当在任何一个角色在剧情中使用手机/电脑等电子设备，或出现可生成app/程序等任何前端界面的机会时，请综合运用HTML构建结构，CSS进行美化，并核心使用JavaScript驱动交互和动态内容，共同写出当前角色使用的前端界面。

## 1. HTML/CSS/JS 核心要求

- **布局与比例 (核心):** 必须严格模仿现实 APP 的布局和尺寸比例（如小红书、微博）。默认适配手机竖屏。
- **美化风格 (V4 关键):**
    - **页面背景必须透明:** 必须在 CSS 中设置 `html, body { background-color: transparent; }`。
    - **内容必须使用容器:** 所有 UI 元素必须包裹在一个单独的 `<div>` 容器中 (例如 `<div class="app-container">`)。
    - **容器风格:** 这个容器 `div` 必须有深色背景 (如 `#1a1a1a`)、圆角 (`border-radius`) 和 `overflow: hidden`，以创造“浮动”的APP效果。
    - **禁止:** 绝对禁止使用白色背景或阴影效果。
- **图片尺寸限制:** 所有通过 `<pix>` 标签生成的图片尺寸固定为 `512x768` (竖版/肖像)。在设计界面时，请务必适配此尺寸。
- **代码块:** 生成的所有 HTML 代码必须用代码块包裹。

## 2. 在 HTML 中插入图片的核心规则

当你需要在创作的 HTML 界面中插入图片时，**绝对禁止**使用标准的 `<img>` 标签。你**必须**使用拓展提供的特殊 `<pix>` 标签来请求图片。它的模板是：
`<pix prompt="{英文图片描述}">`

## 3. 完整示例

以下是一个完整的 HTML 示例，展示了如何构建一个带有图片帖子的个人主页。

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>个人主页</title>
    <style>
        html, body {
            background-color: transparent; /* V4 关键：透明背景 */
        }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            color: #e0e0e0;
        }
        .app-container {
            background-color: #1a1a1a; /* V4 关键：深色容器背景 */
            border-radius: 15px;       /* V4 关键：圆角 */
            overflow: hidden;          /* V4 关键：内容裁剪 */
            width: 360px;
            max-width: 90%;
            padding: 20px;
            text-align: center;
        }
        h1, h2 {
            color: #61dafb;
            margin-bottom: 15px;
        }
        p {
            margin-bottom: 15px;
            line-height: 1.6;
        }
        /* 图片将被自动替换到这里，并应用此样式 */
        img {
            max-width: 100%;
            height: auto;
            border-radius: 8px;
            display: block;
            margin: 15px auto;
        }
    </style>
</head>
<body>
    <div class="app-container">
        <h1>我的个人主页</h1>
        <p>欢迎来到我的个人空间！</p>

        <div class="post">
            <h2>今日分享</h2>
            <p>今天天气真好，拍了一张很棒的照片！</p>
            
            <!-- PixAI 自动生图标签 -->
            <pix prompt="a beautiful landscape with a clear blue sky and green trees, anime style, vibrant colors"></pix>
            
            <p>希望大家喜欢！</p>
        </div>

        <p>更多内容敬请期待！</p>
    </div>
</body>
</html>
```

## 4. 重要提醒

- 你只需要正确地放置 `<pix>` 标签即可，拓展会自动处理图片的生成和替换。
- 所有生成的图片尺寸固定为 `512x768` (竖版/肖像)，请务必围绕此尺寸进行布局设计。
- **一个 HTML 页面中只允许出现一个 `<pix>` 标签。**