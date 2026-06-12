# 附件预览 - SpringBoot 实现

> 只写预览能力分层、任务编排、状态更新，不写存储接入细节。

## 一、分层职责

| 层 | 文件名示例 | 职责 |
|----|------------|------|
| controller | `AttachmentPreviewController.java` | 查询预览信息、重试任务 |
| service | `AttachmentPreviewService.java` | 预览策略分流 |
| job service | `AttachmentPreviewJobService.java` | 预览任务执行、失败重试 |
| resolver | `PreviewTypeResolver.java` | MIME / ext -> previewType |
| converter | `PreviewArtifactConverter.java` | 生成 PDF / 文本 / 缩略图等产物 |
| mapper | `AttachmentPreviewProfileMapper.java` | 复杂查询 |
| entity | `AttachmentPreviewProfile.java` | 预览主表映射 |
| dto / vo | `QueryPreviewDTO.java` / `AttachmentPreviewVO.java` | 接口入参出参 |

## 二、接口结构

| 模块 | 接口 | 说明 |
|------|------|------|
| 预览详情 | `GET attachments/{fileId}/preview` | 查询预览主记录和产物 |
| 任务重试 | `POST attachments/{fileId}/preview/retry` | 重试失败任务 |
| 预览刷新 | `POST attachments/{fileId}/preview/rebuild` | 重新生成预览产物 |

## 三、实体示意

```java
@TableName("ac_attachment_preview_profiles")
public class AttachmentPreviewProfile {
  @TableId
  private Long id;
  private Long fileId;
  private String originalName;
  private String ext;
  private String mimeType;
  private Long sizeBytes;
  private String previewType;
  private Integer previewStatus;
  private String thumbnailKey;
  private String previewError;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;
}
```

## 四、预览类型解析

```java
@Component
public class PreviewTypeResolver {

  public String resolve(String ext, String mimeType) {
    if (mimeType != null && mimeType.startsWith("image/")) return "image";
    if (mimeType != null && mimeType.startsWith("video/")) return "video";
    if ("pdf".equalsIgnoreCase(ext)) return "pdf";
    if ("docx".equalsIgnoreCase(ext)) return "office-doc";
    if ("xlsx".equalsIgnoreCase(ext) || "xls".equalsIgnoreCase(ext)) return "office-sheet";
    if ("md".equalsIgnoreCase(ext)) return "markdown";
    if ("txt".equalsIgnoreCase(ext) || "json".equalsIgnoreCase(ext) || "xml".equalsIgnoreCase(ext)) return "text";
    if ("zip".equalsIgnoreCase(ext) || "rar".equalsIgnoreCase(ext) || "7z".equalsIgnoreCase(ext)) return "archive";
    return "unsupported";
  }
}
```

## 五、业务 Service

```java
@Service
public class AttachmentPreviewServiceImpl implements AttachmentPreviewService {

  private final PreviewTypeResolver previewTypeResolver;
  private final AttachmentPreviewProfileMapper profileMapper;
  private final AttachmentPreviewJobService jobService;

  @Transactional(rollbackFor = Exception.class)
  public void createOrRefreshProfile(FileObject file) {
    String previewType = previewTypeResolver.resolve(file.getExt(), file.getMimeType());

    AttachmentPreviewProfile profile = profileMapper.selectByFileId(file.getId());
    if (profile == null) {
      profile = new AttachmentPreviewProfile();
      profile.setId(IdGenerators.nextId());
      profile.setFileId(file.getId());
      profile.setOriginalName(file.getOriginalName());
      profile.setExt(file.getExt());
      profile.setMimeType(file.getMimeType());
      profile.setSizeBytes(file.getSizeBytes());
      profile.setPreviewType(previewType);
      profile.setPreviewStatus(isDirectPreview(previewType) ? 2 : 0);
      profile.setCreatedAt(LocalDateTime.now());
      profile.setUpdatedAt(LocalDateTime.now());
      profileMapper.insert(profile);
    } else {
      profile.setPreviewType(previewType);
      profile.setUpdatedAt(LocalDateTime.now());
      profileMapper.updateById(profile);
    }

    if (needBuildJob(previewType)) {
      jobService.enqueueBuildJob(file.getId(), previewType);
    }
  }
}
```

## 六、任务执行

```java
@Service
public class AttachmentPreviewJobService {

  @Transactional(rollbackFor = Exception.class)
  public void handleJob(AttachmentPreviewJob job) {
    markRunning(job.getId());

    try {
      if ("office-doc".equals(job.getJobType())) {
        buildDocPreview(job.getFileId());
      } else if ("office-sheet".equals(job.getJobType())) {
        buildSheetPreview(job.getFileId());
      } else if ("archive".equals(job.getJobType())) {
        buildArchiveManifest(job.getFileId());
      }
      markSuccess(job.getId());
      markPreviewReady(job.getFileId());
    } catch (Exception ex) {
      markFailed(job.getId(), ex.getMessage());
      markPreviewFailed(job.getFileId(), ex.getMessage());
    }
  }
}
```

## 七、闭坑点

- 预览状态和任务状态不要混成一个字段。
- `docx` 复杂文档要保留 PDF 兜底。
- 压缩包只建议出目录树，不做全文展开。
- 失败任务必须保留错误信息，方便人工重试。
