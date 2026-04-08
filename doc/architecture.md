# 架构文档

## 系统概述

语音图片生成工具是一个基于 MiniMax API 的全栈应用，采用前后端分离架构：

- **后端**：Express.js + MySQL
- **前端**：Vue 3 + Element Plus + Vite
- **通信**：RESTful API

## 系统架构图

```
┌─────────────────────────────────────────────────────────────┐
│                      Client (Browser)                       │
│                    Vue 3 + Element Plus                      │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTP / JSON
┌─────────────────────────▼───────────────────────────────────┐
│                      Backend (Express)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ voice routes │  │ image routes │  │history routes│       │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │
│         │                 │                 │               │
│  ┌──────▼───────┐  ┌──────▼───────┐  ┌──────▼───────┐       │
│  │voiceService  │  │imageService  │  │historyService│       │
│  │voiceInventory│  │              │  │              │       │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │
└─────────┼─────────────────┼─────────────────┼───────────────┘
          │                 │                 │
┌─────────▼─────────────────▼─────────────────▼───────────────┐
│                      External APIs                           │
│                   MiniMax API (语音/图片)                     │
└───────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      Data Layer                              │
│  ┌─────────────────┐         ┌─────────────────┐             │
│  │   MySQL DB      │         │  File System    │             │
│  │ generation_     │         │  output/voice   │             │
│  │ history         │         │  output/image   │             │
│  │ voice_inventory │         │                 │             │
│  └─────────────────┘         └─────────────────┘             │
└─────────────────────────────────────────────────────────────┘
```

## 目录结构

```
语音图片生成/
├── server/                     # 后端服务
│   ├── index.js               # Express 入口，路由挂载
│   ├── routes/                # 路由层
│   │   ├── voice.js          # 语音相关路由
│   │   ├── image.js          # 图片相关路由
│   │   └── history.js        # 历史记录路由
│   ├── services/             # 业务逻辑层
│   │   ├── voiceService.js   # 语音生成核心逻辑
│   │   ├── imageService.js   # 图片生成核心逻辑
│   │   ├── voiceInventoryService.js  # 音色库存管理
│   │   └── historyService.js # 历史记录管理
│   └── utils/                 # 工具层
│       ├── logger.js         # 日志工具（log4js）
│       └── db.js            # 数据库连接（mysql2）
├── client/                     # 前端应用
│   └── src/
│       ├── views/            # 页面组件
│       │   ├── VoiceView.vue
│       │   ├── ImageView.vue
│       │   ├── HistoryView.vue
│       │   └── VoiceManageView.vue
│       ├── api/              # API 封装
│       │   └── index.js
│       ├── router.js        # Vue Router 配置
│       └── App.vue          # 根组件
├── scripts/                   # 脚本
│   └── batchGenerate.js     # 批量生成脚本
├── doc/                       # 文档
└── output/                    # 生成文件输出
    ├── voice/                # 语音文件
    ├── image/                # 图片文件
    └── uploads/              # 上传临时文件
```

## 模块说明

### 1. 后端路由层 (routes/)

负责 HTTP 请求的接收、参数校验、响应封装。

**voice.js** - 语音相关路由
- `GET /api/voice/options` - 获取音色列表和参数
- `POST /api/voice/refresh` - 刷新音色列表
- `POST /api/voice/design` - 音色设计
- `POST /api/voice/upload` - 上传复刻音频
- `POST /api/voice/clone` - 音色复刻
- `DELETE /api/voice/:voiceId` - 删除音色
- `POST /api/voice` - 生成语音

**image.js** - 图片相关路由
- `GET /api/image/options` - 获取图片参数选项
- `POST /api/image` - 生成图片

**history.js** - 历史记录路由
- `GET /api/history` - 获取历史列表
- `GET /api/history/:id` - 获取历史详情

### 2. 业务逻辑层 (services/)

**voiceService.js**

核心功能：
- `textToSpeech()` - 调用 MiniMax 语音合成 API
- `getAllVoices()` - 获取所有音色（从 API）
- `designVoice()` - 音色设计
- `voiceClone()` - 音色复刻
- `uploadAudioFile()` - 上传音频文件
- `deleteVoice()` - 删除音色

**imageService.js**

核心功能：
- `textToImage()` - 调用 MiniMax 图片生成 API
- `downloadAndSaveImage()` - 下载并保存图片（URL格式）
- `saveBase64Image()` - 保存 Base64 图片

**voiceInventoryService.js**

核心功能：
- `refreshVoicesFromAPI()` - 从 API 同步音色到数据库
- `getVoicesFromDB()` - 从数据库读取音色
- `removeVoice()` - 删除音色（API + 数据库）

**historyService.js**

核心功能：
- `addRecord()` - 添加生成记录
- `getRecords()` - 查询历史记录（分页）
- `getRecordById()` - 查询单条记录

### 3. 数据层

**MySQL 数据库**

两张核心表：

```sql
-- 生成历史表
CREATE TABLE generation_history (
  id INT PRIMARY KEY AUTO_INCREMENT,
  type ENUM('voice', 'image') NOT NULL,
  prompt TEXT,
  params JSON,
  file_path VARCHAR(500),
  file_size INT DEFAULT 0,
  status ENUM('success', 'failed') DEFAULT 'success',
  error_msg TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 音色库存表
CREATE TABLE voice_inventory (
  id INT PRIMARY KEY AUTO_INCREMENT,
  voice_id VARCHAR(255) NOT NULL UNIQUE,
  voice_name VARCHAR(255),
  description TEXT,
  source ENUM('system', 'voice_cloning', 'voice_generation'),
  created_time VARCHAR(50),
  synced_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**文件系统**

- `output/voice/` - 生成的语音文件
- `output/image/` - 生成的图片文件
- `output/uploads/` - 上传的临时文件

### 4. 前端结构

**API 封装 (api/index.js)**

统一封装所有 API 调用，处理请求/响应拦截。

**页面组件 (views/)**

| 组件 | 功能 |
|------|------|
| VoiceView | 语音生成页面 |
| ImageView | 图片生成页面 |
| HistoryView | 历史记录页面 |
| VoiceManageView | 音色管理页面 |

### 5. 日志系统

使用 log4js 实现日志管理：

```javascript
// 日志配置
{
  "appenders": {
    "api": { "type": "dateFile", "filename": "logs/api.log" },
    "error": { "type": "file", "filename": "logs/error.log" }
  },
  "categories": {
    "default": { "appenders": ["api", "error"], "level": "info" }
  }
}
```

日志特性：
- 敏感数据脱敏（API_KEY、audioHex 等）
- 请求参数记录
- 响应时间和状态记录

## 数据流

### 语音生成流程

```
用户输入文本 → VoiceView
     ↓
调用 POST /api/voice
     ↓
voice.js 路由接收请求
     ↓
voiceService.textToSpeech() 构建请求参数
     ↓
axios 调用 MiniMax 语音合成 API
     ↓
接收 hex 音频数据
     ↓
保存到 output/voice/
     ↓
historyService.addRecord() 记录到数据库
     ↓
返回结果给前端
     ↓
VoiceView 显示/播放音频
```

### 图片生成流程

```
用户输入描述 → ImageView
     ↓
调用 POST /api/image
     ↓
image.js 路由接收请求
     ↓
imageService.textToImage() 构建请求参数
     ↓
axios 调用 MiniMax 图片生成 API
     ↓
接收图片 URL 或 Base64
     ↓
下载/保存到 output/image/
     ↓
historyService.addRecord() 记录到数据库
     ↓
返回结果给前端
     ↓
ImageView 显示图片预览
```

### 音色同步流程

```
用户点击刷新 → VoiceManageView
     ↓
调用 POST /api/voice/refresh
     ↓
voiceInventoryService.refreshVoicesFromAPI()
     ↓
voiceService.getAllVoices() 调用 MiniMax API
     ↓
解析返回的音色列表
     ↓
清空本地 voice_inventory 表
     ↓
批量插入新音色
     ↓
getVoicesFromDB() 返回更新后的列表
     ↓
VoiceManageView 更新显示
```

## 安全考虑

1. **敏感信息保护**
   - API_KEY 存储在 `.env`，不提交到 git
   - 日志中对敏感字段自动脱敏

2. **文件上传安全**
   - 文件大小限制 20MB
   - 上传后立即删除临时文件

3. **输入校验**
   - 文本长度限制
   - 参数取值范围校验

## 扩展点

1. **新增 API 接口**
   - 在 `routes/` 添加新路由文件
   - 在 `services/` 添加对应服务
   - 在 `server/index.js` 挂载路由

2. **数据库扩展**
   - 新增表在 `db.js` 的 `initDatabase()` 中添加
   - 使用 mysql2 的 promise 风格

3. **前端页面**
   - 在 `views/` 添加新组件
   - 在 `router.js` 配置路由
   - 在 `api/index.js` 添加接口调用
