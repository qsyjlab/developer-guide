import { defineConfig } from 'vitepress'

export default defineConfig({
  base: '/developer-guide/',
  title: 'Developer Guide',
  description: '统一维护技术选型、业务实现模板、运维基础设施与编码规范的文档站',
  lang: 'zh-CN',
  srcDir: '.',
  cleanUrls: true,
  themeConfig: {
    siteTitle: 'Developer Guide',
    nav: [
      { text: '首页', link: '/' },
      { text: '技术选型', link: '/developer/project-overview' },
      { text: '业务实现模板', link: '/developer/system-settings-sql-template' },
      { text: '编码规范', link: '/developer/standards/common' },
      { text: '外链参考', link: '/developer/external-links' }
    ],
    sidebar: [
      {
        text: '开发参考',
        collapsed: false,
        items: [
          { text: '框架推荐与对齐路线', link: '/developer/framework-recommendation' },
          { text: '技术选型清单', link: '/developer/project-overview' },
          {
            text: '业务实现模板',
            collapsed: false,
            items: [
              { text: '总览', link: '/developer/system-settings-sql-template' },
              {
                text: '角色权限',
                collapsed: false,
                items: [
                  { text: 'SQL 解释', link: '/developer/business-implementation/role-permission/sql' },
                  { text: 'SpringBoot 实现', link: '/developer/business-implementation/role-permission/springboot' },
                  { text: 'Nest 实现', link: '/developer/business-implementation/role-permission/nest' }
                ]
              },
              {
                text: '日志审计',
                collapsed: false,
                items: [
                  { text: 'SQL 解释', link: '/developer/business-implementation/audit-log/sql' },
                  { text: 'SpringBoot 实现', link: '/developer/business-implementation/audit-log/springboot' },
                  { text: 'Nest 实现', link: '/developer/business-implementation/audit-log/nest' }
                ]
              },
              {
                text: 'MinIO 文件存储',
                collapsed: false,
                items: [
                  { text: 'SQL 解释', link: '/developer/business-implementation/minio-storage/sql' },
                  { text: 'SpringBoot 实现', link: '/developer/business-implementation/minio-storage/springboot' },
                  { text: 'Nest 实现', link: '/developer/business-implementation/minio-storage/nest' }
                ]
              },
              {
                text: '附件预览',
                collapsed: false,
                items: [
                  { text: '方案', link: '/developer/business-implementation/attachment-preview/overview' },
                  { text: 'SQL 解释', link: '/developer/business-implementation/attachment-preview/sql' },
                  { text: 'SpringBoot 实现', link: '/developer/business-implementation/attachment-preview/springboot' },
                  { text: 'Nest 实现', link: '/developer/business-implementation/attachment-preview/nest' }
                ]
              },
              {
                text: '附件存储',
                collapsed: false,
                items: [
                  { text: '方案', link: '/developer/business-implementation/attachment-storage/overview' },
                  { text: 'SQL 解释', link: '/developer/business-implementation/attachment-storage/sql' },
                  { text: 'SpringBoot 实现', link: '/developer/business-implementation/attachment-storage/springboot' },
                  { text: 'Nest 实现', link: '/developer/business-implementation/attachment-storage/nest' }
                ]
              },
              {
                text: '微前端',
                collapsed: false,
                items: [
                  { text: 'Vite 版本', link: '/developer/business-implementation/micro-frontend/practice' }
                ]
              }
            ]
          },
          {
            text: '运维与基础设施',
            collapsed: false,
            items: [
              { text: 'JAR 包部署', link: '/developer/operations/springboot-jar' },
              { text: 'Nest 部署', link: '/developer/operations/nest' },
              { text: 'MinIO 部署', link: '/developer/operations/minio' },
              { text: '命令与配置', link: '/developer/operations/commands-config' }
            ]
          },
          {
            text: '编码规范',
            collapsed: false,
            items: [
              { text: '通用规范（Prettier/ESLint/TS）', link: '/developer/standards/common' },
              { text: '主题与样式（Design Tokens/EP 覆写）', link: '/developer/standards/theme' },
              { text: 'Vue 前端扩展', link: '/developer/standards/vue' },
              { text: 'NestJS 后端扩展', link: '/developer/standards/nestjs' },
              { text: 'Electron 客户端扩展', link: '/developer/standards/electron' }
            ]
          },
          {
            text: '外链参考',
            collapsed: false,
            items: [
              { text: '纯客户端桌面架构', link: '/developer/external-links' },
              { text: 'desktop-infra-starter', link: 'https://qsyjlab.github.io/desktop-infra-starter/' }
            ]
          }
        ]
      }
    ]
  }
})
