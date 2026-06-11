# 主题与样式规范

> 继承 [通用编码规范](./common.md)。定义 **Design Tokens（设计令牌）、组件库覆写与公共样式结构**。
> 本文为公共基类，具体组件库差异在此续写，不重复通用规则。

---

## 一、Design Tokens（设计令牌）

所有颜色/字体/圆角通过 CSS 自定义属性 `var(--xxx)` 统一管理，集中在 `:root` 块中定义（推荐放在独立的 Design Tokens 文件中，如 `root-var.scss`）。

### 色彩体系

主色调：**`#134cff`（蓝色）**，仅支持浅色模式（`color-scheme: light`）。

#### 项目级变量

| 变量 | 值 | 用途 |
|------|----|------|
| `--primary` | `#134cff` | 主色调 |
| `--primary-deep` | `#0d38cc` | hover / active 深色 |
| `--primary-light` | `#e6eeff` | 浅色背景（hover 态） |
| `--primary-soft` | `rgba(19, 76, 255, 0.08)` | 极浅背景（tag 背景） |
| `--shadow-soft` | `0 18px 50px rgba(15, 23, 42, 0.06)` | 柔和投影 |
| `--page-bg` | `#f4f6fb` | 页面背景 |
| `--panel-bg` | `#ffffff` | 面板 / 卡片背景 |
| `--panel-subtle` | `#f8fafc` | 次面板背景 |
| `--panel-border` | `#e5eaf3` | 边框 |
| `--text-strong` | `#121826` | 标题 / 主文本 |
| `--text-muted` | `#66758f` | 辅助文字 |

#### Element Plus 主色阶

基于 `#134cff` 推导，覆盖 `--el-color-primary-*` 变量：

| 变量 | 值 | 说明 |
|------|----|------|
| `--el-color-primary` | `#134cff` | 主色 |
| `--el-color-primary-light-3` | `#5a82ff` | 浅色阶（数字越大越浅） |
| `--el-color-primary-light-5` | `#89a6ff` | |
| `--el-color-primary-light-7` | `#b8c9ff` | |
| `--el-color-primary-light-8` | `#d0dbff` | |
| `--el-color-primary-light-9` | `#e7edff` | 选中态背景色 |
| `--el-color-primary-dark-2` | `#0f3dcc` | 深色阶（active 态） |

#### 文本色（Ant Design 配色映射）

Element Plus 文本色覆盖为 Ant Design 标准：

| 变量 | 值 | 用途 |
|------|----|------|
| `--el-text-color-primary` | `rgba(0, 0, 0, 0.88)` | 标题 / 表格正文 |
| `--el-text-color-regular` | `rgba(0, 0, 0, 0.65)` | 常规正文 |
| `--el-text-color-secondary` | `rgba(0, 0, 0, 0.45)` | 辅助信息 |
| `--el-text-color-placeholder` | `rgba(0, 0, 0, 0.25)` | 占位符 |
| `--el-text-color-disabled` | `rgba(0, 0, 0, 0.25)` | 禁用文本 |

#### 功能色

| 语义 | 变量值 | 用途 |
|------|--------|------|
| Danger（危险） | `#ff4d4f` | 删除、错误 |
| Warning（警告） | `#faad14` | 待处理、提醒 |
| Success（成功） | `#52c41a` | 正常、启用 |
| Info（信息） | `#134cff` | 中性提示（同主色） |

功能色同样提供 `light-3/5/7`（浅色）和 `dark-2`（深色）色阶变量。

#### 边框与背景

| 变量 | 值 |
|------|----|
| `--el-border-color` | `#dcdfe6` |
| `--el-border-color-light` | `#e4e7ed` |
| `--el-border-color-lighter` | `#ebeef5` |
| `--el-border-color-extra-light` | `#f2f6fc` |
| `--el-fill-color` | `#f0f2f5` |
| `--el-fill-color-light` | `#f5f7fa` |
| `--el-fill-color-lighter` | `#fafafa` |
| `--el-fill-color-extra-light` | `#ffffff` |
| `--el-mask-color` | `rgba(0, 0, 0, 0.15)` |
| `--el-mask-color-extra-light` | `rgba(0, 0, 0, 0.05)` |

### 字体

```css
font-family: 'SF Pro Display', 'PingFang SC', 'Hiragino Sans GB',
             'Microsoft YaHei', sans-serif;
```

### 圆角规范

| 元素 | 圆角 | 对应变量 |
|------|------|----------|
| 按钮 / 输入框 / 小控件 | `14px` | Element Plus 覆写 |
| 菜单项 / 选项 | `5px ~ 7px` | `--el-border-radius-base` |
| 弹出框 Popover | `8px` | `--el-popover-border-radius` |
| 分页页码 | `7px` | Element Plus 覆写 |
| 消息提示 Message | `12px` | Element Plus 覆写 |
| 页面卡片 / Dialog | `24px` | Element Plus 覆写 |
| Tag / Pill | `20px` | `--el-border-radius-round` |

### 过渡

标准过渡时长统一为 **`160ms ~ 180ms ease`**：

```css
/* 布局过渡 */
transition: grid-template-columns 180ms ease;

/* 组件交互 */
transition: 160ms ease;
```

---

## 二、Element Plus 组件库覆写

> 组件库样式采用**手动管理**模式（关闭自动导入，如 Vite 插件 `importStyle: false`），
> 在应用入口中全局导入组件库 CSS，再通过覆写 `--xx-*` 变量和组件样式实现定制。
>
> 组件库覆写文件集中在独立目录（如 `element-plus/`），由汇总文件聚合引入。

### Button（按钮）

- **Primary 按钮**：背景/边框色绑定 `--el-color-primary`，hover 用 `light-7`，active 用 `dark-2`
- **非 Primary 按钮**：白色背景 + `--panel-border` 边框，hover 浅蓝背景
- **danger plain 按钮**：粉白背景 + 红调文字（`#c2414b`）

### Dialog（弹窗）

| 属性 | 覆写值 |
|------|--------|
| `border-radius` | `24px` |

### Input / Textarea（输入框）

| 属性 | 覆写值 |
|------|--------|
| `border-radius` | `14px !important` |

### Menu（菜单）

- 移除右侧边框 `border-right: unset`
- 菜单项高度：`42px`
- 子菜单项圆角：`5px`
- 选中态：主色背景 + 白色文字
- hover 态：主色文字，不改变背景

### Message（消息提示）

毛玻璃风格卡片：
- 圆角 `12px`
- 双层渐变背景 + `backdrop-filter: blur(10px)`
- 文字色 `#4a3819`（棕色调）
- success / warning / error 各有对应图标色和边框色

### Popover（弹出框）

| 属性 | 覆写值 |
|------|--------|
| `--el-popover-border-radius` | `8px` |

### Select（下拉选择）

- 选项圆角：`6px`
- 选项文字色：`#000000`
- 选中态：`light-9` 背景

### Pagination（分页）

- 页码圆角：`7px`
- 页码选择器 `min-width: 100px`

### Tag（标签）

- 统一 `size="small"` + `effect="light"`
- 用于状态展示，不额外覆写样式

---

## 三、公共样式结构

### 入口文件

样式入口按 **加载优先级** 顺序编排，后续引入的规则覆盖前者：

| 层级 | 内容 | 说明 |
|------|------|------|
| ① 全局重置 | TailwindCSS / CSS Reset | 盒模型、margin、字体继承 |
| ② Design Tokens | CSS 变量 `:root` 块 | 颜色、圆角、字体、过渡 |
| ③ 组件库覆写 | 组件库变量覆写 + 组件样式覆写 | 按组件拆分文件，由汇总入口聚合 |
| ④ 应用壳布局 | App Shell Grid 布局 | 侧边栏 + 内容区结构 |
| ⑤ 侧边栏导航 | 侧边栏样式 | 品牌区、菜单、折叠态 |
| ⑥ 页面模板 | Page Stack 通用模板 | 标题栏、工具栏、表格区、对话框 |
| ⑦ 业务组件 | 卡片、列表、归档浏览器等 | 按功能域拆分 |
| ⑧ 特殊页面 | 登录页、上传页 | 独立布局的页面 |
| ⑨ 响应式 | 媒体查询断点 | 平板 ≤1180px / 手机 ≤720px |

### App Shell 布局

| 选择器 | 职责 |
|--------|------|
| `.app-shell` | CSS Grid 2 列，侧边栏 248px + 内容区 1fr |
| `.sidebar-panel` | 侧边栏，sticky、毛玻璃背景 |
| `.content-panel` | 主内容区容器 |
| `.content-header` | 固定顶部导航栏 |
| `.content-body` | 内容区，默认 padding: 128px 32px 40px |

- 折叠态 `sidebar-collapsed`：侧边栏缩为 96px，导航链接居中
- 环境标识 `.env-badge`：development（绿）/ test（黄）/ production（红）

### Page Stack 模板

所有管理页面遵循统一结构：

| 选择器 | 职责 |
|--------|------|
| `.page-stack` | 页面主容器，24px 间距网格 |
| `.admin-headbar` | 双栏结构，标题区 + 操作区 |
| `.admin-headbar-copy` | 页面标题、副标题、说明文案 |
| `.admin-headbar-actions` | 新建、导入、导出等操作按钮 |
| `.admin-workbench` | 内容工作区，18px 间距网格 |
| `.admin-toolbar` | 筛选工具栏 |
| `.admin-table-wrap` | 表格区域，顶部使用分割线 |

### SCSS 编码约定

| 规则 | 说明 |
|------|------|
| `<style lang="scss" scoped>` | 组件样式必须 scoped |
| Flat class 命名 | 用 `.admin-action-group` 而非严格 BEM |
| 嵌套深度 | 避免超过 2 层 |
| 变量 | 优先使用 `var(--xxx)` 而非 SCSS 变量 |
| 过渡 | 统一 `160ms ease` / `180ms ease` |

---

## 四、响应式断点

| 断点 | 触发 | 变化 |
|------|------|------|
| `@media (max-width: 1180px)` | 平板及以下 | 侧边栏变上下布局，Grid 变单列，header 变 static |
| `@media (max-width: 720px)` | 手机 | 内边距收窄至 16px，标题缩小至 34px |

---

## 五、AI 提示词（主题/样式）

追加到通用规范后：

```
主题与样式：
- 主色调 #134cff（蓝色），仅浅色模式
- 所有颜色/字体/圆角用 var(--xxx) 管理
- Element Plus 样式手动管理，全局导入 + var 覆写
- 页面结构遵循 Page Stack 模板（admin-headbar → ContentSection → Dialog）
- 组件样式加 scoped，优先 var() 而非 SCSS 变量
- 过渡统一 160ms~180ms ease
```
