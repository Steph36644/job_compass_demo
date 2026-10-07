# 求职罗盘 Job Compass（V1.0 MVP）

求职进度一站式追踪应用：用看板管理投递全流程，记录简历与状态流转，并通过数据洞察复盘求职进展。数据保存在浏览器本地（localStorage），无需后端服务即可运行。

## 功能模块

- **看板**：按「待投递 / 已投递 / 测评笔试 / 面试中 / Offer / 已被拒 / 已终止」分列展示投递卡片，支持拖拽流转
- **投递记录**：新增、查看、编辑投递详情，记录状态变更日志。支持「快速录入」（只需公司和岗位）和截图识别 JD
- **简历**：管理简历资料
- **数据洞察**：投递趋势与状态分布统计
- **我的**：个人配置，支持数据导入 / 导出、重置与示例数据载入

## 技术栈

| 类别 | 选型 |
| --- | --- |
| 框架 | Next.js 16（App Router） |
| UI | React 19 + TypeScript 5 |
| 样式 | Tailwind CSS 4 |
| 图标 | lucide-react |
| 日期 | date-fns |
| 数据存储 | 浏览器 localStorage（纯前端，无后端）；JD 截图放 IndexedDB |
| JD 截图识别 | 浏览器本地 [tesseract.js](https://github.com/naptha/tesseract.js)（中文 + 英文） |

## 环境要求

- **Node.js ≥ 20.9.0**（Next.js 16 硬性要求；建议使用 Node 20 LTS 或 22 LTS）
- npm 10+（随 Node 安装），或 pnpm / yarn 任选其一

> macOS 推荐使用 [nvm](https://github.com/nvm-sh/nvm) 管理 Node 版本：
>
> ```bash
> brew install nvm   # 或按 nvm 官方说明安装
> nvm install 22
> nvm use 22
> ```

## 快速开始

```bash
# 1. 安装依赖（仓库已提交 package-lock.json，推荐 npm ci 严格按锁文件安装）
npm ci
# 如 npm ci 因环境差异报错，可改用 npm install

# 2. 启动开发服务器
npm run dev
```

打开浏览器访问 [http://localhost:3000](http://localhost:3000) 即可使用。首次进入为空数据，可在页面中点击「载入示例数据体验」快速试用。

## 常用命令

```bash
npm run dev     # 启动开发服务器（热更新）
npm run build   # 生产环境构建
npm run start   # 运行构建后的生产服务
npm run lint    # ESLint 代码检查
```

## 目录结构

```
job-compass/
├── src/
│   ├── app/            # App Router 页面（看板 / 投递记录 / 简历 / 洞察 / 我的）
│   ├── components/     # 看板与布局组件（Sidebar、Topbar、KanbanBoard 等）
│   └── lib/            # 类型定义、本地存储 store、mock 数据与工具函数
├── public/             # 静态资源
├── package.json
├── tsconfig.json
├── next.config.ts
├── postcss.config.mjs
└── eslint.config.mjs
```

## 快速录入与截图识别

手机上的招聘 App（Boss 直聘、猎聘等）经常复制不了 JD。可以：

1. 点「快速录入」，只填公司名称和岗位名称即可进看板。地点、薪资备注、来源、链接和一句话备注都是选填。
2. 在新建或编辑投递时，选择、拖入或粘贴 JD 截图。文字识别使用浏览器里的 tesseract.js（简体中文 + 英文），不经过服务器，也不使用付费云 OCR。
3. 识别成功后会填入 JD 原文，并走现有的 JD 结构化解析。已经手填的公司、岗位、地点和薪资不会被覆盖。

已知限制：手写、过小、过糊、纯图片（没有文字）的截图识别不好；截图里的按钮和导航文字也会被认进来，需要自己删掉。首次识别需要联网下载语言包和识别引擎，之后会缓存在本机。截图保存在 IndexedDB，不进 localStorage，也不包含在「我的」页面的导出文件里。

## 数据与隐私说明

- 所有求职数据仅存储在当前浏览器的 localStorage 中，不会上传到任何服务器。
- 清理浏览器站点数据会导致记录丢失，建议定期使用「我的」页面中的导出功能备份。
- 项目不包含任何 `.env` 环境变量或密钥；如未来接入后端，请参考 `.gitignore` 规则避免提交 `.env*` 文件。
