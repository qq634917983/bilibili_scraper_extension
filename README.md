读取项目重写整个项目按照要求来梳理逻辑同时不改变界面样式 
## 项目概述
这是一个基于 WXT + Vue 3 开发的 Chrome 扩展，用于自动循环播放 Bilibili 视频列表。支持自定义停留时间、乱序播放、数据导入导出等功能。

## 核心业务逻辑
### 主要功能流程




1. 插件加载初始化
   
   - 视频数据抓取并初始化到表格
   - 停留时间可修改（用于倒计时计算）
   - 支持数据导入导出（JSON格式）
2. 循环播放核心逻辑
   
   - 点击"开始循环"后进行页面检测（弹窗检测、播放状态检测）
   - 循环状态处理（自动关闭弹窗、确保视频播放）
   - 倒计时计算： 停留时间 - 当前播放时长
   - 倒计时为0时自动跳转下一个URL
3. 嵌套循环机制
   
   - 外层：总循环次数控制（loopCount参数，0表示无限循环）
   - 内层：视频数据循环（遍历播放列表）
## 项目架构
### 技术栈
- 框架 : WXT (Web Extension Toolkit) + Vue 3
- 样式 : TailwindCSS(要全全使用 避免使用css)
- 语言 : TypeScript
- 构建工具 : Vite (WXT内置)
### 目录结构
```
bilibili_scraper_extension/
├── entrypoints/                    # 扩展入口点
│   ├── background.ts               # 后台脚本 - 循环控制核心
│   ├── content.ts                  # 内容脚本 - 页面交互
│   └── popup/                      # 弹窗界面
│       ├── App.vue                 # 主应用组件(负责界面展示 现在代码太长了 逻辑分到ts中 页面分一部分到 Table)
│       ├── Table.vue               # 主应用组件(表格相关)
│       ├── components/             # Vue组件(负责弹窗的各个元素)
│       ├── composables/            # 组合式函数(负责数据处理)
│       ├── types/                  # TypeScript类型定义(定义数据结构)
│       └── utils/                  # 工具函数(封装常用功能)
├── public/                         # 静态资源
├── wxt.config.ts                   # WXT配置文件
└── package.json                    # 项目配置
```
## 核心文件详解
### 1. background.ts - 后台脚本
主要职责 : 循环播放逻辑的核心控制器

核心类 : LoopManager

主要方法 :

- startLoop(data) : 开始循环播放，初始化循环参数
- stopLoop() : 停止循环播放，清理定时器
- playVideo() : 跳转到指定视频URL
- checkVideoProgress() : 监控视频播放进度
- processVideoProgress(videoInfo) : 处理视频进度，判断是否跳转
- moveToNextVideo() : 移动到下一个视频，处理循环计数
- shuffleVideoData() : 乱序排列视频数据
- saveState()/loadState() : 状态持久化

