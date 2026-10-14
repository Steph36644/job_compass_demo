# 求职罗盘 Job Compass（公开演示 · V2.0）

这是公开演示，不是生产环境。示例数据均为虚构。未配置环境时，投递、简历和看板只保存在这台浏览器的 localStorage / IndexedDB。

版本：对齐私有仓库 V2.0，截至 2026-10-14（`main` @ `de4a9ef`，P0–P3：登录、本地优先的云同步、导入切换主源、服务端托管供应商 Key）。本目录没有生产密钥，也没有个人快照。

## 不配置环境直接运行

前置条件：**Node.js ≥ 20.9.0**

```bash
npm ci
npm run dev
```

打开 http://localhost:3000 ，点击「载入示例数据体验」。

此时：

- 本地增删改查可用。
- 登录页会说明尚未配置 Supabase。
- AI 按钮会要求先登录；没有服务端 Key 时提示「暂时无法调用 AI」。
- 云同步和切换主源在未登录时不会改写本地台账。

## 使用你自己的 Supabase / AI

复制 `.env.example` 为 `.env.local`（该文件已被 git 忽略）。只填写**你自己的**项目，不要复用生产项目：

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`（只要可公开的 anon / publishable key）
- `JOB_COMPASS_AI_API_KEY`（只在服务端，不要改成 `NEXT_PUBLIC_`）

不要写入服务端私钥，不要把 `.env.local` 提交到这个公开仓库。

在你的 Supabase SQL 编辑器执行 `supabase/migrations/001_public_demo_snapshot.sql`，然后重启 `npm run dev`。该表按登录用户隔离。它是公开演示的快照结构，不是私有仓库 migration 原文。

## 功能

- **看板**：待投递到 Offer 的状态列，空数据时提供示例数据。
- **投递 / 简历**：本地记录，可快速录入。
- **数据洞察**：本地统计；「生成本周复盘」走服务端 AI，失败时不写入台账。
- **登录**：邮箱和密码。未配置 Supabase 时只显示说明。
- **云同步**：登录后把本地文字台账推到你自己的项目；失败不回滚本地。主源默认仍是本地。
- **多端导入**：登录后拉取云端快照，写入前先做本地备份，确认后才把主源切到云端，并可回滚。

## 常用命令

```bash
npm run dev
npm run build
npm test
npx tsc --noEmit
```

## 有意不包含

本机 Agent 数据层、个人备份、简历原件、JD 截图，以及私有仓库的 git 历史。
