# 使用指南

## 目录

- [快速开始](#快速开始)
- [语音生成详解](#语音生成详解)
- [图片生成详解](#图片生成详解)
- [历史生成记录](#历史生成记录)
- [音色管理](#音色管理)
- [批量生成脚本](#批量生成脚本)

---

## 快速开始

### 环境要求

- Node.js >= 18
- MySQL >= 8.0
- MiniMax API Key（需开通语音/图片生成权限）

### 安装步骤

1. **安装依赖**

```bash
npm run install:all
```

2. **配置环境变量**

创建 `.env` 文件：

```env
API_KEY=your_api_key_here
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=minimax
PORT=3000
```

3. **启动服务**

```bash
# 后端服务
npm run dev

# 前端（另一个终端）
cd client && npm run dev
```

4. **访问应用**

打开 http://localhost:5173

---

## 语音生成详解

### 1. 选择音色

系统支持三类音色：

| 类型 | 说明 | 删除支持 |
|------|------|---------|
| 系统音色 | MiniMax 预置音色 | 否 |
| 克隆音色 | 通过音频复刻的音色 | 是 |
| 生成音色 | AI 生成的全新音色 | 是 |

**常用系统音色 ID：**

中文：
- `moss_audio_ce44fc67-7ce3-11f0-8de5-96e35d26fb85`
- `Chinese (Mandarin)_Lyrical_Voice`
- `Chinese (Mandarin)_HK_Flight_Attendant`

英文：
- `English_Graceful_Lady`
- `English_Insightful_Speaker`
- `English_radiant_girl`

日文：
- `Japanese_Whisper_Belle`

### 2. 文本输入

- 最大长度：10000 字符
- 段落切换：使用换行符
- 停顿控制：`<#x#>` 标记，x 为秒数（0.01~99.99）
- 语气词标签（仅 speech-2.8-hd/turbo）：
  - `(laughs)` `(chuckle)` `(coughs)` `(breath)` `(sighs)` 等

### 3. 参数配置

| 参数 | 默认值 | 取值范围 | 说明 |
|------|--------|---------|------|
| 比特率 | 128000 | 64000~320000 | 音频质量 |
| 采样率 | 32000 | 16000~48000 | 音频采样率 |
| 音频格式 | mp3 | mp3/wav/flac | 输出格式 |
| 语速 | 1.0 | 0.5~2.0 | 语速倍率 |
| 音量 | 1.0 | 0~10 | 音量大小 |
| 音调 | 0 | -12~12 | 语调调整 |

### 4. 情感控制

可选情感：happy、sad、angry、fearful、disgusted、surprised、calm、fluent、whisper

> 注意：whisper 和 fluent 仅对 speech-2.6-turbo/hd 模型生效

### 5. 语言增强

支持 30+ 种语言增强，包括：
- 中文、英语、日语、韩语
- 阿拉伯语、俄语、西班牙语、法语
- 德语、葡萄牙语、土耳其语、荷兰语
- 越南语、印尼语、泰语、波兰语
- 等等...

### 界面示意

**语音生成 - 选择音色和输入文本：**

![语音生成-使用前](image/语音生成-使用前.png)

**语音生成 - 生成完成：**

![语音生成-使用后](image/语音生成-使用后.png)

---

## 图片生成详解

### 1. 选择模型

| 模型 | 说明 | 风格支持 |
|------|------|---------|
| image-01 | 高质量基础模型 | 无 |
| image-01-live | 实时风格模型 | realness/hd/anime/illustration/3d |

### 2. 文本描述

- 最大长度：1500 字符
- 建议：详细描述场景、人物、风格、光线等

### 3. 参数配置

| 参数 | 默认值 | 取值范围 | 说明 |
|------|--------|---------|------|
| 画布比例 | 1:1 | 1:1/16:9/4:3/3:2/2:3/3:4/9:16/21:9 | 图片比例 |
| 生成数量 | 1 | 1~9 | 单次生成张数 |
| 宽度 | - | 512~2048 | 像素，必须是8的倍数 |
| 高度 | - | 512~2048 | 像素，必须是8的倍数 |
| 提示词优化 | false | true/false | 自动优化描述 |
| 水印 | false | true/false | 添加AIGC水印 |

### 4. 风格选项（仅 image-01-live）

- **realness**：写实风格
- **hd**：高清风格
- **anime**：动漫风格
- **illustration**：插画风格
- **3d**：3D渲染风格

### 界面示意

**图片生成：**

![图片生成](image/图片生成.png)

**图片查看 - 放大：**

![图片查看-放大](image/图片查看-放大.png)

---

## 历史生成记录

### 查看历史

在导航栏点击「历史记录」进入历史管理页面，可查看所有语音和图片生成记录。

![历史生成记录](image/历史生成记录.png)

### 查看详情

点击任意记录可查看详细信息，包括生成参数、生成时间、文件路径等。

![历史生成记录详情](image/历史生成记录详情.png)

---

## 音色管理

### 界面示意

**音色管理 - 查看和刷新音色列表：**

![音色管理](image/音色管理.png)

### 刷新音色

点击「刷新音色」按钮，从 MiniMax API 同步最新音色到本地数据库。

### 音色设计

通过文字描述生成全新的AI音色：
1. 输入音色描述（prompt）
2. 输入试听文本
3. 点击生成

### 音色复刻

通过上传音频快速复刻音色：
1. 上传音频文件（支持 mp3/wav/m4a）
2. 设置音色ID和描述
3. 点击复刻

> 注意：该功能需要解锁 MiniMax 音色复刻权限，如无权限请在 MiniMax 控制台检查修改

**音色复刻界面：**

![音色复刻](image/音色复刻.png)

---

## 批量生成脚本

项目提供命令行批量生成功能。

### 使用方法

```bash
npm run batch
```

### 配置方式

编辑 `scripts/batchGenerate.js` 文件：

```javascript
// 批量生成配置
const BATCH_CONFIG = {
  // 生成类型：voice 或 image
  type: 'voice',

  // 任务列表
  tasks: [
    {
      text: '要转换的文本内容',
      voiceId: 'moss_audio_ce44fc67-7ce3-11f0-8de5-96e35d26fb85',
      model: 'speech-2.8-hd',
      bitrate: 128000,
      sampleRate: 32000,
      audioFormat: 'mp3',
      speed: 1.0,
      emotion: 'fluent'
    },
    {
      text: '第二段文本',
      voiceId: 'English_Graceful_Lady',
      // ... 其他参数
    }
  ]
};
```

### 图片批量生成配置

```javascript
const BATCH_CONFIG = {
  type: 'image',

  tasks: [
    {
      prompt: '一个穿着汉服的少女在樱花树下',
      model: 'image-01-live',
      aspectRatio: '16:9',
      n: 4,
      style: 'anime'
    },
    {
      prompt: '未来城市天际线，赛博朋克风格',
      model: 'image-01',
      aspectRatio: '21:9',
      n: 2
    }
  ]
};
```

### 执行日志

脚本执行后会输出：
- 任务进度（当前/总数）
- 生成耗时
- 生成结果（成功/失败）
- 文件保存路径

**命令行批量生成：**

![脚本批量生成](image/脚本批量生成.png)

---

## 常见问题

### Q: 数据库连接失败？

1. 确认 MySQL 服务已启动
2. 检查 `.env` 中的 DB_* 配置
3. 确认数据库已创建（`CREATE DATABASE minimax`）

### Q: API 调用失败？

1. 确认 `API_KEY` 正确
2. 检查 API 余额是否充足
3. 查看服务器日志 `logs/` 目录

### Q: 音频文件无法播放？

1. 确认使用了支持的格式（mp3/wav/flac）
2. 检查文件是否完整生成
3. 尝试更换音色或降低比特率

### Q: 图片生成失败？

1. 检查描述是否包含敏感词
2. 确认生成数量在 1-9 范围内
3. 验证宽高是否为 8 的倍数
