# 技术选型清单

> 本文为 **公共技术选型模板**，按 **语言 → 技术栈** 两级分组。
> 新项目初始化时勾选对应技术栈并填写版本与规范链接；本项目已选定的条目以 ✅ 标注。

---

## 一、TypeScript / Node.js 生态

### 1.1 语言与运行时

| 技术 | 版本 | 选型理由 | 对应规范 |
|------|------|----------|----------|
| **TypeScript** | `^6.0.3` / `^5.8.3` | 全栈类型安全，`strict: true` | [通用规范](./standards/common.md#三typescript-严格模式) |
| **Node.js** | `22.x` | LTS 长期支持 | — |

### 1.2 包管理与 Monorepo

| 技术 | 版本 | 选型理由 | 对应规范 |
|------|------|----------|----------|
| **pnpm** | `^10.16.1` | Workspace Monorepo，严格依赖隔离 | — |

### 1.3 代码质量

| 技术 | 版本 | 选型理由 | 对应规范 |
|------|------|----------|----------|
| **ESLint** | `^9.29.0` | Flat Config，`@typescript-eslint` + `vue-eslint-parser` | [通用规范](./standards/common.md#二eslint-规则) |
| **Prettier** | `^3.5.3` | 无分号/单引号/无尾逗号 | [通用规范](./standards/common.md#一prettier-格式化规则) |

### 1.4 构建工具

| 技术 | 版本 | 选型理由 | 对应规范 |
|------|------|----------|----------|
| **Vite** | `^8.0.14` | 插件生态（Vue/Tailwind/Electron/自动导入） | — |
| **vue-tsc** | `^3.3.1` | Vue SFC 类型检查 | — |

---

### 1.5 后端框架

#### ✅ NestJS

| 技术 | 版本 | 选型理由 | 对应规范 |
|------|------|----------|----------|
| **NestJS** | `^11.1.24` | 企业级 Node.js 框架，模块化 + 装饰器 | [NestJS 规范](./standards/nestjs.md) |
| **TypeORM** | `^1.0.0` | Entity + Repository 模式 | — |
| **MySQL** | `8.x` (via `mysql2 ^3.22.4`) | 关系型数据库，元数据与版本管理 | — |
| **MinIO Node SDK** | `^8.0.7` | S3 兼容对象存储、文件上传下载、预签名 URL | [MinIO 部署](./operations/minio.md) |
| **class-validator** | `^0.15.1` | DTO 装饰器校验 | — |
| **class-transformer** | `^0.5.1` | DTO 序列化/反序列化 | — |
| **@nestjs/schedule** | `^6.1.3` | 定时任务调度 | — |

#### ☐ Express / Fastify（备选）

> 轻量场景备选，当前项目未使用。

---

### 1.6 前端框架

#### ✅ Vue 3

| 技术 | 版本 | 选型理由 | 对应规范 |
|------|------|----------|----------|
| **Vue 3** | `^3.5.34` | Composition API + `<script setup lang="ts">` | [Vue 规范](./standards/vue.md) |
| **Element Plus** | `^2.11.2` | 企业级 Vue 3 组件库，中文生态成熟 | [Vue 规范](./standards/vue.md#四组件使用规范) |
| **Pinia** | `^3.0.3` | Vue 3 官方状态管理 | — |
| **Vue Router** | `^4.5.1` | History 模式路由 | — |
| **VueUse** | `^14.3.0` | 组合式工具库 | — |
| **Axios** | `^1.16.1` | HTTP 客户端，封装为 Service 层 | — |
| **unplugin-auto-import** | `^21.0.0` | 自动导入 Vue/Pinia API | — |
| **unplugin-vue-components** | `^32.1.0` | 自动注册 Element Plus + 自定义组件 | — |

#### ☐ React（备选）

> 当前项目未使用。如需引入：React 18+ / Next.js / Ant Design / Zustand。

---

### 1.7 桌面壳层

#### ✅ Electron

| 技术 | 版本 | 选型理由 | 对应规范 |
|------|------|----------|----------|
| **Electron** | `^42.1.0` | 跨平台桌面壳，主进程/渲染进程隔离 | [Electron 规范](./standards/electron.md) |
| **electron-builder** | `^26.8.1` | DMG / NSIS / AppImage 多平台打包 | — |
| **vite-plugin-electron** | `^1.0.0` | Vite 下 Electron 构建集成 | — |
| **archiver** | `^8.0.0` | 文件恢复时打包 ZIP 归档 | — |

#### ☐ Tauri（备选）

> 更轻量的桌面壳方案（Rust 内核），当前项目未使用。

---

### 1.8 样式方案

| 技术 | 版本 | 选型理由 | 对应规范 |
|------|------|----------|----------|
| **Tailwind CSS** | `^4.3.0` | 原子化 CSS + 全局重置 | [主题规范](./standards/theme.md#三公共样式结构) |
| **Sass/SCSS** | `^1.100.0` | Design Tokens + 组件库覆写 | [主题规范](./standards/theme.md#一design-tokens设计令牌) |
| **Element Plus 样式覆写** | `^2.11.2` | 手动管理，覆写 `--el-*` CSS 变量 | [主题规范](./standards/theme.md#二element-plus-组件库覆写) |

> Tailwind 负责全局重置和工具类，SCSS 负责 Design Tokens 和组件库覆写，职责分离。

---

## 二、Java 生态（备选）

### 2.1 后端框架

#### ☐ SpringBoot

> 当前项目未使用。下面是可复用的 SpringBoot 2.7.x 依赖清单，按 Auth Zero / 审计日志这类企业后台能力蒸馏。

| 技术 | 版本 | 选型理由 | 对应规范 |
|------|------|----------|----------|
| **SpringBoot** | `2.7.x` | Java 后端基座，适合企业后台、权限、审计、集成系统 | — |
| **JDK** | `1.8` | 对齐现有 Java 8 运行环境，SpringBoot 使用 2.7.x | [JAR 部署](./operations/springboot-jar.md) |
| **spring-boot-starter-web** | 随 SpringBoot | REST Controller、Servlet 请求上下文 | — |
| **spring-boot-starter-validation** | 随 SpringBoot | DTO 参数校验 | — |
| **spring-boot-starter-aop** | 随 SpringBoot | 操作日志、权限校验、审计切面 | — |
| **spring-boot-starter-security** | 随 SpringBoot | 登录态、安全上下文、权限控制 | — |
| **spring-boot-starter-oauth2-client** | 随 SpringBoot | Auth Zero / OAuth / OIDC 登录接入 | — |
| **spring-boot-starter-webflux** | 随 SpringBoot | 使用 WebClient 调用 token、userinfo 等外部接口 | — |
| **MyBatis-Plus** | `3.5.x` | Mapper、分页、基础 CRUD | — |
| **mysql-connector-j** | `8.x` | MySQL 数据库连接 | — |
| **io.minio:minio** | `8.5.x` | MinIO / S3 文件上传、下载、预签名 URL | [MinIO 部署](./operations/minio.md) |
| **jackson-databind** | 随 SpringBoot | JSON 序列化、请求/响应快照 | — |
| **lombok** | `1.18.x` | DTO / Entity 样板代码简化 | — |
| **springdoc-openapi** | `1.7.x` | OpenAPI 文档与接口调试，适配 SpringBoot 2.7.x | — |
| **spring-boot-starter-actuator** | 随 SpringBoot | 健康检查、指标、基础监控 | — |

---

## 三、Go 生态（备选）

> 当前项目未使用。适合高性能微服务场景。

| 技术 | 版本 | 选型理由 | 对应规范 |
|------|------|----------|----------|
| — | — | — | — |

---

## 四、Python 生态（备选）

> 当前项目未使用。适合数据处理/AI 场景。

| 技术 | 版本 | 选型理由 | 对应规范 |
|------|------|----------|----------|
| — | — | — | — |

---

## 五、运维与基础设施（跨语言）

> 本节只保留基础设施选型清单。具体部署步骤已经拆到独立“运维与基础设施”菜单，避免技术选型页变成部署手册。

| 技术 | 推荐版本 | 用途 | 详细文档 |
|------|----------|------|----------|
| **Linux** | Ubuntu 22.04 / Rocky Linux 9 | 服务器运行环境 | [命令与配置](./operations/commands-config.md) |
| **Docker** | `26.x+` | MinIO、产物镜像、离线部署 | [命令与配置](./operations/commands-config.md) |
| **Docker Compose** | `2.x` | MinIO 等基础服务编排 | [MinIO 部署](./operations/minio.md) |
| **Nginx** | `1.26+` | 静态资源、反向代理、TLS 终止 | [命令与配置](./operations/commands-config.md) |
| **JDK** | `1.8` | SpringBoot 2.7.x JAR 运行 | [JAR 部署](./operations/springboot-jar.md) |
| **Node.js** | `22.x LTS` | Nest 产物运行 | [Nest 部署](./operations/nest.md) |
| **PM2** | `5.x+` / `7.x+` | Node 进程守护 | [Nest 部署](./operations/nest.md) |
| **systemd** | 随系统 | Java / Node 裸进程托管 | [命令与配置](./operations/commands-config.md) |
| **MySQL** | `8.0+` | 业务数据库 | [业务 SQL 模板](./system-settings-sql-template.md) |
| **Redis** | `7.x` | 缓存、验证码、限流、会话 | [命令与配置](./operations/commands-config.md) |
| **MinIO / S3** | `RELEASE.2025+` | 文件、附件、导出物、归档包存储 | [MinIO 部署](./operations/minio.md) |
