# 框架推荐与对齐路线

> 用于统一当前项目群的框架选择、职责边界和落地顺序。
> 当前结论以 `vite-admin-vue` 为前端后台基座优先，`desktop-infra-starter` 为 Electron 桌面壳基座，`SpringBoot` 为 Java 后端基座。

## 一、推荐结论

### 1.1 后台页面基座

**推荐优先使用 `vite-admin-vue` 作为后台页面层框架。**

原因：

1. 已具备 Vue3 + Vite + TypeScript + Element Plus 的完整后台骨架。
2. 已有动态路由、权限、Pinia、Mock、组件封装等管理后台常见能力。
3. 比 `desktop-infra-starter/client` 更接近“平台后台模板”，更适合沉淀通用页面层规范。
4. 后续无论挂在纯 Web 后台，还是挂在 SpringBoot / Electron 项目中，都具备较好的复用基础。

### 1.2 Electron 桌面基座

**推荐使用 `desktop-infra-starter` 作为桌面端壳层框架。**

原因：

1. 它已经完成 Electron 主进程、Nest 本地服务、运行状态探测、内置 MySQL 模式切换等桌面基础能力。
2. 它更适合承担“桌面容器、进程编排、运行时能力桥接”，而不是通用后台页面模板。
3. 如果后续桌面端需要更强页面能力，可以将 `vite-admin-vue` 的页面层能力迁入，而不是反过来让 `desktop-infra-starter/client` 承担后台模板职责。

### 1.3 Java 后端基座

**推荐使用 SpringBoot 作为核心业务后端基座，并额外配套一个 `vite-admin` 页面工程。**

推荐理解方式：

1. `SpringBoot` 负责认证、权限、审计、业务 API、集成能力。
2. `vite-admin-vue` 衍生工程负责管理后台页面层。
3. 两者通过标准 REST / Token / 菜单权限接口对接。

也就是说，SpringBoot 项目本身不直接承担复杂页面实现，而是配套一个独立前端管理台工程。

---

## 二、职责边界

### 2.1 `vite-admin-vue`

定位：**后台页面层基座**

负责：

1. 登录页、工作台、列表页、表单页、详情页、权限页面。
2. 路由、菜单、按钮级权限、布局、主题、通用组件。
3. 调用后端 API，不承载桌面运行时能力。

不负责：

1. Electron 主进程生命周期。
2. 本地数据库进程监管。
3. Java / Nest 后端业务实现。

### 2.2 `desktop-infra-starter`

定位：**Electron 壳层 + 本地运行时编排基座**

负责：

1. Electron 主进程。
2. Preload / IPC / Bridge。
3. 本地 API 进程拉起。
4. 内置数据库模式和运行时状态探测。

不负责：

1. 作为团队统一后台页面模板长期演进。
2. 复杂管理后台页面能力沉淀。

### 2.3 `SpringBoot`

定位：**核心业务后端基座**

负责：

1. 登录、鉴权、权限、会话。
2. 用户、角色、菜单、权限点、审计日志。
3. 文件存储、附件预览、集成接口等企业后台能力。

不负责：

1. 页面层渲染。
2. Electron 容器能力。

---

## 三、`vite-admin-vue` 优先对齐项

当前 `vite-admin-vue` 适合作为推荐基座，但和现有规范仍有一些差异，建议按下面顺序收敛。

### 3.1 第一优先级：分层补齐

目标：对齐 [Vue 前端扩展规范](./standards/vue.md) 中的 `model/ -> service/ -> api/ -> store/ -> views/` 调用链。

当前现状：

1. 已有 `api/`、`service/`、`store/`。
2. 缺少明确的 `model/` 类型层。
3. 部分 API 类型直接依赖 `mocks` 数据结构，不适合做正式项目基座。

建议动作：

1. 新增 `src/model/`，按领域沉淀 `auth.ts`、`user.ts`、`permission.ts`、`common.ts`。
2. `src/api/*.ts` 从依赖 `mocks` 类型改为依赖 `model` 类型。
3. 将分页、统一返回、查询参数等公共类型提取到 `model/common.ts`。

### 3.2 第二优先级：页面命名统一

目标：页面文件统一采用 `kebab-case`，页面组件尽量使用 `-view` 后缀。

当前现状：

1. 存在 `WelcomeTo.vue`、`Table.vue`、`Upload.vue` 这类不统一命名。
2. 页面目录中同时存在演示页、能力页、系统页，后续业务接入时容易继续发散。

建议动作：

1. 新页面一律按规范命名，不再延续 PascalCase 文件名。
2. 演示页和正式业务页分层，建议拆成 `examples/` 与 `business/`。
3. 逐步把典型页面重命名为 `*-view.vue`，旧页面分阶段迁移，避免一次性大改。

### 3.3 第三优先级：Store 结构收敛

目标：统一状态层职责，避免业务逻辑散落在视图和 API 之间。

当前现状：

1. `store/module/` 已有基础能力。
2. 目录命名更偏模板风格，和规范中的领域式命名仍有差距。

建议动作：

1. 保留现有 Pinia 机制。
2. 后续新增业务状态时按领域沉淀，不再继续扩张“模板示例式” store。
3. 登录态、权限态、标签页态继续保留为基础设施 store。

### 3.4 第四优先级：去模板示例耦合

目标：把 `vite-admin-vue` 从“演示模板”收敛成“可复用后台框架”。

建议动作：

1. 区分 `framework demo` 和 `business starter`。
2. 保留路由引擎、权限、布局、表格表单组件等高复用能力。
3. 把纯演示性质页面逐步下沉到示例区，避免业务项目直接依赖它们。

---

## 四、SpringBoot 项目推荐结构

如果后续以 SpringBoot 为核心后端，推荐采用前后端分离结构：

```text
project-root/
  server/                         # SpringBoot 主服务
  admin-web/                      # 基于 vite-admin-vue 提纯后的后台页面工程
  docs/                           # 项目文档
```

### 4.1 `server/` 推荐分层

```text
server/
  src/main/java/.../
    controller/
    service/
    service/impl/
    mapper/
    entity/
    dto/
    vo/
    common/
    security/
    aspect/
```

对齐参考：

1. [角色权限 - SpringBoot 实现](./business-implementation/role-permission/springboot.md)
2. [技术选型清单](./project-overview.md)
3. [JAR 包部署](./operations/springboot-jar.md)

### 4.2 `admin-web/` 推荐来源

`admin-web/` 建议直接以 `vite-admin-vue` 为基础提纯，而不是重新从零搭页面工程。

保留：

1. 布局系统。
2. 权限路由。
3. 通用组件。
4. API / Store / 页面分层。

裁剪：

1. 和实际业务无关的展示页。
2. 过重的模板演示内容。
3. 与最终业务无关的 mock 示例依赖。

---

## 五、推荐落地顺序

### 阶段一：先定前端基座

1. 以 `vite-admin-vue` 为后台页面基座。
2. 先完成目录、命名、类型层、API 层规范对齐。
3. 输出一个可复制的新项目 starter 版本。

### 阶段二：再定 SpringBoot 基座

1. 以角色权限模型为第一批公共能力。
2. 先完成用户、角色、菜单、权限点、登录态接口骨架。
3. 页面层直接接入 `admin-web`。

### 阶段三：最后整合桌面端

1. 以 `desktop-infra-starter` 作为 Electron 壳层。
2. 视业务需要将 `admin-web` 的页面层能力嵌入 Electron 渲染层。
3. 让桌面端聚焦运行时能力，不再重复维护另一套后台页面体系。

---

## 六、当前执行建议

基于当前项目状态，**建议近期主线是：**

1. 优先整理并规范化 `vite-admin-vue`。
2. 以它为原型抽出 `admin-web` 通用后台工程。
3. 再按 SpringBoot 规范补后端骨架。
4. `desktop-infra-starter` 暂时保持桌面框架定位，不作为团队后台页面主基座。

这条路线可以最大化复用现有代码，同时减少桌面端、Web 端、Java 后端三套体系互相牵扯的问题。
