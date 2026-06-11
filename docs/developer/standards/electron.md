# Electron 客户端扩展规范

> 继承 [通用编码规范](./common.md)。**仅写 Electron 客户端特有约定**，通用规则不在本文档重复。

---

## 一、层级职责

| 层级 | 文件名示例 | 职责 |
|------|------------|------|
| 类型声明 | `electron-env.d.ts` | 声明 `window` 注入对象、Bridge 类型 |
| 主进程入口 | `main/index.ts` | 创建窗口、注册 IPC、处理应用生命周期 |
| IPC 模块 | `main/ipc/device.ts`、`main/ipc/files.ts` | 按功能域拆分，每个文件只注册一个领域 |
| Preload 脚本 | `preload/index.ts` | 通过 `contextBridge` 暴露安全 API |
| Renderer Bridge | `bridge/app-bridge.ts` | 封装 `window.appBridge`，供 Vue 页面调用 |

- 目录用全小写单词，文件按职责命名，不要求项目必须照搬某个固定路径。
- IPC 模块按功能域拆分，每个文件只注册一个领域。

---

## 二、文件命名

| 文件类型 | 规范 | 示例 |
|----------|------|------|
| 主进程入口 | `index.ts` | `main/index.ts` |
| IPC 模块 | **kebab-case** | `device.ts`, `project.ts`, `restore.ts` |
| Preload 脚本 | `index.ts` | `preload/index.ts` |
| Bridge 层 | **kebab-case** | `app-bridge.ts` |
| 类型声明 | **kebab-case** + `.d.ts` | `electron-env.d.ts` |

---

## 三、IPC Channel 命名

**核心模式**: `'app:<action>'`，冒号分隔命名空间 + kebab-case 动作名。

### 命名规则

- **命名空间**: 统一 `app:` 前缀
- **动作名**: kebab-case（`choose-directory`、`read-file-range`）
- **动词在前**: `scan-directory`、`load-project-bindings`、`save-project-bindings`

### 完整 Channel 清单

| Channel | 类型 | 用途 |
|---------|------|------|
| `app:choose-directory` | handle | 选择目录 |
| `app:open-item-in-folder` | handle | 在文件管理器中打开 |
| `app:ensure-device` | handle | 确保设备身份 |
| `app:regenerate-device` | handle | 重新生成设备身份 |
| `app:scan-directory` | handle | 扫描目录 |
| `app:read-directory` | handle | 读取目录结构 |
| `app:read-directory-file` | handle | 读取目录文件 |
| `app:read-file-range` | handle | 按字节范围读取 |
| `app:get-project-bindings-file-path` | handle | 获取绑定文件路径 |
| `app:load-project-bindings` | handle | 加载项目绑定 |
| `app:save-project-bindings` | handle | 保存项目绑定 |
| `app:restore-snapshot` | handle | 快照回档 |
| `app:restore-progress` | send | 回档进度推送 |
| `app:start-sso-login` | handle | SSO 登录 |
| `app:start-sso-bind` | handle | SSO 绑定 |
| `app:has-sso-window` | handle | 检查 SSO 窗口 |
| `app:close-sso-window` | handle | 关闭 SSO 窗口 |
| `app:cache-manifest` | handle | 缓存清单 |
| `app:clear-cache` | handle | 清除缓存 |
| `app:cache-stats` | handle | 缓存统计 |
| `app:cache-dir-path` | handle | 缓存目录路径 |

---

## 四、IPC 模块规范

每个 IPC 模块导出注册函数，在 `main/index.ts` 中统一注册：

```typescript
// main/ipc/device.ts
export function registerDeviceIpc(): void {
  ipcMain.handle('app:ensure-device', async () => ensureDeviceIdentity())
  ipcMain.handle('app:regenerate-device', async () => regenerateDeviceIdentity())
}

// main/index.ts
registerDeviceIpc()
registerFilesIpc()
registerProjectIpc()
registerRestoreIpc()
registerSsoIpc(win)
registerCacheIpc()
```

---

## 五、Preload / Bridge 层

### Preload 暴露 (`preload/index.ts`)

```typescript
contextBridge.exposeInMainWorld('appBridge', {
  chooseDirectory: () => ipcRenderer.invoke('app:choose-directory'),
  ensureDevice: () => ipcRenderer.invoke('app:ensure-device'),
  // ...
})
```

- 全局对象名: `window.appBridge`
- 方法名: **camelCase**（与 IPC channel 的 kebab-case 不同）

### Bridge 层类型 (`src/bridge/app-bridge.ts`)

```typescript
// 类型用 AppBridge 前缀 + PascalCase
export interface AppBridgeApi { ... }
export interface AppBridgeDeviceIdentity { ... }
export interface AppBridgeScannedFile { ... }

// 封装函数用 camelCase
export async function ensureAppDeviceIdentity(): Promise<...> { ... }
```

---

## 六、AI 提示词（Electron）

追加到通用规范后：

```
Electron 客户端扩展：
- IPC Channel 用 'app:<kebab-case>' 模式
- IPC 模块文件用 kebab-case（device.ts、restore.ts）
- IPC 模块按功能域拆分，每个导出一个 registerXxxIpc()
- Preload 暴露的方法名用 camelCase
- Bridge 层类型用 AppBridge + PascalCase 前缀
```
