# 微前端 Vite 版本

---

## 一、命名约定

| 角色     | 名称                    |
| -------- | ----------------------- |
| 主应用   | `portal-shell`          |
| 子应用 A | `module-console`        |
| 子应用 B | `module-workbench`      |
| 网关域名 | `gateway.example.local` |

| 应用               | 路径前缀      |
| ------------------ | ------------- |
| `portal-shell`     | `/`           |
| `module-console`   | `/console/`   |
| `module-workbench` | `/workbench/` |

---

## 二、必须对齐的 4 个配置

| 项目            | `module-console` 示例值                  |
| --------------- | ---------------------------------------- |
| 子应用部署路径  | `/console/`                              |
| Vite `base`     | `/console/`                              |
| Vue Router base | `/console/`                              |
| 主应用 `entry`  | `https://gateway.example.local/console/` |

常见错误表现：

- 刷新 404
- JS/CSS 404
- 主应用可访问，子应用白屏

---

## 三、主应用配置

### 3.1 注册示例

```ts
import { registerMicroApps, start } from "qiankun";

registerMicroApps([
  {
    name: "module-console",
    entry: "https://gateway.example.local/console/",
    container: "#micro-app-container",
    activeRule: "/console",
    props: {
      appCode: "module-console",
      workspaceId: "ws_demo_01",
      theme: "light",
    },
  },
  {
    name: "module-workbench",
    entry: "https://gateway.example.local/workbench/",
    container: "#micro-app-container",
    activeRule: "/workbench",
    props: {
      appCode: "module-workbench",
      workspaceId: "ws_demo_01",
      theme: "light",
    },
  },
]);

start({
  sandbox: true,
  prefetch: "all",
});
```

### 3.2 属性解释

| 字段         | 说明           | 错误表现                       |
| ------------ | -------------- | ------------------------------ |
| `name`       | 子应用唯一标识 | 重复时生命周期混乱             |
| `entry`      | 子应用入口地址 | 少 `/` 或路径不对会资源 404    |
| `container`  | 挂载 DOM       | 节点不存在时无法 mount         |
| `activeRule` | 激活路由前缀   | 不匹配时子应用不加载或重复切换 |
| `props`      | 轻量上下文     | 传大对象会耦合严重、调试困难   |

### 3.3 `props` 示例

```ts
props: {
  appCode: 'module-console',
  workspaceId: 'ws_demo_01',
  theme: 'light'
}
```

避免传入：

- token
- 密钥
- 整个用户对象
- 大体量菜单树
- 频繁变化的大对象

---

## 四、子应用配置

### 4.1 Vite

```ts
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  base: "/console/",
  plugins: [vue()],
});
```

### 4.2 Router

```ts
import { qiankunWindow } from "vite-plugin-qiankun/dist/helper";
import { createRouter, createWebHistory } from "vue-router";

const ADMIN_MICRO_BASE = "/console/";

function getRouterBase() {
  return qiankunWindow.__POWERED_BY_QIANKUN__
    ? ADMIN_MICRO_BASE
    : import.meta.env.BASE_URL;
}

export const router = createRouter({
  history: createWebHistory(getRouterBase()),
  routes: [
    { path: "/", component: () => import("@/views/home-view.vue") },
    { path: "/users", component: () => import("@/views/users-view.vue") },
  ],
});
```

### 4.3 推荐目录拆分

```ts
src/
  qiankun/
    index.ts
    render.ts
    router.ts
    state.ts
  main.ts
```

作用：

- `index.ts` 只管接 qiankun 生命周期
- `render.ts` 只管创建和卸载应用实例
- `router.ts` 只管路由 base
- `state.ts` 只管主子应用共享状态

### 4.4 `index.ts` 入口写法

```ts
import { qiankunWindow, renderWithQiankun } from 'vite-plugin-qiankun/dist/helper'
import { renderMicroApp, unmountMicroApp } from './render'
import type { AuthZeroQiankunProps } from './types'

export function setupMicroApp() {
  renderWithQiankun({
    update() {
      return Promise.resolve()
    },
    bootstrap() {
      return Promise.resolve()
    },
    mount(props: AuthZeroQiankunProps) {
      return renderMicroApp({
        container: props.container,
        props,
      })
    },
    unmount() {
      unmountMicroApp()
      return Promise.resolve()
    }
  })

  if (!qiankunWindow.__POWERED_BY_QIANKUN__) {
    renderMicroApp()
  }
}
```

属性解释：

| 项目 | 作用 |
| --- | --- |
| `renderWithQiankun` | 注册生命周期，交给 qiankun 调用 |
| `mount(props)` | 主应用装载子应用时执行 |
| `props.container` | 子应用挂载容器 |
| `AuthZeroQiankunProps` | 主应用传入的容器和上下文字段类型 |
| `unmount()` | 切换路由或卸载时清理实例 |
| `!qiankunWindow.__POWERED_BY_QIANKUN__` | 允许本地独立运行 |

闭坑点：

- 不要把创建应用的代码直接堆在 `index.ts`
- 不要混用旧版手动导出 `bootstrap/mount/unmount` 模板
- 独立运行时必须也能走同一套 `renderMicroApp()`

### 4.5 `render.ts` 挂载写法

```ts
import { createApp } from "vue";
import type { App as VueApp } from "vue";
import App from "@/App.vue";
import { setupRouter } from "@/router";
import setupPlugins from "@/plugins";
import setupStore from "@/store";

let app: VueApp<Element> | null = null;

function resolveContainer(container?: Element | DocumentFragment) {
  if (container instanceof Element) {
    const appRoot = container.querySelector("#app");
    if (appRoot instanceof Element) {
      return appRoot;
    }
    return container;
  }

  const root = document.querySelector("#app");
  if (root instanceof Element) {
    return root;
  }

  const fallbackRoot = document.createElement("div");
  fallbackRoot.id = "app";
  document.body.appendChild(fallbackRoot);
  return fallbackRoot;
}

export async function renderMicroApp(options: {
  container?: Element | DocumentFragment;
  props?: Record<string, unknown>;
} = {}) {
  const mountContainer = resolveContainer(options.container);

  app = createApp(App);
  setupPlugins(app);
  setupStore(app);
  await setupRouter(app);
  app.mount(mountContainer);
}

export function unmountMicroApp() {
  app?.unmount();
  app = null;
}
```

属性解释：

| 项目 | 作用 |
| --- | --- |
| `resolveContainer()` | 兼容 qiankun 容器挂载和独立运行 |
| `setupPlugins(app)` | 注册插件、指令、全局能力 |
| `setupRouter(app)` | 在 mount 前完成路由初始化 |
| `app?.unmount()` | 卸载 Vue 实例 |

闭坑点：

- `container.querySelector("#app")` 找不到时要兜底
- 路由初始化必须在 `mount` 前完成
- 除了 `app.unmount()`，还要清理事件监听、定时器、WebSocket、全局订阅

### 4.6 注意项

| 配置项      | 正确写法              | 常见错误                 |
| ----------- | --------------------- | ------------------------ |
| Vite `base` | `/console/`           | 写成 `/`                 |
| Router base | `/console/`           | 写成 `/`                 |
| 生命周期入口 | `renderWithQiankun`   | 继续沿用旧的裸模板写法   |
| mount 模式  | 支持独立运行 + 被挂载 | 只能单独跑，不能 mount   |
| unmount     | 清理副作用            | 卸载后残留定时器和监听器 |

---

## 五、Nginx 路由回退策略

### 5.1 入口分类

| 入口类型       | 路径示例        | 回退目标            |
| -------------- | --------------- | ------------------- |
| 主系统托管入口 | `/admin/*`      | 主应用 `index.html` |
| 子系统独立入口 | `/auth-admin/*` | 子系统 `index.html` |

### 5.2 主系统托管入口

配置示例：

```nginx
server {
  listen 80;
  server_name gateway.example.local;

  location / {
    root /srv/portal-shell;
    try_files $uri $uri/ /index.html;
  }

  location ^~ /admin/ {
    root /srv/portal-shell;
    try_files $uri $uri/ /index.html;
  }

  location ^~ /admin-assets/ {
    alias /srv/module-console/assets/;
  }
}
```

属性解释：

| 配置                         | 作用                     |
| ---------------------------- | ------------------------ |
| `location ^~ /admin/`        | 命中主系统托管的后台路由 |
| `root /srv/portal-shell`     | 返回主应用入口文件       |
| `try_files ... /index.html`  | 刷新时回主应用壳         |
| `location ^~ /admin-assets/` | 单独暴露子应用静态资源   |

适用：

- 主系统负责菜单、顶栏、工作区、用户态注入
- `/admin/*` 刷新时不能绕过主系统
- `qiankun` 由主壳负责装载子系统

注意项：

- 不能把 `/admin/*` 回退到子系统自己的 `index.html`
- 子系统静态资源前缀需要单独规划，例如 `/admin-assets/`
- 主应用 `activeRule` 必须和托管路由前缀一致

### 5.3 子系统独立入口

配置示例：

```nginx
server {
  listen 80;
  server_name gateway.example.local;

  location / {
    root /srv/portal-shell;
    try_files $uri $uri/ /index.html;
  }

  location ^~ /auth-admin/ {
    alias /srv/module-console/;
    try_files $uri $uri/ /index.html;
  }
}
```

属性解释：

| 配置                         | 作用                       |
| ---------------------------- | -------------------------- |
| `location ^~ /auth-admin/`   | 命中子系统独立入口         |
| `alias /srv/module-console/` | 直接指向子系统构建目录     |
| `try_files ... /index.html`  | 刷新时直接进入子系统入口页 |

适用：

- 子系统本身就是一个独立站点
- 独立入口不依赖主系统菜单、顶栏、工作区
- 需要支持“直接打开子系统地址也能完整运行”

注意项：

- 刷新会绕过主应用壳
- 主题、菜单、权限状态可能和主系统不一致
- `alias` 场景下，不要把回退路径再写成 `/auth-admin/index.html` 这种重复前缀形式

### 5.4 双入口怎么配合

同一套后台能力可以同时保留两个入口：

| 路径            | 作用                             |
| --------------- | -------------------------------- |
| `/admin/*`      | 主系统托管入口，刷新先回主系统   |
| `/auth-admin/*` | 子系统独立入口，刷新直接回子系统 |

### 5.5 判断标准

| 条件                                             | 入口类型       |
| ------------------------------------------------ | -------------- |
| 刷新后需要保留主系统菜单、顶栏、工作区、注入状态 | 主系统托管入口 |
| 子系统可脱离主系统独立运行                       | 子系统独立入口 |
| 同一路径前缀同时承担两种职责                     | 不建议         |

补充区分：

| 概念             | 说明                                                                   |
| ---------------- | ---------------------------------------------------------------------- |
| 子应用双模式运行 | 一个子应用既支持独立运行，也支持被主应用挂载                           |
| 双入口           | 同一套后台能力在线上暴露两个路由前缀，一个给主系统托管，一个给独立访问 |

### 5.6 未进入网关阶段时的检查项

| 当前形态           | 优先关注点                                   |
| ------------------ | -------------------------------------------- |
| 本地联调阶段       | `entry`、`activeRule`、`base`、`router base` |
| 主系统托管入口阶段 | 刷新是否回主系统壳                           |
| 独立入口阶段       | 子系统能否脱离主系统完整运行                 |
| 已拆静态资源目录   | Nginx / Gateway 精细路由                     |

---

## 六、通信示例

### 6.1 URL 参数

```text
/console/users?tenantId=t_demo_01&mode=readonly
```

适用：

- 列表跳详情
- 只读上下文透传

### 6.2 props

```ts
props: {
  workspaceId: 'ws_demo_01',
  theme: 'light'
}
```

适用：

- 主题
- 工作区
- 应用编码

### 6.3 事件名示例

```text
app:user-changed
app:theme-changed
app:workspace-switched
```

顺序：

```text
URL 参数 > props > 事件总线 > 共享全局状态
```

---

## 七、完整用例

场景：

- 访问 `https://gateway.example.local/admin/users`
- 保留主应用菜单和顶栏
- 子应用读取 `tenantId`

主应用注册：

```ts
{
  name: 'module-console',
  entry: 'https://gateway.example.local/admin-assets/',
  container: '#micro-app-container',
  activeRule: '/admin',
  props: {
    workspaceId: 'ws_demo_01'
  }
}
```

子应用路由：

```ts
createWebHistory("/admin/");
```

Nginx：

```nginx
location ^~ /admin/ {
  root /srv/portal-shell;
  try_files $uri $uri/ /index.html;
}

location ^~ /admin-assets/ {
  alias /srv/module-console/assets/;
}
```

结果：

- 首屏返回主应用壳
- 主应用激活 `module-console`
- 子应用挂载到容器
- 刷新后仍保留主系统上下文

---

## 八、高频问题排查

### 8.1 刷新 404

检查：

- `base`
- `createWebHistory(base)`
- `try_files`
- 当前应该走哪种 Nginx 模式

### 8.2 JS/CSS 404

检查：

- `entry` 是否带正确前缀
- 构建 `base` 是否还是 `/`
- 子应用资源目录是否单独暴露

### 8.3 主应用能进，子应用白屏

检查：

- `container` 是否存在
- `activeRule` 是否命中
- `entry` 地址是否可访问
- 子应用 mount 是否报错

### 8.4 刷新后上下文丢失

检查：

- 当前路径是否被配置为独立入口
- 当前入口是否应改为主系统托管入口

### 8.5 卸载后持续报错

检查：

- `setInterval`
- `window.addEventListener`
- WebSocket
- 全局订阅
- store 单例残留

---

## 九、接入顺序

1. 先定路由前缀
2. 再定 `base` 和 router base
3. 再定 Nginx 模式
4. 再接主应用注册
5. 再补通信
6. 最后清理样式和卸载副作用
