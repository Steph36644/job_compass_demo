import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 只在服务端按 Node 包加载，避免把 worker_threads 打进浏览器包。
  // 浏览器里的 OCR 仍由客户端动态 import，识别不经过本应用服务器。
  serverExternalPackages: ['tesseract.js'],
  // pdf.js 在 Node 构建里会可选引用 canvas / encoding，浏览器解析文本用不到
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;
    return config;
  },
  turbopack: {
    resolveAlias: {
      canvas: "./src/lib/empty-module.ts",
      encoding: "./src/lib/empty-module.ts",
    },
  },
};

export default nextConfig;
