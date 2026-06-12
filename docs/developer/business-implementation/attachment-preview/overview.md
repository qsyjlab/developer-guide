# 附件预览方案

---

## 一、目标

目标：

- 统一处理图片、音视频、PDF、Office、文本、压缩包等附件预览
- 前端只处理少量预览类型，不直接处理大量扩展名分支
- 预览失败时可降级到下载
- 原文件存储与预览产物分离

非目标：

- 不追求所有格式都 100% 原样还原
- 不在前端直接解析所有复杂二进制文件

---

## 二、预览类型分层

建议统一抽象为以下 `previewType`：

| previewType | 说明 |
|-------------|------|
| `image` | 图片 |
| `video` | 视频 |
| `audio` | 音频 |
| `pdf` | PDF |
| `text` | 纯文本 |
| `markdown` | Markdown |
| `code` | 代码文件 |
| `office-doc` | Word 文档 |
| `office-sheet` | Excel 表格 |
| `office-slide` | PPT |
| `archive` | 压缩包 |
| `binary` | 二进制不可读文件 |
| `unsupported` | 不支持预览 |

前端只按 `previewType` 分发组件，不按扩展名写大量分支。

---

## 三、支持矩阵

### 3.1 直接预览

| 文件类型 | 建议方案 |
|---------|----------|
| `jpg/png/webp/gif/svg` | 浏览器原生图片预览 |
| `mp4/webm/mov` | 浏览器原生视频预览 |
| `mp3/wav/m4a/ogg` | 浏览器原生音频预览 |
| `pdf` | `pdfjs-dist` |
| `txt/log/json/xml/yaml/sql` | 文本预览 |
| `md` | Markdown 渲染 |

### 3.2 前端库预览

| 文件类型 | 建议方案 |
|---------|----------|
| `docx` | `docx-preview` |
| `xlsx/xls` | `xlsx` 或 `@vue-office/excel` |
| `pptx` | 组件化预览或转 PDF |

### 3.3 建议服务端转换后预览

| 文件类型 | 建议方案 |
|---------|----------|
| `doc` | 转 PDF |
| `xls` | 转 PDF 或转 HTML 表格 |
| `ppt` | 转 PDF 或转图片 |
| 大型复杂 `docx/pptx/xlsx` | 转 PDF |
| `odt/ods/odp` | 转 PDF |

### 3.4 不建议在线预览

| 文件类型 | 建议方案 |
|---------|----------|
| `zip/rar/7z/tar/gz` | 展示目录树 + 下载 |
| `exe/dmg/pkg/apk` | 元信息 + 下载 |
| `iso/bin` | 元信息 + 下载 |

---

## 四、前后端职责

### 4.1 前端职责

- 请求附件元数据
- 按 `previewType` 渲染对应组件
- 处理 `pending / ready / failed / unsupported`
- 大文件场景做分页、懒加载、截断展示

### 4.2 后端职责

- MIME 识别
- 预览类型判定
- 生成缩略图或预览产物
- 维护预览状态
- 返回受控访问地址

---

## 五、附件元数据字段

建议至少包含：

| 字段 | 说明 |
|------|------|
| `fileName` | 原始文件名 |
| `ext` | 扩展名 |
| `mimeType` | MIME 类型 |
| `size` | 文件大小 |
| `previewType` | 预览类型 |
| `previewStatus` | 预览状态 |
| `thumbnailUrl` | 缩略图地址 |
| `previewArtifactUrl` | 预览产物地址 |
| `downloadUrl` | 下载地址 |
| `previewError` | 预览失败原因 |

状态建议：

| previewStatus | 说明 |
|---------------|------|
| `pending` | 预览产物生成中 |
| `ready` | 可预览 |
| `failed` | 预览失败 |
| `unsupported` | 不支持预览 |

---

## 六、预览流程

### 6.1 上传后处理

1. 接收原文件
2. 识别 MIME / 扩展名
3. 计算 `previewType`
4. 决定是否生成预览产物
5. 更新 `previewStatus`

### 6.2 打开预览页

1. 前端读取附件元数据
2. 判断 `previewStatus`
3. `ready` 时加载对应组件
4. `failed / unsupported` 时展示下载与说明

---

## 七、组件拆分建议

统一容器：

- `AttachmentPreviewPanel`

内部按类型拆分：

- `ImagePreview`
- `VideoPreview`
- `AudioPreview`
- `PdfPreview`
- `TextPreview`
- `MarkdownPreview`
- `OfficeDocPreview`
- `OfficeSheetPreview`
- `ArchivePreview`
- `UnsupportedPreview`

---

## 八、DOCX 策略

### 8.1 默认方案

- 普通 `docx`：前端 `docx-preview`
- 复杂 `docx`：服务端转 PDF
- 预览失败：下载原文件

### 8.2 分级规则

| 场景 | 方案 |
|------|------|
| 普通文档、页数少、结构简单 | `docx-preview` |
| 表格复杂、分页严格、图片多 | 转 PDF |
| 需要打印一致性 | 转 PDF |
| 渲染失败 | 下载原文件 |

### 8.3 闭坑点

- 不要把 `docx` 当纯文本处理
- 不要假设 `docx-preview` 能稳定还原所有版式
- 复杂文档必须保留 PDF 兜底方案

---

## 九、压缩包策略

压缩包不进入全文预览。

建议能力：

- 展示目录树
- 展示总大小
- 展示文件数量
- 提供下载

不建议：

- 前端直接解压大压缩包
- 在线逐个打开压缩包内部复杂文件

---

## 十、大文件策略

| 文件类型 | 策略 |
|---------|------|
| 大 PDF | 分页加载 |
| 大文本 | 截断展示 + 继续加载 |
| 大表格 | 只展示前 N 行 |
| 大图片 | 缩略图 + 原图按需查看 |
| 大视频 | 首帧图 + 按需加载播放器 |

---

## 十一、安全要求

- HTML 不直接原样渲染
- Markdown 转 HTML 后做 XSS 清洗
- SVG 渲染前做脚本风险处理
- 私有文件使用受控地址
- 不暴露真实对象存储路径

---

## 十二、失败兜底

任何附件类型都需要保底方案：

| 场景 | 兜底 |
|------|------|
| 预览失败 | 显示失败原因 + 下载 |
| 不支持预览 | 元信息 + 下载 |
| 转换超时 | 显示处理中 + 下载 |
| 文件损坏 | 提示异常 + 下载原文件 |

---

## 十三、推荐首版范围

优先支持：

- 图片
- 视频
- 音频
- PDF
- 文本 / 代码
- Markdown
- docx
- xlsx
- 压缩包目录

首版不建议优先投入：

- 老 Office 全格式高保真还原
- CAD / PSD / AI 这类专业文件预览
- 压缩包内嵌套预览

## 十四、子页入口

| 文档 | 说明 |
|------|------|
| [SQL 解释](./sql.md) | 预览主表、任务表、产物表、查询语句 |
| [SpringBoot 实现](./springboot.md) | 预览状态、任务编排、产物生成 |
| [Nest 实现](./nest.md) | 模块结构、任务队列、状态流转 |
