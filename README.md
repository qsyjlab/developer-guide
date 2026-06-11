# Developer Guide

> 独立文档仓库 — 用于沉淀通用开发参考内容，并以 `pnpm workspace` 方式单独维护 `docs` 站点包。

## 作用

本仓库是面向团队与项目复用的**通用开发文档仓库**，独立管理以下内容：

- **编码规范** — Prettier/ESLint/TypeScript 通用规范、Vue/NestJS/Electron 平台扩展、主题样式规范
- **通用 SQL 模板** — 身份认证、权限控制、审计日志等场景的 DDL、查询与代码分层参考
- **AI 提示词** — 语言/框架无关的系统设计提示词 + NestJS 特定实现提示词
- **技术选型清单** — 项目依赖清单和版本参考

## 仓库定位

```text
developer-guide/              ← 本仓库（开发参考文档）
  ├── docs/                    ← VitePress 文档站点包
  │   ├── developer/           ← 开发参考正文
  │   ├── .vitepress/          ← 站点配置
  │   └── package.json         ← docs 子包
  ├── package.json             ← workspace 根包
  └── pnpm-workspace.yaml
```

本仓库只负责沉淀通用开发参考，不承载具体业务项目源码。实际项目可以按需引用这里的规范、模板与说明，避免项目文档和通用知识耦合。

## 目录

```
docs/
├── developer/
│   ├── project-overview.md    ← 技术选型清单
│   ├── system-settings-sql-template.md
│   ├── business-implementation/
│   ├── operations/
│   ├── standards/
│   └── prompts/
├── .vitepress/
└── package.json
```

## 使用

安装依赖后可通过 `pnpm --filter developer-guide-docs dev` 启动文档站，或用 `pnpm --filter developer-guide-docs build` 单独构建 `docs` 子包。

## 发布

仓库内置了 GitHub Pages 发布流水线，工作流文件位于 [deploy-docs.yml](/Users/qsyj/software/project/my-project/developer-guide/.github/workflows/deploy-docs.yml)。

- 推送到 `main` 分支后，会自动安装依赖并构建 `docs` 子包
- 构建产物会发布到 GitHub Pages
- 当前 VitePress `base` 已设置为 `/developer-guide/`，适用于仓库名为 `developer-guide` 的 GitHub Pages 地址
