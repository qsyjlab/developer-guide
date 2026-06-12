# 附件预览 - Nest 实现

> 只写模块结构、预览任务、状态流转。

## 一、模块职责

| 层 | 文件名示例 | 职责 |
|----|------------|------|
| controller | `attachment-preview.controller.ts` | 查询预览详情、触发重试 |
| service | `attachment-preview.service.ts` | 预览类型判定、状态更新 |
| job service | `attachment-preview-job.service.ts` | 预览任务消费 |
| resolver | `preview-type.resolver.ts` | MIME / ext -> previewType |
| artifact service | `preview-artifact.service.ts` | 生成预览产物 |
| entity | `attachment-preview-profile.entity.ts` | 预览主表 |
| dto | `query-preview.dto.ts` | 查询参数 |

## 二、实体示意

```ts
@Entity('ac_attachment_preview_profiles')
export class AttachmentPreviewProfileEntity {
  @PrimaryColumn({ type: 'bigint' })
  id: string

  @Column({ name: 'file_id', type: 'bigint' })
  fileId: string

  @Column({ name: 'original_name', length: 255 })
  originalName: string

  @Column({ length: 32, nullable: true })
  ext?: string

  @Column({ name: 'mime_type', length: 128, nullable: true })
  mimeType?: string

  @Column({ name: 'preview_type', length: 32 })
  previewType: string

  @Column({ name: 'preview_status', type: 'tinyint', default: 0 })
  previewStatus: number
}
```

## 三、预览类型解析

```ts
@Injectable()
export class PreviewTypeResolver {
  resolve(ext?: string, mimeType?: string): string {
    if (mimeType?.startsWith('image/')) return 'image'
    if (mimeType?.startsWith('video/')) return 'video'
    if (ext === 'pdf') return 'pdf'
    if (ext === 'docx') return 'office-doc'
    if (ext === 'xlsx' || ext === 'xls') return 'office-sheet'
    if (ext === 'md') return 'markdown'
    if (['txt', 'json', 'xml', 'yaml', 'sql'].includes(ext || '')) return 'text'
    return 'unsupported'
  }
}
```

## 四、业务 Service

```ts
@Injectable()
export class AttachmentPreviewService {
  constructor(
    @InjectRepository(AttachmentPreviewProfileEntity)
    private readonly profileRepo: Repository<AttachmentPreviewProfileEntity>,
    private readonly previewTypeResolver: PreviewTypeResolver,
    private readonly jobService: AttachmentPreviewJobService
  ) {}

  async createOrRefreshProfile(file: FileObjectEntity): Promise<void> {
    const previewType = this.previewTypeResolver.resolve(file.ext, file.mimeType)
    let profile = await this.profileRepo.findOne({ where: { fileId: file.id } })

    if (!profile) {
      profile = this.profileRepo.create({
        id: IdGenerators.nextId(),
        fileId: file.id,
        originalName: file.originalName,
        ext: file.ext,
        mimeType: file.mimeType,
        previewType,
        previewStatus: this.isDirectPreview(previewType) ? 2 : 0
      })
    } else {
      profile.previewType = previewType
    }

    await this.profileRepo.save(profile)

    if (this.needBuildJob(previewType)) {
      await this.jobService.enqueue(file.id, previewType)
    }
  }
}
```

## 五、任务执行

```ts
@Injectable()
export class AttachmentPreviewJobService {
  async handle(job: AttachmentPreviewJobEntity): Promise<void> {
    await this.markRunning(job.id)

    try {
      if (job.jobType === 'office-doc') {
        await this.buildDocPreview(job.fileId)
      } else if (job.jobType === 'office-sheet') {
        await this.buildSheetPreview(job.fileId)
      }

      await this.markSuccess(job.id)
      await this.markPreviewReady(job.fileId)
    } catch (error) {
      await this.markFailed(job.id, String(error))
      await this.markPreviewFailed(job.fileId, String(error))
    }
  }
}
```

## 六、闭坑点

- 不要把不支持预览和预览失败混成同一种状态。
- 预览任务执行失败要记录错误信息。
- 直接预览类型不要强行入任务队列。
