# 通用编码规范

> 本文档为项目**公共基类**，定义所有平台通用的代码风格、工具链和 TypeScript 约定。
> 各平台扩展规范**仅写本条不覆盖的增量内容**：
> - [Vue 前端扩展](./vue.md)
> - [NestJS 后端扩展](./nestjs.md)
> - [Electron 客户端扩展](./electron.md)

---

## 一、Prettier 格式化规则

### 配置 (`prettier.config.mjs`)

```javascript
export default {
  semi: false,           // 无分号
  singleQuote: true,     // 单引号
  trailingComma: 'none'  // 无尾逗号
}
```

### 格式化示例

```typescript
// ✅ 无分号、单引号、无尾逗号
import { ref, computed } from 'vue'

const items = ref<string[]>([])
const doubleCount = computed(() => items.value.length * 2)

async function fetchData(id: number): Promise<Item> {
  const response = await api.get(`/items/${id}`)
  return response.data
}

// ❌ 有分号 / 双引号 / 尾逗号
import { ref, computed } from "vue";
const items = ref<string[]>([],);
```

### 团队约定

| 规则 | 说明 |
|------|------|
| 缩进 | **2 空格**，禁用 Tab |
| 字符串 | 单引号 `'`，模板字符串用反引号 `` ` `` |
| 尾逗号 | 对象/数组末尾不加 |
| 文件末尾 | 保留一个空行 |
| 行宽 | 建议 ≤ 100 字符 |
| 属性简写 | `{ foo }` 而非 `{ foo: foo }` |

---

## 二、ESLint 规则

### 配置结构 (`eslint.config.mjs`) — 实际配置

采用 **flat config (ESLint 9+)**，共四层覆盖：

```javascript
import js from '@eslint/js'
import tseslint from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import vueParser from 'vue-eslint-parser'
import prettier from 'eslint-config-prettier'

export default [
  // Layer 1: 全局忽略
  {
    ignores: [
      '**/dist/**',
      '**/.vitepress/**',
      '**/node_modules/**',
      '**/*.d.ts',
      'docs/**'
    ]
  },

  // Layer 2: TS 文件规则 (**/*.ts, *.tsx)
  js.configs.recommended,
  prettier,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      globals: {
        console: 'readonly',
        process: 'readonly'
      },
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module' }
    },
    plugins: { '@typescript-eslint': tseslint },
    rules: {
      'no-undef': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'off'
    }
  },

  // Layer 3: Vue 文件规则 (**/*.vue)
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      globals: { console: 'readonly', process: 'readonly' },
      parserOptions: {
        parser: tsParser,
        ecmaVersion: 'latest',
        sourceType: 'module'
      }
    },
    plugins: { '@typescript-eslint': tseslint },
    rules: {
      'no-undef': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'off'
    }
  },

  // Layer 4: API 后端额外放行 console.log
  {
    files: ['apps/api/**/*.ts'],
    rules: { 'no-console': 'off', 'no-undef': 'off' }
  }
]
```

### 常用规则速查

| 场景 | 写法 | 说明 |
|------|------|------|
| 解构未使用变量 | `const { data, _meta } = res` | `_` 前缀跳过 |
| 回调忽略参数 | `.filter((_item, index) => ...)` | 同上 |
| 调试日志 | `console.log(...)` | 仅 API 层可用 |
| any 类型 | `const x: any = ...` | 当前允许 |

---

## 三、TypeScript 严格模式

### 编译器选项 (`tsconfig.base.json`) — 实际配置

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

> 说明：以上是可跨项目复用的公共 TS 严格模式选项。项目级 `paths`、包别名、运行时别名不放入公共规范，避免被误认为所有项目都必须照搬。

### 关键约束

1. **禁止隐式 any** — 参数须有类型注解或可推断
2. **严格 null 检查** — 可能为 null 须处理（`?.` / `??` / 类型守卫）
3. **属性必须存在** — 访问前用类型守卫或接口约束
4. **导入路径大小写一致** — 与文件系统实际名称匹配
5. **noImplicitReturns** — 所有分支须返回值

### 推荐写法

```typescript
// ✅ 类型单独导出
export type UserStatus = 'active' | 'disabled' | 'locked'

// ✅ const assertion
const STATUS_OPTIONS = [
  { label: '正常', value: 'active' },
] as const

// ✅ satisfies（校验类型但保留字面量）
const config = { port: 3000 } satisfies Record<string, string | number>

// ❌ 内联复杂类型
function process(data: { id: number; meta: Record<string, unknown>[] }) { ... }
```

---

## 四、命名基础原则

| 场景 | 规范 | 示例 |
|------|------|------|
| 变量 / 函数 | **camelCase** | `deviceId`, `getUserList()` |
| 类型 / 接口 / 类 | **PascalCase** | `UserRecord`, `CacheManifest` |
| 常量（不可变） | **UPPER_SNAKE_CASE** | `MAX_RETRY`, `DEFAULT_PAGE_SIZE` |
| 目录名 | 全小写单词 | `users/`, `common/`, `utils/` |

> **文件命名**按平台区分，见各平台扩展规范。

### 目录规范

- 资源集合 → 复数名词：`users/`、`snapshots/`、`components/`
- 功能模块 → 小写单词：`common/`、`config/`、`utils/`

---

## 五、代码风格

| 规则 | 说明 |
|------|------|
| 换行符 | LF (`\n`)，禁止 CRLF |
| Tab | 使用空格缩进，禁止 Tab 字符 |
| 编码 | UTF-8 |
| import 分组 | 第三方包 → 内部模块 → 相对路径，组间空行 |

---

## 六、VS Code 设置（待创建）

> 项目当前**未创建** `.vscode/settings.json`，以下为推荐配置。如需使用请手动创建该文件：

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": { "source.fixAll.eslint": "explicit" },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[vue]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "files.eol": "\n",
  "files.insertFinalNewline": true
}
```

---

## 七、Git Hook（可选增强）

### 当前已配置（`package.json` scripts）

```json
{
  "lint": "eslint .",
  "lint:fix": "eslint . --fix",
  "format": "prettier . --write"
}
```

### 可选：提交前自动 lint + format

以下为 **尚未配置的增强方案**，按需启用：

```bash
# 安装 husky + lint-staged
pnpm add -D husky lint-staged
pnpm exec husky init
```

```bash
# .husky/pre-commit
pnpm exec lint-staged
```

```jsonc
// package.json 追加
{ "prepare": "husky", "lint-staged": { "*.{ts,vue}": ["eslint --fix", "prettier . --write"], "*.{json,md}": ["prettier . --write"] } }
```

---

## 八、AI 提示词（公共基础）

将本文档作为 System Prompt 基础，追加平台扩展文档（[Vue](./vue.md#七ai-提示词vue) / [NestJS](./nestjs.md#六ai-提示词nestjs) / [Electron](./electron.md#六ai-提示词electron)）：

```
这是代码生成的唯一规范基线。
在生成代码时，先严格遵守以下规则，再结合业务上下文输出完整实现。

遵循通用编码规范：
- 无分号、单引号、无尾逗号
- 2 空格缩进
- TypeScript strict 模式
- 变量/函数 camelCase，类型/接口 PascalCase
- 目录用复数名词表示资源集合

全项目禁止项：
- 前端 views 中直接操作 DOM 或写 axios 请求
- 前端跨层导入（views 不能 import Repository/Entity）
- 后端 Controller 中写业务逻辑
- 后端 Service 中直接操作 HTTP 上下文（Req/Res）
- 后端 Entity 中使用 class-validator 装饰器（那是 DTO 的职责）
- 后端 DTO 中使用 TypeORM 装饰器（那是 Entity 的职责）
- 全项目硬编码敏感信息（密码、密钥、连接串）
- 不经 changelog 直接 push 代码

[追加对应平台的扩展规范]
```
