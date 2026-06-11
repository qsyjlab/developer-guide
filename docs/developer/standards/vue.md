# Vue 前端扩展规范

> 继承 [通用编码规范](./common.md) 与 [主题样式规范](./theme.md)。**仅写 Vue 前端特有约定**，通用规则与样式不在本文档重复。

---

## 一、组件文件命名

**原则：文件名统一使用 kebab-case（小写多单词短横线分割），组件导入变量使用 PascalCase（大驼峰）。**

> 本项目所有文件名均为 kebab-case，Vue 组件文件也不例外。

### 文件命名 + 导入示例

| 类型 | 文件（kebab-case） | 导入变量（PascalCase） |
|------|-------------------|----------------------|
| 页面视图 | `devices-view.vue` | `import DevicesView from '@/views/devices-view.vue'` |
| 页面视图 | `users-view.vue` | `import UsersView from '@/views/users-view.vue'` |
| 对话框/弹窗 | `role-edit-dialog.vue` | `import RoleEditDialog from '@/components/role-edit-dialog.vue'` |
| 布局组件 | `app-layout.vue` | `import AppLayout from '@/layouts/app-layout.vue'` |
| 业务通用组件 | `content-section.vue` | `import ContentSection from '@/components/content-section.vue'` |

### 命名规则总结

| 关注点 | 规范 | 示例 |
|--------|------|------|
| 文件名 | **kebab-case**（小写 + `-` 分割） | `devices-view.vue`, `role-edit-dialog.vue` |
| 导入变量 | **PascalCase**（大驼峰） | `DevicesView`, `RoleEditDialog` |
| 模板中使用 | **kebab-case**（Vue 模板规范） | `<devices-view />`, `<role-edit-dialog />` |

### 后缀约定

- 页面视图加 `-view` 后缀：`devices-view.vue`、`project-detail-view.vue`
- 对话框加 `-dialog` 后缀：`role-edit-dialog.vue`、`archive-explorer-dialog.vue`
- 布局加 `-layout` 后缀：`app-layout.vue`、`admin-layout.vue`

---

## 二、前端 TS 文件命名

| 层级 | 规范 | 示例 |
|------|------|------|
| API 层 (`api/`) | **单单词小写** | `auth.ts`, `device.ts`, `project.ts`, `snapshot.ts` |
| Model 层 (`model/`) | **单单词小写** | `common.ts`, `device.ts`, `project.ts` |
| Store 层 (`stores/`) | **单单词小写** | `app.ts`, `auth.ts` |
| Service/Hook (`service/`, `hooks/`) | **kebab-case** | `axios-request.ts`, `use-context.ts` |
| Utils (`utils/`) | **单单词小写** | `format.ts` |
| Bridge 层 | **kebab-case** | `app-bridge.ts` |

---

## 三、前端分层架构

### 3.1 调用链路

| 顺序 | 层级 | 示例写法 | 职责 |
|------|------|----------|------|
| 1 | 页面视图 | `import { getUsers } from '@/api/users'` | 模板组装、数据绑定、触发交互 |
| 2 | API 请求层 | `apiService.get<ListPayload<UserInfo>>('users', { params })` | 一个资源端点对应一个导出函数 |
| 3 | HTTP 服务层 | `class ApiService { get<T>(url, config): Promise<T> }` | axios 实例、拦截器、响应适配 |
| 4 | Model 类型层 | `interface UserInfo { id, account, displayName, status }` | 与后端契约对齐，全项目共用 |

### 3.2 各层职责与文件定位

| 层级 | 目录 | 文件命名 | 职责 | 依赖方向 |
|------|------|----------|------|----------|
| **model/** | `src/model/` | 单单词小写，按领域拆分 | 定义与后端对齐的 TS 接口/类型，零逻辑 | 无依赖（纯类型） |
| **service/** | `src/service/` | kebab-case | axios 实例化、拦截器（token 注入/错误统一处理/响应解包） | 依赖 model |
| **api/** | `src/api/` | 单单词小写，与 model 同名对应 | 每个 API 端点一个导出函数，调用 `apiService` 发请求 | 依赖 service + model |
| **stores/** | `src/stores/` | 单单词小写 | Pinia 状态管理，调用 api 层获取数据，暴露响应式状态 | 依赖 api + model |
| **views/** | `src/views/` | kebab-case + `-view` 后缀 | 页面模板组装，通过 stores 或直接调 api 获取数据 | 依赖 stores/api/model |
| **components/** | `src/components/` | kebab-case | 通用/业务组件，通过 props 接收数据 | 依赖 model（类型） |

> 注意：这里的 `api/` 是前端请求封装目录，不代表后端 Controller 必须写 `/api` 前缀。后端控制器按资源名定义，例如 `roles`、`logs/operation`。

### 3.3 model/ 与 api/ 的对应关系

| model 文件 | 主要类型 | api 文件 | 请求函数 | 资源动作 |
|------------|----------|----------|----------|----------|
| `auth.ts` | `LoginInput`、`LoginResponse` | `auth.ts` | `login()`、`refreshToken()` | `POST auth/login`、`POST auth/refresh` |
| `project.ts` | `ProjectRecord`、`CreateProjectInput`、`UpdateProjectInput` | `project.ts` | `getProjects()`、`createProject()`、`updateProject()` | `GET projects`、`POST projects`、`PUT projects/:id` |
| `snapshot.ts` | `SnapshotRecord` | `snapshot.ts` | `getSnapshots()`、`createSnapshot()` | `GET snapshots`、`POST snapshots` |
| `common.ts` | `ApiResult<T>`、`ListPayload<T>` | — | — | 全局返回包装与分页包装 |

> **原则**：`model/` 与 `api/` 文件一一对应，命名一致。一个领域如果新增 API，在对应的 `api/xx.ts` 追加函数，在 `model/xx.ts` 追加类型。不要跨文件混放。

### 3.4 API 函数签名规范

```ts
// src/api/users.ts
import { apiService } from '@/service'
import type { UserInfo, CreateUserInput, UpdateUserInput } from '@/model/users'
import type { ListPayload, ListQuery } from '@/model/common'

/** 分页查询 */
export function getUsers(params: ListQuery): Promise<ListPayload<UserInfo>> {
  return apiService.get('admin/users', { params })
}

/** 创建 */
export function createUser(data: CreateUserInput): Promise<UserInfo> {
  return apiService.post('admin/users', data)
}

/** 更新 */
export function updateUser(id: number, data: UpdateUserInput): Promise<UserInfo> {
  return apiService.put(`admin/users/${id}`, data)
}

/** 删除 */
export function deleteUser(id: number): Promise<void> {
  return apiService.delete(`admin/users/${id}`)
}
```

> **规范**：每个函数命名 = 动词 + 资源名（`getUsers`、`createUser`），参数用 `data` 或具名参数，返回值用 `Promise<T>`，不写 `try/catch`（统一由拦截器处理）。

---

## 四、页面结构模板

所有管理页面遵循统一 **Page Stack**：

```html
<div class="page-stack">
  <!-- 1. 头部 -->
  <section class="admin-headbar">
    <div class="admin-headbar-copy">
      <p class="page-kicker">ADMIN</p>
      <h1 class="page-title">页面标题</h1>
      <p class="page-lead">简短说明。</p>
    </div>
    <div class="admin-headbar-actions">
      <el-button type="primary">新建</el-button>
    </div>
  </section>

  <!-- 2. 内容区 -->
  <content-section title="区块标题" description="区块说明">
    <div class="admin-workbench">
      <div class="admin-toolbar">
        <pro-form :fields="filterFields" :inline="true" />
      </div>
      <div class="admin-table-wrap">
        <pro-table :columns="columns" :request="loadData" />
      </div>
    </div>
  </content-section>

  <!-- 3. 对话框 -->
  <el-dialog v-model="visible" title="标题" width="480px">
    <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
      ...
    </el-form>
  </el-dialog>
</div>
```

---

## 五、组件使用规范

### ProTable 列定义

```ts
const columns: ProTableColumns = [
  { key: 'name', title: '名称', minWidth: 160 },
  { key: 'status', title: '状态', width: 100, align: 'center' },
  { key: 'createdAt', title: '创建时间', minWidth: 180 },
  { key: 'actions', title: '操作', width: 240, fixed: 'right', align: 'center' }
]
```

### ProForm 字段定义

```ts
const filterFields: FormSchema[] = [
  {
    key: 'keyword',
    label: '关键词',
    el: 'el-input',
    attrs: { placeholder: '搜索...', clearable: true },
    col: { span: 8 }
  }
]
```

### 操作按钮组

```html
<div class="admin-action-group">
  <el-button size="small" plain>编辑</el-button>
  <el-button size="small" type="danger" plain>删除</el-button>
</div>
```

### Element Plus 使用约定

- Tag 状态：统一 `size="small"` + `effect="light"`
- 状态色映射：success（正常/启用）、danger（禁用/失败）、warning（待处理/进行中）
- 具体颜色/圆角/覆写参见 [主题样式规范](./theme.md#二element-plus-组件库覆写)

---

## 六、组件文件拆分

**原则：`.vue` 文件只负责模板组装与数据绑定，类型/常量/逻辑/校验规则全部拆到独立文件中。**

### 拆与不拆的边界

| 场景 | 判断 |
|------|------|
| `<script setup>` ≤ 80 行，无自定义类型 | 不拆，单体 `.vue` 即可 |
| `<script setup>` > 80 行 | **必须拆分** |
| 包含自定义 interface/type（非 model 层已有类型） | 抽到 `types.ts` |
| 包含枚举、选项列表等常量 | 抽到 `constants.ts` |
| 包含数据获取、提交、确认等业务逻辑 | 抽到 `use-xxx.ts` composable |
| 包含表单校验规则 | 抽到 `rules.ts` |
| 组件样式超过 30 行 | 抽到 `style.scss`（仅复杂组件） |

### 拆分内容与存放位置

| 内容 | 提取到 | 文件命名 |
|------|--------|----------|
| 组件级类型定义 | `types.ts` | 同目录下 `types.ts` |
| 常量 / 枚举 / 选项列表 | `constants.ts` | 同目录下 `constants.ts` |
| 业务逻辑（数据请求、表单提交、对话框控制） | `use-xxx.ts` composable | 同目录下 `use-{功能}.ts` |
| 表单校验规则 | `rules.ts` | 同目录下 `rules.ts` |
| 复杂样式（>30 行） | `style.scss` | 同目录下 `style.scss`（仅复杂组件） |

### 拆前 vs 拆后（以管理页面为例）

**❌ 拆前（600+ 行单体 `.vue`）**：

| 文件 | 问题 |
|------|------|
| `users-view.vue` | 模板、类型、逻辑、校验、样式全部塞在一个文件里 |

**✅ 拆后**：

| 文件 | 职责 |
|------|------|
| `users-view.vue` | 仅模板组装 + 数据绑定，尽量控制在 150 行左右 |
| `types.ts` | `UserForm`、`UserQuery` 等页面级类型 |
| `constants.ts` | 状态选项、角色选项等静态数据 |
| `use-users-table.ts` | 表格数据加载、分页、搜索逻辑 |
| `use-users-form.ts` | 新增/编辑表单提交逻辑 |
| `use-users-delete.ts` | 删除确认逻辑 |
| `rules.ts` | 表单校验规则 |

### Composable 命名与结构

```ts
// use-users-table.ts —— 单一职责，只做表格相关
export function useUsersTable() {
  const loading = ref(false)
  const list = ref<UserInfo[]>([])
  const pagination = reactive({ current: 1, pageSize: 20, total: 0 })

  async function loadData(params: Record<string, unknown>) {
    // ...
  }

  return { loading, list, pagination, loadData }
}
```

```ts
// use-users-form.ts —— 只做表单提交
export function useUsersForm() {
  const visible = ref(false)
  const formRef = ref<FormInstance>()
  const form = reactive<CreateUserInput>({ /* ... */ })

  async function submit() {
    // ...
  }

  return { visible, formRef, form, submit }
}
```

### Model 层类型 vs 页面级类型

| 层级 | 存放 | 内容 |
|------|------|------|
| `model/` | 领域类型 | 与后端 API 对齐的 Entity 类型（`UserRecord`、`CreateUserInput`），全项目共用 |
| 页面 `types.ts` | 页面级类型 | 仅此页面使用的派生类型（`UserForm`、`UserQuery`），不从 model 暴露 |

> **参考实现**：`components/pro-table/src/` 和 `components/pro-form/src/` 已按此模式拆分（types/、hooks/、store/、constants/），View 层也应以此为标准。

---

## 七、AI 提示词（Vue）

追加到通用规范后：

```
Vue 前端扩展：
- 组件文件名用 kebab-case（devices-view.vue、role-edit-dialog.vue）
- 导入变量用 PascalCase（import DevicesView from '@/views/devices-view.vue'）
- 模板中使用 kebab-case 标签（<devices-view />、<role-edit-dialog />）
- 页面视图加 -view 后缀，对话框加 -dialog 后缀
- API/Model/Store 文件用单单词小写（auth.ts、device.ts），与领域一一对应
- 调用链路：views → stores/api → api → service（axios），model 为全层提供类型
- model/ 与 api/ 文件一一对应，命名一致，model 放类型，api 放请求函数
- 页面结构遵循 Page Stack 模板
- <script setup> 超过 80 行必须拆分：类型→types.ts，常量→constants.ts，逻辑→use-xxx.ts，校验→rules.ts
- Model 层放领域类型（全项目共用），页面级类型放同目录 types.ts
- 主题/颜色/圆角/响应式参见独立 Theme 规范
```
