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
| **Vitest** | `^4.0.0` / `^1.5.0` | 前端单测、组件调试、UI 测试面板 | — |
| **husky** | `^7.0.4` | Git Hooks 约束，落地 lint / format / commit 检查 | — |
| **lint-staged** | `^15.5.1` | 仅检查暂存文件，降低提交前耗时 | — |

### 1.4 构建工具

| 技术 | 版本 | 选型理由 | 对应规范 |
|------|------|----------|----------|
| **Vite** | `^8.0.14` | 插件生态（Vue/Tailwind/Electron/自动导入） | — |
| **vue-tsc** | `^3.3.1` | Vue SFC 类型检查 | — |
| **@vitejs/plugin-vue** | `^6.0.7` | Vue 单文件组件编译 | — |
| **@vitejs/plugin-vue-jsx** | `^5.0.0` / `^4.1.2` | JSX/TSX 扩展，适合表格渲染器、函数式组件 | — |
| **@vitejs/plugin-legacy** | `^8.0.0` / `^6.1.0` | 兼容低版本浏览器或嵌入式 WebView | — |
| **vite-plugin-html** | `^3.2.2` | 注入运行时变量和构建元数据 | — |
| **vite-plugin-svg-icons** | `^2.0.1` | SVG 雪碧图与本地图标注册 | — |
| **rollup-plugin-visualizer** | `^5.9.2` | 构建产物体积分析 | — |

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
| **@nestjs/typeorm** | `^11.0.1` | Nest 与 TypeORM 集成 | — |
| **dotenv** | `^16.6.1` | 运行时环境变量加载 | — |
| **body-parser** | `^2.2.2` | 请求体兼容处理，适用于特殊 webhook / 大报文场景 | — |
| **rxjs** | `^7.8.1` | Nest 底层响应式流和异步编排 | — |
| **reflect-metadata** | `^0.2.2` | 装饰器元数据运行时支持 | — |

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
| **dayjs** | `^1.11.x` | 时间格式化、相对时间、时区处理 | — |
| **lodash-es** | `^4.17.21` | 通用集合处理与对象工具 | — |
| **mitt** | `^3.0.1` | 轻量事件总线，适合插件通信和局部解耦 | — |
| **nprogress** | `^0.2.0` | 路由切换与请求进度反馈 | — |
| **qs** | `^6.14.0` | 复杂查询参数序列化 | — |
| **sortablejs** | `^1.15.x` | 列表拖拽排序 | — |
| **qrcode** | `^1.5.3` | 二维码生成 | — |
| **jsencrypt** | `^3.3.2` | 前端公钥加密场景 | — |
| **html2canvas** | `^1.4.1` | DOM 截图、导出海报、可视化快照 | — |
| **print-js** | `^1.6.0` | 浏览器打印封装 | — |
| **echarts** | `^5.4.3` | 报表、统计看板、运营数据可视化 | — |
| **tinymce** | `5.10.9` | 富文本编辑器 | — |
| **@element-plus/icons-vue** | `^2.3.x` | Element Plus 图标组件 | — |
| **@floating-ui/dom** | `^1.7.0` | 弹层定位、悬浮菜单、提示层布局 | — |
| **axios-jsonp** | `^1.0.4` | 兼容旧接口的 JSONP 请求 | — |

#### ☐ React（备选）

> 当前项目未使用。如需引入：React 18+ / Next.js / Ant Design / Zustand。

### 1.6.1 文件预览与办公文档

| 技术 | 版本 | 选型理由 | 对应规范 |
|------|------|----------|----------|
| **pdfjs-dist** | `^4.9.155` | 浏览器 PDF 渲染与分页预览 | — |
| **docx-preview** | `^0.3.x` | Word 文档前端渲染 | — |
| **docx** | `^8.5.0` | Word 文档生成 | — |
| **xlsx** | `^0.18.5` | Excel 读写与数据导入导出 | — |
| **@vue-office/pdf** | `^1.6.4` | PDF 组件化预览 | — |
| **@vue-office/excel** | `^1.7.1` | Excel 组件化预览 | — |

### 1.6.2 微前端与多应用集成

| 技术 | 版本 | 选型理由 | 对应规范 |
|------|------|----------|----------|
| **qiankun** | `^2.10.16` | 主子应用注册、沙箱隔离、生命周期托管 | [微前端 Vite 版本](./business-implementation/micro-frontend/practice.md) |
| **vite-plugin-qiankun** | `^1.0.15` | Vite 项目快速接入 qiankun 运行时 | [微前端 Vite 版本](./business-implementation/micro-frontend/practice.md) |

---

### 1.7 桌面壳层

#### ✅ Electron

| 技术 | 版本 | 选型理由 | 对应规范 |
|------|------|----------|----------|
| **Electron** | `^42.1.0` | 跨平台桌面壳，主进程/渲染进程隔离 | [Electron 规范](./standards/electron.md) |
| **electron-builder** | `^26.8.1` | DMG / NSIS / AppImage 多平台打包 | — |
| **vite-plugin-electron** | `^1.0.0` | Vite 下 Electron 构建集成 | — |
| **vite-plugin-electron-renderer** | `^1.0.0` | 渲染进程 Node/Electron API 适配 | — |
| **archiver** | `^8.0.0` | 文件恢复时打包 ZIP 归档 | — |

#### ☐ Tauri（备选）

> 更轻量的桌面壳方案（Rust 内核），当前项目未使用。

### 1.7.1 参考外链

| 资源 | 说明 | 链接 |
|------|------|------|
| 纯客户端桌面架构参考 | 纯客户端形态的桌面基础设施脚手架，可用于对照 Electron 本地优先、无服务端依赖的架构拆分方式 | [desktop-infra-starter](https://qsyjlab.github.io/desktop-infra-starter/) |

---

### 1.8 样式方案

| 技术 | 版本 | 选型理由 | 对应规范 |
|------|------|----------|----------|
| **Tailwind CSS** | `^4.3.0` | 原子化 CSS + 全局重置 | [主题规范](./standards/theme.md#三公共样式结构) |
| **Sass/SCSS** | `^1.100.0` | Design Tokens + 组件库覆写 | [主题规范](./standards/theme.md#一design-tokens设计令牌) |
| **Element Plus 样式覆写** | `^2.11.2` | 手动管理，覆写 `--el-*` CSS 变量 | [主题规范](./standards/theme.md#二element-plus-组件库覆写) |
| **UnoCSS** | `^66.0.0` / `^0.58.x` | 更轻量的原子化样式方案，适合后台、可视化、组件库项目 | — |
| **@unocss/reset** | `^66.0.0` / `^0.58.x` | 配套 Reset 样式 | — |

> Tailwind 负责全局重置和工具类，SCSS 负责 Design Tokens 和组件库覆写，职责分离。

---

## 二、Java 生态（备选）

### 2.1 后端框架

#### ☐ SpringBoot

> 当前项目未使用。下面是可复用的 SpringBoot 2.7.x 依赖清单，按认证中心 / 审计日志 / 平台管理这类企业后台能力蒸馏。

| 技术 | 版本 | 选型理由 | 对应规范 |
|------|------|----------|----------|
| **SpringBoot** | `2.7.x` | Java 后端基座，适合企业后台、权限、审计、集成系统 | — |
| **JDK** | `1.8` | 对齐现有 Java 8 运行环境，SpringBoot 使用 2.7.x | [JAR 部署](./operations/springboot-jar.md) |
| **spring-boot-starter-web** | 随 SpringBoot | REST Controller、Servlet 请求上下文 | — |
| **spring-boot-starter-validation** | 随 SpringBoot | DTO 参数校验 | — |
| **spring-boot-starter-aop** | 随 SpringBoot | 操作日志、权限校验、审计切面 | — |
| **spring-boot-starter-security** | 随 SpringBoot | 登录态、安全上下文、权限控制 | — |
| **spring-boot-starter-oauth2-client** | 随 SpringBoot | OAuth / OIDC 登录接入 | — |
| **spring-boot-starter-oauth2-resource-server** | 随 SpringBoot | 资源服务器鉴权、Bearer Token 校验 | — |
| **spring-boot-starter-webflux** | 随 SpringBoot | 使用 WebClient 调用 token、userinfo 等外部接口 | — |
| **spring-boot-starter-data-redis** | 随 SpringBoot | 缓存、验证码、令牌、会话、多端登录控制 | — |
| **MyBatis-Plus** | `3.5.x` | Mapper、分页、基础 CRUD | — |
| **PageHelper** | `1.4.6` | 老项目分页插件兼容方案 | — |
| **mysql-connector-j** | `8.x` | MySQL 数据库连接 | — |
| **postgresql** | `42.x` | PostgreSQL 数据库连接 | — |
| **pgvector** | `0.1.6` | 向量字段与相似度检索 | — |
| **io.minio:minio** | `8.5.x` | MinIO / S3 文件上传、下载、预签名 URL | [MinIO 部署](./operations/minio.md) |
| **jackson-databind** | 随 SpringBoot | JSON 序列化、请求/响应快照 | — |
| **lombok** | `1.18.x` | DTO / Entity 样板代码简化 | — |
| **springdoc-openapi** | `1.7.x` | OpenAPI 文档与接口调试，适配 SpringBoot 2.7.x | — |
| **springfox-boot-starter** | `3.0.0` | 老项目 Swagger 文档兼容方案 | — |
| **spring-boot-starter-actuator** | 随 SpringBoot | 健康检查、指标、基础监控 | — |
| **jjwt** | `0.9.1` | JWT 签发与解析 | — |
| **spring-security-oauth2-jose** | 随 SpringBoot | JWT / JWK / JOSE 支持 | — |
| **spring-security-oauth2** | `2.5.2.RELEASE` | 旧版 OAuth2 体系兼容维护 | — |
| **spring-security-oauth2-autoconfigure** | `2.2.1.RELEASE` | 老项目 OAuth2 自动配置 | — |
| **Spring Cloud** | `2021.0.8` | 配置、服务治理、云原生扩展基座 | — |
| **Spring Cloud Alibaba** | `2021.0.4.0` | Nacos 等阿里云生态扩展 | — |
| **fastjson2** | `2.0.21` | 快速 JSON 序列化与旧接口兼容 | — |
| **hutool-all** | `5.8.x` | 常用工具类集合 | — |
| **commons-lang3** | `3.17.0` | 字符串、日期、对象工具 | — |
| **commons-beanutils** | `1.9.4` | Bean 拷贝与属性映射 | — |
| **jsoup** | `1.17.2` | HTML 抓取、清洗与结构解析 | — |
| **Apache Tika** | `2.9.0` | 文件类型识别与内容抽取 | — |
| **Thumbnailator** | `0.4.19` | 图片缩略图与压缩处理 | — |
| **OpenAI Java SDK** | `0.18.2` | LLM 对话与推理接口接入 | — |
| **LangChain4j** | `0.29.1` | Java 侧 LLM 编排、检索增强、Embedding 接入 | — |
| **OkHttp / OkHttp SSE** | `4.10.0` | 流式调用、SSE、第三方 SDK HTTP 基座 | — |

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
