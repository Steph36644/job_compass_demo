# Job Compass 求职罗盘（公开演示）

本仓库是「求职罗盘」的**公开演示**。示例数据都是虚构的，默认只存在于浏览器本地。这里没有个人简历、真实投递记录或生产密钥。

版本说明：应用行为对齐私有仓库 V2.0（`main` @ `de4a9ef`，2026-10-14，P0–P3）。应用路径仍是 `v1.0/job-compass`。访客如果要登录、云同步或调用 AI，必须使用**自己的** Supabase 项目和服务端 Key，并且与生产环境隔离。不要把生产 URL、anon key、服务端私钥或供应商 Key 粘贴进这个公开仓库。

未配置环境时，看板和「载入示例数据体验」仍可使用。AI 与云端会停在登录提示或「暂时无法调用 AI」，不会把本地台账弄丢。

## 仓库结构

```
.
├── docs/                 # V1.0 历史文档 + V2.0 公开演示说明
├── v1.1/                 # V1.1 历史文档（已标记为被 V2.0 说明取代）
└── v1.0/
    └── job-compass/      # 公开演示应用（Next.js）
```

## 在新电脑上运行

前置条件：**Node.js ≥ 20.9.0**

```bash
git clone https://github.com/Steph36644/job_compass_demo.git
cd job_compass_demo/v1.0/job-compass
npm ci
npm run dev
```

打开 http://localhost:3000 。首次进入可点击「载入示例数据体验」。不需要复制 `.env.example`。

可选：把 `.env.example` 复制为 `.env.local`，只填写你自己的 Supabase URL 与 anon key。供应商 Key 使用 `JOB_COMPASS_AI_API_KEY`，只留在服务端。云端表见 `v1.0/job-compass/supabase/migrations/001_public_demo_snapshot.sql`。

详细说明见 [v1.0/job-compass/README.md](./v1.0/job-compass/README.md) 和 [V2.0 公开演示说明](./docs/求职罗盘_V2.0_公开演示说明.md)。

## 文档

- [V2.0 公开演示说明](./docs/求职罗盘_V2.0_公开演示说明.md)
- [需求分析报告（V1.0，历史）](./docs/求职追踪网站_需求分析报告.md)
- [产品需求文档 PRD V1.0（历史）](./docs/求职追踪网站_V1.0_PRD.md)
- [技术设计文档 V1.0（历史）](./docs/求职追踪网站_V1.0_技术设计文档.md)
- [产品需求文档 PRD V1.1（历史）](./v1.1/求职罗盘_V1.1_前端补全_PRD.md)
- [技术设计文档 V1.1（历史）](./v1.1/求职罗盘_V1.1_技术设计文档.md)
