# Job Compass 求职罗盘

本仓库是「求职罗盘」的公开演示版。内置示例数据均为虚构，全部在浏览器本地运行。

求职进度一站式追踪应用（Next.js 16 + React 19 + TypeScript + Tailwind CSS）。纯前端实现，数据存储在浏览器 localStorage，开箱即可运行。

## 仓库结构

```
.
├── docs/                 # 产品文档：需求分析报告、PRD、技术设计文档
└── v1.0/
    └── job-compass/      # V1.0 MVP 应用源码（Next.js 工程）
```

## 在新电脑上运行（macOS / Windows 通用）

前置条件：**Node.js ≥ 20.9.0**

```bash
# 1. 克隆仓库
git clone https://github.com/Steph36644/job_compass_demo.git
cd job_compass_demo/v1.0/job-compass

# 2. 安装依赖
npm ci

# 3. 启动开发服务器
npm run dev
```

访问 http://localhost:3000，首次进入可点击「载入示例数据体验」。

详细说明见应用文档：[v1.0/job-compass/README.md](./v1.0/job-compass/README.md)

## 文档

- [需求分析报告](./docs/求职追踪网站_需求分析报告.md)
- [产品需求文档 PRD V1.0](./docs/求职追踪网站_V1.0_PRD.md)
- [技术设计文档 V1.0](./docs/求职追踪网站_V1.0_技术设计文档.md)
- [产品需求文档 PRD V1.1（前端补全）](./v1.1/求职罗盘_V1.1_前端补全_PRD.md)
- [技术设计文档 V1.1（前端补全）](./v1.1/求职罗盘_V1.1_技术设计文档.md)
