# 语音图片生成工具

基于 MiniMax API 的语音和图片生成管理平台。

## 功能特性

### 语音生成
- 支持多种音色选择（系统音色、克隆音色、生成音色）
- 可调节参数：比特率、采样率、音频格式、语速、音量、音调
- 支持情感控制（happy、sad、angry、calm 等）
- 支持语言增强（中文、英语、日语等 30+ 种语言）
- 生成历史自动记录

### 图片生成
- 支持多种模型（image-01、image-01-live）
- 支持多种画布比例（1:1、16:9、4:3 等）
- 支持多种风格（realness、hd、anime、illustration、3d）
- 图片预览和放大查看
- 生成历史自动记录

### 音色管理
- 刷新音色列表：从 API 同步音色到本地数据库
- 删除音色：支持克隆音色和生成音色的删除
- 三类音色分类展示

### 历史记录
- 语音和图片生成历史
- 支持按类型筛选
- 查看生成详情和错误信息

## 项目结构

```
├── server/                    # 后端服务
│   ├── index.js              # Express 入口
│   ├── routes/
│   │   ├── voice.js          # 语音相关 API
│   │   ├── image.js          # 图片相关 API
│   │   └── history.js        # 历史记录 API
│   ├── services/
│   │   ├── voiceService.js   # 语音生成服务
│   │   ├── imageService.js   # 图片生成服务
│   │   ├── voiceInventoryService.js  # 音色库管理
│   │   └── historyService.js # 历史记录服务
│   └── utils/
│       ├── logger.js         # 日志工具
│       └── db.js             # MySQL 数据库连接
├── client/                    # 前端 Vue3 应用
│   └── src/
│       ├── views/
│       │   ├── VoiceView.vue       # 语音生成页面
│       │   ├── ImageView.vue       # 图片生成页面
│       │   ├── HistoryView.vue     # 历史记录页面
│       │   └── VoiceManageView.vue # 音色管理页面
│       ├── api/
│       │   └── index.js      # API 接口封装
│       ├── router.js         # 路由配置
│       └── App.vue            # 根组件
└── output/                    # 生成文件输出目录
    ├── voice/                 # 语音文件
    └── image/                 # 图片文件
```

## 环境要求

- Node.js >= 18
- MySQL >= 8.0

## 配置

在项目根目录创建 `.env` 文件：

```env
# MiniMax API
API_KEY=your_api_key_here

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=minimax

# 服务端口
PORT=3000
```

## 安装与运行

```bash
# 安装后端依赖
npm install

# 安装前端依赖
cd client && npm install

# 启动后端服务
npm run dev

# 前端开发模式（另一个终端）
cd client && npm run dev
```

访问 http://localhost:5173

## 数据库表

### generation_history - 生成历史表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT | 主键 |
| type | ENUM('voice','image') | 生成类型 |
| prompt | TEXT | 提示词/文本内容 |
| params | JSON | 完整传参 JSON |
| file_path | VARCHAR(500) | 文件路径 |
| file_size | INT | 文件大小(字节) |
| status | ENUM('success','failed') | 状态 |
| error_msg | TEXT | 错误信息 |
| created_at | DATETIME | 创建时间 |

### voice_inventory - 音色库表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT | 主键 |
| voice_id | VARCHAR(255) | 音色 ID |
| voice_name | VARCHAR(255) | 音色名称 |
| description | TEXT | 描述 |
| source | ENUM | 来源(system/voice_cloning/voice_generation) |
| created_time | VARCHAR(50) | 创建时间 |
| synced_at | DATETIME | 同步时间 |

## API 接口

### 语音

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/voice/options | 获取音色列表和参数选项 |
| POST | /api/voice/refresh | 刷新音色列表（从 API 同步到数据库） |
| DELETE | /api/voice/:voiceId | 删除音色 |
| POST | /api/voice | 生成语音 |

### 图片

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/image/options | 获取图片生成参数选项 |
| POST | /api/image | 生成图片 |

### 历史

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/history | 获取历史记录列表 |
| GET | /api/history/:id | 获取历史记录详情 |

## 技术栈

**后端**
- Express.js - Web 框架
- mysql2 - MySQL 驱动
- log4js - 日志管理
- axios - HTTP 客户端

**前端**
- Vue 3 - 渐进式框架
- Vue Router - 路由管理
- Element Plus - UI 组件库
- Axios - HTTP 客户端
- Vite - 构建工具
