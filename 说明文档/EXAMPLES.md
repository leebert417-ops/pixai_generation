# 使用示例

## 提示词前缀功能

### 示例 1：使用默认前缀

**设置：**
- 常见提示词前缀：`best quality, absurdres, masterpiece,`

**命令：**
```
/pixai 1girl, white hair, blue eyes, smile
```

**实际发送的提示词：**
```
best quality, absurdres, masterpiece, 1girl, white hair, blue eyes, smile
```

---

### 示例 2：自定义前缀

**设置：**
- 常见提示词前缀：`8k wallpaper, highly detailed, ultra-detailed,`

**命令：**
```
/pixai landscape, mountains, sunset
```

**实际发送的提示词：**
```
8k wallpaper, highly detailed, ultra-detailed, landscape, mountains, sunset
```

---

### 示例 3：不使用前缀

**设置：**
- 常见提示词前缀：（留空）

**命令：**
```
/pixai 1girl, white hair, blue eyes, smile
```

**实际发送的提示词：**
```
1girl, white hair, blue eyes, smile
```

---

## 采样器选择

### 快速生成（Euler a）

**设置：**
- 采样器：Euler a
- 采样步数：15

**适用场景：**
- 快速预览
- 简单构图
- 测试提示词

---

### 高质量生成（DPM++ 2M Karras）

**设置：**
- 采样器：DPM++ 2M Karras
- 采样步数：20-30

**适用场景：**
- 正式生成
- 复杂场景
- 高质量输出

---

### 最高质量（DPM++ 2M SDE Karras）

**设置：**
- 采样器：DPM++ 2M SDE Karras
- 采样步数：30-50

**适用场景：**
- 最终作品
- 细节丰富的图像
- 不在意生成时间

---

## Lora 使用

### 示例 1：不使用 Lora

**设置：**
- 使用 Lora：❌ 未勾选

**命令：**
```
/pixai 1girl, white hair, blue eyes, smile
```

**效果：**
- 使用基础模型生成
- 不应用任何 Lora

---

### 示例 2：使用单个 Lora

**设置：**
- 使用 Lora：✅ 已勾选
- Lora 1：
  - ID：`1744880666293972790`
  - 权重：`0.7`

**命令：**
```
/pixai 1girl, white hair, blue eyes, smile
```

**效果：**
- 应用指定的 Lora 模型
- 权重为 0.7（70% 强度）

---

### 示例 3：使用多个 Lora

**设置：**
- 使用 Lora：✅ 已勾选
- Lora 1：
  - ID：`1744880666293972790`（角色 Lora）
  - 权重：`0.8`
- Lora 2：
  - ID：`1234567890123456789`（风格 Lora）
  - 权重：`0.5`

**命令：**
```
/pixai 1girl, white hair, blue eyes, smile, detailed background
```

**效果：**
- 同时应用两个 Lora
- 角色 Lora 权重 0.8，风格 Lora 权重 0.5
- 生成结果会融合两个 Lora 的特征

**注意：**
- 请检查您的 PixAI 订阅层级
- 免费用户可能只能使用 1 个 Lora
- 付费用户可能支持 2-3 个或更多 Lora

---

## 完整示例

### 高质量人物生成（单 Lora）

**设置：**
- 常见提示词前缀：`best quality, absurdres, masterpiece,`
- 采样器：DPM++ 2M Karras
- 采样步数：25
- CFG Scale：7.0
- 使用 Lora：✅ 已勾选
- Lora 1：
  - ID：`1744880666293972790`
  - 权重：`0.7`

**命令：**
```
/pixai 1girl, white hair, blue eyes, smile, detailed face, beautiful lighting --negative worst quality, low quality, blurry --width 512 --height 768
```

**实际参数：**
- 提示词：`best quality, absurdres, masterpiece, 1girl, white hair, blue eyes, smile, detailed face, beautiful lighting`
- 负面提示词：`worst quality, low quality, blurry`
- 尺寸：512x768
- 采样器：DPM++ 2M Karras
- 采样步数：25
- CFG Scale：7.0
- Lora：应用 1 个（ID: 1744880666293972790, 权重: 0.7）

---

### 高质量人物生成（多 Lora）

**设置：**
- 常见提示词前缀：`best quality, absurdres, masterpiece,`
- 采样器：DPM++ 2M Karras
- 采样步数：30
- CFG Scale：7.5
- 使用 Lora：✅ 已勾选
- Lora 1：
  - ID：`1744880666293972790`（角色风格）
  - 权重：`0.8`
- Lora 2：
  - ID：`1234567890123456789`（画风）
  - 权重：`0.6`

**命令：**
```
/pixai 1girl, white hair, blue eyes, smile, detailed face, beautiful lighting --negative worst quality, low quality, blurry --width 512 --height 768
```

**实际参数：**
- 提示词：`best quality, absurdres, masterpiece, 1girl, white hair, blue eyes, smile, detailed face, beautiful lighting`
- 负面提示词：`worst quality, low quality, blurry`
- 尺寸：512x768
- 采样器：DPM++ 2M Karras
- 采样步数：30
- CFG Scale：7.5
- Lora：应用 2 个
  - Lora 1: ID: 1744880666293972790, 权重: 0.8
  - Lora 2: ID: 1234567890123456789, 权重: 0.6

---

### 快速测试生成

**设置：**
- 常见提示词前缀：（留空）
- 采样器：Euler a
- 采样步数：15
- CFG Scale：6.0
- 使用 Lora：❌ 未勾选

**命令：**
```
/pixai 1girl, smile --width 512 --height 512 --steps 15
```

**实际参数：**
- 提示词：`1girl, smile`
- 尺寸：512x512
- 采样器：Euler a
- 采样步数：15
- CFG Scale：6.0
- Lora：不应用

---

### 风景图生成

**设置：**
- 常见提示词前缀：`8k wallpaper, highly detailed, photorealistic,`
- 采样器：DPM++ 2M SDE Karras
- 采样步数：30
- CFG Scale：7.5
- 使用 Lora：❌ 未勾选

**命令：**
```
/pixai landscape, mountains, sunset, clouds, lake --negative low quality, blurry --width 768 --height 512
```

**实际参数：**
- 提示词：`8k wallpaper, highly detailed, photorealistic, landscape, mountains, sunset, clouds, lake`
- 负面提示词：`low quality, blurry`
- 尺寸：768x512（横向）
- 采样器：DPM++ 2M SDE Karras
- 采样步数：30
- CFG Scale：7.5
- Lora：不应用

---

## 推荐配置

### 人物肖像
- 前缀：`best quality, masterpiece, highly detailed,`
- 采样器：DPM++ 2M Karras
- 步数：25-30
- CFG：6.5-7.5
- 尺寸：512x768 或 768x1024

### 全身人物
- 前缀：`best quality, masterpiece,`
- 采样器：DPM++ 2M Karras
- 步数：20-25
- CFG：6.0-7.0
- 尺寸：512x768

### 风景
- 前缀：`8k wallpaper, highly detailed,`
- 采样器：DPM++ 2M SDE Karras
- 步数：25-35
- CFG：7.0-8.0
- 尺寸：768x512 或 1024x512

### 快速测试
- 前缀：（留空）
- 采样器：Euler a
- 步数：15-20
- CFG：6.0
- 尺寸：512x512

